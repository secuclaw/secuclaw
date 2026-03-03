---
summary: "Configuration overview for SecuClaw Gateway."
read_when:
  - Setting up SecuClaw for the first time
  - Looking for common configuration patterns
title: "Configuration"
---

# Configuration

SecuClaw reads an optional JSON5 config from `~/.secuclaw/secuclaw.json`.

If the file is missing, SecuClaw uses safe defaults. Common reasons to add a config:

- Configure security data sources and integrations
- Set models, tools, sandboxing, or automation
- Tune sessions, security policies, or UI

See the [full reference](/gateway/configuration-reference) for every available field.

<Tip>
**New to configuration?** Start with `secuclaw init` for interactive setup, or check out the [Configuration Examples](/gateway/configuration-examples) guide for complete copy-paste configs.
</Tip>

## Minimal config

```json5
// ~/.secuclaw/secuclaw.json
{
  agents: { defaults: { workspace: "~/.secuclaw/workspace" } },
  security: {
    sources: {
      siem: { enabled: true },
    },
  },
}
```

## Editing config

<Tabs>
  <Tab title="Interactive wizard">
    ```bash
    secuclaw init           # full setup wizard
    secuclaw configure      # config wizard
    ```
  </Tab>
  <Tab title="CLI (one-liners)">
    ```bash
    secuclaw config get agents.defaults.workspace
    secuclaw config set agents.defaults.model "anthropic/claude-sonnet-4-5"
    secuclaw config unset security.sources.siem
    ```
  </Tab>
  <Tab title="Control UI">
    Open [http://127.0.0.1:21000](http://127.0.0.1:21000) and use the **Config** tab.
    The Control UI renders a form from the config schema, with a **Raw JSON** editor as an escape hatch.
  </Tab>
  <Tab title="Direct edit">
    Edit `~/.secuclaw/secuclaw.json` directly. The Gateway watches the file and applies changes automatically (see [hot reload](#config-hot-reload)).
  </Tab>
</Tabs>

## Strict validation

<Warning>
SecuClaw only accepts configurations that fully match the schema. Unknown keys, malformed types, or invalid values cause the Gateway to **refuse to start**. The only root-level exception is `$schema` (string), so editors can attach JSON Schema metadata.
</Warning>

When validation fails:
- The Gateway does not boot
- Only diagnostic commands work (`secuclaw doctor`, `secuclaw logs`, `secuclaw health`, `secuclaw status`)
- Run `secuclaw doctor` to see exact issues
- Run `secuclaw doctor --fix` (or `--yes`) to apply repairs

## Common tasks

<AccordionGroup>
  <Accordion title="Configure security data sources">
    Connect to your security data sources:

    ```json5
    {
      security: {
        sources: {
          siem: {
            enabled: true,
            endpoint: "https://your-siem.example.com",
            apiKey: "${SIEM_API_KEY}",
          },
          firewall: {
            enabled: true,
            type: " Palo Alto Networks",
            logs: "/var/log/firewall",
          },
          edr: {
            enabled: true,
            provider: "crowdstrike",
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Choose and configure models">
    Set the primary model and optional fallbacks:

    ```json5
    {
      agents: {
        defaults: {
          model: {
            primary: "anthropic/claude-sonnet-4-5",
            fallbacks: ["openai/gpt-4o"],
          },
          models: {
            "anthropic/claude-sonnet-4-5": { alias: "Sonnet" },
            "openai/gpt-4o": { alias: "GPT" },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Configure security agents">
    Set up specialized security agents:

    ```json5
    {
      agents: {
        list: [
          { id: "sec", role: "SEC", name: "Security Expert" },
          { id: "legal", role: "SEC+LEG", name: "Privacy Officer" },
          { id: "arch", role: "SEC+IT", name: "Security Architect" },
          { id: "biz", role: "SEC+BIZ", name: "Business Security" },
        ],
      },
    }
    ```

  </Accordion>

  <Accordion title="Set up threat intelligence">
    Configure threat intelligence feeds:

    ```json5
    {
      threatIntel: {
        mitre: { enabled: true, version: "v18.1" },
        stix: {
          enabled: true,
          sources: ["https://feed.example.com/stix"],
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Configure compliance settings">
    Set up compliance frameworks:

    ```json5
    {
      compliance: {
        frameworks: ["SCF2025", "SOC2", "ISO27001"],
        autoRemediation: true,
        reportingInterval: "monthly",
      },
    }
    ```

  </Accordion>

  <Accordion title="Configure SOAR automation">
    Set up automation playbooks:

    ```json5
    {
      soar: {
        enabled: true,
        playbooks: {
          phishing: {
            trigger: "alert.severity >= high AND alert.type = phishing",
            steps: ["collect", "analyze", "respond"],
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Configure sandboxing">
    Run agent sessions in isolated Docker containers:

    ```json5
    {
      agents: {
        defaults: {
          sandbox: {
            mode: "non-main",  // off | non-main | all
            scope: "agent",    // session | agent | shared
          },
        },
      },
    }
    ```

  </Accordion>
</AccordionGroup>

## Config hot reload

The Gateway watches `~/.secuclaw/secuclaw.json` and applies changes automatically — no manual restart needed for most settings.

### Reload modes

| Mode                   | Behavior                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------- |
| **`hybrid`** (default) | Hot-applies safe changes instantly. Automatically restarts for critical ones.           |
| **`hot`**              | Hot-applies safe changes only. Logs a warning when a restart is needed — you handle it. |
| **`restart`**          | Restarts the Gateway on any config change, safe or not.                                 |
| **`off`**              | Disables file watching. Changes take effect on the next manual restart.                 |

```json5
{
  gateway: {
    reload: { mode: "hybrid", debounceMs: 300 },
  },
}
```

## Environment variables

SecuClaw reads env vars from the parent process plus:

- `.env` from the current working directory (if present)
- `~/.secuclaw/.env` (global fallback)

Neither file overrides existing env vars. You can also set inline env vars in config:

```json5
{
  env: {
    ANTHROPIC_API_KEY: "${ANTHROPIC_API_KEY}",
    SIEM_API_KEY: "${SIEM_API_KEY}",
  },
}
```

## Full reference

For the complete field-by-field reference, see **[Configuration Reference](/gateway/configuration-reference)**.

---

_Related: [Configuration Examples](/gateway/configuration-examples) · [Configuration Reference](/gateway/configuration-reference) · [Getting Started](/start/getting-started)_
