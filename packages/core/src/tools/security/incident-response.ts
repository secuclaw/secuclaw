import { Type } from '@sinclair/typebox';
import type { SecurityTool, SecurityToolResult } from './types';
import { createSuccessResult, createErrorResult } from './types';

const createIncidentParams = Type.Object({
  title: Type.String({ description: 'Incident title' }),
  severity: Type.Union([
    Type.Literal('low'),
    Type.Literal('medium'),
    Type.Literal('high'),
    Type.Literal('critical'),
  ]),
  description: Type.String({ description: 'Incident description' }),
  affectedAssets: Type.Optional(Type.Array(Type.String())),
  assignedTo: Type.Optional(Type.String()),
});

export const createIncidentTool: SecurityTool = {
  name: 'incident_create',
  label: 'Create Incident',
  description: 'Create a new security incident',
  parameters: createIncidentParams,
  category: 'incident_response',
  riskLevel: 'low',
  async execute(toolCallId, params): Promise<SecurityToolResult> {
    const incidentId = `INC-${Date.now()}`;
    
    return createSuccessResult(
      `Incident ${incidentId} created successfully`,
      {
        incidentId,
        title: params.title,
        severity: params.severity,
        status: 'open',
        createdAt: new Date().toISOString(),
        affectedAssets: params.affectedAssets || [],
        assignedTo: params.assignedTo || 'unassigned',
      },
      { riskLevel: params.severity }
    );
  },
};

const updateIncidentParams = Type.Object({
  incidentId: Type.String({ description: 'Incident ID to update' }),
  status: Type.Optional(Type.Union([
    Type.Literal('open'),
    Type.Literal('in_progress'),
    Type.Literal('contained'),
    Type.Literal('resolved'),
    Type.Literal('closed'),
  ])),
  notes: Type.Optional(Type.String()),
  assignedTo: Type.Optional(Type.String()),
});

export const updateIncidentTool: SecurityTool = {
  name: 'incident_update',
  label: 'Update Incident',
  description: 'Update incident status and details',
  parameters: updateIncidentParams,
  category: 'incident_response',
  riskLevel: 'low',
  async execute(toolCallId, params): Promise<SecurityToolResult> {
    return createSuccessResult(
      `Incident ${params.incidentId} updated`,
      {
        incidentId: params.incidentId,
        status: params.status,
        notes: params.notes,
        assignedTo: params.assignedTo,
        updatedAt: new Date().toISOString(),
      },
      { riskLevel: 'low' }
    );
  },
};

const isolateHostParams = Type.Object({
  host: Type.String({ description: 'Host to isolate' }),
  reason: Type.String({ description: 'Reason for isolation' }),
  duration: Type.Optional(Type.Number({ description: 'Isolation duration in minutes' })),
  allowDns: Type.Optional(Type.Boolean({ default: false })),
});

export const isolateHostTool: SecurityTool = {
  name: 'host_isolation',
  label: 'Host Isolation',
  description: 'Isolate a host from the network',
  parameters: isolateHostParams,
  category: 'incident_response',
  riskLevel: 'high',
  requiresConfirmation: true,
  timeout: 60000,
  mitreMapping: { tactics: ['Response'], techniques: [] },
  async execute(toolCallId, params): Promise<SecurityToolResult> {
    return createSuccessResult(
      `Host ${params.host} isolated successfully`,
      {
        host: params.host,
        isolationId: `ISO-${Date.now()}`,
        reason: params.reason,
        isolatedAt: new Date().toISOString(),
        duration: params.duration,
        allowDns: params.allowDns || false,
        status: 'isolated',
      },
      { riskLevel: 'high' }
    );
  },
};

const disableAccountParams = Type.Object({
  accountId: Type.String({ description: 'Account ID to disable' }),
  reason: Type.String({ description: 'Reason for disabling' }),
  revokeSessions: Type.Optional(Type.Boolean({ default: true })),
  notifyUser: Type.Optional(Type.Boolean({ default: false })),
});

