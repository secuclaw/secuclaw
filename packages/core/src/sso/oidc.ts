import type {
  OIDCConfig,
  SSOProvider,
  SSOAuthRequest,
  SSOAuthResponse,
  SSOLogoutRequest,
  SSOLogoutResponse,
  SSOSession,
  SSOUser,
  SSOProviderStatus,
} from './types.js';
import { generateId } from '../utils/id.js';

export class OIDCProvider implements SSOProvider {
  id: string;
  name: string;
  type: 'oidc' = 'oidc';
  enabled: boolean;
  priority: number;
  domains?: string[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;

  private config: OIDCConfig;
  private healthy = false;
  private lastError?: string;
  private lastChecked = new Date();
  private responseTime?: number;
  private discoveryCache?: Record<string, unknown>;
  private discoveryCacheTime?: number;

  constructor(config: OIDCConfig) {
    this.config = config;
    this.id = config.id;
    this.name = config.name;
    this.enabled = config.enabled;
    this.priority = config.priority;
    this.domains = config.domains;
    this.metadata = config.metadata;
    this.createdAt = config.createdAt;
    this.updatedAt = config.updatedAt;
  }

  async initialize(): Promise<void> {
    await this.discoverEndpoints();
  }

  private async discoverEndpoints(): Promise<void> {
    const DISCOVERY_CACHE_TTL_MS = 60 * 60 * 1000;
    const now = Date.now();
    
    if (this.discoveryCache && this.discoveryCacheTime && 
        now - this.discoveryCacheTime < DISCOVERY_CACHE_TTL_MS) {
      return;
    }

    try {
      const discoveryUrl = `${this.config.issuer}/.well-known/openid-configuration`;
      const response = await fetch(discoveryUrl);
      
      if (!response.ok) {
        throw new Error(`Discovery failed: ${response.status}`);
      }

      this.discoveryCache = await response.json() as Record<string, unknown>;
      this.discoveryCacheTime = now;
      this.healthy = true;
    } catch {
      this.healthy = true;
    }
  }

  async getAuthUrl(request: SSOAuthRequest): Promise<string> {
    const state = generateId('oidc_state');
    const codeVerifier = this.config.usePKCE ? this.generateCodeVerifier() : undefined;
    const codeChallenge = codeVerifier ? await this.generateCodeChallenge(codeVerifier) : undefined;

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      scope: this.config.scope.join(' '),
      redirect_uri: this.config.callbackUrl,
      state: JSON.stringify({
        id: state,
        redirect: request.redirectUrl,
        providerId: this.id,
        codeVerifier,
      }),
    });

    if (codeChallenge) {
      params.set('code_challenge', codeChallenge);
      params.set('code_challenge_method', 'S256');
    }

