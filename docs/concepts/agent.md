---
summary: "Security agent runtime, workspace contract, and session bootstrap"
read_when:
  - Changing agent runtime, workspace bootstrap, or session behavior
  - Understanding security agent configuration
title: "Security Agent Runtime"
---

# Security Agent Runtime 🤖

SecuClaw runs a specialized security agent runtime powered by AI models (Claude, GPT, Ollama, etc.).

## Workspace (required)

SecuClaw uses a single agent workspace directory (`agents.defaults.workspace`) as the agent's **only** working directory (`cwd`) for tools and context.

Recommended: use `secuclaw setup` to create `~/.secuclaw/secuclaw.json` if missing and initialize the workspace files.

Full workspace layout + backup guide: [Agent workspace](/concepts/agent-workspace)

## Bootstrap files (injected)

Inside `agents.defaults.workspace`, SecuClaw expects these user-editable files:

- `AGENTS.md` — operating instructions + "memory" for security operations
- `SOUL.md` — persona, boundaries, tone for security agent
- `SECURITY_PROFILE.md` — security role, compliance frameworks, operational scope
- `TOOLS.md` — user-maintained tool notes (conventions for security tools)
- `BOOTSTRAP.md` — one-time first-run ritual (deleted after completion)
- `IDENTITY.md` — agent name/vibe/emoji
- `USER.md` — user profile + preferred address

On the first turn of a new session, SecuClaw injects the contents of these files directly into the agent context.

Blank files are skipped. Large files are trimmed and truncated with a marker so prompts stay lean.

If a file is missing, SecuClaw injects a single "missing file" marker line.

`BOOTSTRAP.md` is only created for a **brand new workspace**. If you delete it after completing the ritual, it should not be recreated.

To disable bootstrap file creation entirely (for pre-seeded workspaces), set:

```json5
{ agent: { skipBootstrap: true } }
```

## Security Roles

SecuClaw supports multiple security roles:

- **SEC**: General security analyst
- **SEC+LEG**: Privacy/security legal compliance
- **SEC+IT**: Security architect
- **SEC+BIZ**: Business security officer
- **CSO**: Chief Security Officer
- **SCSO**: Supply Chain Security Officer
- **BSO**: Business Security Operations

Each role has specialized capabilities and knowledge bases.

## Built-in tools

Core tools (read/exec/edit/write and related system tools) are always available,
subject to tool policy. Security-specific tools include:

- Attack simulation tools
- Vulnerability assessment tools
- Compliance checking tools
- Threat intelligence tools

## Skills

SecuClaw loads skills from three locations (workspace wins on name conflict):

- Bundled (shipped with the install)
- Managed/local: `~/.secuclaw/skills`
- Workspace: `<workspace>/skills`

Skills can be gated by config/env (see `skills` in [Gateway configuration](/gateway/configuration)).

## Sessions

Session transcripts are stored as JSONL at:

- `~/.secuclaw/agents/<agentId>/sessions/<SessionId>.jsonl`

The session ID is stable and chosen by SecuClaw.

## Model refs

Model refs in config (for example `agents.defaults.model` and `agents.defaults.models`) are parsed by splitting on the **first** `/`.

- Use `provider/model` when configuring models
- If the model ID itself contains `/`, include the provider prefix

## Configuration (minimal)

At minimum, set:

- `agents.defaults.workspace`
- `agents.defaults.role` (security role)
- `agents.defaults.model` (AI provider)

---

_Next: [Security Roles](/concepts/security-roles) 🛡️_
