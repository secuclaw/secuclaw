---
summary: "Advanced setup and development workflows for SecuClaw"
read_when:
  - Setting up a new machine
  - You want "latest + greatest" without breaking your personal setup
title: "Setup"
---

# Setup

<Note>
If you are setting up for the first time, start with [Getting Started](/start/getting-started).
For wizard details, see [Onboarding Wizard](/start/wizard).
</Note>

## TL;DR

- **Config lives outside the repo:** `~/.secuclaw/secuclaw.json` (config).
- **Workspace:** `~/.secuclaw/workspace` (security data, prompts, configurations).
- **Run from source:** `pnpm build && pnpm gateway:watch`

## Prereqs (from source)

- Node `>=22`
- `pnpm`
- Docker (optional; for sandboxed tool execution)

## Tailoring strategy (so updates don't hurt)

If you want "100% tailored to me" _and_ easy updates, keep your customization in:

- **Config:** `~/.secuclaw/secuclaw.json` (JSON/JSON5)
- **Workspace:** `~/.secuclaw/workspace` (security configurations, playbooks, threat intelligence)

Bootstrap once:

```bash
secuclaw setup
```

## Run the Gateway from source

After `pnpm build`, you can run the packaged CLI directly:

```bash
node secuclaw.mjs gateway --port 21000 --verbose
```

## Standard workflow

1. Install SecuClaw: `npm install -g secuclaw@latest`
2. Run setup: `secuclaw setup`
3. Configure: `secuclaw configure`
4. Start Gateway: `secuclaw gateway`

### Verify

```bash
secuclaw health
```

## Development workflow (Gateway in terminal)

Goal: work on the TypeScript Gateway with hot reload.

```bash
pnpm install
pnpm gateway:watch
```

`gateway:watch` runs the gateway in watch mode and reloads on TypeScript changes.

## Configuration files

Use this when debugging or deciding what to back up:

- **AI Provider credentials:** `~/.secuclaw/credentials/`
- **Security agent sessions:** `~/.secuclaw/agents/<agentId>/sessions/`
- **Logs:** `~/.secuclaw/logs/`
- **Configuration:** `~/.secuclaw/secuclaw.json`

## Updating (without wrecking your setup)

- Keep `~/.secuclaw/workspace` and `~/.secuclaw/` as "your stuff"
- Don't put personal configs into the `secuclaw` repo
- Updating source: `git pull` + `pnpm install`

## Linux (systemd user service)

Linux installs use a systemd **user** service. By default, systemd stops user
services on logout/idle, which kills the Gateway. Onboarding attempts to enable
lingering for you (may prompt for sudo). If it's still off, run:

```bash
sudo loginctl enable-linger $USER
```

For always-on or multi-user servers, consider a **system** service instead.

## Related docs

- [Gateway runbook](/gateway) (flags, supervision, ports)
- [Gateway configuration](/gateway/configuration) (config schema + examples)
- [Security Roles](/concepts/security-roles)
- [Compliance](/compliance)
