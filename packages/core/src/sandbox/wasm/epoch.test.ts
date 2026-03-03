import { describe, expect, it } from "vitest";
import { EpochInterrupt } from "./epoch.js";

describe("epoch interrupt", () => {
  it("interrupts after deadline", async () => {
    const epoch = new EpochInterrupt();
    epoch.startEpoch(1);
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(() => epoch.checkInterrupt()).toThrow();
  });
});
