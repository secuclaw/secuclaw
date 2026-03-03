import { describe, expect, it } from "vitest";
import { PairingSessionModel } from "./session.js";
import { PairingStatus } from "./types.js";

describe("pairing session model", () => {
  it("completes session", () => {
    const model = PairingSessionModel.create({
      id: "s1",
      codeHash: "x",
      createdAt: Date.now(),
      expiresAt: Date.now() + 1000,
      status: PairingStatus.PENDING,
      attempts: 0,
      maxAttempts: 3,
    });

    model.complete();
    expect(model.toJSON().status).toBe(PairingStatus.COMPLETED);
  });
});
