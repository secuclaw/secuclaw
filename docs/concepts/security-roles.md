---
summary: "Specialized security roles in SecuClaw for different operational needs."
read_when:
  - Understanding security agent capabilities
  - Choosing the right role for your needs
title: "Security Roles"
---

# Security Roles

SecuClaw provides specialized AI security agents, each designed for specific security operations needs.

## Role Overview

| Role | Code | Capabilities | Use Case |
|------|------|--------------|----------|
| Security Expert | SEC | Threat analysis, vulnerability assessment | General security operations |
| Privacy Security Officer | SEC+LEG | Privacy compliance, data protection | GDPR, CCPA compliance |
| Security Architect | SEC+IT | Infrastructure security, architecture review | Cloud security, network security |
| Business Security Officer | SEC+BIZ | Risk alignment, business continuity | Enterprise risk management |
| Chief Security Architect | CSO | Enterprise strategy, governance | C-level security leadership |
| Supply Chain Security | SCSO | Vendor risk, third-party security | Supply chain risk management |
| Business Security Operations | BSO | SOC operations, incident response | Day-to-day security operations |

## Detailed Role Capabilities

### SEC - Security Expert

The foundational security agent role for general security operations.

**Capabilities:**
- Threat analysis and assessment
- Vulnerability identification
- Security event analysis
- Incident investigation guidance
- Security best practices recommendations

**Best for:**
- General security inquiries
- Vulnerability assessments
- Security event triage
- Risk identification

### SEC+LEG - Privacy Security Officer

Combines security expertise with legal compliance knowledge.

**Capabilities:**
- Privacy regulation compliance (GDPR, CCPA, LGPD)
- Data protection impact assessments
- Privacy policy review
- Data breach response
- Consent management

**Best for:**
- Privacy compliance questions
- Data protection assessments
- Regulatory compliance
- Privacy policy review

### SEC+IT - Security Architect

Combines security expertise with IT infrastructure knowledge.

**Capabilities:**
- Architecture security review
- Cloud security assessment
- Network security design
- Zero trust implementation
- DevSecOps integration

**Best for:**
- Infrastructure security
- Architecture reviews
- Cloud security
- Network segmentation

### SEC+BIZ - Business Security Officer

Combines security expertise with business alignment.

**Capabilities:**
- Business risk assessment
- Security strategy alignment
- ROI analysis for security
- Business continuity planning
- Third-party risk

**Best for:**
- Executive security咨询
- Risk prioritization
- Budget planning
- Business impact analysis

### CSO - Chief Security Architect

Enterprise-wide security leadership role.

**Capabilities:**
- Enterprise security strategy
- Governance framework design
- Security policy development
- Board-level reporting
- M&A security due diligence

**Best for:**
- Strategic security planning
- Governance development
- Executive briefings
- Security transformation

### SCSO - Supply Chain Security Officer

Specialized in third-party and supply chain security.

**Capabilities:**
- Vendor risk assessment
- Third-party security review
- Supply chain threat analysis
- Contract security clauses
- Fourth-party monitoring

**Best for:**
- Vendor assessments
- Supply chain security
- Third-party risk
- Contract reviews

### BSO - Business Security Operations

Day-to-day security operations management.

**Capabilities:**
- SOC alert triage
- Incident response coordination
- Security monitoring
- Compliance reporting
- Team coordination

**Best for:**
- SOC operations
- Incident management
- Daily security tasks
- Team leadership

## Choosing the Right Role

<AccordionGroup>
  <Accordion title="What type of security question do you have?">
    - **Technical security issue** → SEC or SEC+IT
    - **Compliance question** → SEC+LEG
    - **Business risk** → SEC+BIZ
    - **Strategic planning** → CSO
    - **Vendor/Supply chain** → SCSO
    - **Daily operations** → BSO
  </Accordion>
  <Accordion title="What is your role in the organization?">
    - **Security analyst** → SEC
    - **Compliance officer** → SEC+LEG
    - **Security architect** → SEC+IT
    - **CISO/Executive** → CSO
    - **Procurement** → SCSO
    - **SOC manager** → BSO
  </Accordion>
</AccordionGroup>

## Multi-Role Coordination

For complex security challenges, multiple roles can collaborate:

```json5
{
  agents: {
    list: [
      { id: "sec", role: "SEC" },
      { id: "legal", role: "SEC+LEG" },
      { id: "arch", role: "SEC+IT" },
    ],
  },
  bindings: [
    { agentId: "sec", match: { channel: "console" } },
    { agentId: "legal", match: { topic: "compliance" } },
    { agentId: "arch", match: { topic: "architecture" } },
  ],
}
```

## Role Capabilities Matrix

| Capability | SEC | SEC+LEG | SEC+IT | SEC+BIZ | CSO | SCSO | BSO |
|------------|:---:|:-------:|:------:|:-------:|:---:|:----:|:---:|
| Threat Analysis | ✅ | ⚠️ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ |
| Vulnerability Assessment | ✅ | ❌ | ✅ | ❌ | ❌ | ⚠️ | ✅ |
| Privacy Compliance | ❌ | ✅ | ❌ | ⚠️ | ⚠️ | ⚠️ | ❌ |
| Architecture Review | ⚠️ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Risk Assessment | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Incident Response | ✅ | ⚠️ | ⚠️ | ❌ | ❌ | ❌ | ✅ |
| Compliance Reporting | ⚠️ | ✅ | ❌ | ✅ | ✅ | ⚠️ | ✅ |
| Strategic Planning | ❌ | ❌ | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ |

**Legend:** ✅ Full capability | ⚠️ Partial capability | ❌ Not primary capability
