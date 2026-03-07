const API_BASE = 'http://localhost:21981';

export interface ChannelStatus {
  type: string;
  connected: boolean;
  lastError?: string;
}

export interface SendMessageParams {
  type: string;
  content: string;
  targetId?: string;
}

export interface ConnectParams {
  type: string;
  config: Record<string, string>;
}

export const channelApi = {
  async connect(params: ConnectParams): Promise<{ success: boolean; error?: string }> {
    const response = await fetch(`${API_BASE}/api/channels/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return response.json();
  },

  async disconnect(type: string): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE}/api/channels/disconnect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    });
    return response.json();
  },

  async sendMessage(params: SendMessageParams): Promise<{ success: boolean; error?: string }> {
    const response = await fetch(`${API_BASE}/api/channels/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return response.json();
  },

  async getStatus(): Promise<{ channels: ChannelStatus[] }> {
    const response = await fetch(`${API_BASE}/api/channels/status`);
    return response.json();
  },
};
