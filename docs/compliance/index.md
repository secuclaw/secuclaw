---
summary: "Compliance management and reporting."
read_when:
  - Setting up compliance frameworks
  - Generating compliance reports
title: "Compliance"
---

# Compliance

SecuClaw provides comprehensive compliance management for multiple regulatory frameworks.

## Supported Frameworks

<Columns>
  <Card title="SCF 2025" href="/compliance/scf" icon="file-check">
    Security Controls Framework - 33 domains.
  </Card>
  <Card title="SOC 2" href="/compliance/soc2" icon="shield">
    Service Organization Control.
  </Card>
  <Card title="ISO 27001" href="/compliance/iso27001" icon="lock">
    Information Security Management.
  </Card>
  <Card title="GDPR" href="/compliance/gdpr" icon="user-check">
    General Data Protection Regulation.
  </Card>
</Columns>

## Configuration

### Enable Frameworks

```json5
{
  compliance: {
    enabled: true,
    frameworks: ["SCF2025", "SOC2", "ISO27001"],
    autoRemediation: true,
    reportingInterval: "monthly",
  },
}
```

### SCF 2025 Domains

| Domain | Controls |
|--------|----------|
| Access Control | 15+ controls |
| Asset Management | 12+ controls |
| Business Continuity | 10+ controls |
| Cryptography | 8+ controls |
| Incident Response | 14+ controls |
| ... | ... |

## Compliance Status

View compliance status:

```bash
secuclaw compliance status
secuclaw compliance status --framework SCF2025
```

## Generate Reports

```bash
# Generate compliance report
secuclaw compliance report --framework SOC2 --format pdf

# Export audit evidence
secuclaw compliance export --framework ISO27001 --output ./evidence/
```

## Control Mapping

```json5
{
  compliance: {
    controlMappings: [
      {
        scf: "AC-1",
        soc2: "CC6.1",
        iso27001: "A.9.1",
        description: "Access Control Policy",
      },
    ],
  },
}
```

## Gap Analysis

```bash
# Run gap analysis
secuclaw compliance gap --framework SCF2025
```

---

_Related: [Configuration](/gateway/configuration)_
