export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'execute' | 'admin';

export interface Permission {
  resource: string;
  action: PermissionAction | '*';
  conditions?: PermissionCondition[];
}

export interface PermissionCondition {
  field: string;
  operator: 'equals' | 'notEquals' | 'in' | 'notIn' | 'contains' | 'startsWith' | 'endsWith';
  value: unknown;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  inherits?: string[];
  metadata?: Record<string, unknown>;
}

export interface UserRoleAssignment {
  userId: string;
  roleId: string;
  tenantId?: string;
  assignedAt: Date;
  assignedBy: string;
  expiresAt?: Date;
}

export interface PermissionCheckResult {
  allowed: boolean;
  reason: string;
  matchedPermissions: Permission[];
  deniedBy?: string;
}
