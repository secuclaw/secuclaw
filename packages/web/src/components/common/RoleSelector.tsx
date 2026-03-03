import React from "react";
import {
  Shield,
  Lock,
  Building,
  User,
  Cpu,
  Link2,
  Briefcase,
  Crown,
} from "lucide-react";

export interface Role {
  id: string;
  name: string;
  nameZh: string;
  description: string;
  dimensions: string[];
  icon: React.ReactNode;
  color: string;
  lightCapabilities: string[];
  darkCapabilities: string[];
}

export const ROLES: Role[] = [
  {
    id: "security-expert",
    name: "Security Expert",
    nameZh: "安全专家",
    description: "纯安全角色，完整具备光明/黑暗攻防能力",
    dimensions: ["SEC"],
    icon: <Shield size={20} />,
    color: "#3b82f6",
    lightCapabilities: ["威胁检测", "漏洞评估", "事件响应", "安全架构"],
    darkCapabilities: ["攻击路径发现", "渗透测试", "威胁狩猎", "攻击模拟"],
  },
  {
    id: "privacy-officer",
    name: "Privacy Security Officer",
    nameZh: "隐私安全官",
    description: "安全攻防 + 隐私保护/数据安全合规延伸",
    dimensions: ["SEC", "LEG"],
    icon: <Lock size={20} />,
    color: "#8b5cf6",
    lightCapabilities: ["威胁检测", "隐私保护", "数据安全合规", "GDPR合规"],
    darkCapabilities: ["数据泄露检测", "隐私风险评估"],
  },
  {
    id: "security-architect",
    name: "Security Architect",
    nameZh: "安全架构师",
    description: "安全攻防 + 基础设施/代码/网络安全延伸",
    dimensions: ["SEC", "IT"],
    icon: <Cpu size={20} />,
    color: "#06b6d4",
    lightCapabilities: ["安全架构设计", "代码安全审计", "基础设施安全", "云安全"],
    darkCapabilities: ["架构缺陷分析", "云环境攻击模拟"],
  },
  {
    id: "business-security-officer",
    name: "Business Security Officer",
    nameZh: "业务安全官",
    description: "安全攻防 + 供应链安全/业务连续性延伸",
    dimensions: ["SEC", "BIZ"],
    icon: <Briefcase size={20} />,
    color: "#10b981",
    lightCapabilities: ["供应链安全", "业务连续性保障", "第三方风险管理"],
    darkCapabilities: ["供应链攻击检测", "业务影响分析"],
  },
  {
    id: "ciso",
    name: "Chief Information Security Officer",
    nameZh: "首席信息安全官角色",
    description: "安全攻防 + 合规延伸 + 技术安全延伸",
    dimensions: ["SEC", "LEG", "IT"],
    icon: <Building size={20} />,
    color: "#f59e0b",
    lightCapabilities: ["企业安全架构", "合规框架设计", "技术安全标准"],
    darkCapabilities: ["全面攻击模拟", "红队演练"],
  },
  {
    id: "supply-chain-security",
    name: "Supply Chain Security Officer",
    nameZh: "供应链安全官",
    description: "安全攻防 + 隐私合规延伸 + 供应链安全延伸",
    dimensions: ["SEC", "LEG", "BIZ"],
    icon: <Link2 size={20} />,
    color: "#ef4444",
    lightCapabilities: ["供应链风险管理", "供应商安全评估", "合规审计"],
    darkCapabilities: ["供应链攻击模拟", "第三方渗透测试"],
  },
  {
    id: "security-ops",
    name: "Security Operations Officer",
    nameZh: "安全运营官",
    description: "安全攻防 + 技术安全延伸 + 业务连续性延伸",
    dimensions: ["SEC", "IT", "BIZ"],
    icon: <User size={20} />,
    color: "#ec4899",
    lightCapabilities: ["安全运营", "业务连续性管理", "IT安全"],
    darkCapabilities: ["业务攻击模拟", "运营安全测试"],
  },
  {
    id: "secuclaw-commander",
    name: "SecuClaw Commander",
    nameZh: "全域安全指挥官",
    description: "完整的安全攻防能力 + 全维度安全属性延伸",
    dimensions: ["SEC", "LEG", "IT", "BIZ"],
    icon: <Crown size={20} />,
    color: "#fbbf24",
    lightCapabilities: ["全面安全治理", "合规管理", "技术安全", "业务安全"],
    darkCapabilities: ["全面红队演练", "APT模拟", "综合渗透测试"],
  },
];

