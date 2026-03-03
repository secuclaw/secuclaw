/**
 * Talk Module - Talk Mode Manager
 * 
 * Main manager for continuous voice dialogue with VAD integration,
 * STT/TTS handling, turn-taking, and interruption support.
 */

import { EventEmitter } from 'events';
import { VoiceActivityDetector } from './vad.js';
import { TalkSession, SessionManager } from './session.js';
import type {
  TalkModeConfig,
  TalkModeStatus,
  AudioChunk,
  SpeechEvent,
  ResponseEvent,
  TurnEvent,
  VADEvent,
  SpeechCallback,
  ResponseCallback,
  TurnCallback,
  VADCallback,
  TalkErrorCallback,
  StatusCallback,
  TalkError,
  STTProvider,
  TTSProvider,
  AudioInput,
  AudioOutput,
  TalkModeEvents,
} from './types.js';
import { DEFAULT_TALK_CONFIG } from './types.js';
import { createVADError } from './vad.js';

/**
 * Talk Mode - Continuous Voice Dialogue Manager
 * 
 * Manages continuous voice conversation with:
 * - Voice Activity Detection (VAD)
 * - Speech-to-Text (STT) integration
 * - Text-to-Speech (TTS) integration
 * - Turn-taking management
 * - Interruption support
 * - Session management
 * 
 * @example
 * ```typescript
 * const talkMode = new TalkMode({
 *   continuousMode: true,
 *   interruptEnabled: true,
 * });
 * 
 * talkMode.onSpeech(async (event) => {
 *   // Process user speech
 *   const response = await processWithAI(event.text);
 *   talkMode.speak(response);
 * });
 * 
 * await talkMode.start();
 * 
 * // Later...
 * await talkMode.stop();
 * ```
 */
export class TalkMode extends EventEmitter {
  private config: TalkModeConfig;
  private vad: VoiceActivityDetector;
  private session: TalkSession;
  private sessionManager: SessionManager;
  private sttProvider: STTProvider | null = null;
  private ttsProvider: TTSProvider | null = null;
  private audioInput: AudioInput | null = null;
  private audioOutput: AudioOutput | null = null;
  private isRunning = false;
  private isContinuous = false;
  private isProcessingSpeech = false;
  private isSpeaking = false;
  private silenceTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private responseTimeoutId: ReturnType<typeof setTimeout> | null = null;
  
  private speechCallbacks: Set<SpeechCallback> = new Set();
  private responseCallbacks: Set<ResponseCallback> = new Set();
  private turnCallbacks: Set<TurnCallback> = new Set();
  private vadCallbacks: Set<VADCallback> = new Set();
  private errorCallbacks: Set<TalkErrorCallback> = new Set();
  private statusCallbacks: Set<StatusCallback> = new Set();

  constructor(config: Partial<TalkModeConfig> = {}) {
    super();
    this.config = { ...DEFAULT_TALK_CONFIG, ...config };
    this.vad = new VoiceActivityDetector();
    this.session = new TalkSession(this.config.maxHistoryLength);
    this.sessionManager = new SessionManager();
    
    this.setupVADCallbacks();
    this.setupSessionCallbacks();
  }

  /**
   * Set STT provider
   */
  setSTTProvider(provider: STTProvider): void {
    this.sttProvider = provider;
  }

  /**
   * Set TTS provider
   */
  setTTSProvider(provider: TTSProvider): void {
    this.ttsProvider = provider;
  }

  /**
   * Set audio input source
   */
  setAudioInput(input: AudioInput): void {
    this.audioInput = input;
    this.setupAudioInput();
  }

  /**
   * Set audio output destination
   */
  setAudioOutput(output: AudioOutput): void {
    this.audioOutput = output;
  }

  /**
   * Setup audio input callbacks
   */
  private setupAudioInput(): void {
    if (!this.audioInput) {
      return;
    }

    this.audioInput.onAudio((chunk: AudioChunk) => {
      if (this.isRunning && !this.isSpeaking) {
        this.vad.processAudio(chunk);
      }
    });
  }

  /**
   * Setup VAD callbacks
   */
  private setupVADCallbacks(): void {
    this.vad.onSpeechStart(() => {
      this.clearSilenceTimeout();
      this.session.setStatus('listening');
      this.emitStatus('listening');
    });

    this.vad.onSpeechEnd(() => {
      this.handleSpeechEnd();
    });
  }

  /**
   * Setup session callbacks
   */
  private setupSessionCallbacks(): void {
    this.session.on('turn', (event: TurnEvent) => {
      for (const callback of this.turnCallbacks) {
        callback(event);
      }
      this.emit('turn', event);
    });

    this.session.on('status', (status: TalkModeStatus) => {
      this.emitStatus(status);
    });
  }

