/**
 * TTS Module - TypeScript Types
 * 
 * Defines the type system for Text-to-Speech functionality.
 */

export type AudioFormat = 'mp3' | 'wav' | 'ogg' | 'webm' | 'aac';

export type AudioQuality = 'low' | 'medium' | 'high' | 'ultra';

export type TTSProviderName = 'openai' | 'elevenlabs' | 'edge' | 'azure' | 'google' | 'local';

export interface TTSOptions {
  voice?: string;
  speed?: number;
  pitch?: number;
  language?: string;
  format?: AudioFormat;
  quality?: AudioQuality;
  ssml?: boolean;
}

export interface Voice {
  id: string;
  name: string;
  language: string;
  languageCode: string;
  gender?: 'male' | 'female' | 'neutral';
  provider: TTSProviderName;
  isNeural?: boolean;
  isPremium?: boolean;
}

export interface TTSConfig {
  provider: TTSProviderName;
  apiKey?: string;
  region?: string;
  endpoint?: string;
  defaultVoice?: string;
  defaultLanguage?: string;
  defaultFormat?: AudioFormat;
  defaultSpeed?: number;
  defaultPitch?: number;
}

export interface SynthesisResult {
  audio: Buffer;
  format: AudioFormat;
  duration?: number;
  size: number;
}

export interface StreamChunk {
  audio: Buffer;
  isFinal: boolean;
  timestamp?: number;
}

export interface TTSError extends Error {
  provider: TTSProviderName;
  code?: string;
  retryable?: boolean;
}

export interface TTSProvider {
  getName(): TTSProviderName;
  synthesize(text: string, options?: TTSOptions): Promise<SynthesisResult>;
  synthesizeStream(text: string, options?: TTSOptions): AsyncIterable<StreamChunk>;
  getVoices(): Promise<Voice[]>;
  isAvailable(): Promise<boolean>;
}

export interface TTSProviderClass {
  new (config: TTSConfig): TTSProvider;
}

export interface OpenAIConfig extends TTSConfig {
  provider: 'openai';
  model?: 'tts-1' | 'tts-1-hd';
}

export interface ElevenLabsConfig extends TTSConfig {
  provider: 'elevenlabs';
  modelId?: string;
  optimizeLatency?: number;
}

export interface EdgeConfig extends TTSConfig {
  provider: 'edge';
}

export interface AzureConfig extends TTSConfig {
  provider: 'azure';
  speechKey: string;
  region: string;
}

export interface GoogleConfig extends TTSConfig {
  provider: 'google';
  projectId?: string;
}

export interface LocalConfig extends TTSConfig {
  provider: 'local';
  engine?: 'espeak' | 'say' | 'pyttsx3';
}

export type ProviderConfig = 
  | OpenAIConfig 
  | ElevenLabsConfig 
  | EdgeConfig 
  | AzureConfig 
  | GoogleConfig 
  | LocalConfig;

export interface TTSMetrics {
  provider: TTSProviderName;
  latencyMs: number;
  audioDurationMs?: number;
  charactersProcessed: number;
  timestamp: number;
}
