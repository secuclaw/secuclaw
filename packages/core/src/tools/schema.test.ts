import { describe, expect, it } from "vitest";
import { ToolSchemaBuilder, validateSchema } from "./schema.js";

describe("tool schema", () => {
  it("builds valid schema", () => {
    const schema = new ToolSchemaBuilder("ping", "ping host")
      .addParam({
        name: "host",
        description: "host",
        type: "string",
        required: true,
      })
      .build();

    expect(validateSchema(schema)).toBe(true);
    expect(schema.parameters.required).toContain("host");
  });
});
