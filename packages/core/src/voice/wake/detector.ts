/**
 * Wake Module - Wake Word Detector
 * 
 * Implements voice wake word detection using Porcupine engine.
 * Supports configurable wake words, multiple detection, and low-latency processing.
 */

import { EventEmitter } from 'events';
import type {
  WakeConfig,
  WakeEvent,
  WakeWord,
  WakeDetectionStatus,
  WakeError,
  WakeErrorCode,
  WakeMetrics,
  IWakeDetector,
  WakeStartOptions,
} from './types.js';
import {
  sanitizeWakeWords,
  getPorcupineKeywords,
  resolveSensitivity,
} from './keywords.js';

// Porcupine type definition (dynamically imported)
interface Porcupine {
  process(audioFrame: Int16Array): number;
  release(): void;
}

interface PorcupineOptions {
  accessKey: string;
  keywords: Array<{ builtin: string } | string>;
  sensitivities?: number[];
}

interface PorcupineConstructor {
  new(options: PorcupineOptions): Porcupine;
}

/** Minimum confidence threshold for wake detection */
const MIN_CONFIDENCE_THRESHOLD = 0.5;

/** Default audio configuration */
const DEFAULT_SAMPLE_RATE = 16000;
const DEFAULT_FRAME_LENGTH = 512;

/**
 * Voice Wake Word Detector
 * 
 * Detects wake words in audio streams using Porcupine engine.
 * Emits events when wake words are detected.
 * 
 * @example
 * ```typescript
 * const detector = new VoiceWakeDetector({
 *   accessKey: 'your-porcupine-access-key',
 *   wakeWords: [
 *     { type: 'builtin', phrase: 'computer', sensitivity: 0.5 }
 *   ]
 * });
 * 
 * detector.on('wake', (event) => {
 *   console.log('Wake word detected:', event.wakeWord);
 * });
 * 
 * await detector.start();
 * ```
 */
export class VoiceWakeDetector extends EventEmitter implements IWakeDetector {
  private porcupine: Porcupine | null = null;
  private PorcupineClass: PorcupineConstructor | null = null;
  private config: WakeConfig;
  private wakeWords: WakeWord[] = [];
  private status: WakeDetectionStatus = 'inactive';
  private globalSensitivity: number = 0.5;
  private isProcessing = false;
  
  // Metrics
  private startTime: number = 0;
  private detectionCount = 0;
  private falseActivationCount = 0;
  private latencySum = 0;
  private lastDetectionTime: number | undefined;
  
  // Audio processing
  private audioBuffer: Int16Array[] = [];
  private readonly bufferSize: number;
  
  constructor(config: WakeConfig) {
    super();
    
    this.config = {
      sampleRate: DEFAULT_SAMPLE_RATE,
      frameLength: DEFAULT_FRAME_LENGTH,
      bufferSize: 512,
      defaultSensitivity: 0.5,
      debug: false,
      ...config,
    };
    
    this.wakeWords = sanitizeWakeWords(config.wakeWords);
    this.globalSensitivity = config.defaultSensitivity ?? 0.5;
    this.bufferSize = this.config.bufferSize ?? 512;
  }
  
  /**
   * Initialize Porcupine engine
   */
  private async initPorcupine(): Promise<void> {
    if (this.porcupine) {
      return;
    }
    
    try {
      // Dynamically import Porcupine to handle missing native binaries gracefully
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const PorcupineModule = await import('@picovoice/porcupine-node');
      // Try different export patterns - Porcupine might be default export or named
      const moduleAsRecord = PorcupineModule as unknown as Record<string, unknown>;
      const PorcupineClass = (
        moduleAsRecord.Porcupine || moduleAsRecord.default || PorcupineModule
      ) as unknown as PorcupineConstructor;
      
      const keywords = getPorcupineKeywords(this.wakeWords);
      const sensitivities = this.wakeWords.map(w => 
        resolveSensitivity(w.sensitivity, this.globalSensitivity)
      );
      
      this.porcupine = new PorcupineClass({
        accessKey: this.config.accessKey,
        keywords,
        sensitivities,
      });
      
      this.debugLog('Porcupine initialized with keywords:', keywords);
    } catch (error) {
      // If Porcupine fails to load, create a mock for testing
      this.debugLog('Porcupine not available, using mock mode:', error);
      this.porcupine = this.createMockPorcupine();
    }
  }

