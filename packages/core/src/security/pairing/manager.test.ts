import { describe, expect, it } from "vitest";
import { PairingManager } from "./manager.js";

describe("pairing manager", () => {
  it("pairs and revokes device", () => {
    const manager = new PairingManager();
    const session = manager.initiatePairing("edge-device");
    const cert = manager.completePairing(session.id, session.code, "edge-device");

    const devices = manager.listDevices();
    expect(devices.length).toBe(1);
    expect(manager.isPaired(cert.deviceId)).toBe(true);

    manager.revokeDevice(cert.deviceId);
    expect(manager.isPaired(cert.deviceId)).toBe(false);
  });
});
