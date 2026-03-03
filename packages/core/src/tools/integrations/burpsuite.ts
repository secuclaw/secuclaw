export interface BurpSuiteConfig {
  baseUrl: string;
  apiKey?: string;
  proxyHost?: string;
  proxyPort?: number;
}

export interface BurpSuiteScan {
  scanId: number;
  name?: string;
  status: string;
  startTime?: string;
  endTime?: string;
  error?: string;
}

export interface BurpSuiteIssue {
  issueId: number;
  name: string;
  type?: string;
  severity: "high" | "medium" | "low" | "info";
  confidence: "certain" | "firm" | "tentative";
  host?: string;
  path?: string;
  location?: string;
  description?: string;
  remediation?: string;
  references?: string[];
}

export interface BurpSuiteSite {
  id: number;
  url: string;
  host: string;
  port: number;
  protocol: string;
  ssl?: boolean;
  issueCount?: number;
}

export interface BurpSuiteSiteMap {
  url: string;
  method?: string;
  statusCode?: number;
  mimeType?: string;
  title?: string;
  children?: BurpSuiteSiteMap[];
}

export interface BurpSuiteRequest {
  requestId: number;
  url: string;
  method: string;
  status: number;
  headers?: Record<string, string>;
  body?: string;
  response?: BurpSuiteResponse;
}

export interface BurpSuiteResponse {
  statusCode: number;
  headers?: Record<string, string>;
  body?: string;
  mimeType?: string;
}

export interface BurpSuiteProxyHistory {
  id: number;
  url: string;
  method: string;
  host: string;
  port: number;
  protocol: string;
  status: number;
  mimeType?: string;
  time?: string;
}

export interface BurpSuiteScanConfig {
  name: string;
  urls: string[];
  scope?: string[];
  excludedUrls?: string[];
  scanMode?: "fast" | "normal" | "thorough";
  crawlStrategy?: "standard" | "aggressive";
}

export class BurpSuiteClient {
  private config: BurpSuiteConfig;
  private baseUrl: string;

  constructor(config: BurpSuiteConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.config.apiKey) {
      headers["Authorization"] = `Bearer ${this.config.apiKey}`;
    }

