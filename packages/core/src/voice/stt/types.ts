/**
 * STT Module - TypeScript Types
 * 
 * Defines the type system for Speech-to-Text functionality.
 */

export type AudioFormat = 'mp3' | 'wav' | 'ogg' | 'webm' | 'flac' | 'm4a' | 'aac';

export type AudioCodec = 'pcm' | 'opus' | 'speex' | 'flac';

export type STTProviderName = 'openai' | 'deepgram' | 'azure' | 'google' | 'local';

export interface STTOptions {
  language?: string;
  model?: string;
  prompt?: string;
  temperature?: number;
  punctuation?: boolean;
  profanityFilter?: boolean;
  diarization?: boolean;
  speakerLabels?: boolean;
  outputFormat?: 'json' | 'text' | 'srt' | 'vtt' | 'verbose_json';
  sampleRate?: number;
  channels?: number;
  codec?: AudioCodec;
}

export interface WordTiming {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

export interface Sentence {
  text: string;
  start: number;
  end: number;
  confidence: number;
}

export interface Paragraph {
  sentences: Sentence[];
  start: number;
  end: number;
}

export interface Speaker {
  speakerId: string;
  segments: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

export interface TranscriptionResult {
  text: string;
  confidence: number;
  language: string;
  duration: number;
  words?: WordTiming[];
  sentences?: Sentence[];
  paragraphs?: Paragraph[];
  speakers?: Speaker[];
  metadata?: Record<string, unknown>;
}

export interface TranscriptionChunk {
  text: string;
  isFinal: boolean;
  confidence: number;
  words?: WordTiming[];
  start?: number;
  end?: number;
}

export interface STTConfig {
  provider: STTProviderName;
  apiKey?: string;
  region?: string;
  endpoint?: string;
  defaultLanguage?: string;
  defaultModel?: string;
  defaultOptions?: STTOptions;
}

export interface STTError extends Error {
  provider: STTProviderName;
  code?: string;
  retryable?: boolean;
}

export interface STTProvider {
  getName(): STTProviderName;
  transcribe(audio: Buffer, options?: STTOptions): Promise<TranscriptionResult>;
  transcribeStream(audio: AsyncIterable<Buffer>, options?: STTOptions): AsyncIterable<TranscriptionChunk>;
  getSupportedLanguages(): string[];
  isAvailable(): Promise<boolean>;
}

export interface STTProviderClass {
  new (config: STTConfig): STTProvider;
}

export interface OpenAIConfig extends STTConfig {
  provider: 'openai';
  model?: 'whisper-1' | 'gpt-4o-transcribe';
}

export interface DeepgramConfig extends STTConfig {
  provider: 'deepgram';
  model?: 'nova-2' | 'nova-2-ea' | 'base' | 'enhanced' | 'nova';
}

export interface AzureSTTConfig extends STTConfig {
  provider: 'azure';
  speechKey: string;
  region: string;
  endpointId?: string;
}

export interface GoogleSTTConfig extends STTConfig {
  provider: 'google';
  projectId?: string;
  location?: string;
}

export interface LocalWhisperConfig extends STTConfig {
  provider: 'local';
  modelPath?: string;
  modelSize?: 'tiny' | 'base' | 'small' | 'medium' | 'large' | 'large-v3';
  computeType?: 'auto' | 'int8' | 'int8_float16' | 'int16' | 'float32';
  numThreads?: number;
}

export type ProviderConfig = 
  | OpenAIConfig 
  | DeepgramConfig 
  | AzureSTTConfig 
  | GoogleSTTConfig 
  | LocalWhisperConfig;

export interface STTMetrics {
  provider: STTProviderName;
  latencyMs: number;
  audioDurationMs?: number;
  confidence: number;
  timestamp: number;
}

export interface AudioInput {
  buffer: Buffer;
  format: AudioFormat;
  sampleRate?: number;
  channels?: number;
  duration?: number;
}

export interface StreamingConfig {
  interimResults?: boolean;
  singleUtterance?: boolean;
  maxAlternatives?: number;
  profanityFilter?: boolean;
  metadata?: boolean;
}
