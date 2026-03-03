import * as http from "node:http";
import * as fs from "node:fs";
import * as path from "node:path";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "./server.js";
import type { GatewayServer } from "./types.js";
import type { ConfigManager } from "../config/manager.js";
import type { SkillLoader } from "../skills/loader-class.js";
import { loadSkillFromFile, resolveOpenClawMetadata } from "../skills/loader.js";
import { SkillMarketService } from "../skills/market-service.js";
import { ProviderFactoryManager } from "../providers/factory.js";
import type { TaskCategory, ChatMessage, ProviderConfig } from "../providers/types.js";
import { MITRELoader } from "../knowledge/mitre/loader.js";
import { SCFLoaderExtended } from "../knowledge/scf/loader-extended.js";
import { SessionManager } from "../session/manager.js";
import { LearningManager } from "../learning/manager.js";
import type {
  Router,
  MethodHandler,
  HandlerContext,
  RequestFrame,
  ResponseFrame,
} from "./types.js";

export interface GatewayOptions {
  port: number;
  dataDir: string;
  configManager: ConfigManager;
  skillLoader: SkillLoader;
  host?: string;
  webDistDir?: string;
  projectDataDir?: string;
}

export interface GatewayState {
  running: boolean;
  port: number;
  host: string;
  connections: number;
  startTime: Date | null;
}

interface LLMProviderEntry {
  id: string;
  name?: string;
  type?: "local" | "cloud";
  enabled?: boolean;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

type AIExpertMode = "shared" | "per_role";

interface AIExpertRoleBinding {
  roleId: string;
  roleName: string;
  providerId?: string;
  model?: string;
}

interface AIExpertConfig {
  mode: AIExpertMode;
  shared: {
    providerId?: string;
    model?: string;
  };
  bindings: AIExpertRoleBinding[];
}

interface SecurityRoleSpec {
  id: string;
  name: string;
  description: string;
  emoji: string;
  role: string;
  combination: string;
  skillName: string;
  displaySource: string;
}

interface RoleCapabilitySections {
  light: string[];
  dark: string[];
  security: string[];
  legal: string[];
  technology: string[];
  business: string[];
}

export class Gateway {
  private port: number;
  private host: string;
  private dataDir: string;
  private projectDataDir: string;
  private webDistDir: string;
  private configManager: ConfigManager;
  private skillLoader: SkillLoader;
  private server: GatewayServer | null = null;
  private httpServer: http.Server | null = null;
  private handlers: Map<string, MethodHandler> = new Map();
  private startTime: Date | null = null;
  private mitreLoader: MITRELoader | null = null;
  private mitreLoaded = false;
  private scfLoader: SCFLoaderExtended | null = null;
  private scfLoaded = false;
  private marketService: SkillMarketService;
  private providerManager: ProviderFactoryManager;
  private sessionManager: SessionManager;
  private learningManager: LearningManager;
  private wsServer: WebSocketServer | null = null;
  private wsClients: Set<WebSocket> = new Set();
  
  // Default providers configuration
  private defaultProviders = [
    {
      id: "ollama",
      name: "Ollama",
      type: "local" as const,
      enabled: true,
      baseUrl: "http://localhost:11434",
      model: "llama3",
      status: "disconnected" as const,
      isCustom: false,
      supportsCustomBaseUrl: true
    },
    {
      id: "openai",
      name: "OpenAI",
      type: "cloud" as const,
      enabled: false,
      apiKey: "",
      model: "gpt-4",
      status: "disconnected" as const,
      isCustom: false,
      supportsCustomBaseUrl: true
    },
    {
      id: "anthropic",
      name: "Anthropic Claude",
      type: "cloud" as const,
      enabled: false,
      apiKey: "",
      model: "claude-3-opus",
      status: "disconnected" as const,
      isCustom: false,
      supportsCustomBaseUrl: true
    },
    {
      id: "deepseek",
      name: "DeepSeek",
      type: "cloud" as const,
      enabled: false,
      apiKey: "",
      model: "deepseek-chat",
      status: "disconnected" as const,
      isCustom: false,
      supportsCustomBaseUrl: true
    },
    {
      id: "zhipu",
      name: "智谱 AI",
      type: "cloud" as const,
      enabled: false,
      apiKey: "",
      model: "glm-4",
      status: "disconnected" as const,
      isCustom: false,
      supportsCustomBaseUrl: true
    },
    {
      id: "moonshot",
      name: "Moonshot",
      type: "cloud" as const,
      enabled: false,
      apiKey: "",
      model: "moonshot-v1",
      status: "disconnected" as const,
      isCustom: false,
      supportsCustomBaseUrl: true
    },
    {
      id: "minimax",
      name: "MiniMax",
      type: "cloud" as const,
      enabled: false,
      apiKey: "",
      model: "abab6.5-chat",
      status: "disconnected" as const,
      isCustom: false,
      supportsCustomBaseUrl: true
    }
  ];
  private roleSpecs: SecurityRoleSpec[] = [
    {
      id: "security-expert",
      name: "安全专家",
      description: "SEC - 威胁检测/漏洞评估/渗透测试",
      emoji: "🛡️",
      role: "SEC",
      combination: "single",
      skillName: "security-expert",
      displaySource: "安全防护职能需求",
    },
    {
      id: "privacy-officer",
      name: "隐私安全官",
      description: "SEC+LEG - 隐私保护/数据合规",
      emoji: "🔐",
      role: "SEC+LEG",
      combination: "binary",
      skillName: "privacy-officer",
      displaySource: "隐私安全职能需求",
    },
    {
      id: "security-architect",
      name: "安全架构师",
      description: "SEC+IT - 基础设施安全/代码安全",
      emoji: "🏗️",
      role: "SEC+IT",
      combination: "binary",
      skillName: "security-architect",
      displaySource: "安全架构职能需求",
    },
    {
      id: "business-security-officer",
      name: "业务安全官",
      description: "SEC+BIZ - 供应链安全/业务连续性",
      emoji: "📊",
      role: "SEC+BIZ",
      combination: "binary",
      skillName: "business-security-officer",
      displaySource: "业务安全职能需求",
    },
    {
      id: "ciso",
      name: "首席信息安全官角色",
      description: "SEC+LEG+IT - 企业安全战略与合规治理",
      emoji: "👔",
      role: "SEC+LEG+IT",
      combination: "ternary",
      skillName: "ciso",
      displaySource: "首席信息安全治理职能需求",
    },
    {
      id: "supply-chain-security",
      name: "供应链安全官",
      description: "SEC+LEG+BIZ - 供应链风险与第三方治理",
      emoji: "🔗",
      role: "SEC+LEG+BIZ",
      combination: "ternary",
      skillName: "supply-chain-security",
      displaySource: "供应链安全职能需求",
    },
    {
      id: "security-ops",
      name: "安全运营官",
      description: "SEC+IT+BIZ - SOC运营与事件响应",
      emoji: "⚙️",
      role: "SEC+IT+BIZ",
      combination: "ternary",
      skillName: "security-ops",
      displaySource: "安全运营职能需求",
    },
    {
      id: "secuclaw-commander",
      name: "全域安全指挥官",
      description: "SEC+LEG+IT+BIZ - 全域安全指挥",
      emoji: "🎯",
      role: "SEC+LEG+IT+BIZ",
      combination: "quaternary",
      skillName: "secuclaw-commander",
      displaySource: "全域安全指挥职能需求",
    },
  ];
  private roleIdAliases: Record<string, string> = {
    "privacy-security-officer": "privacy-officer",
    "chief-security-architect": "ciso",
    "supply-chain-officer": "supply-chain-security",
    "supply-chain-security-officer": "supply-chain-security",
    "security-ops-officer": "security-ops",
    "business-security-operations": "security-ops",
    "secuclaw": "secuclaw-commander",
  };
  private defaultAIExpertRoles: AIExpertRoleBinding[] = this.roleSpecs.map((role) => ({
    roleId: role.id,
    roleName: role.name,
    providerId: "",
    model: "",
  }));


  constructor(options: GatewayOptions) {
    this.port = options.port;
    this.host = options.host ?? "0.0.0.0";
    this.dataDir = options.dataDir;
    this.projectDataDir = options.projectDataDir ?? options.dataDir;
    this.webDistDir = options.webDistDir ?? "";
    this.configManager = options.configManager;
    this.skillLoader = options.skillLoader;
    this.marketService = new SkillMarketService();
    this.providerManager = new ProviderFactoryManager();
    this.sessionManager = new SessionManager({ dataDir: this.dataDir });
    this.learningManager = new LearningManager({ dataDir: this.dataDir });
    
    this.initLoaders();
    this.initializeProviders();
    this.syncProviderManagerWithConfig();
    this.registerHandlers();
  }

  private async initLoaders(): Promise<void> {
    const mitreDataPath = path.join(this.projectDataDir, "mitre", "attack-stix-data");
    const scfDataPath = path.join(this.projectDataDir, "scf");

    this.mitreLoader = new MITRELoader(mitreDataPath);
    this.scfLoader = new SCFLoaderExtended(scfDataPath);

    this.loadMITRE();
    this.loadSCF();
  }
  
  private async loadMITRE(): Promise<void> {
    if (this.mitreLoaded) return;
    try {
      await this.mitreLoader?.load();
      const stats = this.mitreLoader?.getStats();
      console.log(`MITRE loaded: ${stats?.techniques} techniques`);
      this.mitreLoaded = true;
    } catch (e) {
      console.log("MITRE data not available:", e instanceof Error ? e.message : "unknown");
    }
  }
  
  private async initializeProviders(): Promise<void> {
    // Initialize default providers if not exists
    const existingProviders = this.configManager.get("llmProviders") as any[];
    if (!existingProviders || existingProviders.length === 0) {
      await this.configManager.set("llmProviders", this.defaultProviders);
    }
  }

  private getConfiguredLLMProviders(): LLMProviderEntry[] {
    const configured = this.configManager.get("llmProviders");
    if (Array.isArray(configured) && configured.length > 0) {
      return configured as LLMProviderEntry[];
    }
    return this.defaultProviders as LLMProviderEntry[];
  }

  private syncProviderManagerWithConfig(): void {
    const providers = this.getConfiguredLLMProviders();

    for (const provider of providers) {
      if (!provider?.id || provider.enabled !== true) continue;

      const factoryConfig: Partial<ProviderConfig> = {
        name: provider.id,
        apiKey: provider.apiKey,
        baseUrl: provider.baseUrl || (provider.id === "ollama" ? "http://localhost:11434" : ""),
        defaultModel: provider.model,
      };

      let runtimeProvider = this.providerManager.create(provider.id, factoryConfig);
      if (!runtimeProvider) {
        const fallbackFactory = provider.type === "local" ? "ollama" : "openai";
        runtimeProvider = this.providerManager.create(fallbackFactory, factoryConfig);
      }

      if (runtimeProvider?.isAvailable()) {
        this.providerManager.register(provider.id, runtimeProvider);
      }
    }

    const defaultProvider = providers.find((provider) => provider.enabled === true)?.id;
    if (defaultProvider) {
      try {
        this.providerManager.setDefault(defaultProvider);
      } catch {
        // Keep runtime default if configured default isn't available.
      }
    }
  }

