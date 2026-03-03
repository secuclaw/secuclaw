---
summary: "Session management rules, keys, and persistence for security operations"
read_when:
  - Modifying session handling or storage
  - Understanding security agent sessions
title: "Session Management"
---

# Session Management

SecuClaw treats **one direct-chat session per agent** as primary. Direct chats collapse to `agent:<agentId>:<mainKey>` (default `main`), while group/channel chats get their own keys.

Use `session.dmScope` to control how **direct messages** are grouped:

- `main` (default): all DMs share the main session for continuity.
- `per-peer`: isolate by sender id across channels.
- `per-channel-peer`: isolate by channel + sender (recommended for multi-user inboxes).
- `per-account-channel-peer`: isolate by account + channel + sender.

Use `session.identityLinks` to map provider-prefixed peer ids to a canonical identity so the same person shares a DM session across channels.

## Secure DM mode (recommended for multi-user setups)

> **Security Warning:** If your agent can receive DMs from **multiple people**, you should strongly consider enabling secure DM mode. Without it, all users share the same conversation context, which can leak private information between users.

**Example of the problem:**

- Alice messages your agent about a private security incident
- Bob messages your agent asking "What were we talking about?"
- Because both DMs share the same session, the model may answer Bob using Alice's prior context.

**The fix:** Set `dmScope` to isolate sessions per user:

```json5
// ~/.secuclaw/secuclaw.json
{
  session: {
    dmScope: "per-channel-peer",
  },
}
```

## Gateway is the source of truth

All session state is **owned by the gateway**. UI clients must query the gateway for session lists and token counts.

- In **remote mode**, the session store lives on the remote gateway host.

## Where state lives

- On the **gateway host**:
  - Store file: `~/.secuclaw/agents/<agentId>/sessions/sessions.json` (per agent)
  - Transcripts: `~/.secuclaw/agents/<agentId>/sessions/<SessionId>.jsonl`

## Session lifecycle

- **Reset policy**: sessions are reused until they expire
- **Daily reset**: defaults to **4:00 AM local time** on the gateway host
- **Idle reset**: `idleMinutes` adds a sliding idle window
- **Manual reset**: `/new` or `/reset` commands start a fresh session

## Configuration

```json5
{
  session: {
    dmScope: "per-channel-peer",
    reset: {
      mode: "daily",
      atHour: 4,
      idleMinutes: 120,
    },
    store: "~/.secuclaw/agents/{agentId}/sessions/sessions.json",
    mainKey: "main",
  },
}
```

## Inspecting

- `secuclaw status` — shows store path and recent sessions
- `secuclaw sessions --json` — dumps every entry
- `/status` — shows session context usage
- `/context list` — shows what's in the system prompt
- `/compact` — summarize older context to free up window space
