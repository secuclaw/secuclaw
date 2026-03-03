---
summary: "合规管理和报告。"
read_when:
  - 设置合规框架
  - 生成合规报告
title: "合规"
---

# 合规

SecuClaw为多个监管框架提供全面的合规管理。

## 支持的框架

<Columns>
  <Card title="SCF 2025" href="/zh-CN/compliance/scf" icon="file-check">
    安全控制框架 - 33个域。
  </Card>
  <Card title="SOC 2" href="/zh-CN/compliance/soc2" icon="shield">
    服务组织控制。
  </Card>
  <Card title="ISO 27001" href="/zh-CN/compliance/iso27001" icon="lock">
    信息安全管理。
  </Card>
  <Card title="GDPR" href="/zh-CN/compliance/gdpr" icon="user-check">
    通用数据保护条例。
  </Card>
</Columns>

## 配置

### 启用框架

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

### SCF 2025域

| 域 | 控制项 |
|--------|----------|
| 访问控制 | 15+ 控制项 |
| 资产管理 | 12+ 控制项 |
| 业务连续性 | 10+ 控制项 |
| 加密 | 8+ 控制项 |
| 事件响应 | 14+ 控制项 |
| ... | ... |

## 合规状态

查看合规状态：

```bash
secuclaw compliance status
secuclaw compliance status --framework SCF2025
```

## 生成报告

```bash
# 生成合规报告
secuclaw compliance report --framework SOC2 --format pdf

# 导出审计证据
secuclaw compliance export --framework ISO27001 --output ./evidence/
```

## 控制项映射

```json5
{
  compliance: {
    controlMappings: [
      {
        scf: "AC-1",
        soc2: "CC6.1",
        iso27001: "A.9.1",
        description: "访问控制策略",
      },
    ],
  },
}
```

## 差距分析

```bash
# 运行差距分析
secuclaw compliance gap --framework SCF2025
```

---

_相关链接：[配置](/zh-CN/gateway/configuration)_