  private getDefaultAIExpertConfig(): AIExpertConfig {
    return {
      mode: "per_role",
      shared: { providerId: "", model: "" },
      bindings: this.defaultAIExpertRoles.map((role) => ({ ...role })),
    };
  }

  private normalizeRoleId(roleId?: string): string | undefined {
    if (!roleId) return undefined;
    return this.roleIdAliases[roleId] || roleId;
  }

  private getRoleSpec(roleId?: string): SecurityRoleSpec | undefined {
    const normalizedRoleId = this.normalizeRoleId(roleId);
    if (!normalizedRoleId) return undefined;
    return this.roleSpecs.find((role) => role.id === normalizedRoleId);
  }

  private isRoleIdentityQuestion(input: string): boolean {
    const normalized = input.trim().toLowerCase();
    return /你的角色是什么|你是什么角色|当前角色|你现在的角色|what is your role|who are you/.test(normalized);
  }

  private formatCapabilitySummary(items: string[], maxItems = 8): string {
    if (items.length === 0) return "无";
    const unique = Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
    if (unique.length === 0) return "无";
    const preview = unique.slice(0, maxItems);
    const suffix = unique.length > maxItems ? ` 等${unique.length}项` : "";
    return `${preview.join("、")}${suffix}`;
  }

  private getRoleCapabilitySections(roleId?: string): {
    roleSpec: SecurityRoleSpec;
    skillPath: string;
    roleDimension: string;
    roleCombination: string;
    sections: RoleCapabilitySections;
  } | undefined {
    const roleSpec = this.getRoleSpec(roleId);
    if (!roleSpec) return undefined;

    const loadedSkill = this.skillLoader.get(roleSpec.skillName);
    const fallbackSkillPath = path.resolve(process.cwd(), "skills", roleSpec.skillName, "SKILL.md");
    const fallbackSkill = !loadedSkill && fs.existsSync(fallbackSkillPath) ? loadSkillFromFile(fallbackSkillPath) : null;

    const skillPath = loadedSkill?.filePath || fallbackSkill?.filePath || fallbackSkillPath;
    const openclawFromLoaded = (loadedSkill?.data?.metadata as Record<string, unknown> | undefined)?.openclaw as Record<string, unknown> | undefined;
    const openclawFromFallbackRaw = (fallbackSkill?.data?.metadata as Record<string, unknown> | undefined)?.openclaw as Record<string, unknown> | undefined;
    const openclawFromFallback = fallbackSkill ? resolveOpenClawMetadata(fallbackSkill.data) : undefined;
    const openclawMetadata = openclawFromLoaded || openclawFromFallbackRaw || (openclawFromFallback as Record<string, unknown> | undefined);
    const roleDimension = loadedSkill?.metadata?.openclaw?.role || openclawFromFallback?.role || roleSpec.role;
    const roleCombination = loadedSkill?.metadata?.openclaw?.combination || openclawFromFallback?.combination || roleSpec.combination;

    const sections: RoleCapabilitySections = {
      light: [],
      dark: [],
      security: [],
      legal: [],
      technology: [],
      business: [],
    };

    if (openclawMetadata && typeof openclawMetadata === "object") {
      const capabilities = openclawMetadata.capabilities as Record<string, unknown> | undefined;
      if (capabilities && typeof capabilities === "object") {
        for (const key of Object.keys(sections) as Array<keyof RoleCapabilitySections>) {
          const value = capabilities[key];
          if (Array.isArray(value)) {
            sections[key] = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
          }
        }
      }
    }

    return {
      roleSpec,
      skillPath,
      roleDimension,
      roleCombination,
      sections,
    };
  }

  private getRoleIdentityResponse(roleId?: string): string | undefined {
    const roleInfo = this.getRoleCapabilitySections(roleId);
    if (!roleInfo) return undefined;

    const { roleSpec, skillPath, roleDimension, roleCombination, sections } = roleInfo;
    return [
      `我的角色是**${roleSpec.name}**（roleId: ${roleSpec.id}），技能来源为\`${roleSpec.displaySource}\`。`,
      `**维度组合**：${roleDimension}（${roleCombination}）`,
      "**能力总览（来自 capabilities）**：",
      `- 光明能力：${this.formatCapabilitySummary(sections.light)}`,
      `- 黑暗能力：${this.formatCapabilitySummary(sections.dark)}`,
      `- 安全能力：${this.formatCapabilitySummary(sections.security)}`,
      `- 法律能力：${this.formatCapabilitySummary(sections.legal)}`,
      `- 技术能力：${this.formatCapabilitySummary(sections.technology)}`,
      `- 业务能力：${this.formatCapabilitySummary(sections.business)}`,
    ].join("\n");
  }

  private getRoleSkillSummary(roleId?: string): string | undefined {
    const roleInfo = this.getRoleCapabilitySections(roleId);
    if (!roleInfo) return undefined;
    const { roleSpec, skillPath, roleDimension, roleCombination, sections } = roleInfo;
    const mergedCapabilities = [
      ...sections.light,
      ...sections.security,
      ...sections.legal,
      ...sections.technology,
      ...sections.business,
      ...sections.dark,
    ];
    const capabilitySummary = this.formatCapabilitySummary(mergedCapabilities, 12);

    return [
      `你当前角色是「${roleSpec.name}」(roleId: ${roleSpec.id})。`,
      `能力来源技能文件：${skillPath}`,
      `维度组合：${roleDimension} (${roleCombination})`,
      `核心能力：${capabilitySummary}`,
      "当用户询问“你的角色是什么”时，必须明确回答：角色名称、roleId、技能文件路径、维度组合和核心能力。",
      "请始终以当前角色视角回答，不要切换到其他角色。",
    ].join("\n");
  }

  private normalizeAIExpertConfig(config: unknown): AIExpertConfig {
    const defaults = this.getDefaultAIExpertConfig();
    if (!config || typeof config !== "object") return defaults;

    const raw = config as Partial<AIExpertConfig>;
    const mode: AIExpertMode = raw.mode === "shared" ? "shared" : "per_role";
    const sharedProviderId = typeof raw.shared?.providerId === "string" ? raw.shared.providerId : "";
    const sharedModel = typeof raw.shared?.model === "string" ? raw.shared.model : "";
    const rawBindings = Array.isArray(raw.bindings) ? raw.bindings : [];

    const bindingMap = new Map<string, AIExpertRoleBinding>();
    for (const item of rawBindings) {
      if (!item || typeof item !== "object") continue;
      const role = item as Partial<AIExpertRoleBinding>;
      if (typeof role.roleId !== "string" || role.roleId.length === 0) continue;
      const normalizedRoleId = this.normalizeRoleId(role.roleId);
      if (!normalizedRoleId) continue;
      const roleSpec = this.getRoleSpec(normalizedRoleId);
      bindingMap.set(normalizedRoleId, {
        roleId: normalizedRoleId,
        roleName: roleSpec?.name || normalizedRoleId,
        providerId: typeof role.providerId === "string" ? role.providerId : "",
        model: typeof role.model === "string" ? role.model : "",
      });
    }

    const bindings = defaults.bindings.map((role) => {
      const existing = bindingMap.get(role.roleId);
      return {
        roleId: role.roleId,
        roleName: existing?.roleName || role.roleName,
        providerId: existing?.providerId || "",
        model: existing?.model || "",
      };
    });

    return {
      mode,
      shared: {
        providerId: sharedProviderId,
        model: sharedModel,
      },
      bindings,
    };
  }

  private getAIExpertConfig(): AIExpertConfig {
    const config = this.configManager.get("aiExpertConfig");
    return this.normalizeAIExpertConfig(config);
  }
  
  private async loadSCF(): Promise<void> {
    if (this.scfLoaded) return;
    try {
      await this.scfLoader?.load();
      const stats = this.scfLoader?.getStats();
      console.log(`SCF loaded: ${stats?.controls} controls, ${stats?.domains} domains`);
      this.scfLoaded = true;
    } catch (e) {
      console.log("SCF data not available:", e instanceof Error ? e.message : "unknown");
    }
  }


  private async readRequestBody(req: http.IncomingMessage): Promise<unknown> {
    return new Promise((resolve, reject) => {
      let body = "";
      req.on("data", chunk => body += chunk);
      req.on("end", () => {
        try {
          resolve(body ? JSON.parse(body) : undefined);
        } catch {
          reject(new Error("Invalid JSON"));
        }
      });
      req.on("error", reject);
    });
  }

  private getProviderModelFallback(providerId: string): string[] {
    const provider = providerId.toLowerCase();
    const fallbackMap: Record<string, string[]> = {
      openai: ["gpt-4o", "gpt-4.1", "gpt-4.1-mini", "gpt-4o-mini"],
      anthropic: ["claude-3-7-sonnet-latest", "claude-3-5-sonnet-latest", "claude-3-5-haiku-latest"],
      deepseek: ["deepseek-chat", "deepseek-reasoner"],
      zhipu: ["glm-4-plus", "glm-4-air", "glm-4-flash"],
      moonshot: ["moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"],
      minimax: ["abab6.5-chat", "abab6.5s-chat"],
      ollama: [],
    };

    return fallbackMap[provider] || [];
  }

  private mergeModelList(dynamicModels: string[], fallbackModels: string[]): string[] {
    return Array.from(
      new Set(
        [...dynamicModels, ...fallbackModels].map((item) => item?.trim()).filter((item): item is string => Boolean(item))
      )
    );
  }

  private parseModelList(payload: unknown): string[] {
    if (!payload || typeof payload !== "object") return [];

    const obj = payload as {
      data?: Array<{ id?: string; name?: string; model?: string }>;
      models?: Array<{ id?: string; name?: string; model?: string }>;
    };

    const dataModels = Array.isArray(obj.data) ? obj.data : [];
    const namedModels = Array.isArray(obj.models) ? obj.models : [];

    const candidates = [...dataModels, ...namedModels]
      .map((item) => item?.id || item?.name || item?.model)
      .filter((item): item is string => typeof item === "string" && item.length > 0);

    return Array.from(new Set(candidates));
  }

  private normalizeBaseUrl(baseUrl: string): string {
    return baseUrl.replace(/\/+$/, "");
  }