export const disableAccountTool: SecurityTool = {
  name: 'account_disable',
  label: 'Disable Account',
  description: 'Disable a user account',
  parameters: disableAccountParams,
  category: 'incident_response',
  riskLevel: 'high',
  requiresConfirmation: true,
  async execute(toolCallId, params): Promise<SecurityToolResult> {
    return createSuccessResult(
      `Account ${params.accountId} disabled successfully`,
      {
        accountId: params.accountId,
        reason: params.reason,
        disabledAt: new Date().toISOString(),
        sessionsRevoked: params.revokeSessions !== false,
        userNotified: params.notifyUser || false,
      },
      { riskLevel: 'high' }
    );
  },
};

const blockIndicatorParams = Type.Object({
  indicator: Type.String({ description: 'IP, domain, or URL to block' }),
  indicatorType: Type.Union([
    Type.Literal('ip'),
    Type.Literal('domain'),
    Type.Literal('url'),
  ]),
  duration: Type.Optional(Type.String({ default: 'permanent' })),
  reason: Type.String({ description: 'Reason for blocking' }),
});

export const blockIndicatorTool: SecurityTool = {
  name: 'block_indicator',
  label: 'Block Indicator',
  description: 'Block an IP, domain, or URL',
  parameters: blockIndicatorParams,
  category: 'incident_response',
  riskLevel: 'medium',
  requiresConfirmation: true,
  async execute(toolCallId, params): Promise<SecurityToolResult> {
    return createSuccessResult(
      `${params.indicatorType.toUpperCase()} ${params.indicator} blocked successfully`,
      {
        indicator: params.indicator,
        indicatorType: params.indicatorType,
        blockId: `BLK-${Date.now()}`,
        reason: params.reason,
        blockedAt: new Date().toISOString(),
        duration: params.duration,
        appliedTo: ['firewall', 'proxy', 'dns-filter'],
      },
      { riskLevel: 'medium' }
    );
  },
};

const quarantineFileParams = Type.Object({
  filePath: Type.String({ description: 'File path to quarantine' }),
  host: Type.String({ description: 'Host where file is located' }),
  preserveEvidence: Type.Optional(Type.Boolean({ default: true })),
  reason: Type.String({ description: 'Reason for quarantine' }),
});

export const quarantineFileTool: SecurityTool = {
  name: 'file_quarantine',
  label: 'Quarantine File',
  description: 'Quarantine a suspicious file',
  parameters: quarantineFileParams,
  category: 'incident_response',
  riskLevel: 'medium',
  async execute(toolCallId, params): Promise<SecurityToolResult> {
    return createSuccessResult(
      `File ${params.filePath} quarantined on ${params.host}`,
      {
        filePath: params.filePath,
        host: params.host,
        quarantineId: `QAR-${Date.now()}`,
        quarantinedAt: new Date().toISOString(),
        preserveEvidence: params.preserveEvidence !== false,
        originalHash: 'sha256:abc123...',
        quarantineLocation: '/var/quarantine/',
      },
      { riskLevel: 'medium' }
    );
  },
};

const collectEvidenceParams = Type.Object({
  incidentId: Type.String({ description: 'Associated incident ID' }),
  target: Type.String({ description: 'Target host or system' }),
  evidenceType: Type.Array(Type.Union([
    Type.Literal('memory'),
    Type.Literal('disk'),
    Type.Literal('network'),
    Type.Literal('logs'),
    Type.Literal('processes'),
  ])),
  preserveChain: Type.Optional(Type.Boolean({ default: true })),
});

