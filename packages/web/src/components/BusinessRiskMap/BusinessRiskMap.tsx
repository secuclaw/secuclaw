import React, { useMemo, useState } from 'react';

export type BusinessRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface BusinessUnit {
  id: string;
  name: string;
  type: 'department' | 'product' | 'service' | 'region';
  parent?: string;
  revenue?: number;
  employees?: number;
  criticality: 'low' | 'medium' | 'high' | 'critical';
}

export interface BusinessRisk {
  id: string;
  title: string;
  description: string;
  category: 'operational' | 'financial' | 'reputational' | 'compliance' | 'strategic';
  level: BusinessRiskLevel;
  score: number;
  affectedUnits: string[];
  probability: number;
  impact: number;
  velocity: 'slow' | 'medium' | 'fast';
  owner?: string;
  mitigations: Mitigation[];
  trends: { date: Date; score: number }[];
}

export interface Mitigation {
  id: string;
  title: string;
  status: 'planned' | 'in-progress' | 'completed';
  effectiveness: number;
  cost: number;
  dueDate?: Date;
}

export interface RiskConduction {
  sourceId: string;
  targetId: string;
  strength: number;
  type: 'amplifies' | 'triggers' | 'depends';
}

export interface BusinessRiskMap {
  id: string;
  name: string;
  generatedAt: Date;
  businessUnits: BusinessUnit[];
  risks: BusinessRisk[];
  conductions: RiskConduction[];
  summary: {
    totalRisks: number;
    byLevel: Record<BusinessRiskLevel, number>;
    byCategory: Record<string, number>;
    avgScore: number;
    topRisks: BusinessRisk[];
    riskTrend: 'improving' | 'stable' | 'worsening';
  };
}

interface BusinessRiskMapProps {
  riskMap: BusinessRiskMap;
  onRiskClick?: (risk: BusinessRisk) => void;
  onUnitClick?: (unit: BusinessUnit) => void;
  showConductions?: boolean;
}

const RISK_COLORS: Record<BusinessRiskLevel, { bg: string; text: string; border: string }> = {
  low: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-500' },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-500' },
  high: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-500' },
  critical: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-500' },
};

const CATEGORY_ICONS: Record<string, string> = {
  operational: '⚙️',
  financial: '💰',
  reputational: '🏢',
  compliance: '📋',
  strategic: '🎯',
};