  private async fetchModelListFromEndpoint(
    endpoint: string,
    headers: Record<string, string>,
    timeoutMs = 10000
  ): Promise<string[]> {
    const response = await fetch(endpoint, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json() as unknown;
    return this.parseModelList(data);
  }

  private detectTaskCategory(query: string, skill?: string): TaskCategory {
    const lowerQuery = query.toLowerCase();
    
    // Skill-based routing
    if (skill) {
      const normalizedRoleId = this.normalizeRoleId(skill) || skill;
      const skillRouting: Record<string, TaskCategory> = {
        "security-expert": "reasoning",
        "privacy-officer": "analysis",
        "security-architect": "analysis",
        "business-security-officer": "analysis",
        "ciso": "reasoning",
        "supply-chain-security": "analysis",
        "security-ops": "analysis",
        "secuclaw-commander": "reasoning",
      };
      if (skillRouting[normalizedRoleId]) return skillRouting[normalizedRoleId];
    }
    
    // Content-based routing
    if (/代码|code|function|class|implement|编程|开发/i.test(query)) return "coding";
    if (/分析|analyze|评估|assess|report|报告/i.test(query)) return "analysis";
    if (/推理|reason|逻辑|logic|为什么|why|解释|explain/i.test(query)) return "reasoning";
    if (/翻译|translate|中译|英译/i.test(query)) return "translation";
    if (/漏洞|vuln|cve|攻击|attack|威胁|threat/i.test(query)) return "reasoning";
    if (/合规|compliance|审计|audit|iso|gdpr/i.test(query)) return "analysis";
    
    return "chat";
  }

  private buildKnowledgeGraphData(): {
    nodes: Array<{ id: string; label: string; type: string }>;
    edges: Array<{ id: string; source: string; target: string; linkType: string }>;
  } {
    const mitreStats = this.mitreLoader?.getStats();
    const scfStats = this.scfLoader?.getStats();

    return {
      nodes: [
        { id: "mitre", label: `MITRE 技术 (${mitreStats?.techniques || 0})`, type: "threat" },
        { id: "scf", label: `SCF 控制 (${scfStats?.controls || 0})`, type: "control" },
        { id: "asset-web", label: "Web 应用", type: "asset" },
        { id: "asset-db", label: "核心数据库", type: "asset" },
        { id: "threat-apt", label: "APT29", type: "threat" },
        { id: "vuln-sql", label: "SQL 注入", type: "vulnerability" },
        { id: "control-waf", label: "WAF", type: "control" },
        { id: "risk-data", label: "数据泄露风险", type: "risk" },
      ],
      edges: [
        { id: "e1", source: "threat-apt", target: "vuln-sql", linkType: "exploits" },
        { id: "e2", source: "vuln-sql", target: "asset-web", linkType: "transmits" },
        { id: "e3", source: "asset-web", target: "asset-db", linkType: "depends_on" },
        { id: "e4", source: "control-waf", target: "vuln-sql", linkType: "mitigates" },
        { id: "e5", source: "mitre", target: "threat-apt", linkType: "contains" },
        { id: "e6", source: "scf", target: "control-waf", linkType: "contains" },
        { id: "e7", source: "risk-data", target: "asset-db", linkType: "transmits" },
      ],
    };
  }

  private buildControlCoverage(): Record<string, number> {
    return {
      IAM: 82,
      DAT: 76,
      TVM: 71,
      IR: 68,
      LOG: 74,
      BCM: 63,
    };
  }

  private buildGraphStats(): {
    techniques: number;
    tactics: number;
    controls: number;
    domains: number;
    threats: number;
    links: number;
    controlCoverage: Record<string, number>;
  } {
    const mitreStats = this.mitreLoader?.getStats();
    const scfStats = this.scfLoader?.getStats();
    const graph = this.buildKnowledgeGraphData();

    return {
      techniques: mitreStats?.techniques || 0,
      tactics: mitreStats?.tactics || 0,
      controls: scfStats?.controls || 0,
      domains: scfStats?.domains || 0,
      threats: 3,
      links: graph.edges.length,
      controlCoverage: this.buildControlCoverage(),
    };
  }

  private buildAttackChains(limit = 50): Array<{
    id: string;
    name: string;
    nodes: Array<{
      id: string;
      type: "tactic" | "technique" | "control";
      name: string;
      tacticOrder: number;
      controls: string[];
    }>;
    coverage: number;
  }> {
    const chains = [
      {
        id: "chain-phishing",
        name: "钓鱼邮件到数据外泄",
        nodes: [
          { id: "ta0001", type: "tactic" as const, name: "初始访问", tacticOrder: 1, controls: ["AC-01"] },
          { id: "t1566.001", type: "technique" as const, name: "钓鱼附件", tacticOrder: 2, controls: ["AT-02", "SE-03"] },
          { id: "t1078", type: "technique" as const, name: "有效账户", tacticOrder: 3, controls: ["IAM-01", "IAM-03"] },
          { id: "ctrl-mail", type: "control" as const, name: "邮件安全网关", tacticOrder: 4, controls: ["SE-03"] },
        ],
        coverage: 78,
      },
      {
        id: "chain-web-rce",
        name: "Web 漏洞利用到横向移动",
        nodes: [
          { id: "ta0001-web", type: "tactic" as const, name: "初始访问", tacticOrder: 1, controls: ["TVM-01"] },
          { id: "t1190", type: "technique" as const, name: "利用对外应用", tacticOrder: 2, controls: ["TVM-02", "APP-01"] },
          { id: "t1021.001", type: "technique" as const, name: "远程服务", tacticOrder: 3, controls: ["NET-04"] },
          { id: "ctrl-waf", type: "control" as const, name: "WAF 策略", tacticOrder: 4, controls: ["APP-01"] },
        ],
        coverage: 65,
      },
      {
        id: "chain-ransomware",
        name: "勒索软件攻击链",
        nodes: [
          { id: "ta0040", type: "tactic" as const, name: "影响", tacticOrder: 1, controls: ["BCM-01"] },
          { id: "t1486", type: "technique" as const, name: "数据加密以影响", tacticOrder: 2, controls: ["DAT-05", "BCM-02"] },
          { id: "t1489", type: "technique" as const, name: "服务停止", tacticOrder: 3, controls: ["OPS-03"] },
          { id: "ctrl-backup", type: "control" as const, name: "离线备份恢复", tacticOrder: 4, controls: ["BCM-02"] },
        ],
        coverage: 72,
      },
    ];

    return chains.slice(0, Math.max(1, limit));
  }

  private buildSCFMITRECoverageGraph(): {
    nodes: Array<{ id: string; label: string; type: string }>;
    edges: Array<{ id: string; source: string; target: string; linkType: string }>;
  } {
    return {
      nodes: [
        { id: "dom-iam", label: "SCF IAM", type: "control" },
        { id: "dom-app", label: "SCF APP", type: "control" },
        { id: "ctrl-iam01", label: "IAM-01 身份治理", type: "control" },
        { id: "ctrl-app03", label: "APP-03 应用防护", type: "control" },
        { id: "tech-t1078", label: "T1078 Valid Accounts", type: "threat" },
        { id: "tech-t1190", label: "T1190 Exploit Public App", type: "threat" },
        { id: "asset-idp", label: "身份系统", type: "asset" },
        { id: "asset-web", label: "外网应用", type: "asset" },
      ],
      edges: [
        { id: "ce1", source: "dom-iam", target: "ctrl-iam01", linkType: "contains" },
        { id: "ce2", source: "dom-app", target: "ctrl-app03", linkType: "contains" },
        { id: "ce3", source: "ctrl-iam01", target: "tech-t1078", linkType: "mitigates" },
        { id: "ce4", source: "ctrl-app03", target: "tech-t1190", linkType: "mitigates" },
        { id: "ce5", source: "tech-t1078", target: "asset-idp", linkType: "exploits" },
        { id: "ce6", source: "tech-t1190", target: "asset-web", linkType: "exploits" },
      ],
    };
  }

  private buildAttackPathControlGraph(): {
    nodes: Array<{ id: string; label: string; type: string }>;
    edges: Array<{ id: string; source: string; target: string; linkType: string }>;
  } {
    return {
      nodes: [
        { id: "ap-threat", label: "外部攻击者", type: "threat" },
        { id: "ap-vuln", label: "未修复漏洞", type: "vulnerability" },
        { id: "ap-web", label: "业务系统", type: "asset" },
        { id: "ap-db", label: "数据库", type: "asset" },
        { id: "ap-waf", label: "WAF", type: "control" },
        { id: "ap-edr", label: "EDR", type: "control" },
      ],
      edges: [
        { id: "ape1", source: "ap-threat", target: "ap-vuln", linkType: "exploits" },
        { id: "ape2", source: "ap-vuln", target: "ap-web", linkType: "transmits" },
        { id: "ape3", source: "ap-web", target: "ap-db", linkType: "depends_on" },
        { id: "ape4", source: "ap-waf", target: "ap-vuln", linkType: "mitigates" },
        { id: "ape5", source: "ap-edr", target: "ap-web", linkType: "mitigates" },
      ],
    };
  }

  private buildDefenseInDepthGraph(): {
    nodes: Array<{ id: string; label: string; type: string }>;
    edges: Array<{ id: string; source: string; target: string; linkType: string }>;
  } {
    return {
      nodes: [
        { id: "d-prevent", label: "预防层", type: "control" },
        { id: "d-detect", label: "检测层", type: "control" },
        { id: "d-response", label: "响应层", type: "control" },
        { id: "d-recovery", label: "恢复层", type: "control" },
        { id: "d-threat", label: "高级威胁", type: "threat" },
        { id: "d-asset", label: "核心资产", type: "asset" },
      ],
      edges: [
        { id: "de1", source: "d-prevent", target: "d-threat", linkType: "mitigates" },
        { id: "de2", source: "d-detect", target: "d-threat", linkType: "mitigates" },
        { id: "de3", source: "d-response", target: "d-threat", linkType: "mitigates" },
        { id: "de4", source: "d-recovery", target: "d-asset", linkType: "mitigates" },
        { id: "de5", source: "d-threat", target: "d-asset", linkType: "exploits" },
      ],
    };
  }

  private buildSCFMITREMappings(): Array<{
    scfControlId: string;
    scfControlName: string;
    scfDomain: string;
    mitreTechniqueId: string;
    mitreTechniqueName: string;
    mitreTactic: string;
    relationship: string;
    confidence: number;
  }> {
    return [
      {
        scfControlId: "IAM-01",
        scfControlName: "身份与访问控制",
        scfDomain: "IAM",
        mitreTechniqueId: "T1078",
        mitreTechniqueName: "Valid Accounts",
        mitreTactic: "Defense Evasion",
        relationship: "mitigates",
        confidence: 0.91,
      },
      {
        scfControlId: "APP-03",
        scfControlName: "应用层防护",
        scfDomain: "APP",
        mitreTechniqueId: "T1190",
        mitreTechniqueName: "Exploit Public-Facing Application",
        mitreTactic: "Initial Access",
        relationship: "mitigates",
        confidence: 0.88,
      },
      {
        scfControlId: "LOG-02",
        scfControlName: "日志检测与告警",
        scfDomain: "LOG",
        mitreTechniqueId: "T1059",
        mitreTechniqueName: "Command and Scripting Interpreter",
        mitreTactic: "Execution",
        relationship: "detects",
        confidence: 0.79,
      },
    ];
  }

  private buildDomainCoverage(): Array<{
    domainCode: string;
    domainName: string;
    controlCount: number;
    techniqueCoverage: number;
    effectiveness: number;
    gaps: number;
    priority: string;
  }> {
    return [
      { domainCode: "IAM", domainName: "Identity & Access", controlCount: 18, techniqueCoverage: 43, effectiveness: 0.82, gaps: 5, priority: "medium" },
      { domainCode: "APP", domainName: "Application Security", controlCount: 14, techniqueCoverage: 37, effectiveness: 0.74, gaps: 8, priority: "high" },
      { domainCode: "TVM", domainName: "Vulnerability Mgmt", controlCount: 11, techniqueCoverage: 29, effectiveness: 0.68, gaps: 9, priority: "high" },
      { domainCode: "IR", domainName: "Incident Response", controlCount: 10, techniqueCoverage: 24, effectiveness: 0.63, gaps: 7, priority: "high" },
    ];
  }

  private buildThreatAnalysis(): Array<{
    threatId: string;
    threatName: string;
    category: string;
    severity: string;
    techniques: Array<{
      techniqueId: string;
      techniqueName: string;
      tactic: string;
      isCovered: boolean;
      effectiveness: string;
    }>;
    residualRisk: number;
    coverageScore: number;
  }> {
    return [
      {
        threatId: "apt29",
        threatName: "APT29 凭证窃取活动",
        category: "APT",
        severity: "critical",
        techniques: [
          { techniqueId: "T1078", techniqueName: "Valid Accounts", tactic: "Defense Evasion", isCovered: true, effectiveness: "high" },
          { techniqueId: "T1110", techniqueName: "Brute Force", tactic: "Credential Access", isCovered: true, effectiveness: "medium" },
          { techniqueId: "T1555", techniqueName: "Credentials from Password Stores", tactic: "Credential Access", isCovered: false, effectiveness: "low" },
        ],
        residualRisk: 0.41,
        coverageScore: 0.72,
      },
      {
        threatId: "ransomware",
        threatName: "勒索软件破坏活动",
        category: "Ransomware",
        severity: "high",
        techniques: [
          { techniqueId: "T1486", techniqueName: "Data Encrypted for Impact", tactic: "Impact", isCovered: true, effectiveness: "high" },
          { techniqueId: "T1490", techniqueName: "Inhibit System Recovery", tactic: "Impact", isCovered: false, effectiveness: "low" },
        ],
        residualRisk: 0.54,
        coverageScore: 0.61,
      },
    ];
  }

  private registerHandlers(): void {
    this.handlers.set("ping", async () => ({ pong: true }));

    this.handlers.set("status", async () => ({
      version: "1.0.0",
      uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
      skills: this.skillLoader.count(),
      config: Object.keys(this.configManager.getAll()).length,
    }));

    this.handlers.set("skills/list", async () => ({
      skills: this.skillLoader.getAll().map((s) => ({
        name: s.name,
        description: s.description,
        source: s.source,
      })),
    }));

    this.handlers.set("config/get", async (params) => {
      const p = params as { key?: string } | undefined;
      const value = p?.key ? this.configManager.get(p.key) : this.configManager.getAll();
      return { value };
    });

    this.handlers.set("config/set", async (params) => {
      const p = params as { key: string; value: unknown };
      await this.configManager.set(p.key, p.value);
      return { success: true };
    });

    this.handlers.set("graph/nodes", async () => {
      const graph = this.buildKnowledgeGraphData();
      return {
        nodes: graph.nodes,
      };
    });

    this.handlers.set("graph/edges", async () => {
      const graph = this.buildKnowledgeGraphData();
      return {
        edges: graph.edges,
      };
    });

    this.handlers.set("remediation/list", async () => {
      return {
        tasks: [
          { id: "1", title: "修复SQL注入漏洞", status: "in_progress", priority: "critical" },
          { id: "2", title: "更新访问控制策略", status: "pending", priority: "high" },
          { id: "3", title: "完成渗透测试", status: "completed", priority: "medium" },
        ]
      };
    });

    this.handlers.set("remediation/stats", async () => {
      return {
        total: 12,
        pending: 4,
        in_progress: 3,
        completed: 4,
        verified: 1,
        overdue: 2,
      };
    });
  }

  private createRouter(): Router {
    const handlers = this.handlers;

    return {
      register(method: string, handler: MethodHandler): void {
        handlers.set(method, handler);
      },
      async handle(frame: RequestFrame, ctx: HandlerContext): Promise<ResponseFrame> {
        const handler = handlers.get(frame.method);
        if (!handler) {
          return {
            type: "res",
            id: frame.id,
            ok: false,
            error: { code: "METHOD_NOT_FOUND", message: `Unknown method: ${frame.method}` },
          };
        }

        try {
          const result = await handler(frame.params, ctx);
          return { type: "res", id: frame.id, ok: true, payload: result };
        } catch (error) {
          return {
            type: "res",
            id: frame.id,
            ok: false,
            error: {
              code: "INTERNAL_ERROR",
              message: error instanceof Error ? error.message : "Unknown error",
            },
          };
        }
      },
    };
  }

  async start(): Promise<void> {
    this.startTime = new Date();
    
    const router = this.createRouter();
    this.server = createServer(router as Router & { hasMethod: (m: string) => boolean; getMethods: () => string[] });
    
    this.httpServer = http.createServer(async (req, res) => {
      const url = new URL(req.url ?? "/", `http://localhost:${this.port}`);
      const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };
      
      if (req.method === "OPTIONS") {
        res.writeHead(204, { "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" });
        res.end();
        return;
      }
      
      if (url.pathname === "/health") {
        res.writeHead(200, headers);
        res.end(JSON.stringify({ status: "ok", version: "1.0.0", uptime: Date.now() - (this.startTime?.getTime() ?? Date.now()) }));
        return;
      }
      
      if (url.pathname === "/" || url.pathname === "/api") {
        if (this.webDistDir && fs.existsSync(path.join(this.webDistDir, "index.html"))) {
          const indexPath = path.join(this.webDistDir, "index.html");
          const content = fs.readFileSync(indexPath, "utf-8");
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(content);
          return;
        }
        res.writeHead(200, headers);
        res.end(JSON.stringify({ name: "Enterprise Security Commander", version: "1.0.0", endpoints: ["/health", "/api/chat", "/api/skills", "/api/knowledge/mitre", "/api/knowledge/scf"] }));
        return;
      }
      
      if (this.webDistDir) {
        let filePath = url.pathname === "/" ? "/index.html" : url.pathname;
        const fullPath = path.join(this.webDistDir, filePath);
        if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
          const ext = path.extname(fullPath);
          const contentTypes: Record<string, string> = {
            ".html": "text/html", ".js": "application/javascript", ".css": "text/css",
            ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg",
            ".svg": "image/svg+xml", ".ico": "image/x-icon"
          };
          const contentType = contentTypes[ext] || "application/octet-stream";
          res.writeHead(200, { "Content-Type": contentType });
          res.end(fs.readFileSync(fullPath));
          return;
        }
      }
      
      if (url.pathname === "/api/knowledge/mitre/stats" && req.method === "GET") {
        const stats = this.mitreLoader?.getStats() ?? { tactics: 0, techniques: 0, groups: 0, mitigations: 0 };
        res.writeHead(200, headers);
        res.end(JSON.stringify({ loaded: this.mitreLoaded, ...stats }));
        return;
      }
      
      if (url.pathname === "/api/knowledge/mitre/tactics" && req.method === "GET") {
        const tactics = this.mitreLoader?.getAllTactics() ?? [];
        res.writeHead(200, headers);
        res.end(JSON.stringify({ tactics, loaded: this.mitreLoaded }));
        return;
      }
      
      if (url.pathname === "/api/knowledge/mitre/techniques" && req.method === "GET") {
        const limit = parseInt(url.searchParams.get("limit") ?? "50");
        const techniques = this.mitreLoader?.getAllTechniques()?.slice(0, limit) ?? [];
        res.writeHead(200, headers);
        res.end(JSON.stringify({ techniques, loaded: this.mitreLoaded, total: techniques.length }));
        return;
      }
      
      if (url.pathname === "/api/knowledge/scf/stats" && req.method === "GET") {
        const stats = this.scfLoader?.getStats() ?? { domains: 0, controls: 0, frameworks: [] };
        res.writeHead(200, headers);
        res.end(JSON.stringify({ loaded: this.scfLoaded, ...stats }));
        return;
      }
      
      if (url.pathname === "/api/knowledge/scf/domains" && req.method === "GET") {
        const domains = this.scfLoader?.getDomains() ?? [];
        res.writeHead(200, headers);
        res.end(JSON.stringify({ domains, loaded: this.scfLoaded }));
        return;
      }
      
      if (url.pathname === "/api/knowledge/scf/controls" && req.method === "GET") {
        const limit = parseInt(url.searchParams.get("limit") ?? "100");
        const offset = parseInt(url.searchParams.get("offset") ?? "0");
        const allControls = this.scfLoader?.getAllControls() ?? [];
        const controls = allControls.slice(offset, offset + limit);
        res.writeHead(200, headers);
        res.end(JSON.stringify({ controls, total: allControls.length, loaded: this.scfLoaded }));
        return;
      }

      // Dimension API endpoints for category details
      if (url.pathname.match(/^\/api\/knowledge\/dimension\/[a-z-]+$/) && req.method === "GET") {
        const dimensionId = url.pathname.split("/").pop();
        const dimensionConfig: Record<string, { file: string; key: string }> = {
          "controls": { file: "scf-20254.json", key: "SCF #" },
          "domains": { file: "scf-domains-principles.json", key: "Domain" },
          "assessment": { file: "assessment-objectives-20254.json", key: "ID" },
          "evidence": { file: "evidence-request-list-20254.json", key: "ERL #" },
          "sources": { file: "authoritative-sources.json", key: "ID" },
          "privacy": { file: "data-privacy-mgmt-principles.json", key: "ID" },
          "risk": { file: "risk-catalog.json", key: "ID" },
          "threat": { file: "threat-catalog.json", key: "ID" },
          "lists": { file: "lists.json", key: "ID" },
        };

        const config = dimensionConfig[dimensionId || ""];

        if (!config) {
          res.writeHead(404, headers);
          res.end(JSON.stringify({ error: "Dimension not found", dimensionId }));
          return;
        }

        try {
          const dataDir = this.projectDataDir;
          const fs = await import("node:fs");
          const path = await import("node:path");
          const filePath = path.join(dataDir, "scf", config.file);

          if (!fs.existsSync(filePath)) {
            res.writeHead(404, headers);
            res.end(JSON.stringify({ error: "File not found", filePath }));
            return;
          }

          const fileContent = fs.readFileSync(filePath, "utf-8");
          const data = JSON.parse(fileContent);

          res.writeHead(200, headers);
          res.end(JSON.stringify({
            dimension: dimensionId,
            file: config.file,
            totalRecords: data.length,
            fields: data.length > 0 ? Object.keys(data[0]) : [],
            records: data
          }));
        } catch (error) {
          console.error(`Error loading dimension ${dimensionId}:`, error);
          res.writeHead(500, headers);
          res.end(JSON.stringify({
            error: "Failed to load dimension data",
            details: error instanceof Error ? error.message : String(error)
          }));
        }
        return;
      }

      // MITRE tactic details endpoint
      if (url.pathname.match(/^\/api\/knowledge\/mitre\/tactics\/[A-Z0-9]+$/) && req.method === "GET") {
        const tacticId = url.pathname.split("/").pop();
        const allTechniques = this.mitreLoader?.getAllTechniques() ?? [];

        // Filter techniques by tactic ID
        const filteredTechniques = allTechniques.filter((technique: any) => {
          if (!technique.tacticIds || !Array.isArray(technique.tacticIds)) return false;
          return technique.tacticIds.includes(tacticId);
        });

        res.writeHead(200, headers);
        res.end(JSON.stringify({
          tactic: tacticId,
          totalTechniques: filteredTechniques.length,
          techniques: filteredTechniques.slice(0, 100) // Return first 100
        }));
        return;
      }

      // Frontend required endpoints
      if (url.pathname === "/api/providers" && req.method === "GET") {
        this.syncProviderManagerWithConfig();
        const configuredProviders = this.getConfiguredLLMProviders();
        const options = configuredProviders
          .filter((provider) => provider.enabled === true)
          .map((provider) => ({
            id: provider.id,
            name: provider.name || provider.id,
          }));
        const stats = this.providerManager.getStats();
        const available = options
          .filter((option) => stats.providers.some((item) => item.name === option.id && item.available))
          .map((option) => option.id);
        const defaultProvider = available[0] || options[0]?.id || "ollama";
        res.writeHead(200, headers);
        res.end(JSON.stringify({ 
          available,
          options,
          default: defaultProvider,
          stats
        }));
        return;
      }
      
      if (url.pathname === "/api/skills" && req.method === "GET") {
        const roleSkills = this.roleSpecs.map((role) => {
          const loadedSkill = this.skillLoader.get(role.skillName);
          return {
            id: role.id,
            name: role.name,
            description: loadedSkill?.metadata?.description || role.description,
            emoji: loadedSkill?.metadata?.openclaw?.emoji || role.emoji,
            role: loadedSkill?.metadata?.openclaw?.role || role.role,
            combination: loadedSkill?.metadata?.openclaw?.combination || role.combination,
          };
        });
        res.writeHead(200, headers);
        res.end(JSON.stringify({ skills: roleSkills }));
        return;
      }
      
      if (url.pathname === "/api/sessions" && req.method === "GET") {
        const sessions = this.sessionManager.getAllSessions().map(s => ({
          id: s.id,
          key: s.key,
          title: s.metadata.title,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
          messageCount: s.messages.length,
        }));
        res.writeHead(200, headers);
        res.end(JSON.stringify({ sessions }));
        return;
      }
      
      if (url.pathname === "/api/sessions" && req.method === "POST") {
        try {
          const body = await this.readRequestBody(req);
          const { title } = (body || {}) as { title?: string };
          const session = await this.sessionManager.createSession({ title });
          res.writeHead(200, headers);
          res.end(JSON.stringify({ sessionKey: session.key, sessionId: session.id }));
        } catch (error) {
          res.writeHead(500, headers);
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }));
        }
        return;
      }
      
