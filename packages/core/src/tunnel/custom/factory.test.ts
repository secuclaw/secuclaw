import { describe, expect, it } from "vitest";
import { TunnelFactory } from "./factory.js";

describe("tunnel factory", () => {
  it("registers default tunnel types", () => {
    const factory = new TunnelFactory();
    const types = factory.listTypes();
    expect(types).toContain("ssh");
    expect(types).toContain("ws");
  });
});
