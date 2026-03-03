export {
  type SecurityRole,
  type RoleCombination,
  type MessageRole,
  type MessageContent,
  type Message,
  type ModelConfig,
  type ToolDefinition,
  type AgentConfig,
  type AgentContext,
  type AgentAttemptResult,
  type AgentResult,
  type AgentEvent,
  type CompactionResult,
  type FailoverAction,
  type AgentLogger,
} from "./types.js";

export {
  type AgentEventStream,
  type AgentEventListener,
  emitAgentEvent,
  onAgentEvent,
  onAgentEventGlobal,
  offAgentEvent,
  clearAgentEventListeners,
  resetSeqForRun,
  getSeqForRun,
} from "./events.js";

export {
  createAgentContext,
  addMessage,
  addSystemMessage,
  addUserMessage,
  addAssistantMessage,
  addToolMessage,
  getLastAssistantMessage,
  getLastUserMessage,
  getMessagesByRole,
  clearMessages,
  getContextSummary,
  getRoleNamesFromContext,
  buildSystemPrompt,
  mergeToolResults,
  cloneContext,
} from "./context.js";

export {
  type LoopCallbacks,
  type LoopOptions,
  type ModelExecutor,
  type ToolExecutor,
  type CompactionHandler,
  type RunInnerLoopParams,
  runInnerLoopAttempt,
  runOuterLoop,
} from "./loop.js";

export {
  type FollowUpDecision,
  type OuterLoopState,
  type DualLoopCallbacks,
  type DualLoopOptions,
  type FollowUpAnalyzer,
  runOuterLoopWithFollowUp,
  createDefaultFollowUpAnalyzer,
  createSecurityFollowUpAnalyzer,
} from "./dual-loop.js";

export {
  type RunnerOptions,
  type RunnerCallbacks,
  type RunnerDependencies,
  runAgent,
  createAgentContext as createAgent,
  addSystemMessage as addSystem,
  buildSystemPrompt as buildPrompt,
  emitAgentEvent as emitEvent,
  onAgentEvent as onEvent,
  onAgentEventGlobal as onEventGlobal,
  clearAgentEventListeners as clearEvents,
} from "./runner.js";