      if (url.pathname.match(/^\/api\/sessions\/[a-zA-Z0-9-]+$/) && req.method === "DELETE") {
        const sessionId = url.pathname.split("/api/sessions/")[1];
        const deleted = await this.sessionManager.deleteSession(sessionId);
        res.writeHead(200, headers);
        res.end(JSON.stringify({ success: deleted }));
        return;
      }
      
      if (url.pathname === "/api/chat" && req.method === "POST") {
        try {
          const body = await this.readRequestBody(req);
          const { messages, model, provider: providerName, skill, sessionKey, autoRoute } = (body || {}) as {
            messages?: Array<{ role: string; content: string }>;
            model?: string;
            provider?: string;
            skill?: string;
            sessionKey?: string;
            autoRoute?: boolean;
          };
          
          if (!messages || !Array.isArray(messages) || messages.length === 0) {
            res.writeHead(400, headers);
            res.end(JSON.stringify({ error: "Missing or invalid 'messages' array" }));
            return;
          }

          const normalizedSkill = this.normalizeRoleId(skill);
          const lastUserMessage = [...messages].reverse().find((msg) => msg.role === "user")?.content || "";
          const identityResponse = normalizedSkill && this.isRoleIdentityQuestion(lastUserMessage)
            ? this.getRoleIdentityResponse(normalizedSkill)
            : undefined;

          if (identityResponse) {
            // Store message in session as direct role identity response.
            let responseSessionKey = sessionKey;
            if (sessionKey) {
              const session = this.sessionManager.getSessionByKey(sessionKey);
              if (session) {
                await this.sessionManager.addMessage(session.id, "user", [{ type: "text", text: lastUserMessage }]);
                await this.sessionManager.addMessage(session.id, "assistant", [{ type: "text", text: identityResponse }], {
                  provider: "role-system",
                  model: "role-capability-resolver",
                });
              }
            } else {
              const session = await this.sessionManager.createSession({ title: lastUserMessage.substring(0, 50) });
              responseSessionKey = session.key;
              await this.sessionManager.addMessage(session.id, "user", [{ type: "text", text: lastUserMessage }]);
              await this.sessionManager.addMessage(session.id, "assistant", [{ type: "text", text: identityResponse }], {
                provider: "role-system",
                model: "role-capability-resolver",
              });
            }

            res.writeHead(200, headers);
            res.end(JSON.stringify({
              content: identityResponse,
              provider: "role-system",
              model: "role-capability-resolver",
              sessionKey: responseSessionKey,
            }));
            return;
          }
          
          // Auto-routing based on query content
          let routing: { taskCategory: string; reason: string } | undefined;
          let selectedProvider = providerName;
          let selectedModel = model;

          // Apply role-level binding when request does not explicitly select provider/model.
          const aiExpertConfig = this.getAIExpertConfig();
          const roleBinding = normalizedSkill
            ? aiExpertConfig.bindings.find((item) => item.roleId === normalizedSkill)
            : undefined;
          const activeBinding = aiExpertConfig.mode === "shared" ? aiExpertConfig.shared : roleBinding;
          if (!selectedProvider && activeBinding?.providerId) {
            selectedProvider = activeBinding.providerId;
          }
          if (!selectedModel && activeBinding?.model) {
            selectedModel = activeBinding.model;
          }

          const shouldAutoRoute = autoRoute && !selectedProvider;
          if (shouldAutoRoute) {
            const lastMessage = messages[messages.length - 1]?.content || "";
            const category = this.detectTaskCategory(lastMessage, normalizedSkill);
            const routeResult = this.providerManager.route(category);
            selectedProvider = routeResult.provider;
            selectedModel = routeResult.model || selectedModel;
            routing = {
              taskCategory: category,
              reason: `Auto-routed to ${selectedProvider} based on ${category} task`,
            };
          }
          
          const roleSystemPrompt = this.getRoleSkillSummary(normalizedSkill);
          const typedMessages = [
            ...(roleSystemPrompt ? [{ role: "system", content: roleSystemPrompt } as ChatMessage] : []),
            ...(messages as ChatMessage[]),
          ];
          const response = await this.providerManager.chat(
            { messages: typedMessages, model: selectedModel },
            selectedProvider
          );
          
          // Store message in session if sessionKey provided
          let responseSessionKey = sessionKey;
          if (sessionKey) {
            const session = this.sessionManager.getSessionByKey(sessionKey);
            if (session) {
              await this.sessionManager.addMessage(session.id, "user", [{ type: "text", text: messages[messages.length - 1]?.content || "" }]);
              await this.sessionManager.addMessage(session.id, "assistant", [{ type: "text", text: response.content }], {
                provider: selectedProvider,
                model: response.model,
              });
            }
          } else {
            // Auto-create session
            const session = await this.sessionManager.createSession({ title: messages[0]?.content?.substring(0, 50) });
            responseSessionKey = session.key;
            await this.sessionManager.addMessage(session.id, "user", [{ type: "text", text: messages[messages.length - 1]?.content || "" }]);
            await this.sessionManager.addMessage(session.id, "assistant", [{ type: "text", text: response.content }], {
              provider: selectedProvider,
              model: response.model,
            });
          }
          
          res.writeHead(200, headers);
          res.end(JSON.stringify({ 
            content: response.content, 
            model: response.model,
            provider: selectedProvider,
            sessionKey: responseSessionKey,
            routing,
          }));
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          res.writeHead(500, headers);
          res.end(JSON.stringify({ error: message }));
        }
        return;
      }
      
