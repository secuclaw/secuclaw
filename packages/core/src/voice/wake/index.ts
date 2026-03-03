/**
 * Wake Module - Voice Wake Word Detection
 * 
 * A comprehensive wake word detection module for SecuClaw.
 * Uses Porcupine engine for low-latency, always-on wake word detection.
 * 
 * @example
 * ```typescript
 * import { VoiceWakeDetector, createWakeDetector } from './voice/wake/index.js';
 * 
 * // Create detector with default wake words
 * const detector = createWakeDetector('your-porcupine-access-key');
 * 
 * // Or create with custom configuration
 * const customDetector = new VoiceWakeDetector({
 *   accessKey: 'your-access-key',
 *   wakeWords: [
 *     { type: 'builtin', phrase: 'computer', sensitivity: 0.5 },
 *     { type: 'custom', phrase: 'hey secuclaw', sensitivity: 0.6 }
 *   ],
 *   defaultSensitivity: 0.5,
 *   debug: true
 * });
 * 
 * // Listen for wake events
 * detector.on('wake', (event) => {
 *   console.log('Wake word detected:', event.wakeWord);
 *   console.log('Confidence:', event.confidence);
 *   console.log('Processing time:', event.processingTimeMs, 'ms');
 * });
 * 
 * // Start detection
 * await detector.start();
 * 
 * // Process audio data manually (optional)
 * // detector.processAudio(audioFrame);
 * 
 * // Stop detection when done
 * await detector.stop();
 * ```
 * 
 * @module
 */

// Types
export type {
  WakeDetectionStatus,
  SensitivityLevel,
  BuiltInWakeWord,
  CustomWakeWord,
  WakeWord,
  WakeEvent,
  WakeConfig,
  WakeStartOptions,
  IWakeDetector,
  IAudioInput,
  PorcupineDetectionResult,
  WakeError,
  WakeErrorCode,
  WakeMetrics,
  WakeDetectorEvents,
} from './types.js';

// Keywords and utilities
export {
  DEFAULT_WAKE_WORDS,
  BUILTIN_WAKE_WORDS,
  BUILTIN_KEYWORD_MAP,
  SENSITIVITY_PRESETS,
  validateWakeWordPhrase,
  isBuiltInWakeWord,
  normalizeWakeWordPhrase,
  createCustomWakeWord,
  createWakeWord,
  validateWakeWord,
  sanitizeWakeWords,
  resolveSensitivity,
  getPorcupineKeywords,
  getDefaultWakeConfig,
} from './keywords.js';

// Detector
export { VoiceWakeDetector, createWakeDetector } from './detector.js';
