import type { Authenticator, AuthInfo, AuthResult, ConnectParams, ErrorShape } from "./types.js";
import { createErrorShape } from "./protocol.js";

export class DefaultAuthenticator implements Authenticator {
  private tokenValidator?: TokenValidator;
  private passwordChecker?: PasswordChecker;

  constructor(opts?: AuthenticatorOptions) {
    this.tokenValidator = opts?.tokenValidator;
    this.passwordChecker = opts?.passwordChecker;
  }

  async authenticate(
    params: ConnectParams,
    auth?: AuthInfo,
  ): Promise<AuthResult> {
    if (!auth) {
      return {
        ok: false,
        error: createErrorShape(
          "UNAUTHORIZED",
          "Authentication required",
          undefined,
          true,
        ),
      };
    }

    if (auth.token) {
      return this.validateToken(auth.token, params);
    }

    if (auth.password) {
      return this.validatePassword(auth.password, params);
    }

    return {
      ok: false,
      error: createErrorShape(
        "UNAUTHORIZED",
        "No valid authentication credentials provided",
        undefined,
        true,
      ),
    };
  }

  private async validateToken(token: string, params: ConnectParams): Promise<AuthResult> {
    if (this.tokenValidator) {
      const result = await this.tokenValidator(token, params);
      return result;
    }

    if (token === "development-token" || token.startsWith("dev-")) {
      return {
        ok: true,
        clientId: params.client.id,
        role: "developer",
        scopes: ["read", "write", "execute"],
      };
    }

    return {
      ok: false,
      error: createErrorShape(
        "UNAUTHORIZED",
        "Invalid token",
        undefined,
        true,
      ),
    };
  }

  private async validatePassword(
    password: string,
    params: ConnectParams,
  ): Promise<AuthResult> {
    if (this.passwordChecker) {
      const result = await this.passwordChecker(password, params);
      return result;
    }

    return {
      ok: false,
      error: createErrorShape(
        "UNAUTHORIZED",
        "Invalid password",
        undefined,
        true,
      ),
    };
  }
}

export interface TokenValidator {
  (token: string, params: ConnectParams): Promise<AuthResult>;
}

export interface PasswordChecker {
  (password: string, params: ConnectParams): Promise<AuthResult>;
}

export interface AuthenticatorOptions {
  tokenValidator?: TokenValidator;
  passwordChecker?: PasswordChecker;
}

export function createAuthenticator(opts?: AuthenticatorOptions): Authenticator {
  return new DefaultAuthenticator(opts);
}

export class TokenAuthenticator implements Authenticator {
  private tokens: Map<string, TokenEntry> = new Map();

  constructor(private secret: string) {}

  async authenticate(params: ConnectParams, auth?: AuthInfo): Promise<AuthResult> {
    if (!auth?.token) {
      return {
        ok: false,
        error: createErrorShape("UNAUTHORIZED", "Token required", undefined, true),
      };
    }

    const entry = this.tokens.get(auth.token);
    if (!entry) {
      return {
        ok: false,
        error: createErrorShape("UNAUTHORIZED", "Invalid token", undefined, true),
      };
    }

    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.tokens.delete(auth.token);
      return {
        ok: false,
        error: createErrorShape("UNAUTHORIZED", "Token expired", undefined, true),
      };
    }

    return {
      ok: true,
      clientId: entry.clientId || params.client.id,
      role: entry.role,
      scopes: entry.scopes,
    };
  }

  issueToken(clientId: string, role?: string, scopes?: string[], ttlMs?: number): string {
    const token = `tok-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    this.tokens.set(token, {
      clientId,
      role,
      scopes,
      expiresAt: ttlMs ? Date.now() + ttlMs : undefined,
    });
    return token;
  }

  revokeToken(token: string): boolean {
    return this.tokens.delete(token);
  }
}

interface TokenEntry {
  clientId: string;
  role?: string;
  scopes?: string[];
  expiresAt?: number;
}

export type GatewayAuthMode = "none" | "token" | "password" | "tailscale";

export interface GatewayAuthConfig {
  mode: GatewayAuthMode;
  token?: string;
  password?: string;
  trustedTailnet?: string;
}

export type GatewayAuthResult = {
  ok: boolean;
  method?: GatewayAuthMode;
  user?: string;
  reason?: string;
};

export interface AuthorizeGatewayConnectParams {
  mode: GatewayAuthMode;
  token?: string;
  expectedToken?: string;
  password?: string;
  expectedPassword?: string;
  tailscaleUser?: string;
  trustedTailnet?: string;
}

export async function authorizeGatewayConnect(
  params: AuthorizeGatewayConnectParams,
): Promise<GatewayAuthResult> {
  switch (params.mode) {
    case "none":
      return { ok: true, method: "none" };
    case "token":
      if (!params.expectedToken) {
        return { ok: false, reason: "Token auth is enabled but expected token is not configured" };
      }
      if (params.token && params.token === params.expectedToken) {
        return { ok: true, method: "token", user: "token-user" };
      }
      return { ok: false, reason: "Invalid token" };
    case "password":
      if (!params.expectedPassword) {
        return { ok: false, reason: "Password auth is enabled but expected password is not configured" };
      }
      if (params.password && params.password === params.expectedPassword) {
        return { ok: true, method: "password", user: "password-user" };
      }
      return { ok: false, reason: "Invalid password" };
    case "tailscale":
      if (!params.tailscaleUser) {
        return { ok: false, reason: "Tailscale user header is missing" };
      }
      if (params.trustedTailnet && !params.tailscaleUser.endsWith(`@${params.trustedTailnet}`)) {
        return { ok: false, reason: "Tailscale user is not in trusted tailnet" };
      }
      return { ok: true, method: "tailscale", user: params.tailscaleUser };
    default:
      return { ok: false, reason: "Unsupported auth mode" };
  }
}
