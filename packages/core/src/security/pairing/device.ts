import crypto from "node:crypto";
import type { DeviceCertificate, DeviceInfo } from "./types.js";

export class DeviceCertificateModel {
  constructor(private readonly secret: string) {}

  generate(device: DeviceInfo, ttlMs: number = 365 * 24 * 60 * 60 * 1000): DeviceCertificate {
    const issuedAt = Date.now();
    const expiresAt = issuedAt + ttlMs;
    const signature = this.sign(`${device.id}:${issuedAt}:${expiresAt}`);
    return {
      id: crypto.randomUUID(),
      deviceId: device.id,
      issuedAt,
      expiresAt,
      signature,
      revoked: false,
    };
  }

  sign(payload: string): string {
    return crypto
      .createHmac("sha256", this.secret)
      .update(payload)
      .digest("hex");
  }

  verify(certificate: DeviceCertificate): boolean {
    if (certificate.revoked || Date.now() > certificate.expiresAt) {
      return false;
    }

    const expected = this.sign(`${certificate.deviceId}:${certificate.issuedAt}:${certificate.expiresAt}`);
    return expected === certificate.signature;
  }

  revoke(certificate: DeviceCertificate): DeviceCertificate {
    return {
      ...certificate,
      revoked: true,
    };
  }
}
