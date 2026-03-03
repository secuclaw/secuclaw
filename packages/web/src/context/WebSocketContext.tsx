/**
 * WebSocket Context for real-time event streaming
 * Connects to Gateway WebSocket for live updates
 */
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';

// WebSocket frame types (matches gateway protocol)
interface GatewayFrame {
  type: 'req' | 'res' | 'evt' | 'err';
  id?: string;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: { code: string; message: string };
  event?: string;
  payload?: unknown;
}

// Event types from backend
interface SecurityRealtimeEvent {
  type: 'security_event' | 'threat_detected' | 'incident_update' | 'task_progress' | 'agent_status' | 'system_alert';
  timestamp: number;
  data: unknown;
}

interface ThreatDetectedEvent {
  type: 'threat_detected';
  timestamp: number;
  data: {
    id: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    title: string;
    source: string;
    mitreTechniques?: string[];
  };
}

interface IncidentUpdateEvent {
  type: 'incident_update';
  timestamp: number;
  data: {
    incidentId: string;
    status: 'new' | 'investigating' | 'contained' | 'resolved';
    assignee?: string;
    notes?: string;
  };
}

interface TaskProgressEvent {
  type: 'task_progress';
  timestamp: number;
  data: {
    taskId: string;
    progress: number;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
  };
}

interface AgentStatusEvent {
  type: 'agent_status';
  timestamp: number;
  data: {
    agentId: string;
    status: 'available' | 'busy' | 'offline';
    currentTasks: number;
  };
}

type RealtimeEvent = SecurityRealtimeEvent | ThreatDetectedEvent | IncidentUpdateEvent | TaskProgressEvent | AgentStatusEvent;

// Context types
interface WebSocketContextValue {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  events: RealtimeEvent[];
  lastEvent: RealtimeEvent | null;
  subscribe: (eventType: string, callback: (event: RealtimeEvent) => void) => () => void;
  send: (method: string, params?: unknown) => Promise<unknown>;
  reconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

interface WebSocketProviderProps {
  url?: string;
  children: React.ReactNode;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export function WebSocketProvider({
  url,
  children,
  autoReconnect = true,
  reconnectInterval = 5000,
  maxReconnectAttempts = 10,
}: WebSocketProviderProps) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const subscribersRef = useRef<Map<string, Set<(event: RealtimeEvent) => void>>>(new Map());
  const pendingRequestsRef = useRef<Map<string, { resolve: (value: unknown) => void; reject: (err: Error) => void }>>(new Map());
  const requestIdRef = useRef(0);

