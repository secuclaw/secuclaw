# 详细设计文档: P2-T17 Hand基类设计

> **版本**: 1.0  
> **作者**: Architecture Team  
> **日期**: 2026-03-03  
> **状态**: ✅ 已实现

---

## 1. 概述

### 1.1 目标

设计一个可扩展的自主安全Hand基类架构，支持：
- 生命周期管理
- 状态持久化
- 错误恢复
- 进度报告
- 结果聚合

### 1.2 范围

本文档定义Hand基类的：
- 接口设计
- 状态模型
- 生命周期
- 错误处理策略
- 存储抽象

---

## 2. 架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Hand Architecture                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      BaseHand (Abstract)                         │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │   │
│  │  │  Lifecycle  │  │   State     │  │   Error     │              │   │
│  │  │  Management │  │  Management │  │  Handling   │              │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘              │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │   │
│  │  │  Progress   │  │   Result    │  │  Storage    │              │   │
│  │  │  Reporting  │  │  Aggregation│  │  Abstract   │              │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
│                                    ▼                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      Concrete Hands                              │   │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐        │   │
│  │  │  Threat   │ │   Vuln    │ │Compliance │ │ Incident  │        │   │
│  │  │  Hunter   │ │  Scanner  │ │  Auditor  │ │ Responder │        │   │
│  │  └───────────┘ └───────────┘ └───────────┘ └───────────┘        │   │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐                      │   │
│  │  │  Threat   │ │   Risk    │ │   Pen     │                      │   │
│  │  │Intel Coll │ │ Assessor  │ │  Tester   │                      │   │
│  │  └───────────┘ └───────────┘ └───────────┘                      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 核心组件

| 组件 | 职责 |
|------|------|
| **BaseHand** | 抽象基类，定义通用接口和实现 |
| **HandState** | 状态管理，支持持久化 |
| **HandContext** | 执行上下文，包含配置和资源 |
| **HandResult** | 执行结果，支持聚合 |
| **HandScheduler** | 调度器，管理Hand执行 |
| **HandStorage** | 存储抽象，支持多种后端 |

---

## 3. 接口设计

### 3.1 BaseHand 抽象类

