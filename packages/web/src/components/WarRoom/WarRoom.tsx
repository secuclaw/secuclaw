import React, { useState, useEffect } from "react";
import {
  Swords,
  Shield,
  Target,
  Clock,
  User,
  Map,
  Radio,
  Crosshair,
  AlertTriangle,
  ArrowRight,
  Zap,
  Eye,
  Play,
} from "lucide-react";
import { PieChart, BarChart, RadarChart } from "../common/Charts";

interface WarRoomProps {
  data?: {
    activeOperations: number;
    threatActors: ThreatActor[];
    attackChains: AttackChain[];
    timeline: TimelineEvent[];
    intel: IntelItem[];
  };
}

interface ThreatActor {
  id: string;
  name: string;
  type: string;
  threatLevel: "critical" | "high" | "medium" | "low";
  lastSeen: string;
  iocs: number;
}

interface AttackChain {
  id: string;
  name: string;
  steps: number;
  status: "active" | "blocked" | "detected";
  technique: string;
}

interface TimelineEvent {
  id: string;
  type: "attack" | "defense" | "intel";
  title: string;
  description: string;
  timestamp: string;
}

interface IntelItem {
  id: string;
  source: string;
  title: string;
  relevance: number;
}

const defaultData = {
  activeOperations: 2,
  threatActors: [
    { id: "1", name: "APT29", type: "国家支持", threatLevel: "critical" as const, lastSeen: "10分钟前", iocs: 15 },
    { id: "2", name: "LockBit", type: "勒索软件", threatLevel: "high" as const, lastSeen: "1小时前", iocs: 8 },
    { id: "3", name: "Unknown Actor", type: "未知", threatLevel: "medium" as const, lastSeen: "3小时前", iocs: 3 },
  ],
  attackChains: [
    { id: "1", name: "钓鱼 → 凭证窃取 → 横向移动", steps: 5, status: "active" as const, technique: "T1566" },
    { id: "2", name: "漏洞利用 → 权限提升", steps: 3, status: "blocked" as const, technique: "T1190" },
    { id: "3", name: "供应链攻击路径", steps: 7, status: "detected" as const, technique: "T1195" },
  ],
  timeline: [
    { id: "1", type: "attack" as const, title: "检测到可疑流量", description: "来源: 192.168.1.100", timestamp: "2分钟前" },
    { id: "2", type: "defense" as const, title: "自动阻断", description: "已隔离可疑主机", timestamp: "2分钟前" },
    { id: "3", type: "intel" as const, title: "威胁情报更新", description: "新增5个IOC", timestamp: "5分钟前" },
    { id: "4", type: "attack" as const, title: "暴力破解尝试", description: "SSH服务", timestamp: "10分钟前" },
  ],
  intel: [
    { id: "1", source: "MISP", title: "APT29 新TTPs", relevance: 95 },
    { id: "2", source: "OTX", title: "LockBit 勒索软件样本", relevance: 88 },
    { id: "3", source: "内部", title: "异常登录模式", relevance: 76 },
  ],
};

interface RemediationTask {
  id: string;
  title: string;
  status: string;
  priority: string;
}

interface MitreTactic {
  id: string;
  name: string;
  shortName?: string;
}

interface AttackResult {
  target: string;
  attackType: string;
  summary: {
    totalTests: number;
    successful: number;
    detected: number;
    vulnerabilitiesFound: number;
  };
}

