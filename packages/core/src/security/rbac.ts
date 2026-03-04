import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { randomBytes } from "crypto";

export type Permission = 
  | "read:assets"
  | "write:assets"
  | "delete:assets"
  | "read:threats"
  | "write:threats"
  | "delete:threats"
  | "read:incidents"
  | "write:incidents"
  | "delete:incidents"
  | "read:reports"
  | "write:reports"
  | "execute:tools"
  | "execute:sandbox"
  | "execute:attack"
  | "execute:defense"
  | "manage:users"
  | "manage:roles"
  | "manage:tenants"
  | "manage:skills"
  | "manage:config"
  | "view:audit"
  | "export:data"
  | "admin:all";

export type RoleName = "admin" | "security_analyst" | "threat_hunter" | "compliance_auditor" | "incident_responder" | "security_architect" | "readonly" | "custom";

export interface Role {
  id: string;
  name: RoleName;
  displayName: string;
  description: string;
  permissions: Permission[];
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  tenantId: string;
  roleIds: string[];
  customPermissions: Permission[];
  status: "active" | "disabled" | "suspended";
  lastLogin: Date | null;
  createdAt: Date;
  apiKeys?: ApiKey[];
}

export interface ApiKey {
  id: string;
  name: string;
  keyHash: string;
  prefix: string;
  permissions: Permission[];
  expiresAt: Date | null;
  lastUsed: Date | null;
  createdAt: Date;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: "free" | "starter" | "professional" | "enterprise";
  settings: TenantSettings;
  quotas: TenantQuotas;
  status: "active" | "suspended" | "deleted";
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface TenantSettings {
  dataRetentionDays: number;
  maxSessionDuration: number;
  requireMfa: boolean;
  allowedIpRanges: string[];
  ssoEnabled: boolean;
  ssoProvider?: string;
  dataMaskingEnabled: boolean;
  auditLoggingEnabled: boolean;
  ipWhitelist: string[];
  ipBlacklist: string[];
}

export interface TenantQuotas {
  maxUsers: number;
  maxSessions: number;
  maxApiCalls: number;
  maxStorageMb: number;
  maxTools: number;
  maxSkills: number;
  maxTenants: number;
}

export interface AccessContext {
  userId: string;
  tenantId: string;
  roles: Role[];
  permissions: Set<Permission>;
  tenant: Tenant;
}

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId: string;
  tenantId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
}

const SYSTEM_ROLES: Omit<Role, "id" | "createdAt" | "updatedAt">[] = [
  {
    name: "admin",
    displayName: "Administrator",
    description: "Full system access",
    permissions: ["admin:all"],
    isSystem: true,
  },
  {
    name: "security_analyst",
    displayName: "Security Analyst",
    description: "Analyze threats and vulnerabilities",
    permissions: [
      "read:assets",
      "read:threats",
      "write:threats",
      "read:incidents",
      "write:incidents",
      "read:reports",
      "write:reports",
      "execute:tools",
      "view:audit",
    ],
    isSystem: true,
  },
  {
    name: "threat_hunter",
    displayName: "Threat Hunter",
    description: "Proactive threat hunting and red team operations",
    permissions: [
      "read:assets",
      "read:threats",
      "write:threats",
      "read:incidents",
      "execute:tools",
      "execute:sandbox",
      "execute:attack",
    ],
    isSystem: true,
  },
  {
    name: "compliance_auditor",
    displayName: "Compliance Auditor",
    description: "Audit and compliance review",
    permissions: [
      "read:assets",
      "read:threats",
      "read:incidents",
      "read:reports",
      "write:reports",
      "view:audit",
      "export:data",
    ],
    isSystem: true,
  },
  {
    name: "incident_responder",
    displayName: "Incident Responder",
    description: "Respond to security incidents",
    permissions: [
      "read:assets",
      "write:assets",
      "read:threats",
      "read:incidents",
      "write:incidents",
      "execute:tools",
      "execute:defense",
    ],
    isSystem: true,
  },
  {
    name: "security_architect",
    displayName: "Security Architect",
    description: "Design and implement security architecture",
    permissions: [
      "read:assets",
      "write:assets",
      "read:threats",
      "write:threats",
      "read:incidents",
      "read:reports",
      "write:reports",
      "execute:tools",
      "manage:config",
    ],
    isSystem: true,
  },
  {
    name: "readonly",
    displayName: "Read Only",
    description: "View-only access",
    permissions: [
      "read:assets",
      "read:threats",
      "read:incidents",
      "read:reports",
    ],
    isSystem: true,
  },
];