```typescript
/**
 * Hand基类 - 所有自主安全Hand的抽象基类
 * 
 * @example
 * class MyHand extends BaseHand {
 *   async initialize() { /* 初始化逻辑 *\/ }
 *   async execute(context) { /* 执行逻辑 *\/ }
 *   async terminate() { /* 清理逻辑 *\/ }
 * }
 */
export abstract class BaseHand {
  // ============ 元数据 ============
  
  /** Hand唯一标识 */
  abstract readonly id: string;
  
  /** Hand名称 */
  abstract readonly name: string;
  
  /** Hand描述 */
  abstract readonly description: string;
  
  /** Hand版本 */
  abstract readonly version: string;
  
  /** Hand类别 */
  abstract readonly category: HandCategory;
  
  /** 所需能力 */
  abstract readonly requiredCapabilities: string[];

  // ============ 生命周期方法 ============
  
  /**
   * 初始化Hand
   * 在Hand首次运行前调用，用于加载资源、建立连接等
   */
  abstract initialize(): Promise<void>;
  
  /**
   * 执行Hand主逻辑
   * @param context 执行上下文
   * @returns 执行结果
   */
  abstract execute(context: HandContext): Promise<HandResult>;
  
  /**
   * 终止Hand
   * 在Hand不再需要时调用，用于释放资源、关闭连接等
   */
  abstract terminate(): Promise<void>;
  
  /**
   * 验证Hand配置
   * @param config 配置对象
   * @returns 验证结果
   */
  validateConfig?(config: Record<string, any>): ValidationResult;

  // ============ 状态管理 ============
  
  private _state: HandState;
  
  /** 获取当前状态 */
  get state(): HandState {
    return { ...this._state };
  }
  
  /** 设置状态 */
  protected setState(partial: Partial<HandState>): void {
    this._state = { ...this._state, ...partial };
    this.persistState();
  }
  
  /** 持久化状态 */
  protected async persistState(): Promise<void> {
    await this.storage.set(`hand:${this.id}:state`, this._state);
  }
  
  /** 加载状态 */
  protected async loadState(): Promise<HandState> {
    const stored = await this.storage.get<HandState>(`hand:${this.id}:state`);
    return stored || this.createInitialState();
  }
  
  /** 创建初始状态 */
  protected createInitialState(): HandState {
    return {
      id: this.id,
      status: 'idle',
      progress: 0,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  // ============ 进度报告 ============
  
  private progressCallbacks: Set<ProgressCallback> = new Set();
  
  /**
   * 注册进度回调
   * @param callback 进度回调函数
   */
  onProgress(callback: ProgressCallback): void {
    this.progressCallbacks.add(callback);
  }
  
  /**
   * 移除进度回调
   * @param callback 进度回调函数
   */
  offProgress(callback: ProgressCallback): void {
    this.progressCallbacks.delete(callback);
  }
  
  /**
   * 报告进度
   * @param progress 进度值 (0-100)
   * @param message 进度消息
   * @param details 详细信息
   */
  protected reportProgress(
    progress: number,
    message: string,
    details?: Record<string, any>
  ): void {
    this.setState({ progress, message });
    
    const event: ProgressEvent = {
      handId: this.id,
      progress,
      message,
      details,
      timestamp: new Date(),
    };
    
    for (const callback of this.progressCallbacks) {
      try {
        callback(event);
      } catch (error) {
        this.logger.error('Progress callback error', error);
      }
    }
  }

  // ============ 错误处理 ============
  
  private errorCallbacks: Set<ErrorCallback> = new Set();
  
  /**
   * 注册错误回调
   * @param callback 错误回调函数
   */
  onError(callback: ErrorCallback): void {
    this.errorCallbacks.add(callback);
  }
  
  /**
   * 处理错误
   * @param error 错误对象
   */
  protected async handleError(error: Error): Promise<void> {
    this.setState({ 
      status: 'error', 
      error: {
        message: error.message,
        stack: error.stack,
        timestamp: new Date(),
      }
    });
    
    const event: ErrorEvent = {
      handId: this.id,
      error,
      timestamp: new Date(),
    };
    
    for (const callback of this.errorCallbacks) {
      try {
        await callback(event);
      } catch (cbError) {
        this.logger.error('Error callback error', cbError);
      }
    }
  }
  
  /**
   * 尝试恢复
   * @param context 执行上下文
   * @param error 错误对象
   * @param attempt 当前尝试次数
   */
  protected async attemptRecovery(
    context: HandContext,
    error: Error,
    attempt: number
  ): Promise<boolean> {
    if (attempt >= context.maxRetries) {
      return false;
    }
    
    // 指数退避
    const delay = Math.min(
      context.retryBaseDelay * Math.pow(2, attempt),
      context.retryMaxDelay
    );
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    try {
      await this.execute(context);
      return true;
    } catch (retryError) {
      return this.attemptRecovery(context, retryError, attempt + 1);
    }
  }

  // ============ 依赖注入 ============
  
  protected logger: Logger;
  protected storage: Storage;
  protected eventBus: EventBus;
  
  constructor(deps: HandDependencies) {
    this.logger = deps.logger;
    this.storage = deps.storage;
    this.eventBus = deps.eventBus;
    this._state = this.createInitialState();
  }

  // ============ 生命周期钩子 ============
  
  /**
   * 执行前钩子
   * 在execute()之前调用
   */
  protected async beforeExecute?(context: HandContext): Promise<void>;
  
  /**
   * 执行后钩子
   * 在execute()之后调用，无论成功或失败
   */
  protected async afterExecute?(context: HandContext, result: HandResult): Promise<void>;
  
  /**
   * 状态变更钩子
   * 在状态变更时调用
   */
  protected async onStateChange?(oldState: HandState, newState: HandState): Promise<void>;
}
```

### 3.2 HandState 状态接口

