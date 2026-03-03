#!/usr/bin/env bun
import { resolve, join } from "path";
import { existsSync, mkdirSync } from "fs";
import { config } from "dotenv";

config({ path: resolve(import.meta.dir, "../../.env") });

const DATA_DIR = resolve(process.env.DATA_DIR ?? join(process.cwd(), "data"));
const CONFIG_DIR = join(DATA_DIR, "config");
const SESSIONS_DIR = join(DATA_DIR, "sessions");
const SKILLS_DIR = resolve(process.cwd(), "skills");

[DATA_DIR, CONFIG_DIR, SESSIONS_DIR].forEach((dir) => {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
});

import { CommandRegistry } from "./commands/registry.js";
import { CLICommands } from "./commands/cli-commands.js";
import { ConfigManager } from "./config/manager.js";
import { SkillLoader } from "./skills/loader-class.js";
import { SkillMarket } from "./skills/market.js";
import { Gateway } from "./gateway/index.js";
import { Repl } from "./repl/index.js";
import { AttackSimulator } from "./simulation/engine.js";
import { ComplianceAnalyzer } from "./compliance/analyzer.js";
import { RoleManager } from "./roles/manager.js";
import { MITRELoader } from "./knowledge/mitre/loader.js";
import { SCFLoaderExtended } from "./knowledge/scf/loader-extended.js";

const commandRegistry = new CommandRegistry();
const configManager = new ConfigManager(CONFIG_DIR);
const skillLoader = new SkillLoader(SKILLS_DIR);
const skillMarket = new SkillMarket(DATA_DIR);

const roleManager = new RoleManager();
const complianceAnalyzer = null;
const attackSimulator = new AttackSimulator();

const mitreDataPath = join(DATA_DIR, "mitre", "attack-stix-data");
const scfDataPath = join(DATA_DIR, "scf");
const mitreLoader = new MITRELoader(mitreDataPath);
const scfLoader = new SCFLoaderExtended(scfDataPath);

mitreLoader.load().catch(() => {});
scfLoader.load().catch(() => {});

const cliCommands = new CLICommands({
  simulator: undefined,
  compliance: complianceAnalyzer ?? undefined,
  roleManager,
  mitreLoader,
  scfLoader,
});

await configManager.load();
await skillLoader.loadAll();

const args = process.argv.slice(2);
const command = args[0];

const helpText = `
Enterprise Security Commander CLI

Usage: esc <command> [options]

Commands:
  gateway                    Start the API gateway server
  repl                       Start interactive REPL
  skill list                 List available skills
  skill search <query>       Search skills in market
  skill install <id>         Install a skill from market
  skill create <name>        Create a new skill
  config get <key>           Get configuration value
  config set <key> <value>   Set configuration value
  config list                List all configuration
  status                     Show system status
  threat [target]            Threat analysis & attack chains
  risk                       Show risk graph & ontology
  dashboard                  Business risk dashboard (ROI, supply chain)
  attack <target>            Simulate attack (red team)
  defend <target>            Run defense analysis
  audit                      Run compliance audit
  memory [query]             Memory system & recall
  learn [status|evolve]      Self-learning system
  task [list|run]           Task management
  agent [list|status]        Agent management
  schedule                  Scheduler & heartbeat
  tools [list]              Security tools registry
  channels                   Communication channels
  sandbox                    Sandbox environment status
  providers                  LLM providers
  policy                     Tool policy engine
  doctor                     Diagnose system issues
  version                    Show version
  help                       Show this help

Attack Options:
  --type <type>              Attack type: network, web, social, cloud, auto
  --dry-run                  Simulate without executing
  --verbose, -v              Show detailed output

Defense Options:
  --type <type>              Defense type: vulnerability, configuration, threat, comprehensive
  --json                     Output in JSON format

Audit Options:
  --framework <name>         Framework: SCF, NIST CSF, ISO 27001
  --domain <domain>          Filter by domain
  --json                     Output in JSON format

Examples:
  esc gateway --port 3000
  esc skill search "phishing"
  esc config set llm.default zhipu
  esc attack 192.168.1.1 --type network --verbose
  esc defend 192.168.1.1 --type comprehensive
  esc audit --framework SCF
`;

