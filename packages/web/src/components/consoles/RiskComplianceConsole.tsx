import React, { useState, useMemo } from 'react';
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

interface RiskComplianceConsoleProps {
  riskScore: RiskScore;
  complianceStatus: ComplianceStatus[];
  risks: RiskItem[];
  controls: Control[];
  onRiskUpdate: (riskId: string, updates: Partial<RiskItem>) => void;
  onControlTest: (controlId: string) => Promise<void>;
  onExport: (type: 'risk_register' | 'compliance_report' | 'gap_analysis') => void;
}

export const RiskComplianceConsole: React.FC<RiskComplianceConsoleProps> = ({
  riskScore,
  complianceStatus,
  risks,
  controls,
  onRiskUpdate,
  onControlTest,
  onExport,
}) => {
  const [selectedTab, setSelectedTab] = useState<'risk' | 'compliance' | 'controls' | 'gaps'>('risk');
  const [selectedFramework, setSelectedFramework] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<{ status: string; category: string }>({
    status: 'all',
    category: 'all',
  });

  const filteredRisks = useMemo(() => {
    return risks.filter(risk => {
      if (riskFilter.status !== 'all' && risk.status !== riskFilter.status) return false;
      if (riskFilter.category !== 'all' && risk.category !== riskFilter.category) return false;
      return true;
    });
  }, [risks, riskFilter]);

  const getRiskLevelColor = (score: number) => {
    if (score >= 20) return 'bg-red-600';
    if (score >= 15) return 'bg-orange-600';
    if (score >= 10) return 'bg-yellow-600';
    if (score >= 5) return 'bg-blue-600';
    return 'bg-green-600';
  };

  const getRiskLevelText = (score: number) => {
    if (score >= 20) return '极高';
    if (score >= 15) return '高';
    if (score >= 10) return '中';
    if (score >= 5) return '低';
    return '极低';
  };

  const getControlStatusBadge = (status: string) => {
    switch (status) {
      case 'passed': return 'bg-green-600 text-white';
      case 'failed': return 'bg-red-600 text-white';
      case 'warning': return 'bg-yellow-600 text-black';
      default: return 'bg-gray-600 text-white';
    }
  };

  return (
    <div className="risk-compliance-console h-full flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 px-6 py-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">风险合规控制台</h1>
          <div className="flex items-center gap-4">
            {/* Overall Risk Score */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm text-gray-400">整体风险评分</div>
                <div className={`text-2xl font-bold ${
                  riskScore.overall >= 15 ? 'text-red-500' :
                  riskScore.overall >= 10 ? 'text-yellow-500' : 'text-green-500'
                }`}>
                  {riskScore.overall.toFixed(1)}
                </div>
              </div>
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${getRiskLevelColor(riskScore.overall)}`}>
                <span className="text-lg font-bold">{getRiskLevelText(riskScore.overall)}</span>
              </div>
            </div>

            <div className="h-10 w-px bg-gray-700" />

            {/* Quick Actions */}
            <button
              onClick={() => onExport('risk_register')}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            >
              导出风险登记
            </button>
            <button
              onClick={() => onExport('compliance_report')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
            >
              生成合规报告
            </button>
          </div>
        </div>
      </div>

      {/* Risk Category Overview */}
      <div className="grid grid-cols-6 gap-4 p-4 bg-gray-800/50">
        {riskScore.categories.map(cat => (
          <div key={cat.name} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
            <div className="text-sm text-gray-400 mb-1">{cat.name}</div>
            <div className="flex items-center gap-2">
              <span className={`text-xl font-bold ${
                cat.score >= 15 ? 'text-red-500' :
                cat.score >= 10 ? 'text-yellow-500' : 'text-green-500'
              }`}>
                {cat.score.toFixed(1)}
              </span>
              <span className={`text-xs ${
                cat.trend === 'up' ? 'text-red-400' :
                cat.trend === 'down' ? 'text-green-400' : 'text-gray-400'
              }`}>
                {cat.trend === 'up' ? '↑' : cat.trend === 'down' ? '↓' : '→'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-700 px-6">
        <div className="flex gap-6">
          {[
            { key: 'risk', label: '风险登记' },
            { key: 'compliance', label: '合规状态' },
            { key: 'controls', label: '控制措施' },
            { key: 'gaps', label: '差距分析' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSelectedTab(key as typeof selectedTab)}
              className={`py-3 px-1 border-b-2 transition-colors ${
                selectedTab === key
                  ? 'border-blue-500 text-blue-500'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-6">
        {selectedTab === 'risk' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-4">
              <select
                value={riskFilter.status}
                onChange={(e) => setRiskFilter(prev => ({ ...prev, status: e.target.value }))}
                className="bg-gray-700 border border-gray-600 rounded px-3 py-2"
              >
                <option value="all">所有状态</option>
                <option value="open">开放</option>
                <option value="mitigating">缓解中</option>
                <option value="accepted">已接受</option>
                <option value="closed">已关闭</option>
              </select>
              <select
                value={riskFilter.category}
                onChange={(e) => setRiskFilter(prev => ({ ...prev, category: e.target.value }))}
                className="bg-gray-700 border border-gray-600 rounded px-3 py-2"
              >
                <option value="all">所有类别</option>
                <option value="cyber">网络安全</option>
                <option value="physical">物理安全</option>
                <option value="operational">运营安全</option>
                <option value="compliance">合规风险</option>
                <option value="supply_chain">供应链风险</option>
              </select>
              <div className="flex-1" />
              <button className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded">
                + 添加风险
              </button>
            </div>

            {/* Risk Table */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="text-left p-3">风险名称</th>
                    <th className="text-left p-3">类别</th>
                    <th className="text-left p-3">可能性</th>
                    <th className="text-left p-3">影响</th>
                    <th className="text-left p-3">风险值</th>
                    <th className="text-left p-3">状态</th>
                    <th className="text-left p-3">负责人</th>
                    <th className="text-left p-3">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRisks.map(risk => (
                    <tr key={risk.id} className="border-t border-gray-700 hover:bg-gray-700/50">
                      <td className="p-3">
                        <div className="font-medium">{risk.name}</div>
                        <div className="text-sm text-gray-400">{risk.description}</div>
                      </td>
                      <td className="p-3">{risk.category}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          risk.likelihood === 'very_high' ? 'bg-red-600' :
                          risk.likelihood === 'high' ? 'bg-orange-600' :
                          risk.likelihood === 'medium' ? 'bg-yellow-600' :
                          risk.likelihood === 'low' ? 'bg-blue-600' : 'bg-green-600'
                        }`}>
                          {risk.likelihood}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          risk.impact === 'severe' ? 'bg-red-600' :
                          risk.impact === 'major' ? 'bg-orange-600' :
                          risk.impact === 'moderate' ? 'bg-yellow-600' :
                          risk.impact === 'minor' ? 'bg-blue-600' : 'bg-green-600'
                        }`}>
                          {risk.impact}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className={`w-12 h-12 rounded flex items-center justify-center font-bold ${getRiskLevelColor(risk.riskScore)}`}>
                          {risk.riskScore}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          risk.status === 'open' ? 'bg-red-600' :
                          risk.status === 'mitigating' ? 'bg-blue-600' :
                          risk.status === 'accepted' ? 'bg-yellow-600' : 'bg-green-600'
                        }`}>
                          {risk.status}
                        </span>
                      </td>
                      <td className="p-3 text-gray-400">{risk.owner}</td>
                      <td className="p-3">
                        <button className="text-blue-400 hover:text-blue-300 text-sm">编辑</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedTab === 'compliance' && (
          <div className="space-y-6">
            {/* Framework Selector */}
            <div className="flex items-center gap-4">
              <select
                value={selectedFramework}
                onChange={(e) => setSelectedFramework(e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded px-3 py-2"
              >
                <option value="all">所有框架</option>
                <option value="iso27001">ISO 27001</option>
                <option value="soc2">SOC 2</option>
                <option value="pci-dss">PCI-DSS</option>
                <option value="gdpr">GDPR</option>
                <option value="hipaa">HIPAA</option>
                <option value="nist">NIST CSF</option>
              </select>
            </div>

            {/* Compliance Cards */}
            <div className="grid grid-cols-3 gap-4">
              {complianceStatus.map(compliance => (
                <div key={compliance.framework} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">{compliance.framework}</h3>
                    <div className={`text-2xl font-bold ${
                      compliance.score >= 80 ? 'text-green-500' :
                      compliance.score >= 60 ? 'text-yellow-500' : 'text-red-500'
                    }`}>
                      {compliance.score}%
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-3 bg-gray-700 rounded-full overflow-hidden mb-4">
                    <div
                      className={`h-full ${
                        compliance.score >= 80 ? 'bg-green-500' :
                        compliance.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${compliance.score}%` }}
                    />
                  </div>

                  {/* Control Stats */}
                  <div className="grid grid-cols-4 gap-2 text-center text-sm">
                    <div>
                      <div className="font-semibold">{compliance.controls.total}</div>
                      <div className="text-gray-400 text-xs">总数</div>
                    </div>
                    <div>
                      <div className="font-semibold text-green-500">{compliance.controls.passed}</div>
                      <div className="text-gray-400 text-xs">通过</div>
                    </div>
                    <div>
                      <div className="font-semibold text-red-500">{compliance.controls.failed}</div>
                      <div className="text-gray-400 text-xs">失败</div>
                    </div>
                    <div>
                      <div className="font-semibold text-yellow-500">{compliance.controls.warning}</div>
                      <div className="text-gray-400 text-xs">警告</div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-700 text-sm text-gray-400">
                    <div>上次审计: {new Date(compliance.lastAudit).toLocaleDateString()}</div>
                    <div className="text-red-400 mt-1">{compliance.gaps} 个差距待处理</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedTab === 'controls' && (
          <div className="space-y-4">
            {/* Control Inventory */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="text-left p-3">控制编码</th>
                    <th className="text-left p-3">控制名称</th>
                    <th className="text-left p-3">类别</th>
                    <th className="text-left p-3">状态</th>
                    <th className="text-left p-3">上次测试</th>
                    <th className="text-left p-3">下次测试</th>
                    <th className="text-left p-3">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {controls.map(control => (
                    <tr key={control.id} className="border-t border-gray-700 hover:bg-gray-700/50">
                      <td className="p-3 font-mono text-sm">{control.code}</td>
                      <td className="p-3">
                        <div className="font-medium">{control.name}</div>
                        <div className="text-sm text-gray-400">{control.description}</div>
                      </td>
                      <td className="p-3 text-gray-400">{control.category}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs ${getControlStatusBadge(control.status)}`}>
                          {control.status}
                        </span>
                      </td>
                      <td className="p-3 text-gray-400 text-sm">
                        {new Date(control.lastTest).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-gray-400 text-sm">
                        {new Date(control.nextTest).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => onControlTest(control.id)}
                          className="text-blue-400 hover:text-blue-300 text-sm"
                        >
                          测试
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedTab === 'gaps' && (
          <div className="space-y-6">
            {/* Gap Summary */}
            <div className="grid grid-cols-4 gap-4">
              {complianceStatus.map(compliance => (
                <div key={compliance.framework} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <div className="text-sm text-gray-400">{compliance.framework}</div>
                  <div className="text-3xl font-bold text-red-500 mt-1">{compliance.gaps}</div>
                  <div className="text-sm text-gray-400">待处理差距</div>
                </div>
              ))}
            </div>

            {/* Gap Details */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4">差距详情</h3>
              <div className="space-y-3">
                {[
                  { framework: 'ISO 27001', control: 'A.12.6.1', gap: '缺少漏洞管理流程文档', priority: 'high', owner: 'IT Security' },
                  { framework: 'SOC 2', control: 'CC6.1', gap: '多因素认证未覆盖所有关键系统', priority: 'critical', owner: 'IAM Team' },
                  { framework: 'GDPR', control: 'Art. 32', gap: '数据处理记录不完整', priority: 'medium', owner: 'DPO' },
                  { framework: 'PCI-DSS', control: '11.3', gap: '渗透测试频率不满足要求', priority: 'high', owner: 'Red Team' },
                ].map((gap, idx) => (
                  <div key={idx} className="p-3 bg-gray-700/50 rounded">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          gap.priority === 'critical' ? 'bg-red-600' :
                          gap.priority === 'high' ? 'bg-orange-600' :
                          gap.priority === 'medium' ? 'bg-yellow-600' : 'bg-blue-600'
                        }`}>
                          {gap.priority}
                        </span>
                        <span className="font-mono text-sm">{gap.control}</span>
                        <span className="text-gray-400">({gap.framework})</span>
                      </div>
                      <span className="text-sm text-gray-400">{gap.owner}</span>
                    </div>
                    <p className="mt-2 text-sm">{gap.gap}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Remediation Plan */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">修复计划</h3>
                <button
                  onClick={() => onExport('gap_analysis')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                >
                  导出分析报告
                </button>
              </div>
              <div className="space-y-2">
                <div className="p-3 bg-green-600/20 border border-green-600/50 rounded">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">MFA部署计划</span>
                    <span className="text-green-400 text-sm">进行中 - 75%</span>
                  </div>
                  <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500" style={{ width: '75%' }} />
                  </div>
                </div>
                <div className="p-3 bg-yellow-600/20 border border-yellow-600/50 rounded">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">漏洞管理流程</span>
                    <span className="text-yellow-400 text-sm">计划中</span>
                  </div>
                </div>
                <div className="p-3 bg-gray-700/50 rounded">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">数据映射更新</span>
                    <span className="text-gray-400 text-sm">未开始</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RiskComplianceConsole;