export function BusinessRiskMapComponent({
  riskMap,
  onRiskClick,
  onUnitClick,
  showConductions = true,
}: BusinessRiskMapProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<BusinessRiskLevel | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'tree' | 'matrix'>('grid');

  const filteredRisks = useMemo(() => {
    let risks = riskMap.risks;
    if (selectedCategory) {
      risks = risks.filter(r => r.category === selectedCategory);
    }
    if (selectedLevel) {
      risks = risks.filter(r => r.level === selectedLevel);
    }
    return risks.sort((a, b) => b.score - a.score);
  }, [riskMap.risks, selectedCategory, selectedLevel]);

  const unitRiskScores = useMemo(() => {
    const scores: Record<string, { score: number; count: number }> = {};
    
    for (const unit of riskMap.businessUnits) {
      const unitRisks = riskMap.risks.filter(r => r.affectedUnits.includes(unit.id));
      scores[unit.id] = {
        score: unitRisks.reduce((sum, r) => sum + r.score, 0) / Math.max(unitRisks.length, 1),
        count: unitRisks.length,
      };
    }
    
    return scores;
  }, [riskMap.businessUnits, riskMap.risks]);

  const matrixData = useMemo(() => {
    const categories = [...new Set(riskMap.risks.map(r => r.category))];
    const levels: BusinessRiskLevel[] = ['critical', 'high', 'medium', 'low'];
    
    return categories.map(cat => ({
      category: cat,
      levels: levels.map(level => ({
        level,
        risks: riskMap.risks.filter(r => r.category === cat && r.level === level),
      })),
    }));
  }, [riskMap.risks]);

  const getUnitColor = (unitId: string) => {
    const data = unitRiskScores[unitId];
    if (!data || data.count === 0) return 'bg-gray-100';
    if (data.score >= 75) return 'bg-red-200';
    if (data.score >= 50) return 'bg-orange-200';
    if (data.score >= 25) return 'bg-yellow-200';
    return 'bg-green-200';
  };

  return (
    <div className="bg-white rounded-xl shadow-lg">
      <div className="p-4 border-b bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-t-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">{riskMap.name}</h2>
            <p className="text-sm text-blue-100">
              Generated: {riskMap.generatedAt.toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded text-sm ${viewMode === 'grid' ? 'bg-white text-blue-700' : 'bg-blue-500'}`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('tree')}
              className={`px-3 py-1 rounded text-sm ${viewMode === 'tree' ? 'bg-white text-blue-700' : 'bg-blue-500'}`}
            >
              Tree
            </button>
            <button
              onClick={() => setViewMode('matrix')}
              className={`px-3 py-1 rounded text-sm ${viewMode === 'matrix' ? 'bg-white text-blue-700' : 'bg-blue-500'}`}
            >
              Matrix
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 border-b bg-gray-50">
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-white rounded-lg p-3 text-center shadow-sm">
            <div className="text-2xl font-bold text-gray-800">{riskMap.summary.totalRisks}</div>
            <div className="text-xs text-gray-500">Total Risks</div>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center shadow-sm">
            <div className="text-2xl font-bold text-red-600">{riskMap.summary.byLevel.critical}</div>
            <div className="text-xs text-gray-500">Critical</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-3 text-center shadow-sm">
            <div className="text-2xl font-bold text-orange-600">{riskMap.summary.byLevel.high}</div>
            <div className="text-xs text-gray-500">High</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3 text-center shadow-sm">
            <div className="text-2xl font-bold text-yellow-600">{riskMap.summary.byLevel.medium}</div>
            <div className="text-xs text-gray-500">Medium</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center shadow-sm">
            <div className="text-2xl font-bold text-green-600">{riskMap.summary.byLevel.low}</div>
            <div className="text-xs text-gray-500">Low</div>
          </div>
        </div>
      </div>

      <div className="p-4 border-b">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Category:</span>
            <select
              value={selectedCategory || ''}
              onChange={(e) => setSelectedCategory(e.target.value || null)}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="">All</option>
              <option value="operational">Operational</option>
              <option value="financial">Financial</option>
              <option value="reputational">Reputational</option>
              <option value="compliance">Compliance</option>
              <option value="strategic">Strategic</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Level:</span>
            <select
              value={selectedLevel || ''}
              onChange={(e) => setSelectedLevel((e.target.value || null) as BusinessRiskLevel | null)}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="">All</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className={`text-sm ${
              riskMap.summary.riskTrend === 'improving' ? 'text-green-600' :
              riskMap.summary.riskTrend === 'worsening' ? 'text-red-600' :
              'text-gray-500'
            }`}>
              {riskMap.summary.riskTrend === 'improving' ? '↓ Improving' :
               riskMap.summary.riskTrend === 'worsening' ? '↑ Worsening' :
               '→ Stable'}
            </span>
          </div>
        </div>
      </div>

      {viewMode === 'grid' && (
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRisks.slice(0, 12).map(risk => (
              <button
                key={risk.id}
                onClick={() => onRiskClick?.(risk)}
                className={`text-left p-4 rounded-lg border-2 ${RISK_COLORS[risk.level].bg} ${RISK_COLORS[risk.level].border} hover:shadow-md transition`}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-lg">{CATEGORY_ICONS[risk.category]}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${RISK_COLORS[risk.level].text} ${RISK_COLORS[risk.level].bg}`}>
                    {risk.level.toUpperCase()}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-800 mb-1 line-clamp-2">{risk.title}</h3>
                <p className="text-xs text-gray-600 mb-2 line-clamp-2">{risk.description}</p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>P: {Math.round(risk.probability * 100)}% | I: {Math.round(risk.impact * 100)}%</span>
                  <span className="font-bold">{risk.score.toFixed(0)}</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        risk.score >= 75 ? 'bg-red-500' :
                        risk.score >= 50 ? 'bg-orange-500' :
                        risk.score >= 25 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${risk.score}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400">
                    {risk.mitigations.filter(m => m.status === 'completed').length}/{risk.mitigations.length}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {viewMode === 'tree' && (
        <div className="p-4">
          <div className="mb-4">
            <h3 className="font-semibold text-gray-700 mb-2">Business Units</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {riskMap.businessUnits.map(unit => (
                <button
                  key={unit.id}
                  onClick={() => onUnitClick?.(unit)}
                  className={`p-3 rounded-lg text-left transition hover:shadow-md ${getUnitColor(unit.id)}`}
                >
                  <div className="font-medium text-sm">{unit.name}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    {unitRiskScores[unit.id]?.count || 0} risks
                    {unitRiskScores[unit.id]?.score && (
                      <span className="ml-1">• Score: {unitRiskScores[unit.id].score.toFixed(0)}</span>
                    )}
                  </div>
                  {unit.criticality === 'critical' && (
                    <span className="inline-block mt-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded">
                      Critical
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {showConductions && riskMap.conductions.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Risk Conductions</h3>
              <div className="space-y-1">
                {riskMap.conductions.slice(0, 10).map((cond, idx) => {
                  const sourceRisk = riskMap.risks.find(r => r.id === cond.sourceId);
                  const targetRisk = riskMap.risks.find(r => r.id === cond.targetId);
                  
                  if (!sourceRisk || !targetRisk) return null;
                  
                  return (
                    <div key={idx} className="flex items-center gap-2 text-sm bg-gray-50 p-2 rounded">
                      <span className="truncate max-w-32">{sourceRisk.title}</span>
                      <span className={`text-xs px-1 rounded ${
                        cond.type === 'amplifies' ? 'bg-red-100 text-red-700' :
                        cond.type === 'triggers' ? 'bg-orange-100 text-orange-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {cond.type} →
                      </span>
                      <span className="truncate max-w-32">{targetRisk.title}</span>
                      <span className="text-xs text-gray-400">
                        ({Math.round(cond.strength * 100)}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {viewMode === 'matrix' && (
        <div className="p-4 overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Category</th>
                {['Critical', 'High', 'Medium', 'Low'].map(level => (
                  <th key={level} className="px-4 py-2 text-center text-sm font-medium text-gray-500">
                    {level}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrixData.map(row => (
                <tr key={row.category} className="border-t">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span>{CATEGORY_ICONS[row.category]}</span>
                      <span className="font-medium capitalize">{row.category}</span>
                    </div>
                  </td>
                  {row.levels.map(cell => (
                    <td key={cell.level} className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {cell.risks.slice(0, 3).map(risk => (
                          <button
                            key={risk.id}
                            onClick={() => onRiskClick?.(risk)}
                            className={`px-2 py-1 rounded text-xs ${RISK_COLORS[cell.level].bg} ${RISK_COLORS[cell.level].text} hover:shadow`}
                          >
                            {risk.score.toFixed(0)}
                          </button>
                        ))}
                        {cell.risks.length > 3 && (
                          <span className="px-2 py-1 text-xs text-gray-500">
                            +{cell.risks.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="p-4 border-t bg-gray-50">
        <h3 className="font-semibold text-gray-700 mb-2">Top Risks by Score</h3>
        <div className="space-y-2">
          {riskMap.summary.topRisks.slice(0, 5).map(risk => (
            <button
              key={risk.id}
              onClick={() => onRiskClick?.(risk)}
              className="w-full flex items-center gap-3 p-2 rounded hover:bg-gray-100 transition text-left"
            >
              <span>{CATEGORY_ICONS[risk.category]}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{risk.title}</div>
                <div className="text-xs text-gray-500">
                  {risk.affectedUnits.length} units affected
                </div>
              </div>
              <div className={`px-2 py-0.5 rounded text-xs font-medium ${RISK_COLORS[risk.level].text}`}>
                {risk.score.toFixed(0)}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default BusinessRiskMapComponent;
