import type {
  TenantConfig,
  TenantSettings,
  TenantQuotas,
  TenantContext,
  TenantAware,
  DataIsolationRule,
} from './types.js';
import { DEFAULT_TENANT_SETTINGS, DEFAULT_TENANT_QUOTAS } from './types.js';

export class TenantIsolationManager {
  private tenants: Map<string, TenantConfig> = new Map();
  private contexts: Map<string, TenantContext> = new Map();
  private currentContext: TenantContext | null = null;
  private isolationRules: Map<string, DataIsolationRule> = new Map();

  constructor() {
    this.initializeDefaultRules();
  }

  private initializeDefaultRules(): void {
    const rules: DataIsolationRule[] = [
      { resource: 'sessions', scope: 'strict', filterField: 'tenantId' },
      { resource: 'messages', scope: 'strict', filterField: 'tenantId' },
      { resource: 'memory', scope: 'strict', filterField: 'tenantId' },
      { resource: 'incidents', scope: 'strict', filterField: 'tenantId' },
      { resource: 'tools', scope: 'shared' },
      { resource: 'knowledge', scope: 'global' },
      { resource: 'threat_intel', scope: 'global' },
    ];

    for (const rule of rules) {
      this.isolationRules.set(rule.resource, rule);
    }
  }

  createTenant(
    id: string,
    name: string,
    settings?: Partial<TenantSettings>,
    quotas?: Partial<TenantQuotas>
  ): TenantConfig {
    const config: TenantConfig = {
      id,
      name,
      createdAt: new Date(),
      settings: { ...DEFAULT_TENANT_SETTINGS, ...settings },
      quotas: { ...DEFAULT_TENANT_QUOTAS, ...quotas },
    };

    this.tenants.set(id, config);
    return config;
  }

  getTenant(tenantId: string): TenantConfig | undefined {
    return this.tenants.get(tenantId);
  }

  deleteTenant(tenantId: string): boolean {
    this.contexts.forEach((ctx, key) => {
      if (ctx.tenantId === tenantId) {
        this.contexts.delete(key);
      }
    });
    return this.tenants.delete(tenantId);
  }

  createContext(
    tenantId: string,
    userId?: string,
    sessionId?: string,
    roles: string[] = [],
    metadata: Record<string, unknown> = {}
  ): TenantContext {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    const validRoles = roles.filter(r => tenant.settings.allowedRoles.includes(r));
    const permissions = this.resolvePermissions(validRoles);

    const context: TenantContext = {
      tenantId,
      userId,
      sessionId,
      roles: validRoles,
      permissions,
      metadata,
    };

    const contextKey = `${tenantId}:${userId ?? 'anonymous'}:${sessionId ?? 'default'}`;
    this.contexts.set(contextKey, context);
    return context;
  }

  private resolvePermissions(roles: string[]): string[] {
    const rolePermissions: Record<string, string[]> = {
      admin: ['*'],
      security_expert: [
        'threat:*', 'vulnerability:*', 'incident:*', 'tool:*', 'session:*',
        'knowledge:read', 'compliance:read', 'report:*'
      ],
      analyst: [
        'threat:read', 'threat:write', 'vulnerability:read', 'incident:read',
        'tool:execute', 'session:read', 'knowledge:read'
      ],
      compliance: [
        'compliance:*', 'audit:*', 'report:*', 'knowledge:read', 'session:read'
      ],
      viewer: [
        'threat:read', 'vulnerability:read', 'incident:read', 'knowledge:read'
      ],
    };

    const permissions = new Set<string>();
    for (const role of roles) {
      const perms = rolePermissions[role] ?? [];
      for (const perm of perms) {
        permissions.add(perm);
      }
    }
    return Array.from(permissions);
  }

  setContext(context: TenantContext): void {
    this.currentContext = context;
  }

