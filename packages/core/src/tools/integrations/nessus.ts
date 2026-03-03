export interface NessusConfig {
  host: string;
  port: number;
  accessKey?: string;
  secretKey?: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  verifySSL?: boolean;
}

export interface NessusScan {
  id: number;
  uuid: string;
  name: string;
  type?: string;
  owner?: string;
  enabled?: boolean;
  folderId?: number;
  read?: boolean;
  status?: string;
  shared?: number;
  userPermissions?: number;
  creationDate?: number;
  lastModificationDate?: number;
}

export interface NessusScanResult {
  id: number;
  scanId: number;
  name: string;
  status: string;
  start_time?: string;
  end_time?: string;
  host_count?: number;
  vuln_count?: number;
  severity?: number;
}

export interface NessusVulnerability {
  pluginId: number;
  pluginName: string;
  pluginFamily?: string;
  severity: number;
  hosts: Array<{
    hostId: number;
    hostname: string;
    port: number;
    protocol: string;
    svc_name?: string;
  }>;
  description?: string;
  solution?: string;
  risk_factor?: string;
  cve?: string[];
}

export interface NessusPlugin {
  id: number;
  name: string;
  family?: string;
  description?: string;
  synopsis?: string;
  solution?: string;
  risk_factor?: string;
  cve?: string[];
  cvss_base_score?: number;
}

export interface NessusHost {
  hostId: number;
  hostname: string;
  progress?: string;
  critical?: number;
  high?: number;
  medium?: number;
  low?: number;
  info?: number;
}

export interface NessusPolicy {
  id: number;
  uuid: string;
  name: string;
  description?: string;
  owner?: string;
  visibility?: string;
  shared?: number;
  user_permissions?: number;
  lastModificationDate?: number;
  creationDate?: number;
}

export class NessusClient {
  private config: NessusConfig;
  private baseUrl: string;
  private token: string | null = null;

  constructor(config: NessusConfig) {
    this.config = config;
    this.baseUrl = `${config.ssl !== false ? "https" : "http"}://${config.host}:${config.port}`;
  }

  async login(): Promise<boolean> {
    if (this.config.accessKey && this.config.secretKey) {
      return true;
    }

    if (!this.config.username || !this.config.password) {
      return false;
    }

    try {
      const response = await this.request("POST", "/session", {
        username: this.config.username,
        password: this.config.password,
      });

      if (response.success && response.data) {
        this.token = (response.data as { token?: string })?.token ?? null;
        return !!this.token;
      }
      return false;
    } catch {
      return false;
    }
  }

  async logout(): Promise<void> {
    if (this.token) {
      await this.request("DELETE", "/session", {});
      this.token = null;
    }
  }

  async getServerStatus(): Promise<Record<string, unknown> | null> {
    const response = await this.request("GET", "/server/status", {});
    return response.success ? (response.data as Record<string, unknown>) : null;
  }

  async listScans(folderId?: number): Promise<NessusScan[]> {
    const endpoint = folderId ? `/scans?folder_id=${folderId}` : "/scans";
    const response = await this.request("GET", endpoint, {});

    if (response.success && response.data) {
      return ((response.data as { scans?: NessusScan[] }).scans ?? []) as NessusScan[];
    }
    return [];
  }

  async getScan(scanId: number): Promise<NessusScanResult | null> {
    const response = await this.request("GET", `/scans/${scanId}`, {});

    if (response.success && response.data) {
      const data = response.data as NessusScanResult & { info?: NessusScanResult };
      return {
        id: data.id,
        scanId: data.scanId ?? scanId,
        name: data.name ?? data.info?.name ?? "",
        status: data.status ?? data.info?.status ?? "unknown",
        start_time: data.start_time ?? data.info?.start_time,
        end_time: data.end_time ?? data.info?.end_time,
        host_count: data.host_count ?? data.info?.host_count ?? 0,
        vuln_count: data.vuln_count ?? data.info?.vuln_count ?? 0,
        severity: data.severity ?? data.info?.severity ?? 0,
      };
    }
    return null;
  }

  async createScan(name: string, targets: string, policyId: number, folderId?: number): Promise<number | null> {
    const body: Record<string, unknown> = {
      uuid: "0",
      settings: {
        name,
        text_targets: targets,
        policy_id: policyId,
      },
    };

    if (folderId) {
      (body.settings as Record<string, unknown>).folder_id = folderId;
    }

    const response = await this.request("POST", "/scans", body);

    if (response.success && response.data) {
      return (response.data as { scan?: { id?: number } }).scan?.id ?? null;
    }
    return null;
  }

