import { describe, expect, it } from "vitest";
import { authorizeGatewayConnect } from "./auth.js";

describe("gateway auth", () => {
  it("supports none mode", async () => {
    const result = await authorizeGatewayConnect({ mode: "none" });
    expect(result.ok).toBe(true);
    expect(result.method).toBe("none");
  });

  it("validates token mode", async () => {
    const ok = await authorizeGatewayConnect({
      mode: "token",
      token: "abc",
      expectedToken: "abc",
    });
    const bad = await authorizeGatewayConnect({
      mode: "token",
      token: "wrong",
      expectedToken: "abc",
    });
    expect(ok.ok).toBe(true);
    expect(bad.ok).toBe(false);
  });

  it("validates password mode", async () => {
    const ok = await authorizeGatewayConnect({
      mode: "password",
      password: "p@ss",
      expectedPassword: "p@ss",
    });
    expect(ok.ok).toBe(true);
  });

  it("validates tailscale mode", async () => {
    const ok = await authorizeGatewayConnect({
      mode: "tailscale",
      tailscaleUser: "alice@corp.ts.net",
      trustedTailnet: "corp.ts.net",
    });
    const bad = await authorizeGatewayConnect({
      mode: "tailscale",
      tailscaleUser: "alice@other.ts.net",
      trustedTailnet: "corp.ts.net",
    });
    expect(ok.ok).toBe(true);
    expect(bad.ok).toBe(false);
  });
});
