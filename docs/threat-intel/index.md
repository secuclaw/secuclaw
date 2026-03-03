---
summary: "Threat intelligence integration and capabilities."
read_when:
  - Setting up threat feeds
  - Using threat intelligence
title: "Threat Intelligence"
---

# Threat Intelligence

SecuClaw integrates with global threat intelligence feeds for enhanced threat detection and analysis.

## Integrated Frameworks

<Columns>
  <Card title="MITRE ATT&CK" href="/threat-intel/mitre" icon="target">
    Enterprise, Mobile, ICS attack techniques.
  </Card>
  <Card title="STIX/TAXII" href="/threat-intel/stix" icon="database">
    Structured threat intelligence feeds.
  </Card>
  <Card title="IOC Database" href="/threat-intel/ioc" icon="search">
    Indicator of Compromise lookup.
  </Card>
</Columns>

## Configuration

### MITRE ATT&CK

```json5
{
  threatIntel: {
    mitre: {
      enabled: true,
      version: "v18.1",
      matrices: ["enterprise", "mobile", "ics"],
    },
  },
}
```

### STIX Feeds

```json5
{
  threatIntel: {
    stix: {
      enabled: true,
      feeds: [
        {
          name: "AlienVault OTX",
          url: "https://otx.alienvault.com/api/v1/pulses/subscribed",
          apiKey: "${OTX_API_KEY}",
        },
        {
          name: "MISP",
          url: "https://misp.example.com",
          apiKey: "${MISP_API_KEY}",
        },
      ],
    },
  },
}
```

### Custom IOCs

```json5
{
  threatIntel: {
    custom: {
      enabled: true,
      indicators: [
        {
          type: "ipv4",
          value: "192.0.2.1",
          confidence: 90,
          tags: ["malware-c2"],
        },
        {
          type: "hash",
          value: "abc123...",
          confidence: 100,
          tags: ["ransomware"],
        },
      ],
    },
  },
}
```

## Usage

### Query Threat Intel

```bash
secuclaw intel query --indicator "192.0.2.1"
secuclaw intel query --hash "abc123..."
secuclaw intel query --domain "evil.com"
```

### Map to ATT&CK

```bash
secuclaw intel map-attack --technique T1566
```

## Capabilities

- Real-time IOC lookup
- Attack technique mapping
- Threat actor profiles
- Campaign tracking
- Risk scoring

---

_Related: [Configuration](/gateway/configuration)_
