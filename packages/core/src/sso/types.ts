export type SSOProviderType = 'saml' | 'oidc' | 'oauth2';

export interface SSOConfig {
  id: string;
  name: string;
  type: SSOProviderType;
  enabled: boolean;
  priority: number;
  domains?: string[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface SAMLConfig extends SSOConfig {
  type: 'saml';
  entryPoint: string;
  issuer: string;
  callbackUrl: string;
  cert: string;
  signatureAlgorithm?: 'rsa-sha1' | 'rsa-sha256' | 'rsa-sha512';
  wantAssertionsSigned?: boolean;
  wantResponseSigned?: boolean;
  identifierFormat?: string;
  acceptedClockSkewMs?: number;
  attributeMapping?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    groups?: string;
    department?: string;
  };
}

export interface OIDCConfig extends SSOConfig {
  type: 'oidc';
  issuer: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userInfoEndpoint: string;
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  scope: string[];
  usePKCE?: boolean;
  attributeMapping?: {
    email?: string;
    name?: string;
    groups?: string;
  };
}

export interface SSOUser {
  id: string;
  providerId: string;
  providerType: SSOProviderType;
  externalId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  groups: string[];
  department?: string;
  attributes: Record<string, unknown>;
  sessionIndex?: string;
  authenticatedAt: Date;
  expiresAt?: Date;
}

export interface SSOSession {
  id: string;
  userId: string;
  providerId: string;
  providerType: SSOProviderType;
  accessToken?: string;
  refreshToken?: string;
  idToken?: string;
  sessionIndex?: string;
  createdAt: Date;
  expiresAt: Date;
  lastAccessedAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface SSOAuthRequest {
  providerId: string;
  relayState?: string;
  redirectUrl: string;
}

export interface SSOAuthResponse {
  success: boolean;
  redirectUrl?: string;
  session?: SSOSession;
  user?: SSOUser;
  error?: string;
}

export interface SSOLogoutRequest {
  providerId: string;
  sessionId: string;
  redirectUrl?: string;
}

export interface SSOLogoutResponse {
  success: boolean;
  redirectUrl?: string;
  error?: string;
}

export interface SSOProviderStatus {
  id: string;
  name: string;
  type: SSOProviderType;
  enabled: boolean;
  healthy: boolean;
  lastChecked: Date;
  responseTime?: number;
  error?: string;
}

export interface SSOProvider extends SSOConfig {
  initialize(): Promise<void>;
  getAuthUrl(request: SSOAuthRequest): Promise<string>;
  handleCallback(code: string, state: string): Promise<SSOAuthResponse>;
  logout(request: SSOLogoutRequest): Promise<SSOLogoutResponse>;
  validateSession(session: SSOSession): Promise<boolean>;
  refreshToken?(session: SSOSession): Promise<SSOSession>;
  getStatus(): Promise<SSOProviderStatus>;
}

export interface SSOEventHandler {
  onUserAuthenticated?(user: SSOUser, session: SSOSession): void | Promise<void>;
  onUserLogout?(userId: string, sessionId: string): void | Promise<void>;
  onSessionExpired?(session: SSOSession): void | Promise<void>;
  onProviderError?(providerId: string, error: Error): void | Promise<void>;
}

export type SSOSessionStore = {
  create(session: SSOSession): Promise<void>;
  get(sessionId: string): Promise<SSOSession | null>;
  getByUserId(userId: string): Promise<SSOSession[]>;
  update(session: SSOSession): Promise<void>;
  delete(sessionId: string): Promise<void>;
  deleteByUserId(userId: string): Promise<void>;
  deleteExpired(): Promise<number>;
};

export type SSOUserStore = {
  create(user: SSOUser): Promise<void>;
  get(userId: string): Promise<SSOUser | null>;
  getByExternalId(providerId: string, externalId: string): Promise<SSOUser | null>;
  getByEmail(email: string): Promise<SSOUser | null>;
  update(user: SSOUser): Promise<void>;
  delete(userId: string): Promise<void>;
};
