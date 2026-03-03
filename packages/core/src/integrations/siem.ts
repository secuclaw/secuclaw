import type {
  SIEMConfig,
  SIEMEvent,
  SIEMAlert,
  SIEMQueryResult,
  IntegrationHealth,
} from './types.js';

export interface SIEMConnector {
  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
  query(query: string, params?: Record<string, unknown>): Promise<SIEMQueryResult>;
  getAlerts(since?: Date): Promise<SIEMAlert[]>;
  getAlert(alertId: string): Promise<SIEMAlert | null>;
  updateAlert(alertId: string, updates: Partial<SIEMAlert>): Promise<boolean>;
  searchEvents(criteria: {
    startTime: Date;
    endTime: Date;
    query?: string;
    limit?: number;
  }): Promise<SIEMEvent[]>;
  getHealth(): Promise<IntegrationHealth>;
  ingestEvent(event: SIEMEvent): Promise<boolean>;
}

export class SplunkConnector implements SIEMConnector {
  private config: SIEMConfig;
  private connected: boolean = false;
  private sessionKey: string | null = null;
  private health: IntegrationHealth = {
    connected: false,
    lastSync: null,
    latency: 0,
    errorRate: 0,
    eventsPerMinute: 0,
    alertsLast24h: 0,
    status: 'disconnected',
  };

  constructor(config: SIEMConfig) {
    this.config = { ...config, timeout: config.timeout || 30000, retryAttempts: config.retryAttempts || 3 };
  }

  async connect(): Promise<boolean> {
    try {
      const response = await this.makeRequest<{ sessionKey?: string }>('/services/auth/login', 'POST', {
        username: this.config.username,
        password: this.config.password,
      });

      if (response.sessionKey) {
        this.sessionKey = response.sessionKey;
        this.connected = true;
        this.health.connected = true;
        this.health.status = 'healthy';
        this.health.lastSync = new Date();
        return true;
      }
      return false;
    } catch {
      this.health.status = 'disconnected';
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.sessionKey) {
      try {
        await this.makeRequest('/services/auth/login', 'DELETE', {});
      } catch {
        // Ignore disconnect errors
      }
    }
    this.sessionKey = null;
    this.connected = false;
    this.health.connected = false;
    this.health.status = 'disconnected';
  }

  async query(searchQuery: string, _params?: Record<string, unknown>): Promise<SIEMQueryResult> {
    const startTime = Date.now();

    try {
      const response = await this.makeRequest<{ results?: Record<string, unknown>[]; resultCount?: number }>('/services/search/jobs', 'POST', {
        search: searchQuery,
        output_mode: 'json',
        exec_mode: 'oneshot',
      });

      const events: SIEMEvent[] = (response.results || []).map((result: Record<string, unknown>) =>
        this.transformEvent(result)
      );

      return {
        success: true,
        events,
        totalCount: response.resultCount || events.length,
        queryTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        events: [],
        totalCount: 0,
        queryTime: Date.now() - startTime,
        error: String(error),
      };
    }
  }

  async getAlerts(since?: Date): Promise<SIEMAlert[]> {
    try {
      const searchQuery = since
        ? `search index=_audit action=alert earliest=${Math.floor(since.getTime() / 1000)}`
        : 'search index=_audit action=alert earliest=-24h';

      const result = await this.query(searchQuery);
      
      return result.events.map(event => ({
        id: String(event.raw?.sid || event.id),
        ruleId: String(event.raw?.search_name || 'unknown'),
        ruleName: String(event.raw?.search_name || 'Unknown Alert'),
        severity: this.mapSeverity(event.raw?.severity as string),
        status: 'new',
        createdTime: event.timestamp,
        modifiedTime: event.timestamp,
        events: [event],
        notes: [],
      }));
    } catch {
      return [];
    }
  }

  async getAlert(_alertId: string): Promise<SIEMAlert | null> {
    return null;
  }

  async updateAlert(_alertId: string, _updates: Partial<SIEMAlert>): Promise<boolean> {
    return false;
  }

  async searchEvents(criteria: {
    startTime: Date;
    endTime: Date;
    query?: string;
    limit?: number;
  }): Promise<SIEMEvent[]> {
    const searchQuery = criteria.query || 'search *';
    const fullQuery = `${searchQuery} earliest=${Math.floor(criteria.startTime.getTime() / 1000)} latest=${Math.floor(criteria.endTime.getTime() / 1000)}${criteria.limit ? ` | head ${criteria.limit}` : ''}`;

    const result = await this.query(fullQuery);
    return result.events;
  }

  async getHealth(): Promise<IntegrationHealth> {
    if (this.connected) {
      const start = Date.now();
      try {
        await this.makeRequest('/services/server/info', 'GET');
        this.health.latency = Date.now() - start;
        this.health.status = this.health.latency < 1000 ? 'healthy' : 'degraded';
      } catch {
        this.health.status = 'degraded';
      }
    }
    return this.health;
  }

