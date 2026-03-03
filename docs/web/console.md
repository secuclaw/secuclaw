---
summary: "Web-based security console for monitoring and response."
read_when:
  - Using the web console
  - Understanding console features
title: "Security Console"
---

# Security Console

The SecuClaw Security Console is a web-based dashboard for monitoring security operations, managing incidents, and configuring the system.

## Access

- **Local**: [http://127.0.0.1:21000/](http://127.0.0.1:21000/)
- **Remote**: Configure [remote access](/gateway/remote) for external access

## Features

### Dashboard

The main dashboard provides a real-time overview of your security posture.

**Components:**
- Security score summary
- Active alerts count
- Recent incidents
- Threat intelligence summary
- Compliance status

### Threat Operations Center (War Room)

The War Room is where security analysts investigate and respond to threats.

**Features:**
- Real-time alert stream
- Incident investigation workspace
- Threat timeline visualization
- IOC (Indicator of Compromise) lookup
- MITRE ATT&CK mapping

### Compliance Auditor

The Compliance Auditor tracks your organization's compliance posture.

**Features:**
- Framework compliance status (SCF 2025, SOC 2, ISO 27001)
- Control gap analysis
- Audit trail viewer
- Compliance reporting
- Remediation tracking

### Risk Dashboard

The Risk Dashboard provides enterprise risk visibility.

**Features:**
- Risk score trends
- Asset vulnerability matrix
- Business impact analysis
- Risk register
- Treatment plans

### Configuration

Manage your SecuClaw deployment through the web interface.

**Tabs:**
- **General**: Gateway settings, port, authentication
- **Agents**: Model configuration, agent roles
- **Security**: Data sources, threat intelligence
- **Compliance**: Framework settings, reporting
- **Automation**: SOAR playbooks, triggers

## Navigation

```
┌─────────────────────────────────────────────────────┐
│  Logo  │  Dashboard  │  War Room  │  Auditor  │ ⚙  │
├─────────────────────────────────────────────────────┤
│                                                     │
│                   Main Content                      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Quick search |
| `Ctrl+N` | New incident |
| `Ctrl+,` | Settings |
| `Esc` | Close modal |

## Dark Mode

Toggle dark mode from the settings menu or use `Ctrl+Shift+D`.

---

_Related: [Getting Started](/start/getting-started) · [Configuration](/gateway/configuration)_
