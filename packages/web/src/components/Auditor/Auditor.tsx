import React, { useState, useEffect } from "react";
import {
  ClipboardCheck,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Building,
  Shield,
  Calendar,
  Filter,
  Download,
  ChevronRight,
  Upload,
} from "lucide-react";

interface AuditorProps {
  data?: {
    overallScore: number;
    frameworks: Framework[];
    gaps: Gap[];
    tasks: AuditTask[];
    history: HistoryItem[];
  };
}

interface Framework {
  id: string;
  name: string;
  score: number;
  controls: number;
  passed: number;
}

interface Gap {
  id: string;
  framework: string;
  control: string;
  severity: "critical" | "high" | "medium" | "low";
  status: string;
}

interface AuditTask {
  id: string;
  title: string;
  assignee: string;
  dueDate: string;
  status: "pending" | "in_progress" | "completed";
}

interface HistoryItem {
  id: string;
  type: string;
  date: string;
  score: number;
}

const defaultData = {
  overallScore: 78,
  frameworks: [
    { id: "1", name: "NIST CSF", score: 82, controls: 108, passed: 89 },
    { id: "2", name: "ISO 27001", score: 75, controls: 114, passed: 86 },
    { id: "3", name: "SOC 2", score: 80, controls: 95, passed: 76 },
    { id: "4", name: "GDPR", score: 88, controls: 99, passed: 87 },
  ],
  gaps: [
    { id: "1", framework: "NIST CSF", control: "PR.AC-1", severity: "critical" as const, status: "未整改" },
    { id: "2", framework: "ISO 27001", control: "A.9.2.1", severity: "high" as const, status: "整改中" },
    { id: "3", framework: "SOC 2", control: "CC6.1", severity: "medium" as const, status: "待审核" },
  ],
  tasks: [
    { id: "1", title: "更新访问控制策略", assignee: "张三", dueDate: "2025-02-25", status: "in_progress" as const },
    { id: "2", title: "完成渗透测试", assignee: "李四", dueDate: "2025-02-28", status: "pending" as const },
    { id: "3", title: "审查日志保留政策", assignee: "王五", dueDate: "2025-03-01", status: "completed" as const },
  ],
  history: [
    { id: "1", type: "季度审计", date: "2025-01-15", score: 75 },
    { id: "2", type: "月度检查", date: "2025-01-01", score: 72 },
    { id: "3", type: "季度审计", date: "2024-10-15", score: 68 },
  ],
};

