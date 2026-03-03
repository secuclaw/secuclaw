---
summary: "Security overview and best practices for SecuClaw."
read_when:
  - Understanding security features
  - Implementing security best practices
title: "Security Overview"
---

# Security Overview

SecuClaw is designed with security at its core. This document outlines the security features and best practices.

## Security Architecture

### Defense in Depth

SecuClaw implements multiple layers of security:

```
┌─────────────────────────────────────────────────────┐
│                   Network Layer                      │
├─────────────────────────────────────────────────────┤
│                   Application Layer                 │
├─────────────────────────────────────────────────────┤
│                   Data Layer                        │
├─────────────────────────────────────────────────────┤
│                   Identity Layer                    │
└─────────────────────────────────────────────────────┘
```

### Key Security Features

#### 1. Authentication

- **Token-based authentication**: Secure WebSocket connections
- **OAuth support**: For LLM provider authentication
- **API key management**: Encrypted credential storage

#### 2. Authorization

- **Role-based access control (RBAC)**: Fine-grained permissions
- **Session isolation**: Per-agent, per-user, per-channel isolation
- **Channel permissions**: Control access per messaging channel

#### 3. Data Protection

- **Encryption at rest**: Sensitive data encrypted
- **TLS transport**: All communications encrypted
- **Secure storage**: Credentials stored securely

#### 4. Sandboxing

- **Docker-based isolation**: Tools run in containers
- **Resource limits**: CPU, memory, network restrictions
- **Network policies**: Outbound traffic control

## Security Best Practices

### Deployment

1. **Use HTTPS in production**
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

2. **Restrict network access**
   - Use firewall rules
   - Deploy in private network
   - Use VPN for remote access

3. **Enable authentication**
   ```json5
   {
     gateway: {
       auth: {
         token: "${GATEWAY_TOKEN}",
       },
     },
   }
   ```

### Configuration

1. **Use allowlists**
   ```json5
   {
     channels: {
       api: {
         allowFrom: ["10.0.0.0/8", "192.168.0.0/16"],
       },
     },
   }
   ```

2. **Enable sandboxing for tools**
   ```json5
   {
     agents: {
       defaults: {
         sandbox: {
           mode: "all",
           scope: "session",
         },
       },
     },
   }
   ```

3. **Regular config validation**
   ```bash
   secuclaw doctor
   ```

### Operations

1. **Monitor security logs**
   ```bash
   secuclaw logs --level security
   ```

2. **Regular updates**
   ```bash
   secuclaw update
   ```

3. **Backup configuration**
   ```bash
   cp ~/.secuclaw/secuclaw.json ~/.secuclaw/backup/
   ```

## Compliance

SecuClaw supports compliance with:

- **SOC 2**: Security, availability, confidentiality
- **ISO 27001**: Information security management
- **GDPR**: Data protection
- **SCF 2025**: Security Controls Framework

## Incident Response

If you suspect a security incident:

1. **Isolate**: Disable affected channels
2. **Investigate**: Review logs
   ```bash
   secuclaw logs --since "1 hour ago"
   ```
3. **Remediate**: Apply fixes
4. **Report**: Document findings

## Reporting Security Issues

To report security vulnerabilities:

- Email: security@secuclaw.com
- GitHub: https://github.com/secuclaw/secuclaw/security/advisories

---

_Related: [Configuration](/gateway/configuration) · [Troubleshooting](/gateway/troubleshooting)_
