import type { A2UIAction, A2UIMessage, A2UIVersion } from "./types.js";

const A2UI_ACTIONS: A2UIAction[] = [
  "surfaceUpdate",
  "beginRendering",
  "dataModelUpdate",
  "deleteSurface",
  "createSurface",
];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isVersion(value: unknown): value is A2UIVersion {
  return value === "v0.8" || value === "v0.9";
}

function isAction(value: unknown): value is A2UIAction {
  return typeof value === "string" && A2UI_ACTIONS.includes(value as A2UIAction);
}

export function generateA2UIMessageId(): string {
  return `a2ui-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export interface A2UIProtocol {
  version: A2UIVersion;
  encode(message: A2UIMessage): string;
  decode(data: string): A2UIMessage;
  encodeJsonl(messages: A2UIMessage[]): string;
  decodeJsonl(jsonl: string): A2UIMessage[];
}

export class A2UIProtocolCodec implements A2UIProtocol {
  readonly version: A2UIVersion;

  constructor(version: A2UIVersion = "v0.8") {
    this.version = version;
  }

  encode(message: A2UIMessage): string {
    if (message.version !== this.version) {
      throw new Error(`Protocol version mismatch: expected ${this.version}, got ${message.version}`);
    }
    if (!message.id) {
      throw new Error("A2UI message id is required");
    }
    if (!isAction(message.action)) {
      throw new Error(`Unsupported A2UI action: ${String(message.action)}`);
    }
    return JSON.stringify(message);
  }

  decode(data: string): A2UIMessage {
    const parsed = JSON.parse(data) as unknown;
    if (!isObject(parsed)) {
      throw new Error("A2UI message must be an object");
    }

    if ("action" in parsed) {
      return this.normalizeObjectMessage(parsed);
    }
    return this.normalizeLegacyActionKeyMessage(parsed);
  }

  encodeJsonl(messages: A2UIMessage[]): string {
    const lines = messages.map((message) => this.encode(message));
    return lines.join("\n");
  }

  decodeJsonl(jsonl: string): A2UIMessage[] {
    const lines = jsonl
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const messages = lines.map((line) => this.decode(line));
    const versions = new Set(messages.map((message) => message.version));
    if (versions.size > 1) {
      throw new Error("Mixed A2UI protocol versions are not allowed in one JSONL payload");
    }

    return messages;
  }

  private normalizeObjectMessage(raw: Record<string, unknown>): A2UIMessage {
    const version = raw.version;
    const action = raw.action;
    const id = raw.id;

    if (!isVersion(version)) {
      throw new Error(`Unsupported A2UI version: ${String(version)}`);
    }
    if (version !== this.version) {
      throw new Error(`Protocol version mismatch: expected ${this.version}, got ${version}`);
    }
    if (!isAction(action)) {
      throw new Error(`Unsupported A2UI action: ${String(action)}`);
    }

    return {
      id: typeof id === "string" && id.length > 0 ? id : generateA2UIMessageId(),
      version,
      action,
      payload: "payload" in raw ? raw.payload : {},
    };
  }

  private normalizeLegacyActionKeyMessage(raw: Record<string, unknown>): A2UIMessage {
    const version = raw.version;
    if (!isVersion(version)) {
      throw new Error(`Unsupported A2UI version: ${String(version)}`);
    }
    if (version !== this.version) {
      throw new Error(`Protocol version mismatch: expected ${this.version}, got ${version}`);
    }

    const presentActions = A2UI_ACTIONS.filter((key) => key in raw);
    if (presentActions.length !== 1) {
      throw new Error("A2UI legacy payload must include exactly one action key");
    }
    const action = presentActions[0];
    const id = raw.id;
    return {
      id: typeof id === "string" && id.length > 0 ? id : generateA2UIMessageId(),
      version,
      action,
      payload: raw[action],
    };
  }
}

export class A2UIProtocol extends A2UIProtocolCodec {}

export { A2UI_ACTIONS };