      if (url.pathname === "/api/feedback" && req.method === "POST") {
        try {
          const body = await this.readRequestBody(req);
          const { sessionId, messageId, skill, query, response, rating, provider, model, taskCategory } = (body || {}) as {
            sessionId?: string;
            messageId?: string;
            skill?: string;
            query?: string;
            response?: string;
            rating?: "positive" | "negative" | "neutral";
            provider?: string;
            model?: string;
            taskCategory?: string;
          };
          
          const feedback = await this.learningManager.recordFeedback({
            sessionId: sessionId || "anonymous",
            messageId: messageId || `msg-${Date.now()}`,
            skill: skill || "general",
            query: query || "",
            response: response || "",
            rating: rating || "neutral",
            provider: provider || "unknown",
            model: model || "unknown",
            taskCategory: taskCategory || "general-chat",
          });
          
          res.writeHead(200, headers);
          res.end(JSON.stringify({ success: true, feedbackId: feedback.id }));
        } catch (error) {
          res.writeHead(500, headers);
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }));
        }
        return;
      }
      
      if (url.pathname === "/api/learning/stats" && req.method === "GET") {
        const stats = this.learningManager.getLearningStats();
        res.writeHead(200, headers);
        res.end(JSON.stringify(stats));
        return;
      }
      
      if (url.pathname === "/api/learning/patterns" && req.method === "GET") {
        const skill = url.searchParams.get("skill") || undefined;
        const patterns = this.learningManager.getPatterns(skill);
        res.writeHead(200, headers);
        res.end(JSON.stringify({ patterns }));
        return;
      }

      if (url.pathname === "/api/graph/stats" && req.method === "GET") {
        const stats = this.buildGraphStats();
        res.writeHead(200, headers);
        res.end(JSON.stringify(stats));
        return;
      }

      if (url.pathname === "/api/graph/attack-chains" && req.method === "GET") {
        const limit = parseInt(url.searchParams.get("limit") ?? "50");
        const chains = this.buildAttackChains(limit);
        res.writeHead(200, headers);
        res.end(JSON.stringify({ chains }));
        return;
      }

      if (url.pathname === "/api/graph/control-coverage" && req.method === "GET") {
        const coverage = this.buildControlCoverage();
        res.writeHead(200, headers);
        res.end(JSON.stringify({ coverage }));
        return;
      }

      if (url.pathname === "/api/graph/scf-mitre-coverage" && req.method === "GET") {
        const graph = this.buildSCFMITRECoverageGraph();
        res.writeHead(200, headers);
        res.end(JSON.stringify({ graph }));
        return;
      }

      if (url.pathname === "/api/graph/attack-path-control" && req.method === "GET") {
        const graph = this.buildAttackPathControlGraph();
        res.writeHead(200, headers);
        res.end(JSON.stringify({ graph }));
        return;
      }

      if (url.pathname === "/api/graph/defense-in-depth" && req.method === "GET") {
        const graph = this.buildDefenseInDepthGraph();
        res.writeHead(200, headers);
        res.end(JSON.stringify({ graph }));
        return;
      }

      if (url.pathname === "/api/graph/scf-mitre-mappings" && req.method === "GET") {
        const mappings = this.buildSCFMITREMappings();
        res.writeHead(200, headers);
        res.end(JSON.stringify({ mappings }));
        return;
      }

      if (url.pathname === "/api/graph/domain-coverage" && req.method === "GET") {
        const domains = this.buildDomainCoverage();
        res.writeHead(200, headers);
        res.end(JSON.stringify({ domains }));
        return;
      }

      if (url.pathname === "/api/graph/threat-analysis" && req.method === "GET") {
        const analysis = this.buildThreatAnalysis();
        res.writeHead(200, headers);
        res.end(JSON.stringify({ analysis }));
        return;
      }
      
      if (url.pathname === "/api/graph/nodes" && req.method === "GET") {
        const graph = this.buildKnowledgeGraphData();
        res.writeHead(200, headers);
        res.end(JSON.stringify({
          nodes: graph.nodes,
        }));
        return;
      }
      
      if (url.pathname === "/api/graph/edges" && req.method === "GET") {
        const graph = this.buildKnowledgeGraphData();
        res.writeHead(200, headers);
        res.end(JSON.stringify({
          edges: graph.edges,
        }));
        return;
      }
      
      if (url.pathname === "/api/remediation/list" && req.method === "GET") {
        res.writeHead(200, headers);
        res.end(JSON.stringify({
          tasks: [
            { id: "1", title: "Patch CVE-2024-1234", status: "pending", priority: "high" },
            { id: "2", title: "Update firewall rules", status: "in_progress", priority: "medium" },
            { id: "3", title: "Review access logs", status: "completed", priority: "low" },
          ]
        }));
        return;
      }
      
      if (url.pathname === "/api/market/skills" && req.method === "GET") {
        const limit = parseInt(url.searchParams.get("limit") ?? "20");
        const offset = parseInt(url.searchParams.get("offset") ?? "0");
        const query = url.searchParams.get("q") || url.searchParams.get("query") || "";
        const result = this.marketService.search({ query: query || undefined, limit, offset });
        res.writeHead(200, headers);
        res.end(JSON.stringify(result));
        return;
      }
      
      if (url.pathname.startsWith("/api/market/skills/") && req.method === "GET") {
        const skillId = url.pathname.split("/api/market/skills/")[1]?.split("/")[0];
        if (skillId) {
          const skill = this.marketService.getSkill(skillId);
          if (skill) {
            res.writeHead(200, headers);
            res.end(JSON.stringify(skill));
            return;
          }
        }
      }
      
      // Skills Installation API
      if (url.pathname.match(/^\/api\/market\/skills\/[^/]+\/install$/) && req.method === "POST") {
        const skillId = url.pathname.split("/")[4];
        try {
          const result = await this.marketService.install(skillId);
          res.writeHead(200, headers);
          res.end(JSON.stringify(result));
        } catch (error) {
          res.writeHead(500, headers);
          res.end(JSON.stringify({ success: false, message: error instanceof Error ? error.message : "Install failed" }));
        }
        return;
      }
      
      if (url.pathname.match(/^\/api\/market\/skills\/[^/]+\/uninstall$/) && req.method === "POST") {
        const skillId = url.pathname.split("/")[4];
        try {
          const result = await this.marketService.uninstall(skillId);
          res.writeHead(200, headers);
          res.end(JSON.stringify(result));
        } catch (error) {
          res.writeHead(500, headers);
          res.end(JSON.stringify({ success: false, message: error instanceof Error ? error.message : "Uninstall failed" }));
        }
        return;
      }
      
      if (url.pathname.match(/^\/api\/market\/skills\/[^/]+\/update$/) && req.method === "POST") {
        const skillId = url.pathname.split("/")[4];
        try {
          const result = await this.marketService.update(skillId);
          res.writeHead(200, headers);
          res.end(JSON.stringify(result));
        } catch (error) {
          res.writeHead(500, headers);
          res.end(JSON.stringify({ success: false, message: error instanceof Error ? error.message : "Update failed" }));
        }
        return;
      }
      
      // Get installed skills
      if (url.pathname === "/api/skills/installed" && req.method === "GET") {
        const allSkills = await this.marketService.search({ limit: 100 });
        const installed = allSkills.skills.filter(s => s.installed);
        res.writeHead(200, headers);
        res.end(JSON.stringify({ skills: installed }));
        return;
      }
      
      // Get skill categories
      if (url.pathname === "/api/skills/categories" && req.method === "GET") {
        res.writeHead(200, headers);
        res.end(JSON.stringify({
          categories: [
            { id: "security", name: "安全防护", count: 0 },
            { id: "compliance", name: "合规管理", count: 0 },
            { id: "analysis", name: "分析工具", count: 0 },
            { id: "automation", name: "自动化", count: 0 },
            { id: "red-team", name: "红队工具", count: 0 },
            { id: "blue-team", name: "蓝队工具", count: 0 },
            { id: "forensics", name: "取证分析", count: 0 },
            { id: "threat-intel", name: "威胁情报", count: 0 },
          ]
        }));
        return;
      }
      
      // Threat Intelligence API
      if (url.pathname === "/api/threatintel/actors" && req.method === "GET") {
        res.writeHead(200, headers);
        res.end(JSON.stringify({
          actors: [
            {
              id: "apt29",
              name: "APT29 (Cozy Bear)",
              aliases: ["Cozy Bear", "The Dukes", "Nobelium"],
              country: "Russia",
              motivation: "Espionage",
              firstSeen: "2008",
              lastSeen: "2024",
              threatLevel: "critical",
              description: "APT29 is a threat group attributed to Russia's Foreign Intelligence Service (SVR).",
              techniques: ["T1566.001", "T1078", "T1110", "T1021.001", "T1055", "T1003"],
              iocs: [
                { id: "1", type: "ip", value: "185.141.63.120", confidence: 95, firstSeen: "2024-01-15", lastSeen: "2024-02-20", tags: ["C2", "phishing"] }
              ],
              campaigns: [
                { id: "1", name: "SolarWinds Supply Chain", startDate: "2020-03", endDate: "2021-07", targets: ["US Government"], sectors: ["Government", "Technology"], status: "finished" }
              ]
            },
            {
              id: "apt41",
              name: "APT41 (Winnti Group)",
              aliases: ["Winnti", "Barium", "Double Dragon"],
              country: "China",
              motivation: "Espionage & Financial",
              firstSeen: "2007",
              lastSeen: "2024",
              threatLevel: "critical",
              description: "APT41 is a prolific Chinese state-sponsored threat group.",
              techniques: ["T1195.002", "T1199", "T1134", "T1566.002", "T1059", "T1071"],
              iocs: [],
              campaigns: []
            },
            {
              id: "lockbit",
              name: "LockBit 3.0",
              aliases: ["LockBit Black", "ABCD"],
              country: "Russia",
              motivation: "Financial",
              firstSeen: "2019-09",
              lastSeen: "2024",
              threatLevel: "high",
              description: "LockBit is one of the most prolific ransomware-as-a-service operations.",
              techniques: ["T1486", "T1566.001", "T1190", "T1133", "T1021", "T1048"],
              iocs: [],
              campaigns: []
            }
          ]
        }));
        return;
      }
      
      if (url.pathname === "/api/threatintel/events" && req.method === "GET") {
        res.writeHead(200, headers);
        res.end(JSON.stringify({
          events: [
            { id: "1", type: "detection", title: "新IOC发现", description: "检测到APT29相关新C2服务器", timestamp: Date.now() - 3600000, severity: "high" },
            { id: "2", type: "alert", title: "威胁活动增加", description: "LockBit勒索软件攻击活动显著上升", timestamp: Date.now() - 7200000, severity: "critical" },
            { id: "3", type: "update", title: "威胁情报更新", description: "MITRE ATT&CK映射已更新", timestamp: Date.now() - 14400000, severity: "medium" }
          ]
        }));
        return;
      }
      
      // Compliance API
      if (url.pathname === "/api/compliance/frameworks" && req.method === "GET") {
        res.writeHead(200, headers);
        res.end(JSON.stringify({
          frameworks: [
            { id: "iso27001", name: "ISO 27001:2022", version: "2022", totalControls: 93, compliantControls: 72, partiallyCompliant: 14, nonCompliant: 7, lastAssessment: "2024-01-15", nextAssessment: "2024-07-15", status: "partially_compliant" },
            { id: "gdpr", name: "GDPR", version: "2018", totalControls: 99, compliantControls: 85, partiallyCompliant: 10, nonCompliant: 4, lastAssessment: "2024-02-01", nextAssessment: "2024-08-01", status: "partially_compliant" },
            { id: "nist", name: "NIST CSF", version: "2.0", totalControls: 108, compliantControls: 89, partiallyCompliant: 12, nonCompliant: 7, lastAssessment: "2024-01-20", nextAssessment: "2024-07-20", status: "partially_compliant" },
            { id: "soc2", name: "SOC 2 Type II", version: "2017", totalControls: 125, compliantControls: 110, partiallyCompliant: 10, nonCompliant: 5, lastAssessment: "2024-02-10", nextAssessment: "2024-08-10", status: "compliant" }
          ]
        }));
        return;
      }
      
      if (url.pathname === "/api/compliance/controls" && req.method === "GET") {
        const frameworkId = url.searchParams.get("frameworkId");
        res.writeHead(200, headers);
        res.end(JSON.stringify({
          controls: [
            { id: "1", frameworkId: frameworkId || "iso27001", controlId: "A.5.1", controlName: "信息安全方针", category: "组织", status: "compliant", score: 100, findings: [] },
            { id: "2", frameworkId: frameworkId || "iso27001", controlId: "A.5.2", controlName: "信息安全管理职责", category: "组织", status: "compliant", score: 95, findings: [] },
            { id: "3", frameworkId: frameworkId || "iso27001", controlId: "A.6.1.2", controlName: "信息安全职责分配", category: "组织", status: "partially_compliant", score: 70, findings: ["部分部门未明确信息安全负责人"], remediation: "在所有部门指定信息安全代表", dueDate: "2024-03-15", owner: "安全部" },
            { id: "4", frameworkId: frameworkId || "iso27001", controlId: "A.8.1.1", controlName: "资产清单", category: "资产管理", status: "non_compliant", score: 40, findings: ["资产清单不完整", "未定期更新"], remediation: "建立完整的资产管理系统", dueDate: "2024-02-28", owner: "IT部" }
          ]
        }));
        return;
      }
      
      if (url.pathname === "/api/compliance/gaps" && req.method === "GET") {
        res.writeHead(200, headers);
        res.end(JSON.stringify({
          gaps: [
            { category: "访问控制", total: 15, gaps: 3, percentage: 80 },
            { category: "加密", total: 10, gaps: 4, percentage: 60 },
            { category: "资产管理", total: 12, gaps: 5, percentage: 58 },
            { category: "事件响应", total: 8, gaps: 2, percentage: 75 },
            { category: "业务连续性", total: 6, gaps: 1, percentage: 83 },
            { category: "人员安全", total: 10, gaps: 2, percentage: 80 }
          ]
        }));
        return;
      }
      
      // Config API - Providers
      if (url.pathname === "/api/config/providers" && req.method === "GET") {
        const providers = this.configManager.get("providers") || [];
        res.writeHead(200, headers);
        res.end(JSON.stringify({ providers }));
        return;
      }
      
      if (url.pathname === "/api/config/providers" && req.method === "POST") {
        try {
          const body = await this.readRequestBody(req);
          const { providers } = (body || {}) as { providers?: unknown[] };
          if (providers) {
            await this.configManager.set("providers", providers);
          }
          res.writeHead(200, headers);
          res.end(JSON.stringify({ success: true }));
        } catch (error) {
          res.writeHead(500, headers);
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }));
        }
        return;
      }
      
      // LLM Providers API
      if (url.pathname === "/api/llm/providers" && req.method === "GET") {
        const providers = this.configManager.get("llmProviders") || this.defaultProviders;
        res.writeHead(200, headers);
        res.end(JSON.stringify({ providers }));
        return;
      }
      
      if (url.pathname === "/api/llm/providers" && req.method === "POST") {
        try {
          const body = await this.readRequestBody(req);
          const { providers } = (body || {}) as { providers?: unknown[] };
          if (providers) {
            await this.configManager.set("llmProviders", providers);
            this.syncProviderManagerWithConfig();
          }
          res.writeHead(200, headers);
          res.end(JSON.stringify({ success: true }));
        } catch (error) {
          res.writeHead(500, headers);
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }));
        }
        return;
      }
      
      if (url.pathname === "/api/llm/providers/add" && req.method === "POST") {
        try {
          const body = await this.readRequestBody(req);
          const newProvider = (body || {}) as { 
            id?: string;
            name?: string;
            type?: 'local' | 'cloud';
            enabled?: boolean;
            baseUrl?: string;
            apiKey?: string;
            model?: string;
          };
          
          if (!newProvider.id || !newProvider.name) {
            res.writeHead(400, headers);
            res.end(JSON.stringify({ error: "Provider ID and name are required" }));
            return;
          }
          
          const existingProviders = this.configManager.get("llmProviders") as any[] || this.defaultProviders;
          const updatedProviders = [...existingProviders, {
            ...newProvider,
            status: "disconnected",
            isCustom: true,
            supportsCustomBaseUrl: true,
            availableModels: []
          }];
          
          await this.configManager.set("llmProviders", updatedProviders);
          this.syncProviderManagerWithConfig();
          res.writeHead(200, headers);
          res.end(JSON.stringify({ success: true, provider: newProvider }));
        } catch (error) {
          res.writeHead(500, headers);
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }));
        }
        return;
      }
      
      if (url.pathname.match(/^\/api\/llm\/providers\/[^/]+$/) && req.method === "DELETE") {
        try {
          const providerId = url.pathname.split("/api/llm/providers/")[1];
          const existingProviders = this.configManager.get("llmProviders") as any[] || this.defaultProviders;
          const provider = existingProviders.find((p: any) => p.id === providerId);
          
          if (!provider) {
            res.writeHead(404, headers);
            res.end(JSON.stringify({ error: "Provider not found" }));
            return;
          }
          
          if (!provider.isCustom) {
            res.writeHead(400, headers);
            res.end(JSON.stringify({ error: "Cannot delete default provider" }));
            return;
          }
          
          const updatedProviders = existingProviders.filter((p: any) => p.id !== providerId);
          await this.configManager.set("llmProviders", updatedProviders);
          this.syncProviderManagerWithConfig();
          res.writeHead(200, headers);
          res.end(JSON.stringify({ success: true }));
        } catch (error) {
          res.writeHead(500, headers);
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }));
        }
        return;
      }
      
      // Config API - System
      
      // Config API - System
      if (url.pathname === "/api/config/system" && req.method === "GET") {
        const config = this.configManager.get("system") || {
          sessionTimeout: 30,
          maxHistoryDays: 90,
          enableWebSocket: true,
          enableNotifications: true,
          logLevel: "info",
          language: "zh-CN"
        };
        res.writeHead(200, headers);
        res.end(JSON.stringify({ config }));
        return;
      }
      
      if (url.pathname === "/api/config/system" && req.method === "POST") {
        try {
          const body = await this.readRequestBody(req);
          const { config } = (body || {}) as { config?: Record<string, unknown> };
          if (config) {
            await this.configManager.set("system", config);
          }
          res.writeHead(200, headers);
          res.end(JSON.stringify({ success: true }));
        } catch (error) {
          res.writeHead(500, headers);
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }));
        }
        return;
      }

      // Config API - AI Expert Role Binding
      if (url.pathname === "/api/config/ai-expert" && req.method === "GET") {
        const config = this.getAIExpertConfig();
        res.writeHead(200, headers);
        res.end(JSON.stringify({ config }));
        return;
      }

      if (url.pathname === "/api/config/ai-expert" && req.method === "POST") {
        try {
          const body = await this.readRequestBody(req);
          const { config } = (body || {}) as { config?: unknown };
          if (config !== undefined) {
            const normalized = this.normalizeAIExpertConfig(config);
            await this.configManager.set("aiExpertConfig", normalized);
          }
          res.writeHead(200, headers);
          res.end(JSON.stringify({ success: true, config: this.getAIExpertConfig() }));
        } catch (error) {
          res.writeHead(500, headers);
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }));
        }
        return;
      }
      
      // Config API - Notification Channels
      if (url.pathname === "/api/config/channels" && req.method === "GET") {
        const channels = this.configManager.get("notificationChannels") || [];
        res.writeHead(200, headers);
        res.end(JSON.stringify({ channels }));
        return;
      }
      
      if (url.pathname === "/api/config/channels" && req.method === "POST") {
        try {
          const body = await this.readRequestBody(req);
          const { channels } = (body || {}) as { channels?: unknown[] };
          if (channels) {
            await this.configManager.set("notificationChannels", channels);
          }
          res.writeHead(200, headers);
          res.end(JSON.stringify({ success: true }));
        } catch (error) {
          res.writeHead(500, headers);
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }));
        }
        return;
      }
      
      // Provider Test API
      if (url.pathname === "/api/providers/test" && req.method === "POST") {
        try {
          const body = await this.readRequestBody(req);
          const { provider, baseUrl, apiKey } = (body || {}) as { 
            provider?: string; 
            baseUrl?: string;
            apiKey?: string;
          };
          
          if (!provider) {
            res.writeHead(400, headers);
            res.end(JSON.stringify({ success: false, message: "Provider ID required" }));
            return;
          }

          const providerId = provider.toLowerCase();
          const normalizedBaseUrl = baseUrl?.trim() ? this.normalizeBaseUrl(baseUrl.trim()) : "";
          const fallbackModels = this.getProviderModelFallback(providerId);
          
          if (providerId === "ollama") {
            // Use provided baseUrl or default
            const testUrl = baseUrl || "http://localhost:11434";
            try {
              const response = await fetch(`${testUrl}/api/tags`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                signal: AbortSignal.timeout(5000) // 5 second timeout
              });
              if (response.ok) {
                const data = await response.json() as { models?: Array<{name: string}> };
                const dynamicModels = data.models?.map(m => m.name) || [];
                const models = this.mergeModelList(dynamicModels, fallbackModels);
                res.writeHead(200, headers);
                res.end(JSON.stringify({ 
                  success: true, 
                  message: `连接成功，可用模型: ${models.slice(0, 3).join(", ")}${models.length > 3 ? "..." : ""}`,
                  models: models
                }));
              } else {
                res.writeHead(200, headers);
                res.end(JSON.stringify({ success: false, message: `连接失败: HTTP ${response.status} - 请检查Ollama是否运行在 ${testUrl}` }));
              }
            } catch (e) {
              const errorMsg = e instanceof Error ? e.message : "网络错误";
              let hint = "";
              if (errorMsg.includes("fetch") || errorMsg.includes("network") || errorMsg.includes("ECONNREFUSED")) {
                hint = " - 请确保Ollama正在运行: ollama serve";
              }
              res.writeHead(200, headers);
              res.end(JSON.stringify({ success: false, message: `连接失败: ${testUrl}${hint}` }));
            }
          } else if (providerId === "openai" || providerId === "deepseek" || providerId === "moonshot") {
            const testKey = apiKey;
            if (!testKey) {
              res.writeHead(200, headers);
              res.end(JSON.stringify({ success: false, message: "请先配置API Key" }));
              return;
            }

            const defaultApiBaseMap: Record<string, string> = {
              openai: "https://api.openai.com/v1",
              deepseek: "https://api.deepseek.com/v1",
              moonshot: "https://api.moonshot.cn/v1",
            };

            const modelEndpoint = `${normalizedBaseUrl || defaultApiBaseMap[providerId]}/models`;

            try {
              const dynamicModels = await this.fetchModelListFromEndpoint(modelEndpoint, {
                Authorization: `Bearer ${testKey}`,
                Accept: "application/json",
              });
              const models = this.mergeModelList(dynamicModels, fallbackModels);

              if (models.length > 0) {
                res.writeHead(200, headers);
                res.end(JSON.stringify({
                  success: true,
                  message: `API Key验证成功，识别到 ${models.length} 个可用模型`,
                  models,
                }));
              } else {
                res.writeHead(200, headers);
                res.end(JSON.stringify({
                  success: true,
                  message: "API Key验证成功，暂未识别到模型清单",
                  models,
                }));
              }
            } catch (e) {
              const errorMessage = e instanceof Error ? e.message : "网络错误";
              const isAuthError = /401|403|unauthorized|forbidden/i.test(errorMessage);

              if (isAuthError) {
                res.writeHead(200, headers);
                res.end(JSON.stringify({ success: false, message: "API Key无效或权限不足" }));
                return;
              }

              const models = this.mergeModelList([], fallbackModels);
              res.writeHead(200, headers);
              res.end(JSON.stringify({
                success: true,
                message: `连接验证完成（在线模型拉取失败: ${errorMessage}），已提供推荐模型清单`,
                models,
              }));
            }
          } else if (providerId === "anthropic") {
            // Test Anthropic connection
            const testKey = apiKey;
            if (!testKey) {
              res.writeHead(200, headers);
              res.end(JSON.stringify({ success: false, message: "请先配置API Key" }));
              return;
            }

            if (!testKey.startsWith("sk-ant-")) {
              res.writeHead(200, headers);
              res.end(JSON.stringify({ success: false, message: "API Key格式无效，应以sk-ant-开头" }));
              return;
            }

            let dynamicModels: string[] = [];
            try {
              dynamicModels = await this.fetchModelListFromEndpoint("https://api.anthropic.com/v1/models", {
                "x-api-key": testKey,
                "anthropic-version": "2023-06-01",
                Accept: "application/json",
              });
            } catch {
              // Keep fallback models if upstream endpoint is unavailable.
            }

            const models = this.mergeModelList(dynamicModels, fallbackModels);
            res.writeHead(200, headers);
            res.end(JSON.stringify({
              success: true,
              message: dynamicModels.length > 0
                ? `API Key验证成功，识别到 ${dynamicModels.length} 个模型`
                : "API Key格式正确，已提供推荐模型清单",
              models,
            }));
          } else if (providerId === "zhipu" || providerId === "minimax") {
            // Test Zhipu / MiniMax connection
            const testKey = apiKey;
            if (!testKey) {
              res.writeHead(200, headers);
              res.end(JSON.stringify({ success: false, message: "请先配置API Key" }));
              return;
            }

            const keyFormatOk = providerId === "minimax" ? testKey.length > 20 : testKey.length > 10;
            if (!keyFormatOk) {
              res.writeHead(200, headers);
              res.end(JSON.stringify({ success: false, message: "API Key格式无效" }));
              return;
            }

            let dynamicModels: string[] = [];
            if (normalizedBaseUrl) {
              try {
                dynamicModels = await this.fetchModelListFromEndpoint(`${normalizedBaseUrl}/models`, {
                  Authorization: `Bearer ${testKey}`,
                  Accept: "application/json",
                });
              } catch {
                // Fallback to known model list.
              }
            }

            const models = this.mergeModelList(dynamicModels, fallbackModels);
            res.writeHead(200, headers);
            res.end(JSON.stringify({
              success: true,
              message: dynamicModels.length > 0
                ? `API Key验证成功，识别到 ${dynamicModels.length} 个模型`
                : "API Key已配置，已提供推荐模型清单（可填写 Base URL 自动识别完整模型）",
              models,
            }));
          } else {
            // Generic provider - check configuration and try OpenAI-compatible model endpoint
            const hasConfig = !!(baseUrl || apiKey);
            if (!hasConfig) {
              res.writeHead(200, headers);
              res.end(JSON.stringify({
                success: false,
                message: "请先完成配置",
                models: [],
              }));
              return;
            }

            let dynamicModels: string[] = [];
            if (normalizedBaseUrl) {
              const requestHeaders: Record<string, string> = { Accept: "application/json" };
              if (apiKey) requestHeaders.Authorization = `Bearer ${apiKey}`;
              try {
                dynamicModels = await this.fetchModelListFromEndpoint(`${normalizedBaseUrl}/models`, requestHeaders);
              } catch {
                // Keep empty list for unknown providers.
              }
            }

            res.writeHead(200, headers);
            res.end(JSON.stringify({
              success: true,
              message: dynamicModels.length > 0
                ? `配置已就绪，识别到 ${dynamicModels.length} 个模型`
                : "配置已就绪",
              models: dynamicModels,
            }));
          }
        } catch (error) {
          res.writeHead(500, headers);
          res.end(JSON.stringify({ success: false, message: error instanceof Error ? error.message : "Unknown error" }));
        }
        return;
      }
      // Assets API
      if (url.pathname === "/api/assets" && req.method === "GET") {
        const assets = this.configManager.get("assets") || [
          { id: "1", hostname: "web-server-01", ip: "192.168.1.10", os: "Ubuntu 22.04", type: "server", risk: 75, status: "active" },
          { id: "2", hostname: "db-master-01", ip: "192.168.1.20", os: "CentOS 8", type: "database", risk: 85, status: "active" },
          { id: "3", hostname: "firewall-01", ip: "10.0.0.1", os: "FortiOS", type: "network", risk: 30, status: "active" },
          { id: "4", hostname: "workstation-01", ip: "192.168.1.100", os: "Windows 11", type: "endpoint", risk: 60, status: "active" },
        ];
        res.writeHead(200, headers);
        res.end(JSON.stringify({ assets }));
        return;
      }
      
      // Vulnerabilities API
      if (url.pathname === "/api/vulnerabilities" && req.method === "GET") {
        const vulnerabilities = this.configManager.get("vulnerabilities") || [
          { id: "1", cve: "CVE-2024-1234", severity: "critical", description: "Remote Code Execution in Apache", status: "open", assetId: "1", discoveredAt: "2024-02-20" },
          { id: "2", cve: "CVE-2024-5678", severity: "high", description: "SQL Injection in Web App", status: "open", assetId: "2", discoveredAt: "2024-02-19" },
          { id: "3", cve: "CVE-2024-9012", severity: "medium", description: "XSS vulnerability", status: "remediated", assetId: "1", discoveredAt: "2024-02-18" },
          { id: "4", cve: "CVE-2024-3456", severity: "high", description: "Privilege Escalation", status: "open", assetId: "4", discoveredAt: "2024-02-21" },
        ];
        res.writeHead(200, headers);
        res.end(JSON.stringify({ vulnerabilities }));
        return;
      }
      
      // Risk Score API
      if (url.pathname === "/api/risk/score" && req.method === "GET") {
        const score = this.configManager.get("riskScore") || {
          overall: 72,
          trend: "improving",
          lastUpdated: new Date().toISOString()
        };
        res.writeHead(200, headers);
        res.end(JSON.stringify(score));
        return;
      }
      
      // Risk Domains API
      if (url.pathname === "/api/risk/domains" && req.method === "GET") {
        const domains = this.configManager.get("riskDomains") || [
          { id: "1", name: "网络安全", score: 75, trend: "improving" },
          { id: "2", name: "数据保护", score: 68, trend: "stable" },
          { id: "3", name: "访问控制", score: 82, trend: "improving" },
          { id: "4", name: "端点安全", score: 70, trend: "declining" },
          { id: "5", name: "合规管理", score: 85, trend: "improving" },
        ];
        res.writeHead(200, headers);
        res.end(JSON.stringify({ domains }));
        return;
      }
      
      // Audit History API
      if (url.pathname === "/api/audit/history" && req.method === "GET") {
        const history = this.configManager.get("auditHistory") || [
          { id: "1", type: "framework", date: "2024-02-15", score: 85, framework: "ISO 27001" },
          { id: "2", type: "control", date: "2024-02-10", score: 78, framework: "NIST CSF" },
          { id: "3", type: "framework", date: "2024-01-20", score: 82, framework: "SOC 2" },
        ];
        res.writeHead(200, headers);
        res.end(JSON.stringify({ history }));
        return;
      }
      
      // Knowledge Update APIs
      if (url.pathname === "/api/knowledge/mitre/update" && req.method === "POST") {
        try {
          await this.loadMITRE();
          res.writeHead(200, headers);
          res.end(JSON.stringify({ success: true, message: "MITRE data updated" }));
        } catch (error) {
          res.writeHead(500, headers);
          res.end(JSON.stringify({ success: false, message: error instanceof Error ? error.message : "Update failed" }));
        }
        return;
      }
      
      if (url.pathname === "/api/knowledge/scf/update" && req.method === "POST") {
        try {
          await this.loadSCF();
          res.writeHead(200, headers);
          res.end(JSON.stringify({ success: true, message: "SCF data updated" }));
        } catch (error) {
          res.writeHead(500, headers);
          res.end(JSON.stringify({ success: false, message: error instanceof Error ? error.message : "Update failed" }));
        }
        return;
      }
      
      // 404 handler
      res.writeHead(404, headers);
      res.end(JSON.stringify({ error: "Not found" }));
    });

    await new Promise<void>((resolve) => {
      this.httpServer!.listen(this.port, this.host, () => {
        console.log(`\n🚀 Gateway started at http://${this.host}:${this.port}`);
        console.log(`   Health: http://localhost:${this.port}/health`);
        console.log(`   Skills: ${this.skillLoader.count()} loaded`);
        console.log();
        resolve();
      });
    });

    this.wsServer = new WebSocketServer({ server: this.httpServer, path: "/ws" });
    this.wsServer.on("connection", (ws: WebSocket) => {
      this.wsClients.add(ws);
      console.log(`WebSocket client connected. Total: ${this.wsClients.size}`);
      
      ws.on("close", () => {
        this.wsClients.delete(ws);
        console.log(`WebSocket client disconnected. Total: ${this.wsClients.size}`);
      });
      
      ws.on("error", (error) => {
        console.error("WebSocket error:", error.message);
        this.wsClients.delete(ws);
      });
      
      ws.send(JSON.stringify({ type: "connected", message: "Welcome to SecuClaw" }));
    });

    await this.server?.start({
      host: this.host,
      port: this.port + 1,
      router,
    });
  }

  broadcast(event: string, data: unknown): void {
    const message = JSON.stringify({ type: event, data, timestamp: Date.now() });
    for (const client of this.wsClients) {
      if (client.readyState === 1) {
        client.send(message);
      }
    }
  }

  async stop(): Promise<void> {
    await this.server?.stop();
    
    for (const client of this.wsClients) {
      client.close();
    }
    this.wsClients.clear();
    this.wsServer?.close();
    
    await new Promise<void>((resolve) => {
      this.httpServer?.close(() => resolve());
    });
    
    this.startTime = null;
    console.log("Gateway stopped");
  }

  getState(): GatewayState {
    return {
      running: this.server !== null,
      port: this.port,
      host: this.host,
      connections: 0,
      startTime: this.startTime,
    };
  }

  registerMethod(method: string, handler: MethodHandler): void {
    this.handlers.set(method, handler);
  }
}
