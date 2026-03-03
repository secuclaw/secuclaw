/**
 * P2P Mutual Authentication
 * 
 * HMAC-SHA256 based bidirectional authentication.
 */

import { createHmac, randomBytes, timingSafeEqual } from "crypto";

// ============================================================================
// Types
// ============================================================================

export interface Challenge {
  nonce: string;
  timestamp: number;
  expiresAt: number;
}

export interface AuthSession {
  id: string;
  peerId: string;
  establishedAt: Date;
  expiresAt: Date;
  sharedKey?: string;
}

export interface AuthResult {
  success: boolean;
  session?: AuthSession;
  error?: string;
}

// ============================================================================
// Challenge Manager
// ============================================================================

/**
 * Manages authentication challenges
 */
export class ChallengeManager {
  private challenges = new Map<string, Challenge>();
  private readonly TTL = 60000; // 1 minute

  /**
   * Create a new challenge
   */
  create(): Challenge {
    const challenge: Challenge = {
      nonce: randomBytes(32).toString("hex"),
      timestamp: Date.now(),
      expiresAt: Date.now() + this.TTL,
    };
    this.challenges.set(challenge.nonce, challenge);
    return challenge;
  }

  /**
   * Verify a challenge response
   */
  verify(nonce: string, response: string, secret: string): boolean {
    const challenge = this.challenges.get(nonce);
    if (!challenge) return false;
    if (Date.now() > challenge.expiresAt) {
      this.challenges.delete(nonce);
      return false;
    }
    
    const expected = createHmac("sha256", secret).update(nonce).digest("hex");
    try {
      return timingSafeEqual(Buffer.from(response), Buffer.from(expected));
    } catch {
      return false;
    }
  }

  /**
   * Clean up expired challenges
   */
  cleanup(): void {
    const now = Date.now();
    for (const [nonce, challenge] of this.challenges) {
      if (challenge.expiresAt < now) {
        this.challenges.delete(nonce);
      }
    }
  }
}

// ============================================================================
// Session Manager
// ============================================================================

/**
 * Manages authentication sessions
 */
export class SessionManager {
  private sessions = new Map<string, AuthSession>();
  private readonly SESSION_TTL = 3600000; // 1 hour

  /**
   * Create a session after successful auth
   */
  createSession(peerId: string, sharedKey: string): AuthSession {
    const session: AuthSession = {
      id: randomBytes(16).toString("hex"),
      peerId,
      establishedAt: new Date(),
      expiresAt: new Date(Date.now() + this.SESSION_TTL),
      sharedKey,
    };
    this.sessions.set(session.id, session);
    return session;
  }

  /**
   * Validate a session
   */
  validate(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    if (session.expiresAt < new Date()) {
      this.sessions.delete(sessionId);
      return false;
    }
    return true;
  }

  /**
   * Get session
   */
  getSession(sessionId: string): AuthSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Invalidate a session
   */
  invalidate(sessionId: string): void {
    this.sessions.delete(sessionId);
  }
}

// ============================================================================
// Mutual Auth
// ============================================================================

/**
 * P2P Mutual Authentication
 */
export class MutualAuth {
  constructor(
    private challengeManager: ChallengeManager,
    private sessionManager: SessionManager,
    private secret: string
  ) {}

  /**
   * Start authentication - create challenge
   */
  start(): Challenge {
    return this.challengeManager.create();
  }

  /**
   * Respond to challenge
   */
  respond(challenge: Challenge): string {
    return createHmac("sha256", this.secret).update(challenge.nonce).digest("hex");
  }

  /**
   * Verify response and establish session
   */
  verifyAndEstablish(nonce: string, response: string): AuthResult {
    const valid = this.challengeManager.verify(nonce, response, this.secret);
    if (!valid) {
      return { success: false, error: "Invalid response" };
    }
    
    const session = this.sessionManager.createSession("peer", this.secret);
    return { success: true, session };
  }

  /**
   * Full mutual auth handshake
   */
  handshake(): { challenge: Challenge; response: string } {
    const challenge = this.start();
    const response = this.respond(challenge);
    return { challenge, response };
  }
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create mutual auth system
 */
export function createMutualAuth(secret: string): MutualAuth {
  return new MutualAuth(new ChallengeManager(), new SessionManager(), secret);
}
