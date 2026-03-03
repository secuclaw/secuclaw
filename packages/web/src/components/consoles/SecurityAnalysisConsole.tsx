import React, { useState, useMemo } from 'react';
import type { SecurityEvent, ThreatIntel } from '../../types/dashboard';

export interface AnalysisResult {
  id: string;
  type: 'threat_hunt' | 'ioc_analysis' | 'log_analysis' | 'malware_analysis' | 'forensics';
  title: string;
  summary: string;
  indicators: string[];
  timeline: { time: Date; action: string; details: string }[];
  recommendations: string[];
  mitreMapping: { tactic: string; technique: string }[];
  confidence: number;
  createdAt: Date;
}

interface SecurityAnalysisConsoleProps {
  events: SecurityEvent[];
  threatIntel: ThreatIntel[];
  onAnalyze: (eventId: string, analysisType: string) => Promise<AnalysisResult>;
  onExport: (resultId: string, format: 'pdf' | 'json' | 'stix') => void;
}

export const SecurityAnalysisConsole: React.FC<SecurityAnalysisConsoleProps> = ({
  events,
  threatIntel,
  onAnalyze,
  onExport,
}) => {
  const [selectedTab, setSelectedTab] = useState<'analysis' | 'threat-hunt' | 'reports' | 'intel'>('analysis');
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
  const [analysisType, setAnalysisType] = useState<string>('auto');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredResults = useMemo(() => {
    if (!searchQuery) return analysisResults;
    const query = searchQuery.toLowerCase();
    return analysisResults.filter(r => 
      r.title.toLowerCase().includes(query) ||
      r.summary.toLowerCase().includes(query) ||
      r.indicators.some(i => i.toLowerCase().includes(query))
    );
  }, [analysisResults, searchQuery]);

  const handleAnalyze = async () => {
    if (!selectedEvent) return;
    setIsAnalyzing(true);
    try {
      const result = await onAnalyze(selectedEvent.id, analysisType);
      setAnalysisResults(prev => [result, ...prev]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-500';
    if (confidence >= 0.6) return 'text-yellow-500';
    if (confidence >= 0.4) return 'text-orange-500';
    return 'text-red-500';
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'threat_hunt': return '🔍';
      case 'ioc_analysis': return '🎯';
      case 'log_analysis': return '📋';
      case 'malware_analysis': return '🦠';
      case 'forensics': return '🔬';
      default: return '📊';
    }
  };

  return (
    <div className="security-analysis-console h-full flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 px-6 py-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">安全分析控制台</h1>
          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="搜索分析结果..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm w-64"
            />
            <button
              onClick={() => setSelectedTab('analysis')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
            >
              + 新建分析
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-700 px-6">
        <div className="flex gap-6">
          {[
            { key: 'analysis', label: '事件分析' },
            { key: 'threat-hunt', label: '威胁狩猎' },
            { key: 'reports', label: '报告生成' },
            { key: 'intel', label: '情报关联' },
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
        {selectedTab === 'analysis' && (
          <div className="grid grid-cols-3 gap-6">
            {/* Event Selection */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4">选择事件</h3>
              <select
                value={selectedEvent?.id || ''}
                onChange={(e) => {
                  const event = events.find(ev => ev.id === e.target.value);
                  setSelectedEvent(event || null);
                }}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 mb-4"
              >
                <option value="">选择要分析的事件...</option>
                {events.map(event => (
                  <option key={event.id} value={event.id}>
                    [{event.severity}] {event.title}
                  </option>
                ))}
              </select>

              {selectedEvent && (
                <div className="space-y-3">
                  <div className="p-3 bg-gray-700/50 rounded">
                    <div className="text-sm text-gray-400">事件类型</div>
                    <div className="font-medium">{selectedEvent.type}</div>
                  </div>
                  <div className="p-3 bg-gray-700/50 rounded">
                    <div className="text-sm text-gray-400">描述</div>
                    <div className="text-sm">{selectedEvent.description}</div>
                  </div>
                  {selectedEvent.mitreTactics && (
                    <div className="p-3 bg-gray-700/50 rounded">
                      <div className="text-sm text-gray-400">MITRE ATT&CK</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedEvent.mitreTactics.map(tactic => (
                          <span key={tactic} className="px-2 py-1 bg-purple-600/50 rounded text-xs">
                            {tactic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4">
                <label className="text-sm text-gray-400 block mb-2">分析类型</label>
                <select
                  value={analysisType}
                  onChange={(e) => setAnalysisType(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                >
                  <option value="auto">自动分析</option>
                  <option value="threat_hunt">威胁狩猎</option>
                  <option value="ioc_analysis">IOC分析</option>
                  <option value="log_analysis">日志分析</option>
                  <option value="malware_analysis">恶意软件分析</option>
                  <option value="forensics">取证分析</option>
                </select>
              </div>

              <button
                onClick={handleAnalyze}
                disabled={!selectedEvent || isAnalyzing}
                className="w-full mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded transition-colors"
              >
                {isAnalyzing ? '分析中...' : '开始分析'}
              </button>
            </div>

            {/* Analysis Results */}
            <div className="col-span-2 space-y-4">
              <h3 className="text-lg font-semibold">分析结果 ({filteredResults.length})</h3>
              {filteredResults.map(result => (
                <div key={result.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{getTypeIcon(result.type)}</span>
                      <span className="font-medium">{result.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${getConfidenceColor(result.confidence)}`}>
                        {(result.confidence * 100).toFixed(0)}% 置信度
                      </span>
                      <span className="text-gray-400 text-sm">
                        {new Date(result.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <p className="text-gray-300 text-sm mb-3">{result.summary}</p>

                  {result.indicators.length > 0 && (
                    <div className="mb-3">
                      <div className="text-sm text-gray-400 mb-1">威胁指标:</div>
                      <div className="flex flex-wrap gap-1">
                        {result.indicators.slice(0, 5).map((ioc, idx) => (
                          <span key={idx} className="px-2 py-1 bg-red-600/30 rounded text-xs font-mono">
                            {ioc}
                          </span>
                        ))}
                        {result.indicators.length > 5 && (
                          <span className="px-2 py-1 bg-gray-600 rounded text-xs">
                            +{result.indicators.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {result.mitreMapping.length > 0 && (
                    <div className="mb-3">
                      <div className="text-sm text-gray-400 mb-1">MITRE ATT&CK 映射:</div>
                      <div className="flex flex-wrap gap-1">
                        {result.mitreMapping.map((m, idx) => (
                          <span key={idx} className="px-2 py-1 bg-purple-600/50 rounded text-xs">
                            {m.tactic}: {m.technique}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-gray-700">
                    <div className="flex gap-2">
                      <button
                        onClick={() => onExport(result.id, 'pdf')}
                        className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                      >
                        导出 PDF
                      </button>
                      <button
                        onClick={() => onExport(result.id, 'json')}
                        className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                      >
                        导出 JSON
                      </button>
                      <button
                        onClick={() => onExport(result.id, 'stix')}
                        className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                      >
                        导出 STIX
                      </button>
                    </div>
                    <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm">
                      查看详情
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedTab === 'threat-hunt' && (
          <div className="grid grid-cols-2 gap-6">
            {/* Hunt Hypothesis Builder */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4">威胁狩猎假设</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 block mb-2">假设描述</label>
                  <textarea
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 h-24"
                    placeholder="描述你想要验证的安全假设..."
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 block mb-2">数据源</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['EDR日志', '网络流量', 'AD日志', 'DNS查询', 'Proxy日志', '邮件网关'].map(source => (
                      <label key={source} className="flex items-center gap-2 p-2 bg-gray-700/50 rounded cursor-pointer">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm">{source}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-400 block mb-2">MITRE ATT&CK 战术</label>
                  <select className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2">
                    <option>Initial Access</option>
                    <option>Execution</option>
                    <option>Persistence</option>
                    <option>Privilege Escalation</option>
                    <option>Defense Evasion</option>
                    <option>Credential Access</option>
                    <option>Discovery</option>
                    <option>Lateral Movement</option>
                    <option>Collection</option>
                    <option>Command and Control</option>
                    <option>Exfiltration</option>
                    <option>Impact</option>
                  </select>
                </div>
                <button className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded">
                  开始狩猎
                </button>
              </div>
            </div>

            {/* Hunt Results */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4">狩猎结果</h3>
              <div className="space-y-3">
                <div className="p-3 bg-green-600/20 border border-green-600/50 rounded">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">凭证转储检测</span>
                    <span className="px-2 py-1 bg-green-600 rounded text-xs">3 hits</span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    在3台主机上检测到LSASS内存访问行为
                  </p>
                </div>
                <div className="p-3 bg-yellow-600/20 border border-yellow-600/50 rounded">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">横向移动检测</span>
                    <span className="px-2 py-1 bg-yellow-600 rounded text-xs">7 hits</span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    检测到异常的RDP连接模式
                  </p>
                </div>
                <div className="p-3 bg-gray-700/50 rounded">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">持久化机制检测</span>
                    <span className="px-2 py-1 bg-gray-600 rounded text-xs">0 hits</span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    未发现可疑的注册表启动项
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'reports' && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              {[
                { type: 'incident', title: '事件响应报告', icon: '🚨' },
                { type: 'threat', title: '威胁情报报告', icon: '📡' },
                { type: 'vuln', title: '漏洞扫描报告', icon: '🛡️' },
                { type: 'hunt', title: '威胁狩猎报告', icon: '🔍' },
                { type: 'forensics', title: '取证分析报告', icon: '🔬' },
                { type: 'executive', title: '高管汇报', icon: '📊' },
              ].map(report => (
                <button
                  key={report.type}
                  className="p-4 bg-gray-800 rounded-lg border border-gray-700 hover:border-blue-500 transition-colors text-left"
                >
                  <div className="text-3xl mb-2">{report.icon}</div>
                  <div className="font-medium">{report.title}</div>
                  <div className="text-sm text-gray-400 mt-1">点击生成报告</div>
                </button>
              ))}
            </div>

            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4">最近生成的报告</h3>
              <table className="w-full">
                <thead className="text-gray-400 text-sm">
                  <tr>
                    <th className="text-left p-2">报告名称</th>
                    <th className="text-left p-2">类型</th>
                    <th className="text-left p-2">生成时间</th>
                    <th className="text-left p-2">操作</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  <tr className="border-t border-gray-700">
                    <td className="p-2">2024年Q4安全态势报告</td>
                    <td className="p-2">高管汇报</td>
                    <td className="p-2 text-gray-400">2024-01-15 14:30</td>
                    <td className="p-2">
                      <button className="text-blue-400 hover:text-blue-300">下载</button>
                    </td>
                  </tr>
                  <tr className="border-t border-gray-700">
                    <td className="p-2">APT组织TTP分析</td>
                    <td className="p-2">威胁情报</td>
                    <td className="p-2 text-gray-400">2024-01-14 09:15</td>
                    <td className="p-2">
                      <button className="text-blue-400 hover:text-blue-300">下载</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedTab === 'intel' && (
          <div className="grid grid-cols-2 gap-6">
            {/* Threat Intel Feed */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4">威胁情报关联</h3>
              <div className="space-y-3">
                <div className="p-3 bg-gray-700/50 rounded">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-red-600 rounded text-xs">IP</span>
                    <span className="font-mono">192.168.1.100</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">声誉: Malicious</span>
                    <span className="text-red-400">95% 置信度</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="px-2 py-0.5 bg-gray-600 rounded text-xs">APT29</span>
                    <span className="px-2 py-0.5 bg-gray-600 rounded text-xs">Cobalt Strike</span>
                    <span className="px-2 py-0.5 bg-gray-600 rounded text-xs">C2</span>
                  </div>
                </div>

                {threatIntel.slice(0, 5).map(intel => (
                  <div key={intel.id} className="p-3 bg-gray-700/50 rounded">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        intel.type === 'ip' ? 'bg-red-600' :
                        intel.type === 'domain' ? 'bg-orange-600' :
                        intel.type === 'hash' ? 'bg-purple-600' : 'bg-blue-600'
                      }`}>
                        {intel.type.toUpperCase()}
                      </span>
                      <span className="font-mono text-sm">{intel.value}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className={`${
                        intel.reputation === 'malicious' ? 'text-red-400' :
                        intel.reputation === 'suspicious' ? 'text-yellow-400' : 'text-gray-400'
                      }`}>
                        {intel.reputation}
                      </span>
                      <span className="text-gray-400">{(intel.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Intel Sources */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4">情报源状态</h3>
              <div className="space-y-3">
                {[
                  { name: 'MISP', status: 'connected', lastSync: '5分钟前', indicators: '1.2M' },
                  { name: 'AlienVault OTX', status: 'connected', lastSync: '10分钟前', indicators: '850K' },
                  { name: 'VirusTotal', status: 'connected', lastSync: '15分钟前', indicators: '2.1M' },
                  { name: 'ThreatConnect', status: 'error', lastSync: '2小时前', indicators: '-' },
                  { name: 'TAXII Feed', status: 'connected', lastSync: '30分钟前', indicators: '500K' },
                ].map(source => (
                  <div key={source.name} className="p-3 bg-gray-700/50 rounded">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          source.status === 'connected' ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                        <span className="font-medium">{source.name}</span>
                      </div>
                      <span className="text-sm text-gray-400">{source.indicators} indicators</span>
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      最后同步: {source.lastSync}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecurityAnalysisConsole;