  /**
   * Start talk mode
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    // Create and start session
    this.session = this.sessionManager.createSession(this.config.maxHistoryLength);
    this.sessionManager.setActiveSession(this.session);
    await this.session.start();

    // Start VAD
    await this.vad.start();

    // Start audio input if available
    if (this.audioInput) {
      await this.audioInput.start();
    }

    this.isRunning = true;
    this.session.setStatus('listening');
    this.emitStatus('listening');

    this.emit('started');
  }

  /**
   * Stop talk mode
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.clearSilenceTimeout();
    this.clearResponseTimeout();

    // Stop audio input
    if (this.audioInput?.isCapturing()) {
      await this.audioInput.stop();
    }

    // Stop audio output if playing
    if (this.audioOutput?.isPlaying()) {
      await this.audioOutput.stop();
    }

    // Stop VAD
    await this.vad.stop();

    // End session
    await this.session.end();

    this.isRunning = false;
    this.isProcessingSpeech = false;
    this.isSpeaking = false;
    this.session.setStatus('idle');
    this.emitStatus('idle');

    this.emit('stopped');
  }

  /**
   * Interrupt current operation
   */
  interrupt(): void {
    if (!this.isRunning) {
      return;
    }

    this.clearSilenceTimeout();
    this.clearResponseTimeout();

    // Stop any current speech
    if (this.isSpeaking && this.audioOutput?.isPlaying()) {
      this.audioOutput.stop();
    }

    this.isSpeaking = false;
    this.isProcessingSpeech = false;

    // Record interruption
    this.session.recordInterruption();

    // Set to listening state
    this.session.setStatus('listening');
    this.emitStatus('listening');

    this.emit('interrupted');
  }

  /**
   * Check if talk mode is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get current status
   */
  getStatus(): TalkModeStatus {
    return this.session.getStatus();
  }

  /**
   * Get session
   */
  getSession(): TalkSession {
    return this.session;
  }

  /**
   * Set continuous mode
   */
  setContinuousMode(enabled: boolean): void {
    this.isContinuous = enabled;
  }

  /**
   * Check if continuous mode is enabled
   */
  isContinuousMode(): boolean {
    return this.isContinuous;
  }

  /**
   * Register speech callback
   */
  onSpeech(callback: SpeechCallback): void {
    this.speechCallbacks.add(callback);
  }

  /**
   * Remove speech callback
   */
  offSpeech(callback: SpeechCallback): void {
    this.speechCallbacks.delete(callback);
  }

  /**
   * Register response callback
   */
  onResponse(callback: ResponseCallback): void {
    this.responseCallbacks.add(callback);
  }

  /**
   * Remove response callback
   */
  offResponse(callback: ResponseCallback): void {
    this.responseCallbacks.delete(callback);
  }

  /**
   * Register turn callback
   */
  onTurn(callback: TurnCallback): void {
    this.turnCallbacks.add(callback);
  }

  /**
   * Remove turn callback
   */
  offTurn(callback: TurnCallback): void {
    this.turnCallbacks.delete(callback);
  }

  /**
   * Register VAD callback
   */
  onVAD(callback: VADCallback): void {
    this.vadCallbacks.add(callback);
  }

  /**
   * Remove VAD callback
   */
  offVAD(callback: VADCallback): void {
    this.vadCallbacks.delete(callback);
  }

  /**
   * Register error callback
   */
  onError(callback: TalkErrorCallback): void {
    this.errorCallbacks.add(callback);
  }

  /**
   * Remove error callback
   */
  offError(callback: TalkErrorCallback): void {
    this.errorCallbacks.delete(callback);
  }

  /**
   * Register status callback
   */
  onStatusChange(callback: StatusCallback): void {
    this.statusCallbacks.add(callback);
  }

  /**
   * Remove status callback
   */
  offStatusChange(callback: StatusCallback): void {
    this.statusCallbacks.delete(callback);
  }

  /**
   * Process audio directly (for external audio sources)
   */
  processAudio(audio: Buffer): void {
    if (!this.isRunning || this.isSpeaking) {
      return;
    }

    // Convert Buffer to Int16Array for VAD
    const pcmData = new Int16Array(audio.length / 2);
    for (let i = 0; i < pcmData.length; i++) {
      pcmData[i] = audio.readInt16LE(i * 2);
    }

    this.vad.processPCM(pcmData);
  }

  /**
   * Speak text using TTS
   */
  async speak(text: string): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    // Stop any current speech
    if (this.isSpeaking && this.audioOutput?.isPlaying()) {
      await this.audioOutput.stop();
    }

    this.isSpeaking = true;
    this.session.setStatus('speaking');
    this.emitStatus('speaking');

