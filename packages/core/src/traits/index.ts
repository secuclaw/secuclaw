/**
 * Traits Module - Trait 驱动架构
 * 
 * 提供统一的 Trait 定义、注册表、依赖注入和配置加载
 * 
 * @version 2.0.0
 * @module secuclaw/core/traits
 */

// ============ 类型定义 ============

export type {
  TraitKind,
  TraitType,
  TraitDescriptor,
  TraitDependency,
  TraitInstance,
  Initializable,
  Disposable,
  HealthCheckable,
  Lifecycle,
  Result,
  PaginationOptions,
  PaginatedResult,
  SortOptions,
  FilterOptions,
  EventType,
  Event,
  EventHandler,
  BaseConfig,
  IFactory,
} from './types.js';

// ============ Trait 定义 ============

// Provider Trait
export type {
  ProviderTrait,
  ProviderType,
  ProviderCapability,
  ProviderMessage,
  ChatOptions,
  ChatResult,
  ChatStreamChunk,
  EmbedOptions,
  EmbedResult,
  ProviderConfig,
  HealthStatus,
  ProviderMetrics,
  ToolDefinition,
  ToolCall,
  IProviderFactory,
} from './provider.js';
export type { ILLMProvider, IProviderCapabilities, IProviderConfig } from '../providers/trait.js';

// Channel Trait
export type {
  ChannelTrait,
  ChannelType,
  ChannelCapability,
  ChannelStatus,
  ChannelEvent,
  MessageHandler,
  EventHandler as ChannelEventHandler,
  ErrorHandler,
  ChannelError,
  SendOptions,
  FileContent,
  FileSendOptions,
  Chat,
  ChatMember,
  User,
  ChannelConfig,
  MessageResult,
  IChannelFactory,
} from './channel.js';
export type { IMessageChannel, IChannelCapabilities } from '../channels/trait.js';

// Tool Trait
export type {
  ToolTrait,
  ToolCategory,
  ToolCapabilities,
  ValidationResult,
  ValidationError,
  ToolExample,
  JSONSchema,
  ToolExecutionContext,
  ToolExecutionResult,
  ToolConfig,
  IToolFactory,
} from './tool.js';
export { ToolBuilder } from './tool.js';
export type { ITool, IToolCapabilities, IToolContext, IToolResult } from '../tools/trait.js';

// Memory Trait
export type {
  MemoryTrait,
  MemoryType,
  MemoryCapability,
  MemoryCapabilities,
  MessageQueryOptions,
  VectorSearchOptions,
  VectorSearchResult,
  KVStoreOptions,
  KVGetOptions,
  MemoryMessage,
  CompactionResult,
  MemoryStats,
  MemoryConfig,
  EmbeddingProvider,
  IMemoryFactory,
} from './memory.js';
export type { IMemoryStore, IMemoryCapabilities, MemoryQuery, MemorySearchResult } from '../memory/trait.js';

// ============ 注册表 ============

export {
  TraitRegistry,
  ConsoleLogger,
  SilentLogger,
  ImplementationNotFoundError,
  NoDefaultImplementationError,
  RegistrationError,
} from './registry.js';
export type {
  TraitType as RegistryTraitType,
  ImplementationFactory,
  TraitRegistration,
  Logger,
  RegistryConfig,
} from './registry.js';

// ============ 依赖注入 ============

export {
  DIContainer,
  Inject,
  Injectable,
  Singleton,
  createContainer,
  Token,
} from './container.js';
export type {
  Token as DIToken,
  FactoryFn,
  Provider,
  DependencyDescriptor,
  RegisterOptions,
  DependencyNotFoundError,
  CircularDependencyError,
} from './container.js';

// ============ 配置加载 ============

export {
  ConfigLoader,
  configLoader,
} from './config.js';
export type {
  ProviderConfigEntry,
  ChannelConfigEntry,
  MemoryConfigEntry,
  RuntimeRouting,
  RegistryConfigFile,
  SecuClawConfig,
  LoadOptions,
  ConfigLoadError,
  ConfigValidationError,
} from './config.js';

// ============ Agent Trait ============

export type {
  AgentTrait,
  AgentCapabilities,
  AgentConfig,
  AgentContext,
  AgentMessage,
  AgentResponse,
  AgentState,
} from './agent.js';

// ============ 辅助函数 ============

/**
 * 检查对象是否实现了 Trait
 */
export function implementsTrait<T extends object>(
  obj: unknown,
  requiredMethods: (keyof T)[]
): obj is T {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  
  for (const method of requiredMethods) {
    if (typeof (obj as T)[method] !== 'function') {
      return false;
    }
  }
  
  return true;
}

/**
 * 创建 Trait 描述符
 */
export function createDescriptor(
  kind: import('./types.js').TraitKind,
  id: string,
  name: string,
  options?: Partial<import('./types.js').TraitDescriptor>
): import('./types.js').TraitDescriptor {
  return {
    kind,
    id,
    name,
    version: '1.0.0',
    ...options,
  };
}

/**
 * 创建 Trait 实例
 */
export function createTraitInstance<T>(
  descriptor: import('./types.js').TraitDescriptor,
  implementation: T
): import('./types.js').TraitInstance<T> {
  return {
    descriptor,
    implementation,
  };
}