  async ingestEvent(event: SIEMEvent): Promise<boolean> {
    try {
      await this.makeRequest('/services/receivers/simple', 'POST', {
        source: event.source,
        sourcetype: event.sourceType,
        event: JSON.stringify({
          ...event.raw,
          message: event.message,
          severity: event.severity,
          timestamp: event.timestamp.toISOString(),
        }),
      });
      return true;
    } catch {
      return false;
    }
  }

  private async makeRequest<T = Record<string, unknown>>(path: string, method: string, body: Record<string, unknown> = {}): Promise<T> {
    const url = `${this.config.endpoint}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    if (this.sessionKey) {
      headers['Authorization'] = `Splunk ${this.sessionKey}`;
    } else if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: method !== 'GET' ? new URLSearchParams(body as Record<string, string>).toString() : undefined,
    });

    if (!response.ok) {
      throw new Error(`SIEM request failed: ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  private transformEvent(raw: Record<string, unknown>): SIEMEvent {
    return {
      id: String(raw._id || raw.id || Math.random().toString(36)),
      timestamp: new Date(String(raw._time || raw.timestamp || new Date())),
      source: String(raw.source || 'splunk'),
      sourceType: String(raw.sourcetype || raw.sourceType || 'unknown'),
      severity: this.mapSeverity(String(raw.severity || raw.level || 'medium')),
      message: String(raw._raw || raw.message || ''),
      raw,
      host: String(raw.host || ''),
      srcIp: String(raw.src_ip || raw.srcIp || ''),
      dstIp: String(raw.dest_ip || raw.dstIp || ''),
      user: String(raw.user || raw.src_user || ''),
      process: String(raw.process || raw.process_name || ''),
      mitreTechnique: String(raw.mitre_technique || raw.technique_id || ''),
      mitreTactic: String(raw.mitre_tactic || raw.tactic || ''),
    };
  }

  private mapSeverity(severity?: string): 'low' | 'medium' | 'high' | 'critical' {
    const sev = (severity || '').toLowerCase();
    if (sev === 'critical' || sev === 'fatal' || sev === 'emergency') return 'critical';
    if (sev === 'high' || sev === 'error') return 'high';
    if (sev === 'medium' || sev === 'warning' || sev === 'warn') return 'medium';
    return 'low';
  }
}

export class ElasticConnector implements SIEMConnector {
  private config: SIEMConfig;
  private connected: boolean = false;
  private health: IntegrationHealth = {
    connected: false,
    lastSync: null,
    latency: 0,
    errorRate: 0,
    eventsPerMinute: 0,
    alertsLast24h: 0,
    status: 'disconnected',
  };

  constructor(config: SIEMConfig) {
    this.config = { ...config, timeout: config.timeout || 30000, retryAttempts: config.retryAttempts || 3 };
  }

