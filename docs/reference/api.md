---
summary: "Complete API reference for SecuClaw Gateway endpoints."
read_when:
  - Integrating with SecuClaw Gateway
  - Building custom clients
title: "API Reference"
---

# API Reference

SecuClaw Gateway provides REST and WebSocket APIs for agent interactions and management.

## Base URL

- Default: `http://127.0.0.1:21000`
- Configurable via `gateway.port` in config

## Authentication

Most endpoints require authentication via:

- **API Key**: `Authorization: Bearer <api-key>` header
- **Session Cookie**: For web interface sessions

## Endpoints

### Sessions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sessions` | List all sessions |
| POST | `/api/sessions` | Create a new session |
| GET | `/api/sessions/:id` | Get session details |
| DELETE | `/api/sessions/:id` | Delete a session |

### Chat

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | Send a chat message |
| POST | `/api/chat/stream` | Stream chat response (SSE) |

### Skills

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/skills` | List available skills |
| GET | `/api/skills/:name` | Get skill details |
| POST | `/api/skills/install/:name` | Install a skill |

### Market

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/market/skills` | Search marketplace |
| GET | `/api/market/skills/:id` | Get skill details |
| POST | `/api/market/skills/:id/install` | Install from market |
| POST | `/api/market/skills/:id/reviews` | Add a review |

### Knowledge

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/knowledge/mitre/techniques` | List MITRE techniques |
| GET | `/api/knowledge/mitre/tactics` | List MITRE tactics |
| GET | `/api/knowledge/scf/domains` | List SCF domains |

### Assets

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/assets` | List assets |
| POST | `/api/assets` | Add asset |
| GET | `/api/assets/:id` | Get asset details |

### Vulnerabilities

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/vulnerabilities` | List vulnerabilities |
| GET | `/api/vulnerabilities/:id` | Get vulnerability details |

### Security Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/scan` | Run security scan |
| POST | `/api/attack/simulate` | Simulate attack |
| POST | `/api/defense/analyze` | Analyze defenses |

### Graph

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/graph/attack` | Get attack chain graph |
| GET | `/api/graph/assets` | Get asset relation graph |
| GET | `/api/graph/risk` | Get risk propagation graph |

### Risk

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/risk/score` | Get risk score |
| POST | `/api/risk/calculate` | Recalculate risk |

### Remediation

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/remediation/tasks` | List remediation tasks |
| POST | `/api/remediation/tasks` | Create remediation task |
| PUT | `/api/remediation/tasks/:id` | Update task status |

### Audit

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/audit/logs` | Get audit logs |
| GET | `/api/audit/compliance` | Get compliance status |

### Providers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/providers` | List LLM providers |
| POST | `/api/providers/test` | Test provider connection |

### Feedback

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/feedback` | Submit user feedback |

## Request/Response Format

### Chat Request

```json
{
  "messages": [
    {"role": "user", "content": "Analyze the security posture of this system"}
  ],
  "model": "anthropic/claude-sonnet-4-5",
  "session_id": "optional-session-id",
  "metadata": {}
}
```

### Chat Response

```json
{
  "content": "Based on the analysis...",
  "model": "claude-sonnet-4-5",
  "usage": {
    "input_tokens": 150,
    "output_tokens": 500
  },
  "finish_reason": "stop"
}
```

## Error Responses

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {}
  }
}
```

## WebSocket Events

Connect to `ws://127.0.0.1:21000/ws` for real-time updates.

### Events

| Event | Description |
|-------|-------------|
| `session:start` | Session started |
| `session:message` | New message in session |
| `session:end` | Session ended |
| `alert:new` | New security alert |
| `scan:progress` | Scan progress update |

## Rate Limits

| Endpoint Category | Limit |
|-------------------|-------|
| Chat | 60 requests/minute |
| Scan | 10 requests/minute |
| Other | 120 requests/minute |

## Related

- [Configuration](/gateway/configuration)
- [Getting Started](/start/getting-started)
