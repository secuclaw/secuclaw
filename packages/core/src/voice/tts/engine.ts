/**
 * TTS Module - Engine
 * 
 * Base TTS provider class and factory for creating TTS providers.
 */

import type {
  TTSProvider,
  TTSProviderName,
  TTSConfig,
  TTSOptions,
  SynthesisResult,
  Voice,
  StreamChunk,
  ProviderConfig,
} from './types.js';

/**
 * Abstract base class for TTS providers.
 * All TTS provider implementations should extend this class.
 */
export abstract class BaseTTSProvider implements TTSProvider {
  protected config: TTSConfig;
  protected defaultOptions: Required<TTSOptions>;

  constructor(config: TTSConfig) {
    this.config = config;
    this.defaultOptions = {
      voice: config.defaultVoice ?? 'default',
      speed: config.defaultSpeed ?? 1.0,
      pitch: config.defaultPitch ?? 1.0,
      language: config.defaultLanguage ?? 'en-US',
      format: config.defaultFormat ?? 'mp3',
      quality: 'high',
      ssml: false,
    };
  }

  abstract getName(): TTSProviderName;

  abstract synthesize(text: string, options?: TTSOptions): Promise<SynthesisResult>;

  abstract synthesizeStream(text: string, options?: TTSOptions): AsyncIterable<StreamChunk>;

  abstract getVoices(): Promise<Voice[]>;

  abstract isAvailable(): Promise<boolean>;

  /**
   * Merge user options with defaults.
   */
  protected mergeOptions(options?: TTSOptions): Required<TTSOptions> {
    return {
      ...this.defaultOptions,
      ...options,
    };
  }

  /**
   * Validate text input before synthesis.
   */
  protected validateText(text: string): void {
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }
    if (text.length > 10000) {
      throw new Error('Text exceeds maximum length of 10000 characters');
    }
  }

  /**
   * Create a TTS error with provider context.
   */
  protected createError(message: string, code?: string, retryable = false): Error & {
    provider: TTSProviderName;
    code?: string;
    retryable?: boolean;
  } {
    const error = new Error(message) as Error & {
      provider: TTSProviderName;
      code?: string;
      retryable?: boolean;
    };
    error.provider = this.getName();
    error.code = code;
    error.retryable = retryable;
    return error;
  }
}

/**
 * Factory for creating TTS providers.
 * Supports registration of custom providers.
 */
export class TTSFactory {
  private static providers = new Map<TTSProviderName, new (config: ProviderConfig) => TTSProvider>();

  /**
   * Register a new TTS provider.
   */
  static register(name: TTSProviderName, provider: new (config: ProviderConfig) => TTSProvider): void {
    if (this.providers.has(name)) {
      console.warn(`TTS provider "${name}" is already registered. Overwriting.`);
    }
    this.providers.set(name, provider);
  }

  /**
   * Create a TTS provider by name.
   */
  static create(config: ProviderConfig): TTSProvider {
    const Provider = this.providers.get(config.provider);
    if (!Provider) {
      const available = this.getAvailableProviders();
      throw new Error(
        `Unknown TTS provider: ${config.provider}. Available providers: ${available.join(', ')}`
      );
    }
    return new Provider(config);
  }

  /**
   * Get a list of available provider names.
   */
  static getAvailableProviders(): TTSProviderName[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if a provider is registered.
   */
  static hasProvider(name: TTSProviderName): boolean {
    return this.providers.has(name);
  }

  /**
   * Unregister a provider.
   */
  static unregister(name: TTSProviderName): boolean {
    return this.providers.delete(name);
  }

  /**
   * Clear all registered providers (useful for testing).
   */
  static clear(): void {
    this.providers.clear();
  }
}

/**
 * TTS Engine - High-level API for text-to-speech.
 * Provides convenience methods for common operations.
 */
export class TTSEngine {
  private provider: TTSProvider;
  private metrics: Map<string, number> = new Map();

  constructor(provider: TTSProvider) {
    this.provider = provider;
  }

  /**
   * Get the provider name.
   */
  getProviderName(): TTSProviderName {
    return this.provider.getName();
  }

  /**
   * Convert text to speech.
   */
  async speak(text: string, options?: TTSOptions): Promise<SynthesisResult> {
    const startTime = Date.now();
    try {
      const result = await this.provider.synthesize(text, options);
      this.recordMetric('synthesize', Date.now() - startTime);
      return result;
    } catch (error) {
      this.recordMetric('synthesize_error', Date.now() - startTime);
      throw error;
    }
  }

  /**
   * Convert text to speech as a stream.
   */
  speakStream(text: string, options?: TTSOptions): AsyncIterable<StreamChunk> {
    return this.provider.synthesizeStream(text, options);
  }

  /**
   * Get available voices.
   */
  async getVoices(): Promise<Voice[]> {
    return this.provider.getVoices();
  }

  /**
   * Check if the provider is available.
   */
  async isAvailable(): Promise<boolean> {
    return this.provider.isAvailable();
  }

  /**
   * Get a specific metric value.
   */
  getMetric(name: string): number | undefined {
    return this.metrics.get(name);
  }

  /**
   * Record a metric.
   */
  private recordMetric(name: string, value: number): void {
    this.metrics.set(name, value);
  }

  /**
   * Get all metrics.
   */
  getAllMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }
}