```typescript
/**
 * Hand状态
 */
export interface HandState {
  /** Hand ID */
  id: string;
  
  /** 当前状态 */
  status: HandStatus;
  
  /** 进度 (0-100) */
  progress: number;
  
  /** 当前消息 */
  message?: string;
  
  /** 错误信息 */
  error?: HandError;
  
  /** 最后运行时间 */
  lastRunAt?: Date;
  
  /** 下次运行时间 */
  nextRunAt?: Date;
  
  /** 运行统计 */
  statistics: HandStatistics;
  
  /** 元数据 */
  metadata: Record<string, any>;
  
  /** 创建时间 */
  createdAt: Date;
  
  /** 更新时间 */
  updatedAt: Date;
}

/**
 * Hand状态枚举
 */
export type HandStatus = 
  | 'idle'         // 空闲
  | 'initializing' // 初始化中
  | 'running'      // 运行中
  | 'paused'       // 已暂停
  | 'completed'    // 已完成
  | 'error'        // 错误
  | 'terminated';  // 已终止

/**
 * Hand错误
 */
export interface HandError {
  message: string;
  stack?: string;
  timestamp: Date;
  recoverable: boolean;
}

/**
 * Hand统计
 */
export interface HandStatistics {
  /** 总运行次数 */
  totalRuns: number;
  
  /** 成功次数 */
  successCount: number;
  
  /** 失败次数 */
  failureCount: number;
  
  /** 平均执行时间 (ms) */
  averageDuration: number;
  
  /** 最后执行时间 (ms) */
  lastDuration?: number;
  
  /** 成功率 */
  successRate: number;
}
```

### 3.3 HandContext 上下文接口

```typescript
/**
 * Hand执行上下文
 */
export interface HandContext {
  /** Hand ID */
  handId: string;
  
  /** 调度时间 */
  scheduledAt: Date;
  
  /** 执行超时 (ms) */
  timeout: number;
  
  /** 最大重试次数 */
  maxRetries: number;
  
  /** 重试基础延迟 (ms) */
  retryBaseDelay: number;
  
  /** 重试最大延迟 (ms) */
  retryMaxDelay: number;
  
  /** Hand配置 */
  config: Record<string, any>;
  
  /** 运行ID（唯一标识本次执行） */
  runId: string;
  
  /** 父运行ID（用于追踪嵌套执行） */
  parentRunId?: string;
  
  /** 日志器 */
  logger: Logger;
  
  /** 存储 */
  storage: Storage;
  
  /** 事件总线 */
  eventBus: EventBus;
  
  /** HTTP客户端 */
  httpClient: HttpClient;
  
  /** 数据库客户端 */
  dbClient?: DatabaseClient;
  
  /** 扩展资源 */
  resources: Map<string, any>;
}
```

### 3.4 HandResult 结果接口

```typescript
/**
 * Hand执行结果
 */
export interface HandResult {
  /** 是否成功 */
  success: boolean;
  
  /** 结果数据 */
  data?: any;
  
  /** 错误信息 */
  error?: HandError;
  
  /** 执行时长 (ms) */
  duration: number;
  
  /** 指标数据 */
  metrics: HandMetrics;
  
  /** 生成的警报 */
  alerts?: Alert[];
  
  /** 生成的报告 */
  reports?: Report[];
  
  /** 下一步建议 */
  recommendations?: Recommendation[];
  
  /** 元数据 */
  metadata: Record<string, any>;
}

/**
 * Hand指标
 */
export interface HandMetrics {
  /** 处理的项目数 */
  itemsProcessed: number;
  
  /** 发现的问题数 */
  issuesFound: number;
  
  /** 生成的警报数 */
  alertsGenerated: number;
  
  /** API调用次数 */
  apiCalls: number;
  
  /** 数据传输量 (bytes) */
  dataTransferred: number;
  
  /** 自定义指标 */
  custom: Record<string, number>;
}
```

---

## 4. 状态模型

### 4.1 状态转换图

```
                                    ┌─────────────┐
                                    │  Terminated │
                                    └─────────────┘
                                          ▲
                                          │
┌─────────┐     ┌─────────────┐     ┌─────────┐     ┌───────────┐     ┌───────────┐
│  Idle   │ ──► │ Initializing│ ──► │ Running │ ──► │ Completed │ ──► │   Idle    │
└─────────┘     └─────────────┘     └─────────┘     └───────────┘     └───────────┘
     │               │                   │                                 ▲
     │               │                   │                                 │
     │               │                   ▼                                 │
     │               │             ┌─────────┐                             │
     │               │             │  Error  │─────────────────────────────┤
     │               │             └─────────┘                             │
     │               │                   │                                 │
     │               │                   ▼                                 │
     │               │             ┌─────────┐                             │
     │               └────────────►│ Recover │─────────────────────────────┘
     │                             └─────────┘
     │                                   │
     │                                   ▼
     │                             ┌─────────┐
     └────────────────────────────►│  Pause  │
                                   └─────────┘
```

