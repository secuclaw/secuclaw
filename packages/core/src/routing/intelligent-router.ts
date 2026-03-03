import type { ProviderManager } from "../providers/manager.js";

export type TaskCategory =
  | "security-analysis"
  | "threat-intelligence"
  | "code-review"
  | "compliance"
  | "general-chat"
  | "technical-deep-dive"
  | "incident-response"
  | "report-generation";

export interface ModelCapabilities {
  provider: string;
  model: string;
  strengths: TaskCategory[];
  maxTokens: number;
  supportsTools: boolean;
  costTier: "low" | "medium" | "high";
  latencyMs: number;
}

export interface RoutingResult {
  provider: string;
  model: string;
  reason: string;
  taskCategory: TaskCategory;
}

const MODEL_CAPABILITIES: ModelCapabilities[] = [
  {
    provider: "ollama",
    model: "qwen3:8b",
    strengths: ["general-chat", "security-analysis", "code-review"],
    maxTokens: 32000,
    supportsTools: true,
    costTier: "low",
    latencyMs: 1500,
  },
  {
    provider: "zhipu",
    model: "glm-5",
    strengths: ["general-chat", "compliance", "report-generation", "security-analysis"],
    maxTokens: 128000,
    supportsTools: true,
    costTier: "medium",
    latencyMs: 2000,
  },
  {
    provider: "minimax",
    model: "MiniMax-M2.5",
    strengths: ["threat-intelligence", "incident-response", "technical-deep-dive", "security-analysis"],
    maxTokens: 245000,
    supportsTools: true,
    costTier: "medium",
    latencyMs: 1800,
  },
];

const TASK_KEYWORDS: Record<TaskCategory, string[]> = {
  "security-analysis": [
    "漏洞", "vulnerability", "攻击", "attack", "威胁", "threat", "安全", "security",
    "渗透", "penetration", "风险", "risk", "评估", "assessment",
  ],
  "threat-intelligence": [
    "apt", "apt组织", "ioc", "情报", "intelligence", "威胁情报", "malware",
    "恶意软件", "勒索", "ransomware", "钓鱼", "phishing",
  ],
  "code-review": [
    "代码", "code", "审计", "audit", "漏洞代码", "vulnerable code",
    "安全编码", "secure coding", "源码", "source",
  ],
  compliance: [
    "合规", "compliance", "gdpr", "iso", "nist", "pci", "等级保护",
    "audit", "审计", "监管", "regulation",
  ],
  "general-chat": [
    "你好", "hello", "介绍", "introduce", "什么是", "what is",
    "如何", "how to", "帮助", "help",
  ],
  "technical-deep-dive": [
    "原理", "principle", "技术细节", "technical details", "架构", "architecture",
    "实现", "implementation", "深入", "deep dive",
  ],
  "incident-response": [
    "应急", "incident", "响应", "response", "处置", "handling",
    "入侵", "intrusion", "事件", "event", "溯源", "attribution",
  ],
  "report-generation": [
    "报告", "report", "总结", "summary", "文档", "document",
    "汇报", "presentation", "分析报告", "analysis report",
  ],
};

export class IntelligentRouter {
  private providerManager: ProviderManager;
  private models: ModelCapabilities[];
  private defaultProvider: string;

  constructor(providerManager: ProviderManager, defaultProvider: string = "ollama") {
    this.providerManager = providerManager;
    this.defaultProvider = defaultProvider;
    this.models = MODEL_CAPABILITIES;
  }

  classifyTask(query: string): TaskCategory {
    const lowerQuery = query.toLowerCase();
    const scores: Record<TaskCategory, number> = {
      "security-analysis": 0,
      "threat-intelligence": 0,
      "code-review": 0,
      compliance: 0,
      "general-chat": 0,
      "technical-deep-dive": 0,
      "incident-response": 0,
      "report-generation": 0,
    };

    for (const [category, keywords] of Object.entries(TASK_KEYWORDS)) {
      for (const keyword of keywords) {
        if (lowerQuery.includes(keyword.toLowerCase())) {
          scores[category as TaskCategory] += 1;
        }
      }
    }

    let maxScore = 0;
    let bestCategory: TaskCategory = "general-chat";

    for (const [category, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        bestCategory = category as TaskCategory;
      }
    }

    return bestCategory;
  }

  selectBestModel(
    taskCategory: TaskCategory,
    options?: {
      preferSpeed?: boolean;
      preferCost?: boolean;
      requireTools?: boolean;
    }
  ): RoutingResult {
    const availableProviders = this.providerManager.listAvailable();
    
    const availableModels = this.models.filter((m) =>
      availableProviders.includes(m.provider)
    );

    if (availableModels.length === 0) {
      return {
        provider: this.defaultProvider,
        model: "default",
        reason: "No configured models available, using default",
        taskCategory,
      };
    }

    let candidates = availableModels.filter((m) =>
      m.strengths.includes(taskCategory)
    );

    if (candidates.length === 0) {
      candidates = availableModels;
    }

    if (options?.requireTools) {
      candidates = candidates.filter((m) => m.supportsTools);
    }

    if (options?.preferSpeed) {
      candidates.sort((a, b) => a.latencyMs - b.latencyMs);
    } else if (options?.preferCost) {
      const costOrder = { low: 0, medium: 1, high: 2 };
      candidates.sort((a, b) => costOrder[a.costTier] - costOrder[b.costTier]);
    } else {
      const strengthScore = (m: ModelCapabilities) =>
        m.strengths.includes(taskCategory) ? 10 : 0;
      candidates.sort((a, b) => strengthScore(b) - strengthScore(a));
    }

    const selected = candidates[0];

    return {
      provider: selected.provider,
      model: selected.model,
      reason: `Selected ${selected.model} for ${taskCategory} tasks (strengths: ${selected.strengths.join(", ")})`,
      taskCategory,
    };
  }

  route(
    query: string,
    options?: {
      preferSpeed?: boolean;
      preferCost?: boolean;
      requireTools?: boolean;
    }
  ): RoutingResult {
    const taskCategory = this.classifyTask(query);
    return this.selectBestModel(taskCategory, options);
  }

  getModelCapabilities(provider: string): ModelCapabilities | undefined {
    return this.models.find((m) => m.provider === provider);
  }

  getAllModels(): ModelCapabilities[] {
    return [...this.models];
  }
}
