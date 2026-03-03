export interface SCFThreat {
  id: string;
  code: string;
  category: 'NT' | 'MT';
  name: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  likelihood: 'very_high' | 'high' | 'medium' | 'low' | 'very_low';
  impact: 'severe' | 'major' | 'moderate' | 'minor' | 'negligible';
  affectedDomains: string[];
  mitreMapping: {
    tactics: string[];
    techniques: string[];
  };
  indicators: string[];
  mitigations: string[];
  references: string[];
}

export const NT_THREATS: SCFThreat[] = [
  {
    id: 'NT-001',
    code: 'NT-001',
    category: 'NT',
    name: '高级持续性威胁(APT)攻击',
    description: '国家级或有组织攻击者进行的长期、隐蔽的网络入侵活动，通常针对特定目标进行持续性渗透',
    severity: 'critical',
    likelihood: 'high',
    impact: 'severe',
    affectedDomains: ['政府机构', '关键基础设施', '高科技企业', '金融行业'],
    mitreMapping: {
      tactics: ['Initial Access', 'Persistence', 'Privilege Escalation', 'Defense Evasion', 'Collection', 'Exfiltration'],
      techniques: ['T1566', 'T1078', 'T1055', 'T1059', 'T1071', 'T1041'],
    },
    indicators: ['异常登录模式', 'C2通信特征', '横向移动行为', '数据外传迹象'],
    mitigations: ['零信任架构', '深度防御', '威胁情报监控', '异常行为检测'],
    references: ['MITRE ATT&CK', 'NIST CSF', 'SCF 2025'],
  },
  {
    id: 'NT-002',
    code: 'NT-002',
    category: 'NT',
    name: '勒索软件攻击',
    description: '恶意软件加密或锁定目标系统数据，要求支付赎金才能恢复访问权限',
    severity: 'critical',
    likelihood: 'very_high',
    impact: 'severe',
    affectedDomains: ['医疗行业', '制造业', '教育机构', '中小企业'],
    mitreMapping: {
      tactics: ['Initial Access', 'Execution', 'Persistence', 'Defense Evasion', 'Impact'],
      techniques: ['T1566', 'T1486', 'T1490', 'T1027', 'T1041'],
    },
    indicators: ['文件加密活动', '批量文件修改', '勒索信文件', '可疑进程执行'],
    mitigations: ['定期备份', '端点防护', '网络分段', '员工安全意识培训'],
    references: ['CISA勒索软件指南', 'NIST SP 800-171'],
  },
  {
    id: 'NT-003',
    code: 'NT-003',
    category: 'NT',
    name: '供应链攻击',
    description: '通过攻击软件供应链中的第三方组件或服务，间接入侵目标组织',
    severity: 'critical',
    likelihood: 'high',
    impact: 'severe',
    affectedDomains: ['软件开发', '云服务', '外包服务', '硬件供应链'],
    mitreMapping: {
      tactics: ['Initial Access', 'Persistence', 'Defense Evasion'],
      techniques: ['T1195', 'T1199', 'T1078', 'T1566'],
    },
    indicators: ['异常软件更新', '未授权的代码修改', '第三方访问异常', '依赖包篡改'],
    mitigations: ['供应链风险评估', '软件物料清单(SBOM)', '供应商尽职调查', '代码签名验证'],
    references: ['NIST SP 800-161', 'ISO 28000'],
  },
  {
    id: 'NT-004',
    code: 'NT-004',
    category: 'NT',
    name: '钓鱼攻击',
    description: '通过伪造的电子邮件、网站或其他通信手段，诱骗用户泄露敏感信息',
    severity: 'high',
    likelihood: 'very_high',
    impact: 'major',
    affectedDomains: ['全体员工', '客户服务', '财务部门', '人力资源'],
    mitreMapping: {
      tactics: ['Initial Access', 'Credential Access'],
      techniques: ['T1566', 'T1528', 'T1598'],
    },
    indicators: ['可疑邮件来源', '伪造网站域名', '异常URL', '紧急行动请求'],
    mitigations: ['邮件安全网关', 'DNS过滤', '用户培训', '多因素认证'],
    references: ['NIST SP 800-50', 'ISO 27001 A.7.2'],
  },
  {
    id: 'NT-005',
    code: 'NT-005',
    category: 'NT',
    name: '零日漏洞利用',
    description: '利用尚未公开或尚未发布补丁的软件漏洞进行攻击',
    severity: 'critical',
    likelihood: 'medium',
    impact: 'severe',
    affectedDomains: ['操作系统', '浏览器', '办公软件', '网络设备'],
    mitreMapping: {
      tactics: ['Initial Access', 'Execution', 'Privilege Escalation'],
      techniques: ['T1190', 'T1068', 'T1203'],
    },
    indicators: ['异常进程行为', '内存注入痕迹', '未知漏洞利用代码', '异常系统调用'],
    mitigations: ['虚拟补丁', '应用白名单', '最小权限原则', '威胁情报订阅'],
    references: ['NIST SP 800-40', 'CISA零日漏洞指南'],
  },
  {
    id: 'NT-006',
    code: 'NT-006',
    category: 'NT',
    name: '分布式拒绝服务(DDoS)',
    description: '利用大量僵尸网络发起大规模请求，使目标服务无法正常响应',
    severity: 'high',
    likelihood: 'high',
    impact: 'major',
    affectedDomains: ['Web服务', 'DNS服务', 'API网关', '云服务'],
    mitreMapping: {
      tactics: ['Impact'],
      techniques: ['T1498', 'T1499'],
    },
    indicators: ['流量异常峰值', '来源IP集中', '服务响应延迟', '带宽耗尽'],
    mitigations: ['DDoS防护服务', '流量清洗', 'CDN加速', '限流策略'],
    references: ['NIST SP 800-83', 'ISO 27001 A.12.3'],
  },
  {
    id: 'NT-007',
    code: 'NT-007',
    category: 'NT',
    name: '内部威胁',
    description: '组织内部人员利用合法访问权限进行恶意活动或数据泄露',
    severity: 'high',
    likelihood: 'medium',
    impact: 'major',
    affectedDomains: ['全体员工', '外包人员', '第三方合作伙伴', '离职员工'],
    mitreMapping: {
      tactics: ['Persistence', 'Collection', 'Exfiltration'],
      techniques: ['T1078', 'T1005', 'T1048'],
    },
    indicators: ['异常数据访问', '非工作时间活动', '大量数据下载', '权限滥用'],
    mitigations: ['最小权限原则', '用户行为分析', '数据防泄漏(DLP)', '离职审计'],
    references: ['NIST SP 800-53 AC-1', 'CERT内部威胁指南'],
  },
  {
    id: 'NT-008',
    code: 'NT-008',
    category: 'NT',
    name: '社交工程攻击',
    description: '利用人性弱点，通过心理操控手段获取敏感信息或访问权限',
    severity: 'high',
    likelihood: 'high',
    impact: 'major',
    affectedDomains: ['前台接待', 'IT支持', '人力资源', '高管团队'],
    mitreMapping: {
      tactics: ['Initial Access', 'Credential Access'],
      techniques: ['T1566', 'T1598', 'T1528'],
    },
    indicators: ['紧急请求', '权威施压', '情感操控', '异常信息收集'],
    mitigations: ['安全意识培训', '验证流程', '信息分级', '反钓鱼演练'],
    references: ['NIST SP 800-50', 'ISO 27001 A.7.2'],
  },
];

