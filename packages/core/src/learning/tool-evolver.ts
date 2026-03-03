import * as fs from "node:fs";
import * as path from "node:path";
import * as childProcess from "node:child_process";
import { emitEvent } from "../events/stream.js";
import { auditLog } from "../audit/logger.js";

export interface ToolDefinition {
  name: string;
  category: "reconnaissance" | "exploitation" | "post-exploitation" | "defense" | "analysis";
  description: string;
  command: string;
  args: string[];
  installMethod: "apt" | "brew" | "pip" | "npm" | "go" | "download" | "docker";
  installCommand: string;
  versionCommand: string;
  capabilities: string[];
  riskLevel: "low" | "medium" | "high" | "critical";
}

export interface ToolDiscovery {
  id: string;
  toolName: string;
  source: "github" | "pypi" | "npm" | "manual";
  url: string;
  discoveredAt: Date;
  status: "discovered" | "analyzing" | "tested" | "approved" | "rejected";
  analysis: ToolAnalysis | null;
}

export interface ToolAnalysis {
  capabilities: string[];
  mitreCoverage: string[];
  riskAssessment: string;
  recommendation: "adopt" | "review" | "avoid";
  confidence: number;
}

export interface ToolIntegration {
  id: string;
  toolName: string;
  version: string;
  integratedAt: Date;
  config: Record<string, unknown>;
  status: "active" | "disabled" | "error";
}

export interface ToolStats {
  totalTools: number;
  activeTools: number;
  discovered: number;
  pending: number;
  categories: Record<string, number>;
}

const KNOWN_TOOLS: ToolDefinition[] = [
  {
    name: "nmap",
    category: "reconnaissance",
    description: "Network scanning and discovery",
    command: "nmap",
    args: ["-sV", "-sC"],
    installMethod: "apt",
    installCommand: "apt install -y nmap",
    versionCommand: "nmap --version",
    capabilities: ["port-scanning", "service-detection", "os-fingerprinting"],
    riskLevel: "medium",
  },
  {
    name: "sqlmap",
    category: "exploitation",
    description: "SQL injection detection and exploitation",
    command: "sqlmap",
    args: ["--batch", "--random-agent"],
    installMethod: "pip",
    installCommand: "pip install sqlmap",
    versionCommand: "sqlmap --version",
    capabilities: ["sql-injection", "database-enumeration", "data-extraction"],
    riskLevel: "high",
  },
  {
    name: "nuclei",
    category: "reconnaissance",
    description: "Vulnerability scanner based on templates",
    command: "nuclei",
    args: ["-silent"],
    installMethod: "go",
    installCommand: "go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest",
    versionCommand: "nuclei -version",
    capabilities: ["vulnerability-scanning", "template-based", "cve-detection"],
    riskLevel: "medium",
  },
  {
    name: "httpx",
    category: "reconnaissance",
    description: "HTTP probing toolkit",
    command: "httpx",
    args: ["-silent", "-status-code"],
    installMethod: "go",
    installCommand: "go install -v github.com/projectdiscovery/httpx/cmd/httpx@latest",
    versionCommand: "httpx -version",
    capabilities: ["http-probing", "technology-detection", "screenshot"],
    riskLevel: "low",
  },
  {
    name: "subfinder",
    category: "reconnaissance",
    description: "Subdomain discovery tool",
    command: "subfinder",
    args: ["-silent"],
    installMethod: "go",
    installCommand: "go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest",
    versionCommand: "subfinder -version",
    capabilities: ["subdomain-enumeration", "passive-recon"],
    riskLevel: "low",
  },
];

class ToolEvolver {
  private tools: Map<string, ToolDefinition> = new Map();
  private discoveries: Map<string, ToolDiscovery> = new Map();
  private integrations: Map<string, ToolIntegration> = new Map();
  private dataDir: string;
  private stats: ToolStats = {
    totalTools: 0,
    activeTools: 0,
    discovered: 0,
    pending: 0,
    categories: {},
  };

  constructor(dataDir: string) {
    this.dataDir = path.join(dataDir, "tools");
    this.init();
  }

  private init(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    for (const tool of KNOWN_TOOLS) {
      this.tools.set(tool.name, tool);
    }

    this.loadDiscoveries();
    this.loadIntegrations();
    this.updateStats();
  }

