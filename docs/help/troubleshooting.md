---
summary: "Troubleshooting common issues."
read_when:
  - Gateway won't start
  - Connection problems
title: "Troubleshooting"
---

# Troubleshooting

Solutions to common issues with SecuClaw.

## Gateway Issues

### Gateway Won't Start

**Symptoms**: `secuclaw gateway` fails to start

**Solutions**:
```bash
# Check configuration
secuclaw doctor

# Verify port is available
lsof -i :21000

# Check logs
secuclaw logs --level error
```

### Port Already in Use

**Symptoms**: `Error: listen EADDRINUSE: address already in use`

**Solutions**:
```bash
# Find process using port
lsof -i :21000

# Kill existing process
kill <PID>

# Or use different port
secuclaw gateway --port 18790
```

## Configuration Issues

### Invalid Configuration

**Symptoms**: Gateway refuses to start with validation error

**Solutions**:
```bash
# Validate config
secuclaw doctor --fix

# Check config syntax
cat ~/.secuclaw/secuclaw.json | python3 -m json.tool
```

### Missing API Keys

**Symptoms**: `Error: API key not found`

**Solutions**:
```bash
# Set API key
export ANTHROPIC_API_KEY="sk-ant-..."

# Or add to config
secuclaw config set models.providers.anthropic.apiKey "sk-ant-..."
```

## Connection Issues

### Can't Connect to Gateway

**Symptoms**: Web UI shows "Connection refused"

**Solutions**:
```bash
# Check if gateway is running
secuclaw health

# Check port binding
ss -ltnp | grep 21000

# Check firewall
iptables -L -n
```

### WebSocket Connection Failed

**Symptoms**: Console disconnects frequently

**Solutions**:
```bash
# Check network
ping 127.0.0.1

# Verify WebSocket
curl -i http://127.0.0.1:21000/health
```

## Performance Issues

### High Memory Usage

**Symptoms**: Gateway uses excessive memory

**Solutions**:
```json5
{
  session: {
    maxHistory: 100,
    compaction: {
      enabled: true,
      threshold: 50,
    },
  },
}
```

### Slow Response

**Symptoms**: Agent takes long to respond

**Solutions**:
- Check LLM provider status
- Increase timeout settings
- Enable caching

## Getting Help

```bash
# Run diagnostics
secuclaw doctor

# Get verbose logs
secuclaw logs --level debug

# Check system status
secuclaw status
```

---

_Related: [Configuration](/gateway/configuration)_
