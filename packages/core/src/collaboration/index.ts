export * from './types';
export * from './manager';

import { CollaborationHub, TeamManager, TaskManager } from './manager';
import type { TeamAgent, AgentRole, CollaborationTask } from './types';

export function createDefaultTeam(): CollaborationHub {
  const hub = new CollaborationHub();
  const team = hub.getTeam();

  const defaultAgents: Array<Omit<TeamAgent, 'currentTasks' | 'lastActive' | 'performance'>> = [
    {
      id: 'commander-1',
      name: '安全指挥官',
      role: 'commander',
      capabilities: [
        { name: 'orchestration', description: '协调多Agent工作流', tools: ['task_assign', 'workflow_create'], frameworks: ['MITRE', 'NIST'] },
        { name: 'decision_making', description: '关键决策制定', tools: ['risk_assess', 'approve_action'], frameworks: ['SCF'] },
      ],
      maxConcurrentTasks: 10,
      status: 'available',
    },
    {
      id: 'analyst-1',
      name: '安全分析师',
      role: 'analyst',
      capabilities: [
        { name: 'log_analysis', description: '日志和事件分析', tools: ['log_analysis', 'ioc_search'], frameworks: ['MITRE'] },
        { name: 'threat_assessment', description: '威胁评估', tools: ['risk_assessment', 'impact_analysis'], frameworks: ['NIST'] },
      ],
      maxConcurrentTasks: 5,
      status: 'available',
    },
    {
      id: 'hunter-1',
      name: '威胁猎手',
      role: 'hunter',
      capabilities: [
        { name: 'threat_hunting', description: '主动威胁狩猎', tools: ['ioc_search', 'behavioral_analysis', 'yara_scan'], frameworks: ['MITRE'] },
        { name: 'forensics', description: '取证分析', tools: ['memory_forensics', 'evidence_collection'], frameworks: ['NIST'] },
      ],
      maxConcurrentTasks: 3,
      status: 'available',
    },
    {
      id: 'responder-1',
      name: '应急响应员',
      role: 'responder',
      capabilities: [
        { name: 'incident_response', description: '事件响应', tools: ['incident_create', 'host_isolation', 'containment'], frameworks: ['NIST', 'ISO'] },
        { name: 'containment', description: '威胁遏制', tools: ['block_indicator', 'account_disable'], frameworks: ['MITRE'] },
      ],
      maxConcurrentTasks: 5,
      status: 'available',
    },
    {
      id: 'engineer-1',
      name: '安全工程师',
      role: 'engineer',
      capabilities: [
        { name: 'vulnerability_management', description: '漏洞管理', tools: ['network_vuln_scan', 'web_app_scan', 'container_scan'], frameworks: ['CVE', 'CWE'] },
        { name: 'security_testing', description: '安全测试', tools: ['sql_injection_test', 'xss_test', 'ddos_simulate'], frameworks: ['OWASP'] },
      ],
      maxConcurrentTasks: 3,
      status: 'available',
    },
    {
      id: 'architect-1',
      name: '安全架构师',
      role: 'architect',
      capabilities: [
        { name: 'security_architecture', description: '安全架构设计', tools: ['threat_modeling', 'attack_path_analysis'], frameworks: ['TOGAF', 'SABSA'] },
        { name: 'risk_management', description: '风险管理', tools: ['risk_assessment', 'compliance_check'], frameworks: ['ISO27001', 'NIST'] },
      ],
      maxConcurrentTasks: 2,
      status: 'available',
    },
    {
      id: 'compliance-1',
      name: '合规专员',
      role: 'compliance',
      capabilities: [
        { name: 'compliance_audit', description: '合规审计', tools: ['compliance_check', 'config_audit'], frameworks: ['GDPR', 'PCI-DSS', 'HIPAA'] },
        { name: 'policy_review', description: '策略审查', tools: ['security_gap', 'compliance_check'], frameworks: ['SCF', 'CIS'] },
      ],
      maxConcurrentTasks: 4,
      status: 'available',
    },
    {
      id: 'intel-1',
      name: '情报分析师',
      role: 'intelligence',
      capabilities: [
        { name: 'threat_intelligence', description: '威胁情报', tools: ['threat_intel_query', 'ioc_search'], frameworks: ['STIX', 'TAXII'] },
        { name: 'reconnaissance', description: '情报收集', tools: ['dns_enumeration', 'subdomain_enumeration'], frameworks: ['MITRE'] },
      ],
      maxConcurrentTasks: 4,
      status: 'available',
    },
  ];

  for (const agent of defaultAgents) {
    team.registerAgent(agent);
  }

  return hub;
}

export const predefinedWorkflows = {
  incidentResponse: {
    name: '安全事件响应流程',
    tasks: [
      { title: '事件初筛', description: '初步分析安全事件，确定严重程度', priority: 'critical' as const, role: 'analyst' as AgentRole },
      { title: '威胁识别', description: '识别威胁类型和攻击向量', priority: 'high' as const, role: 'hunter' as AgentRole, dependencies: ['事件初筛'] },
      { title: '影响评估', description: '评估事件影响范围和严重程度', priority: 'high' as const, role: 'analyst' as AgentRole, dependencies: ['威胁识别'] },
      { title: '遏制措施', description: '实施遏制措施防止扩散', priority: 'critical' as const, role: 'responder' as AgentRole, dependencies: ['影响评估'] },
      { title: '根因分析', description: '分析根本原因', priority: 'high' as const, role: 'hunter' as AgentRole, dependencies: ['遏制措施'] },
      { title: '修复验证', description: '验证修复措施有效性', priority: 'medium' as const, role: 'engineer' as AgentRole, dependencies: ['根因分析'] },
      { title: '事后报告', description: '编写事后分析报告', priority: 'medium' as const, role: 'analyst' as AgentRole, dependencies: ['修复验证'] },
    ],
  },
  
  vulnerabilityRemediation: {
    name: '漏洞修复流程',
    tasks: [
      { title: '漏洞扫描', description: '执行漏洞扫描', priority: 'high' as const, role: 'engineer' as AgentRole },
      { title: '漏洞分析', description: '分析漏洞严重性和影响', priority: 'high' as const, role: 'analyst' as AgentRole, dependencies: ['漏洞扫描'] },
      { title: '修复计划', description: '制定修复计划', priority: 'medium' as const, role: 'engineer' as AgentRole, dependencies: ['漏洞分析'] },
      { title: '实施修复', description: '实施修复措施', priority: 'high' as const, role: 'engineer' as AgentRole, dependencies: ['修复计划'] },
      { title: '验证测试', description: '验证修复效果', priority: 'medium' as const, role: 'engineer' as AgentRole, dependencies: ['实施修复'] },
    ],
  },

  complianceAudit: {
    name: '合规审计流程',
    tasks: [
      { title: '范围确定', description: '确定审计范围和标准', priority: 'medium' as const, role: 'compliance' as AgentRole },
      { title: '控制评估', description: '评估安全控制措施', priority: 'medium' as const, role: 'compliance' as AgentRole, dependencies: ['范围确定'] },
      { title: '差距分析', description: '分析合规差距', priority: 'high' as const, role: 'compliance' as AgentRole, dependencies: ['控制评估'] },
      { title: '整改计划', description: '制定整改计划', priority: 'medium' as const, role: 'architect' as AgentRole, dependencies: ['差距分析'] },
      { title: '审计报告', description: '编写审计报告', priority: 'medium' as const, role: 'compliance' as AgentRole, dependencies: ['整改计划'] },
    ],
  },
};

export { CollaborationHub, TeamManager, TaskManager };
export const globalCollaborationHub = createDefaultTeam();
