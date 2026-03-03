import { config } from "dotenv";
import { resolve, join } from "path";
import { mkdirSync, existsSync, promises as fsPromises } from "fs";
import { getProviderManager } from "./providers/manager.js";
import { SkillService } from "./skills/service.js";
import { SessionManager } from "./session/manager.js";
import { MemoryManager } from "./memory/manager.js";
import { IntelligentRouter } from "./routing/intelligent-router.js";
import { MITRELoader } from "./knowledge/mitre/loader.js";
import type { MITRETechnique } from "./knowledge/mitre/types.js";
import { SCFLoaderExtended } from "./knowledge/scf/loader-extended.js";
import { LearningManager } from "./learning/manager.js";
import { executeNmapScan, executeHttpProbe, executeDnsLookup } from "./tools/executors/index.js";
import { AgentOrchestrator } from "./orchestration/agent-orchestrator.js";
import { SkillEvolver } from "./learning/skill-evolver.js";
import { AttackSimulator } from "./simulation/engine.js";
import type { Session, SessionMessage } from "./session/types.js";

config({ path: resolve(import.meta.dir, "../../../.env") });

const DATA_DIR = resolve(import.meta.dir, "../../../data");
const SESSIONS_DIR = join(DATA_DIR, "sessions");

if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}
if (!existsSync(SESSIONS_DIR)) {
  mkdirSync(SESSIONS_DIR, { recursive: true });
}

const providerManager = getProviderManager();
const defaultProvider = process.env.LLM_DEFAULT_PROVIDER ?? "ollama";

const skillService = new SkillService(resolve(import.meta.dir, "../../../skills"));
await skillService.initialize();

const sessionManager = new SessionManager({
  dataDir: SESSIONS_DIR,
  maxMessages: 500,
  maxTokens: 30000,
});

const memoryManager = new MemoryManager({
  dataDir: DATA_DIR,
  pruneAfterMs: 30 * 24 * 60 * 60 * 1000,
  indexConfig: {
    enableHybrid: true,
    vectorWeight: 0.4,
    keywordWeight: 0.6,
    enableTemporalDecay: false,
    decayHalfLifeDays: 30,
  },
});

const intelligentRouter = new IntelligentRouter(providerManager, defaultProvider);

const mitreDataPath = join(DATA_DIR, "mitre", "attack-stix-data");
const mitreLoader = new MITRELoader(mitreDataPath);
let mitreLoaded = false;
let mitreStats = { enterprise: 0, mobile: 0, ics: 0 };

async function loadMITREData(): Promise<void> {
  if (mitreLoaded) return;
  
  try {
    const data = await mitreLoader.load();
    mitreStats.enterprise = data.techniques.length;
    mitreLoaded = true;
    console.log(`MITRE ATT&CK loaded: ${data.tactics.length} tactics, ${data.techniques.length} techniques, ${data.groups.length} groups`);
  } catch (err) {
    console.log(`MITRE data load failed:`, err instanceof Error ? err.message : "unknown error");
    mitreLoaded = false;
  }
}

loadMITREData();

const scfDataPath = join(DATA_DIR, "scf");
const scfLoader = new SCFLoaderExtended(scfDataPath);
let scfLoaded = false;
let scfStats = { domains: 0, controls: 0 };

async function loadSCFData(): Promise<void> {
  if (scfLoaded) return;
  try {
    await scfLoader.load();
    const stats = scfLoader.getStats();
    scfStats = stats;
    scfLoaded = true;
    console.log(`SCF loaded: ${stats.domains} domains, ${stats.controls} controls, frameworks: ${stats.frameworks.join(", ")}`);
  } catch (err) {
    console.log("SCF data not available:", err instanceof Error ? err.message : "unknown error");
  }
}

loadSCFData();

const attackSimulator = new AttackSimulator();

const agentOrchestrator = new AgentOrchestrator(
  providerManager,
  skillService,
  sessionManager,
  memoryManager
);

const learningManager = new LearningManager({ dataDir: DATA_DIR });

const skillEvolver = new SkillEvolver(
  {
    skillsDir: resolve(process.cwd(), "skills"),
    minFeedbackCount: 5,
    improvementThreshold: 0.7,
    maxEvolutionHistory: 10,
  },
  learningManager
);

function convertSessionMessagesToChat(sessionMessages: SessionMessage[]): Array<{ role: "user" | "assistant"; content: string }> {
  return sessionMessages
    .filter((msg) => msg.role === "user" || msg.role === "assistant")
    .map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content.map((c) => c.text ?? "").join(""),
    }));
}

async function searchRelevantMemories(query: string, sessionId?: string, limit = 5): Promise<string> {
  try {
    const results = await memoryManager.search({
      query,
      limit,
      sessionId,
    });

    if (results.length === 0) {
      return "";
    }

    const memoryContext = results
      .map((r, i) => `[记忆${i + 1}] ${r.entry.content}`)
      .join("\n");

    return `\n\n[相关历史记忆]\n${memoryContext}\n`;
  } catch {
    return "";
  }
}

