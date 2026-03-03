import React from "react";
import {
  Shield,
  AlertTriangle,
  Activity,
  Target,
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
  Lock,
  Unlock,
  Zap,
  BarChart3,
} from "lucide-react";

interface ConsoleProps {
  data?: {
    riskScore: number;
    threats: number;
    incidents: number;
    coverage: number;
    alerts: Alert[];
    activities: Activity[];
  };
}

interface Alert {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  timestamp: string;
  source: string;
}

interface Activity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  user?: string;
}

const defaultData = {
  riskScore: 72,
  threats: 12,
  incidents: 3,
  coverage: 85,
  alerts: [
    { id: "1", severity: "critical" as const, title: "可疑登录尝试", timestamp: "2分钟前", source: "认证系统" },
    { id: "2", severity: "high" as const, title: "异常网络流量", timestamp: "5分钟前", source: "网络监控" },
    { id: "3", severity: "medium" as const, title: "漏洞扫描完成", timestamp: "10分钟前", source: "扫描器" },
  ],
  activities: [
    { id: "1", type: "scan", description: "完成对 192.168.1.0/24 的端口扫描", timestamp: "1分钟前" },
    { id: "2", type: "analysis", description: "威胁情报更新 - 新增 5 个 IOC", timestamp: "5分钟前" },
    { id: "3", type: "incident", description: "事件 #1234 已分配给安全团队", timestamp: "8分钟前" },
  ],
};