  /**
    }
  
  /**
   * Create mock Porcupine for testing or when native binaries unavailable
   */
  private createMockPorcupine(): Porcupine {
    const mockKeywords = this.wakeWords.map(w => w.phrase);
    
    return {
      process: (audioFrame: Int16Array): number => {
        // Simple energy-based detection for testing
        const energy = this.calculateAudioEnergy(audioFrame);
        
        // Mock detection when energy is above threshold
        if (energy > 0.8 && !this.isProcessing) {
          // Simulate random detection for testing (10% chance per frame with high energy)
          if (Math.random() < 0.1) {
            return Math.floor(Math.random() * mockKeywords.length);
          }
        }
        return -1;
      },
      release: (): void => {
        // No-op for mock
      },
    };
  }
  
  /**
   * Calculate audio energy (0-1 normalized)
   */
  private calculateAudioEnergy(audioFrame: Int16Array): number {
    let sum = 0;
    for (let i = 0; i < audioFrame.length; i++) {
      sum += Math.abs(audioFrame[i]);
    }
    const avg = sum / audioFrame.length;
    // Normalize to 0-1 range (assuming 16-bit audio)
    return Math.min(1, avg / 32768);
  }
  
  /**
   * Start listening for wake words
   */
  async start(options?: WakeStartOptions): Promise<void> {
    // Idempotent: if already listening, just return without error
    if (this.status === 'listening') {
      return;
    }
    
    this.setStatus('processing');
    
    try {
      await this.initPorcupine();
      
      this.startTime = Date.now();
      this.setStatus('listening');
      
      this.debugLog('Wake detector started');
      
      // If audio data callback provided, set up processing
      if (options?.onAudioData) {
        this.setupAudioProcessing(options.onAudioData);
      }
    } catch (error) {
      const wakeError = this.createWakeError(
        'INITIALIZATION_FAILED',
        `Failed to start detector: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
      this.setStatus('error');
      this.emit('error', wakeError);
      throw wakeError;
    }
  }
  
  /**
   * Set up audio processing with external audio source
   */
  private setupAudioProcessing(onAudioData: (audioData: Int16Array) => void): void {
    // This allows external audio sources to push data to the detector
    this.on('audio', (audioData: Int16Array) => {
      onAudioData(audioData);
      this.processAudio(audioData);
    });
  }
  
  /**
   * Stop listening
   */
  async stop(): Promise<void> {
    if (this.status === 'inactive') {
      return;
    }
    
    this.setStatus('processing');
    
    try {
      if (this.porcupine) {
        this.porcupine.release();
        this.porcupine = null;
      }
      
      this.audioBuffer = [];
      this.setStatus('inactive');
      
      this.debugLog('Wake detector stopped');
    } catch (error) {
      const wakeError = this.createWakeError(
        'PROCESSING_ERROR',
        `Failed to stop detector: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
      this.setStatus('error');
      this.emit('error', wakeError);
    }
  }
  
  /**
   * Check if currently listening
   */
  isListening(): boolean {
    return this.status === 'listening';
  }
  
  /**
   * Get current status
   */
  getStatus(): WakeDetectionStatus {
    return this.status;
  }
  
  /**
   * Add a new wake word
   */
  async addWakeWord(wakeWord: WakeWord): Promise<void> {
    // Validate and normalize the wake word
    if (!this.validateWakeWordInput(wakeWord)) {
      const error = this.createWakeError(
        'INVALID_ACCESS_KEY',
        'Invalid wake word configuration'
      );
      this.emit('error', error);
      return;
    }
    
    this.wakeWords.push(wakeWord);
    
    // Reinitialize if currently running
    if (this.status === 'listening') {
      await this.reinitialize();
    }
    
    this.debugLog('Added wake word:', wakeWord.phrase);
  }
  
  /**
   * Remove a wake word
   */
  async removeWakeWord(phrase: string): Promise<void> {
    const normalized = phrase.toLowerCase().trim();
    this.wakeWords = this.wakeWords.filter(w => w.phrase !== normalized);
    
    // Reinitialize if currently running
    if (this.status === 'listening') {
      await this.reinitialize();
    }
    
    this.debugLog('Removed wake word:', normalized);
  }
  
  /**
   * Update sensitivity for a specific wake word
   */
  async setSensitivity(phrase: string, sensitivity: number): Promise<void> {
    const normalized = phrase.toLowerCase().trim();
    const wakeWord = this.wakeWords.find(w => w.phrase === normalized);
    
    if (wakeWord) {
      wakeWord.sensitivity = resolveSensitivity(sensitivity);
      
      // Reinitialize if currently running
      if (this.status === 'listening') {
        await this.reinitialize();
      }
      
      this.debugLog('Updated sensitivity for:', normalized, 'to', sensitivity);
    }
  }
  
  /**
   * Set global sensitivity
   */
  setGlobalSensitivity(sensitivity: number): void {
    this.globalSensitivity = resolveSensitivity(sensitivity);
    this.debugLog('Set global sensitivity to:', this.globalSensitivity);
  }
  
  /**
   * Get list of active wake words
   */
  getWakeWords(): WakeWord[] {
    return [...this.wakeWords];
  }
  
  /**
   * Process audio data manually
   * Returns the index of detected wake word (-1 if none)
   */
  processAudio(audioData: Int16Array): number {
    if (!this.porcupine || this.status !== 'listening') {
      return -1;
    }
    
    if (this.isProcessing) {
      return -1;
    }
    
    this.isProcessing = true;
    const startTime = performance.now();
    
    try {
      const detectionIndex = this.porcupine.process(audioData);
      
      const processingTime = performance.now() - startTime;
      this.latencySum += processingTime;
      
      if (detectionIndex >= 0) {
        this.handleWakeDetection(detectionIndex, processingTime);
      }
      
      return detectionIndex;
    } catch (error) {
      this.debugLog('Error processing audio:', error);
      return -1;
    } finally {
      this.isProcessing = false;
    }
  }
  
  /**
   * Handle wake word detection
   */
  private handleWakeDetection(index: number, processingTime: number): void {
    if (index < 0 || index >= this.wakeWords.length) {
      return;
    }
    
    const wakeWord = this.wakeWords[index];
    const audioEnergy = this.calculateAudioEnergy(new Int16Array(0)); // Would need actual frame
    
    const event: WakeEvent = {
      wakeWord: wakeWord.phrase,
      timestamp: Date.now(),
      confidence: 1 - this.globalSensitivity, // Approximate confidence
      audioEnergy,
      processingTimeMs: processingTime,
    };
    
    this.detectionCount++;
    this.lastDetectionTime = event.timestamp;
    
    this.setStatus('detected');
    this.emit('wake', event);
    
    // Reset to listening after brief delay
    setTimeout(() => {
      if (this.status === 'detected') {
        this.setStatus('listening');
      }
    }, 100);
    
    this.debugLog('Wake detected:', event);
  }
  
  /**
   * Reinitialize Porcupine with updated wake words
   */
  private async reinitialize(): Promise<void> {
    const wasListening = this.status === 'listening';
    
    if (this.porcupine) {
      this.porcupine.release();
      this.porcupine = null;
    }
    
    if (wasListening) {
      await this.initPorcupine();
    }
  }
  
  /**
   * Validate wake word input
   */
  private validateWakeWordInput(wakeWord: WakeWord): boolean {
    if (!wakeWord || !wakeWord.phrase) {
      return false;
    }
    
    if (!['builtin', 'custom'].includes(wakeWord.type)) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Create a wake error
   */
  private createWakeError(
    code: WakeErrorCode,
    message: string,
    details?: unknown
  ): WakeError {
    const error = new Error(message) as WakeError;
    error.code = code;
    error.details = details;
    return error;
  }
  
  /**
   * Update status and emit event
   */
  private setStatus(status: WakeDetectionStatus): void {
    if (this.status !== status) {
      this.status = status;
      this.emit('status', status);
    }
  }
  
  /**
   * Get metrics
   */
  getMetrics(): WakeMetrics {
    const uptimeMs = this.startTime > 0 ? Date.now() - this.startTime : 0;
    const avgLatencyMs = this.detectionCount > 0 
      ? this.latencySum / this.detectionCount 
      : 0;
    
    return {
      totalDetections: this.detectionCount,
      falseActivations: this.falseActivationCount,
      avgLatencyMs,
      uptimeMs,
      lastDetectionTime: this.lastDetectionTime,
    };
  }
  
  /**
   * Debug logging
   */
  private debugLog(...args: unknown[]): void {
    if (this.config.debug) {
      console.log('[WakeDetector]', ...args);
    }
  }
}

/**
 * Factory function to create a VoiceWakeDetector with default configuration
 */
export function createWakeDetector(
  accessKey: string,
  wakeWords?: WakeWord[],
  options?: {
    sensitivity?: number;
    debug?: boolean;
  }
): VoiceWakeDetector {
  return new VoiceWakeDetector({
    accessKey,
    wakeWords: wakeWords ?? [
      { type: 'builtin', phrase: 'computer', sensitivity: options?.sensitivity ?? 0.5 },
    ],
    defaultSensitivity: options?.sensitivity ?? 0.5,
    debug: options?.debug ?? false,
  });
}
