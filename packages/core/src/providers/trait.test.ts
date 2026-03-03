import { describe, expect, it } from "vitest";
import { ProviderConfigBuilder, mergeConfig, resolveSecret, validateConfig } from "./config.js";

describe("provider config", () => {
  it("builds and validates config", () => {
    const config = new ProviderConfigBuilder()
      .withModel("gpt-4o-mini")
      .withTimeout(3000)
      .withRetries(2)
      .build();

    expect(config.model).toBe("gpt-4o-mini");
    expect(validateConfig(config)).toBe(true);
  });

  it("merges config", () => {
    const merged = mergeConfig({ timeout: 1000 }, { retries: 1 });
    expect(merged.timeout).toBe(1000);
    expect(merged.retries).toBe(1);
  });

  it("resolves env secret", () => {
    process.env.TEST_PROVIDER_SECRET = "ok";
    expect(resolveSecret("${TEST_PROVIDER_SECRET}")).toBe("ok");
  });
});
