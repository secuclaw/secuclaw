import type {
  Permission,
  Role,
  UserRoleAssignment,
  PermissionCheckResult,
  PermissionAction,
  PermissionCondition,
} from './types.js';

export class RBACManager {
  private roles: Map<string, Role> = new Map();
  private assignments: Map<string, UserRoleAssignment[]> = new Map();
  private permissionCache: Map<string, PermissionCheckResult> = new Map();

  constructor() {
    this.initializeDefaultRoles();
  }

  private initializeDefaultRoles(): void {
    const defaultRoles: Role[] = [
      {
        id: 'super_admin',
        name: 'Super Administrator',
        description: 'Full system access',
        permissions: [{ resource: '*', action: '*' }],
      },
      {
        id: 'security_commander',
        name: 'Security Commander',
        description: '全域安全指挥官 - 全角色能力',
        permissions: [
          { resource: 'threat', action: '*' },
          { resource: 'vulnerability', action: '*' },
          { resource: 'incident', action: '*' },
          { resource: 'tool', action: '*' },
          { resource: 'session', action: '*' },
          { resource: 'compliance', action: '*' },
          { resource: 'knowledge', action: '*' },
          { resource: 'report', action: '*' },
          { resource: 'audit', action: '*' },
        ],
      },
      {
        id: 'security_expert',
        name: 'Security Expert',
        description: '安全专家 - 完整攻防能力',
        permissions: [
          { resource: 'threat', action: '*' },
          { resource: 'vulnerability', action: '*' },
          { resource: 'incident', action: '*' },
          { resource: 'tool', action: 'execute' },
          { resource: 'tool', action: 'read' },
          { resource: 'session', action: 'read' },
          { resource: 'session', action: 'create' },
          { resource: 'knowledge', action: 'read' },
        ],
      },
      {
        id: 'privacy_officer',
        name: 'Privacy Security Officer',
        description: '隐私安全官 - SEC+LEG',
        permissions: [
          { resource: 'threat', action: 'read' },
          { resource: 'compliance', action: '*' },
          { resource: 'audit', action: '*' },
          { resource: 'knowledge', action: 'read' },
          { resource: 'session', action: 'read' },
          { resource: 'report', action: '*' },
        ],
        inherits: ['security_expert'],
      },
      {
        id: 'security_architect',
        name: 'Security Architect',
        description: '安全架构师 - SEC+IT',
        permissions: [
          { resource: 'threat', action: '*' },
          { resource: 'vulnerability', action: '*' },
          { resource: 'tool', action: '*' },
          { resource: 'session', action: '*' },
          { resource: 'knowledge', action: '*' },
        ],
        inherits: ['security_expert'],
      },
      {
        id: 'business_security',
        name: 'Business Security Officer',
        description: '业务安全官 - SEC+BIZ',
        permissions: [
          { resource: 'threat', action: 'read' },
          { resource: 'incident', action: 'read' },
          { resource: 'compliance', action: 'read' },
          { resource: 'report', action: '*' },
          { resource: 'knowledge', action: 'read' },
        ],
        inherits: ['security_expert'],
      },
      {
        id: 'analyst',
        name: 'Security Analyst',
        description: '安全分析师',
        permissions: [
          { resource: 'threat', action: 'read' },
          { resource: 'threat', action: 'create' },
          { resource: 'vulnerability', action: 'read' },
          { resource: 'incident', action: 'read' },
          { resource: 'tool', action: 'execute' },
          { resource: 'knowledge', action: 'read' },
        ],
      },
      {
        id: 'compliance_officer',
        name: 'Compliance Officer',
        description: '合规审计官',
        permissions: [
          { resource: 'compliance', action: '*' },
          { resource: 'audit', action: '*' },
          { resource: 'report', action: '*' },
          { resource: 'knowledge', action: 'read' },
          { resource: 'session', action: 'read' },
        ],
      },
      {
        id: 'viewer',
        name: 'Viewer',
        description: '只读访问',
        permissions: [
          { resource: 'threat', action: 'read' },
          { resource: 'vulnerability', action: 'read' },
          { resource: 'incident', action: 'read' },
          { resource: 'knowledge', action: 'read' },
          { resource: 'report', action: 'read' },
        ],
      },
    ];

    for (const role of defaultRoles) {
      this.roles.set(role.id, role);
    }
  }

  createRole(role: Role): void {
    this.roles.set(role.id, role);
    this.permissionCache.clear();
  }

  updateRole(roleId: string, updates: Partial<Role>): boolean {
    const role = this.roles.get(roleId);
    if (!role) return false;

    this.roles.set(roleId, { ...role, ...updates });
    this.permissionCache.clear();
    return true;
  }

  deleteRole(roleId: string): boolean {
    if (roleId === 'super_admin') return false;
    const deleted = this.roles.delete(roleId);
    if (deleted) {
      this.permissionCache.clear();
    }
    return deleted;
  }

  getRole(roleId: string): Role | undefined {
    return this.roles.get(roleId);
  }

  listRoles(): Role[] {
    return Array.from(this.roles.values());
  }

  assignRole(
    userId: string,
    roleId: string,
    assignedBy: string,
    tenantId?: string,
    expiresAt?: Date
  ): UserRoleAssignment {
    if (!this.roles.has(roleId)) {
      throw new Error(`Role not found: ${roleId}`);
    }

    const assignment: UserRoleAssignment = {
      userId,
      roleId,
      tenantId,
      assignedAt: new Date(),
      assignedBy,
      expiresAt,
    };

    if (!this.assignments.has(userId)) {
      this.assignments.set(userId, []);
    }
    this.assignments.get(userId)!.push(assignment);
    this.permissionCache.clear();

    return assignment;
  }