export const collectEvidenceTool: SecurityTool = {
  name: 'evidence_collection',
  label: 'Collect Evidence',
  description: 'Collect forensic evidence from a system',
  parameters: collectEvidenceParams,
  category: 'incident_response',
  riskLevel: 'low',
  timeout: 600000,
  async execute(toolCallId, params): Promise<SecurityToolResult> {
    const evidenceItems = params.evidenceType.map((type: string) => ({
      type,
      status: 'collected',
      size: `${Math.floor(Math.random() * 500) + 10}MB`,
      hash: `sha256:${Math.random().toString(36).substring(7)}`,
    }));
    return createSuccessResult(
      `Evidence collected from ${params.target} for incident ${params.incidentId}`,
      {
        incidentId: params.incidentId,
        target: params.target,
        collectionId: `EVD-${Date.now()}`,
        collectedAt: new Date().toISOString(),
        evidenceItems,
        chainOfCustody: params.preserveChain !== false,
      },
      { riskLevel: 'low' }
    );
  },
};

const createPlaybookParams = Type.Object({
  name: Type.String({ description: 'Playbook name' }),
  description: Type.String({ description: 'Playbook description' }),
  incidentType: Type.String({ description: 'Type of incident this playbook addresses' }),
  steps: Type.Array(Type.Object({
    order: Type.Number(),
    action: Type.String(),
    automated: Type.Optional(Type.Boolean()),
  })),
});

export const createPlaybookTool: SecurityTool = {
  name: 'playbook_create',
  label: 'Create Playbook',
  description: 'Create an incident response playbook',
  parameters: createPlaybookParams,
  category: 'incident_response',
  riskLevel: 'low',
  async execute(toolCallId, params): Promise<SecurityToolResult> {
    return createSuccessResult(
      `Playbook "${params.name}" created successfully`,
      {
        playbookId: `PB-${Date.now()}`,
        name: params.name,
        description: params.description,
        incidentType: params.incidentType,
        steps: params.steps,
        createdAt: new Date().toISOString(),
        version: '1.0',
      },
      { riskLevel: 'low' }
    );
  },
};

const runPlaybookParams = Type.Object({
  playbookId: Type.String({ description: 'Playbook ID to execute' }),
  incidentId: Type.String({ description: 'Associated incident ID' }),
  autoApprove: Type.Optional(Type.Boolean({ default: false })),
  parameters: Type.Optional(Type.Record(Type.String(), Type.String())),
});

export const runPlaybookTool: SecurityTool = {
  name: 'playbook_run',
  label: 'Run Playbook',
  description: 'Execute an incident response playbook',
  parameters: runPlaybookParams,
  category: 'incident_response',
  riskLevel: 'medium',
  requiresConfirmation: true,
  timeout: 600000,
  async execute(toolCallId, params): Promise<SecurityToolResult> {
    const executionId = `PBE-${Date.now()}`;
    const steps = [
      { step: 1, action: 'Identify affected systems', status: 'completed' },
      { step: 2, action: 'Isolate compromised hosts', status: 'completed' },
      { step: 3, action: 'Collect evidence', status: 'in_progress' },
      { step: 4, action: 'Analyze attack vectors', status: 'pending' },
    ];

    return createSuccessResult(
      `Playbook ${params.playbookId} execution started for incident ${params.incidentId}`,
      {
        executionId,
        playbookId: params.playbookId,
        incidentId: params.incidentId,
        startedAt: new Date().toISOString(),
        status: 'running',
        steps,
        progress: 50,
      },
      { riskLevel: 'medium' }
    );
  },
};

const escalateIncidentParams = Type.Object({
  incidentId: Type.String({ description: 'Incident ID to escalate' }),
  escalationLevel: Type.Union([
    Type.Literal('tier2'),
    Type.Literal('tier3'),
    Type.Literal('management'),
    Type.Literal('external'),
  ]),
  reason: Type.String({ description: 'Reason for escalation' }),
  additionalInfo: Type.Optional(Type.String()),
});