    const authEndpoint = this.getEndpoint('authorization_endpoint') || this.config.authorizationEndpoint;
    return `${authEndpoint}?${params.toString()}`;
  }

  private getEndpoint(name: string): string | null {
    if (this.discoveryCache && typeof this.discoveryCache[name] === 'string') {
      return this.discoveryCache[name] as string;
    }
    return null;
  }

  private generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return this.base64UrlEncode(array);
  }

  private async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return this.base64UrlEncode(new Uint8Array(hash));
  }

  private base64UrlEncode(array: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < array.length; i++) {
      binary += String.fromCharCode(array[i]);
    }
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  async handleCallback(code: string, stateStr: string): Promise<SSOAuthResponse> {
    try {
      let state: { redirect?: string; codeVerifier?: string };
      try {
        state = JSON.parse(stateStr);
      } catch {
        return { success: false, error: 'Invalid state parameter' };
      }

      const tokens = await this.exchangeCodeForTokens(code, state.codeVerifier);
      const userInfo = await this.fetchUserInfo(tokens.access_token);
      const user = this.extractUser(userInfo);
      const session = await this.createSession(user, tokens);

      return {
        success: true,
        user,
        session,
        redirectUrl: state.redirect,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'OIDC authentication failed',
      };
    }
  }

  private async exchangeCodeForTokens(
    code: string,
    codeVerifier?: string
  ): Promise<{ access_token: string; refresh_token?: string; id_token?: string; expires_in: number }> {
    const tokenEndpoint = this.getEndpoint('token_endpoint') || this.config.tokenEndpoint;

    const body: Record<string, string> = {
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.config.callbackUrl,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    };

    if (codeVerifier) {
      body.code_verifier = codeVerifier;
    }

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body).toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    return response.json() as Promise<{ access_token: string; refresh_token?: string; id_token?: string; expires_in: number }>;
  }

  private async fetchUserInfo(accessToken: string): Promise<Record<string, unknown>> {
    const userInfoEndpoint = this.getEndpoint('userinfo_endpoint') || this.config.userInfoEndpoint;

    const response = await fetch(userInfoEndpoint, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`User info fetch failed: ${response.status}`);
    }

    return response.json() as Promise<Record<string, unknown>>;
  }

  private extractUser(userInfo: Record<string, unknown>): SSOUser {
    const mapping = this.config.attributeMapping || {};

    const email = this.getFirstValue(userInfo, mapping.email, 'email', 'mail', 'upn');
    const name = this.getFirstValue(userInfo, mapping.name, 'name', 'displayName', 'display_name');
    const groups = this.extractGroups(userInfo, mapping.groups);

    const [firstName, ...lastNameParts] = (name || '').split(' ');
    const lastName = lastNameParts.join(' ');

    return {
      id: generateId('user'),
      providerId: this.id,
      providerType: 'oidc',
      externalId: (userInfo.sub as string) || email,
      email,
      firstName,
      lastName,
      displayName: name,
      groups,
      department: this.getFirstValue(userInfo, 'department', 'dept', 'ou'),
      attributes: userInfo,
      authenticatedAt: new Date(),
    };
  }

  private getFirstValue(obj: Record<string, unknown>, ...keys: (string | undefined)[]): string {
    for (const key of keys) {
      if (!key) continue;
      const value = obj[key];
      if (typeof value === 'string') return value;
      if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
    }
    return '';
  }

  private extractGroups(userInfo: Record<string, unknown>, mappingKey?: string): string[] {
    const groupKeys = [mappingKey, 'groups', 'roles', 'memberof'].filter(Boolean);
    
    for (const key of groupKeys) {
      const value = userInfo[key as string];
      if (Array.isArray(value)) {
        return value.map(String);
      }
      if (typeof value === 'string') {
        if (value.startsWith('[')) {
          try {
            return JSON.parse(value);
          } catch {
            return [value];
          }
        }
        return value.split(',').map(g => g.trim()).filter(Boolean);
      }
    }
    return [];
  }

  private async createSession(
    user: SSOUser,
    tokens: { access_token: string; refresh_token?: string; id_token?: string; expires_in: number }
  ): Promise<SSOSession> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + tokens.expires_in * 1000);

    return {
      id: generateId('session'),
      userId: user.id,
      providerId: this.id,
      providerType: 'oidc',
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      idToken: tokens.id_token,
      createdAt: now,
      expiresAt,
      lastAccessedAt: now,
    };
  }

  async logout(request: SSOLogoutRequest): Promise<SSOLogoutResponse> {
    try {
      const endSessionEndpoint = this.getEndpoint('end_session_endpoint');
      
      if (endSessionEndpoint) {
        const params = new URLSearchParams({
          client_id: this.config.clientId,
          post_logout_redirect_uri: request.redirectUrl || this.config.callbackUrl,
        });

        return {
          success: true,
          redirectUrl: `${endSessionEndpoint}?${params.toString()}`,
        };
      }

      return {
        success: true,
        redirectUrl: request.redirectUrl,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'OIDC logout failed',
      };
    }
  }

  async validateSession(session: SSOSession): Promise<boolean> {
    if (session.expiresAt < new Date()) {
      return false;
    }

    if (session.accessToken) {
      try {
        const userInfoEndpoint = this.getEndpoint('userinfo_endpoint') || this.config.userInfoEndpoint;
        const response = await fetch(userInfoEndpoint, {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        });
        return response.ok;
      } catch {
        return false;
      }
    }

    return true;
  }

  async refreshToken(session: SSOSession): Promise<SSOSession> {
    if (!session.refreshToken) {
      throw new Error('No refresh token available');
    }

    const tokenEndpoint = this.getEndpoint('token_endpoint') || this.config.tokenEndpoint;

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: session.refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }).toString(),
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const tokens = await response.json() as { access_token: string; refresh_token?: string; expires_in: number };
    const now = new Date();

    return {
      ...session,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || session.refreshToken,
      expiresAt: new Date(now.getTime() + tokens.expires_in * 1000),
      lastAccessedAt: now,
    };
  }

  async getStatus(): Promise<SSOProviderStatus> {
    const start = Date.now();

    try {
      const discoveryUrl = `${this.config.issuer}/.well-known/openid-configuration`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(discoveryUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      this.healthy = response.ok;
      this.responseTime = Date.now() - start;
      this.lastError = response.ok ? undefined : `HTTP ${response.status}`;
    } catch (error) {
      this.healthy = false;
      this.responseTime = Date.now() - start;
      this.lastError = error instanceof Error ? error.message : 'Health check failed';
    }

    this.lastChecked = new Date();

    return {
      id: this.id,
      name: this.name,
      type: 'oidc',
      enabled: this.enabled,
      healthy: this.healthy,
      lastChecked: this.lastChecked,
      responseTime: this.responseTime,
      error: this.lastError,
    };
  }
}

export function createOIDCProvider(config: OIDCConfig): SSOProvider {
  return new OIDCProvider(config);
}
