/**
 * STT Module - Provider Implementations
 * 
 * Multiple STT provider implementations:
 * - OpenAI Whisper
 * - Deepgram
 * - Azure Speech Services
 * - Google Cloud Speech-to-Text
 * - Local Whisper (whisper.cpp)
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type {
  STTProviderName,
  STTOptions,
  TranscriptionResult,
  TranscriptionChunk,
  AudioFormat,
  WordTiming,
  Speaker,
} from './types.js';
import type {
  OpenAIConfig,
  DeepgramConfig,
  AzureSTTConfig,
  GoogleSTTConfig,
  LocalWhisperConfig,
} from './types.js';
import { BaseSTTProvider, STTFactory } from './engine.js';

// Supported languages list
const SUPPORTED_LANGUAGES = [
  'en', 'zh', 'es', 'fr', 'de', 'it', 'ja', 'ko', 'pt', 'ru',
  'ar', 'hi', 'nl', 'pl', 'tr', 'vi', 'th', 'id', 'sv', 'da',
  'no', 'fi', 'el', 'he', 'cs', 'hu', 'ro', 'uk', 'bg', 'hr',
  'sk', 'sl', 'lt', 'lv', 'et', 'ca', 'ms', 'fa', 'ta', 'te',
];

// OpenAI Whisper Provider
export class OpenAIWhisperProvider extends BaseSTTProvider {
  private model: 'whisper-1' | 'gpt-4o-transcribe';

  constructor(config: OpenAIConfig) {
    super(config);
    this.model = config.model ?? 'whisper-1';
  }

  getName(): STTProviderName {
    return 'openai';
  }

  async transcribe(
    audio: Buffer,
    options?: STTOptions
  ): Promise<TranscriptionResult> {
    this.validateAudio(audio);
    const opts = this.mergeOptions(options);

    if (!this.config.apiKey) {
      throw this.createError(
        'OpenAI API key is required',
        'MISSING_API_KEY'
      );
    }

    // In production, this would make an actual API call to OpenAI
    // This is a mock implementation for demonstration
    const mockResult = this.generateMockTranscription(opts);
    return mockResult;
  }

  async *transcribeStream(
    audio: AsyncIterable<Buffer>,
    options?: STTOptions
  ): AsyncIterable<TranscriptionChunk> {
    const opts = this.mergeOptions(options);

    if (!this.config.apiKey) {
      throw this.createError(
        'OpenAI API key is required',
        'MISSING_API_KEY'
      );
    }

    // OpenAI doesn't support true streaming, yield final result
    const chunks: Buffer[] = [];
    for await (const chunk of audio) {
      chunks.push(chunk);
    }

    const combined = Buffer.concat(chunks);
    const result = await this.transcribe(combined, opts);

    yield {
      text: result.text,
      isFinal: true,
      confidence: result.confidence,
      words: result.words,
      start: 0,
      end: result.duration,
    };
  }

  getSupportedLanguages(): string[] {
    return [...SUPPORTED_LANGUAGES];
  }

  async isAvailable(): Promise<boolean> {
    return !!this.config.apiKey;
  }

  private generateMockTranscription(
    opts: Required<STTOptions>
  ): TranscriptionResult {
    const words: WordTiming[] = [
      { word: 'Hello', start: 0.0, end: 0.5, confidence: 0.95 },
      { word: 'world', start: 0.6, end: 1.0, confidence: 0.93 },
    ];

    return {
      text: 'Hello world',
      confidence: 0.94,
      language: opts.language,
      duration: 1.0,
      words,
      sentences: [
        {
          text: 'Hello world',
          start: 0.0,
          end: 1.0,
          confidence: 0.94,
        },
      ],
    };
  }
}

// Deepgram Provider
export class DeepgramProvider extends BaseSTTProvider {
  private model: 'nova-2' | 'nova-2-ea' | 'base' | 'enhanced' | 'nova';

  constructor(config: DeepgramConfig) {
    super(config);
    this.model = config.model ?? 'nova-2';
  }

  getName(): STTProviderName {
    return 'deepgram';
  }

  async transcribe(
    audio: Buffer,
    options?: STTOptions
  ): Promise<TranscriptionResult> {
    this.validateAudio(audio);
    const opts = this.mergeOptions(options);

    if (!this.config.apiKey) {
      throw this.createError(
        'Deepgram API key is required',
        'MISSING_API_KEY'
      );
    }

    // Mock implementation - in production, use actual Deepgram API
    const mockResult = this.generateMockTranscription(opts);
    return mockResult;
  }

  async *transcribeStream(
    audio: AsyncIterable<Buffer>,
    options?: STTOptions
  ): AsyncIterable<TranscriptionChunk> {
    const opts = this.mergeOptions(options);

    if (!this.config.apiKey) {
      throw this.createError(
        'Deepgram API key is required',
        'MISSING_API_KEY'
      );
    }

    // Deepgram supports true streaming
    let buffer = Buffer.alloc(0);
    for await (const chunk of audio) {
      buffer = Buffer.concat([buffer, chunk]);
      // Yield interim results
      yield {
        text: 'Processing...',
        isFinal: false,
        confidence: 0.5,
      };
    }

    // Yield final result
    const result = await this.transcribe(buffer, opts);
    yield {
      text: result.text,
      isFinal: true,
      confidence: result.confidence,
      words: result.words,
      start: 0,
      end: result.duration,
    };
  }

  getSupportedLanguages(): string[] {
    return [...SUPPORTED_LANGUAGES];
  }

  async isAvailable(): Promise<boolean> {
    return !!this.config.apiKey;
  }

  private generateMockTranscription(
    opts: Required<STTOptions>
  ): TranscriptionResult {
    return {
      text: 'Sample transcription from Deepgram',
      confidence: 0.96,
      language: opts.language,
      duration: 2.5,
      words: [
        { word: 'Sample', start: 0.0, end: 0.4, confidence: 0.97 },
        { word: 'transcription', start: 0.5, end: 1.2, confidence: 0.95 },
        { word: 'from', start: 1.3, end: 1.5, confidence: 0.98 },
        { word: 'Deepgram', start: 1.6, end: 2.5, confidence: 0.94 },
      ],
    };
  }
}

// Azure Speech Services Provider
export class AzureSTTProvider extends BaseSTTProvider {
  private region: string;
  private speechKey: string;
  private endpointId?: string;

  constructor(config: AzureSTTConfig) {
    super(config);
    this.region = config.region ?? 'westus2';
    this.speechKey = config.speechKey;
    this.endpointId = config.endpointId;
  }

  getName(): STTProviderName {
    return 'azure';
  }

  async transcribe(
    audio: Buffer,
    options?: STTOptions
  ): Promise<TranscriptionResult> {
    this.validateAudio(audio);
    const opts = this.mergeOptions(options);

    if (!this.speechKey) {
      throw this.createError(
        'Azure Speech key is required',
        'MISSING_API_KEY'
      );
    }

    // Mock implementation - in production, use Azure SDK
    const mockResult = this.generateMockTranscription(opts);
    return mockResult;
  }

  async *transcribeStream(
    audio: AsyncIterable<Buffer>,
    options?: STTOptions
  ): AsyncIterable<TranscriptionChunk> {
    const opts = this.mergeOptions(options);

    if (!this.speechKey) {
      throw this.createError(
        'Azure Speech key is required',
        'MISSING_API_KEY'
      );
    }

    // Azure supports streaming via WebSocket
    let buffer = Buffer.alloc(0);
    for await (const chunk of audio) {
      buffer = Buffer.concat([buffer, chunk]);
      yield {
        text: 'Processing...',
        isFinal: false,
        confidence: 0.5,
      };
    }

    const result = await this.transcribe(buffer, opts);
    yield {
      text: result.text,
      isFinal: true,
      confidence: result.confidence,
      words: result.words,
      start: 0,
      end: result.duration,
    };
  }

  getSupportedLanguages(): string[] {
    // Azure supports 85+ languages
    return [...SUPPORTED_LANGUAGES];
  }

  async isAvailable(): Promise<boolean> {
    return !!this.speechKey;
  }

  private generateMockTranscription(
    opts: Required<STTOptions>
  ): TranscriptionResult {
    return {
      text: 'Azure speech to text transcription',
      confidence: 0.95,
      language: opts.language,
      duration: 2.0,
      words: [
        { word: 'Azure', start: 0.0, end: 0.5, confidence: 0.96 },
        { word: 'speech', start: 0.6, end: 1.0, confidence: 0.94 },
        { word: 'to', start: 1.1, end: 1.3, confidence: 0.98 },
        { word: 'text', start: 1.4, end: 1.7, confidence: 0.95 },
        { word: 'transcription', start: 1.8, end: 2.0, confidence: 0.93 },
      ],
    };
  }
}

// Google Cloud Speech-to-Text Provider
export class GoogleSTTProvider extends BaseSTTProvider {
  private projectId?: string;
  private location?: string;

  constructor(config: GoogleSTTConfig) {
    super(config);
    this.projectId = config.projectId;
    this.location = config.location;
  }

  getName(): STTProviderName {
    return 'google';
  }

  async transcribe(
    audio: Buffer,
    options?: STTOptions
  ): Promise<TranscriptionResult> {
    this.validateAudio(audio);
    const opts = this.mergeOptions(options);

    if (!this.config.apiKey && !this.projectId) {
      throw this.createError(
        'Google Cloud credentials required',
        'MISSING_CREDENTIALS'
      );
    }

    // Mock implementation - in production, use Google Cloud Speech API
    const mockResult = this.generateMockTranscription(opts);
    return mockResult;
  }

  async *transcribeStream(
    audio: AsyncIterable<Buffer>,
    options?: STTOptions
  ): AsyncIterable<TranscriptionChunk> {
    const opts = this.mergeOptions(options);

    if (!this.config.apiKey && !this.projectId) {
      throw this.createError(
        'Google Cloud credentials required',
        'MISSING_CREDENTIALS'
      );
    }

    // Google supports streaming via gRPC
    let buffer = Buffer.alloc(0);
    for await (const chunk of audio) {
      buffer = Buffer.concat([buffer, chunk]);
      yield {
        text: 'Speaking...',
        isFinal: false,
        confidence: 0.5,
      };
    }

    const result = await this.transcribe(buffer, opts);
    yield {
      text: result.text,
      isFinal: true,
      confidence: result.confidence,
      words: result.words,
      start: 0,
      end: result.duration,
    };
  }

  getSupportedLanguages(): string[] {
    // Google supports 125+ languages
    return [...SUPPORTED_LANGUAGES];
  }

  async isAvailable(): Promise<boolean> {
    return !!(this.config.apiKey || this.projectId);
  }

  private generateMockTranscription(
    opts: Required<STTOptions>
  ): TranscriptionResult {
    return {
      text: 'Google Cloud Speech transcription',
      confidence: 0.94,
      language: opts.language,
      duration: 2.2,
      words: [
        { word: 'Google', start: 0.0, end: 0.5, confidence: 0.96 },
        { word: 'Cloud', start: 0.6, end: 1.0, confidence: 0.95 },
        { word: 'Speech', start: 1.1, end: 1.5, confidence: 0.93 },
        { word: 'transcription', start: 1.6, end: 2.2, confidence: 0.92 },
      ],
    };
  }
}

// Local Whisper Provider (whisper.cpp)
export class LocalWhisperProvider extends BaseSTTProvider {
  private modelPath?: string;
  private modelSize: 'tiny' | 'base' | 'small' | 'medium' | 'large' | 'large-v3';
  private computeType: 'auto' | 'int8' | 'int8_float16' | 'int16' | 'float32';
  private numThreads: number;
  private whisperPath: string;

  constructor(config: LocalWhisperConfig) {
    super(config);
    this.modelPath = config.modelPath;
    this.modelSize = config.modelSize ?? 'base';
    this.computeType = config.computeType ?? 'auto';
    this.numThreads = config.numThreads ?? 4;
    this.whisperPath = this.detectWhisperCpp();
  }

  getName(): STTProviderName {
    return 'local';
  }

  async transcribe(
    audio: Buffer,
    options?: STTOptions
  ): Promise<TranscriptionResult> {
    this.validateAudio(audio);
    const opts = this.mergeOptions(options);

    // Check if whisper.cpp is available
    if (!this.isWhisperAvailable()) {
      throw this.createError(
        'whisper.cpp not found. Please install it.',
        'NOT_AVAILABLE'
      );
    }

    // Mock implementation - in production, use actual whisper.cpp
    const mockResult = this.generateMockTranscription(opts);
    return mockResult;
  }

  async *transcribeStream(
    audio: AsyncIterable<Buffer>,
    options?: STTOptions
  ): AsyncIterable<TranscriptionChunk> {
    const opts = this.mergeOptions(options);

    if (!this.isWhisperAvailable()) {
      throw this.createError(
        'whisper.cpp not found. Please install it.',
        'NOT_AVAILABLE'
      );
    }

    // Local Whisper doesn't support true streaming, process all at once
    const chunks: Buffer[] = [];
    for await (const chunk of audio) {
      chunks.push(chunk);
    }

    const combined = Buffer.concat(chunks);
    const result = await this.transcribe(combined, opts);

    yield {
      text: result.text,
      isFinal: true,
      confidence: result.confidence,
      words: result.words,
      start: 0,
      end: result.duration,
    };
  }

  getSupportedLanguages(): string[] {
    return [...SUPPORTED_LANGUAGES];
  }

  async isAvailable(): Promise<boolean> {
    return this.isWhisperAvailable();
  }

  private detectWhisperCpp(): string {
    // Check common locations
    const possiblePaths = [
      'whisper',
      './whisper.cpp/main',
      join(homedir(), 'whisper.cpp', 'main'),
      '/usr/local/bin/whisper',
    ];

    for (const path of possiblePaths) {
      try {
        execSync(`${path} --help`, { stdio: 'ignore' });
        return path;
      } catch {
        continue;
      }
    }

    return 'whisper'; // Default, will fail if not found
  }

  private isWhisperAvailable(): boolean {
    try {
      execSync(`${this.whisperPath} --help`, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  private generateMockTranscription(
    opts: Required<STTOptions>
  ): TranscriptionResult {
    return {
      text: 'Local Whisper transcription',
      confidence: 0.95,
      language: opts.language,
      duration: 1.8,
      words: [
        { word: 'Local', start: 0.0, end: 0.4, confidence: 0.96 },
        { word: 'Whisper', start: 0.5, end: 0.9, confidence: 0.95 },
        { word: 'transcription', start: 1.0, end: 1.8, confidence: 0.94 },
      ],
    };
  }
}

// Register all providers with the factory
STTFactory.register(
  'openai',
  OpenAIWhisperProvider as new (
    config: import('./types.js').ProviderConfig
  ) => import('./types.js').STTProvider
);

STTFactory.register(
  'deepgram',
  DeepgramProvider as new (
    config: import('./types.js').ProviderConfig
  ) => import('./types.js').STTProvider
);

STTFactory.register(
  'azure',
  AzureSTTProvider as new (
    config: import('./types.js').ProviderConfig
  ) => import('./types.js').STTProvider
);

STTFactory.register(
  'google',
  GoogleSTTProvider as new (
    config: import('./types.js').ProviderConfig
  ) => import('./types.js').STTProvider
);

STTFactory.register(
  'local',
  LocalWhisperProvider as new (
    config: import('./types.js').ProviderConfig
  ) => import('./types.js').STTProvider
);
