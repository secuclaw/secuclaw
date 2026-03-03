/**
 * Wake Module - TypeScript Types
 * 
 * Defines the type system for Voice Wake Word Detection functionality.
 */

import type { EventEmitter } from 'events';

/** Wake word detection status */
export type WakeDetectionStatus = 'inactive' | 'listening' | 'processing' | 'detected' | 'error';

/** Sensitivity level for wake word detection */
export type SensitivityLevel = 'low' | 'medium' | 'high';

/** Built-in wake word keywords supported by Porcupine */
export type BuiltInWakeWord = 
  | 'alexa' 
  | 'hey google' 
  | 'hey siri' 
  | 'jarvis' 
  | 'computer';

/** Custom wake word configuration */
export interface CustomWakeWord {
  /** Unique identifier for the custom wake word */
  id: string;
  /** The wake word phrase */
  phrase: string;
  /** Path to custom Porcupine model file (optional) */
  modelPath?: string;
  /** Sensitivity for this specific wake word (0-1) */
  sensitivity?: number;
}

/** Wake word configuration */
export interface WakeWord {
  /** Wake word type */
  type: 'builtin' | 'custom';
  /** The wake word phrase or built-in keyword */
  phrase: string;
  /** Custom wake word metadata (only for custom type) */
  custom?: CustomWakeWord;
  /** Sensitivity for this wake word (0-1), defaults to 0.5 */
  sensitivity?: number;
}

/** Wake event data */
export interface WakeEvent {
  /** The detected wake word */
  wakeWord: string;
  /** Timestamp when the wake word was detected */
  timestamp: number;
  /** Confidence score (0-1) */
  confidence: number;
  /** Audio energy level at detection */
  audioEnergy?: number;
  /** Processing time in milliseconds */
  processingTimeMs?: number;
}

/** Wake detection configuration */
export interface WakeConfig {
  /** Porcupine access key (required) */
  accessKey: string;
  /** List of wake words to listen for */
  wakeWords: WakeWord[];
  /** Default sensitivity for all wake words (0-1) */
  defaultSensitivity?: number;
  /** Audio sample rate (default: 16000) */
  sampleRate?: number;
  /** Audio frame length in samples (default: 512) */
  frameLength?: number;
  /** Buffer size for audio chunks */
  bufferSize?: number;
  /** Enable debug logging */
  debug?: boolean;
}

/** Options for starting wake detection */
export interface WakeStartOptions {
  /** Audio input device ID (optional, uses default) */
  deviceId?: string;
  /** Callback for audio data */
  onAudioData?: (audioData: Int16Array) => void;
}

/** Wake detector interface */
export interface IWakeDetector extends EventEmitter {
  /** Start listening for wake words */
  start(options?: WakeStartOptions): Promise<void>;
  /** Stop listening */
  stop(): Promise<void>;
  /** Check if currently listening */
  isListening(): boolean;
  /** Get current status */
  getStatus(): WakeDetectionStatus;
  /** Add a new wake word */
  addWakeWord(wakeWord: WakeWord): Promise<void>;
  /** Remove a wake word */
  removeWakeWord(phrase: string): Promise<void>;
  /** Update sensitivity for a wake word */
  setSensitivity(phrase: string, sensitivity: number): Promise<void>;
  /** Set global sensitivity */
  setGlobalSensitivity(sensitivity: number): void;
  /** Get list of active wake words */
  getWakeWords(): WakeWord[];
  /** Process audio data manually (for external audio sources) */
  processAudio(audioData: Int16Array): number;
}

/** Audio input provider interface */
export interface IAudioInput {
  /** Start capturing audio */
  start(deviceId?: string): Promise<void>;
  /** Stop capturing */
  stop(): Promise<void>;
  /** Check if currently capturing */
  isCapturing(): boolean;
  /** Register callback for audio data */
  onAudio(callback: (audioData: Int16Array) => void): void;
  /** Get sample rate */
  getSampleRate(): number;
}

/** Porcupine detection result */
export interface PorcupineDetectionResult {
  /** Index of the detected wake word (-1 if none) */
  index: number;
  /** Detection timestamp */
  timestamp: number;
}

/** Wake detection error */
export interface WakeError extends Error {
  code: WakeErrorCode;
  details?: unknown;
}

/** Wake error codes */
export type WakeErrorCode = 
  | 'INVALID_ACCESS_KEY'
  | 'INITIALIZATION_FAILED'
  | 'AUDIO_DEVICE_ERROR'
  | 'PROCESSING_ERROR'
  | 'WAKE_WORD_NOT_FOUND'
  | 'ALREADY_RUNNING'
  | 'NOT_RUNNING';

/** Metrics for wake detection */
export interface WakeMetrics {
  /** Total number of detections */
  totalDetections: number;
  /** Number of false activations */
  falseActivations: number;
  /** Average detection latency in milliseconds */
  avgLatencyMs: number;
  /** Up time in milliseconds */
  uptimeMs: number;
  /** Last detection timestamp */
  lastDetectionTime?: number;
}

/** Event types for wake detector */
export interface WakeDetectorEvents {
  'wake': (event: WakeEvent) => void;
  'error': (error: WakeError) => void;
  'status': (status: WakeDetectionStatus) => void;
  'audio': (audioData: Int16Array) => void;
}