  async launchScan(scanId: number): Promise<boolean> {
    const response = await this.request("POST", `/scans/${scanId}/launch`, {});
    return response.success;
  }

  async pauseScan(scanId: number): Promise<boolean> {
    const response = await this.request("POST", `/scans/${scanId}/pause`, {});
    return response.success;
  }

  async resumeScan(scanId: number): Promise<boolean> {
    const response = await this.request("POST", `/scans/${scanId}/resume`, {});
    return response.success;
  }

  async stopScan(scanId: number): Promise<boolean> {
    const response = await this.request("POST", `/scans/${scanId}/stop`, {});
    return response.success;
  }

  async deleteScan(scanId: number): Promise<boolean> {
    const response = await this.request("DELETE", `/scans/${scanId}`, {});
    return response.success;
  }

  async getScanHosts(scanId: number): Promise<NessusHost[]> {
    const response = await this.request("GET", `/scans/${scanId}`, {});

    if (response.success && response.data) {
      return ((response.data as { hosts?: NessusHost[] }).hosts ?? []) as NessusHost[];
    }
    return [];
  }

  async getScanHostDetails(scanId: number, hostId: number): Promise<Record<string, unknown> | null> {
    const response = await this.request("GET", `/scans/${scanId}/hosts/${hostId}`, {});
    return response.success ? (response.data as Record<string, unknown>) : null;
  }

  async getScanVulnerabilities(scanId: number): Promise<NessusVulnerability[]> {
    const response = await this.request("GET", `/scans/${scanId}`, {});

    if (response.success && response.data) {
      const vulns = (response.data as { vulnerabilities?: NessusVulnerability[] }).vulnerabilities ?? [];
      return vulns as NessusVulnerability[];
    }
    return [];
  }

  async getPluginDetails(pluginId: number): Promise<NessusPlugin | null> {
    const response = await this.request("GET", `/plugins/plugin/${pluginId}`, {});

    if (response.success && response.data) {
      return response.data as NessusPlugin;
    }
    return null;
  }

  async listPolicies(): Promise<NessusPolicy[]> {
    const response = await this.request("GET", "/policies", {});

    if (response.success && response.data) {
      return ((response.data as { policies?: NessusPolicy[] }).policies ?? []) as NessusPolicy[];
    }
    return [];
  }

  async exportScan(scanId: number, format: "nessus" | "html" | "pdf" | "csv" | "db"): Promise<string | null> {
    const response = await this.request("POST", `/scans/${scanId}/export`, { format });

    if (response.success && response.data) {
      return (response.data as { file?: string }).file ?? null;
    }
    return null;
  }

  async getExportStatus(scanId: number, fileId: string): Promise<string | null> {
    const response = await this.request("GET", `/scans/${scanId}/export/${fileId}/status`, {});

    if (response.success && response.data) {
      return (response.data as { status?: string }).status ?? null;
    }
    return null;
  }

  async downloadExport(scanId: number, fileId: string): Promise<string | null> {
    const response = await this.request("GET", `/scans/${scanId}/export/${fileId}/download`, {});

    if (response.success && response.data) {
      return typeof response.data === "string" ? response.data : JSON.stringify(response.data);
    }
    return null;
  }

  async listFolders(): Promise<Array<{ id: number; name: string; type?: string }>> {
    const response = await this.request("GET", "/folders", {});

    if (response.success && response.data) {
      return ((response.data as { folders?: Array<{ id: number; name: string; type?: string }> }).folders ?? []) as Array<{ id: number; name: string; type?: string }>;
    }
    return [];
  }

  private async request(method: string, endpoint: string, body?: unknown): Promise<{ success: boolean; data?: unknown; error?: string }> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.config.accessKey && this.config.secretKey) {
      headers["X-ApiKeys"] = `accessKey=${this.config.accessKey}; secretKey=${this.config.secretKey}`;
    } else if (this.token) {
      headers["X-Cookie"] = `token=${this.token}`;
    }

    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP error: ${response.status}`,
        };
      }

      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        const data = await response.json();
        return { success: true, data };
      }

      const text = await response.text();
      return { success: true, data: text };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

export function createNessusClient(config: NessusConfig): NessusClient {
  return new NessusClient(config);
}
