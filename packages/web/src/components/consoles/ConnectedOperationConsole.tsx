import React from 'react';
import { OperationConsole } from './OperationConsole';
import { useSecurityData } from '../../hooks/useSecurityData';
import { useWebSocket, useThreatEvents, useTaskProgress, useAgentStatus } from '../../context/WebSocketContext';
import type { SecurityEvent, Task, AgentStatus } from '../../types/dashboard';

export const ConnectedOperationConsole: React.FC = () => {
  const {
    metrics,
    events: initialEvents,
    tasks: initialTasks,
    agents: initialAgents,
    loading,
    error,
    refresh,
  } = useSecurityData(true, 30000);

  const { connected } = useWebSocket();
  const threatEvents = useThreatEvents();
  const taskProgress = useTaskProgress();
  const agentStatus = useAgentStatus();

  const [realtimeEvents, setRealtimeEvents] = React.useState<SecurityEvent[]>([]);
  const [realtimeTasks, setRealtimeTasks] = React.useState<Task[]>([]);
  const [realtimeAgents, setRealtimeAgents] = React.useState<AgentStatus[]>([]);

  React.useEffect(() => {
    setRealtimeEvents(initialEvents);
  }, [initialEvents]);

  React.useEffect(() => {
    setRealtimeTasks(initialTasks);
  }, [initialTasks]);

  React.useEffect(() => {
    setRealtimeAgents(initialAgents);
  }, [initialAgents]);

  React.useEffect(() => {
    if (threatEvents.length > 0) {
      const latestThreat = threatEvents[0];
      const newEvent: SecurityEvent = {
        id: latestThreat.data.id,
        type: 'threat',
        severity: latestThreat.data.severity,
        title: latestThreat.data.title,
        description: '',
        source: latestThreat.data.source,
        timestamp: new Date(latestThreat.timestamp),
        status: 'new',
        mitreTechniques: latestThreat.data.mitreTechniques,
      };
      setRealtimeEvents(prev => [newEvent, ...prev].slice(0, 100));
    }
  }, [threatEvents]);

  React.useEffect(() => {
    if (taskProgress.length > 0) {
      const latestProgress = taskProgress[0];
      setRealtimeTasks(prev =>
        prev.map(task =>
          task.id === latestProgress.data.taskId
            ? { ...task, progress: latestProgress.data.progress, status: latestProgress.data.status }
            : task
        )
      );
    }
  }, [taskProgress]);

  React.useEffect(() => {
    if (agentStatus.length > 0) {
      const latestStatus = agentStatus[0];
      setRealtimeAgents(prev =>
        prev.map(agent =>
          agent.id === latestStatus.data.agentId
            ? { ...agent, status: latestStatus.data.status, currentTasks: latestStatus.data.currentTasks }
            : agent
        )
      );
    }
  }, [agentStatus]);

  const handleEventSelect = React.useCallback((event: SecurityEvent) => {
  }, []);

  const handleTaskAssign = React.useCallback((taskId: string, agentId: string) => {
  }, []);

  if (loading && !metrics) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div>加载安全数据...</div>
        </div>
      </div>
    );
  }

  if (error && !metrics) {
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
      <OperationConsole
        metrics={metrics!}
        events={realtimeEvents}
        tasks={realtimeTasks}
        agents={realtimeAgents}
        onEventSelect={handleEventSelect}
        onTaskAssign={handleTaskAssign}
      />
    </div>
  );
};

export default ConnectedOperationConsole;
