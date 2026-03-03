import React from 'react';
import { SecurityAnalysisConsole } from './SecurityAnalysisConsole';
import { useSecurityData, useDefenseAnalysis } from '../../hooks/useSecurityData';
import { useWebSocket } from '../../context/WebSocketContext';
import type { SecurityEvent, ThreatIntel } from '../../types/dashboard';
import type { AnalysisResult } from './SecurityAnalysisConsole';

export const ConnectedSecurityAnalysisConsole: React.FC = () => {
  const { events: initialEvents, loading, error, refresh } = useSecurityData(true, 60000);
  const { connected } = useWebSocket();
  const { runDefense, history: defenseHistory } = useDefenseAnalysis();

  const [events, setEvents] = React.useState<SecurityEvent[]>([]);
  const [threatIntel, setThreatIntel] = React.useState<ThreatIntel[]>([]);

  React.useEffect(() => {
    setEvents(initialEvents);
  }, [initialEvents]);

  React.useEffect(() => {
    const intel: ThreatIntel[] = defenseHistory.flatMap((result, i) => 
      result.findings.map((f, j) => ({
        id: `intel-defense-${i}-${j}`,
        type: 'ip' as const,
        value: result.target,
        reputation: 'suspicious' as const,
        confidence: f.severity === 'critical' ? 0.9 : f.severity === 'high' ? 0.7 : 0.5,
        sources: ['Defense Analysis'],
        firstSeen: new Date(),
        lastSeen: new Date(),
        tags: [f.category, f.severity],
      }))
    );
    setThreatIntel(intel);
  }, [defenseHistory]);

  const handleAnalyze = React.useCallback(async (eventId: string, analysisType: string): Promise<AnalysisResult> => {
    const event = events.find(e => e.id === eventId);
    
    if (analysisType === 'ioc_analysis' && event) {
      const result = await runDefense(event.source, 'threat');
      if (result) {
        return {
          id: `analysis-${Date.now()}`,
          type: 'ioc_analysis',
          title: `IOC分析: ${event.title}`,
          summary: result.summary.riskScore >= 70 
            ? `高风险发现: ${result.findings.length}个漏洞` 
            : `中等风险: ${result.findings.length}个发现`,
          indicators: result.findings.slice(0, 10).map(f => f.title),
          timeline: result.findings.map(f => ({
            time: new Date(),
            action: '发现',
            details: f.description,
          })),
          recommendations: result.findings.map(f => f.recommendation),
          mitreMapping: event.mitreTactics?.map((tactic, i) => ({
            tactic,
            technique: event.mitreTechniques?.[i] || 'Unknown',
          })) || [],
          confidence: result.summary.riskScore / 100,
          createdAt: new Date(),
        };
      }
    }

    return {
      id: `analysis-${Date.now()}`,
      type: analysisType as AnalysisResult['type'],
      title: `${analysisType} 分析: ${event?.title || 'Unknown'}`,
      summary: '分析完成',
      indicators: [],
      timeline: [{ time: new Date(), action: '开始分析', details: '自动分析完成' }],
      recommendations: ['建议进行深入调查'],
      mitreMapping: event?.mitreTactics?.map((tactic, i) => ({
        tactic,
        technique: event.mitreTechniques?.[i] || 'Unknown',
      })) || [],
      confidence: 0.75,
      createdAt: new Date(),
    };
  }, [events, runDefense]);

  const handleExport = React.useCallback((resultId: string, format: 'pdf' | 'json' | 'stix') => {
  }, []);

  if (loading && events.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div>加载安全分析数据...</div>
        </div>
      </div>
    );
  }

  if (error && events.length === 0) {
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
      <SecurityAnalysisConsole
        events={events}
        threatIntel={threatIntel}
        onAnalyze={handleAnalyze}
        onExport={handleExport}
      />
    </div>
  );
};

export default ConnectedSecurityAnalysisConsole;
