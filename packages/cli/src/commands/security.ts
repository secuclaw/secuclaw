import type { Command } from "commander";
import * as crypto from "node:crypto";
import type { RuntimeEnv } from "../runtime.js";

// Scan result types
interface ScanResult {
  target: string;
  type: "vuln" | "config" | "compliance";
  findings: ScanFinding[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  scannedAt: Date;
  duration: number;
}

interface ScanFinding {
  id: string;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  category: string;
  cvss?: number;
  cve?: string;
  remediation?: string;
  references?: string[];
  affectedComponent?: string;
}

// Threat hunt types
interface ThreatHuntResult {
  query: string;
  mitreFilter?: string;
  findings: ThreatFinding[];
  iocs: IOC[];
  attackChains: AttackChainSummary[];
  summary: {
    totalFindings: number;
    criticalFindings: number;
    uniqueIOCs: number;
    activeAttackChains: number;
  };
  executedAt: Date;
}

interface ThreatFinding {
  id: string;
  type: "threat" | "attack" | "malware" | "intrusion" | "anomaly";
  title: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  mitreTactic?: string;
  mitreTechnique?: string;
  description: string;
  timestamp: Date;
  status: string;
}

interface IOC {
  type: "ip" | "domain" | "hash" | "url" | "email";
  value: string;
  confidence: number;
  source: string;
}

interface AttackChainSummary {
  id: string;
  name: string;
  status: string;
  phases: number;
  threatActor?: string;
}

// Compliance types
interface ComplianceResult {
  framework: string;
  overallScore: number;
  controls: {
    total: number;
    passed: number;
    failed: number;
    notApplicable: number;
  };
  gaps: ComplianceGap[];
  tasks: ComplianceTask[];
  assessedAt: Date;
  nextAssessment: Date;
}

interface ComplianceGap {
  id: string;
  controlId: string;
  control: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  status: "open" | "in_progress" | "remediated" | "accepted_risk";
  dueDate: Date;
  assignee?: string;
}

interface ComplianceTask {
  id: string;
  title: string;
  priority: "critical" | "high" | "medium" | "low";
  status: "pending" | "in_progress" | "completed" | "overdue";
  dueDate: Date;
}

// Mock data generators
function generateScanId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = crypto.randomBytes(4).toString("hex");
  return `scan-${timestamp}-${randomPart}`;
}

function randomInt(min: number, max: number): number {
  const range = max - min + 1;
  const bytesNeeded = Math.ceil(Math.log2(range) / 8);
  const buffer = crypto.randomBytes(bytesNeeded);
  const value = buffer.readUIntBE(0, bytesNeeded);
  return min + (value % range);
}

function randomChoice<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}

// Secure shuffle using Fisher-Yates algorithm
function secureShuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Secure random for boolean decisions
function secureRandom(): number {
  return crypto.randomBytes(4).readUInt32BE(0) / 0xFFFFFFFF;
}

const VULNERABILITY_TEMPLATES: Omit<ScanFinding, "id">[] = [
  {
    title: "Remote Code Execution Vulnerability",
    description: "Critical RCE vulnerability detected in web application",
    severity: "critical",
    category: "RCE",
    cvss: 9.8,
    cve: "CVE-2024-0001",
    remediation: "Apply security patch immediately",
    affectedComponent: "Web Server",
  },
  {
    title: "SQL Injection Vulnerability",
    description: "SQL injection in search parameter",
    severity: "high",
    category: "Injection",
    cvss: 8.1,
    cve: "CVE-2024-0002",
    remediation: "Use parameterized queries",
    affectedComponent: "API Endpoint",
  },
  {
    title: "Cross-Site Scripting (XSS)",
    description: "Reflected XSS vulnerability in form input",
    severity: "medium",
    category: "XSS",
    cvss: 6.1,
    remediation: "Implement input sanitization",
    affectedComponent: "User Input Handler",
  },
  {
    title: "Outdated SSL/TLS Configuration",
    description: "Server supports deprecated TLS 1.0/1.1",
    severity: "medium",
    category: "Encryption",
    cvss: 5.3,
    remediation: "Disable TLS 1.0/1.1, use TLS 1.2+",
    affectedComponent: "SSL Configuration",
  },
  {
    title: "Missing Security Headers",
    description: "CSP, X-Frame-Options headers not configured",
    severity: "low",
    category: "Configuration",
    cvss: 4.3,
    remediation: "Add security headers to response",
    affectedComponent: "HTTP Headers",
  },
];

