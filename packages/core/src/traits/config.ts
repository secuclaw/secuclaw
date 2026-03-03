/**
 * Config Loader - 配置加载器
 * 
 * 加载和解析YAML配置文件
 * @version 2.0.0
 */

import { readFile, access } from 'fs/promises';
import { join, dirname } from 'path';
import type { TraitType } from "./registry.js";

// ============ 类型定义 ============

/**
 * 提供商配置
 */
export interface ProviderConfigEntry {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  timeout?: number;
  retries?: number;
  extra?: Record<string, unknown>;
}

/**
 * 渠道配置
 */
export interface ChannelConfigEntry {
  botToken?: string;
  appToken?: string;
  webhookUrl?: string;
  timeout?: number;
  retries?: number;
  extra?: Record<string, unknown>;
}

/**
 * 记忆配置
 */
export interface MemoryConfigEntry {
  path?: string;
  connectionString?: string;
  embeddingModel?: string;
  embeddingDimensions?: number;
  maxEntries?: number;
  autoCompactInterval?: number;
  extra?: Record<string, unknown>;
}

/**
 * 运行时路由配置
 */
export interface RuntimeRouting {
  /** 根据任务类型选择提供商 */
  provider?: Record<string, string>;
  /** 根据用户偏好选择渠道 */
  channel?: Record<string, string>;
}

/**
 * 注册表配置
 */
export interface RegistryConfigFile {
  /** 默认实现 */
  defaults?: Partial<Record<TraitType, string>>;
  /** 实现配置 */
  implementations?: {
    provider?: Record<string, ProviderConfigEntry>;
    channel?: Record<string, ChannelConfigEntry>;
    memory?: Record<string, MemoryConfigEntry>;
    tool?: Record<string, Record<string, unknown>>;
    [key: string]: Record<string, unknown> | undefined;
  };
}

/**
 * 完整配置文件
 */
export interface SecuClawConfig {
  /** 注册表配置 */
  registry?: RegistryConfigFile;
  /** 运行时配置 */
  runtime?: {
    routing?: RuntimeRouting;
    /** 调试模式 */
    debug?: boolean;
    /** 日志级别 */
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
  };
  /** 应用配置 */
  app?: {
    name?: string;
    version?: string;
    environment?: 'development' | 'staging' | 'production';
  };
  /** 原始配置 */
  _raw?: Record<string, unknown>;
}

/**
 * 加载选项
 */
export interface LoadOptions {
  /** 配置文件路径 */
  path?: string;
  /** 环境变量前缀 */
  envPrefix?: string;
  /** 是否解析环境变量 */
  resolveEnv?: boolean;
  /** 是否合并默认配置 */
  mergeDefaults?: boolean;
  /** 额外的默认配置 */
  defaults?: Partial<SecuClawConfig>;
}

// ============ 错误类 ============

/**
 * 配置加载错误
 */
export class ConfigLoadError extends Error {
  constructor(
    public readonly path: string,
    public readonly cause: unknown
  ) {
    super(`Failed to load config from ${path}: ${cause}`);
    this.name = 'ConfigLoadError';
  }
}

/**
 * 配置验证错误
 */
export class ConfigValidationError extends Error {
  constructor(
    public readonly errors: Array<{ path: string; message: string }>
  ) {
    super(`Config validation failed: ${errors.map(e => e.message).join(', ')}`);
    this.name = 'ConfigValidationError';
  }
}

// ============ YAML 解析器 ============

/**
 * 简化的 YAML 解析器
 * 注意：这是一个简化实现，生产环境建议使用 js-yaml 或 yaml 库
 */
class SimpleYAMLParser {
  parse(content: string): unknown {
    const lines = content.split('\n');
    const result: unknown = this.parseLines(lines, 0, 0).value;
    return result;
  }