### 4.2 状态转换规则

| 当前状态 | 目标状态 | 触发条件 | 动作 |
|----------|----------|----------|------|
| idle | initializing | start() | 调用initialize() |
| initializing | running | initialize成功 | 调用execute() |
| initializing | error | initialize失败 | 记录错误 |
| running | completed | execute成功 | 持久化结果 |
| running | error | execute失败 | 尝试恢复 |
| running | paused | pause() | 暂停执行 |
| paused | running | resume() | 恢复执行 |
| error | running | recover() | 重新执行 |
| * | terminated | terminate() | 调用terminate() |
| completed | idle | 自动 | 等待下次调度 |

---

## 5. 错误处理策略

### 5.1 错误分类

```typescript
/**
 * 错误类型
 */
export enum HandErrorType {
  /** 配置错误 */
  CONFIG_ERROR = 'CONFIG_ERROR',
  
  /** 连接错误 */
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  
  /** 超时错误 */
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  
  /** 资源错误 */
  RESOURCE_ERROR = 'RESOURCE_ERROR',
  
  /** 权限错误 */
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  
  /** 数据错误 */
  DATA_ERROR = 'DATA_ERROR',
  
  /** 外部服务错误 */
  EXTERNAL_ERROR = 'EXTERNAL_ERROR',
  
  /** 内部错误 */
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/**
 * 错误恢复策略
 */
export enum RecoveryStrategy {
  /** 立即重试 */
  IMMEDIATE_RETRY = 'IMMEDIATE_RETRY',
  
  /** 延迟重试 */
  DELAYED_RETRY = 'DELAYED_RETRY',
  
  /** 指数退避 */
  EXPONENTIAL_BACKOFF = 'EXPONENTIAL_BACKOFF',
  
  /** 跳过并继续 */
  SKIP_AND_CONTINUE = 'SKIP_AND_CONTINUE',
  
  /** 终止执行 */
  TERMINATE = 'TERMINATE',
  
  /** 需要人工干预 */
  MANUAL_INTERVENTION = 'MANUAL_INTERVENTION',
}
```

### 5.2 错误恢复矩阵

| 错误类型 | 恢复策略 | 最大重试 | 退避策略 |
|----------|----------|----------|----------|
| CONFIG_ERROR | TERMINATE | 0 | - |
| CONNECTION_ERROR | EXPONENTIAL_BACKOFF | 3 | 1s, 2s, 4s |
| TIMEOUT_ERROR | DELAYED_RETRY | 2 | 5s |
| RESOURCE_ERROR | EXPONENTIAL_BACKOFF | 3 | 10s, 20s, 40s |
| PERMISSION_ERROR | MANUAL_INTERVENTION | 0 | - |
| DATA_ERROR | SKIP_AND_CONTINUE | 1 | 1s |
| EXTERNAL_ERROR | EXPONENTIAL_BACKOFF | 5 | 2s, 4s, 8s, 16s, 32s |
| INTERNAL_ERROR | IMMEDIATE_RETRY | 1 | 0s |

---

## 6. 存储抽象

### 6.1 Storage接口

```typescript
/**
 * 存储抽象接口
 */
export interface Storage {
  /**
   * 获取值
   * @param key 键
   * @returns 值（如果不存在则返回undefined）
   */
  get<T>(key: string): Promise<T | undefined>;
  
  /**
   * 设置值
   * @param key 键
   * @param value 值
   * @param ttl 过期时间（秒）
   */
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  
  /**
   * 删除值
   * @param key 键
   */
  delete(key: string): Promise<void>;
  
  /**
   * 检查键是否存在
   * @param key 键
   */
  exists(key: string): Promise<boolean>;
  
  /**
   * 列出键
   * @param pattern 键模式
   */
  keys(pattern: string): Promise<string[]>;
  
  /**
   * 批量获取
   * @param keys 键列表
   */
  mget<T>(keys: string[]): Promise<Map<string, T>>;
  
  /**
   * 批量设置
   * @param entries 键值对
   */
  mset<T>(entries: Map<string, T>): Promise<void>;
}
```