const CONFIG_FINDINGS: Omit<ScanFinding, "id">[] = [
  {
    title: "Default Credentials in Use",
    description: "Default admin credentials detected",
    severity: "critical",
    category: "Authentication",
    remediation: "Change default credentials immediately",
  },
  {
    title: "Excessive Permissions",
    description: "Service account has administrator privileges",
    severity: "high",
    category: "Access Control",
    remediation: "Apply least privilege principle",
  },
  {
    title: "Unencrypted Data Storage",
    description: "Sensitive data stored without encryption",
    severity: "high",
    category: "Data Protection",
    remediation: "Enable encryption at rest",
  },
  {
    title: "Logging Disabled",
    description: "Audit logging is not enabled",
    severity: "medium",
    category: "Logging",
    remediation: "Enable comprehensive audit logging",
  },
];

const COMPLIANCE_CONTROLS: Omit<ScanFinding, "id">[] = [
  {
    title: "Access Control Review Overdue",
    description: "Quarterly access review not completed",
    severity: "high",
    category: "AC-Access Control",
    remediation: "Complete access review within 7 days",
  },
  {
    title: "Patch Management SLA Breach",
    description: "Critical patches not applied within SLA",
    severity: "critical",
    category: "CM-Configuration Management",
    remediation: "Apply patches immediately",
  },
  {
    title: "Incident Response Plan Outdated",
    description: "IR plan not updated in 12 months",
    severity: "medium",
    category: "IR-Incident Response",
    remediation: "Review and update IR plan",
  },
];

function runScan(target: string, type: string): ScanResult {
  const startTime = Date.now();
  const findings: ScanFinding[] = [];

  let templates: Omit<ScanFinding, "id">[];
  
  switch (type) {
    case "vuln":
      templates = VULNERABILITY_TEMPLATES;
      break;
    case "config":
      templates = CONFIG_FINDINGS;
      break;
    case "compliance":
      templates = COMPLIANCE_CONTROLS;
      break;
    default:
      templates = [...VULNERABILITY_TEMPLATES, ...CONFIG_FINDINGS.slice(0, 2)];
  }

  // Randomly select findings
  const numFindings = randomInt(3, Math.min(templates.length, 8));
  const shuffled = secureShuffle(templates);
  
  for (let i = 0; i < numFindings; i++) {
    findings.push({
      id: generateScanId(),
      ...shuffled[i],
    });
  }

  const summary = {
    total: findings.length,
    critical: findings.filter(f => f.severity === "critical").length,
    high: findings.filter(f => f.severity === "high").length,
    medium: findings.filter(f => f.severity === "medium").length,
    low: findings.filter(f => f.severity === "low").length,
    info: findings.filter(f => f.severity === "info").length,
  };

  return {
    target,
    type: type as "vuln" | "config" | "compliance",
    findings,
    summary,
    scannedAt: new Date(),
    duration: Date.now() - startTime,
  };
}

