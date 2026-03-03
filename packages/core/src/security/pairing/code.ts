import crypto from "node:crypto";
import type { PairingSession } from "./types.js";
import { PairingStatus } from "./types.js";

const CODE_RE = /^\d{6}$/;

export class PairingCode {
  static generate(): string {
    const n = crypto.randomInt(0, 1_000_000);
    return String(n).padStart(6, "0");
  }

  static validate(code: string): boolean {
    return CODE_RE.test(code);
  }

  static hash(code: string): string {
    return crypto.createHash("sha256").update(code).digest("hex");
  }
}

export class PairingCodeManager {
  private readonly sessions = new Map<string, PairingSession>();

  createSession(deviceName?: string): PairingSession & { code: string } {
    const code = PairingCode.generate();
    const id = crypto.randomUUID();
    const now = Date.now();

    const session: PairingSession = {
      id,
      codeHash: PairingCode.hash(code),
      createdAt: now,
      expiresAt: now + 5 * 60 * 1000,
      status: PairingStatus.PENDING,
      attempts: 0,
      maxAttempts: 5,
      deviceName,
    };

    this.sessions.set(id, session);
    return {
      ...session,
      code,
    };
  }

  verifyCode(sessionId: string, code: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    if (this.isExpired(sessionId) || session.status !== PairingStatus.PENDING) {
      return false;
    }

    session.attempts += 1;
    if (session.attempts > session.maxAttempts) {
      session.status = PairingStatus.EXPIRED;
      return false;
    }

    const ok = PairingCode.hash(code) === session.codeHash;
    if (ok) {
      session.status = PairingStatus.COMPLETED;
      session.codeHash = "used";
      return true;
    }

    return false;
  }

  isExpired(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return true;
    }

    if (session.status === PairingStatus.EXPIRED) {
      return true;
    }

    if (Date.now() > session.expiresAt) {
      session.status = PairingStatus.EXPIRED;
      return true;
    }

    return false;
  }

  cleanupExpired(): void {
    for (const [id, session] of this.sessions) {
      if (Date.now() > session.expiresAt || session.status === PairingStatus.EXPIRED) {
        this.sessions.delete(id);
      }
    }
  }

  getSession(sessionId: string): PairingSession | undefined {
    return this.sessions.get(sessionId);
  }
}
