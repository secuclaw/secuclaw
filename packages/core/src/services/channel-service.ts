// Channel service for managing communication platforms
import { 
  createChannelManager, 
  type ChannelManager, 
  type ChannelConfig,
  type ChannelMessage,
  type ChannelResponse,
  type ChannelContext 
} from '../channels/index.js';

// Channel connection state
interface ChannelConnection {
  config: ChannelConfig;
  connected: boolean;
  lastError?: string;
}

// Message callback
type MessageCallback = (message: ChannelMessage) => void;

class ChannelService {
  private manager: ChannelManager | null = null;
  private connections: Map<string, ChannelConnection> = new Map();
  private messageCallbacks: Set<MessageCallback> = new Set();
  private initialized = false;

  async initialize() {
    if (this.initialized) return;
    
    // Load saved configurations from storage
    await this.loadConnections();
    this.initialized = true;
  }

  private async loadConnections() {
    // TODO: Load from persistent storage
  }

  async connectChannel(type: string, config: Record<string, unknown>): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate config
      if (!this.isValidConfig(type, config)) {
        return { success: false, error: 'Invalid configuration' };
      }

      const channelConfig: ChannelConfig = {
        type: type as ChannelConfig['type'],
        enabled: true,
        ...config,
      } as ChannelConfig;

      // Create channel manager if not exists
      if (!this.manager) {
        this.manager = createChannelManager({
          channels: [channelConfig],
          defaultChannel: type as ChannelConfig['type'],
        });
      } else {
        // Add channel to existing manager
        // Note: In production, we'd need to refactor ChannelManager to support dynamic addition
      }

      // Connect the channel
      const channel = this.manager.getChannel(type as ChannelConfig['type']);
      if (!channel) {
        return { success: false, error: `Channel ${type} not found` };
      }

      await channel.connect();

      // Register message handler
      channel.onMessage((message) => {
        this.messageCallbacks.forEach(cb => cb(message));
      });

      // Save connection state
      this.connections.set(type, {
        config: channelConfig,
        connected: true,
      });

      await this.saveConnections();

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.connections.set(type, {
        config: {} as ChannelConfig,
        connected: false,
        lastError: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  }

  async disconnectChannel(type: string): Promise<{ success: boolean }> {
    try {
      const channel = this.manager?.getChannel(type as ChannelConfig['type']);
      if (channel) {
        await channel.disconnect();
      }

      const conn = this.connections.get(type);
      if (conn) {
        conn.connected = false;
      }

      await this.saveConnections();
      return { success: true };
    } catch {
      return { success: false };
    }
  }

  async sendMessage(
    type: string, 
    content: string, 
    targetId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const channel = this.manager?.getChannel(type as ChannelConfig['type']);
      if (!channel) {
        return { success: false, error: `Channel ${type} not connected` };
      }

      const response: ChannelResponse = { content };
      const context: ChannelContext = {
        metadata: targetId ? { chatId: targetId } : {},
      };

      await channel.send(response, context);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  getChannelStatus(): Array<{ type: string; connected: boolean; lastError?: string }> {
    const status: Array<{ type: string; connected: boolean; lastError?: string }> = [];
    
    for (const [type, conn] of this.connections) {
      status.push({
        type,
        connected: conn.connected,
        lastError: conn.lastError,
      });
    }

    return status;
  }

  onMessage(callback: MessageCallback): () => void {
    this.messageCallbacks.add(callback);
    return () => this.messageCallbacks.delete(callback);
  }

  private isValidConfig(type: string, config: Record<string, unknown>): boolean {
    switch (type) {
      case 'feishu':
        return !!(config.appId && config.appSecret);
      case 'slack':
        return !!config.token;
      case 'telegram':
        return !!config.botToken;
      case 'discord':
        return !!config.botToken;
      // Add more validations as needed
      default:
        return Object.keys(config).length > 0;
    }
  }

  private async saveConnections() {
    // TODO: Save to persistent storage
  }
}

export const channelService = new ChannelService();
