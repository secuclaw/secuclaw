---
summary: "Built-in security tools and capabilities."
read_when:
  - Using security tools
  - Understanding tool capabilities
title: "Security Tools"
---

# Security Tools

SecuClaw includes a comprehensive set of built-in security tools for analysis and assessment.

## Tool Categories

<Columns>
  <Card title="Attack Simulation" href="/tools/attack" icon="crosshair">
    Simulate attack scenarios.
  </Card>
  <Card title="Defense Assessment" href="/tools/defense" icon="shield">
    Evaluate security controls.
  </Card>
  <Card title="Analysis" href="/tools/analysis" icon="search">
    Security data analysis.
  </Card>
  <Card title="Assessment" href="/tools/assessment" icon="clipboard">
    Vulnerability assessment.
  </Card>
</Columns>

## Built-in Tools

### Attack Tools

| Tool | Description |
|------|-------------|
| `attack_simulate_phishing` | Simulate phishing campaigns |
| `attack_simulate_malware` | Test malware detection |
| `attack_path_discovery` | Map attack paths |

### Defense Tools

| Tool | Description |
|------|-------------|
| `defense_assess_firewall` | Evaluate firewall rules |
| `defense_assess_acl` | Check access control lists |
| `defense_check_monitoring` | Verify monitoring coverage |

### Analysis Tools

| Tool | Description |
|------|-------------|
| `analyze_log` | Analyze security logs |
| `analyze_network` | Network traffic analysis |
| `analyze_behavior` | User behavior analysis |

### Assessment Tools

| Tool | Description |
|------|-------------|
| `assess_vulnerability` | Vulnerability scanning |
| `assess_config` | Configuration review |
| `assess_compliance` | Compliance checking |

## Usage

```bash
# Run attack simulation
secuclaw tools run attack_simulate_phishing --target user@company.com

# Assess firewall
secuclaw tools run defense_assess_firewall --device firewall-01

# Analyze logs
secuclaw tools run analyze_log --source firewall --hours 24
```

## Custom Tools

Extend SecuClaw with custom tools:

```json5
{
  tools: {
    custom: [
      {
        name: "custom_scanner",
        type: "http",
        endpoint: "https://scanner.example.com/api",
        auth: "apiKey",
      },
    ],
  },
}
```

---

_Related: [Configuration](/gateway/configuration)_