export const escalateIncidentTool: SecurityTool = {
  name: 'incident_escalate',
  label: 'Escalate Incident',
  description: 'Escalate an incident to higher tier',
  parameters: escalateIncidentParams,
  category: 'incident_response',
  riskLevel: 'low',
  async execute(toolCallId, params): Promise<SecurityToolResult> {
    return createSuccessResult(
      `Incident ${params.incidentId} escalated to ${params.escalationLevel}`,
      {
        incidentId: params.incidentId,
        escalationId: `ESC-${Date.now()}`,
        previousLevel: 'tier1',
        newLevel: params.escalationLevel,
        reason: params.reason,
        escalatedAt: new Date().toISOString(),
        notifiedParties: ['on-call-engineer', 'security-manager'],
      },
      { riskLevel: 'low' }
    );
  },
};

const postIncidentParams = Type.Object({
  incidentId: Type.String({ description: 'Incident ID' }),
  reportType: Type.Optional(Type.Union([
    Type.Literal('summary'),
    Type.Literal('full'),
    Type.Literal('lessons_learned'),
  ], { default: 'full' })),
  includeRecommendations: Type.Optional(Type.Boolean({ default: true })),
});

export const postIncidentReportTool: SecurityTool = {
  name: 'post_incident_report',
  label: 'Post-Incident Report',
  description: 'Generate post-incident report',
  parameters: postIncidentParams,
  category: 'incident_response',
  riskLevel: 'low',
  async execute(toolCallId, params): Promise<SecurityToolResult> {
    return createSuccessResult(
      `Post-incident report generated for ${params.incidentId}`,
      {
        reportId: `RPT-${Date.now()}`,
        incidentId: params.incidentId,
        reportType: params.reportType,
        generatedAt: new Date().toISOString(),
        sections: [
          'Executive Summary',
          'Timeline of Events',
          'Impact Assessment',
          'Root Cause Analysis',
          'Containment Actions',
          'Lessons Learned',
          'Recommendations',
        ],
        recommendations: [
          'Implement network segmentation',
          'Enable MFA for privileged accounts',
          'Update detection rules for similar attacks',
        ],
      },
      { riskLevel: 'low' }
    );
  },
};

const containThreatParams = Type.Object({
  incidentId: Type.String({ description: 'Incident ID' }),
  containmentType: Type.Union([
    Type.Literal('network'),
    Type.Literal('endpoint'),
    Type.Literal('application'),
    Type.Literal('user'),
  ]),
  scope: Type.Optional(Type.Union([
    Type.Literal('targeted'),
    Type.Literal('broad'),
  ], { default: 'targeted' })),
  targetAssets: Type.Array(Type.String()),
});

export const containThreatTool: SecurityTool = {
  name: 'threat_containment',
  label: 'Threat Containment',
  description: 'Execute containment actions for a threat',
  parameters: containThreatParams,
  category: 'incident_response',
  riskLevel: 'high',
  requiresConfirmation: true,
  timeout: 180000,
  async execute(toolCallId, params): Promise<SecurityToolResult> {
    const actions = params.targetAssets.map((asset: string) => ({
      asset,
      action: params.containmentType === 'network' ? 'block_traffic' : 
              params.containmentType === 'endpoint' ? 'isolate' :
              params.containmentType === 'application' ? 'disable' : 'suspend',
      status: 'executed',
      timestamp: new Date().toISOString(),
    }));

    return createSuccessResult(
      `Threat containment executed for incident ${params.incidentId}`,
      {
        containmentId: `CON-${Date.now()}`,
        incidentId: params.incidentId,
        containmentType: params.containmentType,
        scope: params.scope,
        actions,
        executedAt: new Date().toISOString(),
      },
      { riskLevel: 'high' }
    );
  },
};

export const incidentResponseTools: SecurityTool[] = [
  createIncidentTool,
  updateIncidentTool,
  isolateHostTool,
  disableAccountTool,
  blockIndicatorTool,
  quarantineFileTool,
  collectEvidenceTool,
  createPlaybookTool,
  runPlaybookTool,
  escalateIncidentTool,
  postIncidentReportTool,
  containThreatTool,
];
