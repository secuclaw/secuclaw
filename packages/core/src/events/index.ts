import type {
  EventType,
  StreamEvent,
  EventBase,
  EventCallback,
  EventFilter,
  EventStats,
  MessageEvent,
  ToolCallEvent,
  ToolResultEvent,
  ThinkingEvent,
  ErrorEvent,
  StatusEvent,
  ProgressEvent,
  NotificationEvent,
  InputRequestEvent,
  InputResponseEvent,
  FileReadEvent,
  FileWriteEvent,
  CommandEvent,
  MemoryEvent,
  SkillEvent,
  AgentSpawnEvent,
  AgentMessageEvent,
  HeartbeatEvent,
} from './types';

export class EventStream {
  private events: StreamEvent[] = [];
  private subscribers: Map<EventType, Set<EventCallback>> = new Map();
  private globalSubscribers: Set<EventCallback> = new Set();
  private eventCounter = 0;
  private maxEvents: number;
  private sessionId: string;
  private heartbeatInterval?: ReturnType<typeof setInterval>;

  constructor(sessionId: string, maxEvents = 10000) {
    this.sessionId = sessionId;
    this.maxEvents = maxEvents;
  }

  private generateId(): string {
    return `evt-${Date.now()}-${++this.eventCounter}`;
  }

  emit<T extends StreamEvent>(event: Omit<T, 'id' | 'timestamp' | 'sessionId'>): T {
    const fullEvent = {
      ...event,
      id: this.generateId(),
      timestamp: new Date(),
      sessionId: this.sessionId,
    } as T;

    this.events.push(fullEvent);
    if (this.events.length > this.maxEvents) this.events.shift();

    const typeCallbacks = this.subscribers.get((event as { type: EventType }).type);
    if (typeCallbacks) {
      for (const callback of typeCallbacks) {
        Promise.resolve(callback(fullEvent)).catch(console.error);
      }
    }

    for (const callback of this.globalSubscribers) {
      Promise.resolve(callback(fullEvent)).catch(console.error);
    }

    return fullEvent;
  }

  message(role: MessageEvent['role'], content: string, tokens?: MessageEvent['tokens']): MessageEvent {
    return this.emit<MessageEvent>({ type: 'message', role, content, tokens } as Omit<MessageEvent, 'id' | 'timestamp' | 'sessionId'>);
  }

  toolCall(toolName: string, toolCallId: string, args: Record<string, unknown>, requiresConfirmation?: boolean): ToolCallEvent {
    return this.emit<ToolCallEvent>({ type: 'tool_call', toolName, toolCallId, arguments: args, requiresConfirmation } as Omit<ToolCallEvent, 'id' | 'timestamp' | 'sessionId'>);
  }

  toolResult(toolCallId: string, toolName: string, success: boolean, result: unknown, duration: number): ToolResultEvent {
    return this.emit<ToolResultEvent>({ type: 'tool_result', toolCallId, toolName, success, result, duration } as Omit<ToolResultEvent, 'id' | 'timestamp' | 'sessionId'>);
  }

  thinking(content: string, level: ThinkingEvent['level'] = 'medium', tokens?: number): ThinkingEvent {
    return this.emit<ThinkingEvent>({ type: 'thinking', content, level, tokens } as Omit<ThinkingEvent, 'id' | 'timestamp' | 'sessionId'>);
  }

  error(code: string, message: string, recoverable: boolean, context?: Record<string, unknown>, stack?: string): ErrorEvent {
    return this.emit<ErrorEvent>({ type: 'error', code, message, stack, recoverable, context } as Omit<ErrorEvent, 'id' | 'timestamp' | 'sessionId'>);
  }

  status(status: StatusEvent['status'], message?: string, progress?: number): StatusEvent {
    return this.emit<StatusEvent>({ type: 'status', status, message, progress } as Omit<StatusEvent, 'id' | 'timestamp' | 'sessionId'>);
  }

  progress(operation: string, current: number, total: number, unit?: string): ProgressEvent {
    return this.emit<ProgressEvent>({ type: 'progress', operation, current, total, unit } as Omit<ProgressEvent, 'id' | 'timestamp' | 'sessionId'>);
  }

  notification(level: NotificationEvent['level'], title: string, message: string, action?: NotificationEvent['action']): NotificationEvent {
    return this.emit<NotificationEvent>({ type: 'notification', level, title, message, action } as Omit<NotificationEvent, 'id' | 'timestamp' | 'sessionId'>);
  }

  inputRequest(requestId: string, prompt: string, inputType: InputRequestEvent['inputType'], options?: InputRequestEvent['options'], timeout?: number): InputRequestEvent {
    return this.emit<InputRequestEvent>({ type: 'input_request', requestId, prompt, inputType, options, timeout } as Omit<InputRequestEvent, 'id' | 'timestamp' | 'sessionId'>);
  }

  inputResponse(requestId: string, response: string | string[] | boolean, timedOut: boolean): InputResponseEvent {
    return this.emit<InputResponseEvent>({ type: 'input_response', requestId, response, timedOut } as Omit<InputResponseEvent, 'id' | 'timestamp' | 'sessionId'>);
  }

  fileRead(path: string, success: boolean, content?: string, size?: number): FileReadEvent {
    return this.emit<FileReadEvent>({ type: 'file_read', path, success, content, size } as Omit<FileReadEvent, 'id' | 'timestamp' | 'sessionId'>);
  }

