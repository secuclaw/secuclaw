import React, { useMemo, useState, useEffect } from 'react';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface SecurityMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  change: number;
  threshold: { warning: number; critical: number };
  category: 'threats' | 'vulnerabilities' | 'compliance' | 'operations';
}

export interface ThreatAlert {
  id: string;
  severity: RiskLevel;
  title: string;
  description: string;
  source: string;
  timestamp: Date;
  status: 'new' | 'investigating' | 'resolved' | 'false-positive';
  mitreTechnique?: string;
  affectedAssets: string[];
}

export interface AssetRisk {
  id: string;
  name: string;
  type: 'server' | 'workstation' | 'network' | 'application' | 'cloud' | 'container';
  riskScore: number;
  riskLevel: RiskLevel;
  vulnerabilities: number;
  threats: number;
  lastScanned: Date;
  criticality: 'low' | 'medium' | 'high' | 'critical';
}

export interface ComplianceStatus {
  framework: string;
  score: number;
  status: 'compliant' | 'partial' | 'non-compliant';
  lastAssessment: Date;
  criticalGaps: number;
}

export interface SecurityPosture {
  overallScore: number;
  riskLevel: RiskLevel;
  lastUpdated: Date;
  metrics: SecurityMetric[];
  topThreats: ThreatAlert[];
  assetRisks: AssetRisk[];
  compliance: ComplianceStatus[];
  trend: {
    date: Date;
    score: number;
  }[];
}

interface PanoramicDashboardProps {
  posture: SecurityPosture;
  onAlertClick?: (alert: ThreatAlert) => void;
  onAssetClick?: (asset: AssetRisk) => void;
  refreshInterval?: number;
  onRefresh?: () => void;
}

const RISK_COLORS: Record<RiskLevel, { bg: string; text: string; border: string }> = {
  low: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-500' },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-500' },
  high: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-500' },
  critical: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-500' },
};

const TREND_ICONS = {
  up: '↑',
  down: '↓',
  stable: '→',
};

const ASSET_ICONS: Record<AssetRisk['type'], string> = {
  server: '🖥️',
  workstation: '💻',
  network: '🌐',
  application: '📱',
  cloud: '☁️',
  container: '📦',
};