  private parseLines(
    lines: string[],
    startIndex: number,
    expectedIndent: number
  ): { value: unknown; nextIndex: number } {
    const result: Record<string, unknown> = {};
    let i = startIndex;

    while (i < lines.length) {
      const line = lines[i];
      
      // 跳过空行和注释
      if (line.trim() === '' || line.trimStart().startsWith('#')) {
        i++;
        continue;
      }

      const indent = line.length - line.trimStart().length;
      
      // 如果缩进减少，返回上一层
      if (indent < expectedIndent) {
        break;
      }

      // 如果缩进增加，进入嵌套对象
      if (indent > expectedIndent) {
        i++;
        continue;
      }

      const trimmed = line.trim();
      
      // 解析键值对
      if (trimmed.includes(':')) {
        const colonIndex = trimmed.indexOf(':');
        const key = trimmed.slice(0, colonIndex).trim();
        const valueStr = trimmed.slice(colonIndex + 1).trim();

        if (valueStr === '' || valueStr === '|' || valueStr === '>') {
          // 嵌套对象或多行字符串
          if (valueStr === '|' || valueStr === '>') {
            // 多行字符串
            const { value, nextIndex } = this.parseMultiLineString(lines, i + 1, indent + 2);
            result[key] = value;
            i = nextIndex;
          } else {
            // 嵌套对象
            const { value, nextIndex } = this.parseLines(lines, i + 1, indent + 2);
            result[key] = value;
            i = nextIndex;
          }
        } else {
          // 简单值
          result[key] = this.parseValue(valueStr);
          i++;
        }
      } else if (trimmed.startsWith('- ')) {
        // 数组项
        const arr = result as unknown as unknown[];
        if (!Array.isArray(arr)) {
          return { value: [this.parseValue(trimmed.slice(2))], nextIndex: i + 1 };
        }
        arr.push(this.parseValue(trimmed.slice(2)));
        i++;
      } else {
        i++;
      }
    }

    return { value: result, nextIndex: i };
  }

  private parseMultiLineString(
    lines: string[],
    startIndex: number,
    expectedIndent: number
  ): { value: string; nextIndex: number } {
    const parts: string[] = [];
    let i = startIndex;

    while (i < lines.length) {
      const line = lines[i];
      const indent = line.length - line.trimStart().length;
      
      if (line.trim() === '') {
        parts.push('');
        i++;
        continue;
      }
      
      if (indent < expectedIndent) {
        break;
      }

      parts.push(line.slice(expectedIndent));
      i++;
    }

    return { value: parts.join('\n'), nextIndex: i };
  }

  private parseValue(value: string): unknown {
    // 布尔值
    if (value === 'true') return true;
    if (value === 'false') return false;
    
    // null
    if (value === 'null' || value === '~') return null;
    
    // 数字
    const num = Number(value);
    if (!isNaN(num)) return num;
    
    // 引号包围的字符串
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1);
    }
    
    // 普通字符串
    return value;
  }
}

// ============ 配置加载器 ============

/**
 * 配置加载器
 */
export class ConfigLoader {
  private yamlParser = new SimpleYAMLParser();
  private defaultConfigPaths = [
    './secuclaw.config.yaml',
    './secuclaw.config.yml',
    './config/secuclaw.yaml',
    './config/secuclaw.yml',
    './.secuclaw/config.yaml',
  ];

  /**
   * 加载配置
   * @param options 加载选项
   */
  async load(options: LoadOptions = {}): Promise<SecuClawConfig> {
    const {
      path,
      envPrefix = 'SECUCLAW_',
      resolveEnv = true,
      mergeDefaults = true,
      defaults = {},
    } = options;

    // 查找配置文件
    const configPath = path ?? await this.findConfigFile();
    
    if (!configPath) {
      if (mergeDefaults) {
        return this.applyDefaults(defaults);
      }
      return {};
    }

    try {
      // 读取文件内容
      const content = await readFile(configPath, 'utf-8');
      
      // 解析 YAML
      let config = this.yamlParser.parse(content) as SecuClawConfig;
      
      // 解析环境变量
      if (resolveEnv) {
        config = this.resolveEnvVars(config, envPrefix) as SecuClawConfig;
      }
      
      // 合并默认值
      if (mergeDefaults) {
        config = this.mergeConfigs(defaults, config);
      }

      // 保存原始配置
      config._raw = { ...config };

      return config;
    } catch (error) {
      throw new ConfigLoadError(configPath, error);
    }
  }

  /**
   * 从字符串加载
   * @param content YAML 内容
   * @param options 选项
   */
  loadFromString(content: string, options: Omit<LoadOptions, 'path'> = {}): SecuClawConfig {
    const { envPrefix = 'SECUCLAW_', resolveEnv = true } = options;
    
    let config = this.yamlParser.parse(content) as SecuClawConfig;
    
    if (resolveEnv) {
      config = this.resolveEnvVars(config, envPrefix) as SecuClawConfig;
    }
    
    return config;
  }

