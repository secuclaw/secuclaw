export interface SCFRisk {
  id: string;
  code: string;
  domain: string;
  name: string;
  description: string;
  inherentRisk: {
    likelihood: 'very_high' | 'high' | 'medium' | 'low' | 'very_low';
    impact: 'severe' | 'major' | 'moderate' | 'minor' | 'negligible';
    score: number;
  };
  residualRisk: {
    likelihood: 'very_high' | 'high' | 'medium' | 'low' | 'very_low';
    impact: 'severe' | 'major' | 'moderate' | 'minor' | 'negligible';
    score: number;
  };
  controls: string[];
  owner: string;
  reviewDate: Date;
  status: 'open' | 'mitigating' | 'accepted' | 'closed';
}

export const R_AC_RISKS: SCFRisk[] = [
  {
    id: 'R-AC-001',
    code: 'R-AC-001',
    domain: '访问控制',
    name: '特权账号管理不当',
    description: '特权账号缺乏有效管理，可能导致账号泄露或滥用',
    inherentRisk: { likelihood: 'high', impact: 'severe', score: 20 },
    residualRisk: { likelihood: 'medium', impact: 'major', score: 12 },
    controls: ['PAM系统', 'MFA', '账号审计', '定期密码轮换'],
    owner: 'IAM团队',
    reviewDate: new Date('2024-03-01'),
    status: 'mitigating',
  },
  {
    id: 'R-AC-002',
    code: 'R-AC-002',
    domain: '访问控制',
    name: '缺乏最小权限原则',
    description: '用户被授予超出工作需要的权限，增加数据泄露风险',
    inherentRisk: { likelihood: 'high', impact: 'major', score: 16 },
    residualRisk: { likelihood: 'medium', impact: 'moderate', score: 9 },
    controls: ['RBAC', '权限审查流程', '定期权限审计'],
    owner: 'IAM团队',
    reviewDate: new Date('2024-03-15'),
    status: 'mitigating',
  },
  {
    id: 'R-AC-003',
    code: 'R-AC-003',
    domain: '访问控制',
    name: '单点登录(SSO)风险',
    description: 'SSO系统成为单一故障点，一旦被攻破影响所有关联系统',
    inherentRisk: { likelihood: 'medium', impact: 'severe', score: 15 },
    residualRisk: { likelihood: 'low', impact: 'major', score: 8 },
    controls: ['MFA强化', 'SSO监控', '应急访问机制'],
    owner: 'IAM团队',
    reviewDate: new Date('2024-04-01'),
    status: 'mitigating',
  },
];

export const R_AS_RISKS: SCFRisk[] = [
  {
    id: 'R-AS-001',
    code: 'R-AS-001',
    domain: '应用安全',
    name: 'SQL注入漏洞',
    description: '应用程序存在SQL注入漏洞，可能导致数据库被非法访问',
    inherentRisk: { likelihood: 'high', impact: 'severe', score: 20 },
    residualRisk: { likelihood: 'low', impact: 'major', score: 8 },
    controls: ['参数化查询', 'WAF', '输入验证', '代码审计'],
    owner: '应用安全团队',
    reviewDate: new Date('2024-02-15'),
    status: 'mitigating',
  },
  {
    id: 'R-AS-002',
    code: 'R-AS-002',
    domain: '应用安全',
    name: '跨站脚本(XSS)',
    description: '应用存在XSS漏洞，可能被用于窃取用户会话或传播恶意代码',
    inherentRisk: { likelihood: 'high', impact: 'major', score: 16 },
    residualRisk: { likelihood: 'low', impact: 'moderate', score: 6 },
    controls: ['输出编码', 'CSP策略', '输入验证', '安全开发培训'],
    owner: '应用安全团队',
    reviewDate: new Date('2024-02-20'),
    status: 'mitigating',
  },
  {
    id: 'R-AS-003',
    code: 'R-AS-003',
    domain: '应用安全',
    name: '不安全的API设计',
    description: 'API缺乏适当的认证、授权或速率限制，可能被滥用',
    inherentRisk: { likelihood: 'high', impact: 'major', score: 16 },
    residualRisk: { likelihood: 'medium', impact: 'moderate', score: 9 },
    controls: ['API网关', 'OAuth 2.0', '速率限制', 'API安全测试'],
    owner: 'API团队',
    reviewDate: new Date('2024-03-01'),
    status: 'mitigating',
  },
];

