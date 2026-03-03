import type {
  SSOConfig,
  SAMLConfig,
  OIDCConfig,
  SSOProvider,
  SSOUser,
  SSOSession,
  SSOAuthRequest,
  SSOAuthResponse,
  SSOLogoutRequest,
  SSOLogoutResponse,
  SSOProviderStatus,
  SSOEventHandler,
  SSOSessionStore,
  SSOUserStore,
} from './types.js';
import { SAMLProvider, createSAMLProvider } from './saml.js';
import { OIDCProvider, createOIDCProvider } from './oidc.js';

export class SSOManager {
  private providers: Map<string, SSOProvider> = new Map();
  private sessionStore: SSOSessionStore;
  private userStore: SSOUserStore;
  private eventHandlers: SSOEventHandler[] = [];
  private cleanupInterval?: ReturnType<typeof setInterval>;

  constructor(
    sessionStore: SSOSessionStore,
    userStore: SSOUserStore
  ) {
    this.sessionStore = sessionStore;
    this.userStore = userStore;
  }

  async registerProvider(config: SSOConfig): Promise<void> {
    let provider: SSOProvider;

    switch (config.type) {
      case 'saml':
        provider = createSAMLProvider(config as SAMLConfig);
        break;
      case 'oidc':
        provider = createOIDCProvider(config as OIDCConfig);
        break;
      default:
        throw new Error(`Unsupported SSO provider type: ${config.type}`);
    }

    await provider.initialize();
    this.providers.set(config.id, provider);
  }

  unregisterProvider(providerId: string): void {
    this.providers.delete(providerId);
  }

  getProvider(providerId: string): SSOProvider | undefined {
    return this.providers.get(providerId);
  }

  listProviders(): SSOProvider[] {
    return Array.from(this.providers.values())
      .sort((a, b) => a.priority - b.priority);
  }

  getProviderForDomain(domain: string): SSOProvider | undefined {
    return this.listProviders().find(p => 
      p.domains?.some(d => 
        d.toLowerCase() === domain.toLowerCase() ||
        domain.toLowerCase().endsWith(`.${d.toLowerCase()}`)
      )
    );
  }

  async initiateAuth(request: SSOAuthRequest): Promise<string> {
    const provider = this.providers.get(request.providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${request.providerId}`);
    }

    if (!provider.enabled) {
      throw new Error(`Provider is disabled: ${request.providerId}`);
    }

    return provider.getAuthUrl(request);
  }

  async handleCallback(
    providerId: string,
    code: string,
    state: string
  ): Promise<SSOAuthResponse> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      return { success: false, error: `Provider not found: ${providerId}` };
    }

    const response = await provider.handleCallback(code, state);

    if (response.success && response.user && response.session) {
      await this.userStore.create(response.user);
      await this.sessionStore.create(response.session);
      await this.emitUserAuthenticated(response.user, response.session);
    }

    return response;
  }

  async logout(request: SSOLogoutRequest): Promise<SSOLogoutResponse> {
    const session = await this.sessionStore.get(request.sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    const provider = this.providers.get(session.providerId);
    
    try {
      const response = await provider?.logout(request) || { success: true };
      
      if (response.success) {
        await this.sessionStore.delete(request.sessionId);
        await this.emitUserLogout(session.userId, request.sessionId);
      }

      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Logout failed',
      };
    }
  }

  async validateSession(sessionId: string): Promise<boolean> {
    const session = await this.sessionStore.get(sessionId);
    if (!session) return false;

    if (session.expiresAt < new Date()) {
      await this.sessionStore.delete(sessionId);
      await this.emitSessionExpired(session);
      return false;
    }

    const provider = this.providers.get(session.providerId);
    if (!provider) return false;

    const valid = await provider.validateSession(session);
    
    if (!valid) {
      await this.sessionStore.delete(sessionId);
      return false;
    }

    session.lastAccessedAt = new Date();
    await this.sessionStore.update(session);

    return true;
  }

  async refreshSession(sessionId: string): Promise<SSOSession | null> {
    const session = await this.sessionStore.get(sessionId);
    if (!session) return null;

    const provider = this.providers.get(session.providerId);
    if (!provider || !provider.refreshToken) return null;

    try {
      const newSession = await provider.refreshToken(session);
      await this.sessionStore.update(newSession);
      return newSession;
    } catch {
      await this.sessionStore.delete(sessionId);
      return null;
    }
  }

  async getSession(sessionId: string): Promise<SSOSession | null> {
    return this.sessionStore.get(sessionId);
  }

  async getUserSessions(userId: string): Promise<SSOSession[]> {
    return this.sessionStore.getByUserId(userId);
  }

  async getUser(userId: string): Promise<SSOUser | null> {
    return this.userStore.get(userId);
  }

  async getUserByEmail(email: string): Promise<SSOUser | null> {
    return this.userStore.getByEmail(email);
  }

  async terminateAllSessions(userId: string): Promise<void> {
    const sessions = await this.sessionStore.getByUserId(userId);
    
    for (const session of sessions) {
      const provider = this.providers.get(session.providerId);
      await provider?.logout({ providerId: session.providerId, sessionId: session.id });
      await this.sessionStore.delete(session.id);
    }
  }

  async getProviderStatuses(): Promise<SSOProviderStatus[]> {
    const statuses: SSOProviderStatus[] = [];
    
    for (const provider of this.providers.values()) {
      statuses.push(await provider.getStatus());
    }

    return statuses;
  }

  addEventHandler(handler: SSOEventHandler): void {
    this.eventHandlers.push(handler);
  }

  removeEventHandler(handler: SSOEventHandler): void {
    const index = this.eventHandlers.indexOf(handler);
    if (index >= 0) {
      this.eventHandlers.splice(index, 1);
    }
  }

  private async emitUserAuthenticated(user: SSOUser, session: SSOSession): Promise<void> {
    for (const handler of this.eventHandlers) {
      if (handler.onUserAuthenticated) {
        await handler.onUserAuthenticated(user, session);
      }
    }
  }

  private async emitUserLogout(userId: string, sessionId: string): Promise<void> {
    for (const handler of this.eventHandlers) {
      if (handler.onUserLogout) {
        await handler.onUserLogout(userId, sessionId);
      }
    }
  }

  private async emitSessionExpired(session: SSOSession): Promise<void> {
    for (const handler of this.eventHandlers) {
      if (handler.onSessionExpired) {
        await handler.onSessionExpired(session);
      }
    }
  }

  startCleanup(intervalMs: number = 60000): void {
    this.cleanupInterval = setInterval(async () => {
      const deleted = await this.sessionStore.deleteExpired();
      if (deleted > 0) {
        console.log(`Cleaned up ${deleted} expired sessions`);
      }
    }, intervalMs);
  }

  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }
}

export function createSSOManager(
  sessionStore: SSOSessionStore,
  userStore: SSOUserStore
): SSOManager {
  return new SSOManager(sessionStore, userStore);
}