export function PanoramicDashboard({
  posture,
  onAlertClick,
  onAssetClick,
  refreshInterval = 30000,
  onRefresh,
}: PanoramicDashboardProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
    if (refreshInterval > 0 && onRefresh) {
      const interval = setInterval(() => {
        onRefresh();
        setLastRefresh(new Date());
      }, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, onRefresh]);

  const summaryStats = useMemo(() => {
    const criticalAlerts = posture.topThreats.filter(t => t.severity === 'critical' && t.status === 'new').length;
    const highAlerts = posture.topThreats.filter(t => t.severity === 'high' && t.status === 'new').length;
    const criticalAssets = posture.assetRisks.filter(a => a.riskLevel === 'critical').length;
    const avgCompliance = posture.compliance.reduce((sum, c) => sum + c.score, 0) / Math.max(posture.compliance.length, 1);

    return { criticalAlerts, highAlerts, criticalAssets, avgCompliance };
  }, [posture]);

  const filteredMetrics = useMemo(() => {
    if (!selectedCategory) return posture.metrics;
    return posture.metrics.filter(m => m.category === selectedCategory);
  }, [posture.metrics, selectedCategory]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreGradient = (score: number) => {
    if (score >= 80) return 'from-green-400 to-green-600';
    if (score >= 60) return 'from-yellow-400 to-yellow-600';
    if (score >= 40) return 'from-orange-400 to-orange-600';
    return 'from-red-400 to-red-600';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${getScoreGradient(posture.overallScore)} flex items-center justify-center`}>
                <span className="text-2xl font-bold text-white">
                  {Math.round(posture.overallScore)}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Security Posture</h1>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${RISK_COLORS[posture.riskLevel].bg} ${RISK_COLORS[posture.riskLevel].text}`}>
                    {posture.riskLevel.toUpperCase()} RISK
                  </span>
                  <span>•</span>
                  <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => onRefresh?.()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Critical Alerts</p>
                <p className="text-3xl font-bold text-red-600">{summaryStats.criticalAlerts}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">🚨</span>
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-500">
              +{summaryStats.highAlerts} high priority
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Critical Assets</p>
                <p className="text-3xl font-bold text-orange-600">{summaryStats.criticalAssets}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">⚠️</span>
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-500">
              {posture.assetRisks.length} total assets
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Compliance Score</p>
                <p className={`text-3xl font-bold ${getScoreColor(summaryStats.avgCompliance)}`}>
                  {Math.round(summaryStats.avgCompliance)}%
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">📋</span>
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-500">
              {posture.compliance.length} frameworks
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Vulnerabilities</p>
                <p className="text-3xl font-bold text-purple-600">
                  {posture.assetRisks.reduce((sum, a) => sum + a.vulnerabilities, 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">🔍</span>
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-500">
              Across all assets
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Active Threats</h2>
                  <span className="text-sm text-gray-500">
                    {posture.topThreats.filter(t => t.status === 'new').length} new
                  </span>
                </div>
              </div>
              <div className="divide-y max-h-80 overflow-y-auto">
                {posture.topThreats.slice(0, 10).map(alert => (
                  <button
                    key={alert.id}
                    onClick={() => onAlertClick?.(alert)}
                    className="w-full p-4 hover:bg-gray-50 text-left transition"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${RISK_COLORS[alert.severity].bg} ${RISK_COLORS[alert.severity].text}`}>
                            {alert.severity.toUpperCase()}
                          </span>
                          <span className="font-medium truncate">{alert.title}</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1 truncate">{alert.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                          <span>{alert.source}</span>
                          {alert.mitreTechnique && (
                            <span className="bg-gray-100 px-1 rounded">{alert.mitreTechnique}</span>
                          )}
                          <span>{alert.timestamp.toLocaleTimeString()}</span>
                        </div>
                      </div>
                      <span className={`ml-4 text-xs ${
                        alert.status === 'new' ? 'text-red-500' :
                        alert.status === 'investigating' ? 'text-yellow-500' :
                        'text-green-500'
                      }`}>
                        {alert.status}
                      </span>
                    </div>
                  </button>
                ))}
                {posture.topThreats.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    No active threats detected
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold">Asset Risk Overview</h2>
              </div>
              <div className="divide-y max-h-60 overflow-y-auto">
                {posture.assetRisks.slice(0, 8).map(asset => (
                  <button
                    key={asset.id}
                    onClick={() => onAssetClick?.(asset)}
                    className="w-full p-4 hover:bg-gray-50 text-left transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{ASSET_ICONS[asset.type]}</span>
                        <div>
                          <p className="font-medium">{asset.name}</p>
                          <p className="text-xs text-gray-500">
                            {asset.vulnerabilities} vulns • {asset.threats} threats
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className={`font-bold ${getScoreColor(100 - asset.riskScore)}`}>
                            {Math.round(asset.riskScore)}
                          </p>
                          <p className={`text-xs ${RISK_COLORS[asset.riskLevel].text}`}>
                            {asset.riskLevel}
                          </p>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold">Compliance Status</h2>
              </div>
              <div className="p-4 space-y-4">
                {posture.compliance.map(comp => (
                  <div key={comp.framework}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{comp.framework}</span>
                      <span className={`text-sm ${
                        comp.status === 'compliant' ? 'text-green-600' :
                        comp.status === 'partial' ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {Math.round(comp.score)}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          comp.status === 'compliant' ? 'bg-green-500' :
                          comp.status === 'partial' ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${comp.score}%` }}
                      />
                    </div>
                    {comp.criticalGaps > 0 && (
                      <p className="text-xs text-red-500 mt-1">
                        {comp.criticalGaps} critical gaps
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold">Key Metrics</h2>
              </div>
              <div className="p-4 space-y-3">
                {posture.metrics.slice(0, 6).map(metric => (
                  <div key={metric.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${
                        metric.trend === 'up' ? 'text-red-500' :
                        metric.trend === 'down' ? 'text-green-500' :
                        'text-gray-500'
                      }`}>
                        {TREND_ICONS[metric.trend]}
                      </span>
                      <span className="text-sm text-gray-700">{metric.name}</span>
                    </div>
                    <div className="text-right">
                      <span className={`font-medium ${
                        metric.value >= metric.threshold.critical ? 'text-red-600' :
                        metric.value >= metric.threshold.warning ? 'text-yellow-600' :
                        'text-gray-900'
                      }`}>
                        {metric.value}{metric.unit}
                      </span>
                      <span className={`ml-1 text-xs ${
                        metric.change > 0 ? 'text-red-500' :
                        metric.change < 0 ? 'text-green-500' :
                        'text-gray-400'
                      }`}>
                        {metric.change > 0 ? '+' : ''}{metric.change}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PanoramicDashboard;
