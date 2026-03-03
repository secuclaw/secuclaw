/**
 * TTS Module - Text-to-Speech Voice Synthesis
 * 
 * A comprehensive TTS module supporting multiple providers:
 * - OpenAI TTS
 * - ElevenLabs
 * - Edge TTS (Microsoft)
 * - Azure Speech Services
 * - Google Cloud TTS
 * - Local TTS (espeak, say)
 * 
 * @example
 * ```typescript
 * import { TTSFactory, TTSEngine } from './voice/tts/index.js';
 * 
 * // Create a provider
 * const provider = TTSFactory.create({
 *   provider: 'openai',
 *   apiKey: process.env.OPENAI_API_KEY,
 *   defaultVoice: 'alloy',
 * });
 * 
 * // Create engine
 * const engine = new TTSEngine(provider);
 * 
 * // Synthesize speech
 * const result = await engine.speak('Hello, world!');
 * console.log(result.audio);
 * ```
 */

// Types
export type {
  AudioFormat,
  AudioQuality,
  TTSProviderName,
  TTSOptions,
  Voice,
  TTSConfig,
  SynthesisResult,
  StreamChunk,
  TTSError,
  TTSProvider,
  TTSProviderClass,
  OpenAIConfig,
  ElevenLabsConfig,
  EdgeConfig,
  AzureConfig,
  GoogleConfig,
  LocalConfig,
  ProviderConfig,
  TTSMetrics,
} from './types.js';

import { TTSFactory, TTSEngine } from './engine.js';
import type { AudioFormat, AudioQuality, TTSProviderName, TTSOptions, SynthesisResult, ProviderConfig } from './types.js';
export { BaseTTSProvider, TTSFactory, TTSEngine } from './engine.js';

// Providers
export { OpenAITTSProvider } from './providers.js';
export { ElevenLabsProvider } from './providers.js';
export { EdgeTTSProvider } from './providers.js';
export { AzureTTSProvider } from './providers.js';
export { GoogleTTSProvider } from './providers.js';
export { LocalTTSProvider } from './providers.js';

// Convenience function for quick synthesis
export async function synthesize(
  text: string,
  config: {
    provider: TTSProviderName;
    apiKey?: string;
    voice?: string;
    format?: AudioFormat;
  },
  options?: TTSOptions
): Promise<SynthesisResult> {
  const provider = TTSFactory.create({
    provider: config.provider,
    apiKey: config.apiKey,
    defaultVoice: config.voice,
    defaultFormat: config.format,
  } as ProviderConfig);
  
  const engine = new TTSEngine(provider);
  return engine.speak(text, options);
}

// Default voices for common languages
export const DEFAULT_VOICES: Record<string, Record<TTSProviderName, string>> = {
  'en-US': {
    openai: 'alloy',
    elevenlabs: 'Rachel',
    edge: 'en-US-AriaNeural',
    azure: 'en-US-AriaNeural',
    google: 'en-US-Neural2-A',
    local: 'default',
  },
  'en-GB': {
    openai: 'alloy',
    elevenlabs: 'Sarah',
    edge: 'en-GB-SoniaNeural',
    azure: 'en-GB-SoniaNeural',
    google: 'en-GB-Neural2-A',
    local: 'default',
  },
  'zh-CN': {
    openai: 'alloy',
    elevenlabs: 'Rachel',
    edge: 'zh-CN-XiaoxiaoNeural',
    azure: 'zh-CN-XiaoxiaoNeural',
    google: 'zh-CN-Neural2-A',
    local: 'default',
  },
  'ja-JP': {
    openai: 'alloy',
    elevenlabs: 'Rachel',
    edge: 'ja-JP-NanamiNeural',
    azure: 'ja-JP-NanamiNeural',
    google: 'ja-JP-Neural2-A',
    local: 'default',
  },
};

// Provider metadata for UI display
export interface ProviderMetadata {
  name: TTSProviderName;
  displayName: string;
  description: string;
  requiresApiKey: boolean;
  isFree: boolean;
  quality: AudioQuality;
  languages: number;
}

export const PROVIDER_METADATA: Record<TTSProviderName, ProviderMetadata> = {
  openai: {
    name: 'openai',
    displayName: 'OpenAI TTS',
    description: 'High-quality neural voices from OpenAI',
    requiresApiKey: true,
    isFree: false,
    quality: 'high',
    languages: 1,
  },
  elevenlabs: {
    name: 'elevenlabs',
    displayName: 'ElevenLabs',
    description: 'Premium AI voice synthesis with emotional control',
    requiresApiKey: true,
    isFree: false,
    quality: 'ultra',
    languages: 1,
  },
  edge: {
    name: 'edge',
    displayName: 'Edge TTS',
    description: 'Free Microsoft Edge neural voices',
    requiresApiKey: false,
    isFree: true,
    quality: 'high',
    languages: 1,
  },
  azure: {
    name: 'azure',
    displayName: 'Azure Speech',
    description: 'Microsoft Azure Speech Services',
    requiresApiKey: true,
    isFree: false,
    quality: 'high',
    languages: 1,
  },
  google: {
    name: 'google',
    displayName: 'Google Cloud TTS',
    description: 'Google Cloud Text-to-Speech with WaveNet voices',
    requiresApiKey: true,
    isFree: false,
    quality: 'high',
    languages: 1,
  },
  local: {
    name: 'local',
    displayName: 'Local TTS',
    description: 'System TTS (espeak, say) - no network required',
    requiresApiKey: false,
    isFree: true,
    quality: 'medium',
    languages: 1,
  },
};
