/**
 * STT Module - Streaming Recognition
 * 
 * Provides utilities for streaming audio recognition, including:
 * - Audio buffer management
 * - VAD (Voice Activity Detection) integration
 * - Real-time transcription handling
 */

import type {
  STTOptions,
  TranscriptionChunk,
  StreamingConfig,
  AudioFormat,
  WordTiming,
} from './types.js';

/**
 * Streaming STT session state
 */
export interface StreamingSessionState {
  isActive: boolean;
  isFinal: boolean;
  accumulatedText: string;
  accumulatedWords: WordTiming[];
  startTime: number;
  chunksReceived: number;
}

/**
 * Options for configuring the streaming recognizer
 */
export interface StreamingRecognizerOptions {
  /** Interim results vs final results */
  interimResults?: boolean;
  /** Single utterance mode - stop after silence */
  singleUtterance?: boolean;
  /** Silence duration in ms to trigger end of utterance */
  silenceDurationMs?: number;
  /** Minimum audio buffer size before starting recognition */
  minBufferSize?: number;
  /** Maximum audio buffer size */
  maxBufferSize?: number;
  /** Callback when utterance ends */
  onUtteranceEnd?: (text: string, duration: number) => void;
  /** Callback when final result received */
  onFinalResult?: (text: string, confidence: number) => void;
  /** Callback when interim result received */
  onInterimResult?: (text: string, confidence: number) => void;
}

/**
 * Audio recognition
 */
export class AudioChunkBuffer {
  private chunks: Buffer[] = [];
  private maxSize: number;
  private totalSize = 0;

  constructor(maxSize = 25 * 1024 * 1024) {
    // Default 25MB max (API limit)
    this.maxSize = maxSize;
  }

  /**
   * Add a chunk to the buffer
   */
  add(chunk: Buffer): boolean {
    if (this.totalSize + chunk.length > this.maxSize) {
      return false; // Buffer overflow
    }
    this.chunks.push(chunk);
    this.totalSize += chunk.length;
    return true;
  }

  /**
   * Get all accumulated audio as a single buffer
   */
  getAudio(): Buffer {
    return Buffer.concat(this.chunks);
  }

  /**
   * Get the current buffer size in bytes
   */
  getSize(): number {
    return this.totalSize;
  }

  /**
   * Clear the buffer
   */
  clear(): void {
    this.chunks = [];
    this.totalSize = 0;
  }

  /**
   * Check if buffer has data
   */
  isEmpty(): boolean {
    return this.totalSize === 0;
  }
}

/**
 * Simple Voice Activity Detection (VAD) implementation
 * Uses energy-based detection for simplicity
 */
export class EnergyVAD {
  private threshold: number;
  private minSilenceFrames: number;
  private frameCount = 0;

  constructor(options: { threshold?: number; minSilenceFrames?: number } = {}) {
    this.threshold = options.threshold ?? 0.01; // Energy threshold
    this.minSilenceFrames = options.minSilenceFrames ?? 30; // ~500ms at 16kHz
  }

  /**
   * Detect voice activity from audio samples
   * Simplified implementation - assumes 16-bit PCM at 16kHz
   */
  detect(audio: Buffer): boolean {
    // Calculate RMS energy
    const samples = new Int16Array(audio.buffer, audio.byteOffset, audio.length / 2);
    let sumSquares = 0;

    for (let i = 0; i < samples.length; i++) {
      sumSquares += samples[i] * samples[i];
    }

    const rms = Math.sqrt(sumSquares / samples.length) / 32768;

    if (rms > this.threshold) {
      this.frameCount = 0;
      return true;
    }

    this.frameCount++;
    return false;
  }

  /**
   * Check if silence has continued long enough to end utterance
   */
  isSilenceEnd(): boolean {
    return this.frameCount >= this.minSilenceFrames;
  }

  /**
   * Reset the VAD state
   */
  reset(): void {
    this.frameCount = 0;
  }
}

/**
 * Streaming recognizer that handles continuous audio streams
 */
export class StreamingRecognizer {
  private provider: {
    transcribeStream: (
      audio: AsyncIterable<Buffer>,
      options?: STTOptions
    ) => AsyncIterable<TranscriptionChunk>;
  };
  private options: Required<StreamingRecognizerOptions>;
  private state: StreamingSessionState;
  private audioBuffer: AudioChunkBuffer;
  private vad: EnergyVAD;
  private resolveNextChunk: ((value: IteratorResult<TranscriptionChunk>) => void) | null = null;
  private isProcessing = false;

  constructor(
    provider: {
      transcribeStream: (
        audio: AsyncIterable<Buffer>,
        options?: STTOptions
      ) => AsyncIterable<TranscriptionChunk>;
    },
    sttOptions: STTOptions = {},
    streamingOptions: StreamingRecognizerOptions = {}
  ) {
    this.provider = provider;
    this.options = {
      interimResults: streamingOptions.interimResults ?? true,
      singleUtterance: streamingOptions.singleUtterance ?? false,
      silenceDurationMs: streamingOptions.silenceDurationMs ?? 500,
      minBufferSize: streamingOptions.minBufferSize ?? 1024,
      maxBufferSize: streamingOptions.maxBufferSize ?? 25 * 1024 * 1024,
      onUtteranceEnd: streamingOptions.onUtteranceEnd ?? (() => {}),
      onFinalResult: streamingOptions.onFinalResult ?? (() => {}),
      onInterimResult: streamingOptions.onInterimResult ?? (() => {}),
    };

    this.audioBuffer = new AudioChunkBuffer(this.options.maxBufferSize);
    this.vad = new EnergyVAD({
      minSilenceFrames: Math.floor(this.options.silenceDurationMs / 16.67), // Approx frames
    });

    this.state = this.createInitialState();
  }

