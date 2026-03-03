export type SecurityRole = "SEC" | "LEG" | "IT" | "BIZ";

export type RoleCombination =
  | { type: "single"; role: SecurityRole }
  | { type: "binary"; roles: [SecurityRole, SecurityRole] }
  | { type: "ternary"; roles: [SecurityRole, SecurityRole, SecurityRole] }
  | { type: "quaternary"; roles: [SecurityRole, SecurityRole, SecurityRole, SecurityRole] };

export type MessageRole = "system" | "user" | "assistant" | "tool";

export interface MessageContent {
  type: "text" | "image" | "tool_use" | "tool_result";
  text?: string;
  data?: string;
  source?: string;
  toolUseId?: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolResult?: unknown;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: MessageContent | MessageContent[];
  name?: string;
  toolCallId?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface ModelConfig {
  provider: string;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  thinkingLevel?: "off" | "low" | "medium" | "high";
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler?: (input: Record<string, unknown>) => Promise<unknown>;
}

export interface AgentConfig {
  id: string;
  name: string;
  description?: string;
  roleCombination: RoleCombination;
  model: ModelConfig;
  tools?: ToolDefinition[];
  systemPrompt?: string;
  maxRetries?: number;
  timeoutMs?: number;
  enableCompaction?: boolean;
  maxCompactionAttempts?: number;
}

export interface AgentContext {
  sessionId: string;
  runId: string;
  config: AgentConfig;
  messages: Message[];
  workspaceDir?: string;
  metadata?: Record<string, unknown>;
}

export interface AgentAttemptResult {
  success: boolean;
  messages: Message[];
  lastAssistant?: Message;
  toolCalls?: Array<{ name: string; input: Record<string, unknown> }>;
  usage?: {
    input: number;
    output: number;
    total: number;
  };
  error?: {
    kind: string;
    message: string;
    recoverable: boolean;
  };
  durationMs: number;
  attemptNumber: number;
}

export interface AgentResult {
  success: boolean;
  messages: Message[];
  finalMessage?: Message;
  usage?: {
    input: number;
    output: number;
    total: number;
  };
  error?: {
    kind: string;
    message: string;
  };
  durationMs: number;
  attempts: number;
  compactionCount: number;
}

export type AgentEventType =
  | "lifecycle"
  | "tool"
  | "assistant"
  | "error"
  | "compaction"
  | "lane.enqueue"
  | "lane.dequeue"
  | "lane.complete"
  | "session.create"
  | "session.message"
  | "session.prune"
  | "reasoning.start"
  | "reasoning.result"
  | "sandbox.start"
  | "sandbox.complete"
  | "audit.log"
  | "risk.update"
  | "alert.trigger";

export interface AgentEvent {
  type: AgentEventType;
  runId: string;
  sessionId: string;
  timestamp: number;
  seq?: number;
  data: Record<string, unknown>;
}

export interface CompactionResult {
  compacted: boolean;
  reason?: string;
  messagesRemoved: number;
}

export interface FailoverAction {
  type: "retry" | "fallback_model" | "fallback_profile" | "compaction";
  reason: string;
  attemptNumber: number;
}

export interface AgentLogger {
  info: (message: string, data?: Record<string, unknown>) => void;
  warn: (message: string, data?: Record<string, unknown>) => void;
  error: (message: string, data?: Record<string, unknown>) => void;
  debug: (message: string, data?: Record<string, unknown>) => void;
}
