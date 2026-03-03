import type {
  AgentConfig,
  AgentContext,
  Message,
  MessageContent,
  MessageRole,
  SecurityRole,
  ToolDefinition,
} from "./types.js";
import { emitAgentEvent } from "./events.js";

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createAgentContext(
  config: AgentConfig,
  sessionId: string,
  runId: string,
  workspaceDir?: string,
): AgentContext {
  return {
    sessionId,
    runId,
    config,
    messages: [],
    workspaceDir,
    metadata: {},
  };
}

export function addMessage(
  context: AgentContext,
  role: MessageRole,
  content: MessageContent | MessageContent[],
): Message {
  const message: Message = {
    id: generateId(),
    role,
    content,
    timestamp: Date.now(),
  };
  context.messages.push(message);

  emitAgentEvent(
    role === "assistant" ? "assistant" : "lifecycle",
    context.runId,
    context.sessionId,
    { messageId: message.id, role, messageCount: context.messages.length },
  );

  return message;
}

export function addSystemMessage(context: AgentContext, content: string): Message {
  return addMessage(context, "system", { type: "text", text: content });
}

export function addUserMessage(context: AgentContext, content: string): Message {
  return addMessage(context, "user", { type: "text", text: content });
}

export function addAssistantMessage(
  context: AgentContext,
  content: MessageContent | MessageContent[],
): Message {
  return addMessage(context, "assistant", content);
}

export function addToolMessage(
  context: AgentContext,
  toolName: string,
  toolResult: unknown,
  toolCallId: string,
): Message {
  const message: Message = {
    id: generateId(),
    role: "tool",
    content: {
      type: "tool_result",
      toolName,
      toolResult,
    },
    toolCallId,
    timestamp: Date.now(),
  };
  context.messages.push(message);

  emitAgentEvent(
    "tool",
    context.runId,
    context.sessionId,
    { messageId: message.id, toolName, toolCallId },
  );

  return message;
}

export function getLastAssistantMessage(context: AgentContext): Message | undefined {
  return context.messages.slice().reverse().find((m) => m.role === "assistant");
}

export function getLastUserMessage(context: AgentContext): Message | undefined {
  return context.messages.slice().reverse().find((m) => m.role === "user");
}

export function getMessagesByRole(context: AgentContext, role: MessageRole): Message[] {
  return context.messages.filter((m) => m.role === role);
}

export function clearMessages(context: AgentContext): void {
  context.messages.length = 0;
}

export function getContextSummary(context: AgentContext): {
  messageCount: number;
  roleCounts: Record<MessageRole, number>;
  lastMessage?: Message;
} {
  const roleCounts: Record<MessageRole, number> = {
    system: 0,
    user: 0,
    assistant: 0,
    tool: 0,
  };

  for (const msg of context.messages) {
    roleCounts[msg.role]++;
  }

  return {
    messageCount: context.messages.length,
    roleCounts,
    lastMessage: context.messages[context.messages.length - 1],
  };
}

export function getRoleNamesFromContext(context: AgentContext): SecurityRole[] {
  const { roleCombination } = context.config;
  switch (roleCombination.type) {
    case "single":
      return [roleCombination.role];
    case "binary":
      return [...roleCombination.roles];
    case "ternary":
      return [...roleCombination.roles];
    case "quaternary":
      return [...roleCombination.roles];
  }
}

export function buildSystemPrompt(context: AgentContext): string {
  const { config } = context;
  const roles = getRoleNamesFromContext(context);

  let prompt = config.systemPrompt ?? "";
  if (!prompt) {
    const roleDescriptions: Record<SecurityRole, string> = {
      SEC: "Security Expert - specializes in security assessment, threat detection, and risk analysis",
      LEG: "Legal Expert - specializes in compliance, regulatory matters, and legal risk assessment",
      IT: "IT Expert - specializes in technical infrastructure, system architecture, and technology evaluation",
      BIZ: "Business Expert - specializes in business impact, process analysis, and strategic assessment",
    };

    const roleList = roles.map((r) => `- ${r}: ${roleDescriptions[r]}`).join("\n");
    prompt = `You are an enterprise security commander AI assistant. Your role(s):\n\n${roleList}\n\nProvide comprehensive security analysis and recommendations.`;
  }

  return prompt;
}

export function mergeToolResults(
  context: AgentContext,
  toolResults: Array<{ toolName: string; result: unknown; toolCallId: string }>,
): void {
  for (const { toolName, result, toolCallId } of toolResults) {
    addToolMessage(context, toolName, result, toolCallId);
  }
}

export function cloneContext(context: AgentContext): AgentContext {
  return {
    ...context,
    messages: [...context.messages.map((m) => ({ ...m }))],
    metadata: { ...context.metadata },
  };
}