export const ComplianceAuditor: React.FC<AuditorProps> = ({ data }) => {
  const [scfStats, setScfStats] = useState<any>(null);
  const [scfDomains, setScfDomains] = useState<any[]>([]);
  const [auditResult, setAuditResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showAllFrameworks, setShowAllFrameworks] = useState(false);
  const [uploadedGaps, setUploadedGaps] = useState<any[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [frameworkCoverage, setFrameworkCoverage] = useState<any[]>([]);
  const [remediationTasks, setRemediationTasks] = useState<any[]>([]);
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [showAllGaps, setShowAllGaps] = useState(false);
  const [auditHistory, setAuditHistory] = useState<any[]>([]);
  
  const allFrameworks = [
    { id: "SCF", name: "Secure Controls Framework (SCF)", type: "国际", fullName: "Secure Controls Framework" },
    { id: "NIST", name: "NIST Cybersecurity Framework", type: "国际 (美国)", fullName: "NIST CSF" },
    { id: "ISO27001", name: "ISO/IEC 27001:2022", type: "国际", fullName: "ISO/IEC 27001:2022 Information Security" },
    { id: "GB", name: "GB/T 22239-2019 等保2.0", type: "中国", fullName: "网络安全等级保护基本要求" },
    { id: "SOC2", name: "SOC 2 Type II", type: "国际 (美国)", fullName: "Service Organization Control 2" },
    { id: "PCIDSS", name: "PCI DSS", type: "国际", fullName: "Payment Card Industry Data Security Standard" },
    { id: "GDPR", name: "GDPR", type: "国际 (欧盟)", fullName: "General Data Protection Regulation" },
    { id: "COBIT", name: "COBIT 2019", type: "国际", fullName: "Control Objectives for Information Technologies" },
    { id: "CIS", name: "CIS Controls v8", type: "国际", fullName: "Center for Internet Security Controls" },
    { id: "HIPAA", name: "HIPAA", type: "国际 (美国)", fullName: "Health Insurance Portability and Accountability Act" },
  ];
  
  const handleFileUpload = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setLoading(true);
    setUploadedFileName(file.name);
    
    try {
      const text = await file.text();
      const res = await fetch('/api/audit/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, fileName: file.name })
      });
      const result = await res.json() as any;
      
      if (result.gaps) {
        setUploadedGaps(result.gaps);
      }
      if (result.frameworkCoverage) {
        setFrameworkCoverage(result.frameworkCoverage);
      }
      if (result.remediationTasks) {
        setRemediationTasks(result.remediationTasks);
      }
    } catch (err) {
      console.error('Upload failed:', err);
    }
    setLoading(false);
  };
  
  const runAudit = async () => {
    setLoading(true);
    setUploadedFileName("");
    
    await new Promise(r => setTimeout(r, 1500));
    
    // 模拟真实的审计数据分布
    const randomScore = (base: number, variance: number) => Math.max(50, Math.min(95, base + Math.floor(Math.random() * variance) - variance/2));
    
    const frameworks = [
      { id: "SCF", name: "Secure Controls Framework (SCF)", type: "国际", total: 1451 },
      { id: "NIST", name: "NIST Cybersecurity Framework", type: "国际 (美国)", total: 870 },
      { id: "ISO27001", name: "ISO/IEC 27001:2022", type: "国际", total: 725 },
      { id: "GB", name: "GB/T 22239-2019 等保2.0", type: "中国", total: 653 },
      { id: "SOC2", name: "SOC 2 Type II", type: "国际 (美国)", total: 508 },
      { id: "PCIDSS", name: "PCI DSS", type: "国际", total: 363 },
      { id: "GDPR", name: "GDPR", type: "国际 (欧盟)", total: 290 },
      { id: "COBIT", name: "COBIT 2019", type: "国际", total: 435 },
      { id: "CIS", name: "CIS Controls v8", type: "国际", total: 580 },
      { id: "HIPAA", name: "HIPAA", type: "国际 (美国)", total: 218 },
    ];
    
    // 根据企业类型动态生成审计结果
    const enterpriseTypes = ["金融机构", "医疗机构", "互联网企业", "政府机关", "制造业"];
    const enterpriseType = enterpriseTypes[Math.floor(Math.random() * enterpriseTypes.length)];
    
    // 不同行业有不同的合规关注点
    const industryFocus: Record<string, { domains: string[], criticalGaps: string[] }> = {
      "金融机构": { domains: ["IAM", "DAT", "OPS", "COM"], criticalGaps: ["DAT-01", "IAM-02", "OPS-02"] },
      "医疗机构": { domains: ["IAM", "DAT", "PHY", "COM"], criticalGaps: ["DAT-01", "IAM-02", "PHY-01"] },
      "互联网企业": { domains: ["IAM", "NET", "OPS", "MON"], criticalGaps: ["NET-01", "OPS-01", "MON-01"] },
      "政府机关": { domains: ["IAM", "DAT", "PHY", "COM"], criticalGaps: ["DAT-01", "IAM-02", "COM-01"] },
      "制造业": { domains: ["IAM", "NET", "OPS", "PHY"], criticalGaps: ["NET-01", "OPS-01", "PHY-01"] },
    };
    
    const focus = industryFocus[enterpriseType] || industryFocus["互联网企业"];
    
    // 为每个框架计算覆盖率
    const frameworkCoverage = frameworks.map(fw => {
      const baseScore = enterpriseType === "政府机关" && fw.id === "GB" ? 75 : 
                       enterpriseType === "金融机构" && fw.id === "PCIDSS" ? 80 : 
                       enterpriseType === "医疗机构" && fw.id === "HIPAA" ? 78 : 70;
      const variance = fw.id === "GB" || fw.id === "SCF" ? 15 : 20;
      const score = randomScore(baseScore, variance);
      const mentioned = Math.floor(fw.total * (score / 100) * (0.8 + Math.random() * 0.4));
      
      return {
        id: fw.id,
        name: fw.name,
        type: fw.type,
        mentioned,
        total: fw.total,
        score,
      };
    });
    
    // 生成符合特定行业的差距项
    const allGaps = [
      { id: "gap-1", controlId: "IAM-02", controlName: "多因素认证 (MFA)", domain: "IAM", severity: "critical" as const, status: "未符合", description: "特权账户未实施MFA，违反最小权限原则" },
      { id: "gap-2", controlId: "NET-01", controlName: "网络防火墙控制", domain: "NET", severity: "high" as const, status: "部分符合", description: "防火墙规则过于宽松，未按业务需求细粒度管控" },
      { id: "gap-3", controlId: "DAT-01", controlName: "静态数据加密", domain: "DAT", severity: "critical" as const, status: "未符合", description: "敏感数据(PII/财务)未加密存储，存在数据泄露风险" },
      { id: "gap-4", controlId: "OPS-01", controlName: "补丁管理", domain: "OPS", severity: "high" as const, status: "部分符合", description: "关键补丁延迟超过SLA，服务器存在已知漏洞" },
      { id: "gap-5", controlId: "MON-01", controlName: "集中日志管理", domain: "MON", severity: "medium" as const, status: "部分符合", description: "日志保留期限不足90天，审计追溯能力受限" },
      { id: "gap-6", controlId: "COM-01", controlName: "安全意识培训", domain: "COM", severity: "medium" as const, status: "部分符合", description: "培训覆盖率仅75%，新员工入职培训缺失" },
      { id: "gap-7", controlId: "PHY-01", controlName: "物理访问控制", domain: "PHY", severity: "low" as const, status: "部分符合", description: "访客登记不完善，机房出入记录不完整" },
      { id: "gap-8", controlId: "IAM-01", controlName: "身份与访问管理", domain: "IAM", severity: "high" as const, status: "部分符合", description: "离职账户未及时禁用，存在特权账户滥用风险" },
      { id: "gap-9", controlId: "NET-02", controlName: "传输加密", domain: "NET", severity: "medium" as const, status: "部分符合", description: "部分内部系统未使用TLS 1.2+，存在降级攻击风险" },
      { id: "gap-10", controlId: "DAT-02", controlName: "数据备份与恢复", domain: "DAT", severity: "high" as const, status: "部分符合", description: "备份恢复测试未定期执行，无法保证RTO/RPO" },
      { id: "gap-11", controlId: "OPS-02", controlName: "事件响应", domain: "OPS", severity: "high" as const, status: "部分符合", description: "应急响应预案未定期演练，处置流程不清晰" },
      { id: "gap-12", controlId: "MON-02", controlName: "安全监控", domain: "MON", severity: "medium" as const, status: "部分符合", description: "SIEM规则覆盖不全，告警阈值设置不合理" },
    ];
    
    // 根据行业选择差距项
    const selectedGaps = allGaps.filter(gap => 
      focus.domains.includes(gap.domain) || focus.criticalGaps.includes(gap.controlId)
    ).slice(0, 8);
    
    // 确保至少包含关键差距
    const criticalGaps = allGaps.filter(g => g.severity === "critical");
    const finalGaps = [...criticalGaps.filter(c => !selectedGaps.find(s => s.id === c.id)), ...selectedGaps].slice(0, 7);
    
    // 生成整改任务
    const assigneeMap: Record<string, string> = {
      IAM: "安全运营团队 - 张明",
      NET: "网络团队 - 李华",
      DAT: "数据安全团队 - 王芳",
      OPS: "运维团队 - 赵强",
      MON: "监控团队 - 陈静",
      PHY: "物理安全团队 - 刘伟",
      COM: "安全合规团队 - 周敏",
    };
    
    const remediationTasks = finalGaps.map((gap, idx) => ({
      id: `task-${idx}`,
      title: `整改 ${gap.controlId}: ${gap.controlName}`,
      description: gap.description,
      assignee: assigneeMap[gap.domain] || "安全团队",
      dueDate: new Date(Date.now() + (gap.severity === "critical" ? 7 : gap.severity === "high" ? 14 : 30) * 86400000).toISOString().split('T')[0],
      status: gap.severity === "critical" ? "in_progress" as const : "pending" as const,
      priority: gap.severity,
      controlId: gap.controlId,
      domain: gap.domain,
    }));
    
    // 按优先级排序
    remediationTasks.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
    });
    
    setFrameworkCoverage(frameworkCoverage);
    setUploadedGaps(finalGaps);
    setRemediationTasks(remediationTasks);
    
    setLoading(false);
  };
  
  const exportReport = () => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      summary: {
        overallScore: actualData.overallScore,
        totalFrameworks: frameworkCoverage.length > 0 ? frameworkCoverage.length : 10,
        totalGaps: uploadedGaps.length > 0 ? uploadedGaps.length : actualData.gaps.length,
        totalTasks: remediationTasks.length > 0 ? remediationTasks.length : actualData.tasks.length,
      },
      frameworks: frameworkCoverage.length > 0 ? frameworkCoverage : allFrameworks.map(fw => ({
        id: fw.id,
        name: fw.name,
        type: fw.type || '国际',
        score: Math.floor(Math.random() * 20) + 70,
      })),
      gaps: uploadedGaps.length > 0 ? uploadedGaps : actualData.gaps,
      tasks: remediationTasks.length > 0 ? remediationTasks : actualData.tasks,
      history: actualData.history,
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  useEffect(() => {
    Promise.all([
      fetch('/api/knowledge/scf/stats').then(r => r.json()).catch(() => ({})),
      fetch('/api/knowledge/scf/domains').then(r => r.json()).catch(() => ({ domains: [] })),
    ]).then(([stats, domainsData]) => {
      setScfStats(stats);
      setScfDomains(domainsData.domains || []);
    }).catch(() => {});
    
    fetch('/api/audit/history')
      .then(r => r.json())
      .then(data => {
        if (data.items) {
          setAuditHistory(data.items);
        }
      })
      .catch(() => {});
  }, []);
  
  const actualData = data || {
    ...defaultData,
    overallScore: auditResult?.summary?.overallScore || scfStats?.controls ? Math.floor((scfStats.controls / 1451) * 80) : 72,
    frameworks: auditResult?.domainResults?.slice(0, 5).map((d: any) => ({
      id: d.domain,
      name: d.name || d.domain,
      score: d.score,
      controls: scfStats?.controls || 1451,
      passed: Math.floor((d.score / 100) * (scfStats?.controls || 1451)),
    })) || (scfStats ? [
      { id: "SCF", name: "Secure Controls Framework (SCF)", score: 72, controls: scfStats.controls || 1451, passed: Math.floor((scfStats.controls || 1451) * 0.72) },
      { id: "NIST", name: "NIST Cybersecurity Framework (CSF)", score: 75, controls: scfStats.controls || 1451, passed: Math.floor((scfStats.controls || 1451) * 0.75) },
      { id: "ISO27001", name: "ISO/IEC 27001:2022", score: 78, controls: scfStats.controls || 1451, passed: Math.floor((scfStats.controls || 1451) * 0.78) },
      { id: "GB", name: "GB/T 22239-2019 等保2.0", score: 70, controls: scfStats.controls || 1451, passed: Math.floor((scfStats.controls || 1451) * 0.70) },
      { id: "SOC2", name: "SOC 2 Type II", score: 73, controls: scfStats.controls || 1451, passed: Math.floor((scfStats.controls || 1451) * 0.73) },
    ] : defaultData.frameworks),
  };
  
  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      critical: "#ef4444",
      high: "#f97316",
      medium: "#eab308",
      low: "#22c55e",
    };
    return colors[severity] || "#6b7280";
  };

  const getStatusIcon = (status: string) => {
    if (status === "completed") return <CheckCircle size={14} color="#22c55e" />;
    if (status === "in_progress") return <Clock size={14} color="#eab308" />;
    return <Clock size={14} color="#6b7280" />;
  };

  const styles = {
    container: {
      flex: 1,
      padding: "1.5rem",
      backgroundColor: "#0f0f1a",
      overflowY: "auto",
      color: "#fff",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "1.5rem",
    },
    title: {
      fontSize: "1.5rem",
      fontWeight: "600" as const,
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
    },
    scoreCard: {
      backgroundColor: "#1a1a2e",
      borderRadius: "12px",
      padding: "1.5rem",
      marginBottom: "1.5rem",
      display: "flex",
      alignItems: "center",
      gap: "2rem",
      border: "1px solid #2a2a3e",
    },
    scoreCircle: {
      width: "100px",
      height: "100px",
      borderRadius: "50%",
      border: "6px solid #3b82f6",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "2rem",
      fontWeight: "700" as const,
    },
    scoreInfo: {
      flex: 1,
    },
    scoreTitle: {
      fontSize: "1.1rem",
      fontWeight: "600" as const,
      marginBottom: "0.5rem",
    },
    scoreDesc: {
      fontSize: "0.85rem",
      color: "#9ca3af",
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: "1rem",
      marginBottom: "1.5rem",
    },
    card: {
      backgroundColor: "#1a1a2e",
      borderRadius: "12px",
      padding: "1.25rem",
      border: "1px solid #2a2a3e",
    },
    cardTitle: {
      fontSize: "0.9rem",
      fontWeight: "600" as const,
      marginBottom: "1rem",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      color: "#9ca3af",
    },
    frameworkList: {
      display: "flex",
      flexDirection: "column" as const,
      gap: "0.75rem",
    },
    frameworkItem: {
      display: "flex",
      alignItems: "center",
      gap: "0.75rem",
      padding: "0.75rem",
      backgroundColor: "#0f0f1a",
      borderRadius: "8px",
    },
    frameworkName: {
      flex: 1,
      fontSize: "0.9rem",
    },
    frameworkScore: {
      fontSize: "0.9rem",
      fontWeight: "600" as const,
    },
    progressBar: {
      height: "4px",
      backgroundColor: "#2a2a3e",
      borderRadius: "2px",
      overflow: "hidden",
      marginTop: "0.5rem",
    },
    progressFill: (width: number) => ({
      height: "100%",
      width: `${width}%`,
      backgroundColor: width >= 80 ? "#22c55e" : width >= 60 ? "#eab308" : "#ef4444",
      borderRadius: "2px",
    }),
    gapList: {
      display: "flex",
      flexDirection: "column" as const,
      gap: "0.5rem",
    },
    gapItem: {
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      padding: "0.5rem",
      backgroundColor: "#0f0f1a",
      borderRadius: "6px",
      fontSize: "0.85rem",
    },
    gapSeverity: {
      width: "6px",
      height: "6px",
      borderRadius: "50%",
    },
    gapControl: {
      flex: 1,
    },
    gapStatus: {
      fontSize: "0.7rem",
      padding: "0.15rem 0.5rem",
      backgroundColor: "#2a2a3e",
      borderRadius: "4px",
      color: "#9ca3af",
    },
    taskList: {
      display: "flex",
      flexDirection: "column" as const,
      gap: "0.5rem",
    },
    taskItem: {
      display: "flex",
      alignItems: "center",
      gap: "0.75rem",
      padding: "0.75rem",
      backgroundColor: "#0f0f1a",
      borderRadius: "6px",
    },
    taskInfo: {
      flex: 1,
    },
    taskTitle: {
      fontSize: "0.85rem",
    },
    taskMeta: {
      fontSize: "0.7rem",
      color: "#6b7280",
      marginTop: "0.25rem",
    },
    historyList: {
      display: "flex",
      flexDirection: "column" as const,
      gap: "0.5rem",
    },
    historyItem: {
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      padding: "0.5rem",
      backgroundColor: "#0f0f1a",
      borderRadius: "6px",
      fontSize: "0.85rem",
    },
    buttonPrimary: {
      backgroundColor: "#8b5cf6",
      color: "#fff",
      border: "none",
      padding: "0.5rem 1rem",
      borderRadius: "6px",
      fontSize: "0.85rem",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
    },
    buttonSecondary: {
      backgroundColor: "#2a2a3e",
      color: "#fff",
      border: "none",
      padding: "0.4rem 0.75rem",
      borderRadius: "6px",
      fontSize: "0.8rem",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}>
          <ClipboardCheck size={24} />
          合规审计官
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <label style={{ ...styles.buttonPrimary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Upload size={14} />
            {loading ? '分析中...' : '上传审计底稿'}
            <input 
              type="file" 
              accept=".txt,.md,.csv,.json,.xlsx,.xls" 
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </label>
          <button style={styles.buttonPrimary} onClick={runAudit} disabled={loading}>
            <ClipboardCheck size={14} />
            {loading ? '生成中...' : '模拟审计'}
          </button>
          <button style={styles.buttonSecondary}>
            <Filter size={14} />
            筛选
          </button>
          <button style={styles.buttonPrimary} onClick={exportReport}>
            <Download size={14} />
            导出报告
          </button>
        </div>
      </div>

      <div style={styles.scoreCard}>
        <div style={styles.scoreCircle}>{actualData.overallScore}</div>
        <div style={styles.scoreInfo}>
          <div style={styles.scoreTitle}>综合合规评分</div>
          <div style={styles.scoreDesc}>
            基于 {actualData.frameworks.length} 个合规框架的综合评估
            <br />
            <span style={{ color: "#22c55e" }}>较上次评估 +3 分</span>
          </div>
        </div>
        <div style={{ textAlign: "right" as const }}>
          <div style={{ fontSize: "0.8rem", color: "#9ca3af" }}>下次审计</div>
          <div style={{ fontSize: "1.1rem", fontWeight: "600" as const, marginTop: "0.25rem" }}>
            <Calendar size={16} style={{ marginRight: "0.5rem", verticalAlign: "middle" }} />
            2025-03-15
          </div>
        </div>
      </div>

      <div style={styles.grid}>
        <div style={{ ...styles.card, gridColumn: "span 2" }}>
          <div style={styles.cardTitle}>
            <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Shield size={16} />
              合规框架
              {frameworkCoverage.length > 0 && (
                <span style={{ fontSize: '0.7rem', background: '#22c55e', color: '#fff', padding: '0.1rem 0.4rem', borderRadius: '4px', marginLeft: '0.5rem' }}>
                  审计底稿分析
                </span>
              )}
            </span>
            <button 
              onClick={() => setShowAllFrameworks(!showAllFrameworks)}
              style={{ 
                background: showAllFrameworks ? '#1e3a5f' : '#3b82f6', 
                border: 'none', 
                color: '#fff', 
                cursor: 'pointer', 
                fontSize: '0.7rem',
                padding: '0.2rem 0.6rem',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
                          {showAllFrameworks ? '▲ 收起' : `▼ 更多(${(frameworkCoverage.length > 0 ? frameworkCoverage.length : allFrameworks.length) - 5})`}
            </button>
          </div>
          {uploadedFileName && (
            <div style={{ fontSize: '0.75rem', color: '#3b82f6', marginBottom: '0.5rem', padding: '0.25rem 0.5rem', background: '#1e3a5f', borderRadius: '4px' }}>
              📄 {uploadedFileName} - 覆盖率基于审计底稿
            </div>
          )}
          <div style={styles.frameworkList}>
            {(frameworkCoverage.length > 0 ? frameworkCoverage : allFrameworks).slice(0, showAllFrameworks ? 10 : 5).map((fw: any) => (
              <div key={fw.id} style={styles.frameworkItem}>
                <Building size={18} color="#6b7280" />
                <span style={styles.frameworkName}>{fw.name}</span>
                <span style={{ fontSize: '0.7rem', color: (fw.type || '').includes('中国') ? '#f97316' : '#9ca3af', marginLeft: '0.5rem' }}>
                  {fw.type || '国际'}
                </span>
                <span style={styles.frameworkScore}>
                  {fw.score !== undefined ? `${fw.score}%` : `${Math.floor(Math.random() * 20) + 70}%`}
                </span>
                <div style={{ ...styles.progressBar, width: "100px" }}>
                  <div style={styles.progressFill(fw.score !== undefined ? fw.score : Math.floor(Math.random() * 20) + 70)} />
                </div>
                {fw.mentioned !== undefined && (
                  <div style={{ fontSize: '0.65rem', color: '#6b7280', marginLeft: '0.5rem' }}>
                    {fw.mentioned}/{fw.total}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...styles.card, gridColumn: "span 2" }}>
          <div style={styles.cardTitle}>
            <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <AlertCircle size={16} />
              合规差距
              {uploadedGaps.length > 0 && (
                <span style={{ fontSize: '0.7rem', background: '#ef4444', color: '#fff', padding: '0.1rem 0.4rem', borderRadius: '4px', marginLeft: '0.5rem' }}>
                  {uploadedGaps.length}项
                </span>
              )}
            </span>
            {((uploadedGaps.length > 5) || (actualData.gaps.length > 5 && uploadedGaps.length === 0)) && (
              <button 
                onClick={() => setShowAllGaps(!showAllGaps)}
                style={{ 
                  background: showAllGaps ? '#1e3a5f' : '#3b82f6', 
                  border: 'none', 
                  color: '#fff', 
                  cursor: 'pointer', 
                  fontSize: '0.7rem',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                {showAllGaps ? '▲ 收起' : `▼ 更多(${uploadedGaps.length > 0 ? uploadedGaps.length - 5 : actualData.gaps.length - 5})`}
              </button>
            )}
          </div>
          {uploadedFileName && (
            <div style={{ fontSize: '0.75rem', color: '#3b82f6', marginBottom: '0.5rem', padding: '0.25rem 0.5rem', background: '#1e3a5f', borderRadius: '4px' }}>
              📄 {uploadedFileName}
            </div>
          )}
          <div style={styles.gapList}>
            {(uploadedGaps.length > 0 
              ? (showAllGaps ? uploadedGaps : uploadedGaps.slice(0, 5)) 
              : (showAllGaps ? actualData.gaps : actualData.gaps.slice(0, 5))
            ).map((gap: any) => (
              <div key={gap.id || gap.controlId} style={styles.gapItem}>
                <div style={{ ...styles.gapSeverity, backgroundColor: getSeverityColor(gap.severity) }} />
                <span style={styles.gapControl}>
                  {gap.controlId || gap.framework} - {gap.controlName || gap.control}
                </span>
                <span style={{ 
                  ...styles.gapStatus, 
                  backgroundColor: gap.status === '未符合' ? '#fee2e2' : gap.status === '部分符合' ? '#fef3c7' : '#d1fae5',
                  color: gap.status === '未符合' ? '#dc2626' : gap.status === '部分符合' ? '#d97706' : '#059669'
                }}>{gap.status}</span>
              </div>
            ))}
            {uploadedGaps.length > 0 && !showAllGaps && uploadedGaps.length > 5 && (
              <div style={{ textAlign: 'center', padding: '0.5rem', color: '#6b7280', fontSize: '0.75rem' }}>
                还有 {uploadedGaps.length - 5} 项差距未显示
              </div>
            )}
          </div>
        </div>

        <div style={{ ...styles.card, gridColumn: "span 2" }}>
          <div style={styles.cardTitle}>
            <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <FileText size={16} />
              整改任务
              {remediationTasks.length > 0 && (
                <span style={{ fontSize: '0.7rem', background: '#f97316', color: '#fff', padding: '0.1rem 0.4rem', borderRadius: '4px', marginLeft: '0.5rem' }}>
                  待执行{remediationTasks.length}条
                </span>
              )}
            </span>
            {remediationTasks.length > 5 && (
              <button 
                onClick={() => setShowAllTasks(!showAllTasks)}
                style={{ 
                  background: showAllTasks ? '#1e3a5f' : '#3b82f6', 
                  border: 'none', 
                  color: '#fff', 
                  cursor: 'pointer', 
                  fontSize: '0.7rem',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                {showAllTasks ? '▲ 收起' : `▼ 更多(${remediationTasks.length - 5})`}
              </button>
            )}
          </div>
          <div style={styles.taskList}>
            {(remediationTasks.length > 0 ? (showAllTasks ? remediationTasks : remediationTasks.slice(0, 5)) : actualData.tasks.slice(0, 5)).map((task: any) => (
              <div key={task.id} style={styles.taskItem}>
                {getStatusIcon(task.status)}
                <div style={styles.taskInfo}>
                  <div style={styles.taskTitle}>{task.title}</div>
                  <div style={styles.taskMeta}>
                    {task.assignee || task.assignee} · 截止 {task.dueDate}
                    {task.priority && (
                      <span style={{ 
                        marginLeft: '0.5rem', 
                        padding: '0.1rem 0.3rem', 
                        borderRadius: '3px',
                        fontSize: '0.65rem',
                        background: task.priority === 'critical' ? '#ef4444' : task.priority === 'high' ? '#f97316' : '#eab308',
                        color: '#fff'
                      }}>
                        {task.priority === 'critical' ? '严重' : task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...styles.card, gridColumn: "span 2" }}>
          <div style={styles.cardTitle}>
            <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <TrendingUp size={16} />
              历史记录
              {auditHistory.length > 0 && (
                <span style={{ fontSize: '0.7rem', background: '#3b82f6', color: '#fff', padding: '0.1rem 0.4rem', borderRadius: '4px', marginLeft: '0.5rem' }}>
                  {auditHistory.length}次
                </span>
              )}
            </span>
          </div>
          <div style={styles.historyList}>
            {(auditHistory.length > 0 ? auditHistory.slice(0, 6) : actualData.history).map((item: any) => (
              <div key={item.id} style={styles.historyItem}>
                <Calendar size={14} color="#6b7280" />
                <span style={{ flex: 1 }}>{item.type || item.framework}</span>
                <span style={{ color: "#9ca3af" }}>{item.date || item.timestamp?.split('T')[0]}</span>
                <span style={{ fontWeight: "600" as const }}>{item.overallScore || item.score}分</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplianceAuditor;
