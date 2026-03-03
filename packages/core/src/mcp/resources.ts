import type { MCPResource, MCPNotification } from './types.js';
import type { Transport } from './transport.js';

export interface ResourceSubscription {
  id: string;
  uri: string;
  subscriberId: string;
  createdAt: Date;
  lastNotified?: Date;
  notificationCount: number;
}

export interface ResourceUpdate {
  uri: string;
  timestamp: Date;
  changes: ResourceChange[];
}

export interface ResourceChange {
  type: 'created' | 'updated' | 'deleted';
  path?: string;
  oldValue?: unknown;
  newValue?: unknown;
}

export interface SubscriptionCallback {
  (update: ResourceUpdate): void | Promise<void>;
}

export class ResourceManager {
  private resources: Map<string, MCPResource> = new Map();
  private subscriptions: Map<string, ResourceSubscription> = new Map();
  private subscribers: Map<string, SubscriptionCallback> = new Map();
  private transports: Map<string, Transport> = new Map();
  private pollingIntervals: Map<string, ReturnType<typeof setInterval>> = new Map();

  registerResource(resource: MCPResource): void {
    this.resources.set(resource.uri, resource);
  }

  unregisterResource(uri: string): void {
    this.resources.delete(uri);
    const subsToRemove = Array.from(this.subscriptions.values())
      .filter(sub => sub.uri === uri);
    subsToRemove.forEach(sub => this.subscriptions.delete(sub.id));
  }

  getResource(uri: string): MCPResource | undefined {
    return this.resources.get(uri);
  }

  listResources(): MCPResource[] {
    return Array.from(this.resources.values());
  }

  registerTransport(serverId: string, transport: Transport): void {
    this.transports.set(serverId, transport);
    
    transport.subscribe((message) => {
      if ('method' in message && message.method === 'notifications/resources/updated') {
        const params = message.params as { uri?: string };
        if (params.uri) {
          this.handleResourceUpdate(params.uri);
        }
      }
    });
  }

  subscribe(
    uri: string,
    callback: SubscriptionCallback,
    options?: { pollInterval?: number }
  ): string {
    const subscriberId = `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const subscription: ResourceSubscription = {
      id: subscriberId,
      uri,
      subscriberId,
      createdAt: new Date(),
      notificationCount: 0,
    };

    this.subscriptions.set(subscriberId, subscription);
    this.subscribers.set(subscriberId, callback);

    if (options?.pollInterval) {
      const intervalId = setInterval(
        () => this.checkForUpdates(uri),
        options.pollInterval
      );
      this.pollingIntervals.set(subscriberId, intervalId);
    }

    return subscriberId;
  }

  unsubscribe(subscriberId: string): void {
    this.subscriptions.delete(subscriberId);
    this.subscribers.delete(subscriberId);
    
    const intervalId = this.pollingIntervals.get(subscriberId);
    if (intervalId) {
      clearInterval(intervalId);
      this.pollingIntervals.delete(subscriberId);
    }
  }

  unsubscribeAll(uri?: string): void {
    const subs = uri
      ? Array.from(this.subscriptions.values()).filter(s => s.uri === uri)
      : Array.from(this.subscriptions.values());

    for (const sub of subs) {
      this.unsubscribe(sub.id);
    }
  }

  async readResource(uri: string, transport?: Transport): Promise<string | Buffer> {
    if (!transport) {
      throw new Error(`No transport available for resource: ${uri}`);
    }

    const response = await transport.send({
      jsonrpc: '2.0',
      id: `read-${Date.now()}`,
      method: 'resources/read',
      params: { uri },
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    const result = response.result as { contents?: Array<{ text?: string; data?: string }> };
    if (result.contents && result.contents[0]) {
      return result.contents[0].text ?? result.contents[0].data ?? '';
    }
    return '';
  }

  private async handleResourceUpdate(uri: string): Promise<void> {
    const update: ResourceUpdate = {
      uri,
      timestamp: new Date(),
      changes: [{ type: 'updated' }],
    };

    const relevantSubs = Array.from(this.subscriptions.values())
      .filter(sub => sub.uri === uri || this.uriMatchesPattern(sub.uri, uri));

    for (const sub of relevantSubs) {
      const callback = this.subscribers.get(sub.id);
      if (callback) {
        try {
          await callback(update);
          sub.lastNotified = new Date();
          sub.notificationCount++;
        } catch (error) {
          console.error(`Callback error for subscription ${sub.id}:`, error);
        }
      }
    }
  }

  private async checkForUpdates(uri: string): Promise<void> {
    void uri;
  }

  private uriMatchesPattern(pattern: string, uri: string): boolean {
    if (pattern.endsWith('/**')) {
      const prefix = pattern.slice(0, -3);
      return uri.startsWith(prefix);
    }
    if (pattern.endsWith('/*')) {
      const prefix = pattern.slice(0, -2);
      return uri.startsWith(prefix) && !uri.slice(prefix.length).includes('/');
    }
    return pattern === uri;
  }

  getSubscriptions(uri?: string): ResourceSubscription[] {
    const all = Array.from(this.subscriptions.values());
    return uri ? all.filter(s => s.uri === uri) : all;
  }

  getSubscriptionStats(): {
    totalSubscriptions: number;
    subscriptionsByResource: Record<string, number>;
    activePollingIntervals: number;
  } {
    const subscriptionsByResource: Record<string, number> = {};
    for (const sub of this.subscriptions.values()) {
      subscriptionsByResource[sub.uri] = (subscriptionsByResource[sub.uri] ?? 0) + 1;
    }

    return {
      totalSubscriptions: this.subscriptions.size,
      subscriptionsByResource,
      activePollingIntervals: this.pollingIntervals.size,
    };
  }

  createResourceNotification(uri: string, changes: ResourceChange[]): MCPNotification {
    return {
      jsonrpc: '2.0',
      method: 'notifications/resources/updated',
      params: {
        uri,
        changes,
        timestamp: new Date().toISOString(),
      },
    };
  }

  clear(): void {
    for (const intervalId of this.pollingIntervals.values()) {
      clearInterval(intervalId);
    }
    this.pollingIntervals.clear();
    this.subscriptions.clear();
    this.subscribers.clear();
    this.resources.clear();
  }
}

export function createResourceManager(): ResourceManager {
  return new ResourceManager();
}
