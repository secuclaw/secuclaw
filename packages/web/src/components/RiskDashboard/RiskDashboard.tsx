import React, { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Building,
  Package,
  AlertTriangle,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Briefcase,
  Play,
} from "lucide-react";

interface RiskDashboardProps {
  data?: {
    totalRisk: number;
    riskReduction: number;
    roi: number;
    budget: BudgetInfo;
    businessUnits: BusinessUnit[];
    supplyChain: SupplyChainRisk[];
    trends: TrendData[];
  };
}

interface BudgetInfo {
  allocated: number;
  spent: number;
  remaining: number;
}

interface BusinessUnit {
  id: string;
  name: string;
  riskLevel: number;
  incidents: number;
  budget: number;
}

interface SupplyChainRisk {
  id: string;
  vendor: string;
  category: string;
  riskLevel: "critical" | "high" | "medium" | "low";
  impact: string;
}

interface TrendData {
  month: string;
  risk: number;
  incidents: number;
}

const defaultData = {
  totalRisk: 32,
  riskReduction: 15,
  roi: 245,
  budget: {
    allocated: 5000000,
    spent: 3200000,
    remaining: 1800000,
  },
  businessUnits: [
    { id: "1", name: "研发中心", riskLevel: 45, incidents: 3, budget: 1200000 },
    { id: "2", name: "销售部门", riskLevel: 28, incidents: 1, budget: 800000 },
    { id: "3", name: "运营中心", riskLevel: 35, incidents: 2, budget: 1000000 },
    { id: "4", name: "数据中心", riskLevel: 52, incidents: 4, budget: 1500000 },
  ],
  supplyChain: [
    { id: "1", vendor: "云服务商A", category: "基础设施", riskLevel: "high" as const, impact: "高" },
    { id: "2", vendor: "软件供应商B", category: "应用", riskLevel: "medium" as const, impact: "中" },
    { id: "3", vendor: "安全服务C", category: "服务", riskLevel: "low" as const, impact: "低" },
    { id: "4", vendor: "硬件供应商D", category: "硬件", riskLevel: "critical" as const, impact: "高" },
  ],
  trends: [
    { month: "9月", risk: 45, incidents: 8 },
    { month: "10月", risk: 42, incidents: 6 },
    { month: "11月", risk: 38, incidents: 5 },
    { month: "12月", risk: 35, incidents: 4 },
    { month: "1月", risk: 33, incidents: 3 },
    { month: "2月", risk: 32, incidents: 2 },
  ],
};

