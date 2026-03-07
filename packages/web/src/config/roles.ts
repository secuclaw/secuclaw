// Security Roles Configuration
// Each role maps to a skill file in the /skills directory

export interface SecurityRole {
  id: string;
  name: string;
  nameEn: string;
  emoji: string;
  desc: string;
  color: string;
  skillFolder: string; // Folder name in /skills directory
  domains: string[]; // SEC (安全), LEG (法律), IT, BIZ (业务)
}

// Mapping from role ID to skill folder name
export const ROLE_SKILL_MAPPING: Record<string, string> = {
  'security-expert': 'security-expert',
  'privacy-security-officer': 'privacy-officer',
  'security-architect': 'security-architect',
  'business-security-officer': 'business-security-officer',
  'chief-security-architect': 'ciso',
  'supply-chain-security-officer': 'supply-chain-security',
  'business-security-operations': 'security-ops',
  'secuclaw-commander': 'secuclaw-commander',
};

export const SECURITY_ROLES: SecurityRole[] = [
  { 
    id: 'security-expert', 
    name: '安全专家', 
    nameEn: 'Security Expert', 
    emoji: '🛡️', 
    desc: '威胁检测、漏洞评估、事件响应、渗透测试',
    color: '#10b981',
    skillFolder: 'security-expert',
    domains: ['SEC']
  },
  { 
    id: 'privacy-security-officer', 
    name: '隐私安全官', 
    nameEn: 'Privacy Security Officer', 
    emoji: '🔒', 
    desc: '安全攻防 + 隐私保护/数据安全合规',
    color: '#8b5cf6',
    skillFolder: 'privacy-officer',
    domains: ['SEC', 'LEG']
  },
  { 
    id: 'security-architect', 
    name: '安全架构师', 
    nameEn: 'Security Architect', 
    emoji: '🏗️', 
    desc: '安全攻防 + 基础设施/代码/网络安全',
    color: '#3b82f6',
    skillFolder: 'security-architect',
    domains: ['SEC', 'IT']
  },
  { 
    id: 'business-security-officer', 
    name: '业务安全官', 
    nameEn: 'Business Security Officer', 
    emoji: '💼', 
    desc: '安全攻防 + 供应链安全/业务连续性',
    color: '#f59e0b',
    skillFolder: 'business-security-officer',
    domains: ['SEC', 'BIZ']
  },
  { 
    id: 'chief-security-architect', 
    name: '首席安全架构官', 
    nameEn: 'Chief Security Architect', 
    emoji: '👔', 
    desc: '安全攻防 + 合规 + 技术安全全面负责',
    color: '#ec4899',
    skillFolder: 'ciso',
    domains: ['SEC', 'LEG', 'IT']
  },
  { 
    id: 'supply-chain-security-officer', 
    name: '供应链安全官', 
    nameEn: 'Supply Chain Security Officer', 
    emoji: '🔗', 
    desc: '安全攻防 + 隐私合规 + 供应链安全',
    color: '#06b6d4',
    skillFolder: 'supply-chain-security',
    domains: ['SEC', 'LEG', 'BIZ']
  },
  { 
    id: 'business-security-operations', 
    name: '业务安全运营官', 
    nameEn: 'Business Security Operations', 
    emoji: '⚙️', 
    desc: '安全攻防 + 技术安全 + 业务连续性',
    color: '#14b8a6',
    skillFolder: 'security-ops',
    domains: ['SEC', 'IT', 'BIZ']
  },
  { 
    id: 'secuclaw-commander', 
    name: '全域安全指挥官', 
    nameEn: 'Enterprise Security Commander', 
    emoji: '🎖️', 
    desc: '完整安全攻防 + 全维度安全属性',
    color: '#ef4444',
    skillFolder: 'secuclaw-commander',
    domains: ['SEC', 'LEG', 'IT', 'BIZ']
  },
];

// Skill metadata parsed from SKILL.md frontmatter
export interface SkillCapabilities {
  light: string[];
  dark: string[];
  security: string[];
  legal: string[];
  technology: string[];
  business: string[];
}

export interface SkillMetadata {
  name: string;
  description: string;
  emoji: string;
  role: string;
  combination: string;
  version: string;
  capabilities: SkillCapabilities;
  mitre_coverage: string[];
  scf_coverage: string[];
}