    return headers;
  }

  async getVersion(): Promise<string | null> {
    const response = await this.request("GET", "/burp/version", {});

    return response.success ? ((response.data as { version?: string })?.version ?? null) : null;
  }

  async getScanStatus(scanId: number): Promise<BurpSuiteScan | null> {
    const response = await this.request("GET", `/burp/scanner/scans/${scanId}`, {});

    if (response.success && response.data) {
      return response.data as BurpSuiteScan;
    }
    return null;
  }

  async listScans(): Promise<BurpSuiteScan[]> {
    const response = await this.request("GET", "/burp/scanner/scans", {});

    if (response.success && response.data) {
      return ((response.data as { scans?: BurpSuiteScan[] }).scans ?? []) as BurpSuiteScan[];
    }
    return [];
  }

  async createScan(config: BurpSuiteScanConfig): Promise<number | null> {
    const response = await this.request("POST", "/burp/scanner/scans", {
      scan_configurations: [{ name: config.name }],
      urls: config.urls,
      scope: config.scope ?? { include: config.urls.map((u) => ({ rule: u })) },
    });

    if (response.success && response.data) {
      return (response.data as { scan_id?: number }).scan_id ?? null;
    }
    return null;
  }

  async startScan(urls: string[], scope?: string[]): Promise<number | null> {
    const body: Record<string, unknown> = { urls };

    if (scope) {
      body.scope = { include: scope.map((s) => ({ rule: s })) };
    }

    const response = await this.request("POST", "/burp/scanner/scans", body);

    if (response.success && response.data) {
      return (response.data as { scan_id?: number }).scan_id ?? null;
    }
    return null;
  }

  async pauseScan(scanId: number): Promise<boolean> {
    const response = await this.request("POST", `/burp/scanner/scans/${scanId}/pause`, {});
    return response.success;
  }

  async resumeScan(scanId: number): Promise<boolean> {
    const response = await this.request("POST", `/burp/scanner/scans/${scanId}/resume`, {});
    return response.success;
  }

  async cancelScan(scanId: number): Promise<boolean> {
    const response = await this.request("POST", `/burp/scanner/scans/${scanId}/cancel`, {});
    return response.success;
  }

  async deleteScan(scanId: number): Promise<boolean> {
    const response = await this.request("DELETE", `/burp/scanner/scans/${scanId}`, {});
    return response.success;
  }

  async getScanIssues(scanId: number): Promise<BurpSuiteIssue[]> {
    const response = await this.request("GET", `/burp/scanner/scans/${scanId}/issues`, {});

    if (response.success && response.data) {
      return ((response.data as { issues?: BurpSuiteIssue[] }).issues ?? []) as BurpSuiteIssue[];
    }
    return [];
  }

  async getAllIssues(): Promise<BurpSuiteIssue[]> {
    const response = await this.request("GET", "/burp/scanner/issues", {});

    if (response.success && response.data) {
      return ((response.data as { issues?: BurpSuiteIssue[] }).issues ?? []) as BurpSuiteIssue[];
    }
    return [];
  }

  async getIssueDetails(issueId: number): Promise<BurpSuiteIssue | null> {
    const response = await this.request("GET", `/burp/scanner/issues/${issueId}`, {});

    if (response.success && response.data) {
      return response.data as BurpSuiteIssue;
    }
    return null;
  }

  async listSites(): Promise<BurpSuiteSite[]> {
    const response = await this.request("GET", "/burp/target/siteMap", {});

    if (response.success && response.data) {
      return ((response.data as { sites?: BurpSuiteSite[] }).sites ?? []) as BurpSuiteSite[];
    }
    return [];
  }

  async getSiteMap(urlPrefix?: string): Promise<BurpSuiteSiteMap[]> {
    const endpoint = urlPrefix ? `/burp/target/siteMap?urlPrefix=${encodeURIComponent(urlPrefix)}` : "/burp/target/siteMap";
    const response = await this.request("GET", endpoint, {});

    if (response.success && response.data) {
      return ((response.data as { siteMap?: BurpSuiteSiteMap[] }).siteMap ?? []) as BurpSuiteSiteMap[];
    }
    return [];
  }

  async getProxyHistory(): Promise<BurpSuiteProxyHistory[]> {
    const response = await this.request("GET", "/burp/proxy/history", {});

    if (response.success && response.data) {
      return ((response.data as { proxyHistory?: BurpSuiteProxyHistory[] }).proxyHistory ?? []) as BurpSuiteProxyHistory[];
    }
    return [];
  }

  async sendToRepeater(requestId: number, repeatTab?: string): Promise<boolean> {
    const body: Record<string, unknown> = { request_id: requestId };
    if (repeatTab) {
      body.repeat_tab = repeatTab;
    }

    const response = await this.request("POST", "/burp/repeater", body);
    return response.success;
  }

  async sendToIntruder(requestId: number): Promise<boolean> {
    const response = await this.request("POST", "/burp/intruder", { request_id: requestId });
    return response.success;
  }

  async sendToComparer(data: string, type: "request" | "response" = "request"): Promise<boolean> {
    const response = await this.request("POST", "/burp/comparer", { data, type });
    return response.success;
  }

  async sendToDecoder(data: string): Promise<boolean> {
    const response = await this.request("POST", "/burp/decoder", { data });
    return response.success;
  }

  async setScope(include: string[], exclude: string[] = []): Promise<boolean> {
    const response = await this.request("POST", "/burp/target/scope", {
      include: include.map((rule) => ({ rule })),
      exclude: exclude.map((rule) => ({ rule })),
    });
    return response.success;
  }

  async getScope(): Promise<{ include: string[]; exclude: string[] }> {
    const response = await this.request("GET", "/burp/target/scope", {});

    if (response.success && response.data) {
      const data = response.data as {
        include?: Array<{ rule: string }>;
        exclude?: Array<{ rule: string }>;
      };
      return {
        include: data.include?.map((i) => i.rule) ?? [],
        exclude: data.exclude?.map((e) => e.rule) ?? [],
      };
    }
    return { include: [], exclude: [] };
  }

  async generateReport(scanId: number, format: "html" | "xml" | "pdf" = "html"): Promise<string | null> {
    const response = await this.request("POST", `/burp/scanner/scans/${scanId}/report`, { format });

    if (response.success && response.data) {
      return (response.data as { report?: string }).report ?? null;
    }
    return null;
  }

  async spider(url: string): Promise<number | null> {
    const response = await this.request("POST", "/burp/spider", { url });

    if (response.success && response.data) {
      return (response.data as { spider_id?: number }).spider_id ?? null;
    }
    return null;
  }

  async getSpiderStatus(spiderId: number): Promise<{ status: string; percentComplete: number } | null> {
    const response = await this.request("GET", `/burp/spider/${spiderId}`, {});

    if (response.success && response.data) {
      const data = response.data as { status?: string; percentComplete?: number };
      return {
        status: data.status ?? "unknown",
        percentComplete: data.percentComplete ?? 0,
      };
    }
    return null;
  }

  private async request(method: string, endpoint: string, body?: unknown): Promise<{ success: boolean; data?: unknown; error?: string }> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        method,
        headers: this.getHeaders(),
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

export function createBurpSuiteClient(config: BurpSuiteConfig): BurpSuiteClient {
  return new BurpSuiteClient(config);
}
