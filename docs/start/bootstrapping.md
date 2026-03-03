---
summary: "Security agent bootstrapping ritual that seeds the workspace and identity files"
read_when:
  - Understanding what happens on the first agent run
  - Explaining where bootstrapping files live
  - Debugging onboarding identity setup
title: "Agent Bootstrapping"
sidebarTitle: "Bootstrapping"
---

# Agent Bootstrapping

Bootstrapping is the **first-run** ritual that prepares a security agent workspace and
collects identity details. It happens after onboarding, when the security agent starts
for the first time.

## What bootstrapping does

On the first agent run, SecuClaw bootstraps the workspace (default
`~/.secuclaw/workspace`):

- Seeds `AGENTS.md`, `BOOTSTRAP.md`, `IDENTITY.md`, `USER.md`, `SECURITY_PROFILE.md`
- Runs a short Q&A ritual (one question at a time)
- Collects security role preferences and operational context
- Writes identity + preferences to `IDENTITY.md`, `USER.md`, `SECURITY_PROFILE.md`
- Removes `BOOTSTRAP.md` when finished so it only runs once

## Where it runs

Bootstrapping always runs on the **gateway host**. If you connect to
a remote Gateway, the workspace and bootstrapping files live on that remote
machine.

<Note>
When the Gateway runs on another machine, edit workspace files on the gateway
host (for example, `user@gateway-host:~/.secuclaw/workspace`).
</Note>

## Security profile

SecuClaw agents are initialized with a security profile that defines:

- **Primary role**: SEC, SEC+LEG, SEC+IT, SEC+BIZ, etc.
- **Operational scope**: What systems and data the agent can access
- **Compliance frameworks**: SOC 2, ISO 27001, GDPR, etc.
- **Response protocols**: SOAR playbooks, escalation paths

## Related docs

- [Security Roles](/concepts/security-roles)
- [Workspace layout](/concepts/agent-workspace)
- [Onboarding Wizard](/start/wizard)
