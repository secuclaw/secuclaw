import { describe, expect, it } from "vitest";
import { autoDetectMemoryBackend } from "./factory.js";

describe("memory factory", () => {
  it("auto detects backend", () => {
    delete process.env.DATABASE_URL;
    expect(autoDetectMemoryBackend()).toBe("in-memory");
  });
});
