---
summary: "CLI onboarding wizard: guided setup for gateway, security agents, and configurations"
read_when:
  - Running or configuring the onboarding wizard
  - Setting up a new environment
title: "Onboarding Wizard (CLI)"
sidebarTitle: "Onboarding: CLI"
---

# Onboarding Wizard (CLI)

The onboarding wizard is the **recommended** way to set up SecuClaw on macOS,
Linux, or Windows (via WSL2).
It configures a local Gateway, security agents, data sources, and compliance settings in one guided flow.

```bash
secuclaw onboard
```

<Info>
Fastest first experience: open the Security Console (no data source setup needed). Run
`secuclaw console` and access the dashboard in the browser at http://127.0.0.1:21000/.
</Info>

To reconfigure later:

```bash
secuclaw configure
secuclaw agents add <name>
```

<Note>
`--json` does not imply non-interactive mode. For scripts, use `--non-interactive`.
</Tip>

<Tip>
Recommended: set up an Anthropic API key so the security agents can use advanced AI capabilities.
Easiest path: `secuclaw configure --section agents` which configures the AI provider.
</Tip>

## QuickStart vs Advanced

The wizard starts with **QuickStart** (defaults) vs **Advanced** (full control).

<Tabs>
  <Tab title="QuickStart (defaults)">
    - Local gateway (loopback)
    - Security workspace default
    - Gateway port **21000**
    - Gateway auth **Token** (auto-generated)
    - Tailscale exposure **Off**
    - Default security role: **SEC** (Security Analyst)
  </Tab>
  <Tab title="Advanced (full control)">
    - Exposes every step (mode, workspace, gateway, agents, data sources, compliance).
  </Tab>
</Tabs>

## What the wizard configures

**Local mode (default)** walks you through these steps:

1. **Model/Auth** — Anthropic API key (recommended), OpenAI, or Custom Provider
   (OpenAI-compatible, Anthropic-compatible, or Unknown auto-detect). Pick a default model.
2. **Security Role** — Select primary role: SEC, SEC+LEG, SEC+IT, SEC+BIZ, or custom.
3. **Workspace** — Location for security data and agent files (default `~/.secuclaw/workspace`).
4. **Gateway** — Port, bind address, auth mode, Tailscale exposure.
5. **Data Sources** — Optional: SIEM, firewall, EDR integration.
6. **Compliance** — Optional: SOC 2, ISO 27001, GDPR frameworks.
7. **Daemon** — Installs a LaunchAgent (macOS) or systemd user unit (Linux/WSL2).
8. **Health check** — Starts the Gateway and verifies it's running.

<Note>
Re-running the wizard does **not** wipe anything unless you explicitly choose **Reset** (or pass `--reset`).
If the config is invalid or contains legacy keys, the wizard asks you to run `secuclaw doctor` first.
</Note>

**Remote mode** only configures the local client to connect to a Gateway elsewhere.
It does **not** install or change anything on the remote host.

## Add another security agent

Use `secuclaw agents add <name>` to create a separate security agent with its own workspace,
sessions, and configurations. Running without `--workspace` launches the wizard.

What it sets:

- `agents.list[].name`
- `agents.list[].role`
- `agents.list[].workspace`

Notes:

- Default workspaces follow `~/.secuclaw/workspace-<agentId>`.
- Add `bindings` to route inbound requests (the wizard can do this).
- Non-interactive flags: `--model`, `--role`, `--agent-dir`, `--bind`, `--non-interactive`.

## Full reference

For detailed step-by-step breakdowns, non-interactive scripting, RPC API,
and a full list of config fields the wizard writes, see the
[Wizard Reference](/reference/wizard).

## Related docs

- CLI command reference: [`secuclaw onboard`](/cli/onboard)
- Onboarding overview: [Onboarding Overview](/start/onboarding-overview)
- Agent bootstrapping: [Agent Bootstrapping](/start/bootstrapping)
