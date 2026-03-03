import * as crypto from 'crypto';
import type {
  WebhookEndpoint,
  WebhookEventType,
  WebhookPayload,
  WebhookDelivery,
  WebhookStatus,
  WebhookStatistics,
  WebhookDashboard,
  WebhookEventHandler,
  WebhookFilter,
  AuthenticationConfig,
  HttpMethod,
} from './types.js';

export class WebhookNotificationEngine {
  private endpoints: Map<string, WebhookEndpoint> = new Map();
  private payloads: Map<string, WebhookPayload> = new Map();
  private deliveries: WebhookDelivery[] = [];
  private statistics: WebhookStatistics;
  private eventHandlers: WebhookEventHandler[] = [];

  private pendingQueue: Array<{ payloadId: string; deliveryId: string }> = [];
  private processing = false;

  constructor() {
    this.statistics = this.initStatistics();
  }

  private initStatistics(): WebhookStatistics {
    return {
      totalDeliveries: 0,
      successfulDeliveries: 0,
      failedDeliveries: 0,
      pendingDeliveries: 0,
      byEventType: {} as Record<WebhookEventType, { sent: number; success: number; failed: number }>,
      byEndpoint: {} as Record<string, { sent: number; success: number; failed: number; avgLatency: number }>,
      avgLatency: 0,
      p95Latency: 0,
      p99Latency: 0,
      successRate: 0,
    };
  }

  registerEndpoint(options: {
    name: string;
    description?: string;
    url: string;
    method?: HttpMethod;
    events: WebhookEventType[];
    filters?: WebhookFilter[];
    authentication: AuthenticationConfig;
    headers?: Record<string, string>;
    retryPolicy?: {
      enabled?: boolean;
      maxRetries?: number;
      initialDelay?: number;
      maxDelay?: number;
      backoffMultiplier?: number;
    };
    rateLimit?: {
      enabled?: boolean;
      maxRequests?: number;
      windowMs?: number;
    };
    createdBy: string;
    tags?: string[];
  }): WebhookEndpoint {
    const endpoint: WebhookEndpoint = {
      id: this.generateId('endpoint'),
      name: options.name,
      description: options.description,
      url: options.url,
      method: options.method || 'POST',
      events: options.events,
      filters: options.filters,
      authentication: options.authentication,
      headers: options.headers || {},
      retryPolicy: {
        enabled: options.retryPolicy?.enabled ?? true,
        maxRetries: options.retryPolicy?.maxRetries ?? 3,
        initialDelay: options.retryPolicy?.initialDelay ?? 1000,
        maxDelay: options.retryPolicy?.maxDelay ?? 30000,
        backoffMultiplier: options.retryPolicy?.backoffMultiplier ?? 2,
        retryOnStatusCodes: [408, 429, 500, 502, 503, 504],
      },
      rateLimit: {
        enabled: options.rateLimit?.enabled ?? true,
        maxRequests: options.rateLimit?.maxRequests ?? 100,
        windowMs: options.rateLimit?.windowMs ?? 60000,
        strategy: 'sliding',
      },
      status: 'active',
      failureCount: 0,
      successCount: 0,
      createdBy: options.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: options.tags || [],
      metadata: {},
    };

    this.endpoints.set(endpoint.id, endpoint);
    this.emit('endpoint_registered', endpoint);
    return endpoint;
  }

  trigger(eventType: WebhookEventType, data: Record<string, unknown>, options?: {
    source?: string;
    priority?: 'high' | 'normal' | 'low';
  }): WebhookPayload[] {
    const matchingEndpoints = this.findMatchingEndpoints(eventType, data);
    const payloads: WebhookPayload[] = [];

    for (const endpoint of matchingEndpoints) {
      if (endpoint.status !== 'active') continue;

      const payload = this.createPayload(endpoint, eventType, data);
      this.payloads.set(payload.id, payload);
      payloads.push(payload);

      const delivery = this.createDelivery(payload);
      this.deliveries.push(delivery);

      this.pendingQueue.push({ payloadId: payload.id, deliveryId: delivery.id });
    }

    this.updateEventTypeStatistics(eventType, payloads.length);

    if (this.pendingQueue.length > 0 && !this.processing) {
      this.processQueue();
    }

    return payloads;
  }

