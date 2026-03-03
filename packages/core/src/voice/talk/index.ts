/**
 * Talk Module - Continuous Voice Dialogue
 * 
 * Provides continuous voice conversation capabilities with:
 * - Voice Activity Detection (VAD)
 * - Turn-taking management
 * - Session handling
 * - Integration with STT/TTS providers
 * 
 * @example
 * ```typescript
 * import { TalkMode, VoiceActivityDetector, TalkSession } from './voice/talk/index.js';
 * 
 * // Create talk mode instance
 * const talkMode = new TalkMode({
 *   continuousMode: true,
 *   interruptEnabled: true,
 * });
 * 
 * // Handle user speech
 * talkMode.onSpeech(async (event) => {
 *   console.log('User said:', event.text);
 *   // Process with AI and respond
 *   await talkMode.speak('Hello! How can I help?');
 * });
 * 
 * // Start listening
 * await talkMode.start();
 * ```
 */

// Types
export type {
  TalkModeStatus,
  VADSensitivity,
  TurnState,
  VADConfig,
  TalkModeConfig,
  AudioChunk,
  SpeechEvent,
  ResponseEvent,
  TurnEvent,
  VADEvent,
  TalkError,
  TalkErrorCode,
  SpeechCallback,
  ResponseCallback,
  TurnCallback,
  VADCallback,
  TalkErrorCallback,
  StatusCallback,
  STTProvider,
  TTSProvider,
  AudioInput,
  AudioOutput,
  TalkModeEvents,
  TalkMetrics,
  ConversationMessage,
} from './types.js';

// Constants
export {
  AUDIO_SAMPLE_RATE,
  DEFAULT_VAD_CONFIG,
  DEFAULT_TALK_CONFIG,
} from './types.js';

// VAD (Voice Activity Detection)
export { VoiceActivityDetector, createVADError } from './vad.js';

// Session
export { TalkSession, SessionManager } from './session.js';

// Mode
export { TalkMode, createTalkError } from './mode.js';

/**
 * Create a simple mock STT provider for testing
 */
export function createMockSTTProvider(): import('./types.js').STTProvider {
  return {
    getName: () => 'mock',
    async transcribe(audio: Buffer): Promise<import('./types.js').SpeechEvent> {
      return {
        text: 'Mock transcription',
        confidence: 1,
        audio,
        startTime: Date.now(),
        endTime: Date.now(),
      };
    },
    async isAvailable(): Promise<boolean> {
      return true;
    },
  };
}

/**
 * Create a simple mock TTS provider for testing
 */
export function createMockTTSProvider(): import('./types.js').TTSProvider {
  return {
    getName: () => 'mock',
    async synthesize(text: string): Promise<Buffer> {
      return Buffer.from(text);
    },
    async isAvailable(): Promise<boolean> {
      return true;
    },
  };
}

/**
 * Create a simple mock audio input for testing
 */
export function createMockAudioInput(): import('./types.js').AudioInput {
  let capturing = false;
  let callback: ((chunk: import('./types.js').AudioChunk) => void) | null = null;

  return {
    async start(): Promise<void> {
      capturing = true;
    },
    async stop(): Promise<void> {
      capturing = false;
    },
    isCapturing(): boolean {
      return capturing;
    },
    onAudio(cb: (chunk: import('./types.js').AudioChunk) => void): void {
      callback = cb;
    },
    getSampleRate(): number {
      return 16000;
    },
  };
}

/**
 * Create a simple mock audio output for testing
 */
export function createMockAudioOutput(): import('./types.js').AudioOutput {
  let playing = false;
  let endCallback: (() => void) | null = null;

  return {
    async play(audio: Buffer): Promise<void> {
      playing = true;
      // Simulate playback completion
      setTimeout(() => {
        playing = false;
        if (endCallback) {
          endCallback();
        }
      }, 100);
    },
    async stop(): Promise<void> {
      playing = false;
    },
    isPlaying(): boolean {
      return playing;
    },
    onPlaybackEnd(cb: () => void): void {
      endCallback = cb;
    },
  };
}