export interface LoadedSkill {
  folder: string;
  metadata?: SkillMetadata;
  loaded: boolean;
  error?: string;
}

// Topic keywords mapping to capability categories
export interface TopicMapping {
  keywords: string[];
  category: keyof SkillCapabilities;
  responseTemplate: string;
}

export const TOPIC_MAPPINGS: TopicMapping[] = [
  // Privacy & Data Protection
  { keywords: ['隐私', '个人信息', '数据保护', 'GDPR', 'CCPA', 'PIPL', '数据合规', 'cookie', '同意管理'], category: 'legal', responseTemplate: '从隐私合规角度，我可以为您提供：' },
  { keywords: ['数据加密', '脱敏', '数据分类', '数据生命周期'], category: 'light', responseTemplate: '从数据保护角度，我可以为您提供：' },
  { keywords: ['隐私渗透', '数据泄露', '个人信息窃取'], category: 'dark', responseTemplate: '从攻击视角，我可以帮您分析：' },
  
  // Network & Infrastructure
  { keywords: ['网络', '防火墙', 'VPN', '零信任', '网络架构'], category: 'technology', responseTemplate: '从网络安全角度，我可以为您提供：' },
  { keywords: ['渗透测试', '漏洞扫描', '攻击模拟'], category: 'dark', responseTemplate: '从攻击测试角度，我可以帮您：' },
  { keywords: ['漏洞', '补丁', '修复', 'CVE'], category: 'light', responseTemplate: '从漏洞管理角度，我可以为您提供：' },
  
  // Compliance
  { keywords: ['合规', '审计', '监管', 'ISO', 'SOC2', '等保'], category: 'legal', responseTemplate: '从合规治理角度，我可以为您提供：' },
  { keywords: ['法律风险', '合同安全', '法律责任'], category: 'legal', responseTemplate: '从法律合规角度，我可以帮您：' },
  
  // Risk & Business
  { keywords: ['风险', '风险评估', '风险管理'], category: 'business', responseTemplate: '从风险管理角度，我可以为您提供：' },
  { keywords: ['业务连续性', 'BCP', '灾难恢复', '应急'], category: 'light', responseTemplate: '从业务连续性角度，我可以为您提供：' },
  { keywords: ['供应链', '第三方', '供应商'], category: 'business', responseTemplate: '从供应链安全角度，我可以为您提供：' },
  
  // Security Operations
  { keywords: ['SOC', '安全运营', '监控', '日志', 'SIEM'], category: 'technology', responseTemplate: '从安全运营角度，我可以为您提供：' },
  { keywords: ['威胁情报', '威胁狩猎', 'APT'], category: 'security', responseTemplate: '从威胁情报角度，我可以为您提供：' },
  { keywords: ['事件响应', '应急响应', '安全事件'], category: 'light', responseTemplate: '从事件响应角度，我可以为您提供：' },
  
  // Architecture
  { keywords: ['架构', '安全设计', '应用安全', '云安全'], category: 'technology', responseTemplate: '从安全架构角度，我可以为您提供：' },
  { keywords: ['代码审计', '安全开发', 'SDLC'], category: 'technology', responseTemplate: '从代码安全角度，我可以为您提供：' },
  
  // Identity & Access
  { keywords: ['身份', '认证', '授权', 'IAM', '访问控制', 'RBAC'], category: 'security', responseTemplate: '从身份管理角度，我可以为您提供：' },
  
  // General security
  { keywords: ['安全', '威胁', '攻击', '防御', '保护'], category: 'security', responseTemplate: '从安全专业角度，我可以为您提供：' },
];

// Helper function to get role by ID
export function getRoleById(roleId: string): SecurityRole | undefined {
  return SECURITY_ROLES.find(r => r.id === roleId);
}

// Get skill folder for a role
export function getSkillFolder(roleId: string): string {
  return ROLE_SKILL_MAPPING[roleId] || '';
}

// Detect topic from user message
export function detectTopic(message: string): TopicMapping | null {
  const lowerMsg = message.toLowerCase();
  for (const mapping of TOPIC_MAPPINGS) {
    for (const keyword of mapping.keywords) {
      if (lowerMsg.includes(keyword)) {
        return mapping;
      }
    }
  }
  return null;
}