  /**
   * 查找配置文件
   */
  private async findConfigFile(): Promise<string | null> {
    for (const path of this.defaultConfigPaths) {
      try {
        await access(path);
        return path;
      } catch {
        continue;
      }
    }
    return null;
  }

  /**
   * 解析环境变量
   * @param obj 对象
   * @param prefix 前缀
   */
  private resolveEnvVars(obj: unknown, prefix: string): unknown {
    if (typeof obj === 'string') {
      // 匹配 ${VAR} 或 ${VAR:-default}
      return obj.replace(/\$\{([^}]+)\}/g, (_, expr: string) => {
        const [varName, defaultValue] = expr.split(':-');
        const envValue = process.env[varName] ?? process.env[prefix + varName];
        return envValue ?? defaultValue ?? '';
      });
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.resolveEnvVars(item, prefix));
    }
    
    if (typeof obj === 'object' && obj !== null) {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.resolveEnvVars(value, prefix);
      }
      return result;
    }
    
    return obj;
  }

  /**
   * 合并配置
   */
  private mergeConfigs(
    defaults: Partial<SecuClawConfig>,
    config: SecuClawConfig
  ): SecuClawConfig {
    return {
      ...defaults,
      ...config,
      registry: {
        ...defaults.registry,
        ...config.registry,
        defaults: {
          ...defaults.registry?.defaults,
          ...config.registry?.defaults,
        },
        implementations: {
          ...defaults.registry?.implementations,
          ...config.registry?.implementations,
        },
      },
      runtime: {
        ...defaults.runtime,
        ...config.runtime,
        routing: {
          provider: {
            ...defaults.runtime?.routing?.provider,
            ...config.runtime?.routing?.provider,
          },
          channel: {
            ...defaults.runtime?.routing?.channel,
            ...config.runtime?.routing?.channel,
          },
        },
      },
    };
  }

  /**
   * 应用默认值
   */
  private applyDefaults(defaults: Partial<SecuClawConfig>): SecuClawConfig {
    return {
      registry: {
        defaults: defaults.registry?.defaults ?? {},
        implementations: defaults.registry?.implementations ?? {},
      },
      runtime: {
        debug: false,
        logLevel: 'info',
        routing: defaults.runtime?.routing ?? {},
      },
      app: defaults.app ?? {},
    };
  }

  /**
   * 验证配置
   * @param config 配置
   */
  validate(config: SecuClawConfig): { valid: boolean; errors: Array<{ path: string; message: string }> } {
    const errors: Array<{ path: string; message: string }> = [];

    // 验证默认实现是否存在对应的配置
    if (config.registry?.defaults) {
      for (const [traitType, implId] of Object.entries(config.registry.defaults)) {
        const impls = config.registry.implementations?.[traitType as TraitType];
        if (impls && !impls[implId]) {
          errors.push({
            path: `registry.defaults.${traitType}`,
            message: `Default implementation '${implId}' not found in implementations`,
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 获取提供商配置
   */
  getProviderConfig(config: SecuClawConfig, providerId: string): ProviderConfigEntry | undefined {
    return config.registry?.implementations?.provider?.[providerId];
  }

  /**
   * 获取渠道配置
   */
  getChannelConfig(config: SecuClawConfig, channelId: string): ChannelConfigEntry | undefined {
    return config.registry?.implementations?.channel?.[channelId];
  }

  /**
   * 获取记忆配置
   */
  getMemoryConfig(config: SecuClawConfig, memoryId: string): MemoryConfigEntry | undefined {
    return config.registry?.implementations?.memory?.[memoryId];
  }

  /**
   * 根据任务类型获取提供商
   */
  getProviderForTask(config: SecuClawConfig, taskType: string): string | undefined {
    return config.runtime?.routing?.provider?.[taskType] ??
           config.registry?.defaults?.provider;
  }

  /**
   * 根据用户ID获取渠道
   */
  getChannelForUser(config: SecuClawConfig, userId: string): string | undefined {
    return config.runtime?.routing?.channel?.[userId] ??
           config.registry?.defaults?.channel;
  }
}

// ============ 导出 ============

export const configLoader = new ConfigLoader();
