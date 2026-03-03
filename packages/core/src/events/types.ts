export type EventType =
  | 'message'
  | 'tool_call'
  | 'tool_result'
  | 'thinking'
  | 'error'
  | 'status'
  | 'progress'
  | 'notification'
  | 'input_request'
  | 'input_response'
  | 'file_read'
  | 'file_write'
  | 'command'
  | 'memory'
  | 'skill'
  | 'agent_spawn'
  | 'agent_message'
  | 'heartbeat';

export interface EventBase {
  id: string;
  type: EventType;
  timestamp: Date;
  sessionId: string;
  agentId?: string;
  metadata?: Record<string, unknown>;
}

export interface MessageEvent extends EventBase {
  type: 'message';
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokens?: {
    input?: number;
    output?: number;
  };
}

export interface ToolCallEvent extends EventBase {
  type: 'tool_call';
  toolName: string;
  toolCallId: string;
  arguments: Record<string, unknown>;
  requiresConfirmation?: boolean;
}

export interface ToolResultEvent extends EventBase {
  type: 'tool_result';
  toolCallId: string;
  toolName: string;
  success: boolean;
  result: unknown;
  duration: number;
}

export interface ThinkingEvent extends EventBase {
  type: 'thinking';
  content: string;
  level: 'low' | 'medium' | 'high';
  tokens?: number;
}

export interface ErrorEvent extends EventBase {
  type: 'error';
  code: string;
  message: string;
  stack?: string;
  recoverable: boolean;
  context?: Record<string, unknown>;
}

export interface StatusEvent extends EventBase {
  type: 'status';
  status: 'idle' | 'thinking' | 'executing' | 'waiting' | 'completed' | 'error';
  message?: string;
  progress?: number;
}

export interface ProgressEvent extends EventBase {
  type: 'progress';
  operation: string;
  current: number;
  total: number;
  unit?: string;
  message?: string;
}

export interface NotificationEvent extends EventBase {
  type: 'notification';
  level: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
  action?: {
    type: string;
    payload?: unknown;
  };
}

export interface InputRequestEvent extends EventBase {
  type: 'input_request';
  requestId: string;
  prompt: string;
  inputType: 'text' | 'select' | 'confirm' | 'multiselect';
  options?: Array<{ value: string; label: string }>;
  timeout?: number;
}

export interface InputResponseEvent extends EventBase {
  type: 'input_response';
  requestId: string;
  response: string | string[] | boolean;
  timedOut: boolean;
}

export interface FileReadEvent extends EventBase {
  type: 'file_read';
  path: string;
  success: boolean;
  content?: string;
  size?: number;
  encoding?: string;
}

export interface FileWriteEvent extends EventBase {
  type: 'file_write';
  path: string;
  success: boolean;
  bytesWritten?: number;
  created?: boolean;
}

export interface CommandEvent extends EventBase {
  type: 'command';
  command: string;
  args: string[];
  cwd?: string;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  duration?: number;
}

export interface MemoryEvent extends EventBase {
  type: 'memory';
  action: 'store' | 'retrieve' | 'search' | 'delete' | 'clear';
  key?: string;
  query?: string;
  results?: unknown[];
  success: boolean;
}

export interface SkillEvent extends EventBase {
  type: 'skill';
  skillName: string;
  action: 'load' | 'execute' | 'unload';
  success: boolean;
  params?: Record<string, unknown>;
  result?: unknown;
}

export interface AgentSpawnEvent extends EventBase {
  type: 'agent_spawn';
  spawnedAgentId: string;
  spawnedAgentRole?: string;
  purpose: string;
  status: 'created' | 'running' | 'completed' | 'failed';
}

export interface AgentMessageEvent extends EventBase {
  type: 'agent_message';
  fromAgentId: string;
  toAgentId: string;
  messageType: 'request' | 'response' | 'broadcast';
  content: string;
  relatedTaskId?: string;
}

export interface HeartbeatEvent extends EventBase {
  type: 'heartbeat';
  status: 'alive' | 'idle' | 'busy';
  queueSize: number;
  memoryUsage?: number;
}

export type StreamEvent =
  | MessageEvent
  | ToolCallEvent
  | ToolResultEvent
  | ThinkingEvent
  | ErrorEvent
  | StatusEvent
  | ProgressEvent
  | NotificationEvent
  | InputRequestEvent
  | InputResponseEvent
  | FileReadEvent
  | FileWriteEvent
  | CommandEvent
  | MemoryEvent
  | SkillEvent
  | AgentSpawnEvent
  | AgentMessageEvent
  | HeartbeatEvent;

export type EventCallback<T extends StreamEvent = StreamEvent> = (event: T) => void | Promise<void>;

export type EventFilter = {
  types?: EventType[];
  sessionId?: string;
  agentId?: string;
  since?: Date;
  until?: Date;
};

export interface EventStats {
  total: number;
  byType: Record<EventType, number>;
  errors: number;
  avgProcessingTime: number;
  lastEvent?: Date;
}
