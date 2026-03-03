---
summary: "Remote access configuration for SecuClaw."
read_when:
  - Accessing SecuClaw remotely
  - Setting up VPN access
title: "Remote Access"
---

# Remote Access

Configure remote access to your SecuClaw deployment.

## Options

### 1. Tailscale (Recommended)

Tailscale provides secure remote access without opening ports.

```bash
# Install Tailscale
curl -fsSL https://tailscale.com/install.sh | sh

# Start Tailscale
tailscale up

# Get your Tailscale IP
tailscale ip -4
```

Configure in SecuClaw:

```json5
{
  gateway: {
    remote: {
      tailscale: {
        enabled: true,
      },
    },
  },
}
```

### 2. SSH Tunnel

```bash
# Create SSH tunnel
ssh -N -L 21000:127.0.0.1:21000 user@your-server
```

### 3. VPN

Connect via corporate VPN to access the gateway.

### 4. Reverse Proxy

```nginx
server {
    listen 443 ssl;
    serverName secuclaw.yourcompany.com;

    location / {
        proxy_pass http://127.0.0.1:21000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## Security Considerations

<Warning>
When exposing SecuClaw to the internet, always:
1. Enable authentication
2. Use HTTPS/TLS
3. Implement rate limiting
4. Configure allowlists
</Warning>

### Enable Authentication

```json5
{
  gateway: {
    auth: {
      token: "${SECUCLAW_TOKEN}",
    },
  },
}
```

### Use TLS

```json5
{
  gateway: {
    tls: {
      enabled: true,
      cert: "/path/to/cert.pem",
      key: "/path/to/key.pem",
    },
  },
}
```

## Access URLs

| Method | URL Example |
|--------|-------------|
| Local | http://127.0.0.1:21000 |
| Tailscale | http://100.x.x.x:21000 |
| SSH Tunnel | http://127.0.0.1:21000 |

---

_Related: [Configuration](/gateway/configuration)_