export const BusinessRiskDashboard: React.FC<RiskDashboardProps> = ({ data }) => {
  const [scfStats, setScfStats] = useState<any>(null);
  const [scfDomains, setScfDomains] = useState<any[]>([]);
  const [riskScore, setRiskScore] = useState<any>(null);
  const [riskDomains, setRiskDomains] = useState<any[]>([]);
  const [vulnerabilities, setVulnerabilities] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [simulatedRisk, setSimulatedRisk] = useState<any>(null);
  
  useEffect(() => {
    Promise.all([
      fetch('/api/knowledge/scf/stats').then(r => r.json()).catch(() => ({})),
      fetch('/api/knowledge/scf/domains').then(r => r.json()).catch(() => ({ domains: [] })),
      fetch('/api/risk/score').then(r => r.json()).catch(() => ({})),
      fetch('/api/risk/domains').then(r => r.json()).catch(() => ({ domains: [] })),
      fetch('/api/vulnerabilities').then(r => r.json()).catch(() => ({ vulnerabilities: [] })),
      fetch('/api/assets').then(r => r.json()).catch(() => ({ assets: [] })),
    ]).then(([stats, domainsData, score, riskDomainsData, vulnData, assetData]: any[]) => {
      setScfStats(stats);
      setScfDomains(domainsData.domains || []);
      setRiskScore(score);
      setRiskDomains(riskDomainsData.domains || []);
      setVulnerabilities(vulnData.vulnerabilities || []);
      setAssets(assetData.assets || []);
    }).catch(() => {});
  }, []);
  
  const simulateRisk = async () => {
    setLoading(true);
    
    await new Promise(r => setTimeout(r, 1500));
    
    const industries = [
      { name: "金融机构", baseRisk: 45, budget: 8000000, critical: ["DAT", "IAM", "NET"] },
      { name: "医疗机构", baseRisk: 52, budget: 6000000, critical: ["DAT", "PHY", "IAM"] },
      { name: "互联网企业", baseRisk: 38, budget: 5000000, critical: ["NET", "OPS", "MON"] },
      { name: "政府机关", baseRisk: 42, budget: 4500000, critical: ["IAM", "COM", "DAT"] },
      { name: "制造业", baseRisk: 35, budget: 4000000, critical: ["OPS", "PHY", "NET"] },
    ];
    
    const industry = industries[Math.floor(Math.random() * industries.length)];
    
    const businessUnits = [
      { id: "1", name: "研发中心", baseRisk: industry.baseRisk + 15 },
      { id: "2", name: "销售部门", baseRisk: industry.baseRisk - 10 },
      { id: "3", name: "运营中心", baseRisk: industry.baseRisk + 5 },
      { id: "4", name: "数据中心", baseRisk: industry.baseRisk + 20 },
      { id: "5", name: "客服中心", baseRisk: industry.baseRisk - 5 },
    ].map(unit => ({
      id: unit.id,
      name: unit.name,
      riskLevel: Math.min(95, Math.max(15, unit.baseRisk + Math.floor(Math.random() * 20 - 10))),
      incidents: Math.floor(Math.random() * 8),
      budget: Math.floor(industry.budget * (0.1 + Math.random() * 0.3)),
    }));
    
    const supplyChain = [
      { id: "1", vendor: "云服务商A", category: "基础设施", riskLevel: Math.random() > 0.3 ? "high" : "critical" as const, impact: "高" },
      { id: "2", vendor: "软件供应商B", category: "应用", riskLevel: Math.random() > 0.5 ? "medium" : "high" as const, impact: "中" },
      { id: "3", vendor: "安全服务C", category: "服务", riskLevel: Math.random() > 0.7 ? "low" : "medium" as const, impact: "低" },
      { id: "4", vendor: "硬件供应商D", category: "硬件", riskLevel: Math.random() > 0.4 ? "critical" : "high" as const, impact: "高" },
      { id: "5", vendor: "数据中心E", category: "基础设施", riskLevel: Math.random() > 0.3 ? "high" : "critical" as const, impact: "高" },
    ];
    
    const months = ["9月", "10月", "11月", "12月", "1月", "2月"];
    const trends = months.map((month, idx) => ({
      month,
      risk: Math.max(20, industry.baseRisk - (5 - idx) * 3 + Math.floor(Math.random() * 10)),
      incidents: Math.max(1, 8 - idx + Math.floor(Math.random() * 3)),
    }));
    
    const totalRisk = Math.floor(businessUnits.reduce((sum, u) => sum + u.riskLevel, 0) / businessUnits.length);
    const riskReduction = Math.floor(20 + Math.random() * 25);
    const roi = Math.floor(150 + Math.random() * 150);
    const allocated = industry.budget;
    const spent = Math.floor(allocated * (0.5 + Math.random() * 0.3));
    
    const simulatedData = {
      totalRisk,
      riskReduction,
      roi,
      budget: {
        allocated,
        spent,
        remaining: allocated - spent,
      },
      businessUnits,
      supplyChain,
      trends,
      industry: industry.name,
    };
    
    setSimulatedRisk(simulatedData);
    setLoading(false);
  };
  
  const actualData = data || (simulatedRisk ? simulatedRisk : {
    ...defaultData,
    totalRisk: riskScore?.overall || 50,
    riskReduction: riskScore?.vulnerabilities || 35,
    roi: riskScore?.compliance || 75,
    budget: {
      allocated: 5000000,
      spent: 3200000,
      remaining: 1800000,
    },
    businessUnits: riskDomains.slice(0, 5).map((d: any) => ({
      name: d.name || d.code,
      risk: d.risk,
      trend: d.trend,
      status: d.risk > 70 ? 'critical' : d.risk > 50 ? 'high' : 'medium',
    })),
    supplyChain: assets.slice(0, 3).map((a: any) => ({
      name: a.hostname || a.ip,
      risk: a.risk,
      level: a.risk > 70 ? 'critical' : a.risk > 50 ? 'high' : 'medium',
      lastAssessment: '2025-02-15',
    })),
    trends: vulnerabilities.slice(0, 6).map((v: any) => ({
      month: new Date(Date.now() - Math.random() * 30 * 86400000).toLocaleString('zh-CN', { month: 'short' }),
      risk: Math.floor(Math.random() * 30) + 50,
      incidents: vulnerabilities.filter((x: any) => x.severity === v.severity).length || 1,
    })),
  });
  const formatCurrency = (value: number) => {
    return `¥${(value / 10000).toFixed(0)}万`;
  };

  const getRiskColor = (level: number) => {
    if (level >= 50) return "#ef4444";
    if (level >= 35) return "#f97316";
    if (level >= 20) return "#eab308";
    return "#22c55e";
  };

  const getSupplyChainColor = (level: string) => {
    const colors: Record<string, string> = {
      critical: "#ef4444",
      high: "#f97316",
      medium: "#eab308",
      low: "#22c55e",
    };
    return colors[level] || "#6b7280";
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
    statsRow: {
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: "1rem",
      marginBottom: "1.5rem",
    },
    statCard: {
      backgroundColor: "#1a1a2e",
      borderRadius: "12px",
      padding: "1.25rem",
      border: "1px solid #2a2a3e",
    },
    statHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "0.5rem",
    },
    statLabel: {
      fontSize: "0.85rem",
      color: "#9ca3af",
    },
    statValue: {
      fontSize: "1.75rem",
      fontWeight: "700" as const,
    },
    statChange: {
      fontSize: "0.75rem",
      display: "flex",
      alignItems: "center",
      gap: "0.25rem",
      marginTop: "0.5rem",
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "1rem",
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
      gap: "0.5rem",
      color: "#9ca3af",
    },
    unitList: {
      display: "flex",
      flexDirection: "column" as const,
      gap: "0.75rem",
    },
    unitItem: {
      display: "flex",
      alignItems: "center",
      gap: "0.75rem",
      padding: "0.75rem",
      backgroundColor: "#0f0f1a",
      borderRadius: "8px",
    },
    unitIcon: {
      width: "36px",
      height: "36px",
      borderRadius: "8px",
      backgroundColor: "#2a2a3e",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    unitInfo: {
      flex: 1,
    },
    unitName: {
      fontSize: "0.9rem",
    },
    unitMeta: {
      fontSize: "0.75rem",
      color: "#6b7280",
      marginTop: "0.25rem",
    },
    unitRisk: {
      fontSize: "0.9rem",
      fontWeight: "600" as const,
    },
    supplyList: {
      display: "flex",
      flexDirection: "column" as const,
      gap: "0.5rem",
    },
    supplyItem: {
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      padding: "0.5rem",
      backgroundColor: "#0f0f1a",
      borderRadius: "6px",
      fontSize: "0.85rem",
    },
    supplyRisk: {
      width: "8px",
      height: "8px",
      borderRadius: "50%",
    },
    supplyVendor: {
      flex: 1,
    },
    supplyCategory: {
      fontSize: "0.7rem",
      padding: "0.15rem 0.5rem",
      backgroundColor: "#2a2a3e",
      borderRadius: "4px",
      color: "#9ca3af",
    },
    chart: {
      display: "flex",
      alignItems: "flex-end",
      gap: "0.5rem",
      height: "120px",
      padding: "0.5rem 0",
    },
    chartBar: (height: number) => ({
      flex: 1,
      height: `${height}%`,
      backgroundColor: "#3b82f6",
      borderRadius: "4px 4px 0 0",
      display: "flex",
      flexDirection: "column" as const,
      alignItems: "center",
      justifyContent: "flex-end",
      position: "relative" as const,
    }),
    chartLabel: {
      fontSize: "0.65rem",
      color: "#6b7280",
      marginTop: "0.5rem",
    },
    budgetBar: {
      height: "8px",
      backgroundColor: "#2a2a3e",
      borderRadius: "4px",
      overflow: "hidden",
      marginTop: "0.75rem",
    },
    budgetFill: {
      height: "100%",
      backgroundColor: "#3b82f6",
      borderRadius: "4px",
    },
    budgetLabels: {
      display: "flex",
      justifyContent: "space-between",
      marginTop: "0.5rem",
      fontSize: "0.75rem",
      color: "#6b7280",
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
          <BarChart3 size={24} />
          业务风控仪表盘
          {simulatedRisk && (
            <span style={{ fontSize: '0.7rem', background: '#8b5cf6', color: '#fff', padding: '0.2rem 0.5rem', borderRadius: '4px', marginLeft: '0.5rem' }}>
              {simulatedRisk.industry}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button style={styles.buttonPrimary} onClick={simulateRisk} disabled={loading}>
            <Play size={14} />
            {loading ? '生成中...' : '模拟风险'}
          </button>
          <button style={styles.buttonSecondary}>
            <AlertTriangle size={14} />
            风险预警
          </button>
        </div>
      </div>

      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <div style={styles.statHeader}>
            <span style={styles.statLabel}>总体风险</span>
            <Target size={20} color="#3b82f6" />
          </div>
          <div style={{ ...styles.statValue, color: getRiskColor(actualData.totalRisk) }}>
            {actualData.totalRisk}%
          </div>
          <div style={{ ...styles.statChange, color: "#22c55e" }}>
            <ArrowDownRight size={14} />
            较上月 -3%
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statHeader}>
            <span style={styles.statLabel}>风险降低</span>
            <TrendingDown size={20} color="#22c55e" />
          </div>
          <div style={{ ...styles.statValue, color: "#22c55e" }}>
            {actualData.riskReduction}%
          </div>
          <div style={{ ...styles.statChange, color: "#22c55e" }}>
            <ArrowUpRight size={14} />
            年度目标达成 75%
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statHeader}>
            <span style={styles.statLabel}>安全投资 ROI</span>
            <DollarSign size={20} color="#eab308" />
          </div>
          <div style={{ ...styles.statValue, color: "#eab308" }}>{actualData.roi}%</div>
          <div style={{ ...styles.statChange, color: "#22c55e" }}>
            <TrendingUp size={14} />
            较去年 +45%
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statHeader}>
            <span style={styles.statLabel}>剩余预算</span>
            <Briefcase size={20} color="#8b5cf6" />
          </div>
          <div style={styles.statValue}>{formatCurrency(actualData.budget.remaining)}</div>
          <div style={styles.budgetBar}>
            <div
              style={{
                ...styles.budgetFill,
                width: `${(actualData.budget.spent / actualData.budget.allocated) * 100}%`,
              }}
            />
          </div>
          <div style={styles.budgetLabels}>
            <span>已用: {formatCurrency(actualData.budget.spent)}</span>
            <span>总预算: {formatCurrency(actualData.budget.allocated)}</span>
          </div>
        </div>
      </div>

      <div style={styles.grid}>
        <div style={styles.card}>
          <div style={styles.cardTitle}>
            <Building size={16} />
            业务单元风险
          </div>
          <div style={styles.unitList}>
            {actualData.businessUnits.map((unit, index) => (
              <div key={`unit-${index}-${unit.id}`} style={styles.unitItem}>
                <div style={styles.unitIcon}>
                  <Users size={18} />
                </div>
                <div style={styles.unitInfo}>
                  <div style={styles.unitName}>{unit.name}</div>
                  <div style={styles.unitMeta}>
                    {unit.incidents} 个事件 · 预算 {formatCurrency(unit.budget)}
                  </div>
                </div>
                <div style={{ ...styles.unitRisk, color: getRiskColor(unit.riskLevel) }}>
                  {unit.riskLevel}%
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>
            <Package size={16} />
            供应链风险
          </div>
          <div style={styles.supplyList}>
            {actualData.supplyChain.map((item, index) => (
              <div key={`supply-${index}-${item.id}`} style={styles.supplyItem}>
                <div
                  style={{ ...styles.supplyRisk, backgroundColor: getSupplyChainColor(item.riskLevel) }}
                />
                <span style={styles.supplyVendor}>{item.vendor}</span>
                <span style={styles.supplyCategory}>{item.category}</span>
                <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>影响: {item.impact}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...styles.card, gridColumn: "span 2" }}>
          <div style={styles.cardTitle}>
            <PieChart size={16} />
            风险趋势 (近6个月)
          </div>
          <div style={styles.chart}>
            {actualData.trends.map((trend, index) => (
              <div
                key={`trend-${index}-${trend.month}`}
                style={styles.chartBar(100 - trend.risk * 2)}
              >
                <div
                  style={{
                    position: "absolute",
                    top: "-20px",
                    fontSize: "0.7rem",
                    color: getRiskColor(trend.risk),
                  }}
                >
                  {trend.risk}%
                </div>
                <div style={styles.chartLabel}>{trend.month}</div>
              </div>
            ))}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-around",
              marginTop: "0.5rem",
              fontSize: "0.75rem",
              color: "#6b7280",
            }}
          >
            {actualData.trends.map((trend, index) => (
              <span key={`incident-${index}`}>{trend.incidents} 事件</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessRiskDashboard;