const PLAN_QUOTAS: Record<Tenant["plan"], TenantQuotas> = {
  free: { maxUsers: 3, maxSessions: 10, maxApiCalls: 1000, maxStorageMb: 100, maxTools: 5, maxSkills: 10, maxTenants: 1 },
  starter: { maxUsers: 10, maxSessions: 50, maxApiCalls: 10000, maxStorageMb: 500, maxTools: 15, maxSkills: 25, maxTenants: 3 },
  professional: { maxUsers: 50, maxSessions: 200, maxApiCalls: 100000, maxStorageMb: 2000, maxTools: 50, maxSkills: 100, maxTenants: 10 },
  enterprise: { maxUsers: -1, maxSessions: -1, maxApiCalls: -1, maxStorageMb: -1, maxTools: -1, maxSkills: -1, maxTenants: -1 },
};

class RBACManager {
  private roles: Map<string, Role> = new Map();
  private users: Map<string, User> = new Map();
  private tenants: Map<string, Tenant> = new Map();
  private auditLogs: AuditLogEntry[] = [];
  private maxAuditLogs: number = 50000;
  private dataDir?: string;
  private autoSave: boolean = true;

  constructor(options?: { dataDir?: string; autoSave?: boolean }) {
    this.dataDir = options?.dataDir;
    this.autoSave = options?.autoSave ?? true;
    this.initSystemRoles();
    
    if (this.dataDir) {
      this.load();
    }
  }

  private initSystemRoles(): void {
    for (const role of SYSTEM_ROLES) {
      const fullRole: Role = {
        ...role,
        id: "role-" + role.name,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.roles.set(fullRole.id, fullRole);
    }
  }

  private generateId(prefix: string): string {
    const randomPart = randomBytes(6).toString("hex");
    return `${prefix}-${Date.now()}-${randomPart}`;
  }

  private async save(): Promise<void> {
    if (!this.dataDir || !this.autoSave) return;
    
    try {
      if (!existsSync(this.dataDir)) {
        mkdirSync(this.dataDir, { recursive: true });
      }
      
      const data = {
        roles: Array.from(this.roles.values()).filter(r => !r.isSystem),
        users: Array.from(this.users.values()),
        tenants: Array.from(this.tenants.values()),
        auditLogs: this.auditLogs.slice(-this.maxAuditLogs),
      };
      
      writeFileSync(
        join(this.dataDir, "rbac-data.json"),
        JSON.stringify(data, null, 2)
      );
    } catch (e) {
      console.error("Failed to save RBAC data:", e);
    }
  }

  private load(): void {
    if (!this.dataDir) return;
    
    try {
      const filePath = join(this.dataDir, "rbac-data.json");
      if (!existsSync(filePath)) return;
      
      const data = JSON.parse(readFileSync(filePath, "utf-8"));
      
      // Load custom roles
      if (data.roles) {
        for (const role of data.roles) {
          role.createdAt = new Date(role.createdAt);
          role.updatedAt = new Date(role.updatedAt);
          this.roles.set(role.id, role);
        }
      }
      
      // Load users
      if (data.users) {
        for (const user of data.users) {
          user.createdAt = new Date(user.createdAt);
          user.lastLogin = user.lastLogin ? new Date(user.lastLogin) : null;
          if (user.apiKeys) {
            user.apiKeys = user.apiKeys.map((k: ApiKey) => ({
              ...k,
              createdAt: new Date(k.createdAt),
              expiresAt: k.expiresAt ? new Date(k.expiresAt) : null,
              lastUsed: k.lastUsed ? new Date(k.lastUsed) : null,
            }));
          }
          this.users.set(user.id, user);
        }
      }
      
      // Load tenants
      if (data.tenants) {
        for (const tenant of data.tenants) {
          tenant.createdAt = new Date(tenant.createdAt);
          this.tenants.set(tenant.id, tenant);
        }
      }
      
      // Load audit logs
      if (data.auditLogs) {
        this.auditLogs = data.auditLogs.map((l: AuditLogEntry) => ({
          ...l,
          timestamp: new Date(l.timestamp),
        }));
      }
    } catch (e) {
      console.error("Failed to load RBAC data:", e);
    }
  }

  // Tenant Management
  createTenant(
    name: string,
    slug: string,
    plan: Tenant["plan"],
    metadata?: Record<string, unknown>
  ): Tenant {
    const tenant: Tenant = {
      id: this.generateId("tenant"),
      name,
      slug,
      plan,
      settings: {
        dataRetentionDays: 90,
        maxSessionDuration: 3600,
        requireMfa: plan === "enterprise",
        allowedIpRanges: [],
        ssoEnabled: false,
        dataMaskingEnabled: true,
        auditLoggingEnabled: true,
        ipWhitelist: [],
        ipBlacklist: [],
      },
      quotas: PLAN_QUOTAS[plan],
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata,
    };

    this.tenants.set(tenant.id, tenant);
    this.save();
    this.addAuditLog("system", "tenant.created", "tenant", tenant.id, { name, slug, plan });
    return tenant;
  }

  updateTenant(tenantId: string, updates: Partial<Pick<Tenant, "name" | "plan" | "settings" | "status">>): Tenant | null {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) return null;

    if (updates.plan && updates.plan !== tenant.plan) {
      tenant.quotas = PLAN_QUOTAS[updates.plan];
    }
    
    Object.assign(tenant, updates);
    tenant.updatedAt = new Date();
    
    this.save();
    this.addAuditLog("system", "tenant.updated", "tenant", tenantId, updates);
    return tenant;
  }