### 6.2 存储实现

```typescript
/**
 * SQLite存储实现
 */
export class SQLiteStorage implements Storage {
  constructor(private db: Database) {}
  
  async get<T>(key: string): Promise<T | undefined> {
    const row = await this.db.get(
      'SELECT value, expires_at FROM storage WHERE key = ?',
      key
    );
    
    if (!row) return undefined;
    
    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      await this.delete(key);
      return undefined;
    }
    
    return JSON.parse(row.value);
  }
  
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const expiresAt = ttl ? new Date(Date.now() + ttl * 1000) : null;
    
    await this.db.run(
      `INSERT OR REPLACE INTO storage (key, value, expires_at)
       VALUES (?, ?, ?)`,
      key, JSON.stringify(value), expiresAt
    );
  }
  
  // ... 其他方法实现
}
```

---

## 7. 示例实现

### 7.1 ThreatHunter Hand示例

```typescript
/**
 * 威胁狩猎Hand
 */
export class ThreatHunterHand extends BaseHand {
  readonly id = 'threat-hunter';
  readonly name = 'Threat Hunter';
  readonly description = '自主威胁狩猎，检测和关联威胁指标';
  readonly version = '1.0.0';
  readonly category = HandCategory.DETECTION;
  readonly requiredCapabilities = ['log_access', 'network_access'];

  private mitreMapper: MITREMapper;
  private iocDetector: IOCDetector;

  async initialize(): Promise<void> {
    this.logger.info('Initializing ThreatHunter...');
    
    // 加载MITRE ATT&CK数据
    this.mitreMapper = new MITREMapper();
    await this.mitreMapper.load();
    
    // 初始化IOC检测器
    this.iocDetector = new IOCDetector({
      threatIntelFeeds: this.config.feeds,
    });
    
    this.logger.info('ThreatHunter initialized');
  }

  async execute(context: HandContext): Promise<HandResult> {
    const startTime = Date.now();
    
    try {
      await this.beforeExecute?.(context);
      
      this.reportProgress(0, 'Starting threat hunt');
      
      // 1. 收集日志
      this.reportProgress(10, 'Collecting logs');
      const logs = await this.collectLogs(context);
      
      // 2. 检测IOC
      this.reportProgress(30, 'Detecting IOCs');
      const iocs = await this.iocDetector.detect(logs);
      
      // 3. 关联事件
      this.reportProgress(50, 'Correlating events');
      const correlations = await this.correlateEvents(iocs);
      
      // 4. MITRE映射
      this.reportProgress(70, 'Mapping to MITRE ATT&CK');
      const techniques = await this.mitreMapper.map(correlations);
      
      // 5. 生成报告
      this.reportProgress(90, 'Generating report');
      const report = await this.generateReport(techniques);
      
      this.reportProgress(100, 'Threat hunt completed');
      
      const result: HandResult = {
        success: true,
        data: {
          iocs: iocs.length,
          correlations: correlations.length,
          techniques: techniques.length,
        },
        duration: Date.now() - startTime,
        metrics: {
          itemsProcessed: logs.length,
          issuesFound: iocs.length,
          alertsGenerated: correlations.filter(c => c.severity === 'high').length,
          apiCalls: 0,
          dataTransferred: 0,
          custom: {},
        },
        reports: [report],
      };
      
      await this.afterExecute?.(context, result);
      
      return result;
      
    } catch (error) {
      await this.handleError(error);
      
      return {
        success: false,
        error: {
          message: error.message,
          stack: error.stack,
          timestamp: new Date(),
          recoverable: true,
        },
        duration: Date.now() - startTime,
        metrics: {
          itemsProcessed: 0,
          issuesFound: 0,
          alertsGenerated: 0,
          apiCalls: 0,
          dataTransferred: 0,
          custom: {},
        },
      };
    }
  }

  async terminate(): Promise<void> {
    this.logger.info('Terminating ThreatHunter...');
    
    // 清理资源
    this.mitreMapper = null;
    this.iocDetector = null;
    
    this.logger.info('ThreatHunter terminated');
  }

  private async collectLogs(context: HandContext): Promise<Log[]> {
    // 实现日志收集逻辑
    return [];
  }

  private async correlateEvents(iocs: IOC[]): Promise<Correlation[]> {
    // 实现事件关联逻辑
    return [];
  }

  private async generateReport(techniques: Technique[]): Promise<Report> {
    // 实现报告生成逻辑
    return {
      title: 'Threat Hunt Report',
      timestamp: new Date(),
      summary: '',
      details: [],
    };
  }
}
```

