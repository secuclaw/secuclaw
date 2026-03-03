import React, { useState, useEffect } from 'react';
import type { DashboardMetrics, SecurityEvent, Task, AgentStatus } from '../../types/dashboard';

interface OperationConsoleProps {
  metrics: DashboardMetrics;
  events: SecurityEvent[];
  tasks: Task[];
  agents: AgentStatus[];
  onEventSelect: (event: SecurityEvent) => void;
  onTaskAssign: (taskId: string, agentId: string) => void;
}

export const OperationConsole: React.FC<OperationConsoleProps> = ({
  metrics,
  events,
  tasks,
  agents,
  onEventSelect,
  onTaskAssign,
}) => {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'events' | 'tasks' | 'agents'>('overview');
  const [refreshInterval, setRefreshInterval] = useState(30);

  useEffect(() => {
    const interval = setInterval(() => {
      // Auto-refresh data
    }, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#ca8a04';
      case 'low': return '#16a34a';
      default: return '#6b7280';
    }
  };

  const getSeverityBadge = (severity: string) => {
    const colors: Record<string, string> = {
      critical: 'bg-red-500 text-white',
      high: 'bg-orange-500 text-white',
      medium: 'bg-yellow-500 text-black',
      low: 'bg-green-500 text-white',
    };
    return colors[severity] || 'bg-gray-500 text-white';
  };

  return (
    <div className="operation-console h-full flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 px-6 py-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">运营指挥控制台</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">刷新间隔:</span>
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
              >
                <option value={10}>10秒</option>
                <option value={30}>30秒</option>
                <option value={60}>1分钟</option>
                <option value={300}>5分钟</option>
              </select>
            </div>
            <div
              className="px-4 py-2 rounded-lg font-bold"
              style={{ backgroundColor: getThreatLevelColor(metrics.threatLevel) }}
            >
              威胁等级: {metrics.threatLevel.toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-5 gap-4 p-4 bg-gray-800/50">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-gray-400 text-sm">总事件数</div>
          <div className="text-3xl font-bold text-white">{metrics.totalEvents}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-gray-400 text-sm">严重事件</div>
          <div className="text-3xl font-bold text-red-500">{metrics.criticalEvents}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-gray-400 text-sm">开放事件</div>
          <div className="text-3xl font-bold text-orange-500">{metrics.openIncidents}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-gray-400 text-sm">平均响应时间</div>
          <div className="text-3xl font-bold text-blue-500">{metrics.avgResponseTime}m</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-gray-400 text-sm">系统健康度</div>
          <div className="text-3xl font-bold text-green-500">{metrics.systemHealth}%</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-700 px-6">
        <div className="flex gap-6">
          {(['overview', 'events', 'tasks', 'agents'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`py-3 px-1 border-b-2 transition-colors ${
                selectedTab === tab
                  ? 'border-blue-500 text-blue-500'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              {tab === 'overview' && '总览'}
              {tab === 'events' && `安全事件 (${events.length})`}
              {tab === 'tasks' && `任务队列 (${tasks.length})`}
              {tab === 'agents' && `Agent状态 (${agents.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-6">
        {selectedTab === 'overview' && (
          <div className="grid grid-cols-2 gap-6">
            {/* Recent Events */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4">最近安全事件</h3>
              <div className="space-y-3">
                {events.slice(0, 5).map((event) => (
                  <div
                    key={event.id}
                    onClick={() => onEventSelect(event)}
                    className="p-3 bg-gray-700/50 rounded cursor-pointer hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-1 rounded text-xs ${getSeverityBadge(event.severity)}`}>
                        {event.severity}
                      </span>
                      <span className="text-gray-400 text-sm">
                        {new Date(event.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-2 font-medium">{event.title}</div>
                    <div className="text-gray-400 text-sm mt-1">{event.source}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Tasks */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4">活动任务</h3>
              <div className="space-y-3">
                {tasks.filter(t => t.status === 'in_progress').slice(0, 5).map((task) => (
                  <div key={task.id} className="p-3 bg-gray-700/50 rounded">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{task.title}</span>
                      <span className="text-blue-400 text-sm">{task.progress}%</span>
                    </div>
                    <div className="mt-2 h-2 bg-gray-600 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                    <div className="mt-2 text-gray-400 text-sm">
                      负责人: {task.assignedTo.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Agent Status Grid */}
            <div className="col-span-2 bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4">Agent状态概览</h3>
              <div className="grid grid-cols-4 gap-4">
                {agents.map((agent) => (
                  <div key={agent.id} className="p-3 bg-gray-700/50 rounded">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          agent.status === 'available' ? 'bg-green-500' :
                          agent.status === 'busy' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                      />
                      <span className="font-medium">{agent.name}</span>
                    </div>
                    <div className="mt-2 text-sm text-gray-400">
                      {agent.role} · {agent.currentTasks}/{agent.maxTasks} 任务
                    </div>
                    <div className="mt-1 text-sm text-gray-400">
                      成功率: {(agent.performance.successRate * 100).toFixed(0)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'events' && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="text-left p-3">严重程度</th>
                  <th className="text-left p-3">事件名称</th>
                  <th className="text-left p-3">来源</th>
                  <th className="text-left p-3">状态</th>
                  <th className="text-left p-3">时间</th>
                  <th className="text-left p-3">负责人</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr
                    key={event.id}
                    onClick={() => onEventSelect(event)}
                    className="border-t border-gray-700 hover:bg-gray-700/50 cursor-pointer"
                  >
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs ${getSeverityBadge(event.severity)}`}>
                        {event.severity}
                      </span>
                    </td>
                    <td className="p-3">{event.title}</td>
                    <td className="p-3 text-gray-400">{event.source}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        event.status === 'new' ? 'bg-blue-500' :
                        event.status === 'investigating' ? 'bg-yellow-500' :
                        event.status === 'contained' ? 'bg-purple-500' : 'bg-green-500'
                      }`}>
                        {event.status}
                      </span>
                    </td>
                    <td className="p-3 text-gray-400">
                      {new Date(event.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3 text-gray-400">{event.assignee || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedTab === 'tasks' && (
          <div className="space-y-4">
            {tasks.map((task) => (
              <div key={task.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <span className={`px-2 py-1 rounded text-xs mr-2 ${getSeverityBadge(task.priority)}`}>
                      {task.priority}
                    </span>
                    <span className="font-medium">{task.title}</span>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${
                    task.status === 'completed' ? 'bg-green-500' :
                    task.status === 'in_progress' ? 'bg-blue-500' :
                    task.status === 'failed' ? 'bg-red-500' : 'bg-gray-500'
                  }`}>
                    {task.status}
                  </span>
                </div>
                <p className="mt-2 text-gray-400 text-sm">{task.description}</p>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-400">
                      负责人: {task.assignedTo.join(', ') || '未分配'}
                    </span>
                    {task.deadline && (
                      <span className="text-sm text-gray-400">
                        截止: {new Date(task.deadline).toLocaleString()}
                      </span>
                    )}
                  </div>
                  {task.status !== 'completed' && (
                    <select
                      onChange={(e) => onTaskAssign(task.id, e.target.value)}
                      className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                      value=""
                    >
                      <option value="">分配给...</option>
                      {agents.filter(a => a.status !== 'offline').map((agent) => (
                        <option key={agent.id} value={agent.id}>{agent.name}</option>
                      ))}
                    </select>
                  )}
                </div>
                {task.status === 'in_progress' && (
                  <div className="mt-3">
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {selectedTab === 'agents' && (
          <div className="grid grid-cols-3 gap-6">
            {agents.map((agent) => (
              <div key={agent.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-4 h-4 rounded-full ${
                        agent.status === 'available' ? 'bg-green-500' :
                        agent.status === 'busy' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                    />
                    <div>
                      <div className="font-medium">{agent.name}</div>
                      <div className="text-sm text-gray-400">{agent.role}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{agent.currentTasks}/{agent.maxTasks}</div>
                    <div className="text-sm text-gray-400">当前任务</div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-lg font-semibold">{agent.performance.tasksCompleted}</div>
                    <div className="text-xs text-gray-400">已完成</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">
                      {(agent.performance.successRate * 100).toFixed(0)}%
                    </div>
                    <div className="text-xs text-gray-400">成功率</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{agent.performance.avgResponseTime}m</div>
                    <div className="text-xs text-gray-400">响应时间</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OperationConsole;