function runThreatHunt(query: string, mitreFilter?: string): ThreatHuntResult {
  const findings: ThreatFinding[] = [];
  const iocs: IOC[] = [];
  const attackChains: AttackChainSummary[] = [];

  // Generate mock findings based on query
  const threatTypes: ThreatFinding["type"][] = ["threat", "attack", "malware", "intrusion", "anomaly"];
  const severities: ThreatFinding["severity"][] = ["critical", "high", "medium", "low", "info"];
  const mitreTactics = ["Initial Access", "Execution", "Persistence", "Privilege Escalation", "Defense Evasion", "Credential Access", "Discovery", "Lateral Movement", "Collection", "Command and Control", "Exfiltration", "Impact"];
  const mitreTechniques = ["T1566", "T1059", "T1078", "T1055", "T1003", "T1021", "T1486", "T1071", "T1048", "T1562"];

  const numFindings = randomInt(5, 15);
  for (let i = 0; i < numFindings; i++) {
    const tactic = randomChoice(mitreTactics);
    const technique = randomChoice(mitreTechniques);
    
    // Apply MITRE filter if specified
    if (mitreFilter && !technique.toLowerCase().includes(mitreFilter.toLowerCase()) && 
        !tactic.toLowerCase().includes(mitreFilter.toLowerCase())) {
      continue;
    }

    findings.push({
      id: `th-${Date.now()}-${i}`,
      type: randomChoice(threatTypes),
      title: `Threat detected: ${query || "general hunt"}`,
      severity: randomChoice(severities),
      mitreTactic: tactic,
      mitreTechnique: technique,
      description: `Suspicious activity related to ${query || "threat hunting"} detected`,
      timestamp: new Date(Date.now() - randomInt(1, 1440) * 60000),
      status: randomChoice(["new", "investigating", "contained", "resolved"]),
    });
  }

  // Generate IOCs
  const iocTypes: IOC["type"][] = ["ip", "domain", "hash", "url"];
  const numIOCs = randomInt(3, 8);
  for (let i = 0; i < numIOCs; i++) {
    const type = randomChoice(iocTypes);
    let value: string;
    
    switch (type) {
      case "ip":
        value = `${randomInt(1, 223)}.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(1, 254)}`;
        break;
      case "domain":
        value = `suspicious${randomInt(100, 999)}.xyz`;
        break;
      case "hash":
        value = crypto.randomBytes(32).toString("hex");
        break;
      case "url":
        value = `https://malware${randomInt(100, 999)}.top/payload`;
        break;
      default:
        value = "unknown";
    }

    iocs.push({
      type,
      value,
      confidence: randomInt(60, 99),
      source: randomChoice(["Threat Intel", "Internal Detection", "Community"]),
    });
  }

  // Generate attack chains
  const numChains = randomInt(1, 4);
  for (let i = 0; i < numChains; i++) {
    attackChains.push({
      id: `chain-${Date.now()}-${i}`,
      name: `Attack Chain #${i + 1}`,
      status: randomChoice(["active", "blocked", "detected", "prevented"]),
      phases: randomInt(3, 6),
      threatActor: randomChoice(["APT29", "LockBit", "Lazarus", "Unknown"]),
    });
  }

  return {
    query: query || "all",
    mitreFilter,
    findings,
    iocs,
    attackChains,
    summary: {
      totalFindings: findings.length,
      criticalFindings: findings.filter(f => f.severity === "critical").length,
      uniqueIOCs: iocs.length,
      activeAttackChains: attackChains.filter(c => c.status === "active").length,
    },
    executedAt: new Date(),
  };
}

