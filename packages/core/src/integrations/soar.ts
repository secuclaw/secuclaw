import type {
  SOARConfig,
  SOARIncident,
  SOARPlaybook,
  PlaybookRun,
  IncidentArtifact,
  IntegrationHealth,
} from './types.js';

export interface SOARConnector {
  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
  getIncidents(filters?: Record<string, unknown>): Promise<SOARIncident[]>;
  getIncident(incidentId: string): Promise<SOARIncident | null>;
  createIncident(incident: Partial<SOARIncident>): Promise<SOARIncident>;
  updateIncident(incidentId: string, updates: Partial<SOARIncident>): Promise<boolean>;
  listPlaybooks(): Promise<SOARPlaybook[]>;
  runPlaybook(incidentId: string, playbookId: string): Promise<PlaybookRun>;
  addArtifact(incidentId: string, artifact: IncidentArtifact): Promise<boolean>;
  getHealth(): Promise<IntegrationHealth>;
}

export class CortexXSOARConnector implements SOARConnector {
  private config: SOARConfig;
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

  constructor(config: SOARConfig) {
    this.config = { ...config, timeout: config.timeout || 30000 };
  }

  async connect(): Promise<boolean> {
    try {
      const response = await this.makeRequest<{ i18n_version?: unknown }>('/incident', 'GET');
      if (response.i18n_version !== undefined) {
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

  async getIncidents(filters?: Record<string, unknown>): Promise<SOARIncident[]> {
    try {
      const query = filters?.query || '';
      const response = await this.makeRequest<{ data?: Record<string, unknown>[] }>('/incidents/search', 'POST', {
        filter: { query, ...filters },
      });

      return (response.data || []).map((incident: Record<string, unknown>) =>
        this.transformIncident(incident)
      );
    } catch {
      return [];
    }
  }

  async getIncident(incidentId: string): Promise<SOARIncident | null> {
    try {
      const response = await this.makeRequest(`/incident/${incidentId}`, 'GET');
      return this.transformIncident(response);
    } catch {
      return null;
    }
  }

  async createIncident(incident: Partial<SOARIncident>): Promise<SOARIncident> {
    const payload = {
      name: incident.title || 'New Incident',
      details: incident.description || '',
      severity: incident.severity || 'medium',
      type: 'Security Incident',
      labels: incident.artifacts?.map(a => ({ type: a.type, value: a.value })) || [],
    };

    const response = await this.makeRequest('/incident', 'POST', payload);
    return this.transformIncident(response);
  }

  async updateIncident(incidentId: string, updates: Partial<SOARIncident>): Promise<boolean> {
    try {
      await this.makeRequest(`/incident/${incidentId}`, 'PUT', {
        name: updates.title,
        details: updates.description,
        severity: updates.severity,
        status: updates.status,
        owner: updates.owner,
      });
      return true;
    } catch {
      return false;
    }
  }

  async listPlaybooks(): Promise<SOARPlaybook[]> {
    try {
      const response = await this.makeRequest<{ playbooks?: Record<string, unknown>[] }>('/playbook/search', 'POST', {
        query: '',
      });

      return (response.playbooks || []).map((pb: Record<string, unknown>) => ({
        id: String(pb.id),
        name: String(pb.name),
        description: String(pb.description || ''),
        triggers: (pb.triggers as string[]) || [],
        severity: ['low', 'medium', 'high', 'critical'],
        autoRun: Boolean(pb.auto),
      }));
    } catch {
      return [];
    }
  }

  async runPlaybook(incidentId: string, playbookId: string): Promise<PlaybookRun> {
    const response = await this.makeRequest<{ investigationId?: string; id?: string; playbookName?: string }>(`/incident/${incidentId}/playbook/${playbookId}`, 'POST', {});

    return {
      id: String(response.investigationId || response.id || Math.random().toString(36)),
      playbookId,
      playbookName: response.playbookName || 'Unknown Playbook',
      startTime: new Date(),
      status: 'running',
    };
  }











  async addArtifact(incidentId: string, artifact: IncidentArtifact): Promise<boolean> {
    try {
      await this.makeRequest(`/incident/${incidentId}/indicator`, 'POST', {
        indicator_type: artifact.type,
        indicator_value: artifact.value,
        reputation: artifact.reputation,
        source: artifact.source,
      });
      return true;
    } catch {
      return false;
    }
  }

  async getHealth(): Promise<IntegrationHealth> {
    if (this.connected) {
      const start = Date.now();
      try {
        await this.makeRequest('/incident', 'GET');
        this.health.latency = Date.now() - start;
        this.health.status = this.health.latency < 1000 ? 'healthy' : 'degraded';
      } catch {
        this.health.status = 'degraded';
      }
    }
    return this.health;
  }

  private async makeRequest<T = Record<string, unknown>>(path: string, method: string, body?: Record<string, unknown>): Promise<T> {
    const url = `${this.config.endpoint}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': this.config.apiKey,
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`SOAR request failed: ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  private transformIncident(raw: Record<string, unknown>): SOARIncident {
    const severityMap: Record<number, 'low' | 'medium' | 'high' | 'critical'> = {
      0.5: 'low',
      1: 'low',
      2: 'medium',
      3: 'high',
      4: 'critical',
    };

    const statusMap: Record<string, SOARIncident['status']> = {
      'New': 'new',
      'Active': 'investigating',
      'InProgress': 'investigating',
      'Done': 'closed',
      'Closed': 'closed',
    };

    return {
      id: String(raw.id || raw.caseId),
      title: String(raw.name || raw.title || 'Unknown Incident'),
      description: String(raw.details || raw.description || ''),
      severity: severityMap[raw.severity as number] || 'medium',
      status: statusMap[String(raw.status)] || 'new',
      owner: raw.owner ? String(raw.owner) : undefined,
      createdTime: new Date(String(raw.created || raw.Created || new Date())),
      dueTime: raw.dueDate ? new Date(String(raw.dueDate)) : undefined,
      playbookRuns: (raw.playbookRuns as Array<Record<string, unknown>> || []).map((run: Record<string, unknown>) => ({
        id: String(run.id),
        playbookId: String(run.playbookId),
        playbookName: String(run.playbookName || 'Unknown'),
        startTime: new Date(String(run.startDate || new Date())),
        endTime: run.endDate ? new Date(String(run.endDate)) : undefined,
        status: (run.status as PlaybookRun['status']) || 'completed',
        output: run.output as Record<string, unknown>,
      })),
      artifacts: (raw.labels as Array<Record<string, unknown>> || []).map((label: Record<string, unknown>) => ({
        id: String(label.id || Math.random().toString(36)),
        type: String(label.type) as IncidentArtifact['type'],
        value: String(label.value),
        reputation: label.reputation as IncidentArtifact['reputation'],
        source: String(label.source || 'xsoar'),
      })),
      relatedAlerts: (raw.relatedAlerts as string[]) || [],
    };
  }
}

export class DemistoConnector implements SOARConnector {
  private config: SOARConfig;
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

  constructor(config: SOARConfig) {
    this.config = { ...config, timeout: config.timeout || 30000 };
  }

  async connect(): Promise<boolean> {
    try {
      await this.makeRequest('/health', 'GET');
      this.connected = true;
      this.health.connected = true;
      this.health.status = 'healthy';
      this.health.lastSync = new Date();
      return true;
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

  async getIncidents(_filters?: Record<string, unknown>): Promise<SOARIncident[]> {
    try {
      const response = await this.makeRequest<{ incidents?: Record<string, unknown>[] }>('/incidents', 'GET');
      return (response.incidents || []).map((i: Record<string, unknown>) => this.transformIncident(i));
    } catch {
      return [];
    }
  }

  async getIncident(incidentId: string): Promise<SOARIncident | null> {
    try {
      const response = await this.makeRequest(`/incident/${incidentId}`, 'GET');
      return this.transformIncident(response);
    } catch {
      return null;
    }
  }

  async createIncident(incident: Partial<SOARIncident>): Promise<SOARIncident> {
    const response = await this.makeRequest('/incident', 'POST', {
      name: incident.title,
      details: incident.description,
      severity: incident.severity,
    });
    return this.transformIncident(response);
  }

  async updateIncident(incidentId: string, updates: Partial<SOARIncident>): Promise<boolean> {
    try {
      await this.makeRequest(`/incident/${incidentId}`, 'PUT', updates);
      return true;
    } catch {
      return false;
    }
  }

  async listPlaybooks(): Promise<SOARPlaybook[]> {
    try {
      const response = await this.makeRequest<{ playbooks?: Record<string, unknown>[] }>('/playbook', 'GET');
      return (response.playbooks || []).map((pb: Record<string, unknown>) => ({
        id: String(pb.id),
        name: String(pb.name),
        description: String(pb.description || ''),
        triggers: [],
        severity: ['low', 'medium', 'high', 'critical'],
        autoRun: false,
      }));
    } catch {
      return [];
    }
  }

  async runPlaybook(incidentId: string, playbookId: string): Promise<PlaybookRun> {
    const response = await this.makeRequest(`/incident/${incidentId}/playbook/${playbookId}/run`, 'POST', {});
    return {
      id: String(response.runId || Math.random().toString(36)),
      playbookId,
      playbookName: 'Playbook',
      startTime: new Date(),
      status: 'running',
    };
  }

  async addArtifact(incidentId: string, artifact: IncidentArtifact): Promise<boolean> {
    try {
      await this.makeRequest(`/incident/${incidentId}/artifact`, 'POST', {
        type: artifact.type,
        value: artifact.value,
      });
      return true;
    } catch {
      return false;
    }
  }

  async getHealth(): Promise<IntegrationHealth> {
    if (this.connected) {
      const start = Date.now();
      try {
        await this.makeRequest('/health', 'GET');
        this.health.latency = Date.now() - start;
        this.health.status = this.health.latency < 1000 ? 'healthy' : 'degraded';
      } catch {
        this.health.status = 'degraded';
      }
    }
    return this.health;
  }

  private async makeRequest<T = Record<string, unknown>>(path: string, method: string, body?: Record<string, unknown>): Promise<T> {
    const url = `${this.config.endpoint}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': this.config.apiKey,
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`Demisto request failed: ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  private transformIncident(raw: Record<string, unknown>): SOARIncident {
    return {
      id: String(raw.id),
      title: String(raw.name || 'Unknown'),
      description: String(raw.details || ''),
      severity: (raw.severity as SOARIncident['severity']) || 'medium',
      status: (raw.status as SOARIncident['status']) || 'new',
      owner: raw.owner ? String(raw.owner) : undefined,
      createdTime: new Date(String(raw.created || new Date())),
      dueTime: raw.dueDate ? new Date(String(raw.dueDate)) : undefined,
      playbookRuns: [],
      artifacts: [],
      relatedAlerts: [],
    };
  }
}

export function createSOARConnector(config: SOARConfig): SOARConnector {
  switch (config.type) {
    case 'cortex-xsoar':
      return new CortexXSOARConnector(config);
    case 'demisto':
      return new DemistoConnector(config);
    default:
      throw new Error(`Unsupported SOAR type: ${config.type}`);
  }
}
