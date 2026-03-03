---
summary: "工具的沙盒执行环境。"
read_when:
  - 了解沙盒安全
  - 配置沙盒选项
title: "沙盒"
---

# 沙盒

SecuClaw提供安全的沙盒环境来执行安全工具。

## 概述

沙盒隔离工具执行以防止未经授权的系统访问。

```
┌─────────────────────────────────────────┐
│           工具执行                       │
├─────────────────────────────────────────┤
│  主机系统（受保护）                      │
├─────────────────────────────────────────┤
│  Docker容器（隔离）                      │
│  ├─ 受限制的文件系统                    │
│  ├─ 有限的网络访问                      │
│  └─ 资源限制（CPU/内存）                │
└─────────────────────────────────────────┘
```

## 配置

```json5
{
  sandbox: {
    enabled: true,
    provider: "docker",
    image: "secuclaw-sandbox:bookworm-slim",
    networkMode: "none",  // none | bridge | host
    resourceLimits: {
      cpu: 1,
      memory: "512m",
      disk: "1g",
    },
    allowedCommands: ["nmap", "curl", "python3"],
    filesystem: {
      readonly: ["/etc", "/var"],
      writable: ["/tmp"],
    },
  },
}
```

## 模式

| 模式 | 描述 |
|------|-------------|
| `off` | 无沙盒，工具直接运行 |
| `non-main` | 仅非关键工具使用沙盒 |
| `all` | 所有工具在沙盒中运行 |

## 安全

- **网络隔离**：默认无外部网络
- **文件系统限制**：只读系统目录
- **资源限制**：防止资源耗尽
- **超时**：最大执行时间限制

## 使用方法

```bash
# 在沙盒中运行工具
secuclaw tools run nmap --target 10.0.0.1 --sandbox

# 沙盒状态
secuclaw sandbox status
```
