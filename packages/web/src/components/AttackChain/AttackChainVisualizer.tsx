import React, { useMemo, useState } from 'react';

export type AttackPhase = 
  | 'reconnaissance'
  | 'resource-development'
  | 'initial-access'
  | 'execution'
  | 'persistence'
  | 'privilege-escalation'
  | 'defense-evasion'
  | 'credential-access'
  | 'discovery'
  | 'lateral-movement'
  | 'collection'
  | 'command-and-control'
  | 'exfiltration'
  | 'impact';

export type AttackStepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'blocked';

export interface AttackChainStep {
  id: string;
  techniqueId: string;
  techniqueName: string;
  phase: AttackPhase;
  status: AttackStepStatus;
  timestamp?: Date;
  detected: boolean;
  detectionTime?: number;
  target?: string;
  description?: string;
  indicators?: string[];
}

export interface AttackChainData {
  id: string;
  name: string;
  attacker?: string;
  startTime: Date;
  endTime?: Date;
  steps: AttackChainStep[];
  metadata?: {
    severity?: 'low' | 'medium' | 'high' | 'critical';
    source?: string;
    confidence?: number;
  };
}

interface AttackChainVisualizerProps {
  chain: AttackChainData;
  onStepClick?: (step: AttackChainStep) => void;
  showTimeline?: boolean;
  showDetection?: boolean;
  compact?: boolean;
}

const PHASE_ORDER: AttackPhase[] = [
  'reconnaissance',
  'resource-development',
  'initial-access',
  'execution',
  'persistence',
  'privilege-escalation',
  'defense-evasion',
  'credential-access',
  'discovery',
  'lateral-movement',
  'collection',
  'command-and-control',
  'exfiltration',
  'impact',
];

const PHASE_COLORS: Record<AttackPhase, { bg: string; border: string; text: string }> = {
  'reconnaissance': { bg: 'bg-blue-100', border: 'border-blue-500', text: 'text-blue-700' },
  'resource-development': { bg: 'bg-blue-200', border: 'border-blue-600', text: 'text-blue-800' },
  'initial-access': { bg: 'bg-yellow-100', border: 'border-yellow-500', text: 'text-yellow-700' },
  'execution': { bg: 'bg-orange-100', border: 'border-orange-500', text: 'text-orange-700' },
  'persistence': { bg: 'bg-purple-100', border: 'border-purple-500', text: 'text-purple-700' },
  'privilege-escalation': { bg: 'bg-red-100', border: 'border-red-400', text: 'text-red-600' },
  'defense-evasion': { bg: 'bg-red-200', border: 'border-red-500', text: 'text-red-700' },
  'credential-access': { bg: 'bg-red-300', border: 'border-red-600', text: 'text-red-800' },
  'discovery': { bg: 'bg-indigo-100', border: 'border-indigo-500', text: 'text-indigo-700' },
  'lateral-movement': { bg: 'bg-pink-100', border: 'border-pink-500', text: 'text-pink-700' },
  'collection': { bg: 'bg-teal-100', border: 'border-teal-500', text: 'text-teal-700' },
  'command-and-control': { bg: 'bg-rose-100', border: 'border-rose-500', text: 'text-rose-700' },
  'exfiltration': { bg: 'bg-red-400', border: 'border-red-700', text: 'text-red-900' },
  'impact': { bg: 'bg-red-500', border: 'border-red-800', text: 'text-white' },
};

const STATUS_ICONS: Record<AttackStepStatus, string> = {
  pending: '⏳',
  running: '🔄',
  completed: '✅',
  failed: '❌',
  blocked: '🛑',
};

const PHASE_LABELS: Record<AttackPhase, string> = {
  'reconnaissance': 'Reconnaissance',
  'resource-development': 'Resource Dev',
  'initial-access': 'Initial Access',
  'execution': 'Execution',
  'persistence': 'Persistence',
  'privilege-escalation': 'Priv Escalation',
  'defense-evasion': 'Defense Evasion',
  'credential-access': 'Cred Access',
  'discovery': 'Discovery',
  'lateral-movement': 'Lateral Movement',
  'collection': 'Collection',
  'command-and-control': 'C2',
  'exfiltration': 'Exfiltration',
  'impact': 'Impact',
};

