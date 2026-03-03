export interface MetasploitConfig {
  host: string;
  port: number;
  token?: string;
  ssl?: boolean;
  verifySSL?: boolean;
}

export interface MetasploitModule {
  name: string;
  type: "exploit" | "auxiliary" | "payload" | "encoder" | "nop";
  description?: string;
  references?: string[];
}

export interface MetasploitSession {
  id: number;
  type: string;
  tunnelLocal?: string;
  tunnelPeer?: string;
  exploitUuid?: string;
  workspace?: string;
  targetHost?: string;
}

export interface MetasploitJob {
  id: number;
  name: string;
  startTime?: string;
  status?: string;
}

export interface MetasploitResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export class MetasploitClient {
  private config: MetasploitConfig;
  private baseUrl: string;
  private token: string;

  constructor(config: MetasploitConfig) {
    this.config = config;
    this.baseUrl = `${config.ssl !== false ? "https" : "http"}://${config.host}:${config.port}/api`;
    this.token = config.token ?? "";
  }

  async login(password: string): Promise<boolean> {
    try {
      const response = await this.request("POST", "/login", {
        username: "msf",
        password,
      });

      if (response.success && response.data) {
        const data = response.data as { "temporary-token"?: string };
        if (data["temporary-token"]) {
          this.token = data["temporary-token"];
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  async logout(): Promise<void> {
    await this.request("POST", "/logout", {});
    this.token = "";
  }

  async getVersion(): Promise<string | null> {
    const response = await this.request("GET", "/version", {});
    return response.success ? ((response.data as { version?: string })?.version ?? null) : null;
  }

  async listModules(type?: string): Promise<MetasploitModule[]> {
    const endpoint = type ? `/modules?module_type=${type}` : "/modules";
    const response = await this.request("GET", endpoint, {});

    if (response.success && response.data) {
      const data = response.data as { modules?: Record<string, unknown> };
      if (data.modules) {
        return Object.entries(data.modules).map(([name, info]) => ({
          name,
          type: (info as { type?: string })?.type as MetasploitModule["type"] ?? "auxiliary",
          description: (info as { description?: string })?.description,
        }));
      }
    }
    return [];
  }

  async getModuleInfo(moduleName: string): Promise<Record<string, unknown> | null> {
    const response = await this.request("GET", `/modules/${encodeURIComponent(moduleName)}`, {});
    return response.success ? (response.data as Record<string, unknown>) : null;
  }

  async executeModule(moduleName: string, options: Record<string, unknown>): Promise<MetasploitResult> {
    const response = await this.request("POST", `/modules/${encodeURIComponent(moduleName)}/execute`, options);
    return response;
  }

  async listSessions(): Promise<MetasploitSession[]> {
    const response = await this.request("GET", "/sessions", {});

    if (response.success && response.data) {
      const data = response.data as { sessions?: Record<string, unknown> };
      if (data.sessions) {
        return Object.entries(data.sessions).map(([id, info]) => ({
          id: parseInt(id, 10),
          ...(info as Omit<MetasploitSession, "id">),
        }));
      }
    }
    return [];
  }

  async getSessionCommands(sessionId: number): Promise<string[]> {
    const response = await this.request("GET", `/sessions/${sessionId}/commands`, {});
    return response.success ? ((response.data as { commands?: string[] })?.commands ?? []) : [];
  }

  async executeSessionCommand(sessionId: number, command: string): Promise<MetasploitResult> {
    const response = await this.request("POST", `/sessions/${sessionId}/commands`, { command });
    return response;
  }

  async shellSession(sessionId: number, command: string): Promise<string | null> {
    const response = await this.request("POST", `/sessions/${sessionId}/shell`, { command });
    return response.success ? ((response.data as { output?: string })?.output ?? null) : null;
  }

  async stopSession(sessionId: number): Promise<boolean> {
    const response = await this.request("DELETE", `/sessions/${sessionId}`, {});
    return response.success;
  }

  async listJobs(): Promise<MetasploitJob[]> {
    const response = await this.request("GET", "/jobs", {});

    if (response.success && response.data) {
      const data = response.data as { jobs?: Record<string, unknown> };
      if (data.jobs) {
        return Object.entries(data.jobs).map(([id, info]) => ({
          id: parseInt(id, 10),
          ...(info as Omit<MetasploitJob, "id">),
        }));
      }
    }
    return [];
  }

  async stopJob(jobId: number): Promise<boolean> {
    const response = await this.request("DELETE", `/jobs/${jobId}`, {});
    return response.success;
  }

  async createWorkspace(name: string): Promise<boolean> {
    const response = await this.request("POST", "/workspaces", { name });
    return response.success;
  }

  async listWorkspaces(): Promise<string[]> {
    const response = await this.request("GET", "/workspaces", {});

    if (response.success && response.data) {
      const data = response.data as { workspaces?: Array<{ name: string }> };
      return data.workspaces?.map((w) => w.name) ?? [];
    }
    return [];
  }

  async getHosts(workspace?: string): Promise<Array<Record<string, unknown>>> {
    const endpoint = workspace ? `/hosts?workspace=${workspace}` : "/hosts";
    const response = await this.request("GET", endpoint, {});
    return response.success ? ((response.data as { hosts?: Array<Record<string, unknown>> })?.hosts ?? []) : [];
  }

  async getServices(workspace?: string): Promise<Array<Record<string, unknown>>> {
    const endpoint = workspace ? `/services?workspace=${workspace}` : "/services";
    const response = await this.request("GET", endpoint, {});
    return response.success ? ((response.data as { services?: Array<Record<string, unknown>> })?.services ?? []) : [];
  }

  async getVulns(workspace?: string): Promise<Array<Record<string, unknown>>> {
    const endpoint = workspace ? `/vulns?workspace=${workspace}` : "/vulns";
    const response = await this.request("GET", endpoint, {});
    return response.success ? ((response.data as { vulns?: Array<Record<string, unknown>> })?.vulns ?? []) : [];
  }

  private async request(method: string, endpoint: string, body?: unknown): Promise<MetasploitResult> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
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

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

export function createMetasploitClient(config: MetasploitConfig): MetasploitClient {
  return new MetasploitClient(config);
}
