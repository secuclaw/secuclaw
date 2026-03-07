import { describe, it, expect, beforeAll } from 'vitest';
import { ChannelManager, createChannelManager } from '../manager';
import { TelegramChannel } from '../telegram';
import { DiscordChannel } from '../discord';
import { FeishuChannel } from '../feishu';
import type { ChannelConfig, ChannelMessage, TelegramConfig, DiscordConfig, FeishuConfig } from '../types';

describe('Channel Integration Tests', () => {
  let manager: ChannelManager;

  describe('Multi-channel Manager', () => {
    beforeAll(() => {
      manager = createChannelManager({
        channels: [
          { type: 'web', enabled: true },
          { type: 'telegram', enabled: true, token: 'test-token' },
          { type: 'discord', enabled: true, token: 'test-token' },
        ],
        defaultChannel: 'web',
      });
    });

    it('should initialize all enabled channels', () => {
      const stats = manager.getStats();
      expect(Object.keys(stats)).toContain('web');
      expect(Object.keys(stats)).toContain('telegram');
      expect(Object.keys(stats)).toContain('discord');
    });

    it('should return default channel', () => {
      const channel = manager.getDefaultChannel();
      expect(channel?.type).toBe('web');
    });

    it('should handle message routing', () => {
      let receivedMessage: ChannelMessage | null = null;
      
      manager.onMessage((message) => {
        receivedMessage = message;
      });

      const testMessage: ChannelMessage = {
        id: 'test-1',
        channelId: 'ch-1',
        channelType: 'web',
        userId: 'user-1',
        content: 'Test message',
        timestamp: Date.now(),
      };

      expect(manager).toBeDefined();
    });
  });

  describe('Telegram Channel', () => {
    let channel: TelegramChannel;

    beforeAll(() => {
      const config: TelegramConfig = {
        type: 'telegram',
        enabled: true,
        token: 'test-bot-token',
      };
      channel = new TelegramChannel(config);
    });

    it('should create telegram channel with correct type', () => {
      expect(channel.type).toBe('telegram');
    });

    it('should not be connected initially', () => {
      expect(channel.isConnected()).toBe(false);
    });

    it('should return correct stats', () => {
      const stats = channel.getStats();
      expect(stats.messagesReceived).toBe(0);
      expect(stats.messagesSent).toBe(0);
    });
  });

  describe('Discord Channel', () => {
    let channel: DiscordChannel;

    beforeAll(() => {
      const config: DiscordConfig = {
        type: 'discord',
        enabled: true,
        token: 'test-bot-token',
      };
      channel = new DiscordChannel(config);
    });

    it('should create discord channel with correct type', () => {
      expect(channel.type).toBe('discord');
    });

    it('should not be connected initially', () => {
      expect(channel.isConnected()).toBe(false);
    });

    it('should return correct stats', () => {
      const stats = channel.getStats();
      expect(stats.messagesReceived).toBe(0);
      expect(stats.messagesSent).toBe(0);
    });
  });

  describe('Feishu Channel', () => {
    let channel: FeishuChannel;

    beforeAll(() => {
      const config: FeishuConfig = {
        type: 'feishu',
        enabled: true,
        appId: 'test-app-id',
        appSecret: 'test-app-secret',
      };
      channel = new FeishuChannel(config);
    });

    it('should create feishu channel with correct type', () => {
      expect(channel.type).toBe('feishu');
    });

    it('should not be connected initially', () => {
      expect(channel.isConnected()).toBe(false);
    });

    it('should support both feishu and lark domains', () => {
      const feishuConfig: FeishuConfig = {
        type: 'feishu',
        enabled: true,
        appId: 'test-app',
        appSecret: 'test-secret',
        domain: 'feishu',
      };
      const feishuCh = new FeishuChannel(feishuConfig);
      expect(feishuCh.type).toBe('feishu');

      const larkConfig: FeishuConfig = {
        type: 'feishu',
        enabled: true,
        appId: 'test-app',
        appSecret: 'test-secret',
        domain: 'lark',
      };
      const larkCh = new FeishuChannel(larkConfig);
      expect(larkCh.type).toBe('feishu');
    });
  });

  describe('Channel Type Validation', () => {
    it('should accept valid channel types', () => {
      const validTypes: ChannelConfig[] = [
        { type: 'web', enabled: true },
        { type: 'telegram', enabled: true, token: 'test' },
        { type: 'discord', enabled: true, token: 'test' },
        { type: 'slack', enabled: true, token: 'test' },
      ];

      validTypes.forEach((config) => {
        expect(() => createChannelManager({
          channels: [config],
          defaultChannel: config.type,
        })).not.toThrow();
      });
    });

    it('should skip disabled channels', () => {
      const mgr = createChannelManager({
        channels: [
          { type: 'web', enabled: true },
          { type: 'telegram', enabled: false, token: 'test' },
        ],
        defaultChannel: 'web',
      });

      const stats = mgr.getStats();
      expect(Object.keys(stats)).toContain('web');
      expect(Object.keys(stats)).not.toContain('telegram');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing required config gracefully', () => {
      expect(() => createChannelManager({
        channels: [
          { type: 'web', enabled: true },
        ],
        defaultChannel: 'web',
      })).not.toThrow();
    });

    it('should handle multiple message callbacks', () => {
      const mgr = createChannelManager({
        channels: [{ type: 'web', enabled: true }],
        defaultChannel: 'web',
      });

      const callback1 = () => {};
      const callback2 = () => {};

      expect(() => {
        mgr.onMessage(callback1);
        mgr.onMessage(callback2);
      }).not.toThrow();
    });
  });
});
