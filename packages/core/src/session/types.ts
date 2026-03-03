export type MessageRole = "system" | "user" | "assistant" | "tool";

export interface SessionMessageContent {
  type: "text" | "image" | "tool_result";
  text?: string;
  data?: string;
  name?: string;
  toolUseId?: string;
}

export interface SessionMessage {
  id: string;
  role: MessageRole;
  content: SessionMessageContent[];
  timestamp: number;
  provider?: string;
  model?: string;
  usage?: {
    input: number;
    output: number;
    totalTokens: number;
  };
  stopReason?: string;
}

export interface Session {
  id: string;
  key: string;
  createdAt: number;
  updatedAt: number;
  messages: SessionMessage[];
  metadata: SessionMetadata;
}

export interface SessionMetadata {
  channel?: string;
  lastChannel?: string;
  lastTo?: string;
  lastAccountId?: string;
  lastThreadId?: string;
  incidentId?: string;
  agentId?: string;
  title?: string;
}

export interface SessionConfig {
  dataDir: string;
  maxMessages: number;
  maxTokens: number;
  enableCompaction: boolean;
  compactionLevels: CompactionConfig;
  pruneAfterMs: number;
  rotateBytes: number;
}

export interface CompactionConfig {
  toolResultKeep: number;
  assistantKeep: number;
  recentKeep: number;
}

export const DEFAULT_SESSION_CONFIG: Omit<SessionConfig, "dataDir"> = {
  maxMessages: 1000,
  maxTokens: 50000,
  enableCompaction: true,
  compactionLevels: {
    toolResultKeep: 0,
    assistantKeep: 0,
    recentKeep: 20,
  },
  pruneAfterMs: 90 * 24 * 60 * 60 * 1000,
  rotateBytes: 10 * 1024 * 1024,
};

export interface SessionStoreEntry {
  sessionId: string;
  sessionKey: string;
  sessionFile?: string;
  createdAt: number;
  updatedAt: number;
  metadata: SessionMetadata;
}

export type SessionEvent = 
  | { type: "message_added"; sessionId: string; messageId: string }
  | { type: "compacted"; sessionId: string; originalCount: number; compactedCount: number }
  | { type: "pruned"; sessionId: string };

export interface SessionListener {
  onEvent: (event: SessionEvent) => void | Promise<void>;
}