  fileWrite(path: string, success: boolean, bytesWritten?: number, created?: boolean): FileWriteEvent {
    return this.emit<FileWriteEvent>({ type: 'file_write', path, success, bytesWritten, created } as Omit<FileWriteEvent, 'id' | 'timestamp' | 'sessionId'>);
  }

  command(command: string, args: string[], exitCode: number, stdout?: string, stderr?: string, duration?: number): CommandEvent {
    return this.emit<CommandEvent>({ type: 'command', command, args, exitCode, stdout, stderr, duration } as Omit<CommandEvent, 'id' | 'timestamp' | 'sessionId'>);
  }

  memory(action: MemoryEvent['action'], success: boolean, key?: string, query?: string, results?: unknown[]): MemoryEvent {
    return this.emit<MemoryEvent>({ type: 'memory', action, key, query, results, success } as Omit<MemoryEvent, 'id' | 'timestamp' | 'sessionId'>);
  }

  skill(skillName: string, action: SkillEvent['action'], success: boolean, params?: Record<string, unknown>, result?: unknown): SkillEvent {
    return this.emit<SkillEvent>({ type: 'skill', skillName, action, success, params, result } as Omit<SkillEvent, 'id' | 'timestamp' | 'sessionId'>);
  }

  agentSpawn(spawnedAgentId: string, purpose: string, status: AgentSpawnEvent['status'], spawnedAgentRole?: string): AgentSpawnEvent {
    return this.emit<AgentSpawnEvent>({ type: 'agent_spawn', spawnedAgentId, spawnedAgentRole, purpose, status } as Omit<AgentSpawnEvent, 'id' | 'timestamp' | 'sessionId'>);
  }

  agentMessage(fromAgentId: string, toAgentId: string, messageType: AgentMessageEvent['messageType'], content: string, relatedTaskId?: string): AgentMessageEvent {
    return this.emit<AgentMessageEvent>({ type: 'agent_message', fromAgentId, toAgentId, messageType, content, relatedTaskId } as Omit<AgentMessageEvent, 'id' | 'timestamp' | 'sessionId'>);
  }

  heartbeat(status: HeartbeatEvent['status'], queueSize: number, memoryUsage?: number): HeartbeatEvent {
    return this.emit<HeartbeatEvent>({ type: 'heartbeat', status, queueSize, memoryUsage } as Omit<HeartbeatEvent, 'id' | 'timestamp' | 'sessionId'>);
  }

  subscribe<T extends StreamEvent>(type: EventType | EventType[], callback: EventCallback<T>): () => void {
    const types = Array.isArray(type) ? type : [type];
    const unsubscribers: (() => void)[] = [];

    for (const t of types) {
      if (!this.subscribers.has(t)) this.subscribers.set(t, new Set());
      this.subscribers.get(t)!.add(callback as EventCallback);
      unsubscribers.push(() => this.subscribers.get(t)?.delete(callback as EventCallback));
    }

    return () => unsubscribers.forEach(u => u());
  }

  subscribeAll(callback: EventCallback): () => void {
    this.globalSubscribers.add(callback);
    return () => this.globalSubscribers.delete(callback);
  }

  getEvents(filter?: EventFilter): StreamEvent[] {
    let result = [...this.events];
    if (filter) {
      if (filter.types) result = result.filter(e => filter.types!.includes(e.type));
      if (filter.sessionId) result = result.filter(e => e.sessionId === filter.sessionId);
      if (filter.agentId) result = result.filter(e => e.agentId === filter.agentId);
      if (filter.since) result = result.filter(e => e.timestamp >= filter.since!);
      if (filter.until) result = result.filter(e => e.timestamp <= filter.until!);
    }
    return result;
  }

  getEventsByType<T extends StreamEvent>(type: EventType): T[] {
    return this.events.filter(e => e.type === type) as T[];
  }

  getLastError(): ErrorEvent | undefined {
    const errors = this.getEventsByType<ErrorEvent>('error');
    return errors[errors.length - 1];
  }

  getStats(): EventStats {
    const byType: Record<EventType, number> = {
      message: 0, tool_call: 0, tool_result: 0, thinking: 0, error: 0,
      status: 0, progress: 0, notification: 0, input_request: 0, input_response: 0,
      file_read: 0, file_write: 0, command: 0, memory: 0, skill: 0,
      agent_spawn: 0, agent_message: 0, heartbeat: 0,
    };

    for (const event of this.events) byType[event.type]++;

    return {
      total: this.events.length,
      byType,
      errors: byType.error,
      avgProcessingTime: 0,
      lastEvent: this.events[this.events.length - 1]?.timestamp,
    };
  }

  startHeartbeat(intervalMs = 30000, getStatus: () => { status: HeartbeatEvent['status']; queueSize: number; memoryUsage?: number }): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      const { status, queueSize, memoryUsage } = getStatus();
      this.heartbeat(status, queueSize, memoryUsage);
    }, intervalMs);
  }

  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }

  clear(): void {
    this.events = [];
    this.eventCounter = 0;
  }

  async *stream(filter?: EventFilter): AsyncGenerator<StreamEvent> {
    let lastIndex = 0;
    while (true) {
      const events = this.getEvents(filter);
      while (lastIndex < events.length) yield events[lastIndex++];
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  replay(fromIndex = 0): StreamEvent[] {
    return this.events.slice(fromIndex);
  }
}

export function createEventStream(sessionId: string, maxEvents?: number): EventStream {
  return new EventStream(sessionId, maxEvents);
}