  private loadDiscoveries(): void {
    try {
      const filePath = path.join(this.dataDir, "discoveries.json");
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf-8");
        const discoveries = JSON.parse(content) as ToolDiscovery[];
        for (const d of discoveries) {
          this.discoveries.set(d.id, d);
        }
      }
    } catch {}
  }

  private loadIntegrations(): void {
    try {
      const filePath = path.join(this.dataDir, "integrations.json");
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf-8");
        const integrations = JSON.parse(content) as ToolIntegration[];
        for (const i of integrations) {
          this.integrations.set(i.id, i);
        }
      }
    } catch {}
  }

  private saveDiscoveries(): void {
    const filePath = path.join(this.dataDir, "discoveries.json");
    fs.writeFileSync(filePath, JSON.stringify(Array.from(this.discoveries.values()), null, 2));
  }

  private saveIntegrations(): void {
    const filePath = path.join(this.dataDir, "integrations.json");
    fs.writeFileSync(filePath, JSON.stringify(Array.from(this.integrations.values()), null, 2));
  }

  private updateStats(): void {
    this.stats.totalTools = this.tools.size;
    this.stats.activeTools = this.integrations.size;
    this.stats.discovered = this.discoveries.size;
    this.stats.pending = Array.from(this.discoveries.values()).filter(
      (d) => d.status === "discovered" || d.status === "analyzing"
    ).length;

    this.stats.categories = {};
    for (const tool of this.tools.values()) {
      this.stats.categories[tool.category] = (this.stats.categories[tool.category] || 0) + 1;
    }
  }

  checkInstalled(toolName: string): boolean {
    const tool = this.tools.get(toolName);
    if (!tool) return false;

    try {
      const result = childProcess.execSync(tool.versionCommand, { encoding: "utf-8", timeout: 5000 });
      return result.length > 0;
    } catch {
      return false;
    }
  }

  async installTool(toolName: string): Promise<{ success: boolean; output: string }> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      return { success: false, output: `Unknown tool: ${toolName}` };
    }

    emitEvent("sandbox.start", "install", "system", {
      toolName,
      method: tool.installMethod,
    });

    auditLog("tool.execute", "install", { toolName, method: tool.installMethod }, { source: "tool_evolver" });

    return new Promise((resolve) => {
      childProcess.exec(
        tool.installCommand,
        { timeout: 120000 },
        (error, stdout, stderr) => {
          if (error) {
            resolve({ success: false, output: stderr || error.message });
          } else {
            this.addIntegration(toolName);
            resolve({ success: true, output: stdout });
          }
        }
      );
    });
  }

  private addIntegration(toolName: string): void {
    const integration: ToolIntegration = {
      id: `int-${Date.now()}`,
      toolName,
      version: "unknown",
      integratedAt: new Date(),
      config: {},
      status: "active",
    };

    this.integrations.set(integration.id, integration);
    this.saveIntegrations();
    this.updateStats();
  }

  discoverTool(source: "github" | "pypi" | "npm" | "manual", url: string): ToolDiscovery {
    const discovery: ToolDiscovery = {
      id: `disc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      toolName: this.extractToolName(url),
      source,
      url,
      discoveredAt: new Date(),
      status: "discovered",
      analysis: null,
    };

    this.discoveries.set(discovery.id, discovery);
    this.saveDiscoveries();
    this.stats.discovered++;

    emitEvent("reasoning.start", "discovery", "system", {
      action: "tool_discovered",
      toolName: discovery.toolName,
      source,
    });

    this.analyzeDiscovery(discovery.id);

    return discovery;
  }

  private extractToolName(url: string): string {
    const match = url.match(/\/([^/]+?)(?:\/|$|\.git)/);
    return match ? match[1] : "unknown";
  }

  private async analyzeDiscovery(discoveryId: string): Promise<void> {
    const discovery = this.discoveries.get(discoveryId);
    if (!discovery) return;

    discovery.status = "analyzing";
    this.saveDiscoveries();

    const analysis: ToolAnalysis = {
      capabilities: ["unknown"],
      mitreCoverage: [],
      riskAssessment: "Requires manual review",
      recommendation: "review",
      confidence: 0.3,
    };

    if (discovery.source === "github") {
      analysis.capabilities = ["requires-analysis"];
      analysis.confidence = 0.5;
    }

    discovery.analysis = analysis;
    discovery.status = "tested";
    this.saveDiscoveries();
  }

  approveDiscovery(discoveryId: string, toolDef: Partial<ToolDefinition>): boolean {
    const discovery = this.discoveries.get(discoveryId);
    if (!discovery || discovery.status !== "tested") return false;

    const fullTool: ToolDefinition = {
      name: discovery.toolName,
      category: toolDef.category || "analysis",
      description: toolDef.description || "",
      command: toolDef.command || discovery.toolName,
      args: toolDef.args || [],
      installMethod: toolDef.installMethod || "download",
      installCommand: toolDef.installCommand || "",
      versionCommand: toolDef.versionCommand || `${discovery.toolName} --version`,
      capabilities: toolDef.capabilities || [],
      riskLevel: toolDef.riskLevel || "medium",
    };

    this.tools.set(fullTool.name, fullTool);
    discovery.status = "approved";
    this.saveDiscoveries();
    this.updateStats();

    emitEvent("reasoning.result", "discovery", "system", {
      action: "tool_approved",
      toolName: fullTool.name,
    });

    return true;
  }

  rejectDiscovery(discoveryId: string, reason: string): boolean {
    const discovery = this.discoveries.get(discoveryId);
    if (!discovery) return false;

    discovery.status = "rejected";
    this.saveDiscoveries();

    emitEvent("reasoning.result", "discovery", "system", {
      action: "tool_rejected",
      toolName: discovery.toolName,
      reason,
    });

    return true;
  }

  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  getToolsByCategory(category: ToolDefinition["category"]): ToolDefinition[] {
    return Array.from(this.tools.values()).filter((t) => t.category === category);
  }

  getDiscoveries(status?: ToolDiscovery["status"]): ToolDiscovery[] {
    let discoveries = Array.from(this.discoveries.values());
    if (status) {
      discoveries = discoveries.filter((d) => d.status === status);
    }
    return discoveries.sort((a, b) => b.discoveredAt.getTime() - a.discoveredAt.getTime());
  }

  getIntegrations(): ToolIntegration[] {
    return Array.from(this.integrations.values());
  }

  getStats(): ToolStats {
    this.updateStats();
    return { ...this.stats };
  }

  checkAllInstalled(): Record<string, boolean> {
    const result: Record<string, boolean> = {};
    for (const tool of this.tools.values()) {
      result[tool.name] = this.checkInstalled(tool.name);
    }
    return result;
  }

  getToolsForMitre(technique: string): ToolDefinition[] {
    return Array.from(this.tools.values()).filter((t) => {
      if (!t.capabilities) return false;
      const techLower = technique.toLowerCase();
      return t.capabilities.some((c) => c.toLowerCase().includes(techLower));
    });
  }
}

export { ToolEvolver };