    try {
      let audio: Buffer | undefined;

      // Synthesize speech if TTS provider is available
      if (this.ttsProvider) {
        const startTime = Date.now();
        audio = await this.ttsProvider.synthesize(text);
        this.session.recordTTSLatency(Date.now() - startTime);
      }

      // Play audio if output is available
      if (audio && this.audioOutput) {
        await this.audioOutput.play(audio);
      }

      // Add to session history
      this.session.addAIResponse(text, audio);

      // Emit response event
      const event: ResponseEvent = {
        text,
        audio,
        isPartial: false,
        timestamp: Date.now(),
      };

      for (const callback of this.responseCallbacks) {
        callback(event);
      }
      this.emit('response', event);

    } catch (error) {
      this.handleError(error as Error, 'TTS_ERROR');
    } finally {
      this.isSpeaking = false;
      
      if (this.isRunning) {
        this.session.setStatus('listening');
        this.emitStatus('listening');
        
        // Start silence timeout for continuous mode
        if (this.isContinuous) {
          this.startSilenceTimeout();
        }
      }
    }
  }

  /**
   * Handle speech end from VAD
   */
  private async handleSpeechEnd(): Promise<void> {
    if (this.isProcessingSpeech || !this.isRunning) {
      return;
    }

    this.isProcessingSpeech = true;
    this.clearSilenceTimeout();
    this.session.setStatus('processing');
    this.emitStatus('processing');

    try {
      // Get speech audio from VAD
      const speechAudio = this.vad.getSpeechAudio();
      
      if (!speechAudio || speechAudio.length === 0) {
        this.isProcessingSpeech = false;
        this.session.setStatus('listening');
        this.emitStatus('listening');
        return;
      }

      // Convert Int16Array to Buffer
      const audioBuffer = Buffer.alloc(speechAudio.length * 2);
      for (let i = 0; i < speechAudio.length; i++) {
        audioBuffer.writeInt16LE(speechAudio[i], i * 2);
      }

      let text = '';
      let confidence = 1;

      // Transcribe if STT provider is available
      if (this.sttProvider) {
        const startTime = Date.now();
        const result = await this.sttProvider.transcribe(audioBuffer);
        text = result.text;
        confidence = result.confidence;
        this.session.recordSTTLatency(Date.now() - startTime);
      }

      // Create speech event
      const speechEvent: SpeechEvent = {
        text,
        confidence,
        audio: audioBuffer,
        startTime: Date.now() - 1000, // Approximate
        endTime: Date.now(),
      };

      // Add to session
      this.session.addUserMessage(text, audioBuffer);

      // Emit speech event
      for (const callback of this.speechCallbacks) {
        await callback(speechEvent);
      }
      this.emit('speech', speechEvent);

    } catch (error) {
      this.handleError(error as Error, 'STT_ERROR');
    } finally {
      this.isProcessingSpeech = false;
      
      if (this.isRunning) {
        this.session.setStatus('listening');
        this.emitStatus('listening');
        
        // Start silence timeout for continuous mode
        if (this.isContinuous) {
          this.startSilenceTimeout();
        }
      }
    }
  }

  /**
   * Handle errors
   */
  private handleError(error: Error, code: string): void {
    this.session.recordError();
    
    const talkError = error as TalkError;
    talkError.code = code as TalkError['code'];

    for (const callback of this.errorCallbacks) {
      callback(talkError);
    }
    this.emit('error', talkError);
  }

  /**
   * Emit status to all listeners
   */
  private emitStatus(status: TalkModeStatus): void {
    for (const callback of this.statusCallbacks) {
      callback(status);
    }
    this.emit('status', status);
  }

  /**
   * Start silence timeout
   */
  private startSilenceTimeout(): void {
    this.clearSilenceTimeout();
    
    this.silenceTimeoutId = setTimeout(() => {
      if (this.isRunning && !this.isProcessingSpeech && !this.isSpeaking) {
        this.emit('silenceTimeout');
      }
    }, this.config.silenceTimeoutMs);
  }

  /**
   * Clear silence timeout
   */
  private clearSilenceTimeout(): void {
    if (this.silenceTimeoutId) {
      clearTimeout(this.silenceTimeoutId);
      this.silenceTimeoutId = null;
    }
  }

  /**
   * Start response timeout
   */
  private startResponseTimeout(): void {
    this.clearResponseTimeout();
    
    this.responseTimeoutId = setTimeout(() => {
      if (this.isRunning && this.isProcessingSpeech) {
        this.handleError(
          new Error('Response timeout'),
          'TIMEOUT_ERROR'
        );
        this.isProcessingSpeech = false;
        this.session.setStatus('listening');
        this.emitStatus('listening');
      }
    }, this.config.responseTimeoutMs);
  }

  /**
   * Clear response timeout
   */
  private clearResponseTimeout(): void {
    if (this.responseTimeoutId) {
      clearTimeout(this.responseTimeoutId);
      this.responseTimeoutId = null;
    }
  }

  /**
   * Get VAD instance (for external configuration)
   */
  getVAD(): VoiceActivityDetector {
    return this.vad;
  }

  /**
   * Get configuration
   */
  getConfig(): TalkModeConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<TalkModeConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get metrics
   */
  getMetrics() {
    return this.session.getMetrics();
  }
}

/**
 * Create a TalkMode error
 */
export function createTalkError(
  message: string,
  code: string,
  details?: unknown
): TalkError {
  const error = new Error(message) as TalkError;
  error.code = code as TalkError['code'];
  error.details = details;
  return error;
}