export const SecurityConsole: React.FC<ConsoleProps> = ({ data = defaultData }) => {
  const getRiskColor = (score: number) => {
    if (score >= 80) return "#22c55e";
    if (score >= 60) return "#eab308";
    if (score >= 40) return "#f97316";
    return "#ef4444";
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

  const styles = {
    container: {
      padding: "1.5rem",
      backgroundColor: "#0f0f1a",
      minHeight: "100vh",
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
    statsGrid: {
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
      marginBottom: "0.75rem",
    },
    statLabel: {
      fontSize: "0.85rem",
      color: "#9ca3af",
    },
    statValue: {
      fontSize: "2rem",
      fontWeight: "700" as const,
    },
    statChange: {
      fontSize: "0.75rem",
      display: "flex",
      alignItems: "center",
      gap: "0.25rem",
      marginTop: "0.5rem",
    },
    mainContent: {
      display: "grid",
      gridTemplateColumns: "2fr 1fr",
      gap: "1rem",
    },
    card: {
      backgroundColor: "#1a1a2e",
      borderRadius: "12px",
      padding: "1.25rem",
      border: "1px solid #2a2a3e",
    },
    cardTitle: {
      fontSize: "1rem",
      fontWeight: "600" as const,
      marginBottom: "1rem",
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
    },
    alertList: {
      display: "flex",
      flexDirection: "column" as const,
      gap: "0.75rem",
    },
    alertItem: {
      display: "flex",
      alignItems: "flex-start",
      gap: "0.75rem",
      padding: "0.75rem",
      backgroundColor: "#0f0f1a",
      borderRadius: "8px",
    },
    alertDot: {
      width: "8px",
      height: "8px",
      borderRadius: "50%",
      marginTop: "6px",
    },
    alertContent: {
      flex: 1,
    },
    alertTitle: {
      fontSize: "0.9rem",
      marginBottom: "0.25rem",
    },
    alertMeta: {
      fontSize: "0.75rem",
      color: "#6b7280",
    },
    activityList: {
      display: "flex",
      flexDirection: "column" as const,
      gap: "0.5rem",
    },
    activityItem: {
      display: "flex",
      alignItems: "center",
      gap: "0.75rem",
      padding: "0.5rem",
      fontSize: "0.85rem",
    },
    activityIcon: {
      width: "32px",
      height: "32px",
      borderRadius: "6px",
      backgroundColor: "#2a2a3e",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    progressBar: {
      height: "8px",
      backgroundColor: "#2a2a3e",
      borderRadius: "4px",
      overflow: "hidden",
      marginTop: "0.5rem",
    },
    progressFill: (width: number) => ({
      height: "100%",
      width: `${width}%`,
      backgroundColor: getRiskColor(width),
      borderRadius: "4px",
      transition: "width 0.3s ease",
    }),
    buttonPrimary: {
      backgroundColor: "#3b82f6",
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
    mitreGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: "0.5rem",
      marginTop: "1rem",
    },
    mitreCard: {
      backgroundColor: "#0f0f1a",
      padding: "0.75rem",
      borderRadius: "6px",
      textAlign: "center" as const,
    },
    mitreLabel: {
      fontSize: "0.7rem",
      color: "#6b7280",
      marginBottom: "0.25rem",
    },
    mitreValue: {
      fontSize: "1.25rem",
      fontWeight: "600" as const,
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}>
          <Shield size={24} />
          全域安全指挥官控制台
        </div>
        <button style={styles.buttonPrimary}>
          <Zap size={16} />
          快速响应
        </button>
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statHeader}>
            <span style={styles.statLabel}>安全态势评分</span>
            <Shield size={20} color="#3b82f6" />
          </div>
          <div style={{ ...styles.statValue, color: getRiskColor(data.riskScore) }}>
            {data.riskScore}
          </div>
          <div style={{ ...styles.statChange, color: "#22c55e" }}>
            <TrendingUp size={14} />
            较昨日 +5
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statHeader}>
            <span style={styles.statLabel}>活跃威胁</span>
            <Target size={20} color="#f97316" />
          </div>
          <div style={styles.statValue}>{data.threats}</div>
          <div style={{ ...styles.statChange, color: "#ef4444" }}>
            <TrendingUp size={14} />
            较昨日 +3
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statHeader}>
            <span style={styles.statLabel}>安全事件</span>
            <AlertTriangle size={20} color="#eab308" />
          </div>
          <div style={styles.statValue}>{data.incidents}</div>
          <div style={{ ...styles.statChange, color: "#22c55e" }}>
            <TrendingDown size={14} />
            较昨日 -2
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statHeader}>
            <span style={styles.statLabel}>防护覆盖率</span>
            <Lock size={20} color="#22c55e" />
          </div>
          <div style={styles.statValue}>{data.coverage}%</div>
          <div style={styles.progressBar}>
            <div style={styles.progressFill(data.coverage)} />
          </div>
        </div>
      </div>

      <div style={styles.mainContent}>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={styles.card}>
            <div style={styles.cardTitle}>
              <BarChart3 size={18} />
              MITRE ATT&CK 覆盖
            </div>
            <div style={styles.mitreGrid}>
              <div style={styles.mitreCard}>
                <div style={styles.mitreLabel}>初始访问</div>
                <div style={{ ...styles.mitreValue, color: "#22c55e" }}>92%</div>
              </div>
              <div style={styles.mitreCard}>
                <div style={styles.mitreLabel}>执行</div>
                <div style={{ ...styles.mitreValue, color: "#22c55e" }}>88%</div>
              </div>
              <div style={styles.mitreCard}>
                <div style={styles.mitreLabel}>持久化</div>
                <div style={{ ...styles.mitreValue, color: "#eab308" }}>75%</div>
              </div>
              <div style={styles.mitreCard}>
                <div style={styles.mitreLabel}>权限提升</div>
                <div style={{ ...styles.mitreValue, color: "#eab308" }}>78%</div>
              </div>
              <div style={styles.mitreCard}>
                <div style={styles.mitreLabel}>防御规避</div>
                <div style={{ ...styles.mitreValue, color: "#f97316" }}>65%</div>
              </div>
              <div style={styles.mitreCard}>
                <div style={styles.mitreLabel}>数据窃取</div>
                <div style={{ ...styles.mitreValue, color: "#22c55e" }}>85%</div>
              </div>
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.cardTitle}>
              <Activity size={18} />
              最近活动
            </div>
            <div style={styles.activityList}>
              {data.activities.map((activity) => (
                <div key={activity.id} style={styles.activityItem}>
                  <div style={styles.activityIcon}>
                    <Activity size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div>{activity.description}</div>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{activity.timestamp}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>
            <AlertTriangle size={18} />
            实时告警
          </div>
          <div style={styles.alertList}>
            {data.alerts.map((alert) => (
              <div key={alert.id} style={styles.alertItem}>
                <div style={{ ...styles.alertDot, backgroundColor: getSeverityColor(alert.severity) }} />
                <div style={styles.alertContent}>
                  <div style={styles.alertTitle}>{alert.title}</div>
                  <div style={styles.alertMeta}>
                    {alert.source} · {alert.timestamp}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityConsole;