---

## 8. 测试策略

### 8.1 单元测试

```typescript
describe('BaseHand', () => {
  class TestHand extends BaseHand {
    readonly id = 'test';
    readonly name = 'Test';
    readonly description = 'Test Hand';
    readonly version = '1.0.0';
    readonly category = HandCategory.DETECTION;
    readonly requiredCapabilities = [];
    
    async initialize() {}
    async execute() { return { success: true, duration: 0, metrics: {} }; }
    async terminate() {}
  }
  
  let hand: TestHand;
  
  beforeEach(() => {
    hand = new TestHand({
      logger: new MockLogger(),
      storage: new MockStorage(),
      eventBus: new MockEventBus(),
    });
  });
  
  describe('state management', () => {
    it('should start with idle status', () => {
      expect(hand.state.status).toBe('idle');
    });
    
    it('should update state correctly', () => {
      hand['setState']({ status: 'running' });
      expect(hand.state.status).toBe('running');
    });
  });
  
  describe('progress reporting', () => {
    it('should call progress callbacks', () => {
      const callback = jest.fn();
      hand.onProgress(callback);
      
      hand['reportProgress'](50, 'Half way');
      
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          progress: 50,
          message: 'Half way',
        })
      );
    });
  });
  
  describe('error handling', () => {
    it('should handle errors correctly', async () => {
      const callback = jest.fn();
      hand.onError(callback);
      
      await hand['handleError'](new Error('Test error'));
      
      expect(callback).toHaveBeenCalled();
      expect(hand.state.status).toBe('error');
    });
  });
});
```

### 8.2 集成测试

```typescript
describe('Hand Integration', () => {
  it('should execute hand lifecycle correctly', async () => {
    const hand = new ThreatHunterHand({
      logger: new ConsoleLogger(),
      storage: new SQLiteStorage(testDb),
      eventBus: new EventBus(),
    });
    
    // 初始化
    await hand.initialize();
    expect(hand.state.status).toBe('idle');
    
    // 执行
    const context = createTestContext();
    const result = await hand.execute(context);
    
    expect(result.success).toBe(true);
    expect(hand.state.status).toBe('completed');
    
    // 终止
    await hand.terminate();
    expect(hand.state.status).toBe('terminated');
  });
});
```

---

## 9. 部署注意事项

### 9.1 资源要求

| Hand类别 | CPU | 内存 | 存储 | 网络 |
|----------|-----|------|------|------|
| Detection | 中 | 512MB | 100MB | 中 |
| Scanning | 高 | 1GB | 500MB | 高 |
| Compliance | 低 | 256MB | 50MB | 低 |
| Response | 高 | 512MB | 200MB | 中 |

### 9.2 配置示例

```yaml
hand:
  threat-hunter:
    enabled: true
    schedule: "0 */6 * * *"  # 每6小时
    timeout: 3600000         # 1小时超时
    maxRetries: 3
    config:
      logSources:
        - type: syslog
          path: /var/log/syslog
        - type: json
          path: /var/log/app/*.json
      feeds:
        - misp
        - otx
      mitreVersion: "14.0"
```

---

## 10. 附录

### 10.1 术语表

| 术语 | 定义 |
|------|------|
| Hand | 自主安全任务的执行单元 |
| IOC | 威胁指标 (Indicator of Compromise) |
| MITRE ATT&CK | 威胁行为知识库 |
| TTP | 战术、技术和程序 |

### 10.2 参考资料

- [OpenFang Hands设计](../../../openfang-0.3.1/agents/hands/)
- [MITRE ATT&CK](https://attack.mitre.org/)
- [STIX 2.1规范](https://docs.oasis-open.org/cti/stix/v2.1/)

---

**文档版本历史**

| 版本 | 日期 | 作者 | 变更 |
|------|------|------|------|
| 1.0 | 2026-03-03 | Architecture Team | 初始版本 |

