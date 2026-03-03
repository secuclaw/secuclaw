import { describe, expect, it } from "vitest";
import { SandboxExecutor } from "./executor.js";

describe("sandbox executor", () => {
  it("fails gracefully with invalid wasm", async () => {
    const executor = new SandboxExecutor();
    const result = await executor.execute(
      new Uint8Array([0x00, 0x61, 0x62]),
      "main",
      [],
      {
        fuel: 100,
        epochTimeoutMs: 100,
        memoryLimitBytes: 1024 * 1024,
        allowNetwork: false,
        allowFs: false,
      },
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});