  revokeRole(userId: string, roleId: string): boolean {
    const assignments = this.assignments.get(userId);
    if (!assignments) return false;

    const index = assignments.findIndex(a => a.roleId === roleId);
    if (index === -1) return false;

    assignments.splice(index, 1);
    this.permissionCache.clear();
    return true;
  }

  getUserRoles(userId: string): Role[] {
    const assignments = this.assignments.get(userId) ?? [];
    const now = new Date();

    const validAssignments = assignments.filter(a => {
      if (a.expiresAt && a.expiresAt < now) return false;
      return true;
    });

    const roles: Role[] = [];
    const seen = new Set<string>();

    for (const assignment of validAssignments) {
      this.collectRoles(assignment.roleId, roles, seen);
    }

    return roles;
  }

  private collectRoles(roleId: string, roles: Role[], seen: Set<string>): void {
    if (seen.has(roleId)) return;

    const role = this.roles.get(roleId);
    if (!role) return;

    seen.add(roleId);
    roles.push(role);

    if (role.inherits) {
      for (const inheritedId of role.inherits) {
        this.collectRoles(inheritedId, roles, seen);
      }
    }
  }

  getUserPermissions(userId: string): Permission[] {
    const roles = this.getUserRoles(userId);
    const permissions: Permission[] = [];

    for (const role of roles) {
      permissions.push(...role.permissions);
    }

    return permissions;
  }

  checkPermission(
    userId: string,
    resource: string,
    action: PermissionAction,
    context?: Record<string, unknown>
  ): PermissionCheckResult {
    const cacheKey = `${userId}:${resource}:${action}:${JSON.stringify(context ?? {})}`;
    const cached = this.permissionCache.get(cacheKey);
    if (cached) return cached;

    const permissions = this.getUserPermissions(userId);
    const matchedPermissions: Permission[] = [];

    for (const permission of permissions) {
      if (this.matchesPermission(permission, resource, action, context)) {
        matchedPermissions.push(permission);
      }
    }

    const result: PermissionCheckResult = {
      allowed: matchedPermissions.length > 0,
      reason: matchedPermissions.length > 0
        ? `Allowed by ${matchedPermissions.length} permission(s)`
        : `No permission found for ${resource}:${action}`,
      matchedPermissions,
    };

    this.permissionCache.set(cacheKey, result);
    return result;
  }

  private matchesPermission(
    permission: Permission,
    resource: string,
    action: PermissionAction,
    context?: Record<string, unknown>
  ): boolean {
    if (!this.matchesResource(permission.resource, resource)) {
      return false;
    }

    if (!this.matchesAction(permission.action, action)) {
      return false;
    }

    if (permission.conditions && context) {
      return this.matchesConditions(permission.conditions, context);
    }

    return true;
  }

  private matchesResource(pattern: string, resource: string): boolean {
    if (pattern === '*') return true;
    if (pattern === resource) return true;
    if (pattern.endsWith('*') && resource.startsWith(pattern.slice(0, -1))) return true;
    return false;
  }

  private matchesAction(pattern: PermissionAction | '*', action: PermissionAction): boolean {
    if (pattern === '*') return true;
    if (pattern === 'admin' && action !== 'admin') return true;
    return pattern === action;
  }

  private matchesConditions(conditions: PermissionCondition[], context: Record<string, unknown>): boolean {
    for (const condition of conditions) {
      const value = context[condition.field];

      switch (condition.operator) {
        case 'equals':
          if (value !== condition.value) return false;
          break;
        case 'notEquals':
          if (value === condition.value) return false;
          break;
        case 'in':
          if (!Array.isArray(condition.value) || !condition.value.includes(value)) return false;
          break;
        case 'notIn':
          if (Array.isArray(condition.value) && condition.value.includes(value)) return false;
          break;
        case 'contains':
          if (typeof value !== 'string' || !value.includes(condition.value as string)) return false;
          break;
        case 'startsWith':
          if (typeof value !== 'string' || !value.startsWith(condition.value as string)) return false;
          break;
        case 'endsWith':
          if (typeof value !== 'string' || !value.endsWith(condition.value as string)) return false;
          break;
      }
    }

    return true;
  }

  requirePermission(
    userId: string,
    resource: string,
    action: PermissionAction,
    context?: Record<string, unknown>
  ): void {
    const result = this.checkPermission(userId, resource, action, context);
    if (!result.allowed) {
      throw new Error(`Permission denied: ${resource}:${action}. ${result.reason}`);
    }
  }

  getRoleAssignments(roleId?: string): UserRoleAssignment[] {
    const all: UserRoleAssignment[] = [];
    for (const assignments of this.assignments.values()) {
      for (const assignment of assignments) {
        if (!roleId || assignment.roleId === roleId) {
          all.push(assignment);
        }
      }
    }
    return all;
  }

  getUserAssignments(userId: string): UserRoleAssignment[] {
    return this.assignments.get(userId) ?? [];
  }

  clearCache(): void {
    this.permissionCache.clear();
  }
}

let defaultManager: RBACManager | null = null;

export function getRBACManager(): RBACManager {
  if (!defaultManager) {
    defaultManager = new RBACManager();
  }
  return defaultManager;
}

export function resetRBACManager(): void {
  defaultManager = null;
}
