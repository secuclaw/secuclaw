import { A2UIProtocolCodec } from "./protocol.js";
import type { A2UIMessage, A2UIVersion, ValidationResult } from "./types.js";

function fail(...errors: string[]): ValidationResult {
  return { valid: false, errors };
}

function success(): ValidationResult {
  return { valid: true, errors: [] };
}

export function validateA2UIMessage(message: unknown): ValidationResult {
  if (typeof message !== "object" || message === null) {
    return fail("Message must be an object");
  }

  const record = message as Record<string, unknown>;
  if (typeof record.id !== "string" || record.id.length === 0) {
    return fail("Message id must be a non-empty string");
  }
  if (record.version !== "v0.8" && record.version !== "v0.9") {
    return fail("Message version must be v0.8 or v0.9");
  }
  if (
    record.action !== "surfaceUpdate" &&
    record.action !== "beginRendering" &&
    record.action !== "dataModelUpdate" &&
    record.action !== "deleteSurface" &&
    record.action !== "createSurface"
  ) {
    return fail("Unsupported message action");
  }

  return success();
}

export function validateA2UIJsonl(jsonl: string): { version: A2UIVersion; messageCount: number } {
  const lines = jsonl
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    throw new Error("JSONL payload is empty");
  }

  const decoded: A2UIMessage[] = [];
  for (const line of lines) {
    const maybeVersion = line.includes('"version":"v0.9"') ? "v0.9" : "v0.8";
    const protocol = new A2UIProtocolCodec(maybeVersion);
    const message = protocol.decode(line);
    const validation = validateA2UIMessage(message);
    if (!validation.valid) {
      throw new Error(validation.errors.join("; "));
    }
    decoded.push(message);
  }

  const versions = new Set(decoded.map((message) => message.version));
  if (versions.size > 1) {
    throw new Error("Mixed protocol versions are not allowed in a single JSONL payload");
  }

  return {
    version: decoded[0].version,
    messageCount: decoded.length,
  };
}

export function validateComponent(component: unknown): ValidationResult {
  if (typeof component !== "object" || component === null) {
    return fail("Component must be an object");
  }

  const record = component as Record<string, unknown>;
  if (typeof record.id !== "string" || record.id.length === 0) {
    return fail("Component id must be a non-empty string");
  }
  if (typeof record.component !== "object" || record.component === null) {
    return fail("Component payload must be an object");
  }

  const componentKeys = Object.keys(record.component as Record<string, unknown>);
  if (componentKeys.length !== 1) {
    return fail("Component payload must contain exactly one component type");
  }

  return success();
}
