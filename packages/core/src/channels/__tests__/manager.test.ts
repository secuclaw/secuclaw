import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChannelManager, createChannelManager } from '../manager.js';
import { BaseChannel } from '../base.js';
import type { 
  ChannelConfig, 
  ChannelMessage, 
  ChannelResponse, 
  ChannelContext,
  ChannelType 
} from '../types.js';

class MockChannel extends BaseChannel {
  type: ChannelType = 'web';
  
  async connect(): Promise<void> {
    this.connected = true;
  }
  
  async disconnect(): Promise<void> {
    this.connected = false;
  }
  
  async send(message: ChannelResponse, context: ChannelContext): Promise<void> {
    this.recordSend();
  }
}

describe('ChannelManager', () => {
  let manager: ChannelManager;
  
  const mockConfigs: ChannelConfig[] = [
    { type: 'web', enabled: true },
    { type: 'telegram', enabled: true, token: 'test-token' },
    { type: 'discord', enabled: false, token: 'disabled-token' },
  ];
  
  beforeEach(() => {
    manager = new ChannelManager({
      channels: mockConfigs,
      defaultChannel: 'web',
    });
  });
  
  describe('constructor', () => {
    it('should create manager with channels', () => {
      expect(manager).toBeDefined();
    });
    
    it('should skip disabled channels', () => {
      const stats = manager.getStats();
      expect(stats['discord']).toBeUndefined();
    });
    
    it('should set default channel', () => {
      const channel = manager.getDefaultChannel();
      expect(channel?.type).toBe('web');
    });
  });
  
  describe('getChannel', () => {
    it('should return undefined for non-existent channel', () => {
      const channel = manager.getChannel('telegram');
      expect(channel).toBeDefined();
    });
    
    it('should return channel for existing type', () => {
      const channel = manager.getChannel('web');
      expect(channel?.type).toBe('web');
    });
  });
  
  describe('getConnectedChannels', () => {
    it('should return empty array when no channels connected', () => {
      const connected = manager.getConnectedChannels();
      expect(connected).toEqual([]);
    });
  });
  
  describe('onMessage', () => {
    it('should register message callback', () => {
      const callback = vi.fn();
      manager.onMessage(callback);
      expect(callback).not.toHaveBeenCalled();
    });
  });
});

describe('BaseChannel', () => {
  let channel: MockChannel;
  
  beforeEach(() => {
    const config: ChannelConfig = { type: 'web', enabled: true };
    channel = new MockChannel(config);
  });
  
  describe('isConnected', () => {
    it('should return false initially', () => {
      expect(channel.isConnected()).toBe(false);
    });
    
    it('should return true after connect', async () => {
      await channel.connect();
      expect(channel.isConnected()).toBe(true);
    });
    
    it('should return false after disconnect', async () => {
      await channel.connect();
      await channel.disconnect();
      expect(channel.isConnected()).toBe(false);
    });
  });
  
  describe('onMessage', () => {
    it('should call registered callbacks on emitMessage', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      channel.onMessage(callback1);
      channel.onMessage(callback2);
      
      const testMessage: ChannelMessage = {
        id: 'test-1',
        channelId: 'ch-1',
        channelType: 'web',
        userId: 'user-1',
        content: 'Hello',
        timestamp: Date.now(),
      };
      
      (channel as unknown as { emitMessage: (msg: ChannelMessage) => void }).emitMessage(testMessage);
      
      expect(callback1).toHaveBeenCalledWith(testMessage);
      expect(callback2).toHaveBeenCalledWith(testMessage);
    });
  });
  
  describe('getStats', () => {
    it('should return initial stats', () => {
      const stats = channel.getStats();
      expect(stats.messagesReceived).toBe(0);
      expect(stats.messagesSent).toBe(0);
      expect(stats.errors).toBe(0);
    });
  });
});
