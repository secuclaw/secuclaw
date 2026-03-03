import { describe, expect, it } from "vitest";
import { PairingCode, PairingCodeManager } from "./code.js";

describe("pairing code", () => {
  it("generates 6 digit code", () => {
    const code = PairingCode.generate();
    expect(code).toMatch(/^\d{6}$/);
    expect(PairingCode.validate(code)).toBe(true);
  });

  it("uses one-time code", () => {
    const manager = new PairingCodeManager();
    const session = manager.createSession();

    expect(manager.verifyCode(session.id, session.code)).toBe(true);
    expect(manager.verifyCode(session.id, session.code)).toBe(false);
  });
});
