export interface TenantConfig {
  id: string;
  name: string;
  createdAt: Date;
  settings: TenantSettings;
  quotas: TenantQuotas;
}

export interface TenantSettings {
  dataRetentionDays: number;
  maxUsers: number;
  maxSessions: number;
  allowedRoles: string[];
  features: string[];
}

export interface TenantQuotas {
  maxApiCallsPerDay: number;
  maxStorageMb: number;
  maxConcurrentSessions: number;
}

export const DEFAULT_TENANT_SETTINGS: TenantSettings = {
  dataRetentionDays: 90,
  maxUsers: 100,
  maxSessions: 1000,
  allowedRoles: ['security_expert', 'analyst', 'compliance'],
  features: ['threat_intel', 'compliance', 'incident_response'],
};

export const DEFAULT_TENANT_QUOTAS: TenantQuotas = {
  maxApiCallsPerDay: 10000,
  maxStorageMb: 1024,
  maxConcurrentSessions: 50,
};

export interface TenantContext {
  tenantId: string;
  userId?: string;
  sessionId?: string;
  roles: string[];
  permissions: string[];
  metadata: Record<string, unknown>;
}

export type TenantAware<T> = T & { tenantId: string };

export interface DataIsolationRule {
  resource: string;
  scope: 'strict' | 'shared' | 'global';
  filterField?: string;
}
