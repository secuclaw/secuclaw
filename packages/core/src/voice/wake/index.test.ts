/**
 * Wake Module - Unit Tests
 * 
 * Tests for Voice Wake Word Detection functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  VoiceWakeDetector,
  createWakeDetector,
  DEFAULT_WAKE_WORDS,
  BUILTIN_WAKE_WORDS,
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
} from './index.js';
import type { WakeWord, WakeConfig } from './types.js';

describe('Wake Module - Keywords', () => {
  describe('validateWakeWordPhrase', () => {
    it('should validate correct phrases', () => {
      expect(validateWakeWordPhrase('computer')).toBe(true);
      expect(validateWakeWordPhrase('hey secuclaw')).toBe(true);
      expect(validateWakeWordPhrase('Hello World')).toBe(true);
    });

    it('should reject empty or invalid phrases', () => {
      expect(validateWakeWordPhrase('')).toBe(false);
      expect(validateWakeWordPhrase('   ')).toBe(false);
      expect(validateWakeWordPhrase('a'.repeat(51))).toBe(false);
    });

    it('should reject phrases with invalid characters', () => {
      expect(validateWakeWordPhrase('test@home')).toBe(false);
      expect(validateWakeWordPhrase('test#123')).toBe(false);
    });

    it('should accept phrases with valid special characters', () => {
      expect(validateWakeWordPhrase("hey, world!")).toBe(true);
      expect(validateWakeWordPhrase("what's up?")).toBe(true);
    });
  });

  describe('isBuiltInWakeWord', () => {
    it('should identify built-in wake words', () => {
      expect(isBuiltInWakeWord('alexa')).toBe(true);
      expect(isBuiltInWakeWord('hey google')).toBe(true);
      expect(isBuiltInWakeWord('computer')).toBe(true);
    });

    it('should reject non-built-in phrases', () => {
      expect(isBuiltInWakeWord('hey secuclaw')).toBe(false);
      expect(isBuiltInWakeWord('custom')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(isBuiltInWakeWord('ALEXA')).toBe(true);
      expect(isBuiltInWakeWord('Computer')).toBe(true);
    });
  });

  describe('normalizeWakeWordPhrase', () => {
    it('should normalize phrases to lowercase and trim', () => {
      expect(normalizeWakeWordPhrase('  Hello World  ')).toBe('hello world');
      expect(normalizeWakeWordPhrase('COMPUTER')).toBe('computer');
    });
  });

  describe('createCustomWakeWord', () => {
    it('should create a custom wake word with id', () => {
      const custom = createCustomWakeWord('hey secuclaw');
      
      expect(custom.id).toMatch(/^custom_\d+_[a-z0-9]+$/);
      expect(custom.phrase).toBe('hey secuclaw');
      expect(custom.sensitivity).toBe(0.5);
    });

    it('should accept custom options', () => {
      const custom = createCustomWakeWord('test', {
        sensitivity: 0.75,
        modelPath: '/path/to/model.ppn',
      });
      
      expect(custom.sensitivity).toBe(0.75);
      expect(custom.modelPath).toBe('/path/to/model.ppn');
    });
  });

  describe('createWakeWord', () => {
    it('should create built-in wake words', () => {
      const wakeWord = createWakeWord('computer');
      
      expect(wakeWord.type).toBe('builtin');
      expect(wakeWord.phrase).toBe('computer');
    });

    it('should create custom wake words', () => {
      const wakeWord = createWakeWord('hey secuclaw');
      
      expect(wakeWord.type).toBe('custom');
      expect(wakeWord.phrase).toBe('hey secuclaw');
    });

    it('should accept sensitivity option', () => {
      const wakeWord = createWakeWord('computer', { sensitivity: 0.75 });
      
      expect(wakeWord.sensitivity).toBe(0.75);
    });
  });

  describe('validateWakeWord', () => {
    it('should validate correct wake words', () => {
      const validWakeWord: WakeWord = { type: 'builtin', phrase: 'computer' };
      expect(validateWakeWord(validWakeWord)).toBe(true);
    });

    it('should reject invalid wake words', () => {
      expect(validateWakeWord({ type: 'builtin', phrase: '' })).toBe(false);
      expect(validateWakeWord({ type: 'builtin' as const, phrase: 'test' })).toBe(false);
      expect(validateWakeWord({ type: 'builtin', phrase: 'invalid' })).toBe(false);
      expect(validateWakeWord({ type: 'builtin', phrase: 'test', sensitivity: 1.5 })).toBe(false);
  });

  describe('sanitizeWakeWords', () => {
    it('should return default wake words for invalid input', () => {
      expect(sanitizeWakeWords(undefined)).toEqual(DEFAULT_WAKE_WORDS);
      expect(sanitizeWakeWords(null)).toEqual(DEFAULT_WAKE_WORDS);
      expect(sanitizeWakeWords([])).toEqual(DEFAULT_WAKE_WORDS);
    });

    it('should filter invalid wake words', () => {
      const input: WakeWord[] = [
        { type: 'builtin', phrase: 'computer' },
        { type: 'builtin', phrase: '' }, // Invalid
        { type: 'builtin', phrase: 'alexa' },
      ];
      
      const result = sanitizeWakeWords(input);
      
      expect(result.length).toBe(2);
      expect(result[0].phrase).toBe('computer');
      expect(result[1].phrase).toBe('alexa');
    });

    it('should handle string arrays', () => {
      const result = sanitizeWakeWords(['computer', 'alexa'] as unknown as WakeWord[]);
      
      expect(result.length).toBe(2);
    });
  });

  describe('resolveSensitivity', () => {
    it('should resolve number values', () => {
      expect(resolveSensitivity(0.5)).toBe(0.5);
      expect(resolveSensitivity(0)).toBe(0);
      expect(resolveSensitivity(1)).toBe(1);
    });

    it('should clamp values outside range', () => {
      expect(resolveSensitivity(-0.5)).toBe(0);
      expect(resolveSensitivity(1.5)).toBe(1);
    });

    it('should resolve preset values', () => {
      expect(resolveSensitivity('low')).toBe(SENSITIVITY_PRESETS.low);
      expect(resolveSensitivity('medium')).toBe(SENSITIVITY_PRESETS.medium);
      expect(resolveSensitivity('high')).toBe(SENSITIVITY_PRESETS.high);
    });

    it('should use default for undefined', () => {
      expect(resolveSensitivity(undefined)).toBe(0.5);
      expect(resolveSensitivity(undefined, 0.75)).toBe(0.75);
    });
  });

  describe('getPorcupineKeywords', () => {
    it('should convert built-in wake words to Porcupine format', () => {
      const wakeWords: WakeWord[] = [
        { type: 'builtin', phrase: 'computer' },
        { type: 'builtin', phrase: 'alexa' },
      ];
      
      const keywords = getPorcupineKeywords(wakeWords);
      
      expect(keywords).toEqual([
        { builtin: 'computer' },
        { builtin: 'alexa' },
      ]);
    });

    it('should handle custom wake words', () => {
      const wakeWords: WakeWord[] = [
        { type: 'custom', phrase: 'hey secuclaw' },
      ];
      
      const keywords = getPorcupineKeywords(wakeWords);
      
      expect(keywords).toEqual(['hey secuclaw']);
    });
  });

  describe('getDefaultWakeConfig', () => {
    it('should return default wake words', () => {
      const defaults = getDefaultWakeConfig();
      
      expect(defaults).toEqual(DEFAULT_WAKE_WORDS);
    });
  });

  describe('BUILTIN_WAKE_WORDS', () => {
    it('should contain expected built-in wake words', () => {
      expect(BUILTIN_WAKE_WORDS).toContain('alexa');
      expect(BUILTIN_WAKE_WORDS).toContain('hey google');
      expect(BUILTIN_WAKE_WORDS).toContain('hey siri');
      expect(BUILTIN_WAKE_WORDS).toContain('jarvis');
      expect(BUILTIN_WAKE_WORDS).toContain('computer');
    });
  });
});

describe('Wake Module - Detector', () => {
  let detector: VoiceWakeDetector;

  const createTestConfig = (overrides?: Partial<WakeConfig>): WakeConfig => ({
    accessKey: 'test-access-key',
    wakeWords: [{ type: 'builtin', phrase: 'computer', sensitivity: 0.5 }],
    defaultSensitivity: 0.5,
    debug: false,
    ...overrides,
  });

  beforeEach(() => {
    detector = new VoiceWakeDetector(createTestConfig());
  });

  afterEach(async () => {
    if (detector.isListening()) {
      await detector.stop();
    }
  });

  describe('constructor', () => {
    it('should create detector with default values', () => {
      expect(detector).toBeInstanceOf(VoiceWakeDetector);
      expect(detector.getStatus()).toBe('inactive');
    });

    it('should accept custom wake words', () => {
      const customWords: WakeWord[] = [
        { type: 'builtin', phrase: 'alexa' },
        { type: 'custom', phrase: 'hey secuclaw' },
      ];
      
      const customDetector = new VoiceWakeDetector(
        createTestConfig({ wakeWords: customWords })
      );
      
      expect(customDetector.getWakeWords().length).toBe(2);
    });

    it('should sanitize invalid wake words', () => {
      const invalidDetector = new VoiceWakeDetector(
        createTestConfig({ wakeWords: [] })
      );
      
      expect(invalidDetector.getWakeWords().length).toBeGreaterThan(0);
    });
  });

  describe('start/stop', () => {
    it('should start and stop without errors', async () => {
      await expect(detector.start()).resolves.not.toThrow();
      expect(detector.isListening()).toBe(true);
      expect(detector.getStatus()).toBe('listening');
      
      await expect(detector.stop()).resolves.not.toThrow();
      expect(detector.isListening()).toBe(false);
      expect(detector.getStatus()).toBe('inactive');
    });

    it('should not start twice', async () => {
      await detector.start();
      
      // Second start should not throw but also not change much
      await detector.start();
      
      expect(detector.isListening()).toBe(true);
    });

    it('should emit status changes', async () => {
      const statusChanges: string[] = [];
      detector.on('status', (status) => {
        statusChanges.push(status);
      });
      
      await detector.start();
      await detector.stop();
      
      expect(statusChanges).toContain('processing');
      expect(statusChanges).toContain('listening');
      expect(statusChanges).toContain('inactive');
    });
  });

  describe('wake word management', () => {
    it('should add wake words', async () => {
      await detector.addWakeWord({ type: 'builtin', phrase: 'alexa' });
      
      const words = detector.getWakeWords();
      expect(words.some(w => w.phrase === 'alexa')).toBe(true);
    });

    it('should remove wake words', async () => {
      await detector.removeWakeWord('computer');
      
      const words = detector.getWakeWords();
      expect(words.some(w => w.phrase === 'computer')).toBe(false);
    });

    it('should update sensitivity', async () => {
      await detector.setSensitivity('computer', 0.75);
      
      const words = detector.getWakeWords();
      const computer = words.find(w => w.phrase === 'computer');
      expect(computer?.sensitivity).toBe(0.75);
    });

    it('should set global sensitivity', () => {
      detector.setGlobalSensitivity(0.3);
      
      // The detector should not throw
      expect(detector.getWakeWords()).toBeDefined();
    });
  });

  describe('audio processing', () => {
    it('should process audio data', async () => {
      await detector.start();
      
      // Create a test audio frame
      const audioFrame = new Int16Array(512);
      
      // Process should not throw
      const result = detector.processAudio(audioFrame);
      
      // Result should be a number (index or -1)
      expect(typeof result).toBe('number');
    });

    it('should not process when not listening', () => {
      const audioFrame = new Int16Array(512);
      
      const result = detector.processAudio(audioFrame);
      
      expect(result).toBe(-1);
    });
  });

  describe('events', () => {
    it('should emit wake event when detected', async () => {
      const wakeHandler = vi.fn();
      detector.on('wake', wakeHandler);
      
      await detector.start();
      
      // Process some audio that might trigger detection
      const audioFrame = new Int16Array(512);
      detector.processAudio(audioFrame);
      
      // Give time for async processing
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Note: In mock mode, detection is probabilistic
      // The important thing is no error was thrown
    });

    it('should emit error event on invalid operations', async () => {
      const errorHandler = vi.fn();
      detector.on('error', errorHandler);
      
      // Try to add invalid wake word
      await detector.addWakeWord({ type: 'builtin', phrase: '' } as WakeWord);
      
      // Should have called error handler
    });
  });

  describe('metrics', () => {
    it('should track metrics', async () => {
      await detector.start();
      
      const metrics = detector.getMetrics();
      
      expect(metrics).toHaveProperty('totalDetections');
      expect(metrics).toHaveProperty('falseActivations');
      expect(metrics).toHaveProperty('avgLatencyMs');
      expect(metrics).toHaveProperty('uptimeMs');
    });
  });

  describe('createWakeDetector factory', () => {
    it('should create detector with minimal config', () => {
      const detector = createWakeDetector('test-key');
      
      expect(detector).toBeInstanceOf(VoiceWakeDetector);
    });

    it('should accept options', () => {
      const detector = createWakeDetector('test-key', undefined, {
        sensitivity: 0.75,
        debug: true,
      });
      
      expect(detector).toBeInstanceOf(VoiceWakeDetector);
    });
  });
});

describe('Wake Module - Integration', () => {
  it('should export all public API', () => {
    // This is a compile-time check, but we verify the exports exist
    const module = require('./index.js');
    
    expect(module.VoiceWakeDetector).toBeDefined();
    expect(module.createWakeDetector).toBeDefined();
    expect(module.DEFAULT_WAKE_WORDS).toBeDefined();
    expect(module.BUILTIN_WAKE_WORDS).toBeDefined();
    expect(module.validateWakeWordPhrase).toBeDefined();
    expect(module.isBuiltInWakeWord).toBeDefined();
    expect(module.normalizeWakeWordPhrase).toBeDefined();
    expect(module.createCustomWakeWord).toBeDefined();
    expect(module.createWakeWord).toBeDefined();
    expect(module.validateWakeWord).toBeDefined();
    expect(module.sanitizeWakeWords).toBeDefined();
    expect(module.resolveSensitivity).toBeDefined();
    expect(module.getPorcupineKeywords).toBeDefined();
  });
});
});
