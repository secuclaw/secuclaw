import * as fs from "node:fs";
import * as path from "node:path";
import type { Session, SessionMessage, SessionMessageContent } from "./types.js";

const CURRENT_SESSION_VERSION = 1;

interface SessionHeader {
  type: "session";
  version: number;
  id: string;
  timestamp: string;
  cwd: string;
}

function generateMessageId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 11);
  return `${timestamp}-${randomPart}`;
}

export function createSessionHeader(sessionId: string): SessionHeader {
  return {
    type: "session",
    version: CURRENT_SESSION_VERSION,
    id: sessionId,
    timestamp: new Date().toISOString(),
    cwd: process.cwd(),
  };
}

export async function ensureSessionFile(sessionFile: string, sessionId: string): Promise<void> {
  if (fs.existsSync(sessionFile)) {
    return;
  }
  await fs.promises.mkdir(path.dirname(sessionFile), { recursive: true });
  const header = createSessionHeader(sessionId);
  await fs.promises.writeFile(sessionFile, `${JSON.stringify(header)}\n`, {
    encoding: "utf-8",
    mode: 0o600,
  });
}

export async function appendMessageToSession(
  sessionFile: string,
  role: SessionMessage["role"],
  content: SessionMessageContent[],
  options?: {
    provider?: string;
    model?: string;
    usage?: SessionMessage["usage"];
    stopReason?: string;
  },
): Promise<{ ok: true; messageId: string } | { ok: false; reason: string }> {
  const messageId = generateMessageId();
  const timestamp = Date.now();
  
  const message: SessionMessage = {
    id: messageId,
    role,
    content,
    timestamp,
    provider: options?.provider,
    model: options?.model,
    usage: options?.usage,
    stopReason: options?.stopReason,
  };
  
  try {
    await fs.promises.appendFile(sessionFile, `${JSON.stringify(message)}\n`, {
      encoding: "utf-8",
    });
    return { ok: true, messageId };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function readSessionMessages(sessionFile: string): Promise<SessionMessage[]> {
  if (!fs.existsSync(sessionFile)) {
    return [];
  }
  
  try {
    const content = await fs.promises.readFile(sessionFile, "utf-8");
    const lines = content.split("\n").filter((line) => line.trim());
    
    if (lines.length === 0) {
      return [];
    }
    
    const header = JSON.parse(lines[0]) as SessionHeader;
    if (header.type !== "session") {
      return [];
    }
    
    const messages: SessionMessage[] = [];
    for (let i = 1; i < lines.length; i++) {
      try {
        const parsed = JSON.parse(lines[i]);
        if (parsed && typeof parsed === "object" && "role" in parsed && "content" in parsed) {
          messages.push(parsed as SessionMessage);
        }
      } catch {
        // Skip malformed lines
      }
    }
    
    return messages;
  } catch {
    return [];
  }
}

export async function writeSessionMessages(
  sessionFile: string,
  sessionId: string,
  messages: SessionMessage[],
): Promise<void> {
  const header = createSessionHeader(sessionId);
  const lines = [JSON.stringify(header), ...messages.map((m) => JSON.stringify(m))];
  await fs.promises.writeFile(sessionFile, `${lines.join("\n")}\n`, {
    encoding: "utf-8",
    mode: 0o600,
  });
}

export function resolveSessionFilePath(
  sessionId: string,
  dataDir: string,
): string {
  return path.join(dataDir, "sessions", `${sessionId}.jsonl`);
}

export async function deleteSessionFile(sessionFile: string): Promise<void> {
  try {
    await fs.promises.unlink(sessionFile);
  } catch {
    // Ignore errors if file doesn't exist
  }
}

export async function getSessionFileSize(sessionFile: string): Promise<number | null> {
  try {
    const stat = await fs.promises.stat(sessionFile);
    return stat.size;
  } catch {
    return null;
  }
}