  // Default WebSocket URL
  const wsUrl = url || (() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = import.meta.env.VITE_WS_PORT || '3001';
    return `${protocol}//${host}:${port}`;
  })();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || connecting) {
      return;
    }

    setConnecting(true);
    setError(null);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setConnecting(false);
        setError(null);
        reconnectAttemptsRef.current = 0;

        // Send connect message
        const connectFrame: GatewayFrame = {
          type: 'req',
          id: `req-${++requestIdRef.current}`,
          method: 'connect',
          params: {
            client: { id: `web-client-${Date.now()}` },
          },
        };
        ws.send(JSON.stringify(connectFrame));
      };

      ws.onmessage = (event) => {
        try {
          const frame: GatewayFrame = JSON.parse(event.data);

          // Handle response
          if (frame.type === 'res' && frame.id) {
            const pending = pendingRequestsRef.current.get(frame.id);
            if (pending) {
              if (frame.error) {
                pending.reject(new Error(frame.error.message));
              } else {
                pending.resolve(frame.result);
              }
              pendingRequestsRef.current.delete(frame.id);
            }
            return;
          }

          // Handle event
          if (frame.type === 'evt' && frame.event) {
            const realtimeEvent: RealtimeEvent = {
              type: frame.event as RealtimeEvent['type'],
              timestamp: Date.now(),
              data: frame.payload,
            };

            setLastEvent(realtimeEvent);
            setEvents(prev => [...prev.slice(-99), realtimeEvent]); // Keep last 100 events

            // Notify subscribers
            const callbacks = subscribersRef.current.get(frame.event);
            if (callbacks) {
              callbacks.forEach(cb => cb(realtimeEvent));
            }
            // Also notify wildcard subscribers
            const wildcardCallbacks = subscribersRef.current.get('*');
            if (wildcardCallbacks) {
              wildcardCallbacks.forEach(cb => cb(realtimeEvent));
            }
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        setConnecting(false);
        wsRef.current = null;

        // Auto reconnect
        if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          setTimeout(connect, reconnectInterval);
        }
      };

      ws.onerror = (err) => {
        setError('WebSocket connection error');
        setConnecting(false);
        console.error('WebSocket error:', err);
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
      setConnecting(false);
    }
  }, [wsUrl, autoReconnect, reconnectInterval, maxReconnectAttempts, connecting]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    connect();
  }, [disconnect, connect]);

  const subscribe = useCallback((eventType: string, callback: (event: RealtimeEvent) => void) => {
    if (!subscribersRef.current.has(eventType)) {
      subscribersRef.current.set(eventType, new Set());
    }
    subscribersRef.current.get(eventType)!.add(callback);

    // Return unsubscribe function
    return () => {
      subscribersRef.current.get(eventType)?.delete(callback);
    };
  }, []);

  const send = useCallback(async (method: string, params?: unknown): Promise<unknown> => {
    return new Promise((resolve, reject) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const id = `req-${++requestIdRef.current}`;
      const frame: GatewayFrame = {
        type: 'req',
        id,
        method,
        params,
      };

      pendingRequestsRef.current.set(id, { resolve, reject });
      wsRef.current.send(JSON.stringify(frame));

      // Timeout after 30 seconds
      setTimeout(() => {
        if (pendingRequestsRef.current.has(id)) {
          pendingRequestsRef.current.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }, []);

  // Connect on mount
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  const value: WebSocketContextValue = {
    connected,
    connecting,
    error,
    events,
    lastEvent,
    subscribe,
    send,
    reconnect,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket(): WebSocketContextValue {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}

// Specialized hooks for specific event types
export function useThreatEvents(callback?: (event: ThreatDetectedEvent) => void): ThreatDetectedEvent[] {
  const { subscribe } = useWebSocket();
  const [threatEvents, setThreatEvents] = useState<ThreatDetectedEvent[]>([]);

  useEffect(() => {
    const unsubscribe = subscribe('threat_detected', (event) => {
      const threatEvent = event as ThreatDetectedEvent;
      setThreatEvents(prev => [threatEvent, ...prev].slice(0, 50));
      callback?.(threatEvent);
    });
    return unsubscribe;
  }, [subscribe, callback]);

  return threatEvents;
}

export function useIncidentUpdates(callback?: (event: IncidentUpdateEvent) => void): IncidentUpdateEvent[] {
  const { subscribe } = useWebSocket();
  const [incidentEvents, setIncidentEvents] = useState<IncidentUpdateEvent[]>([]);

  useEffect(() => {
    const unsubscribe = subscribe('incident_update', (event) => {
      const incidentEvent = event as IncidentUpdateEvent;
      setIncidentEvents(prev => [incidentEvent, ...prev].slice(0, 50));
      callback?.(incidentEvent);
    });
    return unsubscribe;
  }, [subscribe, callback]);

  return incidentEvents;
}

export function useTaskProgress(callback?: (event: TaskProgressEvent) => void): TaskProgressEvent[] {
  const { subscribe } = useWebSocket();
  const [taskEvents, setTaskEvents] = useState<TaskProgressEvent[]>([]);

  useEffect(() => {
    const unsubscribe = subscribe('task_progress', (event) => {
      const taskEvent = event as TaskProgressEvent;
      setTaskEvents(prev => [taskEvent, ...prev].slice(0, 50));
      callback?.(taskEvent);
    });
    return unsubscribe;
  }, [subscribe, callback]);

  return taskEvents;
}

export function useAgentStatus(callback?: (event: AgentStatusEvent) => void): AgentStatusEvent[] {
  const { subscribe } = useWebSocket();
  const [agentEvents, setAgentEvents] = useState<AgentStatusEvent[]>([]);

  useEffect(() => {
    const unsubscribe = subscribe('agent_status', (event) => {
      const agentEvent = event as AgentStatusEvent;
      setAgentEvents(prev => [agentEvent, ...prev].slice(0, 50));
      callback?.(agentEvent);
    });
    return unsubscribe;
  }, [subscribe, callback]);

  return agentEvents;
}

export default {
  WebSocketProvider,
  useWebSocket,
  useThreatEvents,
  useIncidentUpdates,
  useTaskProgress,
  useAgentStatus,
};
