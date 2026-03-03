/**
 * Enterprise Security Commander API Client
 * Connect frontend to gateway backend
 */

export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  headers?: Record<string, string>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Auth Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
  expiresAt: string;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  tenantId: string;
  roleIds: string[];
  status: "active" | "disabled" | "suspended";
  lastLogin: string | null;
}

// Role Types
export interface Role {
  id: string;
  name: string;
  displayName: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
}

// Tenant Types
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: "free" | "starter" | "professional" | "enterprise";
  status: "active" | "suspended" | "deleted";
  settings: TenantSettings;
}

export interface TenantSettings {
  dataRetentionDays: number;
  maxSessionDuration: number;
  requireMfa: boolean;
  allowedIpRanges: string[];
  ssoEnabled: boolean;
}

// Session Types
export interface Session {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  status: "active" | "paused" | "completed";
}

// Attack Simulation Types
export interface AttackRequest {
  target: string;
  type: "network" | "web" | "social" | "cloud" | "auto";
  dryRun?: boolean;
}

export interface AttackResult {
  target: string;
  attackType: string;
  duration: number;
  summary: {
    totalTests: number;
    successful: number;
    detected: number;
    vulnerabilitiesFound: number;
  };
  findings: Array<{
    technique: string;
    phase: string;
    status: "success" | "detected" | "failed";
    details: string;
    severity: "critical" | "high" | "medium" | "low";
  }>;
  recommendations: string[];
}

// Defense Analysis Types
export interface DefenseRequest {
  target: string;
  type: "vulnerability" | "configuration" | "threat" | "comprehensive";
}

export interface DefenseResult {
  target: string;
  scanType: string;
  duration: number;
  summary: {
    riskScore: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  findings: Array<{
    title: string;
    category: string;
    severity: "critical" | "high" | "medium" | "low";
    description: string;
    recommendation: string;
  }>;
  compliance: Array<{
    framework: string;
    score: number;
    gaps: number;
  }>;
}

// Compliance Audit Types
export interface AuditRequest {
  framework: string;
  domain?: string;
}

export interface AuditResult {
  framework: string;
  timestamp: string;
  summary: {
    overallScore: number;
    complianceRate: number;
    totalControls: number;
    compliant: number;
    partiallyCompliant: number;
    nonCompliant: number;
  };
  domainResults: Array<{
    domain: string;
    score: number;
    gaps: number;
    status: "compliant" | "partial" | "non_compliant";
  }>;
  criticalGaps: Array<{
    controlId: string;
    controlName: string;
    severity: "critical" | "high" | "medium";
    description: string;
    recommendation: string;
  }>;
  timeline: Array<{
    date: string;
    action: string;
    priority: string;
  }>;
}

// Knowledge Types
export interface MITRETactic {
  id: string;
  name: string;
  description: string;
}

export interface MITRETechnique {
  id: string;
  name: string;
  tacticId: string;
  description: string;
  detection: string;
  mitigations: string[];
}

export interface SCFDomain {
  id: string;
  code: string;
  name: string;
  description: string;
  controlCount: number;
}

// Risk Types
export interface RiskScore {
  overall: number;
  attackSurface: number;
  vulnerabilities: number;
  threats: number;
  compliance: number;
}

// Stats Types
export interface SystemStats {
  sessions: number;
  attacks: number;
  defenses: number;
  audits: number;
  activeUsers: number;
  threatsDetected: number;
}

class ApiClient {
  private config: ApiConfig;
  private token: string | null = null;

  constructor(config: ApiConfig) {
    this.config = config;
  }

  setToken(token: string | null): void {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...this.config.headers,
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: AbortSignal.timeout(this.config.timeout),
      });

      const data = await response.json() as T;