  // User Management
  createUser(
    email: string,
    displayName: string,
    tenantId: string,
    roleNames: RoleName[]
  ): User | null {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) return null;

    // Check quota
    const quota = this.checkQuota(tenantId, "maxUsers");
    if (!quota.ok) {
      throw new Error("User quota exceeded for tenant");
    }

    const roleIds = roleNames.map((r) => "role-" + r).filter((id) => this.roles.has(id));

    const user: User = {
      id: this.generateId("user"),
      email,
      displayName,
      tenantId,
      roleIds,
      customPermissions: [],
      status: "active",
      lastLogin: null,
      createdAt: new Date(),
      apiKeys: [],
    };

    this.users.set(user.id, user);
    this.save();
    this.addAuditLog(user.id, "user.created", "user", user.id, { email, displayName, roles: roleNames });
    return user;
  }

  updateUser(userId: string, updates: Partial<Pick<User, "displayName" | "status">>): User | null {
    const user = this.users.get(userId);
    if (!user) return null;

    Object.assign(user, updates);
    this.save();
    this.addAuditLog(userId, "user.updated", "user", userId, updates);
    return user;
  }

  updateUserRoles(userId: string, roleIds: string[]): boolean {
    const user = this.users.get(userId);
    if (!user) return false;

    user.roleIds = roleIds.filter((id) => this.roles.has(id));
    this.save();
    this.addAuditLog(userId, "user.roles_updated", "user", userId, { roleIds });
    return true;
  }

  addCustomPermission(userId: string, permission: Permission): boolean {
    const user = this.users.get(userId);
    if (!user) return false;

    if (!user.customPermissions.includes(permission)) {
      user.customPermissions.push(permission);
      this.save();
      this.addAuditLog(userId, "user.permission_added", "user", userId, { permission });
    }
    return true;
  }

  removeCustomPermission(userId: string, permission: Permission): boolean {
    const user = this.users.get(userId);
    if (!user) return false;

    user.customPermissions = user.customPermissions.filter((p) => p !== permission);
    this.save();
    this.addAuditLog(userId, "user.permission_removed", "user", userId, { permission });
    return true;
  }

  // API Key Management
  createApiKey(userId: string, name: string, permissions: Permission[], expiresInDays?: number): { apiKey: ApiKey; plainKey: string } | null {
    const user = this.users.get(userId);
    if (!user) return null;

    // Generate API key
    const plainKey = "esc_" + Buffer.from(Math.random().toString(36) + Date.now().toString(36)).toString("base64url").slice(0, 32);
    const keyHash = Buffer.from(plainKey).toString('base64');
    const prefix = plainKey.slice(0, 8) + "...";

    const apiKey: ApiKey = {
      id: this.generateId("key"),
      name,
      keyHash,
      prefix,
      permissions,
      expiresAt: expiresInDays ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) : null,
      lastUsed: null,
      createdAt: new Date(),
    };

    if (!user.apiKeys) user.apiKeys = [];
    user.apiKeys.push(apiKey);
    this.save();
    this.addAuditLog(userId, "api_key.created", "api_key", apiKey.id, { name, permissions });

    return { apiKey, plainKey };
  }

  validateApiKey(key: string): { user: User; permissions: Permission[] } | null {
    const keyHash = Buffer.from(key).toString('base64');
    
    for (const user of this.users.values()) {
      if (!user.apiKeys) continue;
      
      for (const apiKey of user.apiKeys) {
        if (apiKey.keyHash === keyHash) {
          // Check expiration
          if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
            return null;
          }
          
          // Update last used
          apiKey.lastUsed = new Date();
          this.save();
          
          return { user, permissions: apiKey.permissions };
        }
      }
    }
    
    return null;
  }

  revokeApiKey(userId: string, keyId: string): boolean {
    const user = this.users.get(userId);
    if (!user || !user.apiKeys) return false;

    const index = user.apiKeys.findIndex(k => k.id === keyId);
    if (index < 0) return false;

    user.apiKeys.splice(index, 1);
    this.save();
    this.addAuditLog(userId, "api_key.revoked", "api_key", keyId);
    return true;
  }

  // Access Control
  getAccessContext(userId: string): AccessContext | null {
    const user = this.users.get(userId);
    if (!user || user.status !== "active") return null;

    const tenant = this.tenants.get(user.tenantId);
    if (!tenant || tenant.status !== "active") return null;

    const roles = user.roleIds
      .map((id) => this.roles.get(id))
      .filter((r): r is Role => r !== undefined);

    const permissions = new Set<Permission>();

    for (const role of roles) {
      for (const perm of role.permissions) {
        permissions.add(perm);
      }
    }

    for (const perm of user.customPermissions) {
      permissions.add(perm);
    }

    return {
      userId,
      tenantId: user.tenantId,
      roles,
      permissions,
      tenant,
    };
  }

  hasPermission(context: AccessContext, permission: Permission): boolean {
    if (context.permissions.has("admin:all")) return true;
    return context.permissions.has(permission);
  }

  hasAnyPermission(context: AccessContext, permissions: Permission[]): boolean {
    if (context.permissions.has("admin:all")) return true;
    return permissions.some((p) => context.permissions.has(p));
  }

  hasAllPermissions(context: AccessContext, permissions: Permission[]): boolean {
    if (context.permissions.has("admin:all")) return true;
    return permissions.every((p) => context.permissions.has(p));
  }

  // IP Access Control
  isIpAllowed(tenantId: string, ipAddress: string): boolean {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) return false;

    // Check blacklist first
    if (tenant.settings.ipBlacklist.length > 0) {
      if (this.isIpInList(ipAddress, tenant.settings.ipBlacklist)) {
        return false;
      }
    }

    // If whitelist is empty, allow all (except blacklisted)
    if (tenant.settings.ipWhitelist.length === 0) {
      return true;
    }

    return this.isIpInList(ipAddress, tenant.settings.ipWhitelist);
  }

  private isIpInList(ip: string, list: string[]): boolean {
    for (const item of list) {
      if (item === ip) return true;
      // Simple CIDR matching for /24 and /16
      if (item.includes("/")) {
        const [base, bits] = item.split("/");
        const mask = parseInt(bits);
        const ipParts = ip.split(".").map(Number);
        const baseParts = base.split(".").map(Number);
        
        if (mask === 24 && ipParts.slice(0, 3).join(".") === baseParts.slice(0, 3).join(".")) return true;
        if (mask === 16 && ipParts.slice(0, 2).join(".") === baseParts.slice(0, 2).join(".")) return true;
      }
    }
    return false;
  }

  // Quota Management
  checkQuota(tenantId: string, type: keyof TenantQuotas): { ok: boolean; current: number; limit: number } {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) return { ok: false, current: 0, limit: 0 };

    const limit = tenant.quotas[type];
    if (limit === -1) return { ok: true, current: 0, limit: -1 };

    let current = 0;
    switch (type) {
      case "maxUsers":
        current = this.getTenantUsers(tenantId).length;
        break;
      case "maxTenants":
        current = this.tenants.size;
        break;
      default:
        current = 0;
    }

    return { ok: current < limit, current, limit };
  }

  // Audit Logging
  addAuditLog(
    userId: string,
    action: string,
    resource: string,
    resourceId?: string,
    details?: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string,
    success: boolean = true
  ): void {
    const user = this.users.get(userId);
    
    const entry: AuditLogEntry = {
      id: this.generateId("audit"),
      timestamp: new Date(),
      userId,
      tenantId: user?.tenantId ?? "system",
      action,
      resource,
      resourceId,
      details,
      ipAddress,
      userAgent,
      success,
    };

    this.auditLogs.push(entry);

    // Keep only the last N logs
    if (this.auditLogs.length > this.maxAuditLogs) {
      this.auditLogs = this.auditLogs.slice(-this.maxAuditLogs);
    }

    this.save();
  }

  getAuditLogs(filter?: {
    tenantId?: string;
    userId?: string;
    action?: string;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): AuditLogEntry[] {
    let logs = [...this.auditLogs];

    if (filter) {
      if (filter.tenantId) {
        logs = logs.filter(l => l.tenantId === filter.tenantId);
      }
      if (filter.userId) {
        logs = logs.filter(l => l.userId === filter.userId);
      }
      if (filter.action) {
        logs = logs.filter(l => l.action.includes(filter.action!));
      }
      if (filter.resource) {
        logs = logs.filter(l => l.resource === filter.resource);
      }
      if (filter.startDate) {
        logs = logs.filter(l => l.timestamp >= filter.startDate!);
      }
      if (filter.endDate) {
        logs = logs.filter(l => l.timestamp <= filter.endDate!);
      }
    }

    if (filter?.limit) {
      logs = logs.slice(-filter.limit);
    }

    return logs;
  }

  // Custom Role Management
  createCustomRole(
    tenantId: string,
    name: string,
    displayName: string,
    description: string,
    permissions: Permission[]
  ): Role | null {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) return null;

    const role: Role = {
      id: this.generateId("role"),
      name: "custom",
      displayName,
      description,
      permissions,
      isSystem: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.roles.set(role.id, role);
    this.save();
    this.addAuditLog("system", "role.created", "role", role.id, { name, displayName, permissions });
    return role;
  }

  deleteCustomRole(roleId: string): boolean {
    const role = this.roles.get(roleId);
    if (!role || role.isSystem) return false;

    // Remove role from all users
    for (const user of this.users.values()) {
      user.roleIds = user.roleIds.filter(id => id !== roleId);
    }

    this.roles.delete(roleId);
    this.save();
    this.addAuditLog("system", "role.deleted", "role", roleId);
    return true;
  }

  // Getters
  getTenant(tenantId: string): Tenant | undefined {
    return this.tenants.get(tenantId);
  }

  getUser(userId: string): User | undefined {
    return this.users.get(userId);
  }

  getUserByEmail(email: string): User | undefined {
    return Array.from(this.users.values()).find(u => u.email === email);
  }

  getRole(roleId: string): Role | undefined {
    return this.roles.get(roleId);
  }

  getAllRoles(): Role[] {
    return Array.from(this.roles.values());
  }

  getTenantRoles(tenantId: string): Role[] {
    // System roles are available to all tenants
    const systemRoles = Array.from(this.roles.values()).filter(r => r.isSystem);
    // Custom roles specific to tenant would be filtered here
    return systemRoles;
  }

  getTenantUsers(tenantId: string): User[] {
    return Array.from(this.users.values()).filter((u) => u.tenantId === tenantId);
  }

  getAllTenants(): Tenant[] {
    return Array.from(this.tenants.values());
  }

  // User Status Management
  disableUser(userId: string): boolean {
    const user = this.users.get(userId);
    if (!user) return false;

    user.status = "disabled";
    this.save();
    this.addAuditLog(userId, "user.disabled", "user", userId);
    return true;
  }

  activateUser(userId: string): boolean {
    const user = this.users.get(userId);
    if (!user) return false;

    user.status = "active";
    this.save();
    this.addAuditLog(userId, "user.activated", "user", userId);
    return true;
  }

  recordLogin(userId: string): boolean {
    const user = this.users.get(userId);
    if (!user) return false;

    user.lastLogin = new Date();
    this.save();
    return true;
  }

  suspendTenant(tenantId: string): boolean {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) return false;

    tenant.status = "suspended";
    
    for (const user of this.users.values()) {
      if (user.tenantId === tenantId) {
        user.status = "suspended";
      }
    }

    this.save();
    this.addAuditLog("system", "tenant.suspended", "tenant", tenantId);
    return true;
  }

  activateTenant(tenantId: string): boolean {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) return false;

    tenant.status = "active";
    
    for (const user of this.users.values()) {
      if (user.tenantId === tenantId && user.status === "suspended") {
        user.status = "active";
      }
    }

    this.save();
    this.addAuditLog("system", "tenant.activated", "tenant", tenantId);
    return true;
  }

  // Statistics
  getStats(): {
    tenants: number;
    users: number;
    roles: number;
    auditLogs: number;
  } {
    return {
      tenants: this.tenants.size,
      users: this.users.size,
      roles: this.roles.size,
      auditLogs: this.auditLogs.length,
    };
  }
}

export { RBACManager };

// Singleton instance
let defaultManager: RBACManager | null = null;

export function getRBACManager(options?: { dataDir?: string; autoSave?: boolean }): RBACManager {
  if (!defaultManager) {
    defaultManager = new RBACManager(options);
  }
  return defaultManager;
}

export function initRBACManager(options?: { dataDir?: string; autoSave?: boolean }): RBACManager {
  defaultManager = new RBACManager(options);
  return defaultManager;
}
