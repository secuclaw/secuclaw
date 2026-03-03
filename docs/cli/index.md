---
summary: "CLI command reference for SecuClaw."
read_when:
  - Using the CLI
  - Automating tasks
title: "CLI Reference"
---

# CLI Reference

SecuClaw provides a comprehensive CLI for managing your security operations.

## Commands

### Gateway

```bash
# Start the gateway
secuclaw gateway

# Start with specific port
secuclaw gateway --port 21000

# Start with token authentication
secuclaw gateway --token "your-token"
```

### Configuration

```bash
# Initialize configuration
secuclaw init

# Open configuration wizard
secuclaw configure

# Get config value
secuclaw config get agents.defaults.model

# Set config value
secuclaw config set agents.defaults.model "anthropic/claude-sonnet-4-5"

# Unset config value
secuclaw config unset agents.defaults.model
```

### Health & Status

```bash
# Check gateway health
secuclaw health

# Get full status
secuclaw status

# Check specific channel
secuclaw status --channel telegram
```

### Logs

```bash
# View logs
secuclaw logs

# Filter by level
secuclaw logs --level error

# Filter by time
secuclaw logs --since "1 hour ago"

# Follow logs
secuclaw logs --follow
```

### Security Operations

```bash
# Analyze threat
secuclaw analyze --type threat --data "suspicious file hash"

# Check vulnerability
secuclaw vuln-check --target "192.168.1.1"

# Query threat intelligence
secuclaw intel query --indicator "malware-signature"

# Run compliance check
secuclaw compliance check --framework SCF2025
```

### Agents

```bash
# List available agents
secuclaw agents list

# Get agent status
secuclaw agents status sec

# Configure agent
secuclaw agents configure sec --model "anthropic/claude-sonnet-4-5"
```

### Sessions

```bash
# List sessions
secuclaw sessions list

# Get session info
secuclaw sessions info session-id

# Clear session
secuclaw sessions clear session-id
```

### Skills

```bash
# List skills
secuclaw skills list

# Install skill from market
secuclaw skills install @secuhub/pentest-tools

# Update skill
secuclaw skills update @secuhub/pentest-tools
```

### Tools

```bash
# List available tools
secuclaw tools list

# Run tool
secuclaw tools run nmap --target "10.0.0.1"
```

### Update & Maintenance

```bash
# Update SecuClaw
secuclaw update

# Check for updates
secuclaw update --check

# Run diagnostics
secuclaw doctor

# Auto-fix issues
secuclaw doctor --fix
```

## Global Options

| Option | Description |
|--------|-------------|
| `--version` | Show version |
| `--help` | Show help |
| `--config` | Custom config path |
| `--debug` | Enable debug output |

## Environment Variables
|----------|-------------|
| `SECUCLAW_HOME` | Config directory (default: ~/.secuclaw) |
| `SECUCLAW_SKILLS_DIR` | Custom skills directory |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `OPENAI_API_KEY` | OpenAI API key |
| `GOOGLE_API_KEY` | Google API key |
| `QWEN_API_KEY` | Alibaba Qwen API key |
| `DEEPSEEK_API_KEY` | DeepSeek API key |
| `GLM_API_KEY` | Zhipu GLM API key |
| `GROQ_API_KEY` | Groq API key |

## Configuration Keys

| Key | Description | Default |
|-----|-------------|--------|
| `provider.default` | Default LLM provider | `ollama` |
| `provider.model` | Default model name | - |
| `provider.apiKey` | API key for provider | - |
| `provider.baseUrl` | Base URL for API requests | - |
| `gateway.port` | Gateway server port | `21000` |
| `gateway.host` | Gateway server host | `localhost` |
| `memory.enabled` | Enable persistent memory | `true` |
| `memory.maxEntries` | Max memory entries | `1000` |
| `skills.layer` | Skills layer preference | `hybrid` |
| `output.format` | Output format (text, json, markdown) | `text` |
| `output.color` | Enable colored output | `true` |
| `log.level` | Log level (debug, info, warn, error) | `info` |
| `workspace.path` | Default workspace path | - |
---

_Related: [Configuration](/gateway/configuration) · [Getting Started](/start/getting-started)_
