---
summary: "内置安全工具和能力。"
read_when:
  - 使用安全工具
  - 了解工具能力
title: "安全工具"
---

# 安全工具

SecuClaw包含一套全面的内置安全工具用于分析和评估。

## 工具类别

<Columns>
  <Card title="攻击模拟" href="/zh-CN/tools/attack" icon="crosshair">
    模拟攻击场景。
  </Card>
  <Card title="防御评估" href="/zh-CN/tools/defense" icon="shield">
    评估安全控制。
  </Card>
  <Card title="分析" href="/zh-CN/tools/analysis" icon="search">
    安全数据分析。
  </Card>
  <Card title="评估" href="/zh-CN/tools/assessment" icon="clipboard">
    漏洞评估。
  </Card>
</Columns>

## 内置工具

### 攻击工具

| 工具 | 描述 |
|------|-------------|
| `attack_simulate_phishing` | 模拟钓鱼活动 |
| `attack_simulate_malware` | 测试恶意软件检测 |
| `attack_path_discovery` | 映射攻击路径 |

### 防御工具

| 工具 | 描述 |
|------|-------------|
| `defense_assess_firewall` | 评估防火墙规则 |
| `defense_assess_acl` | 检查访问控制列表 |
| `defense_check_monitoring` | 验证监控覆盖 |

### 分析工具

| 工具 | 描述 |
|------|-------------|
| `analyze_log` | 分析安全日志 |
| `analyze_network` | 网络流量分析 |
| `analyze_behavior` | 用户行为分析 |

### 评估工具

| 工具 | 描述 |
|------|-------------|
| `assess_vulnerability` | 漏洞扫描 |
| `assess_config` | 配置审查 |
| `assess_compliance` | 合规检查 |

## 使用方法

```bash
# 运行攻击模拟
secuclaw tools run attack_simulate_phishing --target user@company.com

# 评估防火墙
secuclaw tools run defense_assess_firewall --device firewall-01

# 分析日志
secuclaw tools run analyze_log --source firewall --hours 24
```

## 自定义工具

使用自定义工具扩展SecuClaw：

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

_相关链接：[配置](/zh-CN/gateway/configuration)_