export const MT_THREATS: SCFThreat[] = [
  {
    id: 'MT-001',
    code: 'MT-001',
    category: 'MT',
    name: '网络战攻击',
    description: '国家级行为体发起的针对军事或战略目标的大规模网络攻击',
    severity: 'critical',
    likelihood: 'low',
    impact: 'severe',
    affectedDomains: ['国防军工', '关键基础设施', '政府机构', '军事通信'],
    mitreMapping: {
      tactics: ['Initial Access', 'Execution', 'Persistence', 'Impact'],
      techniques: ['T1566', 'T1190', 'T1059', 'T1498', 'T1499'],
    },
    indicators: ['国家级攻击组织特征', '高级恶意软件', '战略目标选择', '持久性后门'],
    mitigations: ['国家级网络防御体系', '关键系统隔离', '应急响应预案', '态势感知系统'],
    references: ['SCF 2025 MT章节', '美军网络作战条令'],
  },
  {
    id: 'MT-002',
    code: 'MT-002',
    category: 'MT',
    name: '电磁脉冲(EMP)攻击',
    description: '通过电磁脉冲武器破坏电子设备和通信基础设施',
    severity: 'critical',
    likelihood: 'very_low',
    impact: 'severe',
    affectedDomains: ['通信设施', '电力系统', '数据中心', '控制系统'],
    mitreMapping: {
      tactics: ['Impact'],
      techniques: ['T1499'],
    },
    indicators: ['EMP前兆信号', '电子设备异常', '通信中断', '电力系统故障'],
    mitigations: ['EMP屏蔽', '备用通信系统', '关键设备加固', '应急电源'],
    references: ['SCF 2025 MT章节', '国土安全EMP防护指南'],
  },
  {
    id: 'MT-003',
    code: 'MT-003',
    category: 'MT',
    name: '信息战与认知战',
    description: '通过虚假信息传播、舆论操控等手段影响公众认知和决策',
    severity: 'high',
    likelihood: 'high',
    impact: 'major',
    affectedDomains: ['媒体平台', '社交网络', '新闻机构', '政府部门'],
    mitreMapping: {
      tactics: ['Initial Access', 'Impact'],
      techniques: ['T1583', 'T1584', 'T1499'],
    },
    indicators: ['虚假信息传播', '机器人账号活动', '信息源污染', '舆论异常'],
    mitigations: ['事实核查机制', '信息溯源', '媒体素养教育', '社交平台监控'],
    references: ['SCF 2025 MT章节', 'NATO认知战报告'],
  },
  {
    id: 'MT-004',
    code: 'MT-004',
    category: 'MT',
    name: '卫星通信干扰',
    description: '对卫星通信链路进行干扰或劫持，影响关键通信和数据传输',
    severity: 'critical',
    likelihood: 'low',
    impact: 'severe',
    affectedDomains: ['卫星通信', 'GPS导航', '遥感监测', '军事通信'],
    mitreMapping: {
      tactics: ['Impact'],
      techniques: ['T1498', 'T1499'],
    },
    indicators: ['通信信号异常', 'GPS欺骗', '数据链中断', '卫星控制异常'],
    mitigations: ['频率跳变', '加密通信', '多路径冗余', '抗干扰天线'],
    references: ['SCF 2025 MT章节', 'ITU卫星防护标准'],
  },
  {
    id: 'MT-005',
    code: 'MT-005',
    category: 'MT',
    name: '工业控制系统(ICS)攻击',
    description: '针对工业控制系统的攻击，可能导致物理破坏或安全事故',
    severity: 'critical',
    likelihood: 'medium',
    impact: 'severe',
    affectedDomains: ['能源设施', '水务系统', '交通控制', '制造业'],
    mitreMapping: {
      tactics: ['Initial Access', 'Execution', 'Impact'],
      techniques: ['T0832', 'T0835', 'T0837', 'T0840'],
    },
    indicators: ['PLC异常', 'SCADA系统告警', '工艺参数异常', '控制指令篡改'],
    mitigations: ['OT/IT隔离', '安全监控', '固件完整性验证', '应急停机机制'],
    references: ['MITRE ICS ATT&CK', 'NIST SP 800-82'],
  },
];

export const ALL_THREATS: SCFThreat[] = [...NT_THREATS, ...MT_THREATS];

export function getThreatByCode(code: string): SCFThreat | undefined {
  return ALL_THREATS.find(t => t.code === code);
}

export function getThreatsByCategory(category: 'NT' | 'MT'): SCFThreat[] {
  return category === 'NT' ? NT_THREATS : MT_THREATS;
}

export function getThreatsBySeverity(severity: SCFThreat['severity']): SCFThreat[] {
  return ALL_THREATS.filter(t => t.severity === severity);
}

export function getThreatsByDomain(domain: string): SCFThreat[] {
  return ALL_THREATS.filter(t => t.affectedDomains.includes(domain));
}

export function mapThreatToMITRE(threat: SCFThreat): { tactics: string[]; techniques: string[] } {
  return threat.mitreMapping;
}
