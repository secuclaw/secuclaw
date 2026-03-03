/**
 * Talk Module - Voice Activity Detection (VAD)
 * 
 * Detects voice activity in audio streams using energy-based detection
 * with configurable sensitivity levels.
 */

import { EventEmitter } from 'events';
import type {
  VADConfig,
  VADSensitivity,
  VADEvent,
  VADCallback,
  AudioChunk,
  TalkError,
  TalkErrorCode,
} from './types.js';
import { DEFAULT_VAD_CONFIG, AUDIO_SAMPLE_RATE } from './types.js';

const SENSITIVITY_THRESHOLDS: Record<VADSensitivity, { speech: number; silence: number }> = {
  low: { speech: 0.6, silence: 0.2 },
  medium: { speech: 0.5, silence: 0.1 },
  high: { speech: 0.3, silence: 0.05 },
};

/**
 * Voice Activity Detector
 * 
 * Detects speech activity in audio streams using RMS energy analysis.
 * Supports configurable sensitivity levels and various callbacks.
 * 
 * @example
 * ```typescript
 * const vad = new VoiceActivityDetector();
 * vad.onSpeechStart(() => console.log('Speech started'));
 * vad.onSpeechEnd((audio) => console.log('Speech ended'));
 * await vad.start();
 * ```
 */
export class VoiceActivityDetector extends EventEmitter {
  private config: VADConfig;
  private isRunning = false;
  private isSpeechActive = false;
  private speechStartTime = 0;
  private silenceStartTime = 0;
  private audioBuffer: Int16Array[] = [];
  private currentEnergy = 0;
  private speechCallbacks: Set<VADCallback> = new Set();
  private silenceCallbacks: Set<VADCallback> = new Set();
  private speechAudio: Int16Array | null = null;
  
  constructor(config: Partial<VADConfig> = {}) {
    super();
    this.config = { ...DEFAULT_VAD_CONFIG, ...config };
  }

  /**
   * Start VAD detection
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }
    
    this.isRunning = true;
    this.isSpeechActive = false;
    this.speechStartTime = 0;
    this.silenceStartTime = 0;
    this.audioBuffer = [];
    this.speechAudio = null;
    
    this.emit('status', 'running');
  }

  /**
   * Stop VAD detection
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    // If speech is active when stopping, emit the final speech
    if (this.isSpeechActive && this.speechAudio && this.speechAudio.length > 0) {
      this.emitSpeechEnd();
    }

    this.isRunning = false;
    this.audioBuffer = [];
    this.speechAudio = null;
    
    this.emit('status', 'stopped');
  }

  /**
   * Check if VAD is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Process audio chunk
   * 
   * @param chunk - Audio chunk to process
   */
  processAudio(chunk: AudioChunk): void {
    if (!this.isRunning) {
      return;
    }

    const energy = this.calculateEnergy(chunk.data);
    this.currentEnergy = energy;
    const now = Date.now();
    const thresholds = SENSITIVITY_THRESHOLDS[this.config.sensitivity];
    
    const vadEvent: VADEvent = {
      isSpeech: this.isSpeechActive,
      energy,
      timestamp: now,
      durationMs: this.isSpeechActive 
        ? now - this.speechStartTime 
        : now - this.silenceStartTime,
    };
    
    this.emit('vad', vadEvent);

    if (this.isSpeechActive) {
      // Currently in speech mode
      if (energy < thresholds.silence) {
        // Silence detected
        if (this.silenceStartTime === 0) {
          this.silenceStartTime = now;
        }
        
        const silenceDuration = now - this.silenceStartTime;
        
        // Check for minimum silence to end speech
        if (silenceDuration >= this.config.minSilenceDurationMs) {
          this.endSpeech();
        }
        
        // Force end speech if max silence exceeded
        if (silenceDuration >= this.config.maxSilenceDurationMs) {
          this.endSpeech();
        }
      } else {
        // Speech continues
        this.silenceStartTime = 0;
        this.appendToSpeechBuffer(chunk.data);
      }
    } else {
      // Not in speech mode - check for speech start
      if (energy >= thresholds.speech) {
        const speechDuration = now - this.speechStartTime;
        
        // Only start speech if minimum duration met
        if (this.speechStartTime === 0 || speechDuration >= this.config.minSpeechDurationMs) {
          if (this.speechStartTime === 0) {
            this.speechStartTime = now;
          }
          this.startSpeech();
          this.appendToSpeechBuffer(chunk.data);
        }
      } else {
        // Reset speech start time if not enough energy
        this.speechStartTime = 0;
      }
    }
  }

