/**
 * Wake Module - Keywords
 * 
 * Defines default wake words and keyword management utilities.
 */

import type { WakeWord, BuiltInWakeWord, CustomWakeWord, SensitivityLevel } from './types.js';

/** Default wake words for SecuClaw */
export const DEFAULT_WAKE_WORDS: WakeWord[] = [
  { type: 'builtin', phrase: 'hey secuwclaw', sensitivity: 0.5 },
  { type: 'builtin', phrase: 'computer', sensitivity: 0.5 },
];

/** All supported built-in wake words */
export const BUILTIN_WAKE_WORDS: BuiltInWakeWord[] = [
  'alexa',
  'hey google',
  'hey siri',
  'jarvis',
  'computer',
];

/** Map of built-in wake words to their Porcupine keywords */
export const BUILTIN_KEYWORD_MAP: Record<BuiltInWakeWord, string> = {
  'alexa': 'alexa',
  'hey google': 'hey google',
  'hey siri': 'hey siri',
  'jarvis': 'jarvis',
  'computer': 'computer',
};

/** Sensitivity presets */
export const SENSITIVITY_PRESETS = {
  low: 0.75,
  medium: 0.5,
  high: 0.25,
} as const;

/**
 * Validate a wake word phrase
 */
export function validateWakeWordPhrase(phrase: string): boolean {
  if (!phrase || typeof phrase !== 'string') {
    return false;
  }
  
  const trimmed = phrase.trim().toLowerCase();
  
  if (trimmed.length === 0 || trimmed.length > 50) {
    return false;
  }
  
  // Check for valid characters (letters, spaces, and basic punctuation)
  const validPattern = /^[a-zA-Z\s\d'.,!?-]+$/;
  return validPattern.test(trimmed);
}

/**
 * Check if a phrase is a built-in wake word
 */
export function isBuiltInWakeWord(phrase: string): phrase is BuiltInWakeWord {
  const normalized = phrase.toLowerCase().trim();
  return BUILTIN_WAKE_WORDS.includes(normalized as BuiltInWakeWord);
}

/**
 * Normalize a wake word phrase
 */
export function normalizeWakeWordPhrase(phrase: string): string {
  return phrase.trim().toLowerCase();
}

/**
 * Create a custom wake word configuration
 */
export function createCustomWakeWord(
  phrase: string,
  options?: Partial<Omit<CustomWakeWord, 'id' | 'phrase'>>
): CustomWakeWord {
  return {
    id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    phrase: normalizeWakeWordPhrase(phrase),
    sensitivity: options?.sensitivity ?? 0.5,
    modelPath: options?.modelPath,
  };
}

/**
 * Create a wake word configuration from a phrase
 */
export function createWakeWord(
  phrase: string,
  options?: {
    sensitivity?: number;
    custom?: CustomWakeWord;
  }
): WakeWord {
  const normalized = normalizeWakeWordPhrase(phrase);
  const isBuiltin = isBuiltInWakeWord(normalized);
  
  return {
    type: isBuiltin ? 'builtin' : 'custom',
    phrase: normalized,
    sensitivity: options?.sensitivity ?? 0.5,
    custom: options?.custom,
  };
}

/**
 * Validate wake word configuration
 */
export function validateWakeWord(wakeWord: WakeWord): wakeWord is WakeWord {
  if (!wakeWord || typeof wakeWord !== 'object') {
    return false;
  }
  
  if (!wakeWord.phrase || !validateWakeWordPhrase(wakeWord.phrase)) {
    return false;
  }
  
  if (!['builtin', 'custom'].includes(wakeWord.type)) {
    return false;
  }
  
  if (wakeWord.type === 'builtin' && !isBuiltInWakeWord(wakeWord.phrase)) {
    return false;
  }
  
  if (wakeWord.sensitivity !== undefined) {
    if (typeof wakeWord.sensitivity !== 'number' || 
        wakeWord.sensitivity < 0 || 
        wakeWord.sensitivity > 1) {
      return false;
    }
  }
  
  return true;
}

/**
 * Sanitize an array of wake words
 */
export function sanitizeWakeWords(wakeWords: WakeWord[] | undefined | null): WakeWord[] {
  if (!Array.isArray(wakeWords)) {
    return [...DEFAULT_WAKE_WORDS];
  }
  
  const valid = wakeWords
    .map(w => (typeof w === 'string' ? createWakeWord(w) : w))
    .filter(validateWakeWord);
  
  return valid.length > 0 ? valid : [...DEFAULT_WAKE_WORDS];
}

/**
 * Get sensitivity value from preset or number
 */
export function resolveSensitivity(
  value: number | SensitivityLevel | undefined,
  defaultValue: number = 0.5
): number {
  if (value === undefined) {
    return defaultValue;
  }
  
  if (typeof value === 'number') {
    return Math.max(0, Math.min(1, value));
  }
  
  if (value in SENSITIVITY_PRESETS) {
    return SENSITIVITY_PRESETS[value as keyof typeof SENSITIVITY_PRESETS];
  }
  
  return defaultValue;
}

/**
 * Generate Porcupine keyword arguments from wake words
 */
export function getPorcupineKeywords(wakeWords: WakeWord[]): Array<{ builtin: string } | string> {
  return wakeWords.map(w => {
    if (w.type === 'builtin' && isBuiltInWakeWord(w.phrase)) {
      return { builtin: BUILTIN_KEYWORD_MAP[w.phrase as BuiltInWakeWord] };
    }
    // For custom wake words, return the phrase directly
    return w.phrase;
  });
}

/**
 * Get default configuration for wake detection
 */
export function getDefaultWakeConfig(): WakeWord[] {
  return [...DEFAULT_WAKE_WORDS];
}