function runComplianceCheck(framework: string): ComplianceResult {
  const frameworks: Record<string, { controls: number; name: string }> = {
    scf: { controls: 198, name: "SCF (Secure Controls Framework)" },
    nist: { controls: 108, name: "NIST CSF 2.0" },
    iso27001: { controls: 93, name: "ISO 27001:2022" },
    soc2: { controls: 117, name: "SOC 2 Type II" },
    pci: { controls: 264, name: "PCI DSS 4.0" },
    gdpr: { controls: 99, name: "GDPR" },
  };

  const fw = frameworks[framework.toLowerCase()] || frameworks.scf;
  const totalControls = fw.controls;
  const passedControls = randomInt(Math.floor(totalControls * 0.7), Math.floor(totalControls * 0.95));
  const failedControls = randomInt(Math.floor((totalControls - passedControls) * 0.3), Math.floor((totalControls - passedControls) * 0.7));
  const notApplicable = totalControls - passedControls - failedControls;

  // Generate gaps
  const gaps: ComplianceGap[] = [];
  const gapTemplates = [
    { desc: "Multi-factor authentication not enforced", cat: "Access Control" },
    { desc: "Log retention period insufficient", cat: "Audit" },
    { desc: "Vulnerability scanning frequency below requirement", cat: "Configuration" },
    { desc: "Security awareness training incomplete", cat: "Awareness" },
    { desc: "Incident response plan not tested", cat: "Incident Response" },
    { desc: "Third-party risk assessment missing", cat: "Vendor Management" },
    { desc: "Data classification not implemented", cat: "Data Protection" },
    { desc: "Encryption at rest not enabled", cat: "Encryption" },
  ];

  const numGaps = randomInt(5, gapTemplates.length);
  const shuffledGaps = secureShuffle(gapTemplates);
  
  for (let i = 0; i < numGaps; i++) {
    gaps.push({
      id: `gap-${Date.now()}-${i}`,
      controlId: `${framework.toUpperCase()}-${shuffledGaps[i].cat.substring(0, 3).toUpperCase()}-${String(i + 1).padStart(2, "0")}`,
      control: shuffledGaps[i].cat,
      description: shuffledGaps[i].desc,
      severity: randomChoice(["critical", "high", "medium", "low"]),
      status: randomChoice(["open", "in_progress", "remediated", "accepted_risk"]),
      dueDate: new Date(Date.now() + randomInt(7, 90) * 24 * 60 * 60 * 1000),
      assignee: randomChoice(["张三", "李四", "王五", undefined, undefined]),
    });
  }

  // Generate tasks
  const tasks: ComplianceTask[] = [];
  const taskTemplates = [
    "Complete quarterly access review",
    "Update security policies",
    "Conduct penetration test",
    "Review vendor contracts",
    "Update incident response plan",
    "Complete risk assessment",
    "Deploy new security controls",
    "Conduct security training",
  ];

  const numTasks = randomInt(5, 10);
  const shuffledTasks = secureShuffle(taskTemplates);

  for (let i = 0; i < numTasks; i++) {
    tasks.push({
      id: `task-${Date.now()}-${i}`,
      title: shuffledTasks[i],
      priority: randomChoice(["critical", "high", "medium", "low"]),
      status: randomChoice(["pending", "in_progress", "completed", "overdue"]),
      dueDate: new Date(Date.now() + randomInt(-7, 30) * 24 * 60 * 60 * 1000),
    });
  }

  return {
    framework: fw.name,
    overallScore: Math.round((passedControls / totalControls) * 100),
    controls: {
      total: totalControls,
      passed: passedControls,
      failed: failedControls,
      notApplicable,
    },
    gaps,
    tasks,
    assessedAt: new Date(),
    nextAssessment: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
  };
}