  setContextByKey(tenantId: string, userId?: string, sessionId?: string): TenantContext | null {
    const contextKey = `${tenantId}:${userId ?? 'anonymous'}:${sessionId ?? 'default'}`;
    const context = this.contexts.get(contextKey);
    if (context) {
      this.currentContext = context;
      return context;
    }
    return null;
  }

  getContext(): TenantContext | null {
    return this.currentContext;
  }

  requireContext(): TenantContext {
    if (!this.currentContext) {
      throw new Error('No tenant context set');
    }
    return this.currentContext;
  }

  clearContext(): void {
    this.currentContext = null;
  }

  hasPermission(permission: string, context?: TenantContext): boolean {
    const ctx = context ?? this.currentContext;
    if (!ctx) return false;

    if (ctx.permissions.includes('*')) return true;

    for (const perm of ctx.permissions) {
      if (perm === permission) return true;
      if (perm.endsWith(':*') && permission.startsWith(perm.slice(0, -1))) return true;
    }

    return false;
  }

  checkPermission(permission: string, context?: TenantContext): void {
    if (!this.hasPermission(permission, context)) {
      throw new Error(`Permission denied: ${permission}`);
    }
  }

  getIsolationRule(resource: string): DataIsolationRule | undefined {
    return this.isolationRules.get(resource);
  }

  addIsolationRule(rule: DataIsolationRule): void {
    this.isolationRules.set(rule.resource, rule);
  }

  applyIsolation<T extends Record<string, unknown>>(resource: string, data: T, context?: TenantContext): TenantAware<T> {
    const ctx = context ?? this.currentContext;
    const rule = this.isolationRules.get(resource);

    if (!rule || rule.scope === 'global') {
      return { ...data, tenantId: ctx?.tenantId ?? 'global' };
    }

    if (rule.scope === 'strict' && ctx) {
      return { ...data, tenantId: ctx.tenantId };
    }

    if (rule.scope === 'shared') {
      return { ...data, tenantId: ctx?.tenantId ?? 'shared' };
    }

    return { ...data, tenantId: ctx?.tenantId ?? 'unknown' };
  }

  filterByTenant<T extends { tenantId?: string }>(resource: string, items: T[], context?: TenantContext): T[] {
    const ctx = context ?? this.currentContext;
    const rule = this.isolationRules.get(resource);

    if (!rule || rule.scope === 'global') {
      return items;
    }

    if (!ctx) {
      return [];
    }

    return items.filter(item => item.tenantId === ctx.tenantId);
  }

  getTenantStats(tenantId: string): {
    activeContexts: number;
    createdAt?: Date;
    settings: TenantSettings | null;
    quotas: TenantQuotas | null;
  } {
    const tenant = this.tenants.get(tenantId);
    let activeContexts = 0;

    this.contexts.forEach(ctx => {
      if (ctx.tenantId === tenantId) activeContexts++;
    });

    return {
      activeContexts,
      createdAt: tenant?.createdAt,
      settings: tenant?.settings ?? null,
      quotas: tenant?.quotas ?? null,
    };
  }

  listTenants(): TenantConfig[] {
    return Array.from(this.tenants.values());
  }

  listContexts(tenantId?: string): TenantContext[] {
    const contexts = Array.from(this.contexts.values());
    if (tenantId) {
      return contexts.filter(ctx => ctx.tenantId === tenantId);
    }
    return contexts;
  }
}

let defaultManager: TenantIsolationManager | null = null;

export function getTenantManager(): TenantIsolationManager {
  if (!defaultManager) {
    defaultManager = new TenantIsolationManager();
  }
  return defaultManager;
}

export function resetTenantManager(): void {
  defaultManager = null;
}

export function withTenantContext<T>(
  tenantId: string,
  userId: string | undefined,
  fn: () => T,
  manager: TenantIsolationManager = getTenantManager()
): T {
  const ctx = manager.createContext(tenantId, userId);
  manager.setContext(ctx);
  try {
    return fn();
  } finally {
    manager.clearContext();
  }
}