  /**
   * Start a new streaming session
   */
  start(): void {
    this.state = this.createInitialState();
    this.audioBuffer.clear();
    this.vad.reset();
    this.isProcessing = false;
  }

  /**
   * Feed audio data to the recognizer
   */
  async feedAudio(audio: Buffer): Promise<void> {
    if (!this.state.isActive) {
      // Wait for minimum buffer size
      this.audioBuffer.add(audio);
      if (this.audioBuffer.getSize() >= this.options.minBufferSize) {
        this.state.isActive = true;
        await this.processAudio();
      }
      return;
    }

    // Add to buffer and process
    const added = this.audioBuffer.add(audio);
    if (!added) {
      throw new Error('Audio buffer overflow');
    }

    await this.processAudio();
  }

  /**
   * Signal end of audio stream
   */
  async end(): Promise<TranscriptionChunk> {
    this.state.isActive = false;

    if (!this.audioBuffer.isEmpty()) {
      await this.processAudio(true);
    }

    const result: TranscriptionChunk = {
      text: this.state.accumulatedText,
      isFinal: true,
      confidence: 0.95,
      words: this.state.accumulatedWords,
    };

    this.options.onFinalResult(result.text, result.confidence);
    this.options.onUtteranceEnd(result.text, this.state.accumulatedWords.length > 0 
      ? this.state.accumulatedWords[this.state.accumulatedWords.length - 1].end 
      : 0);

    return result;
  }

  /**
   * Get current session state
   */
  getState(): StreamingSessionState {
    return { ...this.state };
  }

  /**
   * Get accumulated text so far
   */
  getText(): string {
    return this.state.accumulatedText;
  }

  /**
   * Check if currently processing
   */
  isActive(): boolean {
    return this.state.isActive;
  }

  /**
   * Process accumulated audio
   */
  private async processAudio(forceFinal = false): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      const audio = this.audioBuffer.getAudio();
      if (audio.length === 0) {
        return;
      }

      // Create async iterable from buffer
      const audioStream = this.createAudioStream(audio);

      for await (const chunk of this.provider.transcribeStream(
        audioStream,
        { ...this.options as STTOptions }
      )) {
        this.state.chunksReceived++;

        if (chunk.isFinal) {
          // Final result
          this.state.accumulatedText = chunk.text;
          this.state.accumulatedWords = chunk.words ?? [];
          this.state.isFinal = true;
          this.audioBuffer.clear();

          this.options.onFinalResult(chunk.text, chunk.confidence);

          if (this.options.singleUtterance) {
            this.state.isActive = false;
            this.options.onUtteranceEnd(
              chunk.text,
              chunk.words && chunk.words.length > 0
                ? chunk.words[chunk.words.length - 1].end
                : 0
            );
          }
          break;
        } else if (this.options.interimResults && !forceFinal) {
          // Interim result
          this.options.onInterimResult(chunk.text, chunk.confidence);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Create an async iterable from a buffer
   */
  private createAudioStream(buffer: Buffer): AsyncIterable<Buffer> {
    return {
      [Symbol.asyncIterator]: () => ({
        done: false,
        value: buffer,
        next: async () => {
          if (this.state.chunksReceived === 0) {
            this.state.chunksReceived++;
            return { done: false, value: buffer };
          }
          return { done: true, value: undefined };
        },
      }),
    };
  }

  /**
   * Create initial session state
   */
  private createInitialState(): StreamingSessionState {
    return {
      isActive: false,
      isFinal: false,
      accumulatedText: '',
      accumulatedWords: [],
      startTime: Date.now(),
      chunksReceived: 0,
    };
  }
}

/**
 * Audio format utilities
 */
export const AudioUtils = {
  /**
   * Get MIME type for audio format
   */
  getMimeType(format: AudioFormat): string {
    const mimeTypes: Record<AudioFormat, string> = {
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      ogg: 'audio/ogg',
      webm: 'audio/webm',
      flac: 'audio/flac',
      m4a: 'audio/mp4',
      aac: 'audio/aac',
    };
    return mimeTypes[format] ?? 'audio/wav';
  },

  /**
   * Estimate audio duration from buffer size
   * Assumes 16-bit PCM at 16kHz mono
   */
  estimateDuration(buffer: Buffer, sampleRate = 16000, channels = 1): number {
    const bytesPerSample = 2; // 16-bit
    const bytesPerSecond = sampleRate * channels * bytesPerSample;
    return buffer.length / bytesPerSecond;
  },

  /**
   * Check if audio format is supported by most providers
   */
  isSupportedFormat(format: AudioFormat): boolean {
    const supportedFormats: AudioFormat[] = ['wav', 'mp3', 'flac', 'ogg', 'm4a'];
    return supportedFormats.includes(format);
  },
};