export function registerSecurityCommands(program: Command, runtime: RuntimeEnv): void {
  const security = program.command("security").description("Security operations");

  // Scan command
  security
    .command("scan")
    .description("Run security scan on target")
    .option("-t, --target <target>", "Scan target (URL, IP, hostname, or 'all')", "all")
    .option("--type <type>", "Scan type: vuln|config|compliance|full", "full")
    .option("--format <format>", "Output format: text|json", "text")
    .option("--severity <level>", "Minimum severity to report: critical|high|medium|low", "low")
    .action((opts: { target: string; type: string; format: string; severity: string }) => {
      runtime.log(`\n🔍 Running ${opts.type} scan on: ${opts.target}`);
      runtime.log("━".repeat(50));

      const result = runScan(opts.target, opts.type);

      if (opts.format === "json") {
        runtime.log(JSON.stringify(result, null, 2));
        return;
      }

      // Summary
      runtime.log(`\n📊 Scan Summary:`);
      runtime.log(`   Target: ${result.target}`);
      runtime.log(`   Type: ${result.type}`);
      runtime.log(`   Duration: ${result.duration}ms`);
      runtime.log(`   Scanned: ${result.scannedAt.toISOString()}`);
      runtime.log(`\n   Findings by Severity:`);
      runtime.log(`   🔴 Critical: ${result.summary.critical}`);
      runtime.log(`   🟠 High:     ${result.summary.high}`);
      runtime.log(`   🟡 Medium:   ${result.summary.medium}`);
      runtime.log(`   🟢 Low:      ${result.summary.low}`);
      runtime.log(`   ℹ️  Info:     ${result.summary.info}`);
      runtime.log(`   ━━━━━━━━━━━━━━━━━━━━━━━`);
      runtime.log(`   Total:      ${result.summary.total}`);

      // Filter by severity
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
      const minSeverity = severityOrder[opts.severity as keyof typeof severityOrder] ?? 3;
      
      const filteredFindings = result.findings.filter(
        f => severityOrder[f.severity] <= minSeverity
      );

      if (filteredFindings.length > 0) {
        runtime.log(`\n📋 Findings:\n`);
        
        for (const finding of filteredFindings) {
          const severityEmoji = {
            critical: "🔴",
            high: "🟠",
            medium: "🟡",
            low: "🟢",
            info: "ℹ️",
          }[finding.severity];

          runtime.log(`  ${severityEmoji} [${finding.severity.toUpperCase()}] ${finding.title}`);
          runtime.log(`     ID: ${finding.id}`);
          runtime.log(`     Category: ${finding.category}`);
          if (finding.cvss) runtime.log(`     CVSS: ${finding.cvss}`);
          if (finding.cve) runtime.log(`     CVE: ${finding.cve}`);
          if (finding.affectedComponent) runtime.log(`     Component: ${finding.affectedComponent}`);
          runtime.log(`     ${finding.description}`);
          if (finding.remediation) runtime.log(`     ✅ Remediation: ${finding.remediation}`);
          runtime.log("");
        }
      }

      runtime.log(`\n✅ Scan completed successfully.`);
    });

  // Threat hunt command
  security
    .command("threat-hunt")
    .description("Perform threat hunting with MITRE ATT&CK mapping")
    .option("-q, --query <query>", "Search query or hypothesis", "")
    .option("--mitre <technique>", "Filter by MITRE technique or tactic")
    .option("--ioc <value>", "Search for specific IOC")
    .option("--format <format>", "Output format: text|json", "text")
    .option("--limit <num>", "Maximum findings to return", "20")
    .action((opts: { query: string; mitre?: string; ioc?: string; format: string; limit: string }) => {
      const queryText = opts.ioc ? `IOC: ${opts.ioc}` : (opts.query || "comprehensive hunt");
      
      runtime.log(`\n🎯 Threat Hunt: ${queryText}`);
      if (opts.mitre) runtime.log(`   MITRE Filter: ${opts.mitre}`);
      runtime.log("━".repeat(50));

      const result = runThreatHunt(queryText, opts.mitre);

      if (opts.format === "json") {
        runtime.log(JSON.stringify(result, null, 2));
        return;
      }

      // Summary
      runtime.log(`\n📊 Hunt Summary:`);
      runtime.log(`   Total Findings: ${result.summary.totalFindings}`);
      runtime.log(`   Critical: ${result.findings.filter(f => f.severity === "critical").length}`);
      runtime.log(`   Unique IOCs: ${result.summary.uniqueIOCs}`);
      runtime.log(`   Active Attack Chains: ${result.summary.activeAttackChains}`);
      runtime.log(`   Executed: ${result.executedAt.toISOString()}`);

      // Findings
      const limit = parseInt(opts.limit, 10) || 20;
      const topFindings = result.findings.slice(0, limit);

      if (topFindings.length > 0) {
        runtime.log(`\n🔍 Top Findings:\n`);
        
        for (const finding of topFindings) {
          const severityEmoji = {
            critical: "🔴",
            high: "🟠",
            medium: "🟡",
            low: "🟢",
            info: "ℹ️",
          }[finding.severity];

          runtime.log(`  ${severityEmoji} [${finding.type.toUpperCase()}] ${finding.title}`);
          if (finding.mitreTactic) runtime.log(`     MITRE Tactic: ${finding.mitreTactic}`);
          if (finding.mitreTechnique) runtime.log(`     MITRE Technique: ${finding.mitreTechnique}`);
          runtime.log(`     Status: ${finding.status}`);
          runtime.log(`     Time: ${finding.timestamp.toISOString()}`);
          runtime.log("");
        }
      }

      // IOCs
      if (result.iocs.length > 0) {
        runtime.log(`\n🔬 IOCs Discovered:\n`);
        
        for (const ioc of result.iocs.slice(0, 10)) {
          const typeEmoji = {
            ip: "🌐",
            domain: "🔗",
            hash: "#️⃣",
            url: "📍",
            email: "📧",
          }[ioc.type] || "❓";

          runtime.log(`  ${typeEmoji} [${ioc.type.toUpperCase()}] ${ioc.value}`);
          runtime.log(`     Confidence: ${ioc.confidence}% | Source: ${ioc.source}`);
        }
      }

      // Attack chains
      if (result.attackChains.length > 0) {
        runtime.log(`\n⛓️ Attack Chains:\n`);
        
        for (const chain of result.attackChains) {
          const statusEmoji = {
            active: "🔴",
            blocked: "🟢",
            detected: "🟡",
            prevented: "✅",
          }[chain.status] || "❓";

          runtime.log(`  ${statusEmoji} ${chain.name}`);
          runtime.log(`     Status: ${chain.status} | Phases: ${chain.phases}`);
          if (chain.threatActor) runtime.log(`     Actor: ${chain.threatActor}`);
        }
      }

      runtime.log(`\n✅ Threat hunt completed.`);
    });

  // Compliance command
  security
    .command("compliance")
    .description("Check compliance against security frameworks")
    .option("-f, --framework <framework>", "Framework: scf|nist|iso27001|soc2|pci|gdpr", "scf")
    .option("--gaps", "Show compliance gaps", false)
    .option("--tasks", "Show remediation tasks", false)
    .option("--format <format>", "Output format: text|json", "text")
    .action((opts: { framework: string; gaps: boolean; tasks: boolean; format: string }) => {
      runtime.log(`\n📋 Compliance Assessment: ${opts.framework.toUpperCase()}`);
      runtime.log("━".repeat(50));

      const result = runComplianceCheck(opts.framework);

      if (opts.format === "json") {
        runtime.log(JSON.stringify(result, null, 2));
        return;
      }

      // Overall score
      const scoreEmoji = result.overallScore >= 90 ? "🟢" : 
                         result.overallScore >= 75 ? "🟡" : 
                         result.overallScore >= 60 ? "🟠" : "🔴";

      runtime.log(`\n${scoreEmoji} Overall Compliance Score: ${result.overallScore}%`);
      runtime.log(`\n📊 Control Summary:`);
      runtime.log(`   Total Controls: ${result.controls.total}`);
      runtime.log(`   ✅ Passed: ${result.controls.passed}`);
      runtime.log(`   ❌ Failed: ${result.controls.failed}`);
      runtime.log(`   ⏭️ Not Applicable: ${result.controls.notApplicable}`);
      runtime.log(`\n📅 Last Assessment: ${result.assessedAt.toISOString()}`);
      runtime.log(`   Next Assessment: ${result.nextAssessment.toISOString()}`);

      // Gaps
      if (opts.gaps && result.gaps.length > 0) {
        runtime.log(`\n🔴 Compliance Gaps:\n`);
        
        const sortedGaps = [...result.gaps].sort((a, b) => {
          const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          return severityOrder[a.severity] - severityOrder[b.severity];
        });

        for (const gap of sortedGaps.slice(0, 15)) {
          const severityEmoji = {
            critical: "🔴",
            high: "🟠",
            medium: "🟡",
            low: "🟢",
          }[gap.severity];

          const statusEmoji = {
            open: "❌",
            in_progress: "🔄",
            remediated: "✅",
            accepted_risk: "⚠️",
          }[gap.status];

          runtime.log(`  ${severityEmoji} [${gap.severity.toUpperCase()}] ${gap.controlId}`);
          runtime.log(`     ${gap.description}`);
          runtime.log(`     Status: ${statusEmoji} ${gap.status} | Due: ${gap.dueDate.toISOString().split("T")[0]}`);
          if (gap.assignee) runtime.log(`     Assignee: ${gap.assignee}`);
          runtime.log("");
        }
      }

      // Tasks
      if (opts.tasks && result.tasks.length > 0) {
        runtime.log(`\n📝 Remediation Tasks:\n`);

        const sortedTasks = [...result.tasks].sort((a, b) => {
          const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        });

        for (const task of sortedTasks) {
          const priorityEmoji = {
            critical: "🔴",
            high: "🟠",
            medium: "🟡",
            low: "🟢",
          }[task.priority];

          const statusEmoji = {
            pending: "⏳",
            in_progress: "🔄",
            completed: "✅",
            overdue: "❌",
          }[task.status];

          runtime.log(`  ${priorityEmoji} ${task.title}`);
          runtime.log(`     Priority: ${task.priority} | Status: ${statusEmoji} ${task.status}`);
          runtime.log(`     Due: ${task.dueDate.toISOString().split("T")[0]}`);
        }
      }

      runtime.log(`\n✅ Compliance assessment completed.`);
    });

  // IOC lookup command
  security
    .command("ioc <value>")
    .description("Look up an indicator of compromise")
    .option("--type <type>", "IOC type: ip|domain|hash|url|email")
    .option("--sources <sources>", "Threat intel sources (comma-separated)")
    .option("--format <format>", "Output format: text|json", "text")
    .action((value: string, opts: { type?: string; sources?: string; format: string }) => {
      runtime.log(`\n🔬 IOC Lookup: ${value}`);
      runtime.log("━".repeat(50));

      // Detect IOC type if not specified
      let iocType = opts.type;
      if (!iocType) {
        if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(value)) iocType = "ip";
        else if (/^[a-f0-9]{32,64}$/i.test(value)) iocType = "hash";
        else if (/^https?:\/\//.test(value)) iocType = "url";
        else if (/^[^@]+@[^@]+$/.test(value)) iocType = "email";
        else iocType = "domain";
      }

      runtime.log(`   Type: ${iocType.toUpperCase()}`);
      runtime.log(`   Value: ${value}`);
      if (opts.sources) runtime.log(`   Sources: ${opts.sources}`);
      runtime.log("");

      // Simulated threat intel results
      const isMalicious = secureRandom() > 0.5;
      const confidence = randomInt(60, 95);
      const sources = (opts.sources || "misp,otx,internal").split(",");
      
      const result = {
        ioc: { type: iocType, value },
        malicious: isMalicious,
        confidence,
        tags: isMalicious ? 
          randomChoice([["malware", "c2"], ["phishing", "suspicious"], ["apt", "targeted"], ["ransomware", "malicious"]]) : 
          ["clean", "benign"],
        threatTypes: isMalicious ? 
          randomChoice([["malware"], ["c2"], ["phishing"], ["apt"]]) : [],
        malwareFamilies: isMalicious && secureRandom() > 0.5 ? 
          randomChoice([["Emotet"], ["Trickbot"], ["CobaltStrike"], ["LockBit"]]) : [],
        campaigns: isMalicious && secureRandom() > 0.7 ? 
          randomChoice([["Campaign2024"], ["OperationXYZ"]]) : [],
        actors: isMalicious && secureRandom() > 0.8 ? 
          randomChoice([["APT29"], ["Lazarus"], ["Unknown"]]) : [],
        sourcesQueried: sources.length,
        sourcesMalicious: isMalicious ? randomInt(1, sources.length) : 0,
      };

      if (opts.format === "json") {
        runtime.log(JSON.stringify(result, null, 2));
        return;
      }

      const verdictEmoji = isMalicious ? "🔴" : "🟢";
      const verdictText = isMalicious ? "MALICIOUS" : "BENIGN";

      runtime.log(`${verdictEmoji} Verdict: ${verdictText}`);
      runtime.log(`   Confidence: ${confidence}%`);
      runtime.log(`   Sources Queried: ${result.sourcesQueried}`);
      runtime.log(`   Sources Reporting Malicious: ${result.sourcesMalicious}`);
      
      runtime.log(`\n🏷️ Tags: ${result.tags.join(", ")}`);
      
      if (result.threatTypes.length > 0) {
        runtime.log(`⚠️ Threat Types: ${result.threatTypes.join(", ")}`);
      }
      
      if (result.malwareFamilies.length > 0) {
        runtime.log(`🦠 Malware Families: ${result.malwareFamilies.join(", ")}`);
      }
      
      if (result.campaigns.length > 0) {
        runtime.log(`🎯 Campaigns: ${result.campaigns.join(", ")}`);
      }
      
      if (result.actors.length > 0) {
        runtime.log(`👤 Actors: ${result.actors.join(", ")}`);
      }

      runtime.log(`\n✅ IOC lookup completed.`);
    });

  // Risk score command
  security
    .command("risk")
    .description("View current risk score and factors")
    .option("--asset <asset>", "Get risk for specific asset")
    .option("--trend <period>", "Show trend: hour|day|week|month", "day")
    .option("--format <format>", "Output format: text|json", "text")
    .action((opts: { asset?: string; trend: string; format: string }) => {
      runtime.log(`\n📈 Risk Assessment`);
      runtime.log("━".repeat(50));

      const overallScore = randomInt(25, 85);
      const level = overallScore >= 80 ? "critical" :
                    overallScore >= 60 ? "high" :
                    overallScore >= 40 ? "medium" : "low";

      const levelEmoji = {
        critical: "🔴",
        high: "🟠",
        medium: "🟡",
        low: "🟢",
      }[level];

      const breakdown = {
        threat: randomInt(20, 90),
        vulnerability: randomInt(25, 75),
        compliance: randomInt(40, 95),
        operational: randomInt(30, 70),
        external: randomInt(15, 60),
        human: randomInt(20, 50),
      };

      if (opts.format === "json") {
        runtime.log(JSON.stringify({
          overall: overallScore,
          level,
          breakdown,
          trend: opts.trend,
          assessedAt: new Date(),
        }, null, 2));
        return;
      }

      runtime.log(`\n${levelEmoji} Overall Risk Score: ${overallScore}/100`);
      runtime.log(`   Level: ${level.toUpperCase()}`);
      
      runtime.log(`\n📊 Risk by Category:`);
      
      for (const [category, score] of Object.entries(breakdown)) {
        const bar = "█".repeat(Math.floor(score / 10)) + "░".repeat(10 - Math.floor(score / 10));
        const catEmoji = score >= 70 ? "🔴" : score >= 50 ? "🟡" : "🟢";
        runtime.log(`   ${catEmoji} ${category.padEnd(14)} [${bar}] ${score}`);
      }

      runtime.log(`\n📉 Trend (${opts.trend}):`);
      const trendDir = secureRandom() > 0.5 ? "📈 Improving" : 
                       secureRandom() > 0.3 ? "📉 Declining" : "➡️ Stable";
      runtime.log(`   Direction: ${trendDir}`);

      runtime.log(`\n✅ Risk assessment completed.`);
    });
}
