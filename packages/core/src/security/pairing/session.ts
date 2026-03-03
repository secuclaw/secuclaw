import type { PairingSession } from "./types.js";
import { PairingStatus } from "./types.js";

export class PairingSessionModel {
  constructor(private readonly data: PairingSession) {}

  static create(base: PairingSession): PairingSessionModel {
    return new PairingSessionModel(base);
  }

  expire(): void {
    this.data.status = PairingStatus.EXPIRED;
  }

  complete(): void {
    this.data.status = PairingStatus.COMPLETED;
  }

  isExpired(now: number = Date.now()): boolean {
    return this.data.status === PairingStatus.EXPIRED || now > this.data.expiresAt;
  }

  toJSON(): PairingSession {
    return { ...this.data };
  }
}
