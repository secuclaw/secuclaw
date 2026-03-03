/**
 * STT Module - Entry Point
 * 
 * Speech-to-Text module for SecuClaw.
 * Supports multiple providers: OpenAI Whisper, Deepgram, Azure, Google, Local.
 */

// Re-export types
export type {
  AudioFormat,
  AudioCodec,
  STTProviderName,
  STTOptions,
  WordTiming,
  Sentence,
  Paragraph,
  Speaker,
  TranscriptionResult,
  TranscriptionChunk,
  STTConfig,
  STTError,
  STTProvider,
  STTProviderClass,
  OpenAIConfig,
  DeepgramConfig,
  AzureSTTConfig,
  GoogleSTTConfig,
  LocalWhisperConfig,
  ProviderConfig,
  STTMetrics,
  AudioInput,
  StreamingConfig,
} from './types.js';

// Re-export engine classes
export { BaseSTTProvider, STTFactory, STTEngine } from './engine.js';

// Re-export provider classes
export {
  OpenAIWhisperProvider,
  DeepgramProvider,
  AzureSTTProvider,
  GoogleSTTProvider,
  LocalWhisperProvider,
} from './providers.js';

// Re-export streaming utilities
export {
  AudioChunkBuffer,
  EnergyVAD,
  StreamingRecognizer,
  AudioUtils,
  type StreamingSessionState,
  type StreamingRecognizerOptions,
} from './streaming.js';

// Convenience function to create an STT engine with a specific provider
import { STTFactory, STTEngine } from './engine.js';
import type { ProviderConfig } from './types.js';

/**
 * Create an STT engine with the specified provider configuration.
 */
export function createSTTEngine(config: ProviderConfig): STTEngine {
  const provider = STTFactory.create(config);
  return new STTEngine(provider);
}

/**
 * Get a list of available STT providers.
 */
export function getAvailableSTTProviders(): string[] {
  return STTFactory.getAvailableProviders();
}

/**
 * Check if a specific STT provider is available.
 */
export function hasSTTProvider(name: string): boolean {
  return STTFactory.hasProvider(name as import('./types.js').STTProviderName);
}
