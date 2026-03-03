---
summary: "Health monitoring and diagnostics."
read_when:
  - Monitoring gateway health
  - Troubleshooting issues
title: "Health & Monitoring"
---

# Health & Monitoring

SecuClaw provides health checks and monitoring capabilities.

## Health Check

```bash
# Basic health
secuclaw health

# Detailed status
secuclaw status

# Deep probe
secuclaw status --deep
```

## Metrics

| Metric | Description |
|--------|-------------|
| Uptime | Gateway running time |
| Memory | Current memory usage |
| CPU | CPU utilization |
| Sessions | Active session count |
| Alerts | Pending alert count |

## Logging

```bash
# View logs
secuclaw logs

# Filter by level
secuclaw logs --level error

# Follow logs
secuclaw logs --follow

# Time filter
secuclaw logs --since "1 hour ago"
```

## Diagnostics

```bash
# Run diagnostics
secuclaw doctor

# Auto-fix issues
secuclaw doctor --fix

# Detailed report
secuclaw doctor --verbose
```

## Prometheus Metrics

Enable Prometheus endpoint:

```json5
{
  monitoring: {
    prometheus: {
      enabled: true,
      port: 9090,
      path: "/metrics",
    },
  },
}
```

Scrape metrics:

```bash
curl http://127.0.0.1:9090/metrics
```

## Available Metrics

- `secuclaw_sessions_active` - Active sessions
- `secuclaw_alerts_total` - Total alerts
- `secuclaw_memory_used_bytes` - Memory usage
- `secuclaw_cpu_percent` - CPU usage
- `secuclaw_requests_total` - Total requests
