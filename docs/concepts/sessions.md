---
summary: "Session management and persistence."
read_when:
  - Understanding sessions
  - Configuring session behavior
title: "Sessions"
---

# Sessions

SecuClaw manages conversation sessions with persistent storage.

## Overview

Sessions maintain conversation context and history for security analysis.

## Configuration

```json5
{
  session: {
    persistence: {
      enabled: true,
      storage: "jsonl",  // jsonl | sqlite
      path: "~/.secuclaw/sessions",
    },
    dmScope: "per-channel-peer",
    reset: {
      mode: "daily",
      atHour: 4,
      idleMinutes: 120,
    },
    maxHistory: 100,
    compaction: {
      enabled: true,
      threshold: 50,
    },
  },
}
```

## Session Scopes

| Scope | Description |
|-------|-------------|
| `main` | Single shared session |
| `per-peer` | Per sender identity |
| `per-channel-peer` | Per channel + sender |
| `per-account-channel-peer` | Most granular |

## Session Reset

```json5
{
  session: {
    reset: {
      mode: "daily",      // daily | weekly | never
      atHour: 4,
      idleMinutes: 120,
    },
  },
}
```

## Commands

```bash
# List sessions
secuclaw sessions list

# Get session info
secuclaw sessions info session-id

# Clear session
secuclaw sessions clear session-id

# Export session
secuclaw sessions export session-id --output file.jsonl
```
