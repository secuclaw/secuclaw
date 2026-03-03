import { describe, expect, it } from "vitest";
import { DeviceCertificateModel } from "./device.js";

describe("device certificate", () => {
  it("generates and verifies certificate", () => {
    const certModel = new DeviceCertificateModel("secret");
    const cert = certModel.generate({
      id: "d1",
      name: "edge",
      fingerprint: "abc",
      createdAt: Date.now(),
    });

    expect(certModel.verify(cert)).toBe(true);
    const revoked = certModel.revoke(cert);
    expect(certModel.verify(revoked)).toBe(false);
  });
});
