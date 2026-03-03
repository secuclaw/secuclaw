---
summary: "Overview of SecuClaw onboarding options and flows"
read_when:
  - Choosing an onboarding path
  - Setting up a new environment
title: "Onboarding Overview"
sidebarTitle: "Onboarding Overview"
---

# Onboarding Overview

SecuClaw supports multiple onboarding paths depending on where the Gateway runs
and how you prefer to configure AI providers.

## Choose your onboarding path

- **CLI wizard** for macOS, Linux, and Windows (via WSL2).
- **Manual setup** for advanced users who want full control.

## CLI onboarding wizard

Run the wizard in a terminal:

```bash
secuclaw onboard
```

Use the CLI wizard when you want full control of the Gateway, security agents,
data sources, and compliance settings. Docs:

- [Onboarding Wizard (CLI)](/start/wizard)
- [`secuclaw onboard` command](/cli/onboard)

## Manual setup

For advanced users who prefer manual configuration:

```bash
secuclaw init
secuclaw configure
```

Manual setup allows you to:
- Edit config directly: `~/.secuclaw/secuclaw.json`
- Configure custom AI providers
- Set up specific security data sources
- Define compliance frameworks manually

## Custom Provider

If you need an endpoint that is not listed, including hosted providers that
expose standard OpenAI or Anthropic APIs, choose **Custom Provider** in the
CLI wizard. You will be asked to:

- Pick OpenAI-compatible, Anthropic-compatible, or **Unknown** (auto-detect).
- Enter a base URL and API key (if required by the provider).
- Provide a model ID and optional alias.
- Choose an Endpoint ID so multiple custom endpoints can coexist.

For detailed steps, follow the CLI onboarding docs above.