  private findMatchingEndpoints(eventType: WebhookEventType, data: Record<string, unknown>): WebhookEndpoint[] {
    return Array.from(this.endpoints.values()).filter(endpoint => {
      if (!endpoint.events.includes(eventType) && !endpoint.events.includes('custom')) {
        return false;
      }

      if (endpoint.filters && endpoint.filters.length > 0) {
        return endpoint.filters.every(filter => this.evaluateFilter(filter, data));
      }

      return true;
    });
  }

  private evaluateFilter(filter: WebhookFilter, data: Record<string, unknown>): boolean {
    const value = this.getNestedValue(data, filter.field);

    switch (filter.operator) {
      case 'equals':
        return value === filter.value;
      case 'contains':
        return String(value).includes(String(filter.value));
      case 'matches':
        return new RegExp(String(filter.value)).test(String(value));
      case 'gt':
        return Number(value) > Number(filter.value);
      case 'lt':
        return Number(value) < Number(filter.value);
      case 'in':
        return Array.isArray(filter.value) && filter.value.includes(String(value));
      case 'exists':
        return value !== undefined && value !== null;
      default:
        return false;
    }
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce<unknown>((current, key) => {
      if (current && typeof current === 'object') {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  }

  private createPayload(endpoint: WebhookEndpoint, eventType: WebhookEventType, data: Record<string, unknown>): WebhookPayload {
    const payloadId = this.generateId('payload');
    const body = JSON.stringify({
      id: payloadId,
      eventType,
      timestamp: new Date().toISOString(),
      source: 'secuclaw',
      data,
    });

    const signature = this.generateSignature(body, endpoint.authentication);

    return {
      id: payloadId,
      endpointId: endpoint.id,
      eventType,
      timestamp: new Date(),
      data,
      signature,
      headers: this.buildHeaders(endpoint, signature),
      attemptNumber: 0,
      maxAttempts: endpoint.retryPolicy.maxRetries + 1,
    };
  }

  private generateSignature(body: string, auth: AuthenticationConfig): string | undefined {
    if (auth.type === 'hmac' && auth.hmacSecret) {
      const algorithm = auth.hmacAlgorithm || 'sha256';
      return crypto.createHmac(algorithm, auth.hmacSecret).update(body).digest('hex');
    }
    return undefined;
  }

  private buildHeaders(endpoint: WebhookEndpoint, signature?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'SecuClaw-Webhook/1.0',
      ...endpoint.headers,
    };

    if (signature) {
      headers['X-SecuClaw-Signature'] = signature;
    }

    switch (endpoint.authentication.type) {
      case 'bearer':
        if (endpoint.authentication.token) {
          headers['Authorization'] = `Bearer ${endpoint.authentication.token}`;
        }
        break;
      case 'basic':
        if (endpoint.authentication.username && endpoint.authentication.password) {
          const credentials = Buffer.from(`${endpoint.authentication.username}:${endpoint.authentication.password}`).toString('base64');
          headers['Authorization'] = `Basic ${credentials}`;
        }
        break;
      case 'api_key':
        if (endpoint.authentication.apiKeyHeader && endpoint.authentication.apiKeyValue) {
          headers[endpoint.authentication.apiKeyHeader] = endpoint.authentication.apiKeyValue;
        }
        break;
    }

    return headers;
  }

  private createDelivery(payload: WebhookPayload): WebhookDelivery {
    const endpoint = this.endpoints.get(payload.endpointId)!;
    const body = JSON.stringify({
      id: payload.id,
      eventType: payload.eventType,
      timestamp: payload.timestamp.toISOString(),
      source: 'secuclaw',
      data: payload.data,
    });

    return {
      id: this.generateId('delivery'),
      payloadId: payload.id,
      endpointId: payload.endpointId,
      attemptNumber: 0,
      attemptedAt: new Date(),
      request: {
        url: endpoint.url,
        method: endpoint.method,
        headers: payload.headers,
        body,
      },
      status: 'pending',
      duration: 0,
    };
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.pendingQueue.length > 0) {
      const item = this.pendingQueue.shift()!;
      await this.deliverItem(item.payloadId, item.deliveryId);
    }

    this.processing = false;
  }

  private async deliverItem(payloadId: string, deliveryId: string): Promise<void> {
    const payload = this.payloads.get(payloadId);
    const deliveryIndex = this.deliveries.findIndex(d => d.id === deliveryId);

    if (!payload || deliveryIndex === -1) return;

    const delivery = this.deliveries[deliveryIndex];
    const endpoint = this.endpoints.get(payload.endpointId);

    if (!endpoint) {
      delivery.status = 'failed';
      delivery.error = 'Endpoint not found';
      return;
    }

    delivery.attemptNumber++;
    delivery.attemptedAt = new Date();
    const startTime = Date.now();

    try {
      const response = await this.executeRequest(endpoint, delivery.request);
      
      delivery.response = response;
      delivery.duration = Date.now() - startTime;

      if (response.statusCode >= 200 && response.statusCode < 300) {
        delivery.status = 'success';
        endpoint.successCount++;
        endpoint.lastSuccessAt = new Date();
        endpoint.lastTriggeredAt = new Date();
        this.updateStatistics(endpoint.id, delivery.duration, true);
      } else {
        throw new Error(`HTTP ${response.statusCode}: ${response.body}`);
      }
    } catch (error) {
      delivery.duration = Date.now() - startTime;
      delivery.error = error instanceof Error ? error.message : 'Unknown error';
      
      endpoint.failureCount++;
      endpoint.lastFailureAt = new Date();

      if (this.shouldRetry(endpoint, delivery)) {
        delivery.status = 'retrying';
        delivery.nextRetryAt = this.calculateNextRetry(endpoint, delivery.attemptNumber);
        this.pendingQueue.push({ payloadId, deliveryId });
      } else {
        delivery.status = 'failed';
        this.updateStatistics(endpoint.id, delivery.duration, false);

        if (endpoint.failureCount >= 10) {
          endpoint.status = 'disabled';
          this.emit('endpoint_disabled', { endpoint, reason: 'Too many failures' });
        }
      }
    }

    this.deliveries[deliveryIndex] = delivery;
    this.emit('delivery_completed', delivery);
  }

  private async executeRequest(endpoint: WebhookEndpoint, request: WebhookDelivery['request']): Promise<{ statusCode: number; headers: Record<string, string>; body: string }> {
    try {
      const response = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });

      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      return {
        statusCode: response.status,
        headers,
        body: await response.text(),
      };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Request failed');
    }
  }

  private shouldRetry(endpoint: WebhookEndpoint, delivery: WebhookDelivery): boolean {
    if (!endpoint.retryPolicy.enabled) return false;
    if (delivery.attemptNumber >= endpoint.retryPolicy.maxRetries) return false;
    
    return true;
  }

  private calculateNextRetry(endpoint: WebhookEndpoint, attemptNumber: number): Date {
    const delay = Math.min(
      endpoint.retryPolicy.initialDelay * Math.pow(endpoint.retryPolicy.backoffMultiplier, attemptNumber - 1),
      endpoint.retryPolicy.maxDelay
    );
    return new Date(Date.now() + delay);
  }

  private updateStatistics(endpointId: string, duration: number, success: boolean): void {
    this.statistics.totalDeliveries++;
    
    if (success) {
      this.statistics.successfulDeliveries++;
    } else {
      this.statistics.failedDeliveries++;
    }

    if (!this.statistics.byEndpoint[endpointId]) {
      this.statistics.byEndpoint[endpointId] = { sent: 0, success: 0, failed: 0, avgLatency: 0 };
    }
    
    const endpointStats = this.statistics.byEndpoint[endpointId];
    endpointStats.sent++;
    if (success) endpointStats.success++;
    else endpointStats.failed++;
    endpointStats.avgLatency = (endpointStats.avgLatency * (endpointStats.sent - 1) + duration) / endpointStats.sent;

    this.statistics.successRate = this.statistics.totalDeliveries > 0
      ? this.statistics.successfulDeliveries / this.statistics.totalDeliveries
      : 0;
  }

  private updateEventTypeStatistics(eventType: WebhookEventType, count: number): void {
    if (!this.statistics.byEventType[eventType]) {
      this.statistics.byEventType[eventType] = { sent: 0, success: 0, failed: 0 };
    }
    this.statistics.byEventType[eventType].sent += count;
  }

  testEndpoint(endpointId: string, options?: { eventType?: WebhookEventType; testData?: Record<string, unknown> }): Promise<WebhookDelivery> {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) {
      throw new Error(`Endpoint not found: ${endpointId}`);
    }

    const eventType = options?.eventType || 'system.event';
    const testData = options?.testData || { test: true, timestamp: new Date().toISOString() };

    const payloads = this.trigger(eventType, testData);
    const payload = payloads.find(p => p.endpointId === endpointId);

    if (!payload) {
      throw new Error('Failed to create test payload');
    }

    const delivery = this.deliveries.find(d => d.payloadId === payload.id);
    if (!delivery) {
      throw new Error('Failed to create test delivery');
    }

    return Promise.resolve(delivery);
  }

  getEndpoint(endpointId: string): WebhookEndpoint | undefined {
    return this.endpoints.get(endpointId);
  }

  listEndpoints(status?: WebhookStatus): WebhookEndpoint[] {
    const endpoints = Array.from(this.endpoints.values());
    if (status) {
      return endpoints.filter(e => e.status === status);
    }
    return endpoints;
  }

  updateEndpoint(endpointId: string, updates: Partial<WebhookEndpoint>): WebhookEndpoint {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) {
      throw new Error(`Endpoint not found: ${endpointId}`);
    }

    const updated = {
      ...endpoint,
      ...updates,
      id: endpoint.id,
      createdAt: endpoint.createdAt,
      createdBy: endpoint.createdBy,
      updatedAt: new Date(),
    };

    this.endpoints.set(endpointId, updated);
    this.emit('endpoint_updated', updated);
    return updated;
  }

  deleteEndpoint(endpointId: string): boolean {
    const deleted = this.endpoints.delete(endpointId);
    if (deleted) {
      this.emit('endpoint_deleted', { endpointId });
    }
    return deleted;
  }

  getDeliveries(options?: {
    endpointId?: string;
    status?: 'pending' | 'success' | 'failed' | 'retrying';
    limit?: number;
  }): WebhookDelivery[] {
    let deliveries = this.deliveries;

    if (options?.endpointId) {
      deliveries = deliveries.filter(d => d.endpointId === options.endpointId);
    }
    if (options?.status) {
      deliveries = deliveries.filter(d => d.status === options.status);
    }

    return deliveries.slice(-(options?.limit || 100));
  }

  getDashboard(): WebhookDashboard {
    const endpoints = Array.from(this.endpoints.values());
    
    const endpointsByStatus: Record<WebhookStatus, number> = {
      active: 0,
      disabled: 0,
      failed: 0,
      pending: 0,
    };

    for (const endpoint of endpoints) {
      endpointsByStatus[endpoint.status]++;
    }

    const eventTypeCounts = new Map<WebhookEventType, number>();
    for (const delivery of this.deliveries) {
      const payload = this.payloads.get(delivery.payloadId);
      if (payload) {
        eventTypeCounts.set(payload.eventType, (eventTypeCounts.get(payload.eventType) || 0) + 1);
      }
    }

    const topEventTypes = Array.from(eventTypeCounts.entries())
      .map(([eventType, count]) => ({ eventType, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const recentDeliveries = this.deliveries.slice(-50).reverse();
    const failedDeliveries = this.deliveries
      .filter(d => d.status === 'failed')
      .slice(-20)
      .reverse();

    return {
      totalEndpoints: endpoints.length,
      activeEndpoints: endpointsByStatus.active,
      disabledEndpoints: endpointsByStatus.disabled + endpointsByStatus.failed,
      statistics: this.statistics,
      recentDeliveries,
      failedDeliveries,
      endpointsByStatus,
      topEventTypes,
      alerting: {
        disabledDueToFailures: endpoints.filter(e => e.status === 'disabled' && e.failureCount >= 10).length,
        highFailureRateEndpoints: endpoints
          .filter(e => e.failureCount > 5 && e.status === 'active')
          .map(e => e.name),
      },
    };
  }

  addEventHandler(handler: WebhookEventHandler): void {
    this.eventHandlers.push(handler);
  }

  private emit(eventType: string, data: unknown): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(eventType, data);
      } catch {
        // Intentionally ignoring handler errors to prevent cascading failures
      }
    }
  }

  private generateId(prefix: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `wh_${prefix}_${timestamp}_${random}`;
  }
}

export function createWebhookNotificationEngine(): WebhookNotificationEngine {
  return new WebhookNotificationEngine();
}