export function AttackChainVisualizer({
  chain,
  onStepClick,
  showTimeline = true,
  showDetection = true,
  compact = false,
}: AttackChainVisualizerProps) {
  const [selectedStep, setSelectedStep] = useState<AttackChainStep | null>(null);
  const [hoveredPhase, setHoveredPhase] = useState<AttackPhase | null>(null);

  const stepsByPhase = useMemo(() => {
    const grouped: Partial<Record<AttackPhase, AttackChainStep[]>> = {};
    for (const phase of PHASE_ORDER) {
      grouped[phase] = chain.steps.filter(s => s.phase === phase);
    }
    return grouped;
  }, [chain.steps]);

  const stats = useMemo(() => {
    const total = chain.steps.length;
    const completed = chain.steps.filter(s => s.status === 'completed').length;
    const detected = chain.steps.filter(s => s.detected).length;
    const blocked = chain.steps.filter(s => s.status === 'blocked').length;
    
    const detectedWithTime = chain.steps.filter(s => s.detected && s.detectionTime);
    const avgDetectionTime = detectedWithTime.length > 0
      ? detectedWithTime.reduce((sum, s) => sum + (s.detectionTime || 0), 0) / detectedWithTime.length
      : 0;

    return { total, completed, detected, blocked, avgDetectionTime };
  }, [chain.steps]);

  const severityColor = useMemo(() => {
    switch (chain.metadata?.severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  }, [chain.metadata?.severity]);

  const handleStepClick = (step: AttackChainStep) => {
    setSelectedStep(step);
    onStepClick?.(step);
  };

  if (compact) {
    return (
      <div className="bg-gray-900 rounded-lg p-3 text-white text-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium truncate">{chain.name}</span>
          <span className={`${severityColor} px-2 py-0.5 rounded text-xs`}>
            {chain.metadata?.severity?.toUpperCase() || 'UNKNOWN'}
          </span>
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {PHASE_ORDER.map((phase, idx) => {
            const phaseSteps = stepsByPhase[phase] || [];
            const hasSteps = phaseSteps.length > 0;
            const anyDetected = phaseSteps.some(s => s.detected);
            
            return (
              <React.Fragment key={phase}>
                <div
                  className={`w-6 h-6 rounded flex items-center justify-center text-xs ${
                    hasSteps 
                      ? anyDetected 
                        ? 'bg-green-600' 
                        : 'bg-red-600'
                      : 'bg-gray-700'
                  }`}
                  title={`${PHASE_LABELS[phase]}: ${phaseSteps.length} steps`}
                >
                  {idx + 1}
                </div>
                {idx < PHASE_ORDER.length - 1 && (
                  <div className={`w-4 h-0.5 self-center ${
                    hasSteps && (stepsByPhase[PHASE_ORDER[idx + 1]]?.length || 0) > 0
                      ? 'bg-gray-500'
                      : 'bg-gray-700'
                  }`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-400">
          <span>{stats.completed}/{stats.total} steps</span>
          <span>{stats.detected} detected</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="bg-gray-800 text-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">{chain.name}</h3>
            <p className="text-sm text-gray-400">
              Attack Chain Analysis • {chain.steps.length} techniques detected
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-gray-400">Risk Level</div>
              <div className={`${severityColor} px-3 py-1 rounded text-sm font-medium`}>
                {chain.metadata?.severity?.toUpperCase() || 'UNKNOWN'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">Confidence</div>
              <div className="text-lg font-bold">
                {Math.round((chain.metadata?.confidence || 0) * 100)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 border-b bg-gray-50">
        <div className="flex gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500" />
            <span>Detected ({stats.detected})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500" />
            <span>Not Detected ({stats.completed - stats.detected})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-yellow-500" />
            <span>Blocked ({stats.blocked})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gray-300" />
            <span>Pending ({stats.total - stats.completed - stats.blocked})</span>
          </div>
        </div>
      </div>

      <div className="p-4 overflow-x-auto">
        <div className="flex gap-0 min-w-max">
          {PHASE_ORDER.map((phase, phaseIdx) => {
            const phaseSteps = stepsByPhase[phase] || [];
            const isHovered = hoveredPhase === phase;

            return (
              <React.Fragment key={phase}>
                <div
                  className={`flex flex-col items-center transition-all ${isHovered ? 'scale-105' : ''}`}
                  onMouseEnter={() => setHoveredPhase(phase)}
                  onMouseLeave={() => setHoveredPhase(null)}
                >
                  <div className={`text-xs font-medium mb-2 ${PHASE_COLORS[phase].text}`}>
                    {PHASE_LABELS[phase]}
                  </div>
                  
                  <div className={`w-16 ${PHASE_COLORS[phase].bg} border-t-2 ${PHASE_COLORS[phase].border} rounded-t-lg p-1 min-h-[60px] flex flex-col gap-1`}>
                    {phaseSteps.length === 0 ? (
                      <div className="h-10 flex items-center justify-center text-gray-400 text-xs">
                        -
                      </div>
                    ) : (
                      phaseSteps.slice(0, 3).map((step) => (
                        <button
                          key={step.id}
                          onClick={() => handleStepClick(step)}
                          className={`w-full text-xs px-1 py-0.5 rounded truncate cursor-pointer transition-all ${
                            selectedStep?.id === step.id
                              ? 'ring-2 ring-blue-500'
                              : ''
                          } ${
                            step.detected
                              ? 'bg-green-400 text-white'
                              : step.status === 'blocked'
                              ? 'bg-yellow-400 text-gray-800'
                              : step.status === 'completed'
                              ? 'bg-red-400 text-white'
                              : 'bg-gray-200 text-gray-600'
                          }`}
                          title={`${step.techniqueName} (${step.techniqueId})`}
                        >
                          {step.techniqueId}
                        </button>
                      ))
                    )}
                    {phaseSteps.length > 3 && (
                      <div className="text-xs text-center text-gray-500">
                        +{phaseSteps.length - 3} more
                      </div>
                    )}
                  </div>

                  <div className={`w-16 ${PHASE_COLORS[phase].bg} border-b-2 ${PHASE_COLORS[phase].border} rounded-b-lg p-1 text-center text-xs ${PHASE_COLORS[phase].text}`}>
                    {phaseSteps.length} steps
                  </div>
                </div>

                {phaseIdx < PHASE_ORDER.length - 1 && (
                  <div className="flex items-center px-1">
                    <div className={`w-8 h-1 rounded transition-colors ${
                      phaseSteps.length > 0 && (stepsByPhase[PHASE_ORDER[phaseIdx + 1]]?.length || 0) > 0
                        ? 'bg-gray-400'
                        : 'bg-gray-200'
                    }`} />
                    <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {showTimeline && (
        <div className="p-4 border-t bg-gray-50">
          <h4 className="font-medium mb-3">Attack Timeline</h4>
          <div className="relative">
            <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200" />
            <div className="space-y-2">
              {chain.steps.slice(0, 8).map((step, idx) => (
                <div key={step.id} className="flex items-start gap-4 ml-2">
                  <div className={`w-3 h-3 rounded-full mt-1.5 z-10 ${
                    step.detected ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{step.techniqueName}</span>
                      <span className="text-xs text-gray-500">{step.techniqueId}</span>
                      <span className="text-xs">{STATUS_ICONS[step.status]}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {step.timestamp?.toLocaleTimeString() || `Step ${idx + 1}`}
                      {step.detected && step.detectionTime && (
                        <span className="ml-2 text-green-600">
                          • Detected in {step.detectionTime}ms
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedStep && (
        <div className="p-4 border-t bg-gray-800 text-white">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold text-lg">{selectedStep.techniqueName}</h4>
              <p className="text-sm text-gray-400">
                {selectedStep.techniqueId} • {PHASE_LABELS[selectedStep.phase]}
              </p>
            </div>
            <button
              onClick={() => setSelectedStep(null)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
            <div className="bg-gray-700 rounded p-3">
              <div className="text-gray-400">Status</div>
              <div className="font-medium capitalize flex items-center gap-2">
                {STATUS_ICONS[selectedStep.status]} {selectedStep.status}
              </div>
            </div>
            <div className="bg-gray-700 rounded p-3">
              <div className="text-gray-400">Detection</div>
              <div className="font-medium">
                {selectedStep.detected ? (
                  <span className="text-green-400">
                    ✓ Detected {selectedStep.detectionTime ? `(${selectedStep.detectionTime}ms)` : ''}
                  </span>
                ) : (
                  <span className="text-red-400">✗ Not Detected</span>
                )}
              </div>
            </div>
            <div className="bg-gray-700 rounded p-3">
              <div className="text-gray-400">Target</div>
              <div className="font-medium">{selectedStep.target || 'N/A'}</div>
            </div>
          </div>

          {selectedStep.indicators && selectedStep.indicators.length > 0 && (
            <div className="mt-4">
              <div className="text-sm text-gray-400 mb-2">Indicators of Compromise</div>
              <div className="flex flex-wrap gap-2">
                {selectedStep.indicators.map((ioc, idx) => (
                  <span key={idx} className="bg-gray-700 px-2 py-1 rounded text-xs font-mono">
                    {ioc}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showDetection && (
        <div className="p-4 border-t">
          <h4 className="font-medium mb-3">Detection Metrics</h4>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.detected}</div>
              <div className="text-sm text-gray-500">Detected</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-red-600">{stats.completed - stats.detected}</div>
              <div className="text-sm text-gray-500">Missed</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.blocked}</div>
              <div className="text-sm text-gray-500">Blocked</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(stats.avgDetectionTime)}ms
              </div>
              <div className="text-sm text-gray-500">Avg Detection</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AttackChainVisualizer;