interface DefenseResult {
  target: string;
  summary: {
    riskScore: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

interface ScanResult {
  target: string;
  ports: Array<{port: number; state: string; service: string}>;
}

interface ProbeResult {
  url: string;
  status: number;
  headers: Record<string, string>;
  technologies: string[];
}

interface SimulatedData {
  activeOperations: number;
  threatActors: ThreatActor[];
  attackChains: AttackChain[];
  timeline: TimelineEvent[];
  intel: IntelItem[];
}

interface RemediationResponse {
  tasks?: RemediationTask[];
}

interface MitreStatsResponse {
  tactics: number;
  techniques: number;
  groups: number;
}

interface MitreTacticsResponse {
  tactics: MitreTactic[];
}

export const WarRoom: React.FC<WarRoomProps> = ({ data }) => {
  const [remediationTasks, setRemediationTasks] = useState<RemediationTask[]>([]);
  const [mitreStats, setMitreStats] = useState<{tactics: number; techniques: number; groups: number} | null>(null);
  const [mitreTactics, setMitreTactics] = useState<MitreTactic[]>([]);
  const [attackTarget, setAttackTarget] = useState("192.168.1.1");
  const [attackResult, setAttackResult] = useState<AttackResult | null>(null);
  const [defenseResult, setDefenseResult] = useState<DefenseResult | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [probeResult, setProbeResult] = useState<ProbeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanType, setScanType] = useState("quick");
  const [simulatedData, setSimulatedData] = useState<SimulatedData | null>(null);
  
  const actualData = data || (simulatedData || defaultData);

  const simulateCombat = async () => {
    setLoading(true);
    
    await new Promise(r => setTimeout(r, 1500));
    
    const combatScenarios = [
      { name: "红蓝对抗", activeOps: 5, critical: 3 },
      { name: "攻防演练", activeOps: 8, critical: 5 },
      { name: "应急响应", activeOps: 3, critical: 2 },
      { name: "日常监控", activeOps: 1, critical: 0 },
      { name: "护网行动", activeOps: 12, critical: 7 },
    ];
    
    const scenario = combatScenarios[Math.floor(Math.random() * combatScenarios.length)];
    
    const threatActors = [
      { id: "1", name: "APT29", type: "国家支持", threatLevel: "critical" as const, lastSeen: `${Math.floor(Math.random() * 30)}分钟前`, iocs: Math.floor(Math.random() * 20) + 5 },
      { id: "2", name: "APT41", type: "国家支持", threatLevel: "critical" as const, lastSeen: `${Math.floor(Math.random() * 60)}分钟前`, iocs: Math.floor(Math.random() * 15) + 8 },
      { id: "3", name: "LockBit", type: "勒索软件", threatLevel: "high" as const, lastSeen: `${Math.floor(Math.random() * 2)}小时前`, iocs: Math.floor(Math.random() * 10) + 3 },
      { id: "4", name: "Lazarus", type: "国家支持", threatLevel: "high" as const, lastSeen: `${Math.floor(Math.random() * 4)}小时前`, iocs: Math.floor(Math.random() * 12) + 5 },
      { id: "5", name: "未知组织", type: "网络犯罪", threatLevel: "medium" as const, lastSeen: `${Math.floor(Math.random() * 12)}小时前`, iocs: Math.floor(Math.random() * 5) + 1 },
    ];
    
    const attackChains = [
      { id: "1", name: "钓鱼邮件 → 凭证窃取 → 横向移动 → 数据外传", steps: 6, status: "active" as const, technique: "T1566" },
      { id: "2", name: "漏洞利用(CVE-2024-1234) → 权限提升 → 持久化", steps: 4, status: "active" as const, technique: "T1190" },
      { id: "3", name: "供应链攻击 → 恶意代码植入 → 横向传播", steps: 5, status: "detected" as const, technique: "T1195" },
      { id: "4", name: "暴力破解 → 提权 → 域控沦陷", steps: 4, status: "blocked" as const, technique: "T1110" },
      { id: "5", name: "水坑攻击 → 浏览器漏洞 → 会话劫持", steps: 3, status: "active" as const, technique: "T1189" },
    ];
    
    const timelineEvents = [
      { id: "1", type: "attack" as const, title: "检测到可疑网络流量", description: "来源: 192.168.1.100 → 目标: 10.0.0.5", timestamp: `${Math.floor(Math.random() * 10)}分钟前` },
      { id: "2", type: "defense" as const, title: "自动阻断攻击", description: "已隔离受影响主机", timestamp: `${Math.floor(Math.random() * 15)}分钟前` },
      { id: "3", type: "intel" as const, title: "威胁情报更新", description: `新增${Math.floor(Math.random() * 10) + 3}个IOC`, timestamp: `${Math.floor(Math.random() * 30)}分钟前` },
      { id: "4", type: "attack" as const, title: "暴力破解尝试", description: "目标: SSH服务 (22端口)", timestamp: `${Math.floor(Math.random() * 60)}分钟前` },
      { id: "5", type: "defense" as const, title: "告警触发", description: "检测到异常登录行为", timestamp: `${Math.floor(Math.random() * 90)}分钟前` },
    ];
    
    const intelItems = [
      { id: "1", source: "MISP", title: "APT29 新攻击手法披露", relevance: Math.floor(Math.random() * 20) + 80 },
      { id: "2", source: "OTX", title: "LockBit 3.0 勒索软件分析", relevance: Math.floor(Math.random() * 20) + 75 },
      { id: "3", source: "内部", title: "异常网络流量模式检测", relevance: Math.floor(Math.random() * 20) + 60 },
      { id: "4", source: "VirusTotal", title: "新出现恶意软件样本", relevance: Math.floor(Math.random() * 20) + 70 },
      { id: "5", source: "CISA", title: "最新漏洞通告", relevance: Math.floor(Math.random() * 20) + 85 },
    ];
    
    const simulated = {
      activeOperations: scenario.activeOps,
      threatActors: threatActors.slice(0, Math.min(4, scenario.activeOps + 1)),
      attackChains: attackChains.slice(0, Math.min(4, scenario.activeOps)),
      timeline: timelineEvents.slice(0, 5),
      intel: intelItems.slice(0, 4),
    };
    
    setSimulatedData(simulated);
    setLoading(false);
  };
  
  const runAttack = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/attack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: attackTarget, type: 'network' })
      });
      const data = await res.json();
      setAttackResult(data);
    } catch (err) {
      console.error('Attack failed:', err);
    }
    setLoading(false);
  };
  
  const runDefense = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/defense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: attackTarget, type: 'comprehensive' })
      });
      const data = await res.json();
      setDefenseResult(data);
    } catch (err) {
      console.error('Defense scan failed:', err);
    }
    setLoading(false);
  };
  
  const runNmapScan = async () => {
    setLoading(true);
    setScanResult(null);
    try {
      const res = await fetch('/api/scan/nmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: attackTarget, scanType })
      });
      const data = await res.json();
      setScanResult(data);
    } catch (err) {
      console.error('Nmap scan failed:', err);
    }
    setLoading(false);
  };
  
  const runHttpProbe = async () => {
    setLoading(true);
    setProbeResult(null);
    try {
      const url = attackTarget.startsWith('http') ? attackTarget : `http://${attackTarget}`;
      const res = await fetch('/api/scan/http', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      setProbeResult(data);
    } catch (err) {
      console.error('HTTP probe failed:', err);
    }
    setLoading(false);
  };
  
  useEffect(() => {
    Promise.all([
      fetch('/api/remediation/list').then(r => r.json()).catch(() => ({}) as RemediationResponse),
      fetch('/api/knowledge/mitre/stats').then(r => r.json()).catch(() => ({ tactics: 0, techniques: 0, groups: 0 }) as MitreStatsResponse),
      fetch('/api/knowledge/mitre/tactics').then(r => r.json()).catch(() => ({ tactics: [] }) as MitreTacticsResponse),
    ]).then(([remediation, stats, tactics]) => {
      if (remediation.tasks) setRemediationTasks(remediation.tasks);
      setMitreStats(stats);
      setMitreTactics(tactics.tactics || []);
    }).catch(() => {});
  }, []);
  
  const getThreatColor = (level: string) => {
    const colors: Record<string, string> = {
      critical: "#ef4444",
      high: "#f97316",
      medium: "#eab308",
      low: "#22c55e",
    };
    return colors[level] || "#6b7280";
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: "#ef4444",
      blocked: "#22c55e",
      detected: "#3b82f6",
    };
    return colors[status] || "#6b7280";
  };

  const styles = {
    container: {
      flex: 1,
      padding: "1.5rem",
      backgroundColor: "#0f0f1a",
      overflowY: "auto" as const,
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
    statusBadge: {
      backgroundColor: "#ef4444",
      color: "#fff",
      padding: "0.25rem 0.75rem",
      borderRadius: "9999px",
      fontSize: "0.75rem",
      fontWeight: "600" as const,
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
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
    actorList: {
      display: "flex",
      flexDirection: "column" as const,
      gap: "0.75rem",
    },
    actorItem: {
      display: "flex",
      alignItems: "center",
      gap: "0.75rem",
      padding: "0.75rem",
      backgroundColor: "#0f0f1a",
      borderRadius: "8px",
      borderLeft: "3px solid",
    },
    actorAvatar: {
      width: "40px",
      height: "40px",
      borderRadius: "8px",
      backgroundColor: "#2a2a3e",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    actorInfo: {
      flex: 1,
    },
    actorName: {
      fontSize: "0.9rem",
      fontWeight: "500" as const,
    },
    actorMeta: {
      fontSize: "0.75rem",
      color: "#6b7280",
      marginTop: "0.25rem",
    },
    chainList: {
      display: "flex",
      flexDirection: "column" as const,
      gap: "0.5rem",
    },
    chainItem: {
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      padding: "0.5rem",
      backgroundColor: "#0f0f1a",
      borderRadius: "6px",
      fontSize: "0.85rem",
    },
    chainStatus: {
      width: "8px",
      height: "8px",
      borderRadius: "50%",
    },
    chainSteps: {
      fontSize: "0.7rem",
      color: "#6b7280",
      marginLeft: "auto",
    },
    timeline: {
      display: "flex",
      flexDirection: "column" as const,
      gap: "0.5rem",
    },
    timelineItem: {
      display: "flex",
      alignItems: "flex-start",
      gap: "0.75rem",
      padding: "0.5rem",
      backgroundColor: "#0f0f1a",
      borderRadius: "6px",
    },
    timelineIcon: {
      width: "28px",
      height: "28px",
      borderRadius: "6px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    timelineContent: {
      flex: 1,
    },
    timelineTitle: {
      fontSize: "0.85rem",
    },
    timelineMeta: {
      fontSize: "0.7rem",
      color: "#6b7280",
      marginTop: "0.25rem",
    },
    intelList: {
      display: "flex",
      flexDirection: "column" as const,
      gap: "0.5rem",
    },
    intelItem: {
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      padding: "0.5rem",
      backgroundColor: "#0f0f1a",
      borderRadius: "6px",
    },
    intelSource: {
      fontSize: "0.7rem",
      padding: "0.15rem 0.5rem",
      backgroundColor: "#2a2a3e",
      borderRadius: "4px",
      color: "#9ca3af",
    },
    intelRelevance: {
      marginLeft: "auto",
      fontSize: "0.85rem",
      fontWeight: "600" as const,
    },
    buttonPrimary: {
      backgroundColor: "#f97316",
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
      padding: "0.5rem 1rem",
      borderRadius: "6px",
      fontSize: "0.85rem",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
    },
    quickActions: {
      display: "flex",
      gap: "0.5rem",
      marginTop: "1rem",
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}>
          <Swords size={24} />
          威胁作战室
          {simulatedData && (
            <span style={{ fontSize: '0.7rem', background: '#8b5cf6', color: '#fff', padding: '0.2rem 0.5rem', borderRadius: '4px', marginLeft: '0.5rem' }}>
              已模拟
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={styles.statusBadge}>
            <Radio size={12} />
            {actualData.activeOperations} 个活跃行动
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              onClick={simulateCombat} 
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                background: '#8b5cf6',
                border: 'none',
                borderRadius: 6,
                color: '#fff',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              <Play size={14} />
              {loading ? '生成中...' : '模拟作战'}
            </button>
            <input
              type="text"
              value={attackTarget}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAttackTarget(e.target.value)}
              placeholder="输入目标地址"
              style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #333', background: '#1a1a2e', color: '#fff' }}
            />
            <button style={styles.buttonPrimary} onClick={runAttack} disabled={loading}>
              <Crosshair size={16} />
              {loading ? '执行中...' : '攻击模拟'}
            </button>
          </div>
        </div>
      </div>

      {(attackResult || defenseResult) && (
        <div style={{ ...styles.card, marginBottom: '1rem', background: '#0f172a' }}>
          <div style={styles.cardTitle}>
            <Zap size={16} />
            执行结果
          </div>
          {attackResult && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ color: '#22c55e', fontWeight: 'bold', marginBottom: '0.5rem' }}>攻击模拟结果</div>
              <div style={{ fontSize: '0.85rem', color: '#9ca3af' }}>
                目标: {attackResult.target} | 攻击类型: {attackResult.attackType}<br/>
                总测试: {attackResult.summary?.totalTests} | 成功: {attackResult.summary?.successful} | 检测到: {attackResult.summary?.detected}<br/>
                发现漏洞: {attackResult.summary?.vulnerabilitiesFound}
              </div>
            </div>
          )}
          {defenseResult && (
            <div>
              <div style={{ color: '#3b82f6', fontWeight: 'bold', marginBottom: '0.5rem' }}>防御分析结果</div>
              <div style={{ fontSize: '0.85rem', color: '#9ca3af' }}>
                目标: {defenseResult.target} | 风险评分: {defenseResult.summary?.riskScore}/100<br/>
                严重: {defenseResult.summary?.critical} | 高: {defenseResult.summary?.high} | 中: {defenseResult.summary?.medium} | 低: {defenseResult.summary?.low}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 威胁态势可视化 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div style={styles.card}>
          <div style={styles.cardTitle}>
            <AlertTriangle size={16} />
            威胁等级分布
          </div>
          <PieChart 
            data={[
              { name: '严重', value: actualData.threatActors.filter(a => a.threatLevel === 'critical').length || 1 },
              { name: '高', value: actualData.threatActors.filter(a => a.threatLevel === 'high').length || 2 },
              { name: '中', value: actualData.threatActors.filter(a => a.threatLevel === 'medium').length || 1 },
              { name: '低', value: actualData.threatActors.filter(a => a.threatLevel === 'low').length || 1 },
            ]}
            height={180}
          />
        </div>
        
        <div style={styles.card}>
          <div style={styles.cardTitle}>
            <Zap size={16} />
            攻击链状态
          </div>
          <BarChart 
            data={[
              { name: '活跃', value: actualData.attackChains.filter(c => c.status === 'active').length },
              { name: '已检测', value: actualData.attackChains.filter(c => c.status === 'detected').length },
              { name: '已阻断', value: actualData.attackChains.filter(c => c.status === 'blocked').length },
            ]}
            height={180}
            color={['#ef4444', '#3b82f6', '#22c55e']}
          />
        </div>
        
        <div style={styles.card}>
          <div style={styles.cardTitle}>
            <Radio size={16} />
            作战能力雷达
          </div>
          <RadarChart 
            data={[
              { name: '检测能力', value: 75 + Math.floor(Math.random() * 20) },
              { name: '响应速度', value: 70 + Math.floor(Math.random() * 25) },
              { name: '情报质量', value: 80 + Math.floor(Math.random() * 15) },
              { name: '防御深度', value: 65 + Math.floor(Math.random() * 30) },
              { name: '协同效率', value: 70 + Math.floor(Math.random() * 25) },
              { name: '溯源能力', value: 60 + Math.floor(Math.random() * 35) },
            ]}
            height={180}
          />
        </div>
      </div>

      <div style={styles.grid}>
        <div style={{ ...styles.card, gridColumn: "span 2" }}>
          <div style={styles.cardTitle}>
            <Target size={16} />
            威胁行为者
          </div>
          <div style={styles.actorList}>
            {actualData.threatActors.map((actor) => (
              <div
                key={actor.id}
                style={{ ...styles.actorItem, borderLeftColor: getThreatColor(actor.threatLevel) }}
              >
                <div style={styles.actorAvatar}>
                  <User size={20} />
                </div>
                <div style={styles.actorInfo}>
                  <div style={styles.actorName}>{actor.name}</div>
                  <div style={styles.actorMeta}>
                    {actor.type} · {actor.iocs} IOC · 最后出现: {actor.lastSeen}
                  </div>
                </div>
                <div style={{ ...styles.statusBadge, backgroundColor: getThreatColor(actor.threatLevel) }}>
                  {actor.threatLevel}
                </div>
              </div>
            ))}
          </div>
          <div style={styles.quickActions}>
            <button style={styles.buttonSecondary}>
              <Eye size={14} />
              查看详情
            </button>
            <button style={styles.buttonSecondary} onClick={runDefense} disabled={loading}>
              <Shield size={14} />
              {loading ? '分析中...' : '防御分析'}
            </button>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>
            <Zap size={16} />
            实时情报
          </div>
          <div style={styles.intelList}>
            {actualData.intel.map((item) => (
              <div key={item.id} style={styles.intelItem}>
                <span style={styles.intelSource}>{item.source}</span>
                <span style={{ fontSize: "0.85rem", flex: 1 }}>{item.title}</span>
                <span
                  style={{
                    ...styles.intelRelevance,
                    color: item.relevance > 80 ? "#22c55e" : item.relevance > 60 ? "#eab308" : "#6b7280",
                  }}
                >
                  {item.relevance}%
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>
            <Map size={16} />
            攻击链分析
          </div>
          <div style={styles.chainList}>
            {actualData.attackChains.map((chain) => (
              <div key={chain.id} style={styles.chainItem}>
                <div style={{ ...styles.chainStatus, backgroundColor: getStatusColor(chain.status) }} />
                <ArrowRight size={12} color="#6b7280" />
                <span style={{ flex: 1 }}>{chain.name}</span>
                <span style={styles.chainSteps}>{chain.steps} 步骤</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...styles.card, gridColumn: "span 2" }}>
          <div style={styles.cardTitle}>
            <Clock size={16} />
            事件时间线
          </div>
          <div style={styles.timeline}>
            {actualData.timeline.map((event) => (
              <div key={event.id} style={styles.timelineItem}>
                <div
                  style={{
                    ...styles.timelineIcon,
                    backgroundColor:
                      event.type === "attack"
                        ? "#ef4444"
                        : event.type === "defense"
                        ? "#22c55e"
                        : "#3b82f6",
                  }}
                >
                  {event.type === "attack" ? (
                    <Swords size={14} />
                  ) : event.type === "defense" ? (
                    <Shield size={14} />
                  ) : (
                    <Eye size={14} />
                  )}
                </div>
                <div style={styles.timelineContent}>
                  <div style={styles.timelineTitle}>{event.title}</div>
                  <div style={styles.timelineMeta}>
                    {event.description} · {event.timestamp}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {remediationTasks.length > 0 && (
        <div style={{ marginTop: '1rem', background: '#1a1a2e', borderRadius: 12, padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.9rem', fontWeight: 600, color: '#fff' }}>
            <Target size={16} />
            整改任务 ({remediationTasks.length})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '0.75rem' }}>
            {remediationTasks.slice(0, 4).map(task => (
              <div key={task.id} style={{ 
                background: '#0f0f1a', 
                padding: '0.75rem', 
                borderRadius: 8,
                borderLeft: `3px solid ${task.priority === 'critical' ? '#ef4444' : task.priority === 'high' ? '#f97316' : '#eab308'}`
              }}>
                <div style={{ fontSize: '0.85rem', color: '#fff', marginBottom: '0.25rem' }}>{task.title}</div>
                <div style={{ fontSize: '0.7rem', color: '#888', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ 
                    color: task.status === 'completed' ? '#22c55e' : task.status === 'in_progress' ? '#3b82f6' : '#888' 
                  }}>
                    {task.status === 'in_progress' ? '进行中' : task.status === 'completed' ? '已完成' : '待处理'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WarRoom;