  /**
   * Process raw PCM16 audio data
   * 
   * @param pcmData - Raw PCM16 audio data
   */
  processPCM(pcmData: Int16Array): void {
    const chunk: AudioChunk = {
      data: pcmData,
      sampleRate: AUDIO_SAMPLE_RATE,
      timestamp: Date.now(),
      isFinal: false,
    };
    
    this.processAudio(chunk);
  }

  /**
   * Register callback for speech start
   * 
   * @param callback - Callback function
   */
  onSpeechStart(callback: VADCallback): void {
    this.speechCallbacks.add(callback);
  }

  /**
   * Register callback for speech end
   * 
   * @param callback - Callback function
   */
  onSpeechEnd(callback: VADCallback): void {
    this.silenceCallbacks.add(callback);
  }

  /**
   * Remove speech start callback
   * 
   * @param callback - Callback to remove
   */
  removeSpeechStartCallback(callback: VADCallback): void {
    this.speechCallbacks.delete(callback);
  }

  /**
   * Remove speech end callback
   * 
   * @param callback - Callback to remove
   */
  removeSpeechEndCallback(callback: VADCallback): void {
    this.silenceCallbacks.delete(callback);
  }

  /**
   * Get current configuration
   */
  getConfig(): VADConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   * 
   * @param config - New configuration
   */
  updateConfig(config: Partial<VADConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current audio energy level (0-1)
   */
  getCurrentEnergy(): number {
    return this.currentEnergy;
  }

  /**
   * Check if speech is currently active
   */
  hasSpeechActive(): boolean {
    return this.isSpeechActive;
  }

  /**
   * Force end current speech
   */
  forceEndSpeech(): void {
    if (this.isSpeechActive) {
      this.endSpeech();
    }
  }

  /**
   * Get the accumulated speech audio
   */
  getSpeechAudio(): Int16Array | null {
    return this.speechAudio;
  }

  /**
   * Calculate RMS energy of audio samples
   */
  private calculateEnergy(data: Int16Array): number {
    if (data.length === 0) {
      return 0;
    }

    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const sample = data[i] / 32768; // Normalize to -1 to 1
      sum += sample * sample;
    }
    
    const rms = Math.sqrt(sum / data.length);
    
    // Convert to 0-1 range with some scaling
    return Math.min(1, rms * 3);
  }

  /**
   * Start speech detection
   */
  private startSpeech(): void {
    if (this.isSpeechActive) {
      return;
    }

    this.isSpeechActive = true;
    this.speechStartTime = Date.now();
    this.silenceStartTime = 0;
    this.audioBuffer = [];
    this.speechAudio = null;
    
    const event: VADEvent = {
      isSpeech: true,
      energy: this.currentEnergy,
      timestamp: this.speechStartTime,
      durationMs: 0,
    };
    
    this.emit('speechStart', event);
    
    for (const callback of this.speechCallbacks) {
      callback(event);
    }
  }

  /**
   * End speech detection
   */
  private endSpeech(): void {
    if (!this.isSpeechActive) {
      return;
    }

    this.isSpeechActive = false;
    const endTime = Date.now();
    
    // Emit speech end with accumulated audio
    this.emitSpeechEnd();
    
    this.speechStartTime = 0;
    this.silenceStartTime = 0;
  }

  /**
   * Emit speech end event with accumulated audio
   */
  private emitSpeechEnd(): void {
    if (!this.speechAudio || this.speechAudio.length === 0) {
      return;
    }

    const event: VADEvent = {
      isSpeech: false,
      energy: this.currentEnergy,
      timestamp: Date.now(),
      durationMs: Date.now() - this.speechStartTime,
    };
    
    this.emit('speechEnd', event);
    
    for (const callback of this.silenceCallbacks) {
      callback(event);
    }
  }

  /**
   * Append data to speech buffer
   */
  private appendToSpeechBuffer(data: Int16Array): void {
    if (this.speechAudio === null) {
      this.speechAudio = new Int16Array(data);
    } else {
      const newBuffer = new Int16Array(this.speechAudio.length + data.length);
      newBuffer.set(this.speechAudio, 0);
      newBuffer.set(data, this.speechAudio.length);
      this.speechAudio = newBuffer;
    }
  }
}

/**
 * Create a VAD error
 */
export function createVADError(
  message: string,
  code: TalkErrorCode,
  details?: unknown
): TalkError {
  const error = new Error(message) as TalkError;
  error.code = code;
  error.details = details;
  return error;
}
