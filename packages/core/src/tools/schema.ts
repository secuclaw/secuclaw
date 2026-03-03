import type { ToolParameter, ToolSchema } from "./types.js";

export class ToolSchemaBuilder {
  private readonly properties: Record<string, ToolParameter> = {};
  private readonly required = new Set<string>();

  constructor(private readonly name: string, private readonly description: string) {}

  addParam(param: ToolParameter): this {
    this.properties[param.name] = param;
    if (param.required) {
      this.required.add(param.name);
    }
    return this;
  }

  build(): ToolSchema {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        type: "object",
        properties: this.properties,
        required: Array.from(this.required.values()),
      },
    };
  }
}

export function validateSchema(schema: ToolSchema): boolean {
  if (!schema.name.trim()) {
    return false;
  }
  if (schema.parameters.type !== "object") {
    return false;
  }
  return true;
}

export function inferSchema(name: string, description: string, shape: Record<string, ToolParameter>): ToolSchema {
  const builder = new ToolSchemaBuilder(name, description);
  for (const value of Object.values(shape)) {
    builder.addParam(value);
  }
  return builder.build();
}
