/**
 * Talk Module - TypeScript Types
 * 
 * Defines the type system for Talk Mode Continuous Conversation functionality.
 */

import type { EventEmitter } from 'events';

/** Talk mode status */
export type TalkModeStatus = 'idle' | 'listening' | 'processing' | 'speaking' | 'interrupted' | 'error';

/** VAD (Voice Activity Detection) sensitivity level */
export type VADSensitivity = 'low' | 'medium' | 'high';

/** Turn-taking state */
export type TurnState = 'user' | 'ai' | 'transitioning';

/** Audio sample rate */
export const AUDIO_SAMPLE_RATE = 16000;

/** Default VAD thresholds */
export const DEFAULT_VAD_CONFIG: VADConfig = {
  sensitivity: 'medium',
  speechThreshold: 0.5,
  silenceThreshold: 0.1,
  minSpeechDurationMs: 250,
  minSilenceDurationMs: 500,
  maxSilenceDurationMs: 3000,
};

/** Default talk mode config */
export const DEFAULT_TALK_CONFIG: TalkModeConfig = {
  continuousMode: true,
  interruptEnabled: true,
  responseTimeoutMs: 30000,
  silenceTimeoutMs: 5000,
  maxHistoryLength: 50,
};

/** VAD configuration */
export interface VADConfig {
  /** Sensitivity level for voice detection */
  sensitivity: VADSensitivity;
  /** Energy threshold for speech detection (0-1) */
  speechThreshold: number;
  /** Energy threshold for silence detection (0-1) */
  silenceThreshold: number;
  /** Minimum speech duration in milliseconds */
  minSpeechDurationMs: number;
  /** Minimum silence duration to end speech in milliseconds */
  minSilenceDurationMs: number;
  /** Maximum silence duration before forcing end in milliseconds */
  maxSilenceDurationMs: number;
}

/** Talk mode configuration */
export interface TalkModeConfig {
  /** Enable continuous conversation mode */
  continuousMode: boolean;
  /** Allow user to interrupt AI response */
  interruptEnabled: boolean;
  /** Maximum time to wait for AI response in milliseconds */
  responseTimeoutMs: number;
  /** Maximum silence time before ending turn in milliseconds */
  silenceTimeoutMs: number;
  /** Maximum number of messages to keep in history */
  maxHistoryLength: number;
}

/** Audio chunk from input */
export interface AudioChunk {
  /** Audio data as PCM16 samples */
  data: Int16Array;
  /** Sample rate */
  sampleRate: number;
  /** Timestamp in milliseconds */
  timestamp: number;
  /** Whether this is the final chunk */
  isFinal: boolean;
}

/** Speech event data */
export interface SpeechEvent {
  /** The transcribed text */
  text: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Audio data associated with speech */
  audio?: Buffer;
  /** Timestamp when speech started */
  startTime: number;
  /** Timestamp when speech ended */
  endTime: number;
}

/** AI response event */
export interface ResponseEvent {
  /** The response text */
  text: string;
  /** Audio data for TTS */
  audio?: Buffer;
  /** Whether this is a partial response */
  isPartial: boolean;
  /** Timestamp when response started */
  timestamp: number;
}

/** Turn-taking event */
export interface TurnEvent {
  /** Current turn holder */
  turn: TurnState;
  /** Timestamp of the turn change */
  timestamp: number;
  /** Previous turn holder */
  previousTurn?: TurnState;
}

/** VAD event */
export interface VADEvent {
  /** Whether speech is detected */
  isSpeech: boolean;
  /** Current audio energy level (0-1) */
  energy: number;
  /** Timestamp */
  timestamp: number;
  /** Duration of current state in milliseconds */
  durationMs: number;
}

/** Talk session */
export interface TalkSession {
  /** Unique session identifier */
  id: string;
  /** Session start timestamp */
  startTime: number;
  /** Current status */
  status: TalkModeStatus;
  /** Number of user turns */
  userTurnCount: number;
  /** Number of AI turns */
  aiTurnCount: number;
}

/** Talk mode error */
export interface TalkError extends Error {
  code: TalkErrorCode;
  details?: unknown;
}

/** Talk error codes */
export type TalkErrorCode = 
  | 'VAD_ERROR'
  | 'STT_ERROR'
  | 'TTS_ERROR'
  | 'SESSION_ERROR'
  | 'TIMEOUT_ERROR'
  | 'INTERRUPT_ERROR'
  | 'NOT_RUNNING'
  | 'ALREADY_RUNNING';

/** Speech callback for user speech events */
export type SpeechCallback = (event: SpeechEvent) => Promise<void> | void;

/** Response callback for AI response events */
export type ResponseCallback = (event: ResponseEvent) => Promise<void> | void;

/** Turn callback for turn-taking events */
export type TurnCallback = (event: TurnEvent) => Promise<void> | void;

/** VAD callback for voice activity events */
export type VADCallback = (event: VADEvent) => Promise<void> | void;

/** Error callback */
export type TalkErrorCallback = (error: TalkError) => Promise<void> | void;

/** Status change callback */
export type StatusCallback = (status: TalkModeStatus) => Promise<void> | void;

/** STT (Speech-to-Text) provider interface */
export interface STTProvider {
  /** Provider name */
  getName(): string;
  /** Transcribe audio to text */
  transcribe(audio: Buffer): Promise<SpeechEvent>;
  /** Check if provider is available */
  isAvailable(): Promise<boolean>;
}

/** TTS (Text-to-Speech) provider interface */
export interface TTSProvider {
  /** Provider name */
  getName(): string;
  /** Synthesize text to audio */
  synthesize(text: string): Promise<Buffer>;
  /** Check if provider is available */
  isAvailable(): Promise<boolean>;
}

/** Audio input interface */
export interface AudioInput {
  /** Start capturing audio */
  start(): Promise<void>;
  /** Stop capturing */
  stop(): Promise<void>;
  /** Check if currently capturing */
  isCapturing(): boolean;
  /** Register callback for audio data */
  onAudio(callback: (chunk: AudioChunk) => void): void;
  /** Get sample rate */
  getSampleRate(): number;
}

/** Audio output interface */
export interface AudioOutput {
  /** Start playing audio */
  play(audio: Buffer): Promise<void>;
  /** Stop playing */
  stop(): Promise<void>;
  /** Check if currently playing */
  isPlaying(): boolean;
  /** Register callback for playback events */
  onPlaybackEnd(callback: () => void): void;
}

/** Talk mode events */
export interface TalkModeEvents {
  'speech': (event: SpeechEvent) => void;
  'response': (event: ResponseEvent) => void;
  'turn': (event: TurnEvent) => void;
  'vad': (event: VADEvent) => void;
  'error': (error: TalkError) => void;
  'status': (status: TalkModeStatus) => void;
}

/** Talk mode metrics */
export interface TalkMetrics {
  /** Total session duration in milliseconds */
  sessionDurationMs: number;
  /** Number of user turns */
  userTurns: number;
  /** Number of AI turns */
  aiTurns: number;
  /** Average speech recognition latency in milliseconds */
  avgSTTLatencyMs: number;
  /** Average speech synthesis latency in milliseconds */
  avgTTSLatencyMs: number;
  /** Number of interruptions */
  interruptionCount: number;
  /** Number of errors */
  errorCount: number;
}

/** Conversation message */
export interface ConversationMessage {
  /** Message role */
  role: 'user' | 'assistant' | 'system';
  /** Message content */
  content: string;
  /** Timestamp */
  timestamp: number;
  /** Audio data if available */
  audio?: Buffer;
  /** Metadata */
  metadata?: Record<string, unknown>;
}
