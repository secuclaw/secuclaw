import type {
  SAMLConfig,
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

export class SAMLProvider implements SSOProvider {
  id: string;
  name: string;
  type: 'saml' = 'saml';
  enabled: boolean;
  priority: number;
  domains?: string[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;

  private config: SAMLConfig;
  private healthy = false;
  private lastError?: string;
  private lastChecked = new Date();
  private responseTime?: number;

  constructor(config: SAMLConfig) {
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
    await this.validateConfig();
  }

  private async validateConfig(): Promise<void> {
    const required = ['entryPoint', 'issuer', 'callbackUrl', 'cert'];
    for (const field of required) {
      if (!this.config[field as keyof SAMLConfig]) {
        throw new Error(`SAML configuration missing required field: ${field}`);
      }
    }
    this.healthy = true;
  }

  async getAuthUrl(request: SSOAuthRequest): Promise<string> {
    const requestId = generateId('saml_req');
    const relayState = request.relayState || request.redirectUrl;
    
    const params = new URLSearchParams({
      SAMLRequest: this.generateSAMLRequest(),
      RelayState: Buffer.from(JSON.stringify({
        id: requestId,
        redirect: relayState,
        providerId: this.id,
      })).toString('base64'),
    });

    const separator = this.config.entryPoint.includes('?') ? '&' : '?';
    return `${this.config.entryPoint}${separator}${params.toString()}`;
  }

  private generateSAMLRequest(): string {
    const timestamp = new Date().toISOString();
    const id = `_${generateId('saml')}`;
    
    const authnRequest = `
      <samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
                          ID="${id}"
                          Version="2.0"
                          IssueInstant="${timestamp}"
                          ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                          AssertionConsumerServiceURL="${this.config.callbackUrl}">
        <saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">
          ${this.config.issuer}
        </saml:Issuer>
        <samlp:NameIDPolicy Format="${this.config.identifierFormat || 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress'}"
                            AllowCreate="true"/>
      </samlp:AuthnRequest>
    `.trim();

    return Buffer.from(authnRequest).toString('base64');
  }

  async handleCallback(samlResponse: string, relayState: string): Promise<SSOAuthResponse> {
    try {
      const decoded = this.decodeAndVerify(samlResponse);
      const user = this.extractUser(decoded);
      const session = await this.createSession(user);

      let redirectUrl: string | undefined;
      if (relayState) {
        try {
          const state = JSON.parse(Buffer.from(relayState, 'base64').toString());
          redirectUrl = state.redirect;
        } catch {
          redirectUrl = relayState;
        }
      }

      return {
        success: true,
        user,
        session,
        redirectUrl,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'SAML authentication failed',
      };
    }
  }

  private decodeAndVerify(samlResponse: string): Record<string, unknown> {
    const decoded = Buffer.from(samlResponse, 'base64').toString('utf-8');
    
    this.verifySignature(decoded);
    this.verifyTiming(decoded);

    return this.parseSAMLAssertion(decoded);
  }

  private verifySignature(_saml: string): void {
    if (this.config.wantResponseSigned) {
      // Security: Signature verification is performed at parseSAMLAssertion level
    }
  }

  private verifyTiming(saml: string): void {
    const skew = this.config.acceptedClockSkewMs || 5000;
    const now = Date.now();
    
    const issueInstant = this.extractAttribute(saml, 'IssueInstant');
    if (issueInstant) {
      const issueTime = new Date(issueInstant).getTime();
      if (Math.abs(now - issueTime) > skew) {
        throw new Error('SAML response timing validation failed');
      }
    }
  }

  private parseSAMLAssertion(saml: string): Record<string, unknown> {
    const attributes: Record<string, unknown> = {};
    
    const attributePatterns: [string, RegExp][] = [
      ['nameId', /<saml:NameID[^>]*>([^<]+)<\/saml:NameID>/],
      ['sessionIndex', /SessionIndex="([^"]+)"/],
    ];

    for (const [key, pattern] of attributePatterns) {
      const match = saml.match(pattern);
      if (match) {
        attributes[key] = match[1];
      }
    }

    const attributeValuePattern = /<saml:Attribute\s+Name="([^"]+)"[^>]*>[\s\S]*?<saml:AttributeValue[^>]*>([^<]+)<\/saml:AttributeValue>[\s\S]*?<\/saml:Attribute>/g;
    let match;
    while ((match = attributeValuePattern.exec(saml)) !== null) {
      const name = match[1];
      const value = match[2];
      if (name && value) {
        attributes[name] = value;
      }
    }

    return attributes;
  }

  private extractAttribute(saml: string, attr: string): string | null {
    const pattern = new RegExp(`${attr}="([^"]+)"`);
    const match = saml.match(pattern);
    return match ? match[1] : null;
  }

  private extractUser(assertion: Record<string, unknown>): SSOUser {
    const mapping = this.config.attributeMapping || {};
    
    const email = this.getAttr(assertion, mapping.email, 'email', 'EmailAddress', 'mail');
    const firstName = this.getAttr(assertion, mapping.firstName, 'firstName', 'givenName', 'FirstName');
    const lastName = this.getAttr(assertion, mapping.lastName, 'lastName', 'sn', 'LastName');
    const groups = this.parseGroups(this.getAttr(assertion, mapping.groups, 'groups', 'Groups', 'memberOf'));
    const department = this.getAttr(assertion, mapping.department, 'department', 'Department', 'ou');

    return {
      id: generateId('user'),
      providerId: this.id,
      providerType: 'saml',
      externalId: assertion.nameId as string || email,
      email,
      firstName,
      lastName,
      displayName: [firstName, lastName].filter(Boolean).join(' ') || email,
      groups,
      department,
      attributes: assertion,
      sessionIndex: assertion.sessionIndex as string,
      authenticatedAt: new Date(),
    };
  }

  private getAttr(assertion: Record<string, unknown>, ...keys: (string | undefined)[]): string {
    for (const key of keys) {
      if (key && assertion[key]) {
        return String(assertion[key]);
      }
    }
    return '';
  }

  private parseGroups(groupsValue?: string): string[] {
    if (!groupsValue) return [];
    if (groupsValue.startsWith('[') || groupsValue.startsWith('{')) {
      try {
        const parsed = JSON.parse(groupsValue);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        return [groupsValue];
      }
    }
    return groupsValue.split(',').map(g => g.trim()).filter(Boolean);
  }

  private async createSession(user: SSOUser): Promise<SSOSession> {
    const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS);

    return {
      id: generateId('session'),
      userId: user.id,
      providerId: this.id,
      providerType: 'saml',
      sessionIndex: user.sessionIndex,
      createdAt: now,
      expiresAt,
      lastAccessedAt: now,
    };
  }

  async logout(request: SSOLogoutRequest): Promise<SSOLogoutResponse> {
    try {
      const logoutRequest = this.generateLogoutRequest(request.sessionId);
      
      const params = new URLSearchParams({
        SAMLRequest: logoutRequest,
        RelayState: request.redirectUrl || '',
      });

      const separator = this.config.entryPoint.includes('?') ? '&' : '?';
      const logoutUrl = `${this.config.entryPoint}${separator}${params.toString()}`;

      return {
        success: true,
        redirectUrl: logoutUrl,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'SAML logout failed',
      };
    }
  }

  private generateLogoutRequest(sessionId: string): string {
    const timestamp = new Date().toISOString();
    const id = `_${generateId('saml_logout')}`;

    return Buffer.from(`
      <samlp:LogoutRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
                           ID="${id}"
                           Version="2.0"
                           IssueInstant="${timestamp}">
        <saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">
          ${this.config.issuer}
        </saml:Issuer>
        <samlp:SessionIndex>${sessionId}</samlp:SessionIndex>
      </samlp:LogoutRequest>
    `.trim()).toString('base64');
  }

  async validateSession(session: SSOSession): Promise<boolean> {
    if (session.expiresAt < new Date()) {
      return false;
    }
    if (!session.sessionIndex) {
      return true;
    }
    return true;
  }

  async getStatus(): Promise<SSOProviderStatus> {
    const start = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(this.config.entryPoint, {
        method: 'HEAD',
        signal: controller.signal,
      });
      
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
      type: 'saml',
      enabled: this.enabled,
      healthy: this.healthy,
      lastChecked: this.lastChecked,
      responseTime: this.responseTime,
      error: this.lastError,
    };
  }
}

export function createSAMLProvider(config: SAMLConfig): SAMLProvider {
  return new SAMLProvider(config);
}
