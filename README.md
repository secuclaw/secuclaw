# SecuClaw - 安爪安全

> AI-Driven Enterprise Security Operations Platform

[English](./README.md) | [中文](./README.zh-CN.md)

---

## Brand Information

| Item | Value |
|------|-------|
| English Name | SecuClaw |
| Chinese Name | 安爪安全 |
| Skill Marketplace | SecuHub |
| Slogan | Guard with Claws, Defend with Intelligence |

## Product Background and Vision

### 1.1 Product Origin

This product stems from a core belief: in the security field, there is no absolute good or evil—only different perspectives.

Traditional security products focus solely on the "defender" perspective, concentrating on building defenses, detecting threats, and responding to incidents. However, a true security commander must possess "all-angle" thinking—capable of thinking like a white-hat hacker to map attack paths, like a legal consultant to assess compliance risks, and like a business leader to balance security with efficiency.

SecuClaw emerges from this need, organically combining four core professional capabilities: legal, security, IT, and business. From single-role to multi-role integration, it creates compound security assistants with "light and shadow" dual extreme abilities for everyone. With AI as its core, SecuClaw empowers individuals to make rapid decisions and collaborate across boundaries in complex security scenarios, enabling every security professional to become a "versatile commander" capable of handling any situation.

However, individual capability improvement is only one step in security evolution. True security defense requires team wisdom resonance, continuous knowledge accumulation, and seamless tool collaboration. This is why we launched SecuHub—an open collaboration hub for security teams.

### 1.2 Vision: Security Intelligence Symbiosis

If SecuClaw is a super assistant that grants individuals "all-angle" capabilities, then SecuHub is the "Security Intelligence Symbiosis" that enables these super individuals to connect seamlessly and evolve together—an AI-driven, human-machine symbiotic, self-evolving security operations hub.

Here, each SecuClaw is both an independent decision node and part of a global intelligent network. Threat intelligence, offensive/defensive experience, compliance frameworks, and business context flow in real-time through federated learning and knowledge graphs, forming collective wisdom that surpasses the sum of individuals. SecuHub is no longer just a platform but the "digital nervous system" that security teams depend on for survival, moving defense from passive response to proactive cognition and collective intelligence.

We believe the future of security is not the accumulation of islands, but the emergence of networked intelligence—SecuClaw and SecuHub together form the cornerstone of this vision: SecuClaw empowers individuals, SecuHub connects the collective, and together they redefine security.

## Project Structure

```
secuclaw/
├── packages/
│   ├── core/          # Core Engine - Security analysis, threat detection, incident response
│   ├── web/           # Web Interface - Visual security console
│   ├── cli/          # Command Line Tools - Terminal security operations
│   └── knowledge/    # Knowledge Base - MITRE ATT&CK, vulnerability database, threat intelligence
├── docs/              # Documentation
│   ├── api/          # API Documentation
│   ├── deployment/   # Deployment Guide
│   └── user-manual/  # User Manual
├── helm/              # Kubernetes Deployment Configurations
└── data/              # Data Files
```

## Core Features

- **8 Security Roles**: Security Commander, Threat Hunter, Incident Response Expert, Penetration Testing Expert, Compliance Auditor, Vulnerability Analyst, Security Architect, Emergency Commander
- **68+ Security Tools**: Attack simulation, defense analysis, vulnerability scanning, threat detection, malware analysis, network forensics, log auditing, penetration testing
- **Intelligent Routing**: Automatically selects the best LLM model based on task type, supports multi-model collaboration
- **Threat Intelligence**: Integrates MISP, OTX, TAXII and other major intelligence sources
- **Compliance Audit**: Supports ISO 27001, SOC 2, PCI-DSS, GDPR, SCF 2025 frameworks
- **Knowledge Graph**: Deep integration with MITRE ATT&CK and SCF 2025 frameworks
- **Multiple Deployment Options**: Supports Docker, Kubernetes, local deployment
- **Enterprise Security**: Complete authentication, authorization, and auditing mechanisms

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Docker (optional, for container deployment)
- Kubernetes (optional, for cluster deployment)

### Installation

```bash
# 1. Clone the project
git clone https://git.example.com/org/repo.git
cd secuclaw

# 2. Install dependencies
pnpm install

# 3. Download knowledge base data
pnpm run download-mitre

# 4. Configure environment variables
cp .env.example .env
# Edit .env file to configure necessary environment variables

# 5. Start development server
pnpm run dev
```

### Docker Deployment

```bash
# Build image
docker build -t secuclaw:latest .

# Run container
docker run -d -p 3000:3000 --env-file .env secuclaw:latest
```

### Kubernetes Deployment

```bash
# Add Helm repository
helm repo add secuclaw https://charts.secuclaw.com
helm repo update

# Install SecuClaw
helm install secuclaw secuclaw/secuclaw -f values.yaml
```

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Runtime environment | `development` | No |
| `PORT` | Service port | `3000` | No |
| `DATABASE_URL` | Database connection string | - | Yes |
| `JWT_SECRET` | JWT secret | - | Yes |
| `ALLOWED_ORIGINS` | CORS allowed origins | `localhost` | No |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `60000` | No |
| `RATE_LIMIT_MAX_REQUESTS` | Rate limit max requests | `100` | No |

### Authentication Configuration

SecuClaw supports multiple authentication methods:

- **Token Authentication**: Use static token for identity verification
- **Password Authentication**: Use username and password for authentication
- **Tailscale Authentication**: Identity verification based on Tailscale network

## API Endpoints

### Authentication

```
POST /api/auth/login     - User login
POST /api/auth/logout   - User logout
GET  /api/auth/verify   - Verify token
```

### Security Analysis

```
POST /api/analyze        - Analyze threat
POST /api/scan          - Scan vulnerability
GET  /api/threats       - Get threat list
GET  /api/threats/:id  - Get threat details
```

### Knowledge Base

```
GET  /api/knowledge/search     - Search knowledge base
GET  /api/knowledge/mitre       - Get MITRE ATT&CK data
GET  /api/knowledge/cves        - Get CVE data
```

For detailed API documentation, see [docs/api/](docs/api/)

## Security Policy

### Vulnerability Disclosure

We attach great importance to the discovery and remediation of security vulnerabilities. If you discover security vulnerabilities, please contact us through:

1. **Email**: security@secuclaw.com
2. **GitHub Issues**: Create an Issue with Security label

We commit to:
- Responding to security vulnerability reports within 24 hours
- Releasing security patches in a timely manner
- Publicly acknowledging security researchers

### Security Features

- **Encrypted Storage**: Sensitive data encrypted with AES-256
- **Secure Transport**: Mandatory HTTPS site-wide
- **Input Validation**: All user input strictly validated
- **Rate Limiting**: Prevents brute force and DoS attacks
- **Audit Logs**: Complete security event logging
- **Regular Updates**: Regular dependency updates to fix known vulnerabilities

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) to learn how to participate in project development.

### Development Process

1. Fork the project
2. Create feature branch (`git checkout -b feature/xxx`)
3. Commit changes (`git commit -m 'Add xxx'`)
4. Push branch (`git push origin feature/xxx`)
5. Create Pull Request

## License

MIT License

## Contact

- Website: https://www.secuclaw.com
- Documentation: https://docs.secuclaw.com
- Community: https://community.secuclaw.com
- Email: hello@secuclaw.com
