---
summary: "Sandbox execution environment for tools."
read_when:
  - Understanding sandbox security
  - Configuring sandbox options
title: "Sandbox"
---

# Sandbox

SecuClaw provides a secure sandbox environment for executing security tools.

## Overview

The sandbox isolates tool execution to prevent unauthorized system access.

```
┌─────────────────────────────────────────┐
│           Tool Execution                 │
├─────────────────────────────────────────┤
│  Host System (Protected)               │
├─────────────────────────────────────────┤
│  Docker Container (Isolated)           │
│  ├─ Restricted filesystem              │
│  ├─ Limited network access            │
│  └─ Resource limits (CPU/RAM)         │
└─────────────────────────────────────────┘
```

## Configuration

```json5
{
  sandbox: {
    enabled: true,
    provider: "docker",
    image: "secuclaw-sandbox:bookworm-slim",
    networkMode: "none",  // none | bridge | host
    resourceLimits: {
      cpu: 1,
      memory: "512m",
      disk: "1g",
    },
    allowedCommands: ["nmap", "curl", "python3"],
    filesystem: {
      readonly: ["/etc", "/var"],
      writable: ["/tmp"],
    },
  },
}
```

## Modes

| Mode | Description |
|------|-------------|
| `off` | No sandboxing, tools run directly |
| `non-main` | Only non-critical tools sandboxed |
| `all` | All tools run in sandbox |

## Security

- **Network isolation**: No external network by default
- **Filesystem restrictions**: Read-only system directories
- **Resource limits**: Prevent resource exhaustion
- **Timeout**: Maximum execution time limits

## Usage

```bash
# Run tool in sandbox
secuclaw tools run nmap --target 10.0.0.1 --sandbox

# Sandbox status
secuclaw sandbox status
```
