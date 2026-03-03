import { describe, expect, it } from "vitest";
import { autoDetectProvider } from "./factory.js";

describe("provider factory helpers", () => {
  it("auto detects provider", () => {
    process.env.OPENAI_API_KEY = "x";
    expect(autoDetectProvider()).toBe("openai");
  });
});