export const R_IS_RISKS: SCFRisk[] = [
  {
    id: 'R-IS-001',
    code: 'R-IS-001',
    domain: '基础设施安全',
    name: '未修补的系统漏洞',
    description: '系统和软件未及时更新补丁，存在已知漏洞',
    inherentRisk: { likelihood: 'very_high', impact: 'severe', score: 25 },
    residualRisk: { likelihood: 'medium', impact: 'major', score: 12 },
    controls: ['补丁管理系统', '漏洞扫描', '虚拟补丁', '配置管理'],
    owner: '运维团队',
    reviewDate: new Date('2024-01-15'),
    status: 'mitigating',
  },
  {
    id: 'R-IS-002',
    code: 'R-IS-002',
    domain: '基础设施安全',
    name: '网络分段不足',
    description: '网络缺乏适当分段，攻击者可轻易横向移动',
    inherentRisk: { likelihood: 'high', impact: 'severe', score: 20 },
    residualRisk: { likelihood: 'medium', impact: 'major', score: 12 },
    controls: ['VLAN划分', '防火墙规则', '微隔离', '零信任网络'],
    owner: '网络团队',
    reviewDate: new Date('2024-02-01'),
    status: 'mitigating',
  },
  {
    id: 'R-IS-003',
    code: 'R-IS-003',
    domain: '基础设施安全',
    name: '云服务配置错误',
    description: '云资源配置不当，可能导致数据泄露或未授权访问',
    inherentRisk: { likelihood: 'high', impact: 'severe', score: 20 },
    residualRisk: { likelihood: 'medium', impact: 'major', score: 12 },
    controls: ['CSPM工具', '配置审计', 'IaC安全扫描', '云安全策略'],
    owner: '云团队',
    reviewDate: new Date('2024-02-15'),
    status: 'mitigating',
  },
];

export const R_DS_RISKS: SCFRisk[] = [
  {
    id: 'R-DS-001',
    code: 'R-DS-001',
    domain: '数据安全',
    name: '敏感数据未加密',
    description: '敏感数据在存储或传输过程中未加密，存在泄露风险',
    inherentRisk: { likelihood: 'high', impact: 'severe', score: 20 },
    residualRisk: { likelihood: 'low', impact: 'moderate', score: 6 },
    controls: ['加密存储', 'TLS传输', '密钥管理', '数据分类'],
    owner: '数据安全团队',
    reviewDate: new Date('2024-02-01'),
    status: 'mitigating',
  },
  {
    id: 'R-DS-002',
    code: 'R-DS-002',
    domain: '数据安全',
    name: '数据备份不足',
    description: '关键数据缺乏有效备份，无法应对勒索软件或系统故障',
    inherentRisk: { likelihood: 'medium', impact: 'severe', score: 15 },
    residualRisk: { likelihood: 'low', impact: 'major', score: 8 },
    controls: ['定期备份', '异地备份', '备份测试', '快速恢复机制'],
    owner: '运维团队',
    reviewDate: new Date('2024-01-20'),
    status: 'mitigating',
  },
  {
    id: 'R-DS-003',
    code: 'R-DS-003',
    domain: '数据安全',
    name: '数据防泄漏(DLP)缺失',
    description: '缺乏有效的数据防泄漏机制，敏感信息可能外泄',
    inherentRisk: { likelihood: 'high', impact: 'major', score: 16 },
    residualRisk: { likelihood: 'medium', impact: 'moderate', score: 9 },
    controls: ['DLP系统', '数据分类', '出口监控', '员工培训'],
    owner: '数据安全团队',
    reviewDate: new Date('2024-02-15'),
    status: 'mitigating',
  },
];

export const R_NS_RISKS: SCFRisk[] = [
  {
    id: 'R-NS-001',
    code: 'R-NS-001',
    domain: '网络安全',
    name: '防火墙规则过时',
    description: '防火墙规则未定期审查，存在不必要的开放端口或规则',
    inherentRisk: { likelihood: 'high', impact: 'major', score: 16 },
    residualRisk: { likelihood: 'medium', impact: 'moderate', score: 9 },
    controls: ['规则审计流程', '自动化规则管理', '定期审查'],
    owner: '网络团队',
    reviewDate: new Date('2024-02-01'),
    status: 'mitigating',
  },
  {
    id: 'R-NS-002',
    code: 'R-NS-002',
    domain: '网络安全',
    name: 'DNS安全防护不足',
    description: '缺乏DNS安全防护，可能遭受DNS劫持或投毒攻击',
    inherentRisk: { likelihood: 'medium', impact: 'major', score: 12 },
    residualRisk: { likelihood: 'low', impact: 'moderate', score: 6 },
    controls: ['DNSSEC', 'DNS过滤', 'DNS监控', '备用DNS'],
    owner: '网络团队',
    reviewDate: new Date('2024-02-15'),
    status: 'mitigating',
  },
  {
    id: 'R-NS-003',
    code: 'R-NS-003',
    domain: '网络安全',
    name: '入侵检测能力不足',
    description: '网络缺乏有效的入侵检测系统，无法及时发现攻击',
    inherentRisk: { likelihood: 'high', impact: 'severe', score: 20 },
    residualRisk: { likelihood: 'medium', impact: 'major', score: 12 },
    controls: ['IDS/IPS', '流量分析', '威胁情报集成', '安全监控'],
    owner: 'SOC团队',
    reviewDate: new Date('2024-01-15'),
    status: 'mitigating',
  },
];