      if (!response.ok) {
        return {
          success: false,
          error: (data as Record<string, unknown>)?.error as string || `HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Network error",
      };
    }
  }

  // Auth
  async login(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    return this.request<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  }

  async logout(): Promise<ApiResponse<void>> {
    return this.request<void>("/api/auth/logout", {
      method: "POST",
    });
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    return this.request<User>("/api/auth/me");
  }

  // Users
  async getUsers(): Promise<ApiResponse<User[]>> {
    return this.request<User[]>("/api/users");
  }

  async createUser(user: Partial<User>): Promise<ApiResponse<User>> {
    return this.request<User>("/api/users", {
      method: "POST",
      body: JSON.stringify(user),
    });
  }

  async updateUser(id: string, user: Partial<User>): Promise<ApiResponse<User>> {
    return this.request<User>(`/api/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(user),
    });
  }

  async deleteUser(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/api/users/${id}`, {
      method: "DELETE",
    });
  }

  // Roles
  async getRoles(): Promise<ApiResponse<Role[]>> {
    return this.request<Role[]>("/api/roles");
  }

  // Tenants
  async getTenants(): Promise<ApiResponse<Tenant[]>> {
    return this.request<Tenant[]>("/api/tenants");
  }

  async getTenant(id: string): Promise<ApiResponse<Tenant>> {
    return this.request<Tenant>(`/api/tenants/${id}`);
  }

  // Sessions
  async getSessions(): Promise<ApiResponse<Session[]>> {
    return this.request<Session[]>("/api/sessions");
  }

  async getSession(id: string): Promise<ApiResponse<Session>> {
    return this.request<Session>(`/api/sessions/${id}`);
  }

  async createSession(name: string): Promise<ApiResponse<Session>> {
    return this.request<Session>("/api/sessions", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  }

  async deleteSession(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/api/sessions/${id}`, {
      method: "DELETE",
    });
  }

  // Attack Simulation
  async runAttack(request: AttackRequest): Promise<ApiResponse<AttackResult>> {
    return this.request<AttackResult>("/api/attack", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async getAttackHistory(): Promise<ApiResponse<AttackResult[]>> {
    return this.request<AttackResult[]>("/api/attack/history");
  }

  // Defense Analysis
  async runDefense(request: DefenseRequest): Promise<ApiResponse<DefenseResult>> {
    return this.request<DefenseResult>("/api/defense", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async getDefenseHistory(): Promise<ApiResponse<DefenseResult[]>> {
    return this.request<DefenseResult[]>("/api/defense/history");
  }

  // Compliance Audit
  async runAudit(request: AuditRequest): Promise<ApiResponse<AuditResult>> {
    return this.request<AuditResult>("/api/audit", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async getAuditHistory(): Promise<ApiResponse<AuditResult[]>> {
    return this.request<AuditResult[]>("/api/audit/history");
  }

  // Knowledge - MITRE
  async getTactics(): Promise<ApiResponse<MITRETactic[]>> {
    return this.request<MITRETactic[]>("/api/knowledge/mitre/tactics");
  }

  async getTechniques(tacticId?: string): Promise<ApiResponse<MITRETechnique[]>> {
    const query = tacticId ? `?tactic=${tacticId}` : "";
    return this.request<MITRETechnique[]>(`/api/knowledge/mitre/techniques${query}`);
  }

  async searchTechniques(query: string): Promise<ApiResponse<MITRETechnique[]>> {
    return this.request<MITRETechnique[]>(`/api/knowledge/mitre/search?q=${encodeURIComponent(query)}`);
  }

  // Knowledge - SCF
  async getSCFDomains(): Promise<ApiResponse<SCFDomain[]>> {
    return this.request<SCFDomain[]>("/api/knowledge/scf/domains");
  }

  async getSCFControls(domainId?: string): Promise<ApiResponse<any[]>> {
    const query = domainId ? `?domain=${domainId}` : "";
    return this.request<any[]>(`/api/knowledge/scf/controls${query}`);
  }

  // Risk
  async getRiskScore(): Promise<ApiResponse<RiskScore>> {
    return this.request<RiskScore>("/api/risk/score");
  }

  // Stats
  async getSystemStats(): Promise<ApiResponse<SystemStats>> {
    return this.request<SystemStats>("/api/stats");
  }

  // Health
  async healthCheck(): Promise<ApiResponse<{ status: string; version: string }>> {
    return this.request<{ status: string; version: string }>("/api/health");
  }
}

// Create singleton instance
let apiClient: ApiClient | null = null;

export function initApiClient(config: ApiConfig): ApiClient {
  apiClient = new ApiClient(config);
  return apiClient;
}

export function getApiClient(): ApiClient {
  if (!apiClient) {
    // Default config for development
    apiClient = new ApiClient({
      baseUrl: import.meta.env.VITE_API_URL || "http://localhost:3000",
      timeout: 30000,
    });
  }
  return apiClient;
}

export { ApiClient };
export default ApiClient;