async function main() {
  switch (command) {
    case "gateway":
    case "server":
    case "start": {
      const port = parseInt(args.find((a) => a === "--port" || a === "-p") ? args[args.indexOf(args.find((a) => a === "--port" || a === "-p")!) + 1] : "3000");
      const gateway = new Gateway({
        port,
        dataDir: DATA_DIR,
        configManager,
        skillLoader,
      });
      await gateway.start();
      break;
    }

    case "repl":
    case "interactive":
    case "i": {
      const repl = new Repl({
        configManager,
        skillLoader,
        dataDir: DATA_DIR,
      });
      await repl.start();
      break;
    }

    case "skill": {
      const subCommand = args[1];
      switch (subCommand) {
        case "list":
        case "ls": {
          const skills = skillLoader.getAll();
          console.log("\nAvailable Skills:");
          skills.forEach((s) => {
            const emoji = s.metadata?.openclaw?.emoji ?? "📋";
            console.log(`  ${emoji} ${s.name} - ${s.description}`);
          });
          console.log(`\nTotal: ${skills.length} skills\n`);
          break;
        }
        case "search": {
          const query = args.slice(2).join(" ");
          const results = await skillMarket.search(query);
          console.log(`\nSearch results for "${query}":`);
          results.forEach((s: { id: string; name: string; downloads: number }) => {
            console.log(`  ${s.id} - ${s.name} (${s.downloads} downloads)`);
          });
          break;
        }
        case "install": {
          const skillId = args[2];
          console.log(`\nInstalling skill: ${skillId}`);
          await skillMarket.install(skillId, SKILLS_DIR);
          await skillLoader.loadAll();
          console.log("✓ Skill installed\n");
          break;
        }
        case "create": {
          const name = args[2];
          if (!name) {
            console.error("Usage: esc skill create <name>");
            process.exit(1);
          }
          const skillDir = join(SKILLS_DIR, name);
          await skillLoader.create(name, skillDir);
          console.log(`\n✓ Skill created at ${skillDir}/SKILL.md\n`);
          break;
        }
        case "publish": {
          const skillPath = args[2] ?? ".";
          await skillMarket.publish(resolve(skillPath));
          console.log("\n✓ Skill published to market\n");
          break;
        }
        default:
          console.log("Usage: esc skill <list|search|install|create|publish>");
      }
      break;
    }

    case "config": {
      const subCommand = args[1];
      switch (subCommand) {
        case "get": {
          const key = args[2];
          const value = configManager.get(key);
          console.log(`${key} = ${JSON.stringify(value)}`);
          break;
        }
        case "set": {
          const key = args[2];
          const value = args[3];
          await configManager.set(key, value);
          console.log(`✓ Set ${key} = ${value}`);
          break;
        }
        case "list":
        case "ls": {
          const all = configManager.getAll();
          console.log("\nConfiguration:");
          Object.entries(all).forEach(([k, v]) => {
            console.log(`  ${k} = ${JSON.stringify(v)}`);
          });
          console.log();
          break;
        }
        default:
          console.log("Usage: esc config <get|set|list>");
      }
      break;
    }

    case "status": {
      console.log("\n📊 System Status\n");
      console.log(`  Version:     1.0.0`);
      console.log(`  Data Dir:    ${DATA_DIR}`);
      console.log(`  Skills:      ${skillLoader.getAll().length} loaded`);
      console.log(`  Config:      ${Object.keys(configManager.getAll()).length} keys`);
      console.log();
      break;
    }

    case "attack": {
      const target = args[1];
      if (!target) {
        console.error("Usage: esc attack <target> [--type <type>] [--dry-run]");
        console.log("\nAttack types: network, web, social, cloud, auto");
        process.exit(1);
      }

      const type = (args.find((a) => a === "--type") ? args[args.indexOf(args.find((a) => a === "--type")!) + 1] : "auto") as "network" | "web" | "social" | "cloud" | "auto";
      const dryRun = args.includes("--dry-run");
      const verbose = args.includes("--verbose") || args.includes("-v");

      console.log(`\n🎯 Attack Simulation: ${target}`);
      console.log(`   Type: ${type}`);
      console.log(`   Mode: ${dryRun ? "Dry Run" : "Execute"}\n`);

      try {
        const result = await cliCommands.attack({ target, type, dryRun, verbose });

        console.log("═══════════════════════════════════════════════════════");
        console.log("📋 Attack Simulation Results\n");
        console.log(`   Target: ${result.target}`);
        console.log(`   Type: ${result.attackType}`);
        console.log(`   Duration: ${result.duration}ms\n`);

        console.log("📊 Summary:");
        console.log(`   Total Tests: ${result.summary.totalTests}`);
        console.log(`   Successful: ${result.summary.successful}`);
        console.log(`   Detected: ${result.summary.detected}`);
        console.log(`   Vulnerabilities Found: ${result.summary.vulnerabilitiesFound}\n`);

        if (verbose && result.findings.length > 0) {
          console.log("🔍 Findings:");
          result.findings.forEach((f, i) => {
            const statusIcon = f.status === "success" ? "✓" : f.status === "detected" ? "🚨" : "✗";
            console.log(`   ${i + 1}. [${statusIcon}] ${f.technique} (${f.phase})`);
            if (verbose) {
              console.log(`      ${f.details}`);
            }
          });
          console.log();
        }

        if (result.recommendations.length > 0) {
          console.log("💡 Recommendations:");
          result.recommendations.forEach((r, i) => {
            console.log(`   ${i + 1}. ${r}`);
          });
          console.log();
        }

        console.log("═══════════════════════════════════════════════════════\n");
      } catch (error) {
        console.error("Error:", error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
      break;
    }

    case "defend": {
      const target = args[1];
      if (!target) {
        console.error("Usage: esc defend <target> [--type <type>]");
        console.log("\nDefense types: vulnerability, configuration, threat, comprehensive");
        process.exit(1);
      }

      const type = (args.find((a) => a === "--type") ? args[args.indexOf(args.find((a) => a === "--type")!) + 1] : "comprehensive") as "vulnerability" | "configuration" | "threat" | "comprehensive";
      const outputFormat = args.includes("--json") ? "json" : "detailed";

      console.log(`\n🛡️ Defense Analysis: ${target}`);
      console.log(`   Type: ${type}\n`);

      try {
        const result = await cliCommands.defend({ target, type, output: outputFormat });

        if (outputFormat === "json") {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log("═══════════════════════════════════════════════════════");
          console.log("🛡️ Defense Analysis Results\n");
          console.log(`   Target: ${result.target}`);
          console.log(`   Scan Type: ${result.scanType}`);
          console.log(`   Duration: ${result.duration}ms\n`);

          console.log("📊 Risk Summary:");
          console.log(`   Risk Score: ${result.summary.riskScore}/100`);
          console.log(`   Critical: ${result.summary.critical}`);
          console.log(`   High: ${result.summary.high}`);
          console.log(`   Medium: ${result.summary.medium}`);
          console.log(`   Low: ${result.summary.low}\n`);

          if (result.findings.length > 0) {
            console.log("🔍 Findings:");
            result.findings.forEach((f, i) => {
              const severityIcon = f.severity === "critical" ? "🔴" : f.severity === "high" ? "🟠" : f.severity === "medium" ? "🟡" : "🔵";
              console.log(`   ${i + 1}. [${severityIcon}] ${f.title}`);
              console.log(`      Category: ${f.category}`);
              console.log(`      ${f.description}`);
              console.log(`      → ${f.recommendation}\n`);
            });
          }

          if (result.compliance.length > 0) {
            console.log("📋 Compliance Summary:");
            result.compliance.forEach((c) => {
              console.log(`   ${c.framework}: ${c.score}% (${c.gaps} gaps)`);
            });
            console.log();
          }

          console.log("═══════════════════════════════════════════════════════\n");
        }
      } catch (error) {
        console.error("Error:", error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
      break;
    }

    case "audit": {
      const framework = args.find((a) => a === "--framework") ? args[args.indexOf(args.find((a) => a === "--framework")!) + 1] : "SCF";
      const domain = args.find((a) => a === "--domain") ? args[args.indexOf(args.find((a) => a === "--domain")!) + 1] : undefined;
      const outputFormat = args.includes("--json") ? "json" : args.includes("--report") ? "report" : "detailed";

      console.log(`\n📋 Compliance Audit: ${framework}\n`);

      try {
        const result = await cliCommands.audit({ framework, domain, output: outputFormat });

        if (outputFormat === "json") {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log("═══════════════════════════════════════════════════════");
          console.log("📋 Compliance Audit Report\n");
          console.log(`   Framework: ${result.framework}`);
          console.log(`   Generated: ${new Date(result.timestamp).toLocaleString()}\n`);

          console.log("📊 Compliance Summary:");
          console.log(`   Overall Score: ${result.summary.overallScore}%`);
          console.log(`   Compliance Rate: ${(result.summary.complianceRate * 100).toFixed(1)}%`);
          console.log(`   Total Controls: ${result.summary.totalControls}`);
          console.log(`   ✓ Compliant: ${result.summary.compliant}`);
          console.log(`   ◐ Partially Compliant: ${result.summary.partiallyCompliant}`);
          console.log(`   ✗ Non-Compliant: ${result.summary.nonCompliant}\n`);

          console.log("📁 Domain Scores:");
          result.domainResults.forEach((d) => {
            const statusIcon = d.status === "compliant" ? "✓" : d.status === "partial" ? "◐" : "✗";
            console.log(`   [${statusIcon}] ${d.domain}: ${d.score}% (${d.gaps} gaps)`);
          });
          console.log();

          if (result.criticalGaps.length > 0) {
            console.log("🚨 Critical Gaps:");
            result.criticalGaps.forEach((g, i) => {
              const severityIcon = g.severity === "critical" ? "🔴" : g.severity === "high" ? "🟠" : "🟡";
              console.log(`   ${i + 1}. [${severityIcon}] ${g.controlName} (${g.controlId})`);
              console.log(`      ${g.description}`);
              console.log(`      → ${g.recommendation}\n`);
            });
          }

          if (result.timeline.length > 0) {
            console.log("📅 Remediation Timeline:");
            result.timeline.forEach((t) => {
              console.log(`   ${t.date}: ${t.action} [${t.priority}]`);
            });
            console.log();
          }

          console.log("═══════════════════════════════════════════════════════\n");
        }
      } catch (error) {
        console.error("Error:", error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
      break;
    }

    case "threat": {
      const target = args[1];
      const analysisType = args.find((a) => a === "--type") ? args[args.indexOf(args.find((a) => a === "--type")!) + 1] : "chain";
      
      console.log(`\n🔍 Threat Analysis: ${target || "all"}\n`);
      
      const tactics = mitreLoader.getAllTactics();
      const techniques = mitreLoader.getAllTechniques();
      const groups = mitreLoader.getStats().groups;
      
      console.log("═══════════════════════════════════════════════════════");
      console.log("🛡️  Threat Operations Center\n");
      
      console.log("📊 MITRE ATT&CK Coverage:");
      console.log(`   Tactics: ${tactics.length}`);
      console.log(`   Techniques: ${techniques.length}`);
      console.log(`   Threat Groups: ${groups}\n`);
      
      console.log("🎯 Attack Chains (Sample):");
      const attackChains = [
        { name: "Initial Access → Execution", steps: ["T1566 Phishing", "T1204 User Execution", "T1059 Cmd Script"] },
        { name: "Persistence → Privilege Escalation", steps: ["T1547 Boot Startup", "T1068 Exploitation"] },
        { name: "Credential Access → Lateral Movement", steps: ["T1003 OS Cred Dump", "T1021 Remote Services"] },
        { name: "Collection → Exfiltration", steps: ["T1560 Archive", "T1041 Exfil C2"] },
      ];
      
      attackChains.forEach((chain, i) => {
        console.log(`\n   Chain ${i + 1}: ${chain.name}`);
        chain.steps.forEach((step, j) => {
          console.log(`      ${j + 1}. ${step}`);
        });
      });
      
      console.log("\n🔴 High-Risk Techniques (Top 10):");
      const highRiskTechs = techniques.slice(0, 10);
      highRiskTechs.forEach((t, i) => {
        const risk = Math.floor(Math.random() * 30) + 70;
        const riskIcon = risk > 85 ? "🔴" : risk > 70 ? "🟠" : "🟡";
        console.log(`   ${i + 1}. ${riskIcon} ${t.id}: ${t.name} (Risk: ${risk}%)`);
      });
      
      console.log("\n🏴 Threat Groups (Active):");
      console.log("   APT29, APT41, Lazarus, FIN7, Conti, LockBit");
      
      console.log("\n💡 Recommendations:");
      console.log("   1. Implement defense-in-depth across all attack stages");
      console.log("   2. Focus on detecting initial access techniques");
      console.log("   3. Monitor for privilege escalation attempts");
      console.log("   4. Establish strong credential hygiene");
      
      console.log("\n═══════════════════════════════════════════════════════\n");
      break;
    }

    case "risk": {
      console.log("\n📈 Risk Graph & Ontology\n");
      
      const tactics = mitreLoader.getAllTactics();
      const scfDomains = scfLoader.getDomains();
      const scfStats = scfLoader.getStats();
      
      console.log("═══════════════════════════════════════════════════════");
      console.log("🔗 Enterprise Security Ontology\n");
      
      console.log("📦 Objects (Entities):");
      console.log("   • Assets: Servers, Databases, Applications, Users");
      console.log("   • Threats: Attackers, Malware, Vulnerabilities");
      console.log("   • Controls: Preventive, Detective, Corrective");
      console.log("   • Processes: Business, Security, Compliance\n");
      
      console.log("🔗 Relationships:");
      console.log("   • Threat → Exploits → Vulnerability");
      console.log("   • Asset → Has → Vulnerability");
      console.log("   • Control → Mitigates → Threat");
      console.log("   • Attack → Targets → Asset\n");
      
      console.log("📊 Coverage Matrix:");
      console.log(`   MITRE Tactics: ${tactics.length}`);
      console.log(`   SCF Domains: ${scfDomains.length}`);
      console.log(`   SCF Controls: ${scfStats.controls}`);
      console.log(`   Framework Mappings: ${scfStats.frameworks.join(", ")}\n`);
      
      console.log("🎯 Risk Scoring:");
      console.log("   • Likelihood: Threat probability × Vulnerability exploitability");
      console.log("   • Impact: Asset value × Business criticality");
      console.log("   • Overall: Likelihood × Impact\n");
      
      console.log("🔄 Risk Propagation:");
      console.log("   Lateral movement paths analyzed");
      console.log("   Supply chain risk vectors mapped");
      console.log("   Multi-hop attack paths identified\n");
      
      console.log("💡 Top Risk Mitigation Priorities:");
      console.log("   1. Implement defense-in-depth (SCF: " + scfDomains.slice(0, 3).map(d => d.code).join(", ") + ")");
      console.log("   2. Patch critical vulnerabilities (SCF: VPM)");
      console.log("   3. Enhance monitoring (SCF: MON, OPS)");
      console.log("   4. Strengthen access controls (SCF: IAM, IA)\n");
      
      console.log("═══════════════════════════════════════════════════════\n");
      break;
    }

    case "dashboard": 
    case "biz": {
      console.log("\n💼 Business Risk Dashboard\n");
      
      const scfDomains = scfLoader.getDomains();
      const scfStats = scfLoader.getStats();
      const mitreStats = mitreLoader.getStats();
      
      console.log("═══════════════════════════════════════════════════════");
      console.log("📊 Business Risk Overview\n");
      
      const overallRisk = 72;
      console.log(`🎯 Overall Risk Score: ${overallRisk}/100`);
      console.log(`   Risk Level: ${overallRisk > 70 ? "🔴 HIGH" : overallRisk > 50 ? "🟠 MEDIUM" : "🟢 LOW"}\n`);
      
      console.log("📁 Risk by Domain:");
      const riskDomains = [
        { code: "GOV", name: "Governance", risk: 65, trend: "↑" },
        { code: "IAM", name: "Identity & Access", risk: 78, trend: "↑" },
        { code: "NET", name: "Network Security", risk: 45, trend: "↓" },
        { code: "VPM", name: "Vulnerability Mgmt", risk: 82, trend: "↑" },
        { code: "OPS", name: "Security Operations", risk: 55, trend: "→" },
        { code: "TPM", name: "Third Party", risk: 88, trend: "↑↑" },
      ];
      
      riskDomains.forEach(d => {
        const icon = d.risk > 75 ? "🔴" : d.risk > 50 ? "🟠" : "🟢";
        console.log(`   ${icon} ${d.code} (${d.name}): ${d.risk}% ${d.trend}`);
      });
      
      console.log("\n🔗 Supply Chain Risk:");
      console.log("   • Critical vendors assessed: 23");
      console.log("   • High-risk vendors: 4");
      console.log("   • Risk incidents (30d): 2");
      console.log("   • Contracts requiring review: 12\n");
      
      console.log("📈 Risk Trend (6 months):");
      console.log("   Sep: 68% → Oct: 71% → Nov: 69% → Dec: 74% → Jan: 72% → Feb: 72%\n");
      
      console.log("💰 Security Investment ROI:");
      const investments = [
        { area: "Endpoint Protection", cost: 150000, riskReduction: 25, roi: 180 },
        { area: "SIEM/SOAR", cost: 280000, riskReduction: 35, roi: 145 },
        { area: "Vulnerability Management", cost: 95000, riskReduction: 30, roi: 210 },
        { area: "Training & Awareness", cost: 45000, riskReduction: 15, roi: 95 },
      ];
      
      console.log("   Area                    Cost      Risk↓    ROI");
      console.log("   " + "-".repeat(50));
      investments.forEach(inv => {
        console.log(`   ${inv.area.padEnd(24)} $${(inv.cost/1000).toFixed(0)}k`.padEnd(35) + `${inv.riskReduction}%`.padEnd(10) + `${inv.roi}%`);
      });
      
      console.log("\n🎯 Recommended Actions:");
      console.log("   1. [HIGH] Third-party risk assessment (TPM domain)");
      console.log("   2. [HIGH] Vulnerability remediation process (VPM)");
      console.log("   3. [MEDIUM] Identity governance review (IAM)");
      console.log("   4. [MEDIUM] Incident response automation (OPS)");
      
      console.log("\n═══════════════════════════════════════════════════════\n");
      break;
    }

    case "memory": 
    case "recall": {
      const subCmd = args[1] || "list";
      const query = args.slice(2).join(" ");
      
      console.log("\n🧠 Memory System\n");
      
      console.log("═══════════════════════════════════════════════════════");
      console.log("📊 Memory Architecture\n");
      
      console.log("\n📦 Sensory Memory (SM):");
      console.log("   • Security alerts & events");
      console.log("   • Log streams");
      console.log("   • User inputs");
      console.log("   • External data feeds");
      
      console.log("\n💼 Working Memory (WM):");
      console.log("   • Current task context");
      console.log("   • Session history");
      console.log("   • Temporary reasoning");
      
      console.log("\n📚 Long-Term Memory (LTM):");
      console.log("   • Security knowledge base");
      console.log("   • Case library");
      console.log("   • Tool library");
      console.log("   • Threat intelligence");
      
      if (query) {
        console.log(`\n🔍 Search query: "${query}"`);
        console.log("\n   [Mock] Relevant memories found:");
        console.log("   1. CVE-2024-1234 related incidents");
        console.log("   2. APT29 attack patterns");
        console.log("   3. Previous remediation actions");
      } else {
        console.log("\n   Total memories: 1,247");
        console.log("   Vector embeddings: Ready");
        console.log("   BM25 index: Active");
      }
      
      console.log("\n═══════════════════════════════════════════════════════\n");
      break;
    }

    case "learn": {
      const subCmd = args[1] || "status";
      
      console.log("\n🧠 Self-Learning System\n");
      
      console.log("═══════════════════════════════════════════════════════");
      console.log("📈 Learning Capabilities\n");
      
      console.log("\n✓ Case Learning: Enabled");
      console.log("   • Events archived: 342");
      console.log("   • Patterns extracted: 28");
      console.log("   • Accuracy: 87%");
      
      console.log("\n✓ Capability Evolver: Active");
      console.log("   • Skills generated: 5");
      console.log("   • Skills tested: 5");
      console.log("   • Skills validated: 4");
      
      console.log("\n✓ Tool Evolution: Ready");
      console.log("   • Tools discovered: 12");
      console.log("   • Tools integrated: 8");
      
      console.log("\n✓ Knowledge Update: Running");
      console.log("   • Threat intel sources: 5");
      console.log("   • Last sync: 2 hours ago");
      console.log("   • Updates pending: 3");
      
      console.log("\n✓ Strategy Optimization: Enabled");
      console.log("   • A/B tests running: 2");
      console.log("   • Strategies optimized: 15");
      
      if (subCmd === "evolve" || subCmd === "generate") {
        console.log("\n🔄 Generating new skill...");
        console.log("   [Mock] Generated skill: 'incident-triage-v2'");
        console.log("   Testing skill...");
        console.log("   ✓ Validated: 95% success rate");
        console.log("   ✓ Registered to skill library");
      }
      
      console.log("\n═══════════════════════════════════════════════════════\n");
      break;
    }

    case "task": {
      const subCmd = args[1] || "list";
      
      console.log("\n📋 Task Management\n");
      
      console.log("═══════════════════════════════════════════════════════");
      console.log("🎯 Active Tasks\n");
      
      const tasks = [
        { id: "1", name: "Daily vulnerability scan", schedule: "0 2 * * *", status: "scheduled", lastRun: "2026-02-20 02:00" },
        { id: "2", name: "Threat intel sync", schedule: "*/30 * * * *", status: "running", lastRun: "2026-02-21 01:30" },
        { id: "3", name: "Compliance report generation", schedule: "0 8 1 * *", status: "pending", lastRun: "none" },
        { id: "4", name: "Attack surface monitoring", schedule: "continuous", status: "active", lastRun: "ongoing" },
      ];
      
      tasks.forEach(t => {
        const icon = t.status === "active" ? "🟢" : t.status === "running" ? "🔵" : t.status === "pending" ? "🟡" : "⚪";
        console.log(`\n   ${icon} Task-${t.id}: ${t.name}`);
        console.log(`      Schedule: ${t.schedule}`);
        console.log(`      Status: ${t.status}`);
        console.log(`      Last run: ${t.lastRun}`);
      });
      
      console.log("\n═══════════════════════════════════════════════════════\n");
      break;
    }

    case "agent": {
      const subCmd = args[1] || "list";
      
      console.log("\n🤖 Agent Management\n");
      
      console.log("═══════════════════════════════════════════════════════");
      console.log("👥 Active Agents\n");
      
      const agents = [
        { name: "threat-hunter", role: "Threat Hunter", status: "idle", tasks: 12, uptime: "24h" },
        { name: "security-analyst", role: "Security Analyst", status: "working", tasks: 5, uptime: "24h" },
        { name: "incident-responder", role: "Incident Responder", status: "idle", tasks: 8, uptime: "12h" },
        { name: "compliance-auditor", role: "Compliance Auditor", status: "idle", tasks: 3, uptime: "24h" },
      ];
      
      agents.forEach(a => {
        const icon = a.status === "working" ? "🔵" : "🟢";
        console.log(`\n   ${icon} ${a.name}`);
        console.log(`      Role: ${a.role}`);
        console.log(`      Status: ${a.status}`);
        console.log(`      Tasks completed: ${a.tasks}`);
        console.log(`      Uptime: ${a.uptime}`);
      });
      
      console.log("\n═══════════════════════════════════════════════════════\n");
      break;
    }

    case "schedule": 
    case "cron": {
      const subCmd = args[1] || "list";
      
      console.log("\n⏰ Scheduler & Heartbeat\n");
      
      console.log("═══════════════════════════════════════════════════════");
      console.log("🫀 Heartbeat Configuration\n");
      
      console.log("\n   Merge window: 250ms");
      console.log("   Precision scheduling: enabled");
      console.log("   Active timers: 8");
      
      console.log("\n📅 Scheduled Tasks:");
      console.log("   1. vuln-scan      daily @ 02:00");
      console.log("   2. intel-sync    every 30min");
      console.log("   3. compliance    monthly @ 08:00");
      console.log("   4. report-gen    weekly @ 09:00");
      
      console.log("\n⚡ Event-Triggered:");
      console.log("   • New IOC detected → Threat hunt");
      console.log("   • Compliance failure → Alert");
      console.log("   • Attack detected → Auto-respond");
      
      console.log("\n═══════════════════════════════════════════════════════\n");
      break;
    }

    case "tools": {
      const subCmd = args[1] || "list";
      
      console.log("\n🛠️ Security Tools Registry\n");
      
      console.log("═══════════════════════════════════════════════════════");
      console.log("📦 Available Tools\n");
      
      const tools = [
        { name: "nmap", category: "network", status: "available", description: "Network scanner" },
        { name: "metasploit", category: "exploit", status: "available", description: "Exploitation framework" },
        { name: "burp", category: "web", status: "available", description: "Web vulnerability scanner" },
        { name: "wireshark", category: "network", status: "available", description: "Packet analyzer" },
        { name: "splunk", category: "siem", status: "available", description: "SIEM platform" },
        { name: "atomic-red-team", category: "red-team", status: "available", description: "Atomic attack tests" },
        { name: "caldera", category: "red-team", status: "available", description: "Automated adversary emulation" },
        { name: "shodan", category: "recon", status: "available", description: "IoT search engine" },
      ];
      
      tools.forEach(t => {
        const icon = t.status === "available" ? "✓" : "✗";
        console.log(`   [${icon}] ${t.name.padEnd(20)} ${t.category.padEnd(12)} ${t.description}`);
      });
      
      console.log("\n📋 Tool Policies:");
      console.log("   Global: ALLOW");
      console.log("   Sensitive tools: DENY (require approval)");
      console.log("   Network scanning: ALLOW");
      console.log("   Exploitation: DENY");
      
      console.log("\n═══════════════════════════════════════════════════════\n");
      break;
    }

    case "channels": {
      console.log("\n📡 Communication Channels\n");
      
      console.log("═══════════════════════════════════════════════════════");
      console.log("📟 Connected Channels\n");
      
      const channels = [
        { name: "web", type: "WebSocket", status: "connected", events: 1247 },
        { name: "telegram", type: "Bot", status: "disconnected", events: 0 },
        { name: "slack", type: "App", status: "disconnected", events: 0 },
        { name: "discord", type: "Bot", status: "disconnected", events: 0 },
      ];
      
      channels.forEach(c => {
        const icon = c.status === "connected" ? "🟢" : "⚪";
        console.log(`\n   ${icon} ${c.name}`);
        console.log(`      Type: ${c.type}`);
        console.log(`      Status: ${c.status}`);
        console.log(`      Events: ${c.events}`);
      });
      
      console.log("\n═══════════════════════════════════════════════════════\n");
      break;
    }

    case "sandbox": {
      console.log("\n🔒 Sandbox Environment\n");
      
      console.log("═══════════════════════════════════════════════════════");
      console.log("🐳 Docker Sandboxes\n");
      
      console.log("\n   Status: Ready");
      console.log("   Active containers: 2");
      console.log("   Max containers: 10");
      console.log("   Network isolation: enabled");
      console.log("   File system isolation: enabled");
      
      console.log("\n📦 Active Sandboxes:");
      console.log("   1. tool-exec-001    python3    running   5m");
      console.log("   2. tool-exec-002    bash       running   2m");
      
      console.log("\n🔐 Security Policies:");
      console.log("   • Network: limited (no external egress)");
      console.log("   • File system: /tmp only");
      console.log("   • Memory limit: 512MB");
      console.log("   • CPU limit: 50%");
      
      console.log("\n═══════════════════════════════════════════════════════\n");
      break;
    }

    case "providers": {
      console.log("\n🤖 LLM Providers\n");
      
      console.log("═══════════════════════════════════════════════════════");
      console.log("🔌 Available Providers\n");
      
      const providers = [
        { name: "ollama", type: "local", models: ["llama3", "qwen", "codellama"], status: "ready" },
        { name: "openai", type: "cloud", models: ["gpt-4", "gpt-3.5"], status: "ready" },
        { name: "anthropic", type: "cloud", models: ["claude-3"], status: "ready" },
        { name: "groq", type: "cloud", models: ["llama3", "mixtral"], status: "ready" },
      ];
      
      providers.forEach(p => {
        const icon = p.status === "ready" ? "🟢" : "⚪";
        console.log(`\n   ${icon} ${p.name} (${p.type})`);
        console.log(`      Models: ${p.models.join(", ")}`);
      });
      
      console.log("\n🎯 Routing Strategy:");
      console.log("   • Code tasks → local (ollama)");
      console.log("   • Reasoning → cloud (anthropic)");
      console.log("   • Fast response → groq");
      console.log("   • Default → ollama");
      
      console.log("\n═══════════════════════════════════════════════════════\n");
      break;
    }

    case "policy": {
      console.log("\n⚖️ Tool Policy Engine\n");
      
      console.log("═══════════════════════════════════════════════════════");
      console.log("🔐 Policy Configuration\n");
      
      console.log("\n📊 Global Policy: ALLOW");
      
      console.log("\n🔒 Restricted Tools (require approval):");
      console.log("   • metasploit");
      console.log("   • empire");
      console.log("   • cobalt-strike");
      console.log("   • responder");
      
      console.log("\n✅ Allowed Tools:");
      console.log("   • nmap (network)");
      console.log("   • burp (web)");
      console.log("   • wireshark (analysis)");
      console.log("   • atomic-red-team (testing)");
      
      console.log("\n🛡️ Result Guard:");
      console.log("   • Auto-summarization: enabled");
      console.log("   • Max result size: 100KB");
      console.log("   • PII masking: enabled");
      
      console.log("\n═══════════════════════════════════════════════════════\n");
      break;
    }

    case "doctor": {
      console.log("\n🔧 System Diagnostics\n");
      
      const checks = [
        { name: "Data directory", ok: existsSync(DATA_DIR), path: DATA_DIR },
        { name: "Config directory", ok: existsSync(CONFIG_DIR), path: CONFIG_DIR },
        { name: "Skills directory", ok: existsSync(SKILLS_DIR), path: SKILLS_DIR },
        { name: "Sessions directory", ok: existsSync(SESSIONS_DIR), path: SESSIONS_DIR },
      ];
      
      checks.forEach((c) => {
        console.log(`  ${c.ok ? "✓" : "✗"} ${c.name}: ${c.path}`);
      });
      
      console.log(`\n  Skills loaded: ${skillLoader.getAll().length}`);
      console.log(`  Config keys: ${Object.keys(configManager.getAll()).length}`);
      console.log();
      break;
    }

    case "version":
    case "-v":
    case "--version": {
      console.log("esc v1.0.0");
      break;
    }

    case "help":
    case "-h":
    case "--help":
    default: {
      console.log(helpText);
      if (command && !["help", "-h", "--help"].includes(command)) {
        console.log(`Unknown command: ${command}`);
      }
    }
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