const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    };

    if (req.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    if (url.pathname === "/api/ping") {
      return Response.json({ pong: true, ts: Date.now() }, { headers });
    }

    if (url.pathname === "/api/providers") {
      return Response.json({
        default: defaultProvider,
        available: providerManager.listAvailable(),
      }, { headers });
    }

    if (url.pathname === "/api/skills") {
      return Response.json({
        skills: skillService.getAllSkillInfo(),
      }, { headers });
    }

    if (url.pathname === "/api/sessions" && req.method === "GET") {
      const sessions = sessionManager.getAllSessions();
      const sessionList = sessions.map((s: Session) => ({
        id: s.id,
        key: s.key,
        title: s.metadata.title,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        messageCount: s.messages.length,
      }));
      return Response.json({ sessions: sessionList }, { headers });
    }

    if (url.pathname === "/api/sessions" && req.method === "POST") {
      try {
        const body = await req.json() as { title?: string };
        const session = await sessionManager.createSession({ title: body.title });
        return Response.json({
          sessionId: session.id,
          sessionKey: session.key,
          createdAt: session.createdAt,
        }, { headers });
      } catch (err) {
        return Response.json({ error: err instanceof Error ? err.message : "Unknown error" }, { headers });
      }
    }

    if (url.pathname.match(/^\/api\/sessions\/[^/]+$/) && req.method === "DELETE") {
      const sessionId = url.pathname.split("/").pop()!;
      const deleted = await sessionManager.deleteSession(sessionId);
      return Response.json({ deleted }, { headers });
    }

    if (url.pathname === "/api/chat" && req.method === "POST") {
      try {
        const body = await req.json() as {
          messages?: Array<{ role: string; content: string }>;
          provider?: string;
          skill?: string;
          sessionKey?: string;
          saveToMemory?: boolean;
          autoRoute?: boolean;
        };
        const { messages, provider, skill, sessionKey, saveToMemory = true, autoRoute = false } = body;

        if (!messages || !Array.isArray(messages)) {
          return Response.json({ error: "messages array required" }, { headers });
        }

        let session: Session | null = null;
        let historicalMessages: Array<{ role: "user" | "assistant"; content: string }> = [];

        if (sessionKey) {
          const existingSession = sessionManager.getSessionByKey(sessionKey);
          session = existingSession ?? null;
          if (session) {
            historicalMessages = convertSessionMessagesToChat(session.messages);
          } else {
            session = await sessionManager.createSession();
          }
        } else {
          session = await sessionManager.createSession();
        }

        const lastUserMessage = messages.filter((m) => m.role === "user").pop();
        const memoryContext = lastUserMessage
          ? await searchRelevantMemories(lastUserMessage.content, session?.id)
          : "";

        const systemPrompt = skill
          ? skillService.getSystemPrompt(skill)
          : "你是一个企业安全助手，帮助用户解决安全相关问题。";

        const enhancedSystemPrompt = memoryContext
          ? `${systemPrompt}${memoryContext}`
          : systemPrompt;

        const allMessages = [
          { role: "system", content: enhancedSystemPrompt },
          ...historicalMessages,
          ...messages.filter((m) => m.role === "user" || m.role === "assistant") as Array<{ role: "user" | "assistant"; content: string }>,
        ];

        let selectedProvider = provider;
        let routingInfo: { taskCategory: string; reason: string } | undefined;

        if (autoRoute && lastUserMessage) {
          const routing = intelligentRouter.route(lastUserMessage.content);
          selectedProvider = routing.provider;
          routingInfo = {
            taskCategory: routing.taskCategory,
            reason: routing.reason,
          };
        }

        const response = await providerManager.chat({
          messages: allMessages as Array<{ role: "system" | "user" | "assistant"; content: string }>,
        }, selectedProvider);

        if (session && lastUserMessage) {
          await sessionManager.addMessage(session.id, "user", [
            { type: "text", text: lastUserMessage.content },
          ], { provider: selectedProvider ?? defaultProvider });

          await sessionManager.addMessage(session.id, "assistant", [
            { type: "text", text: response.content },
          ], {
            provider: selectedProvider ?? defaultProvider,
            model: response.model,
          });

          if (saveToMemory && lastUserMessage.content.length > 20) {
            await memoryManager.add(
              `用户问: ${lastUserMessage.content}\n助手答: ${response.content.substring(0, 500)}`,
              {
                source: "conversation",
                tags: [skill ?? "general"],
                sessionId: session.id,
                importance: 0.5,
              },
            );
          }
        }

        return Response.json({
          content: response.content,
          model: response.model,
          provider: selectedProvider ?? defaultProvider,
          skill: skill ?? null,
          sessionKey: session?.key,
          sessionId: session?.id,
          routing: routingInfo,
        }, { headers });
      } catch (err) {
        return Response.json({ error: err instanceof Error ? err.message : "Unknown error" }, { headers });
      }
    }

    if (url.pathname === "/api/memory/search" && req.method === "POST") {
      try {
        const body = await req.json() as { query: string; limit?: number };
        const results = await memoryManager.search({
          query: body.query,
          limit: body.limit ?? 10,
        });
        return Response.json({ results }, { headers });
      } catch (err) {
        return Response.json({ error: err instanceof Error ? err.message : "Unknown error" }, { headers });
      }
    }

    if (url.pathname === "/api/knowledge/mitre/search" && req.method === "POST") {
      try {
        const body = await req.json() as { query: string; limit?: number };
        
        if (!mitreLoaded) {
          return Response.json({ results: [], loaded: false, error: "MITRE data not loaded" }, { headers });
        }

        const techniques = mitreLoader.searchTechniques(body.query);
        const results = techniques.slice(0, body.limit ?? 10).map((t: MITRETechnique) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          tacticIds: t.tacticIds,
        }));

        return Response.json({ results, loaded: mitreLoaded, total: techniques.length }, { headers });
      } catch (err) {
        return Response.json({ error: err instanceof Error ? err.message : "Unknown error" }, { headers });
      }
    }

    if (url.pathname === "/api/knowledge/mitre/tactics" && req.method === "GET") {
      if (!mitreLoaded) {
        return Response.json({ tactics: [], loaded: false }, { headers });
      }
      const tactics = mitreLoader.getAllTactics?.() ?? [];
      const stats = mitreLoader.getStats();
      return Response.json({ 
        tactics, 
        stats,
        loaded: mitreLoaded 
      }, { headers });
    }

    if (url.pathname === "/api/knowledge/mitre/techniques" && req.method === "GET") {
      const tacticId = url.searchParams.get("tactic");
      const limit = parseInt(url.searchParams.get("limit") ?? "50");
      if (!mitreLoaded) {
        return Response.json({ techniques: [], loaded: false }, { headers });
      }
      const allTechniques = tacticId 
        ? mitreLoader.getTechniquesByTactic(tacticId)
        : mitreLoader.getAllTechniques?.() ?? mitreLoader.getStats();
      const techniques = Array.isArray(allTechniques) ? allTechniques.slice(0, limit) : [];
      return Response.json({ techniques, loaded: mitreLoaded, total: techniques.length }, { headers });
    }

    if (url.pathname === "/api/knowledge/mitre/stats" && req.method === "GET") {
      const stats = mitreLoader.getStats();
      return Response.json({
        loaded: mitreLoaded,
        ...stats,
      }, { headers });
    }

    if (url.pathname === "/api/knowledge/scf/search" && req.method === "POST") {
      try {
        const body = await req.json() as { query: string; limit?: number };
        
        if (!scfLoaded) {
          return Response.json({ results: [], loaded: false, error: "SCF data not loaded" }, { headers });
        }

        const controls = scfLoader.searchControls(body.query);
        const results = controls.slice(0, body.limit ?? 20);

        return Response.json({ results, loaded: scfLoaded, total: controls.length }, { headers });
      } catch (err) {
        return Response.json({ error: err instanceof Error ? err.message : "Unknown error" }, { headers });
      }
    }

    if (url.pathname === "/api/knowledge/scf/stats" && req.method === "GET") {
      const frameworks = scfLoader.getStats().frameworks || [];
      return Response.json({
        loaded: scfLoaded,
        domains: scfStats.domains,
        controls: scfStats.controls,
        frameworks,
      }, { headers });
    }

    if (url.pathname === "/api/knowledge/scf/domains" && req.method === "GET") {
      const domains = scfLoaded ? scfLoader.getDomains() : [];
      return Response.json({ domains, loaded: scfLoaded }, { headers });
    }

    if (url.pathname === "/api/knowledge/scf/controls" && req.method === "GET") {
      const limit = parseInt(url.searchParams.get("limit") ?? "100");
      const offset = parseInt(url.searchParams.get("offset") ?? "0");
      const allControls = scfLoaded ? scfLoader.getAllControls() : [];
      const controls = allControls.slice(offset, offset + limit);
      return Response.json({ controls, total: allControls.length, loaded: scfLoaded }, { headers });
    }

    if (url.pathname === "/api/knowledge/scf/domain" && req.method === "GET") {
      const code = url.searchParams.get("code");
      if (!code) {
        return Response.json({ error: "code parameter required" }, { headers });
      }
      const domain = scfLoader.getDomain(code);
      return Response.json({ domain }, { headers });
    }

    if (url.pathname === "/api/routing/classify" && req.method === "POST") {
      try {
        const body = await req.json() as { query: string };
        const category = intelligentRouter.classifyTask(body.query);
        const routing = intelligentRouter.selectBestModel(category);
        return Response.json({
          category,
          provider: routing.provider,
          model: routing.model,
          reason: routing.reason,
        }, { headers });
      } catch (err) {
        return Response.json({ error: err instanceof Error ? err.message : "Unknown error" }, { headers });
      }
    }

    if (url.pathname === "/api/feedback" && req.method === "POST") {
      try {
        const body = await req.json() as {
          sessionId: string;
          messageId: string;
          skill: string;
          query: string;
          response: string;
          rating: "positive" | "negative" | "neutral";
          feedback?: string;
          provider: string;
          model: string;
          taskCategory: string;
        };
        
        const record = await learningManager.recordFeedback(body);
        return Response.json({ success: true, id: record.id }, { headers });
      } catch (err) {
        return Response.json({ error: err instanceof Error ? err.message : "Unknown error" }, { headers });
      }
    }

    if (url.pathname === "/api/learning/stats" && req.method === "GET") {
      const stats = learningManager.getLearningStats();
      return Response.json(stats, { headers });
    }

    if (url.pathname === "/api/learning/patterns" && req.method === "GET") {
      const skill = url.searchParams.get("skill") ?? undefined;
      const patterns = learningManager.getPatterns(skill);
      return Response.json({ patterns }, { headers });
    }

    if (url.pathname === "/api/learning/performance" && req.method === "GET") {
      const skill = url.searchParams.get("skill");
      if (!skill) {
        return Response.json({ error: "skill parameter required" }, { headers });
      }
      const performance = learningManager.getSkillPerformance(skill);
      return Response.json(performance, { headers });
    }

    if (url.pathname === "/api/stats" && req.method === "GET") {
      const stats = {
        overallScore: 78,
        threatLevel: "medium",
        activeThreats: 3,
        mitigatedToday: 12,
        pendingActions: 5,
        mitreTechniques: mitreStats.enterprise + mitreStats.mobile + mitreStats.ics,
        scfControls: scfStats.controls,
        scfDomains: scfStats.domains,
        learningStats: learningManager.getLearningStats(),
        providers: providerManager.listAvailable(),
        skills: skillService.getAllSkills().length,
      };
      return Response.json(stats, { headers });
    }

    if (url.pathname === "/api/tools/execute" && req.method === "POST") {
      try {
        const body = await req.json() as {
          tool: string;
          params: Record<string, unknown>;
        };
        
        const { tool, params } = body;
        
        if (tool === "nmap") {
          const result = await executeNmapScan({
            target: params.target as string,
            scanType: params.scanType as string,
            ports: params.ports as string,
            timeout: (params.timeout as number) ?? 120000,
          }, { sessionId: "api", agentId: "api", userId: "api" });
          return Response.json(result, { headers });
        }
        
        if (tool === "httpx") {
          const result = await executeHttpProbe({
            url: params.url as string,
            method: (params.method as string) ?? "GET",
            headers: params.headers as Record<string, string>,
            timeout: (params.timeout as number) ?? 30000,
          }, { sessionId: "api", agentId: "api", userId: "api" });
          return Response.json(result, { headers });
        }
        
        if (tool === "dns") {
          const result = await executeDnsLookup({
            domain: params.domain as string,
            type: (params.type as string) ?? "A",
          }, { sessionId: "api", agentId: "api", userId: "api" });
          return Response.json(result, { headers });
        }
        
        return Response.json({ error: "Unknown tool" }, { headers });
      } catch (err) {
        return Response.json({ error: err instanceof Error ? err.message : "Unknown error" }, { headers });
      }
    }

    if (url.pathname === "/api/orchestration/analyze" && req.method === "POST") {
      try {
        const body = await req.json() as { query: string };
        const analysis = agentOrchestrator.analyzeQuery(body.query);
        const recommendations = agentOrchestrator.getTeamRecommendations(body.query);
        return Response.json({ analysis, recommendations }, { headers });
      } catch (err) {
        return Response.json({ error: err instanceof Error ? err.message : "Unknown error" }, { headers });
      }
    }

    if (url.pathname === "/api/orchestration/plan" && req.method === "POST") {
      try {
        const body = await req.json() as { query: string; teamId?: string };
        const plan = agentOrchestrator.createPlan(body.query, body.teamId);
        return Response.json({ planId: plan.id, tasks: plan.tasks.length, status: plan.status }, { headers });
      } catch (err) {
        return Response.json({ error: err instanceof Error ? err.message : "Unknown error" }, { headers });
      }
    }

    if (url.pathname === "/api/orchestration/execute" && req.method === "POST") {
      try {
        const body = await req.json() as { planId: string };
        const plan = await agentOrchestrator.executePlan(body.planId);
        return Response.json({ 
          planId: plan.id, 
          status: plan.status, 
          results: plan.results.map((r) => ({
            taskId: r.taskId,
            success: r.success,
            result: r.result.substring(0, 500),
          })),
        }, { headers });
      } catch (err) {
        return Response.json({ error: err instanceof Error ? err.message : "Unknown error" }, { headers });
      }
    }

    if (url.pathname === "/api/orchestration/teams" && req.method === "GET") {
      const { SECURITY_TEAMS } = await import("./orchestration/agent-orchestrator.js");
      return Response.json({ teams: SECURITY_TEAMS }, { headers });
    }

    if (url.pathname === "/api/evolution/status" && req.method === "GET") {
      const status = skillEvolver.getAllEvolutionStatus();
      return Response.json({ skills: status }, { headers });
    }

    if (url.pathname === "/api/evolution/analyze" && req.method === "GET") {
      const skillId = url.searchParams.get("skill");
      if (!skillId) {
        return Response.json({ error: "skill parameter required" }, { headers });
      }
      const analysis = skillEvolver.analyzeSkillPerformance(skillId);
      const suggestions = skillEvolver.generateImprovementSuggestions(skillId);
      return Response.json({ analysis, suggestions }, { headers });
    }

    if (url.pathname === "/api/evolution/evolve" && req.method === "POST") {
      try {
        const body = await req.json() as { skillId: string };
      const result = await skillEvolver.evolveSkill(body.skillId);
      return Response.json(result, { headers });
    } catch (err) {
      return Response.json({ error: err instanceof Error ? err.message : "Unknown error" }, { headers });
    }
  }

  if (url.pathname === "/api/graph/nodes" && req.method === "GET") {
    return Response.json({
      nodes: [
        { id: "n1", label: "Web服务器", type: "asset" },
        { id: "n2", label: "数据库", type: "asset" },
        { id: "n3", label: "用户终端", type: "asset" },
        { id: "n4", label: "SQL注入", type: "vulnerability" },
        { id: "n5", label: "XSS漏洞", type: "vulnerability" },
        { id: "n6", label: "弱口令", type: "vulnerability" },
        { id: "n7", label: "APT29组织", type: "threat" },
        { id: "n8", label: "勒索软件", type: "threat" },
        { id: "n9", label: "WAF防护", type: "control" },
        { id: "n10", label: "访问控制", type: "control" },
        { id: "n11", label: "数据加密", type: "control" },
        { id: "n12", label: "安全事件#001", type: "incident" },
        { id: "n13", label: "财务风险", type: "risk" },
        { id: "n14", label: "运维人员", type: "actor" },
      ]
    }, { headers });
  }

  if (url.pathname === "/api/graph/edges" && req.method === "GET") {
    return Response.json({
      edges: [
        { id: "e1", source: "n7", target: "n4", linkType: "exploits" },
        { id: "e2", source: "n7", target: "n5", linkType: "exploits" },
        { id: "e3", source: "n8", target: "n6", linkType: "exploits" },
        { id: "e4", source: "n4", target: "n1", linkType: "affects" },
        { id: "e5", source: "n5", target: "n1", linkType: "affects" },
        { id: "e6", source: "n6", target: "n2", linkType: "affects" },
        { id: "e7", source: "n9", target: "n4", linkType: "mitigates" },
        { id: "e8", source: "n10", target: "n6", linkType: "mitigates" },
        { id: "e9", source: "n11", target: "n2", linkType: "protects" },
        { id: "e10", source: "n1", target: "n2", linkType: "depends_on" },
        { id: "e11", source: "n3", target: "n1", linkType: "transmits" },
        { id: "e12", source: "n12", target: "n7", linkType: "caused_by" },
        { id: "e13", source: "n12", target: "n1", linkType: "affects" },
        { id: "e14", source: "n13", target: "n2", linkType: "impacts" },
        { id: "e15", source: "n14", target: "n10", linkType: "manages" },
      ]
    }, { headers });
  }

  if (url.pathname === "/api/remediation/list" && req.method === "GET") {
    return Response.json({
      tasks: [
        { id: "1", title: "修复SQL注入漏洞", description: "更新输入验证逻辑", type: "finding", priority: "critical", status: "in_progress", assignee: "张三", dueDate: "2025-02-25" },
        { id: "2", title: "更新访问控制策略", description: "实施最小权限原则", type: "gap", priority: "high", status: "pending", assignee: "李四", dueDate: "2025-03-01" },
        { id: "3", title: "完成渗透测试", description: "Q1季度渗透测试", type: "audit", priority: "medium", status: "completed", assignee: "王五", dueDate: "2025-02-20" },
        { id: "4", title: "审查日志保留政策", description: "合规要求365天保留", type: "finding", priority: "low", status: "verified", assignee: "赵六", dueDate: "2025-02-15" },
      ]
    }, { headers });
  }

  if (url.pathname === "/api/remediation/stats" && req.method === "GET") {
    return Response.json({
      total: 12,
      byStatus: { pending: 4, in_progress: 3, completed: 4, verified: 1 },
      byPriority: { critical: 2, high: 4, medium: 4, low: 2 },
      overdue: 2,
      completedThisMonth: 4,
      avgCompletionDays: 12.5,
    }, { headers });
  }

  if (url.pathname === "/api/compliance/gaps" && req.method === "GET") {
    return Response.json({
      gaps: [
        { id: "1", framework: "NIST CSF", control: "PR.AC-1", severity: "critical", status: "未整改", description: "身份管理流程不完善" },
        { id: "2", framework: "ISO 27001", control: "A.9.2.1", severity: "high", status: "整改中", description: "访问权限审查周期过长" },
        { id: "3", framework: "SOC 2", control: "CC6.1", severity: "medium", status: "待审核", description: "日志备份策略需要更新" },
      ]
    }, { headers });
  }

  if (url.pathname === "/api/compliance/summary" && req.method === "GET") {
    return Response.json({
      overallScore: 78,
      frameworks: [
        { id: "1", name: "NIST CSF", score: 82, controls: 108, passed: 89 },
        { id: "2", name: "ISO 27001", score: 75, controls: 114, passed: 86 },
        { id: "3", name: "SOC 2", score: 80, controls: 95, passed: 76 },
        { id: "4", name: "GDPR", score: 88, controls: 99, passed: 87 },
      ]
    }, { headers });
  }

  // Auth endpoints
  if (url.pathname === "/api/auth/login" && req.method === "POST") {
    try {
      const body = await req.json() as { email: string; password: string };
      // Demo auth - in production, validate against database
      const token = Buffer.from(`${body.email}:${Date.now()}`).toString("base64");
      return Response.json({
        success: true,
        token,
        user: {
          id: "user-1",
          email: body.email,
          displayName: body.email.split("@")[0],
          tenantId: "tenant-1",
          roleIds: ["role-security_analyst"],
          status: "active",
          lastLogin: null,
        },
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }, { headers });
    } catch (err) {
      return Response.json({ error: err instanceof Error ? err.message : "Login failed" }, { status: 401, headers });
    }
  }

  if (url.pathname === "/api/auth/logout" && req.method === "POST") {
    return Response.json({ success: true }, { headers });
  }

  if (url.pathname === "/api/auth/me" && req.method === "GET") {
    return Response.json({
      id: "user-1",
      email: "admin@example.com",
      displayName: "Admin",
      tenantId: "tenant-1",
      roleIds: ["role-admin"],
      status: "active",
      lastLogin: new Date().toISOString(),
    }, { headers });
  }

  // User management
  if (url.pathname === "/api/users" && req.method === "GET") {
    return Response.json({
      items: [
        { id: "user-1", email: "admin@example.com", displayName: "Admin", tenantId: "tenant-1", roleIds: ["role-admin"], status: "active" },
        { id: "user-2", email: "analyst@example.com", displayName: "Analyst", tenantId: "tenant-1", roleIds: ["role-security_analyst"], status: "active" },
      ],
      total: 2,
      page: 1,
      pageSize: 10,
      hasMore: false,
    }, { headers });
  }

  // Roles
  if (url.pathname === "/api/roles" && req.method === "GET") {
    return Response.json({
      items: [
        { id: "role-admin", name: "admin", displayName: "Administrator", description: "Full system access", permissions: ["admin:all"], isSystem: true },
        { id: "role-security_analyst", name: "security_analyst", displayName: "Security Analyst", description: "Analyze threats", permissions: ["read:threats", "write:threats"], isSystem: true },
        { id: "role-threat_hunter", name: "threat_hunter", displayName: "Threat Hunter", description: "Proactive threat hunting", permissions: ["execute:tools"], isSystem: true },
      ],
    }, { headers });
  }

  // Tenants
  if (url.pathname === "/api/tenants" && req.method === "GET") {
    return Response.json({
      items: [
        { id: "tenant-1", name: "Demo Company", slug: "demo", plan: "enterprise", status: "active", settings: { dataRetentionDays: 90, maxSessionDuration: 3600, requireMfa: false, allowedIpRanges: [], ssoEnabled: false } },
      ],
    }, { headers });
  }

  // Attack simulation
  if (url.pathname === "/api/attack" && req.method === "POST") {
    try {
      const body = await req.json() as { target: string; type?: string; dryRun?: boolean };
      const attackType = body.type || "auto";
      const target = body.target;
      const isDryRun = body.dryRun ?? false;
      
      const techniques = mitreLoader.getAllTechniques().slice(0, 15);
      
      const findings = [];
      let successful = 0;
      let detected = 0;
      
      for (const tech of techniques) {
        const isSuccess = Math.random() > 0.4;
        const isDetected = isSuccess && Math.random() > 0.5;
        
        if (isSuccess) successful++;
        if (isDetected) detected++;
        
        findings.push({
          technique: `${tech.id} - ${tech.name}`,
          phase: tech.tacticIds?.[0] || "unknown",
          status: isDetected ? "detected" : isSuccess ? "success" : "failed",
          details: isSuccess ? `Tested ${tech.name}` : `Failed to execute ${tech.name}`,
          severity: isDetected ? "high" : isSuccess ? "critical" : "low",
        });
      }
      
      const recommendations = [
        "加强Web应用防火墙规则",
        "实施最小权限原则",
        "定期进行渗透测试",
      ];
      
      return Response.json({
        success: true,
        target,
        attackType,
        duration: Math.floor(Math.random() * 5000) + 1000,
        summary: {
          totalTests: findings.length,
          successful,
          detected,
          vulnerabilitiesFound: successful - detected,
        },
        findings,
        recommendations,
      }, { headers });
    } catch (err) {
      return Response.json({ error: err instanceof Error ? err.message : "Attack failed" }, { headers });
    }
  }

  if (url.pathname === "/api/attack/history" && req.method === "GET") {
    return Response.json({
      items: [
        { id: "atk-1", target: "192.168.1.1", attackType: "network", duration: 3500, summary: { totalTests: 10, successful: 5, detected: 2, vulnerabilitiesFound: 3 } },
        { id: "atk-2", target: "example.com", attackType: "web", duration: 4200, summary: { totalTests: 12, successful: 7, detected: 1, vulnerabilitiesFound: 4 } },
      ],
    }, { headers });
  }

  // Defense analysis
  if (url.pathname === "/api/defense" && req.method === "POST") {
    try {
      const body = await req.json() as { target: string; type?: string };
      const scanType = body.type || "comprehensive";
      const target = body.target;
      
      const techniques = mitreLoader.getAllTechniques().slice(0, 10);
      const findings = [];
      let critical = 0, high = 0, medium = 0, low = 0;
      
      const categories = ["vulnerability", "configuration", "threat", "compliance"];
      const severities = ["critical", "high", "medium", "low"];
      
      for (const tech of techniques) {
        const severity = severities[Math.floor(Math.random() * 4)];
        if (severity === "critical") critical++;
        else if (severity === "high") high++;
        else if (severity === "medium") medium++;
        else low++;
        
        findings.push({
          title: `${tech.name} 检测`,
          category: categories[Math.floor(Math.random() * categories.length)],
          severity: severity as "critical" | "high" | "medium" | "low",
          description: `检测到与 ${tech.name} 相关的安全问题`,
          recommendation: `根据 ${tech.id} 实施相应的防御措施`,
        });
      }
      
      const riskScore = Math.floor(100 - (critical * 15 + high * 8 + medium * 4 + low * 2));
      
      return Response.json({
        success: true,
        target,
        scanType,
        duration: Math.floor(Math.random() * 3000) + 500,
        summary: {
          riskScore: Math.max(0, riskScore),
          critical,
          high,
          medium,
          low,
        },
        findings,
        compliance: [
          { framework: "NIST CSF", score: Math.floor(Math.random() * 30) + 70, gaps: critical + high },
          { framework: "ISO 27001", score: Math.floor(Math.random() * 30) + 70, gaps: Math.floor((critical + high) / 2) },
          { framework: "SCF", score: Math.floor(Math.random() * 30) + 70, gaps: Math.floor((critical + high) / 2) },
        ],
      }, { headers });
    } catch (err) {
      return Response.json({ error: err instanceof Error ? err.message : "Scan failed" }, { headers });
    }
  }

  if (url.pathname === "/api/defense/history" && req.method === "GET") {
    return Response.json({
      items: [
        { id: "def-1", target: "192.168.1.1", scanType: "comprehensive", duration: 2800, summary: { riskScore: 72, critical: 1, high: 3, medium: 6, low: 8 } },
      ],
    }, { headers });
  }

  // Compliance audit
  if (url.pathname === "/api/audit" && req.method === "POST") {
    try {
      const body = await req.json() as { framework?: string; domain?: string };
      const framework = body.framework || "SCF";
      
      const domains = scfLoader.getDomains();
      const controls = scfLoader.getAllControls();
      
      const domainResults = [];
      let totalCompliant = 0;
      let totalPartial = 0;
      let totalNonCompliant = 0;
      const criticalGaps = [];
      
      for (const domain of domains.slice(0, 10)) {
        const domainControls = domain.controls?.slice(0, 20) || [];
        const compliant = Math.floor(domainControls.length * (Math.random() * 0.3 + 0.6));
        const partial = Math.floor(domainControls.length * (Math.random() * 0.2 + 0.1));
        const nonCompliant = domainControls.length - compliant - partial;
        
        totalCompliant += compliant;
        totalPartial += partial;
        totalNonCompliant += nonCompliant;
        
        const score = Math.floor((compliant / domainControls.length) * 100);
        
        domainResults.push({
          domain: domain.code,
          name: domain.name,
          score,
          gaps: nonCompliant + partial,
          status: score >= 80 ? "compliant" : score >= 60 ? "partial" : "non_compliant",
        });
        
        if (nonCompliant > 3) {
          criticalGaps.push({
            controlId: `${domain.code}-001`,
            controlName: domain.name,
            severity: "critical",
            description: `${domain.name} 领域存在 ${nonCompliant} 个不合规控制项`,
            recommendation: `优先处理 ${domain.name} 领域的合规问题`,
          });
        }
      }
      
      const totalControls = totalCompliant + totalPartial + totalNonCompliant;
      const overallScore = totalControls > 0 ? Math.floor((totalCompliant / totalControls) * 100) : 0;
      
      return Response.json({
        success: true,
        framework,
        timestamp: new Date().toISOString(),
        summary: {
          overallScore,
          complianceRate: overallScore / 100,
          totalControls,
          compliant: totalCompliant,
          partiallyCompliant: totalPartial,
          nonCompliant: totalNonCompliant,
        },
        domainResults,
        criticalGaps,
        timeline: [
          { date: "2025-03-01", action: "完成IAM整改", priority: "high" },
          { date: "2025-03-15", action: "完成NET整改", priority: "medium" },
        ],
      }, { headers });
    } catch (err) {
      return Response.json({ error: err instanceof Error ? err.message : "Audit failed" }, { headers });
    }
  }

  if (url.pathname === "/api/audit/upload" && req.method === "POST") {
    try {
      const contentType = req.headers.get("content-type") || "";
      
      let documentContent = "";
      let fileName = "audit-document";
      
      if (contentType.includes("application/json")) {
        const body = await req.json() as { content?: string; fileName?: string };
        documentContent = body.content || "";
        fileName = body.fileName || "audit-document";
      } else {
        const buffer = await req.arrayBuffer();
        const decoder = new TextDecoder("utf-8");
        documentContent = decoder.decode(buffer).substring(0, 50000);
      }
      
      const scfControls = scfLoader.getAllControls();
      const scfDomains = scfLoader.getDomains();
      
      const controlKeywords: Record<string, { keywords: string[]; domain: string; severity: string }> = {
        "IAM-01": { keywords: ["access control", "access management", "身份管理", "访问控制", "权限管理", "privilege", "authorization"], domain: "IAM", severity: "high" },
        "IAM-02": { keywords: ["authentication", "mfa", "multi-factor", "多因素", "双因素", "身份验证", "2fa", "single sign-on", "SSO"], domain: "IAM", severity: "critical" },
        "NET-01": { keywords: ["firewall", "network segmentation", "网络隔离", "防火墙", "网络安全", "boundary", "perimeter"], domain: "NET", severity: "high" },
        "NET-02": { keywords: ["encryption", "tls", "ssl", "加密", "传输加密", "ssl证书", "certificate", "https", "tls 1.2", "tls 1.3"], domain: "NET", severity: "medium" },
        "DAT-01": { keywords: ["data protection", "encryption at rest", "数据加密", "数据保护", "静态加密", "cryptography", "aes"], domain: "DAT", severity: "critical" },
        "DAT-02": { keywords: ["backup", "data backup", "备份", "数据备份", "灾备", "disaster recovery", "bcp", "dr"], domain: "DAT", severity: "high" },
        "DAT-03": { keywords: ["data classification", "数据分类", "classification", "sensitive data", "pii", "个人隐私", "敏感数据"], domain: "DAT", severity: "high" },
        "OPS-01": { keywords: ["patch management", "vulnerability management", "补丁", "漏洞管理", "更新", "patching", "cve", "vulnerability"], domain: "OPS", severity: "high" },
        "OPS-02": { keywords: ["incident response", "security incident", "事件响应", "安全事件", "应急响应", "breach", "应急", "ir plan"], domain: "OPS", severity: "high" },
        "MON-01": { keywords: ["logging", "log management", "日志", "日志管理", "审计日志", "syslog", "audit trail"], domain: "MON", severity: "medium" },
        "MON-02": { keywords: ["monitoring", "security monitoring", "监控", "安全监控", "实时监控", "siem", "alert", "告警"], domain: "MON", severity: "medium" },
        "PHY-01": { keywords: ["physical security", "access control", "物理安全", "门禁", "机房安全", "datacenter", "access card"], domain: "PHY", severity: "medium" },
        "COM-01": { keywords: ["security policy", "security awareness", "安全策略", "安全培训", "安全意识", "training", "phishing"], domain: "COM", severity: "medium" },
        "COM-02": { keywords: ["third party", "vendor", "第三方", "供应商", "供应链", "supplier", "outsourcing"], domain: "COM", severity: "high" },
      };
      
      const detectedGaps: any[] = [];
      const mentionedControls = new Set<string>();
      
      const docLower = documentContent.toLowerCase();
      
      for (const [controlId, config] of Object.entries(controlKeywords)) {
        const found = config.keywords.some(kw => docLower.includes(kw.toLowerCase()));
        if (found) {
          mentionedControls.add(controlId);
          
          const positiveIndicators = [
            "compliant", "符合", "已实施", "implemented", "achieved",
            "satisfied", "满足", "通过", "verified", "验证", "有效",
            "符合要求", "达标", "合规", "有", "已建立", "已部署"
          ];
          const negativeIndicators = [
            "non-compliant", "不符合", "未实施", "not implemented", "gap",
            "missing", "缺失", "不足", "weakness", "weak", "issue", "problem",
            "需要改进", "需要加强", "未达标", "不满足", "风险", "漏洞",
            "无", "没有", "未", "不完善", "不健全", "待改进"
          ];
          
          const hasPositive = positiveIndicators.some(ind => docLower.includes(ind));
          const hasNegative = negativeIndicators.some(ind => docLower.includes(ind));
          
          if (hasNegative || (!hasPositive && Math.random() > 0.3)) {
            const control = scfControls.find(c => c.id === controlId);
            const domain = scfDomains.find(d => d.controls?.some(c => c.id === controlId));
            
            detectedGaps.push({
              id: `gap-${controlId}`,
              controlId,
              controlName: control?.name || controlId,
              domain: domain?.code || config.domain,
              severity: config.severity,
              status: hasNegative ? "未符合" : "待确认",
              description: hasNegative ? 
                `审计文档明确指出 ${controlId} 存在不符合项` : 
                `审计文档提及 ${controlId}，但未明确说明合规状态`,
              evidence: config.keywords.filter(kw => docLower.includes(kw.toLowerCase())).slice(0, 2),
            });
          }
        }
      }
      
      for (const control of scfControls.slice(0, 100)) {
        if (mentionedControls.has(control.id)) continue;
        
        const controlText = ((control.name || "") + " " + (control.description || "")).toLowerCase();
        const matchedKeyword = Object.entries(controlKeywords).find(([_, kw]) => 
          kw.keywords.some(k => controlText.includes(k.toLowerCase()))
        );
        
        if (matchedKeyword) {
          const [controlId, config] = matchedKeyword;
          const hasNegative = ["gap", "missing", "不足", "问题", "weak", "issue", "风险", "漏洞", "未"].some(
            ind => controlText.includes(ind)
          );
          
          if (hasNegative) {
            const domain = scfDomains.find(d => d.controls?.some(c => c.id === control.id));
            detectedGaps.push({
              id: `gap-${control.id}`,
              controlId: control.id,
              controlName: control.name,
              domain: domain?.code || config.domain,
              severity: config.severity,
              status: "待确认",
              description: `审计文档涉及 ${control.name} 领域，可能存在合规问题`,
              evidence: [config.keywords[0]],
            });
          }
        }
      }
      
      const auditAnalysis = {
        id: `audit-${Date.now()}`,
        fileName,
        timestamp: new Date().toISOString(),
        totalControlsReviewed: mentionedControls.size,
        totalSCFControls: scfControls.length,
        gapsFound: detectedGaps.length,
        complianceRate: mentionedControls.size > 0 ? 
          Math.round(((mentionedControls.size - detectedGaps.length) / mentionedControls.size) * 100) : 0,
        gaps: detectedGaps.slice(0, 20),
        summary: {
          critical: detectedGaps.filter(g => g.severity === "critical").length,
          high: detectedGaps.filter(g => g.severity === "high").length,
          medium: detectedGaps.filter(g => g.severity === "medium").length,
          low: detectedGaps.filter(g => g.severity === "low").length,
        },
        frameworkCoverage: [
          { 
            id: "SCF", 
            name: "Secure Controls Framework (SCF)", 
            type: "国际",
            mentioned: mentionedControls.size,
            total: scfControls.length,
            score: mentionedControls.size > 0 ? Math.round(((mentionedControls.size - detectedGaps.length) / mentionedControls.size) * 100) : 0
          },
          { 
            id: "NIST", 
            name: "NIST Cybersecurity Framework", 
            type: "国际 (美国)",
            mentioned: Math.floor(mentionedControls.size * 0.7),
            total: Math.floor(scfControls.length * 0.6),
            score: Math.floor(60 + Math.random() * 25)
          },
          { 
            id: "ISO27001", 
            name: "ISO/IEC 27001:2022", 
            type: "国际",
            mentioned: Math.floor(mentionedControls.size * 0.65),
            total: Math.floor(scfControls.length * 0.5),
            score: Math.floor(55 + Math.random() * 30)
          },
          { 
            id: "GB", 
            name: "GB/T 22239-2019 等保2.0", 
            type: "中国",
            mentioned: Math.floor(mentionedControls.size * 0.5),
            total: Math.floor(scfControls.length * 0.45),
            score: Math.floor(50 + Math.random() * 30)
          },
          { 
            id: "SOC2", 
            name: "SOC 2 Type II", 
            type: "国际 (美国)",
            mentioned: Math.floor(mentionedControls.size * 0.4),
            total: Math.floor(scfControls.length * 0.35),
            score: Math.floor(65 + Math.random() * 20)
          },
          { 
            id: "PCIDSS", 
            name: "PCI DSS", 
            type: "国际",
            mentioned: Math.floor(mentionedControls.size * 0.3),
            total: Math.floor(scfControls.length * 0.25),
            score: Math.floor(70 + Math.random() * 20)
          },
          { 
            id: "GDPR", 
            name: "GDPR", 
            type: "国际 (欧盟)",
            mentioned: Math.floor(mentionedControls.size * 0.25),
            total: Math.floor(scfControls.length * 0.2),
            score: Math.floor(60 + Math.random() * 25)
          },
          { 
            id: "COBIT", 
            name: "COBIT 2019", 
            type: "国际",
            mentioned: Math.floor(mentionedControls.size * 0.35),
            total: Math.floor(scfControls.length * 0.3),
            score: Math.floor(55 + Math.random() * 30)
          },
          { 
            id: "CIS", 
            name: "CIS Controls v8", 
            type: "国际",
            mentioned: Math.floor(mentionedControls.size * 0.45),
            total: Math.floor(scfControls.length * 0.4),
            score: Math.floor(60 + Math.random() * 25)
          },
          { 
            id: "HIPAA", 
            name: "HIPAA", 
            type: "国际 (美国)",
            mentioned: Math.floor(mentionedControls.size * 0.2),
            total: Math.floor(scfControls.length * 0.15),
            score: Math.floor(65 + Math.random() * 20)
          },
        ],
        remediationTasks: detectedGaps.map((gap, index) => {
          const priorityMap: Record<string, "pending" | "in_progress"> = {
            critical: "in_progress",
            high: "pending",
            medium: "pending",
            low: "pending",
          };
          const assigneeMap: Record<string, string> = {
            IAM: "安全运营团队",
            NET: "网络团队",
            DAT: "数据安全团队",
            OPS: "运维团队",
            MON: "监控团队",
            PHY: "物理安全团队",
            COM: "安全合规团队",
          };
          const domainPrefix = gap.domain || "UNKNOWN";
          const assignee = assigneeMap[domainPrefix] || "安全团队";
          
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + (gap.severity === "critical" ? 7 : gap.severity === "high" ? 14 : 30));
          
          return {
            id: `task-${gap.id || gap.controlId}-${Date.now()}`,
            title: `整改 ${gap.controlId}: ${gap.controlName || "安全控制项"}`,
            description: gap.description || `根据审计底稿分析，需要整改 ${gap.controlId} 控制项`,
            assignee,
            dueDate: dueDate.toISOString().split('T')[0],
            status: priorityMap[gap.severity] || "pending",
            priority: gap.severity,
            controlId: gap.controlId,
            domain: domainPrefix,
          };
        }),
      };
      
      return Response.json(auditAnalysis, { headers });
    } catch (err) {
      return Response.json({ error: err instanceof Error ? err.message : "Upload failed" }, { headers });
    }
  }

  if (url.pathname === "/api/audit/history" && req.method === "GET") {
    const historyItems = [];
    const now = new Date();
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(now);
      date.setMonth(date.getMonth() - i);
      
      const baseScore = 65 + Math.floor(Math.random() * 15);
      const improvement = Math.floor((12 - i) * 1.5);
      
      historyItems.push({
        id: `aud-${i + 1}`,
        type: i % 3 === 0 ? "季度审计" : "月度检查",
        framework: i % 3 === 0 ? "全面审计" : i % 3 === 1 ? "SCF" : "NIST CSF",
        overallScore: Math.min(95, baseScore + improvement),
        gapsCount: Math.floor(Math.random() * 10) + 5,
        timestamp: date.toISOString(),
        date: date.toISOString().split('T')[0],
      });
    }
    
    return Response.json({ items: historyItems }, { headers });
  }

  // Risk score
  if (url.pathname === "/api/risk/score" && req.method === "GET") {
    const mitreStats = mitreLoader.getStats();
    const scfStats = scfLoader.getStats();
    
    const attackSurface = Math.floor(Math.random() * 20 + 60);
    const vulnerabilities = Math.floor(Math.random() * 20 + 50);
    const threats = Math.floor(Math.random() * 20 + 55);
    const compliance = Math.floor((scfStats.controls / 1451) * 40 + 50);
    const overall = Math.floor((attackSurface + vulnerabilities + threats + compliance) / 4);
    
    return Response.json({
      overall,
      attackSurface,
      vulnerabilities,
      threats,
      compliance,
      mitreTechniques: mitreStats.techniques,
      scfControls: scfStats.controls,
    }, { headers });
  }
  
  // Risk domains (based on SCF)
  if (url.pathname === "/api/risk/domains" && req.method === "GET") {
    const domains = scfLoader.getDomains();
    const riskDomains = domains.map(d => {
      const risk = Math.floor(Math.random() * 40 + 50);
      const trends = ["↑", "↓", "→", "↑↑"];
      return {
        code: d.code,
        name: d.name,
        risk,
        trend: trends[Math.floor(Math.random() * trends.length)],
        controlCount: d.controls?.length || 0,
      };
    });
    
    return Response.json({ domains: riskDomains }, { headers });
  }
  
  // Data Collection - Nmap Scan
  if (url.pathname === "/api/scan/nmap" && req.method === "POST") {
    try {
      const body = await req.json() as { target: string; scanType?: string; ports?: string };
      const { target, scanType = "quick", ports } = body;
      
      const scanTypeFlags: Record<string, string[]> = {
        quick: ["-F", "-Pn"],
        full: ["-p-", "-Pn", "-A"],
        syn: ["-sS", "-Pn"],
        vuln: ["--script vuln", "-Pn"],
      };
      
      const args = [...(scanTypeFlags[scanType] || ["-F", "-Pn"]), "-T4", "--open", target];
      if (ports) args.splice(1, 0, "-p", ports);
      
      const { execSync } = await import("child_process");
      let rawOutput = "";
      let exitCode = 0;
      
      try {
        rawOutput = execSync(`nmap ${args.join(" ")}`, { encoding: "utf-8", timeout: 120000 });
      } catch (e: any) {
        rawOutput = e.stdout || e.message;
        exitCode = e.status || 1;
      }
      
      const hosts = [];
      const lines = rawOutput.split("\n");
      let currentHost: any = null;
      
      for (const line of lines) {
        const hostMatch = line.match(/Nmap scan report for\s+(.+)/i);
        if (hostMatch) {
          if (currentHost) hosts.push(currentHost);
          currentHost = { address: hostMatch[1].trim(), ports: [], os: null, status: "up" };
          continue;
        }
        
        const portMatch = line.match(/(\d+)\/(tcp|udp)\s+(open|closed|filtered)\s+(\S+)/);
        if (portMatch && currentHost) {
          currentHost.ports.push({
            port: parseInt(portMatch[1]),
            protocol: portMatch[2],
            state: portMatch[3],
            service: portMatch[4],
          });
        }
        
        const osMatch = line.match(/OS details:\s+(.+)/i);
        if (osMatch && currentHost) currentHost.os = osMatch[1].trim();
      }
      if (currentHost) hosts.push(currentHost);
      
      const vulnerabilities = [];
      for (const host of hosts) {
        for (const port of host.ports) {
          if (["http", "https", "http-proxy"].includes(port.service?.toLowerCase()) || port.port === 80 || port.port === 443 || port.port === 8080) {
            vulnerabilities.push({
              assetId: host.address,
              port: port.port,
              service: port.service,
              severity: "medium",
              cve: null,
              description: `Web service detected on port ${port.port}`,
              mitreTechniques: ["T1190"],
            });
          }
          if (port.service?.toLowerCase().includes("ssh") && port.port === 22) {
            vulnerabilities.push({
              assetId: host.address,
              port: port.port,
              service: port.service,
              severity: "low",
              cve: null,
              description: "SSH service detected - ensure strong authentication",
              mitreTechniques: ["T1021"],
            });
          }
        }
      }
      
      const scanResult = {
        id: `scan-${Date.now()}`,
        target,
        scanType,
        timestamp: new Date().toISOString(),
        hosts,
        vulnerabilities,
        summary: {
          hostsFound: hosts.length,
          openPorts: hosts.reduce((sum, h) => sum + h.ports.length, 0),
          vulnerabilities: vulnerabilities.length,
        },
      };
      
      return Response.json(scanResult, { headers });
    } catch (err) {
      return Response.json({ error: err instanceof Error ? err.message : "Scan failed" }, { headers });
    }
  }
  
  // Data Collection - HTTP Probe
  if (url.pathname === "/api/scan/http" && req.method === "POST") {
    try {
      const body = await req.json() as { url: string; method?: string };
      const { url: targetUrl, method = "GET" } = body;
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(targetUrl, {
        method,
        signal: controller.signal,
        headers: { "User-Agent": "ESC-Scanner/1.0" },
      });
      
      clearTimeout(timeout);
      
      const headers: Record<string, string> = {};
      response.headers.forEach((v, k) => headers[k] = v);
      
      const hasSecurityHeaders = !!(
        headers["x-frame-options"] || 
        headers["content-security-policy"] || 
        headers["strict-transport-security"] ||
        headers["x-xss-protection"]
      );
      
      const probeResult = {
        id: `probe-${Date.now()}`,
        url: targetUrl,
        method,
        status: response.status,
        statusText: response.statusText,
        headers,
        securityHeaders: {
          xFrameOptions: !!headers["x-frame-options"],
          csp: !!headers["content-security-policy"],
          hsts: !!headers["strict-transport-security"],
          xssProtection: !!headers["x-xss-protection"],
        },
        securityScore: hasSecurityHeaders ? 80 : 40,
        timestamp: new Date().toISOString(),
      };
      
      return Response.json(probeResult, { headers });
    } catch (err) {
      return Response.json({ error: err instanceof Error ? err.message : "Probe failed" }, { headers });
    }
  }
  
  // Assets Management
  if (url.pathname === "/api/assets" && req.method === "GET") {
    const assets = [
      { id: "asset-1", ip: "192.168.1.1", hostname: "web-server-01", os: "Linux", ports: [22, 80, 443], risk: 65 },
      { id: "asset-2", ip: "192.168.1.2", hostname: "db-server-01", os: "Linux", ports: [22, 3306], risk: 75 },
      { id: "asset-3", ip: "192.168.1.10", hostname: "workstation-01", os: "Windows", ports: [135, 445], risk: 45 },
    ];
    return Response.json({ assets }, { headers });
  }
  
  // Vulnerabilities
  if (url.pathname === "/api/vulnerabilities" && req.method === "GET") {
    const vulnerabilities = [
      { id: "vuln-1", assetId: "asset-1", cve: "CVE-2024-1234", severity: "critical", status: "open", description: "SQL Injection in login form", mitreTechnique: "T1190" },
      { id: "vuln-2", assetId: "asset-1", cve: "CVE-2024-5678", severity: "high", status: "open", description: "Outdated OpenSSL version", mitreTechnique: "T1068" },
      { id: "vuln-3", assetId: "asset-2", cve: "CVE-2024-9012", severity: "medium", status: "open", description: "Weak SSL/TLS configuration", mitreTechnique: "T1040" },
      { id: "vuln-4", assetId: "asset-3", cve: null, severity: "low", status: "remediated", description: "Missing security updates", mitreTechnique: "T1068" },
    ];
    return Response.json({ vulnerabilities }, { headers });
  }
  
  // Scan Results History
  if (url.pathname === "/api/scan/results" && req.method === "GET") {
    const results = [
      { id: "scan-1", target: "192.168.1.1", scanType: "quick", timestamp: new Date().toISOString(), hostsFound: 1, openPorts: 3, vulnerabilities: 2 },
      { id: "scan-2", target: "192.168.1.0/24", scanType: "full", timestamp: new Date(Date.now() - 86400000).toISOString(), hostsFound: 5, openPorts: 15, vulnerabilities: 4 },
    ];
    return Response.json({ results }, { headers });
  }

  // Health check
  if (url.pathname === "/api/health" && req.method === "GET") {
    return Response.json({
      status: "healthy",
      version: "1.0.0",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    }, { headers });
  }

  // LLM Providers API - for Settings page
  if (url.pathname === "/api/llm/providers" && req.method === "GET") {
    const providers = [
      {
        id: "ollama",
        name: "Ollama",
        type: "local",
        enabled: true,
        baseUrl: "http://localhost:11434",
        model: "llama3",
        status: "connected",
        isCustom: false,
        supportsCustomBaseUrl: true
      },
      {
        id: "openai",
        name: "OpenAI",
        type: "cloud",
        enabled: false,
        apiKey: "",
        model: "gpt-4",
        status: "disconnected",
        isCustom: false,
        supportsCustomBaseUrl: true
      },
      {
        id: "anthropic",
        name: "Anthropic Claude",
        type: "cloud",
        enabled: false,
        apiKey: "",
        model: "claude-3-opus",
        status: "disconnected",
        isCustom: false,
        supportsCustomBaseUrl: true
      },
      {
        id: "deepseek",
        name: "DeepSeek",
        type: "cloud",
        enabled: false,
        apiKey: "",
        model: "deepseek-chat",
        status: "disconnected",
        isCustom: false,
        supportsCustomBaseUrl: true
      },
      {
        id: "zhipu",
        name: "智谱 AI",
        type: "cloud",
        enabled: false,
        apiKey: "",
        model: "glm-4",
        status: "disconnected",
        isCustom: false,
        supportsCustomBaseUrl: true
      },
      {
        id: "moonshot",
        name: "Moonshot",
        type: "cloud",
        enabled: false,
        apiKey: "",
        model: "moonshot-v1",
        status: "disconnected",
        isCustom: false,
        supportsCustomBaseUrl: true
      },
      {
        id: "minimax",
        name: "MiniMax",
        type: "cloud",
        enabled: false,
        apiKey: "",
        model: "abab6.5-chat",
        status: "disconnected",
        isCustom: false,
        supportsCustomBaseUrl: true
      },
    ];
    return Response.json({ providers }, { headers });
  }

  if (url.pathname === "/api/llm/providers" && req.method === "POST") {
    try {
      const body = await req.json() as { providers?: any[] };
      return Response.json({ success: true }, { headers });
    } catch (error) {
      return Response.json({ error: error instanceof Error ? error.message : "Unknown error" }, { headers });
    }
  }

  if (url.pathname === "/api/llm/providers/add" && req.method === "POST") {
    try {
      const body = await req.json() as { id?: string; name?: string };
      if (!body.id || !body.name) {
        return Response.json({ error: "Provider ID and name are required" }, { status: 400, headers });
      }
      return Response.json({ success: true, provider: body }, { headers });
    } catch (error) {
      return Response.json({ error: error instanceof Error ? error.message : "Unknown error" }, { headers });
    }
  }

  if (url.pathname.match(/^\/api\/llm\/providers\/.+$/) && req.method === "DELETE") {
    const providerId = url.pathname.split("/api/llm/providers/")[1];
    return Response.json({ success: true, deletedId: providerId }, { headers });
  }

  // Config API - System
  if (url.pathname === "/api/config/system" && req.method === "GET") {
    return Response.json({
      config: {
        sessionTimeout: 30,
        maxHistoryDays: 90,
        enableWebSocket: true,
        enableNotifications: true,
        logLevel: "info",
        language: "zh-CN"
      }
    }, { headers });
  }

  if (url.pathname === "/api/config/system" && req.method === "POST") {
    try {
      const body = await req.json() as { config?: any };
      return Response.json({ success: true }, { headers });
    } catch (error) {
      return Response.json({ error: error instanceof Error ? error.message : "Unknown error" }, { headers });
    }
  }

  // Config API - Notification Channels
  if (url.pathname === "/api/config/channels" && req.method === "GET") {
    const channels = [
      { id: "feishu", name: "飞书/Lark", type: "feishu", enabled: false, appId: "", appSecret: "", status: "disconnected" },
      { id: "discord", name: "Discord", type: "discord", enabled: false, botToken: "", channelId: "", status: "disconnected" },
      { id: "slack", name: "Slack", type: "slack", enabled: false, slackBotToken: "", slackChannelId: "", status: "disconnected" },
      { id: "telegram", name: "Telegram", type: "telegram", enabled: false, telegramBotToken: "", telegramChatId: "", status: "disconnected" },
      { id: "email", name: "Email", type: "email", enabled: false, status: "disconnected" },
    ];
    return Response.json({ channels }, { headers });
  }

  if (url.pathname === "/api/config/channels" && req.method === "POST") {
    try {
      const body = await req.json() as { channels?: any[] };
      return Response.json({ success: true }, { headers });
    } catch (error) {
      return Response.json({ error: error instanceof Error ? error.message : "Unknown error" }, { headers });
    }
  }

  // Provider Test API
  if (url.pathname === "/api/providers/test" && req.method === "POST") {
    try {
      const body = await req.json() as { provider?: string; baseUrl?: string; apiKey?: string; model?: string };
      const { provider, baseUrl } = body;
      
      if (provider === "ollama") {
        const testUrl = baseUrl || "http://localhost:11434";
        try {
          const res = await fetch(`${testUrl}/api/tags`);
          if (res.ok) {
            return Response.json({ success: true, message: "连接成功" }, { headers });
          }
          return Response.json({ success: false, message: "Ollama 服务未响应" }, { headers });
        } catch {
          return Response.json({ success: false, message: "无法连接到 Ollama 服务" }, { headers });
        }
      }
      
      if (body.apiKey) {
        return Response.json({ success: true, message: "API Key 已配置" }, { headers });
      }
      
      return Response.json({ success: false, message: "请配置 API Key" }, { headers });
    } catch (error) {
      return Response.json({ success: false, message: error instanceof Error ? error.message : "测试失败" }, { headers });
    }
  }

  return Response.json({ error: "Not found" }, { status: 404, headers })
  },
});

console.log(`Enterprise Security Commander Gateway running on http://localhost:${server.port}`);
console.log(`Available LLM providers: ${providerManager.listAvailable().join(", ")}`);
console.log(`Loaded skills: ${skillService.getAllSkills().map((s: { name: string }) => s.name).join(", ")}`);
console.log(`Data directory: ${DATA_DIR}`);
console.log(`Intelligent routing: enabled`);
console.log(`Self-learning: enabled`);
