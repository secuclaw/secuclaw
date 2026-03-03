export type WebhookStatus = 'active' | 'disabled' | 'failed' | 'pending';
export type WebhookEventType = 
  | 'alert.created'
  | 'alert.escalated'
  | 'alert.resolved'
  | 'incident.created'
  | 'incident.updated'
  | 'incident.resolved'
  | 'vulnerability.detected'
  | 'vulnerability.patched'
  | 'threat.detected'
  | 'threat.blocked'
  | 'scan.completed'
  | 'scan.failed'
  | 'remediation.created'
  | 'remediation.completed'
  | 'compliance.violation'
  | 'compliance.resolved'
  | 'user.action'
  | 'system.event'
  | 'custom';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH';
export type AuthenticationType = 'none' | 'basic' | 'bearer' | 'api_key' | 'hmac' | 'oauth2';

export interface WebhookEndpoint {
  id: string;
  name: string;
  description?: string;
  
  url: string;
  method: HttpMethod;
  
  events: WebhookEventType[];
  filters?: WebhookFilter[];
  
  authentication: AuthenticationConfig;
  headers: Record<string, string>;
  
  retryPolicy: RetryPolicy;
  rateLimit: RateLimitConfig;
  
  status: WebhookStatus;
  lastTriggeredAt?: Date;
  lastSuccessAt?: Date;
  lastFailureAt?: Date;
  failureCount: number;
  successCount: number;
  
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  
  tags: string[];
  metadata: Record<string, unknown>;
}

export interface WebhookFilter {
  field: string;
  operator: 'equals' | 'contains' | 'matches' | 'gt' | 'lt' | 'in' | 'exists';
  value: string | number | boolean | string[];
}

export interface AuthenticationConfig {
  type: AuthenticationType;
  username?: string;
  password?: string;
  token?: string;
  apiKeyHeader?: string;
  apiKeyValue?: string;
  hmacSecret?: string;
  hmacAlgorithm?: 'sha256' | 'sha512';
  oauthConfig?: OAuthConfig;
}

export interface OAuthConfig {
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  scope?: string;
  grantType: 'client_credentials' | 'password' | 'authorization_code';
}

export interface RetryPolicy {
  enabled: boolean;
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryOnStatusCodes: number[];
}

export interface RateLimitConfig {
  enabled: boolean;
  maxRequests: number;
  windowMs: number;
  strategy: 'fixed' | 'sliding' | 'token_bucket';
}

export interface WebhookPayload {
  id: string;
  endpointId: string;
  eventType: WebhookEventType;
  
  timestamp: Date;
  data: Record<string, unknown>;
  
  signature?: string;
  headers: Record<string, string>;
  
  attemptNumber: number;
  maxAttempts: number;
}

export interface WebhookDelivery {
  id: string;
  payloadId: string;
  endpointId: string;
  
  attemptNumber: number;
  attemptedAt: Date;
  
  request: WebhookRequest;
  response?: WebhookResponse;
  
  status: 'pending' | 'success' | 'failed' | 'retrying' | 'abandoned';
  duration: number;
  
  error?: string;
  nextRetryAt?: Date;
}

export interface WebhookRequest {
  url: string;
  method: HttpMethod;
  headers: Record<string, string>;
  body: string;
}

export interface WebhookResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export interface WebhookStatistics {
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  pendingDeliveries: number;
  
  byEventType: Record<WebhookEventType, { sent: number; success: number; failed: number }>;
  byEndpoint: Record<string, { sent: number; success: number; failed: number; avgLatency: number }>;
  
  avgLatency: number;
  p95Latency: number;
  p99Latency: number;
  
  successRate: number;
}

export interface WebhookDashboard {
  totalEndpoints: number;
  activeEndpoints: number;
  disabledEndpoints: number;
  
  statistics: WebhookStatistics;
  
  recentDeliveries: WebhookDelivery[];
  failedDeliveries: WebhookDelivery[];
  
  endpointsByStatus: Record<WebhookStatus, number>;
  topEventTypes: Array<{ eventType: WebhookEventType; count: number }>;
  
  alerting: {
    disabledDueToFailures: number;
    highFailureRateEndpoints: string[];
  };
}

export interface WebhookTest {
  endpointId: string;
  eventType: WebhookEventType;
  testData: Record<string, unknown>;
  triggeredAt: Date;
  result?: WebhookDelivery;
}

export type WebhookEventHandler = (eventType: string, data: unknown) => void | Promise<void>;
