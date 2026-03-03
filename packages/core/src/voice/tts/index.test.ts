/**
 * TTS Module - Unit Tests
 */

import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  TTSFactory,
  TTSEngine,
  synthesize,
  DEFAULT_VOICES,
  PROVIDER_METADATA,
  OpenAITTSProvider,
  ElevenLabsProvider,
  EdgeTTSProvider,
  LocalTTSProvider,
} from './index.js';
import type { TTSProviderName, ProviderConfig } from './types.js';

describe('TTS Module', () => {
  describe('TTSFactory', () => {
    beforeEach(() => {
      // Clear any state between tests
    });

    it('should create an OpenAI provider', () => {
      const config: ProviderConfig = {
        provider: 'openai',
        apiKey: 'test-key',
      };
      
      const provider = TTSFactory.create(config);
      expect(provider).toBeDefined();
      expect(provider.getName()).toBe('openai');
    });

    it('should create an ElevenLabs provider', () => {
      const config: ProviderConfig = {
        provider: 'elevenlabs',
        apiKey: 'test-key',
      };
      
      const provider = TTSFactory.create(config);
      expect(provider).toBeDefined();
      expect(provider.getName()).toBe('elevenlabs');
    });

    it('should create an Edge TTS provider', () => {
      const config: ProviderConfig = {
        provider: 'edge',
      };
      
      const provider = TTSFactory.create(config);
      expect(provider).toBeDefined();
      expect(provider.getName()).toBe('edge');
    });

    it('should create a Local TTS provider', () => {
      const config: ProviderConfig = {
        provider: 'local',
      };
      
      const provider = TTSFactory.create(config);
      expect(provider).toBeDefined();
      expect(provider.getName()).toBe('local');
    });

    it('should throw on unknown provider', () => {
      expect(() => {
        TTSFactory.create({ provider: 'unknown' as TTSProviderName });
      }).toThrow('Unknown TTS provider');
    });

    it('should list available providers', () => {
      const providers = TTSFactory.getAvailableProviders();
      expect(providers).toContain('openai');
      expect(providers).toContain('elevenlabs');
      expect(providers).toContain('edge');
      expect(providers).toContain('azure');
      expect(providers).toContain('google');
      expect(providers).toContain('local');
    });

    it('should check if provider exists', () => {
      expect(TTSFactory.hasProvider('openai')).toBe(true);
      expect(TTSFactory.hasProvider('unknown' as TTSProviderName)).toBe(false);
    });
  });

  describe('TTSEngine', () => {
    it('should create engine with provider', () => {
      const config: ProviderConfig = {
        provider: 'edge',
      };
      const provider = TTSFactory.create(config);
      const engine = new TTSEngine(provider);
      
      expect(engine).toBeDefined();
      expect(engine.getProviderName()).toBe('edge');
    });

    it('should speak text', async () => {
      const config: ProviderConfig = {
        provider: 'edge',
      };
      const provider = TTSFactory.create(config);
      const engine = new TTSEngine(provider);
      
      const result = await engine.speak('Hello, world!');
      expect(result).toBeDefined();
      expect(result.audio).toBeInstanceOf(Buffer);
      expect(result.format).toBeDefined();
      expect(result.size).toBeGreaterThan(0);
    });

    it('should speak with custom options', async () => {
      const config: ProviderConfig = {
        provider: 'edge',
        defaultFormat: 'mp3',
      };
      const provider = TTSFactory.create(config);
      const engine = new TTSEngine(provider);
      
      const result = await engine.speak('Hello!', { format: 'wav' });
      expect(result.format).toBe('wav');
    });

    it('should speak stream', async () => {
      const config: ProviderConfig = {
        provider: 'edge',
      };
      const provider = TTSFactory.create(config);
      const engine = new TTSEngine(provider);
      
      const chunks: Buffer[] = [];
      for await (const chunk of engine.speakStream('Hello, streaming!')) {
        chunks.push(chunk.audio);
        expect(chunk.isFinal).toBe(true);
      }
      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should get voices', async () => {
      const config: ProviderConfig = {
        provider: 'edge',
      };
      const provider = TTSFactory.create(config);
      const engine = new TTSEngine(provider);
      
      const voices = await engine.getVoices();
      expect(voices).toBeInstanceOf(Array);
      expect(voices.length).toBeGreaterThan(0);
      expect(voices[0]).toHaveProperty('id');
      expect(voices[0]).toHaveProperty('name');
      expect(voices[0]).toHaveProperty('languageCode');
    });

    it('should track metrics', async () => {
      const config: ProviderConfig = {
        provider: 'edge',
      };
      const provider = TTSFactory.create(config);
      const engine = new TTSEngine(provider);
      
      await engine.speak('Test');
      
      const metrics = engine.getAllMetrics();
      expect(metrics).toHaveProperty('synthesize');
    });
  });

  describe('OpenAITTSProvider', () => {
    it('should create provider', () => {
      const provider = new OpenAITTSProvider({
        provider: 'openai',
        apiKey: 'test-key',
      });
      
      expect(provider.getName()).toBe('openai');
    });

    it('should synthesize speech', async () => {
      const provider = new OpenAITTSProvider({
        provider: 'openai',
        apiKey: 'test-key',
      });
      
      const result = await provider.synthesize('Hello');
      expect(result.audio).toBeInstanceOf(Buffer);
      expect(result.format).toBe('mp3');
    });

    it('should get voices', async () => {
      const provider = new OpenAITTSProvider({
        provider: 'openai',
        apiKey: 'test-key',
      });
      
      const voices = await provider.getVoices();
      expect(voices.length).toBeGreaterThan(0);
      expect(voices[0].provider).toBe('openai');
    });

    it('should report availability with API key', async () => {
      const provider = new OpenAITTSProvider({
        provider: 'openai',
        apiKey: 'test-key',
      });
      
      expect(await provider.isAvailable()).toBe(true);
    });

    it('should throw without API key', async () => {
      const provider = new OpenAITTSProvider({
        provider: 'openai',
        apiKey: '',
      });
      
      await expect(provider.synthesize('Hello')).rejects.toThrow('API key is required');
    });

    it('should throw on empty text', async () => {
      const provider = new OpenAITTSProvider({
        provider: 'openai',
        apiKey: 'test-key',
      });
      
      await expect(provider.synthesize('')).rejects.toThrow('Text cannot be empty');
    });
  });

  describe('ElevenLabsProvider', () => {
    it('should create provider', () => {
      const provider = new ElevenLabsProvider({
        provider: 'elevenlabs',
        apiKey: 'test-key',
      });
      
      expect(provider.getName()).toBe('elevenlabs');
    });

    it('should synthesize speech', async () => {
      const provider = new ElevenLabsProvider({
        provider: 'elevenlabs',
        apiKey: 'test-key',
      });
      
      const result = await provider.synthesize('Hello');
      expect(result.audio).toBeInstanceOf(Buffer);
    });

    it('should get voices', async () => {
      const provider = new ElevenLabsProvider({
        provider: 'elevenlabs',
        apiKey: 'test-key',
      });
      
      const voices = await provider.getVoices();
      expect(voices.length).toBeGreaterThan(0);
    });
  });

  describe('EdgeTTSProvider', () => {
    it('should create provider', () => {
      const provider = new EdgeTTSProvider({
        provider: 'edge',
      });
      
      expect(provider.getName()).toBe('edge');
    });

    it('should always be available', async () => {
      const provider = new EdgeTTSProvider({
        provider: 'edge',
      });
      
      expect(await provider.isAvailable()).toBe(true);
    });

    it('should get voices', async () => {
      const provider = new EdgeTTSProvider({
        provider: 'edge',
      });
      
      const voices = await provider.getVoices();
      expect(voices.length).toBeGreaterThan(0);
      expect(voices[0].provider).toBe('edge');
    });
  });

  describe('LocalTTSProvider', () => {
    it('should create provider', () => {
      const provider = new LocalTTSProvider({
        provider: 'local',
      });
      
      expect(provider.getName()).toBe('local');
    });

    it('should detect engine on macOS', () => {
      const provider = new LocalTTSProvider({
        provider: 'local',
        engine: 'say',
      });
      
      expect(provider.getName()).toBe('local');
    });
  });

  describe('convenience synthesize function', () => {
    it('should synthesize with config', async () => {
      const result = await synthesize('Hello', {
        provider: 'edge',
      });
      
      expect(result.audio).toBeInstanceOf(Buffer);
    });
  });

  describe('DEFAULT_VOICES', () => {
    it('should have voices for en-US', () => {
      expect(DEFAULT_VOICES['en-US']).toBeDefined();
      expect(DEFAULT_VOICES['en-US'].openai).toBeDefined();
      expect(DEFAULT_VOICES['en-US'].edge).toBeDefined();
    });

    it('should have voices for zh-CN', () => {
      expect(DEFAULT_VOICES['zh-CN']).toBeDefined();
    });
  });

  describe('PROVIDER_METADATA', () => {
    it('should have metadata for all providers', () => {
      const providers: TTSProviderName[] = ['openai', 'elevenlabs', 'edge', 'azure', 'google', 'local'];
      
      for (const provider of providers) {
        expect(PROVIDER_METADATA[provider]).toBeDefined();
        expect(PROVIDER_METADATA[provider].name).toBe(provider);
        expect(PROVIDER_METADATA[provider].displayName).toBeDefined();
      }
    });

    it('should identify free providers', () => {
      expect(PROVIDER_METADATA.edge.isFree).toBe(true);
      expect(PROVIDER_METADATA.local.isFree).toBe(true);
      expect(PROVIDER_METADATA.openai.isFree).toBe(false);
    });
  });
});
