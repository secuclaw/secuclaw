---
summary: "Get started with SecuClaw in minutes."
read_when:
  - New users setting up SecuClaw
  - Quick start guide
title: "Getting Started"
---

# Getting Started

This guide will help you get SecuClaw running in minutes.

## Prerequisites

- Node.js 22+
- npm, pnpm, or bun
- Anthropic API key (recommended)

## Step 1: Install

```bash
npm install -g secuclaw@latest
```

Verify installation:

```bash
secuclaw --version
```

## Step 2: Initialize

Run the setup wizard:

```bash
secuclaw init
```

This will:
- Create config directory (~/.secuclaw)
- Generate initial configuration
- Prompt for API keys

## Step 3: Configure (Optional)

```bash
secuclaw configure
```

Configure:
- LLM provider (Anthropic, OpenAI, etc.)
- Security data sources (SIEM, firewall, etc.)
- Agent roles and models

Or edit config directly:

```bash
nano ~/.secuclaw/secuclaw.json
```

## Step 4: Start Gateway

```bash
secuclaw gateway
```

The gateway starts on port 21000 by default.

## Step 5: Access Console

Open your browser:

- **Console**: http://127.0.0.1:21000/

## What's Next?

<Columns>
  <Card title="Configure Security Sources" href="/gateway/configuration">
    Connect SIEM, firewall, EDR data sources.
  </Card>
  <Card title="Explore Security Roles" href="/concepts/security-roles">
    Learn about specialized security agents.
  </Card>
  <Card title="Set Up Compliance" href="/compliance">
    Configure compliance frameworks.
  </Card>
  <Card title="Automate with SOAR" href="/automation">
    Create automated response playbooks.
  </Card>
</Columns>

## Common Commands

```bash
# Check health
secuclaw health

# View logs
secuclaw logs

# Update
secuclaw update

# Get help
secuclaw --help
```

## Troubleshooting

**Gateway won't start?**
```bash
secuclaw doctor
```

**Need to reset?**
```bash
rm -rf ~/.secuclaw
secuclaw init
```

---

_Related: [Installation](/install) · [Configuration](/gateway/configuration) · [CLI Reference](/cli)_