interface RoleSelectorProps {
  selectedRole: string;
  onRoleChange: (roleId: string) => void;
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({ selectedRole, onRoleChange }) => {
  const styles = {
    container: {
      padding: "1rem",
      backgroundColor: "#1a1a2e",
      borderRadius: "12px",
      marginBottom: "1rem",
    },
    title: {
      fontSize: "0.9rem",
      fontWeight: "600" as const,
      color: "#9ca3af",
      marginBottom: "0.75rem",
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
    },
    roleGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: "0.5rem",
    },
    roleCard: (isSelected: boolean, color: string) => ({
      padding: "0.75rem",
      backgroundColor: isSelected ? `${color}20` : "#0f0f1a",
      borderRadius: "8px",
      cursor: "pointer",
      border: isSelected ? `2px solid ${color}` : "2px solid transparent",
      transition: "all 0.2s ease",
    }),
    roleHeader: {
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      marginBottom: "0.5rem",
    },
    roleName: {
      fontSize: "0.8rem",
      fontWeight: "600" as const,
    },
    roleDesc: {
      fontSize: "0.7rem",
      color: "#6b7280",
      lineHeight: "1.4",
    },
    roleDimensions: {
      display: "flex",
      gap: "0.25rem",
      marginTop: "0.5rem",
    },
    dimensionBadge: (dim: string) => ({
      fontSize: "0.6rem",
      padding: "0.15rem 0.4rem",
      borderRadius: "4px",
      backgroundColor:
        dim === "SEC" ? "#3b82f6" :
        dim === "LEG" ? "#8b5cf6" :
        dim === "IT" ? "#06b6d4" : "#10b981",
      color: "#fff",
    }),
  };

  return (
    <div style={styles.container}>
      <div style={styles.title}>
        <Crown size={16} />
        选择角色
      </div>
      <div style={styles.roleGrid}>
        {ROLES.map((role) => (
          <div
            key={role.id}
            style={styles.roleCard(selectedRole === role.id, role.color)}
            onClick={() => onRoleChange(role.id)}
          >
            <div style={styles.roleHeader}>
              <span style={{ color: role.color }}>{role.icon}</span>
              <span style={styles.roleName}>{role.nameZh}</span>
            </div>
            <div style={styles.roleDesc}>
              {role.description.length > 30
                ? role.description.substring(0, 30) + "..."
                : role.description}
            </div>
            <div style={styles.roleDimensions}>
              {role.dimensions.map((dim) => (
                <span key={dim} style={styles.dimensionBadge(dim)}>
                  {dim}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const RoleDetails: React.FC<{ role: Role }> = ({ role }) => {
  const styles = {
    container: {
      padding: "1rem",
      backgroundColor: "#1a1a2e",
      borderRadius: "12px",
      marginBottom: "1rem",
    },
    header: {
      display: "flex",
      alignItems: "center",
      gap: "0.75rem",
      marginBottom: "1rem",
    },
    icon: {
      width: "48px",
      height: "48px",
      borderRadius: "12px",
      backgroundColor: `${role.color}20`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      fontSize: "1.25rem",
      fontWeight: "600" as const,
    },
    subtitle: {
      fontSize: "0.85rem",
      color: "#9ca3af",
    },
    capabilities: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "1rem",
    },
    capabilitySection: {
      padding: "0.75rem",
      backgroundColor: "#0f0f1a",
      borderRadius: "8px",
    },
    sectionTitle: {
      fontSize: "0.85rem",
      fontWeight: "600" as const,
      marginBottom: "0.5rem",
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
    },
    capabilityList: {
      display: "flex",
      flexWrap: "wrap" as const,
      gap: "0.25rem",
    },
    capabilityTag: (isLight: boolean) => ({
      fontSize: "0.75rem",
      padding: "0.25rem 0.5rem",
      borderRadius: "4px",
      backgroundColor: isLight ? "#22c55e20" : "#ef444420",
      color: isLight ? "#22c55e" : "#ef4444",
    }),
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={{ ...styles.icon, color: role.color }}>{role.icon}</div>
        <div>
          <div style={styles.title}>{role.nameZh}</div>
          <div style={styles.subtitle}>{role.name}</div>
        </div>
      </div>
      <div style={{ fontSize: "0.9rem", color: "#9ca3af", marginBottom: "1rem" }}>
        {role.description}
      </div>
      <div style={styles.capabilities}>
        <div style={styles.capabilitySection}>
          <div style={{ ...styles.sectionTitle, color: "#22c55e" }}>
            <Shield size={14} />
            光明面能力
          </div>
          <div style={styles.capabilityList}>
            {role.lightCapabilities.map((cap, i) => (
              <span key={i} style={styles.capabilityTag(true)}>
                {cap}
              </span>
            ))}
          </div>
        </div>
        <div style={styles.capabilitySection}>
          <div style={{ ...styles.sectionTitle, color: "#ef4444" }}>
            <Shield size={14} />
            黑暗面能力
          </div>
          <div style={styles.capabilityList}>
            {role.darkCapabilities.map((cap, i) => (
              <span key={i} style={styles.capabilityTag(false)}>
                {cap}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleSelector;
