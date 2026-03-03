import crypto from "node:crypto";
import { PairingCodeManager } from "./code.js";
import { DeviceCertificateModel } from "./device.js";
import type { DeviceCertificate, DeviceInfo, PairingSession } from "./types.js";
import { PairingStatus } from "./types.js";

export class PairingManager {
  private readonly codeManager = new PairingCodeManager();
  private readonly certManager = new DeviceCertificateModel(
    process.env.SECUCLAW_PAIRING_SECRET ?? "secuclaw-pairing-secret",
  );
  private readonly devices = new Map<string, { info: DeviceInfo; certificate: DeviceCertificate }>();

  initiatePairing(deviceName?: string): PairingSession & { code: string } {
    return this.codeManager.createSession(deviceName);
  }

  completePairing(sessionId: string, code: string, deviceName: string): DeviceCertificate {
    const session = this.codeManager.getSession(sessionId);
    if (!session) {
      throw new Error("pairing session not found");
    }

    const ok = this.codeManager.verifyCode(sessionId, code);
    if (!ok) {
      throw new Error("invalid or expired pairing code");
    }

    const info: DeviceInfo = {
      id: crypto.randomUUID(),
      name: deviceName,
      fingerprint: crypto.createHash("sha256").update(`${deviceName}:${Date.now()}`).digest("hex"),
      createdAt: Date.now(),
    };

    const certificate = this.certManager.generate(info);
    this.devices.set(info.id, { info, certificate });
    return certificate;
  }

  listDevices(): DeviceInfo[] {
    return Array.from(this.devices.values()).map((v) => ({ ...v.info }));
  }

  revokeDevice(deviceId: string): boolean {
    const existing = this.devices.get(deviceId);
    if (!existing) {
      return false;
    }

    existing.certificate = this.certManager.revoke(existing.certificate);
    return true;
  }

  isPaired(deviceId: string): boolean {
    const existing = this.devices.get(deviceId);
    if (!existing) {
      return false;
    }
    return this.certManager.verify(existing.certificate);
  }

  getSessionStatus(sessionId: string): PairingStatus {
    const session = this.codeManager.getSession(sessionId);
    if (!session) {
      return PairingStatus.EXPIRED;
    }
    if (this.codeManager.isExpired(sessionId)) {
      return PairingStatus.EXPIRED;
    }
    return session.status;
  }
}