  async connect(): Promise<boolean> {
    try {
      const response = await this.makeRequest<{ status?: string }>('_cluster/health', 'GET');
      if (response.status === 'green' || response.status === 'yellow') {
        this.connected = true;
        this.health.connected = true;
        this.health.status = 'healthy';
        this.health.lastSync = new Date();
        return true;
      }
      return false;
    } catch {
      this.health.status = 'disconnected';
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.health.connected = false;
    this.health.status = 'disconnected';
  }

  async query(query: string, _params?: Record<string, unknown>): Promise<SIEMQueryResult> {
    const startTime = Date.now();

    try {
      const index = this.config.index || 'logstash-*';
      const response = await this.makeRequest<{ hits?: { hits?: Record<string, unknown>[]; total?: { value?: number } } }>(`${index}/_search`, 'POST', {
        query: {
          query_string: {
            query,
          },
        },
        size: 100,
      });

      const events: SIEMEvent[] = (response.hits?.hits || []).map((hit: Record<string, unknown>) =>
        this.transformEvent(hit)
      );

      return {
        success: true,
        events,
        totalCount: response.hits?.total?.value || events.length,
        queryTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        events: [],
        totalCount: 0,
        queryTime: Date.now() - startTime,
        error: String(error),
      };
    }
  }

  async getAlerts(since?: Date): Promise<SIEMAlert[]> {
    try {
      const query = since
        ? `@timestamp:[${since.toISOString()} TO *] AND _index:siem*`
        : '@timestamp:[now-24h TO *] AND _index:siem*';

      const result = await this.query(query);
      
      return result.events.map(event => ({
        id: event.id,
        ruleId: String((event.raw?.rule as Record<string, unknown> | undefined)?.uuid || 'unknown'),
        ruleName: String((event.raw?.rule as Record<string, unknown> | undefined)?.name || 'Unknown Alert'),
        severity: event.severity,
        status: 'new',
        createdTime: event.timestamp,
        modifiedTime: event.timestamp,
        events: [event],
        notes: [],
        mitreMapping: this.extractMitreMapping(event.raw),
      }));
    } catch {
      return [];
    }
  }

  async getAlert(_alertId: string): Promise<SIEMAlert | null> {
    return null;
  }

  async updateAlert(_alertId: string, _updates: Partial<SIEMAlert>): Promise<boolean> {
    return false;
  }

  async searchEvents(criteria: {
    startTime: Date;
    endTime: Date;
    query?: string;
    limit?: number;
  }): Promise<SIEMEvent[]> {
    const index = this.config.index || 'logstash-*';
    const query = criteria.query || '*';

    try {
      const response = await this.makeRequest<{ hits?: { hits?: Record<string, unknown>[] } }>(`${index}/_search`, 'POST', {
        query: {
          bool: {
            must: [
              { query_string: { query } },
              { range: { '@timestamp': { gte: criteria.startTime.toISOString(), lte: criteria.endTime.toISOString() } } },
            ],
          },
        },
        size: criteria.limit || 100,
      });

      return (response.hits?.hits || []).map((hit: Record<string, unknown>) =>
        this.transformEvent(hit)
      );
    } catch {
      return [];
    }
  }

  async getHealth(): Promise<IntegrationHealth> {
    if (this.connected) {
      const start = Date.now();
      try {
        await this.makeRequest('_cluster/health', 'GET');
        this.health.latency = Date.now() - start;
        this.health.status = this.health.latency < 1000 ? 'healthy' : 'degraded';
      } catch {
        this.health.status = 'degraded';
      }
    }
    return this.health;
  }

  async ingestEvent(event: SIEMEvent): Promise<boolean> {
    try {
      const index = this.config.index || 'secuclaw-events';
      await this.makeRequest(`${index}/_doc`, 'POST', {
        '@timestamp': event.timestamp.toISOString(),
        message: event.message,
        severity: event.severity,
        source: event.source,
        source_type: event.sourceType,
        host: event.host,
        src_ip: event.srcIp,
        dst_ip: event.dstIp,
        user: event.user,
        process: event.process,
        mitre_technique: event.mitreTechnique,
        mitre_tactic: event.mitreTactic,
        ...event.customFields,
        raw: event.raw,
      });
      return true;
    } catch {
      return false;
    }
  }

  private async makeRequest<T = Record<string, unknown>>(path: string, method: string, body?: Record<string, unknown>): Promise<T> {
    const url = `${this.config.endpoint}/${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `ApiKey ${this.config.apiKey}`;
    } else if (this.config.username && this.config.password) {
      const credentials = btoa(`${this.config.username}:${this.config.password}`);
      headers['Authorization'] = `Basic ${credentials}`;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`Elastic request failed: ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  private transformEvent(hit: Record<string, unknown>): SIEMEvent {
    const source = (hit._source as Record<string, unknown>) || {};
    const sourceHost = source.host as Record<string, unknown> | undefined;
    const sourceSource = source.source as Record<string, unknown> | undefined;
    const sourceDest = source.destination as Record<string, unknown> | undefined;
    const sourceUser = source.user as Record<string, unknown> | undefined;
    const sourceProcess = source.process as Record<string, unknown> | undefined;
    const sourceThreat = source.threat as Record<string, unknown> | undefined;
    
    return {
      id: String(hit._id || source.id || Math.random().toString(36)),
      timestamp: new Date(String(source['@timestamp'] || source.timestamp || new Date())),
      source: String(source.source || 'elasticsearch'),
      sourceType: String(source.source_type || source.sourcetype || 'unknown'),
      severity: this.mapSeverity(String(source.severity || source.level || 'medium')),
      message: String(source.message || ''),
      raw: source,
      host: String(sourceHost?.name || source.host || ''),
      srcIp: String(sourceSource?.ip || source.src_ip || ''),
      dstIp: String(sourceDest?.ip || source.dst_ip || ''),
      user: String(sourceUser?.name || source.user || ''),
      process: String(sourceProcess?.name || source.process || ''),
      mitreTechnique: String((sourceThreat?.technique as Record<string, unknown>)?.id || source.mitre_technique || ''),
      mitreTactic: String((sourceThreat?.tactic as Record<string, unknown>)?.name || source.mitre_tactic || ''),
    };
  }

  private extractMitreMapping(raw: Record<string, unknown> | undefined): { tactic: string; technique: string }[] | undefined {
    const threat = raw?.threat as Record<string, unknown> | undefined;
    if (!threat) return undefined;

    const tactics = (threat.tactic as Array<Record<string, unknown>> | undefined) || [];
    const techniques = (threat.technique as Array<Record<string, unknown>> | undefined) || [];

    return tactics.map((tactic, i) => ({
      tactic: String(tactic.name || ''),
      technique: techniques[i]?.id ? String(techniques[i].id) : '',
    }));
  }

  private mapSeverity(severity?: string): 'low' | 'medium' | 'high' | 'critical' {
    const sev = (severity || '').toLowerCase();
    if (sev === 'critical' || sev === 'fatal') return 'critical';
    if (sev === 'high' || sev === 'error') return 'high';
    if (sev === 'medium' || sev === 'warning' || sev === 'warn') return 'medium';
    return 'low';
  }
}

export function createSIEMConnector(config: SIEMConfig): SIEMConnector {
  switch (config.type) {
    case 'splunk':
      return new SplunkConnector(config);
    case 'elastic':
      return new ElasticConnector(config);
    default:
      throw new Error(`Unsupported SIEM type: ${config.type}`);
  }
}
