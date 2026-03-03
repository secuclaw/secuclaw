---
summary: "威胁情报集成和能力。"
read_when:
  - 设置威胁源
  - 使用威胁情报
title: "威胁情报"
---

# 威胁情报

SecuClaw与全球威胁情报源集成，增强威胁检测和分析能力。

## 集成框架

<Columns>
  <Card title="MITRE ATT&CK" href="/zh-CN/threat-intel/mitre" icon="target">
    企业、移动、工业控制系统攻击技术。
  </Card>
  <Card title="STIX/TAXII" href="/zh-CN/threat-intel/stix" icon="database">
    结构化威胁情报源。
  </Card>
  <Card title="IOC数据库" href="/zh-CN/threat-intel/ioc" icon="search">
    妥协指标查询。
  </Card>
</Columns>

## 配置

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

### STIX源

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

### 自定义IOC

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

## 使用方法

### 查询威胁情报

```bash
secuclaw intel query --indicator "192.0.2.1"
secuclaw intel query --hash "abc123..."
secuclaw intel query --domain "evil.com"
```

### 映射到ATT&CK

```bash
secuclaw intel map-attack --technique T1566
```

## 能力

- 实时IOC查询
- 攻击技术映射
- 威胁参与者画像
- 活动跟踪
- 风险评分

---

_相关链接：[配置](/zh-CN/gateway/configuration)_
