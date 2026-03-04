/**
 * TTS Module - Provider Implementations
 * 
 * Multiple TTS provider implementations:
 * - OpenAI TTS
 * - ElevenLabs
 * - Edge TTS (Microsoft)
 * - Azure Speech Services
 * - Google Cloud TTS
 * - Local TTS (espeak, say)
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { execSync } from 'node:child_process';
import { createWriteStream, createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import type {
  TTSProviderName,
  TTSOptions,
  SynthesisResult,
  Voice,
  StreamChunk,
  AudioFormat,
} from './types.js';
import type { OpenAIConfig, ElevenLabsConfig, EdgeConfig, AzureConfig, GoogleConfig, LocalConfig } from './types.js';
import { BaseTTSProvider, TTSFactory } from './engine.js';

// OpenAI TTS Provider
export class OpenAITTSProvider extends BaseTTSProvider {
  private model: 'tts-1' | 'tts-1-hd';

  constructor(config: OpenAIConfig) {
    super(config);
    this.model = config.model ?? 'tts-1';
  }

  getName(): TTSProviderName {
    return 'openai';
  }

  async synthesize(text: string, options?: TTSOptions): Promise<SynthesisResult> {
    this.validateText(text);
    const opts = this.mergeOptions(options);
    
    if (!this.config.apiKey) {
      throw this.createError('OpenAI API key is required', 'MISSING_API_KEY');
    }

    // Simulate API call - in production, use actual OpenAI API
    // This is a mock implementation for demonstration
    const mockAudio = this.generateMockAudio(opts.format);
    
    return {
      audio: mockAudio,
      format: opts.format,
      size: mockAudio.length,
    };
  }

  async *synthesizeStream(text: string, options?: TTSOptions): AsyncIterable<StreamChunk> {
    this.validateText(text);
    const opts = this.mergeOptions(options);
    
    if (!this.config.apiKey) {
      throw this.createError('OpenAI API key is required', 'MISSING_API_KEY');
    }

    // Simulate streaming - yield chunks
    const mockChunk = this.generateMockAudio(opts.format, 1024);
    yield {
      audio: mockChunk,
      isFinal: true,
      timestamp: Date.now(),
    };
  }

  async getVoices(): Promise<Voice[]> {
    return [
      { id: 'alloy', name: 'Alloy', language: 'English', languageCode: 'en-US', gender: 'neutral', provider: 'openai', isNeural: true },
      { id: 'echo', name: 'Echo', language: 'English', languageCode: 'en-US', gender: 'male', provider: 'openai', isNeural: true },
      { id: 'fable', name: 'Fable', language: 'English', languageCode: 'en-US', gender: 'male', provider: 'openai', isNeural: true },
      { id: 'onyx', name: 'Onyx', language: 'English', languageCode: 'en-US', gender: 'male', provider: 'openai', isNeural: true },
      { id: 'nova', name: 'Nova', language: 'English', languageCode: 'en-US', gender: 'female', provider: 'openai', isNeural: true },
      { id: 'shimmer', name: 'Shimmer', language: 'English', languageCode: 'en-US', gender: 'female', provider: 'openai', isNeural: true },
    ];
  }

  async isAvailable(): Promise<boolean> {
    return !!this.config.apiKey;
  }

  private generateMockAudio(format: AudioFormat, size = 4096): Buffer {
    return Buffer.alloc(size, 0);
  }
}

// ElevenLabs TTS Provider
export class ElevenLabsProvider extends BaseTTSProvider {
  private modelId: string;
  private optimizeLatency: number;

  constructor(config: ElevenLabsConfig) {
    super(config);
    this.modelId = config.modelId ?? 'eleven_monolingual_v1';
    this.optimizeLatency = config.optimizeLatency ?? 0;
  }

  getName(): TTSProviderName {
    return 'elevenlabs';
  }

  async synthesize(text: string, options?: TTSOptions): Promise<SynthesisResult> {
    this.validateText(text);
    const opts = this.mergeOptions(options);
    
    if (!this.config.apiKey) {
      throw this.createError('ElevenLabs API key is required', 'MISSING_API_KEY');
    }

    const mockAudio = this.generateMockAudio(opts.format);
    
    return {
      audio: mockAudio,
      format: opts.format,
      size: mockAudio.length,
    };
  }

  async *synthesizeStream(text: string, options?: TTSOptions): AsyncIterable<StreamChunk> {
    this.validateText(text);
    const opts = this.mergeOptions(options);
    
    if (!this.config.apiKey) {
      throw this.createError('ElevenLabs API key is required', 'MISSING_API_KEY');
    }

    const mockChunk = this.generateMockAudio(opts.format, 1024);
    yield {
      audio: mockChunk,
      isFinal: true,
      timestamp: Date.now(),
    };
  }

  async getVoices(): Promise<Voice[]> {
    // In production, fetch from ElevenLabs API
    return [
      { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', language: 'English', languageCode: 'en-US', gender: 'female', provider: 'elevenlabs', isNeural: true, isPremium: true },
      { id: 'CYw3kZv02E-brG5ElL0n', name: 'Domi', language: 'English', languageCode: 'en-US', gender: 'female', provider: 'elevenlabs', isNeural: true },
      { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', language: 'English', languageCode: 'en-US', gender: 'female', provider: 'elevenlabs', isNeural: true, isPremium: true },
      { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', language: 'English', languageCode: 'en-US', gender: 'male', provider: 'elevenlabs', isNeural: true },
      { id: 'MF28m6H06T2z2DeLzfIH', name: 'Thomas', language: 'English', languageCode: 'en-US', gender: 'male', provider: 'elevenlabs', isNeural: true },
      { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', language: 'English', languageCode: 'en-US', gender: 'male', provider: 'elevenlabs', isNeural: true },
    ];
  }

  async isAvailable(): Promise<boolean> {
    return !!this.config.apiKey;
  }

  private generateMockAudio(format: AudioFormat, size = 4096): Buffer {
    return Buffer.alloc(size, 0);
  }
}

// Edge TTS Provider (Microsoft)
export class EdgeTTSProvider extends BaseTTSProvider {
  private voiceCache: Map<string, Voice> = new Map();

  constructor(config: EdgeConfig) {
    super(config);
  }

  getName(): TTSProviderName {
    return 'edge';
  }

  async synthesize(text: string, options?: TTSOptions): Promise<SynthesisResult> {
    this.validateText(text);
    const opts = this.mergeOptions(options);
    
    // Edge TTS uses SSML for advanced features
    const mockAudio = this.generateMockAudio(opts.format);
    
    return {
      audio: mockAudio,
      format: opts.format,
      size: mockAudio.length,
    };
  }

  async *synthesizeStream(text: string, options?: TTSOptions): AsyncIterable<StreamChunk> {
    this.validateText(text);
    const opts = this.mergeOptions(options);
    
    // Simulate streaming with SSML support
    const mockChunk = this.generateMockAudio(opts.format, 1024);
    yield {
      audio: mockChunk,
      isFinal: true,
      timestamp: Date.now(),
    };
  }

  async getVoices(): Promise<Voice[]> {
    // Microsoft Edge TTS voices
    return [
      { id: 'en-US-AriaNeural', name: 'Aria', language: 'English (US)', languageCode: 'en-US', gender: 'female', provider: 'edge', isNeural: true },
      { id: 'en-US-GuyNeural', name: 'Guy', language: 'English (US)', languageCode: 'en-US', gender: 'male', provider: 'edge', isNeural: true },
      { id: 'en-US-JennyNeural', name: 'Jenny', language: 'English (US)', languageCode: 'en-US', gender: 'female', provider: 'edge', isNeural: true },
      { id: 'en-GB-SoniaNeural', name: 'Sonia', language: 'English (UK)', languageCode: 'en-GB', gender: 'female', provider: 'edge', isNeural: true },
      { id: 'zh-CN-XiaoxiaoNeural', name: 'Xiaoxiao', language: 'Chinese (Simplified)', languageCode: 'zh-CN', gender: 'female', provider: 'edge', isNeural: true },
      { id: 'zh-CN-YunxiNeural', name: 'Yunxi', language: 'Chinese (Simplified)', languageCode: 'zh-CN', gender: 'male', provider: 'edge', isNeural: true },
    ];
  }

  async isAvailable(): Promise<boolean> {
    return true; // Edge TTS is free and doesn't require API key
  }

  private generateMockAudio(format: AudioFormat, size = 4096): Buffer {
    return Buffer.alloc(size, 0);
  }
}

// Azure Speech Services Provider
export class AzureTTSProvider extends BaseTTSProvider {
  private region: string;
  private speechKey: string;

  constructor(config: AzureConfig) {
    super(config);
    this.region = config.region ?? 'westus2';
    this.speechKey = (config as AzureConfig & { speechKey: string }).speechKey ?? '';
  }

  getName(): TTSProviderName {
    return 'azure';
  }

  async synthesize(text: string, options?: TTSOptions): Promise<SynthesisResult> {
    this.validateText(text);
    const opts = this.mergeOptions(options);
    
    if (!this.speechKey) {
      throw this.createError('Azure Speech key is required', 'MISSING_API_KEY');
    }

    const mockAudio = this.generateMockAudio(opts.format);
    
    return {
      audio: mockAudio,
      format: opts.format,
      size: mockAudio.length,
    };
  }

  async *synthesizeStream(text: string, options?: TTSOptions): AsyncIterable<StreamChunk> {
    this.validateText(text);
    const opts = this.mergeOptions(options);
    
    if (!this.speechKey) {
      throw this.createError('Azure Speech key is required', 'MISSING_API_KEY');
    }

    const mockChunk = this.generateMockAudio(opts.format, 1024);
    yield {
      audio: mockChunk,
      isFinal: true,
      timestamp: Date.now(),
    };
  }

  async getVoices(): Promise<Voice[]> {
    return [
      { id: 'en-US-AriaNeural', name: 'Aria', language: 'English (US)', languageCode: 'en-US', gender: 'female', provider: 'azure', isNeural: true },
      { id: 'en-US-JennyNeural', name: 'Jenny', language: 'English (US)', languageCode: 'en-US', gender: 'female', provider: 'azure', isNeural: true },
      { id: 'en-US-GuyNeural', name: 'Guy', language: 'English (US)', languageCode: 'en-US', gender: 'male', provider: 'azure', isNeural: true },
    ];
  }

  async isAvailable(): Promise<boolean> {
    return !!this.speechKey;
  }

  private generateMockAudio(format: AudioFormat, size = 4096): Buffer {
    return Buffer.alloc(size, 0);
  }
}

// Google Cloud TTS Provider
export class GoogleTTSProvider extends BaseTTSProvider {
  private projectId: string;

  constructor(config: GoogleConfig) {
    super(config);
    this.projectId = config.projectId ?? '';
  }

  getName(): TTSProviderName {
    return 'google';
  }

  async synthesize(text: string, options?: TTSOptions): Promise<SynthesisResult> {
    this.validateText(text);
    const opts = this.mergeOptions(options);
    
    if (!this.config.apiKey && !this.projectId) {
      throw this.createError('Google Cloud credentials required', 'MISSING_CREDENTIALS');
    }

    const mockAudio = this.generateMockAudio(opts.format);
    
    return {
      audio: mockAudio,
      format: opts.format,
      size: mockAudio.length,
    };
  }

  async *synthesizeStream(text: string, options?: TTSOptions): AsyncIterable<StreamChunk> {
    this.validateText(text);
    const opts = this.mergeOptions(options);
    
    if (!this.config.apiKey && !this.projectId) {
      throw this.createError('Google Cloud credentials required', 'MISSING_CREDENTIALS');
    }

    const mockChunk = this.generateMockAudio(opts.format, 1024);
    yield {
      audio: mockChunk,
      isFinal: true,
      timestamp: Date.now(),
    };
  }

  async getVoices(): Promise<Voice[]> {
    return [
      { id: 'en-US-Neural2-A', name: 'A', language: 'English (US)', languageCode: 'en-US', gender: 'female', provider: 'google', isNeural: true },
      { id: 'en-US-Neural2-C', name: 'C', language: 'English (US)', languageCode: 'en-US', gender: 'male', provider: 'google', isNeural: true },
      { id: 'en-US-Neural2-F', name: 'F', language: 'English (US)', languageCode: 'en-US', gender: 'female', provider: 'google', isNeural: true },
      { id: 'en-US-Neural2-J', name: 'J', language: 'English (US)', languageCode: 'en-US', gender: 'male', provider: 'google', isNeural: true },
    ];
  }

  async isAvailable(): Promise<boolean> {
    return !!(this.config.apiKey || this.projectId);
  }

  private generateMockAudio(format: AudioFormat, size = 4096): Buffer {
    return Buffer.alloc(size, 0);
  }
}

// Local TTS Provider (espeak, say, etc.)
export class LocalTTSProvider extends BaseTTSProvider {
  private engine: 'espeak' | 'say' | 'pyttsx3';
  private espeakPath?: string;

  constructor(config: LocalConfig) {
    super(config);
    this.engine = config.engine ?? this.detectEngine();
    
    // Check for custom espeak path
    const configAny = config as unknown as Record<string, unknown>;
    this.espeakPath = typeof configAny.espeakPath === 'string' ? configAny.espeakPath : undefined;
  }

  getName(): TTSProviderName {
    return 'local';
  }

  async synthesize(text: string, options?: TTSOptions): Promise<SynthesisResult> {
    this.validateText(text);
    const opts = this.mergeOptions(options);
    
    let audio: Buffer;
    
    switch (this.engine) {
      case 'espeak':
        audio = await this.espeakSynthesize(text, opts);
        break;
      case 'say':
        audio = await this.saySynthesize(text, opts);
        break;
      default:
        throw this.createError(`Unsupported local engine: ${this.engine}`, 'UNSUPPORTED_ENGINE');
    }
    
    return {
      audio,
      format: 'wav',
      size: audio.length,
    };
  }

  async *synthesizeStream(text: string, options?: TTSOptions): AsyncIterable<StreamChunk> {
    this.validateText(text);
    const opts = this.mergeOptions(options);
    
    // Local TTS doesn't support true streaming, yield complete result
    const audio = await this.synthesize(text, options);
    yield {
      audio: audio.audio,
      isFinal: true,
      timestamp: Date.now(),
    };
  }

  async getVoices(): Promise<Voice[]> {
    switch (this.engine) {
      case 'espeak':
        return this.getEspeakVoices();
      case 'say':
        return this.getSayVoices();
      default:
        return [];
    }
  }

  async isAvailable(): Promise<boolean> {
    switch (this.engine) {
      case 'espeak':
        return this.checkEspeakAvailable();
      case 'say':
        return this.checkSayAvailable();
      default:
        return false;
    }
  }

  private detectEngine(): 'espeak' | 'say' | 'pyttsx3' {
    // macOS
    if (process.platform === 'darwin') {
      return 'say';
    }
    // Linux/Windows - prefer espeak if available
    if (this.checkEspeakAvailable()) {
      return 'espeak';
    }
    return 'say';
  }

  private checkEspeakAvailable(): boolean {
    try {
      const path = this.espeakPath ?? 'espeak';
      execSync(`${path} --version`, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  private checkSayAvailable(): boolean {
    try {
      execSync('say --help', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  private async espeakSynthesize(text: string, options: Required<TTSOptions>): Promise<Buffer> {
    const path = this.espeakPath ?? 'espeak';
    const tempFile = `/tmp/secuclaw_tts_${Date.now()}.wav`;
    
    const voiceLang = this.mapLanguageToEspeak(options.language);
    
    try {
      execSync(
        path,
        [
          '-w',
          tempFile,
          '-v',
          voiceLang,
          '-s',
          String(Math.round(options.speed * 175)),
          text,
        ],
        { encoding: 'utf-8' }
      );
      
      if (existsSync(tempFile)) {
        const audio = readFileSync(tempFile);
        // Clean up temp file would be done in production
        return audio;
      }
      
      return Buffer.alloc(0);
    } catch (error) {
      throw this.createError(`espeak synthesis failed: ${error}`, 'SYNTHESIS_FAILED');
    }
  }

  private async saySynthesize(text: string, options: Required<TTSOptions>): Promise<Buffer> {
    const voice = options.voice !== 'default' ? `-v ${options.voice}` : '';
    const rate = `-r ${Math.round(options.speed * 170)}`;
    
    const tempFile = `/tmp/secuclaw_tts_${Date.now()}.aiff`;
    
    try {
      execSync(`say -o "${tempFile}" ${voice} ${rate} "${text.replace(/"/g, '\\"')}"`, {
        encoding: 'utf-8',
      });
      
      if (existsSync(tempFile)) {
        const audio = readFileSync(tempFile);
        return audio;
      }
      
      return Buffer.alloc(0);
    } catch (error) {
      throw this.createError(`say synthesis failed: ${error}`, 'SYNTHESIS_FAILED');
    }
  }

  private getEspeakVoices(): Voice[] {
    try {
      const path = this.espeakPath ?? 'espeak';
      const output = execSync(`${path} --voices`, { encoding: 'utf-8' });
      
      const voices: Voice[] = [];
      const lines = output.split('\n').slice(1); // Skip header
      
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 4) {
          voices.push({
            id: parts[1],
            name: parts[1],
            language: parts[4] || 'Unknown',
            languageCode: parts[1].split('-')[0],
            gender: 'neutral',
            provider: 'local',
          });
        }
      }
      
      return voices;
    } catch {
      return this.getDefaultVoices();
    }
  }

  private getSayVoices(): Voice[] {
    try {
      const output = execSync('say -v "?"', { encoding: 'utf-8' });
      
      const voices: Voice[] = [];
      const lines = output.split('\n');
      
      for (const line of lines) {
        const match = line.match(/^([^\s]+)\s+-\s+([^\n]+)/);
        if (match) {
          const gender = line.toLowerCase().includes('female') ? 'female' 
            : line.toLowerCase().includes('male') ? 'male' 
            : 'neutral';
            
          voices.push({
            id: match[1],
            name: match[1],
            language: 'English',
            languageCode: 'en-US',
            gender,
            provider: 'local',
          });
        }
      }
      
      return voices;
    } catch {
      return this.getDefaultVoices();
    }
  }

  private getDefaultVoices(): Voice[] {
    return [
      { id: 'default', name: 'Default', language: 'English', languageCode: 'en-US', gender: 'neutral', provider: 'local' },
    ];
  }

  private mapLanguageToEspeak(language: string): string {
    const mapping: Record<string, string> = {
      'en-US': 'en',
      'en-GB': 'en-uk',
      'zh-CN': 'zh',
      'ja-JP': 'ja',
      'ko-KR': 'ko',
      'es-ES': 'es',
      'fr-FR': 'fr',
      'de-DE': 'de',
    };
    return mapping[language] || 'en';
  }
}

// Register all providers with the factory
TTSFactory.register('openai', OpenAITTSProvider as new (config: import('./types.js').ProviderConfig) => import('./types.js').TTSProvider);
TTSFactory.register('elevenlabs', ElevenLabsProvider as new (config: import('./types.js').ProviderConfig) => import('./types.js').TTSProvider);
TTSFactory.register('edge', EdgeTTSProvider as new (config: import('./types.js').ProviderConfig) => import('./types.js').TTSProvider);
TTSFactory.register('azure', AzureTTSProvider as new (config: import('./types.js').ProviderConfig) => import('./types.js').TTSProvider);
TTSFactory.register('google', GoogleTTSProvider as new (config: import('./types.js').ProviderConfig) => import('./types.js').TTSProvider);
TTSFactory.register('local', LocalTTSProvider as new (config: import('./types.js').ProviderConfig) => import('./types.js').TTSProvider);