export const R_SC_RISKS: SCFRisk[] = [
  {
    id: 'R-SC-001',
    code: 'R-SC-001',
    domain: '供应链',
    name: '第三方供应商风险',
    description: '第三方供应商的安全控制不足可能影响组织安全',
    inherentRisk: { likelihood: 'high', impact: 'severe', score: 20 },
    residualRisk: { likelihood: 'medium', impact: 'major', score: 12 },
    controls: ['供应商评估', '合同安全条款', '持续监控', '应急计划'],
    owner: '采购团队',
    reviewDate: new Date('2024-03-01'),
    status: 'mitigating',
  },
  {
    id: 'R-SC-002',
    code: 'R-SC-002',
    domain: '供应链',
    name: '开源组件漏洞',
    description: '使用的开源组件存在已知漏洞，可能被攻击者利用',
    inherentRisk: { likelihood: 'very_high', impact: 'major', score: 20 },
    residualRisk: { likelihood: 'medium', impact: 'moderate', score: 9 },
    controls: ['SCA工具', '依赖更新流程', 'SBOM', '漏洞监控'],
    owner: '开发团队',
    reviewDate: new Date('2024-01-20'),
    status: 'mitigating',
  },
  {
    id: 'R-SC-003',
    code: 'R-SC-003',
    domain: '供应链',
    name: '软件供应链攻击',
    description: '软件供应链可能被攻击者渗透，注入恶意代码',
    inherentRisk: { likelihood: 'medium', impact: 'severe', score: 15 },
    residualRisk: { likelihood: 'low', impact: 'major', score: 8 },
    controls: ['代码签名', '构建管道安全', '供应商验证', '代码审计'],
    owner: 'DevSecOps团队',
    reviewDate: new Date('2024-02-15'),
    status: 'mitigating',
  },
];

export const ALL_RISKS: SCFRisk[] = [
  ...R_AC_RISKS,
  ...R_AS_RISKS,
  ...R_IS_RISKS,
  ...R_DS_RISKS,
  ...R_NS_RISKS,
  ...R_SC_RISKS,
];

export const RISKS_BY_DOMAIN = {
  'R-AC': { name: '访问控制', risks: R_AC_RISKS },
  'R-AS': { name: '应用安全', risks: R_AS_RISKS },
  'R-IS': { name: '基础设施安全', risks: R_IS_RISKS },
  'R-DS': { name: '数据安全', risks: R_DS_RISKS },
  'R-NS': { name: '网络安全', risks: R_NS_RISKS },
  'R-SC': { name: '供应链', risks: R_SC_RISKS },
};

export function getRiskByCode(code: string): SCFRisk | undefined {
  return ALL_RISKS.find(r => r.code === code);
}

export function getRisksByDomain(domain: keyof typeof RISKS_BY_DOMAIN): SCFRisk[] {
  return RISKS_BY_DOMAIN[domain]?.risks || [];
}

export function calculateRiskScore(
  likelihood: SCFRisk['inherentRisk']['likelihood'],
  impact: SCFRisk['inherentRisk']['impact'],
): number {
  const likelihoodValues = { very_low: 1, low: 2, medium: 3, high: 4, very_high: 5 };
  const impactValues = { negligible: 1, minor: 2, moderate: 3, major: 4, severe: 5 };
  return likelihoodValues[likelihood] * impactValues[impact];
}

export function getRiskLevel(score: number): 'critical' | 'high' | 'medium' | 'low' {
  if (score >= 20) return 'critical';
  if (score >= 12) return 'high';
  if (score >= 6) return 'medium';
  return 'low';
}
