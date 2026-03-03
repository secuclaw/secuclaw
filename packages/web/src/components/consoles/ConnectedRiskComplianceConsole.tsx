import React from 'react';
import { RiskComplianceConsole } from './RiskComplianceConsole';
import { useSecurityData, useComplianceAudit } from '../../hooks/useSecurityData';
import { useWebSocket } from '../../context/WebSocketContext';
import type { RiskScore, ComplianceStatus } from '../../types/dashboard';

interface RiskItem {
  id: string;
  category: string;
  name: string;
  description: string;
  likelihood: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  impact: 'negligible' | 'minor' | 'moderate' | 'major' | 'severe';
  riskScore: number;
  owner: string;
  status: 'open' | 'mitigating' | 'accepted' | 'closed';
  mitigations: { name: string; status: string; effectiveness: number }[];
}

interface Control {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  status: 'passed' | 'failed' | 'warning' | 'not_tested';
  evidence: string[];
  lastTest: Date;
  nextTest: Date;
}

export const ConnectedRiskComplianceConsole: React.FC = () => {
  const { riskScore: apiRiskScore, loading, error, refresh } = useSecurityData(true, 60000);
  const { connected } = useWebSocket();
  const { history: auditHistory } = useComplianceAudit();

  const [riskScore, setRiskScore] = React.useState<RiskScore>({
    overall: 0,
    categories: [],
  });
  const [complianceStatus, setComplianceStatus] = React.useState<ComplianceStatus[]>([]);
  const [risks, setRisks] = React.useState<RiskItem[]>([]);
  const [controls, setControls] = React.useState<Control[]>([]);

  React.useEffect(() => {
    if (apiRiskScore) {
      setRiskScore({
        overall: apiRiskScore.overall,
        categories: [
          { name: '攻击面', score: apiRiskScore.attackSurface, trend: 'stable' },
          { name: '漏洞', score: apiRiskScore.vulnerabilities, trend: 'stable' },
          { name: '威胁', score: apiRiskScore.threats, trend: 'stable' },
          { name: '合规', score: apiRiskScore.compliance, trend: 'stable' },
        ],
      });
    }
  }, [apiRiskScore]);

  React.useEffect(() => {
    setComplianceStatus([
      { framework: 'ISO 27001', score: 78, lastAudit: new Date('2024-01-15'), gaps: 12, controls: { total: 114, passed: 89, failed: 12, warning: 13 } },
      { framework: 'SOC 2', score: 85, lastAudit: new Date('2024-02-01'), gaps: 8, controls: { total: 92, passed: 78, failed: 8, warning: 6 } },
      { framework: 'PCI-DSS', score: 72, lastAudit: new Date('2024-01-20'), gaps: 15, controls: { total: 264, passed: 190, failed: 15, warning: 59 } },
      { framework: 'GDPR', score: 88, lastAudit: new Date('2024-02-10'), gaps: 5, controls: { total: 99, passed: 87, failed: 5, warning: 7 } },
      { framework: 'NIST CSF', score: 81, lastAudit: new Date('2024-01-28'), gaps: 10, controls: { total: 108, passed: 88, failed: 10, warning: 10 } },
      { framework: 'HIPAA', score: 75, lastAudit: new Date('2024-02-05'), gaps: 14, controls: { total: 75, passed: 56, failed: 14, warning: 5 } },
    ]);

    setRisks([
      { id: 'risk-1', category: 'cyber', name: '勒索软件攻击', description: '关键系统可能遭受勒索软件攻击', likelihood: 'high', impact: 'severe', riskScore: 20, owner: 'CISO', status: 'mitigating', mitigations: [{ name: 'EDR部署', status: '完成', effectiveness: 0.8 }] },
      { id: 'risk-2', category: 'cyber', name: '数据泄露', description: '敏感数据可能被未经授权访问', likelihood: 'medium', impact: 'major', riskScore: 15, owner: 'DPO', status: 'open', mitigations: [] },
      { id: 'risk-3', category: 'compliance', name: 'GDPR不合规', description: '数据处理流程不完全符合GDPR要求', likelihood: 'low', impact: 'moderate', riskScore: 8, owner: 'DPO', status: 'mitigating', mitigations: [{ name: '数据映射', status: '进行中', effectiveness: 0.5 }] },
      { id: 'risk-4', category: 'supply_chain', name: '供应商安全', description: '第三方供应商安全控制不足', likelihood: 'medium', impact: 'major', riskScore: 12, owner: '采购部', status: 'open', mitigations: [] },
    ]);

    setControls([
      { id: 'ctrl-1', code: 'ISO-A.9.1.1', name: '访问控制策略', description: '建立和管理访问控制策略', category: '访问控制', status: 'passed', evidence: ['策略文档', '审计日志'], lastTest: new Date('2024-02-01'), nextTest: new Date('2024-05-01') },
      { id: 'ctrl-2', code: 'ISO-A.12.6.1', name: '漏洞管理', description: '及时识别和修复系统漏洞', category: '运维安全', status: 'warning', evidence: ['扫描报告'], lastTest: new Date('2024-01-15'), nextTest: new Date('2024-04-15') },
      { id: 'ctrl-3', code: 'SOC2-CC6.1', name: '逻辑访问', description: '基于角色的访问控制', category: '访问控制', status: 'passed', evidence: ['RBAC配置'], lastTest: new Date('2024-02-10'), nextTest: new Date('2024-05-10') },
      { id: 'ctrl-4', code: 'PCI-11.3', name: '渗透测试', description: '定期进行渗透测试', category: '安全测试', status: 'failed', evidence: [], lastTest: new Date('2023-11-01'), nextTest: new Date('2024-02-01') },
    ]);
  }, []);

  React.useEffect(() => {
    if (auditHistory.length > 0) {
      const latestAudit = auditHistory[0];
      setComplianceStatus(prev => prev.map(c => {
        if (c.framework === latestAudit.framework) {
          return {
            ...c,
            score: latestAudit.summary.overallScore,
            gaps: latestAudit.summary.totalControls - latestAudit.summary.compliant,
            controls: {
              total: latestAudit.summary.totalControls,
              passed: latestAudit.summary.compliant,
              failed: latestAudit.summary.nonCompliant,
              warning: latestAudit.summary.partiallyCompliant,
            },
            lastAudit: new Date(latestAudit.timestamp),
          };
        }
        return c;
      }));
    }
  }, [auditHistory]);

  const handleRiskUpdate = React.useCallback((riskId: string, updates: Partial<RiskItem>) => {
    setRisks(prev => prev.map(r => r.id === riskId ? { ...r, ...updates } : r));
  }, []);

  const handleControlTest = React.useCallback(async (controlId: string) => {
  }, []);

  const handleExport = React.useCallback((type: 'risk_register' | 'compliance_report' | 'gap_analysis') => {
  }, []);

  if (loading && riskScore.overall === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div>加载风险合规数据...</div>
        </div>
      </div>
    );
  }

  if (error && riskScore.overall === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center text-red-500">
          <div className="text-xl mb-2">⚠️ 加载失败</div>
          <div>{error}</div>
          <button
            onClick={refresh}
            className="mt-4 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full relative">
      <div className="absolute top-2 right-2 z-10 flex gap-2">
        <div className={`px-2 py-1 rounded text-xs ${connected ? 'bg-green-600' : 'bg-red-600'} text-white`}>
          {connected ? '🟢 实时连接' : '🔴 离线'}
        </div>
      </div>
      <RiskComplianceConsole
        riskScore={riskScore}
        complianceStatus={complianceStatus}
        risks={risks}
        controls={controls}
        onRiskUpdate={handleRiskUpdate}
        onControlTest={handleControlTest}
        onExport={handleExport}
      />
    </div>
  );
};

export default ConnectedRiskComplianceConsole;
