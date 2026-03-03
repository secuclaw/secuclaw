/**
 * STT Module - Engine
 * 
 * Base STT provider class and factory for creating STT providers.
 */

import type {
  STTProvider,
  STTProviderName,
  STTConfig,
  STTOptions,
  TranscriptionResult,
  TranscriptionChunk,
  ProviderConfig,
} from './types.js';

/**
 * Abstract base class for STT providers.
 * All STT provider implementations should extend this class.
 */
export abstract class BaseSTTProvider implements STTProvider {
  protected config: STTConfig;
  protected defaultOptions: Required<STTOptions>;

  constructor(config: STTConfig) {
    this.config = config;
    this.defaultOptions = {
      language: config.defaultLanguage ?? 'en',
      model: config.defaultModel ?? 'base',
      prompt: '',
      temperature: 0,
      punctuation: true,
      profanityFilter: false,
      diarization: false,
      speakerLabels: false,
      outputFormat: 'json',
      sampleRate: 16000,
      channels: 1,
      codec: 'pcm',
      ...config.defaultOptions,
    };
  }

  abstract getName(): STTProviderName;

  abstract transcribe(audio: Buffer, options?: STTOptions): Promise<TranscriptionResult>;

  abstract transcribeStream(
    audio: AsyncIterable<Buffer>,
    options?: STTOptions
  ): AsyncIterable<TranscriptionChunk>;

  abstract getSupportedLanguages(): string[];

  abstract isAvailable(): Promise<boolean>;

  /**
   * Merge user options with defaults.
   */
  protected mergeOptions(options?: STTOptions): Required<STTOptions> {
    return {
      ...this.defaultOptions,
      ...options,
    };
  }

  /**
   * Validate audio input before transcription.
   */
  protected validateAudio(audio: Buffer): void {
    if (!audio || audio.length === 0) {
      throw this.createError('Audio buffer cannot be empty', 'EMPTY_AUDIO');
    }
    // Maximum audio size: 25MB (API limit for most providers)
    const maxSize = 25 * 1024 * 1024;
    if (audio.length > maxSize) {
      throw this.createError(
        `Audio size exceeds maximum of ${maxSize / 1024 / 1024}MB`,
        'AUDIO_TOO_LARGE'
      );
    }
  }

  /**
   * Validate language code.
   */
  protected validateLanguage(language: string): void {
    const supported = this.getSupportedLanguages();
    const langCode = language.split('-')[0]; // Extract base language code
    if (!supported.includes(langCode) && !supported.includes(language)) {
      throw this.createError(
        `Language "${language}" is not supported by ${this.getName()}`,
        'UNSUPPORTED_LANGUAGE'
      );
    }
  }

  protected createError(
    message: string,
    code?: string,
    retryable = false
  ): (Error & { provider: STTProviderName; code?: string; retryable?: boolean }) {
    const error = new Error(message) as Error & {
      provider: STTProviderName;
      code?: string;
      retryable?: boolean;
    };
    error.provider = this.getName();
    error.code = code;
    error.retryable = retryable;
    return error;
  }

  /**
   * Convert audio to the required format for the provider.
   * Override in subclasses for provider-specific conversions.
   */
  protected convertAudio(audio: Buffer, targetFormat: string): Buffer {
    // Default implementation returns the original buffer
    // Subclasses can override to implement format conversion
    return audio;
  }
}

/**
 * Factory for creating STT providers.
 * Supports registration of custom providers.
 */
export class STTFactory {
  private static providers = new Map<
    STTProviderName,
    new (config: ProviderConfig) => STTProvider
  >();

  /**
   * Register a new STT provider.
   */
  static register(
    name: STTProviderName,
    provider: new (config: ProviderConfig) => STTProvider
  ): void {
    if (this.providers.has(name)) {
      console.warn(
        `STT provider "${name}" is already registered. Overwriting.`
      );
    }
    this.providers.set(name, provider);
  }

  /**
   * Create an STT provider by name.
   */
  static create(config: ProviderConfig): STTProvider {
    const Provider = this.providers.get(config.provider);
    if (!Provider) {
      const available = this.getAvailableProviders();
      throw new Error(
        `Unknown STT provider: ${config.provider}. Available providers: ${available.join(
          ', '
        )}`
      );
    }
    return new Provider(config);
  }

  /**
   * Get a list of available provider names.
   */
  static getAvailableProviders(): STTProviderName[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if a provider is registered.
   */
  static hasProvider(name: STTProviderName): boolean {
    return this.providers.has(name);
  }

  /**
   * Unregister a provider.
   */
  static unregister(name: STTProviderName): boolean {
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
 * STT Engine - High-level API for speech-to-text.
 * Provides convenience methods for common operations.
 */
export class STTEngine {
  private provider: STTProvider;
  private metrics: Map<string, number> = new Map();

  constructor(provider: STTProvider) {
    this.provider = provider;
  }

  /**
   * Get the provider name.
   */
  getProviderName(): STTProviderName {
    return this.provider.getName();
  }

  /**
   * Convert speech to text.
   */
  async recognize(
    audio: Buffer,
    options?: STTOptions
  ): Promise<TranscriptionResult> {
    const startTime = Date.now();
    try {
      const result = await this.provider.transcribe(audio, options);
      this.recordMetric('transcribe', Date.now() - startTime);
      return result;
    } catch (error) {
      this.recordMetric('transcribe_error', Date.now() - startTime);
      throw error;
    }
  }

  /**
   * Convert speech to text from a stream.
   */
  recognizeStream(
    audio: AsyncIterable<Buffer>,
    options?: STTOptions
  ): AsyncIterable<TranscriptionChunk> {
    return this.provider.transcribeStream(audio, options);
  }

  /**
   * Get supported languages.
   */
  getSupportedLanguages(): string[] {
    return this.provider.getSupportedLanguages();
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
