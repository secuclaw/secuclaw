---
name: threat-hunter
description: Threat hunting skill with MITRE ATT&CK integration and visualization support
version: 1.0.0
author: secuclaw-team
tags:
  - security
  - threat-hunting
  - mitre
  - visualization
triggers:
  - type: command
    pattern: /hunt
  - type: context
    conditions:
      keywords: ["threat hunt", "ioc analysis", "attack pattern"]
metadata:
  secuclaw:
    capabilities:
      - threat-intelligence
      - mitre-attack-mapping
      - ioc-enrichment
      - visualization
    mitre_coverage:
      - T1059
      - T1078
      - T1566
      - T1021
visualizations:
  mode: hybrid
  inline:
    - id: attack-timeline
      name: "Attack Timeline"
      description: "Visual timeline of detected attack activities"
      type: timeline
      category: dashboard
      dataSource: hunting.findings
      dataTransform: sortByTimestamp
      config:
        timeField: timestamp
        eventField: title
        groupField: mitreTactic
        colorBy: severity
        zoomable: true
        showLabels: true
      layout:
        width: 100%
        height: 400
      interactions:
        - type: click
          action: drilldown
          params:
            target: finding-detail
    
    - id: mitre-heatmap
      name: "MITRE ATT&CK Heatmap"
      description: "Heatmap showing coverage of detected techniques"
      type: heatmap
      category: report
      dataSource: hunting.mitreCoverage
      config:
        xLabels: ["Initial Access", "Execution", "Persistence", "Privilege Escalation", "Defense Evasion", "Credential Access", "Discovery", "Lateral Movement", "Collection", "Command and Control", "Exfiltration", "Impact"]
        yLabels: ["Detected", "Hypothesized", "Not Observed"]
        colorScale:
          type: discrete
          colors: ["#28a745", "#ffc107", "#dc3545"]
      layout:
        width: 100%
        height: 300

    - id: ioc-network
      name: "IOC Relationship Graph"
      description: "Network graph showing relationships between IOCs"
      type: graph
      category: widget
      dataSource: hunting.iocs
      config:
        nodeField: id
        layout: force
        nodeConfig:
          labelField: value
          sizeField: connections
          colorField: type
          shape: circle
        edgeConfig:
          curved: true
          animated: true
        zoomable: true
        draggable: true
      layout:
        width: 100%
        height: 500

    - id: hunt-progress
      name: "Hunting Progress Dashboard"
      description: "Progress metrics for ongoing hunting sessions"
      type: gauge
      category: panel
      dataSource: hunting.progress
      config:
        metrics:
          - field: hypothesesValidated
            label: "Hypotheses Validated"
            max: 100
          - field: iocsIdentified
            label: "IOCs Identified"
            max: 50
          - field: coveragePercent
            label: "Coverage %"
            max: 100
      layout:
        width: 300
        height: 200

    - id: findings-table
      name: "Hunting Findings"
      description: "Detailed table of all hunting findings"
      type: table
      category: widget
      dataSource: hunting.findings
      config:
        columns:
          - field: timestamp
            header: "Time"
            sortable: true
            render: date
          - field: title
            header: "Finding"
            sortable: true
            filterable: true
          - field: severity
            header: "Severity"
            sortable: true
            render: badge
          - field: mitreTechnique
            header: "MITRE"
            sortable: true
          - field: status
            header: "Status"
            sortable: true
            filterable: true
        pagination:
          enabled: true
          pageSize: 20
        sorting:
          enabled: true
          defaultField: timestamp
          defaultDirection: desc
        filtering:
          enabled: true
          globalSearch: true
        selection: multiple
      layout:
        width: 100%
        height: auto
        minHeight: 200
---

# Threat Hunter Skill

You are a threat hunting expert specializing in proactive threat detection using MITRE ATT&CK framework.

## Capabilities

1. **Hypothesis-Driven Hunting**: Create and validate threat hypotheses
2. **IOC Analysis**: Identify and analyze indicators of compromise
3. **MITRE Mapping**: Map findings to MITRE ATT&CK tactics and techniques
4. **Evidence Collection**: Gather and preserve forensic evidence
5. **Visualization**: Present findings through interactive visualizations

## Commands

- `/hunt start [hypothesis]` - Start a new hunting session
- `/hunt status` - Check current hunting progress
- `/hunt findings` - List all findings
- `/hunt ioc add [value]` - Add a new IOC
- `/hunt visualize [type]` - Generate visualization

## Visualization Data Sources

This skill provides the following data sources for visualizations:

| Source | Description | Schema |
|--------|-------------|--------|
| `hunting.findings` | All hunting findings | `{ timestamp, title, severity, mitreTechnique, status }` |
| `hunting.mitreCoverage` | MITRE technique coverage | `{ technique, status, count }` |
| `hunting.iocs` | Indicators of compromise | `{ id, value, type, connections }` |
| `hunting.progress` | Session progress metrics | `{ hypothesesValidated, iocsIdentified, coveragePercent }` |

## Example Usage

```
User: /hunt start "Detect lateral movement using RDP"
Assistant: Starting threat hunt for lateral movement via RDP...

[Creates hypothesis, executes queries, generates findings]

Visualization: Attack Timeline showing detected RDP connections
Visualization: MITRE Heatmap highlighting T1021.001 (Remote Desktop Protocol)
```

## Integration

This skill integrates with:
- **ThreatHuntingEngine**: Core hunting logic
- **VisualizationRegistry**: Visualization rendering
- **MITRE Knowledge Base**: Technique mapping
