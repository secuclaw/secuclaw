---
summary: "在几分钟内开始使用SecuClaw。"
read_when:
  - 新用户设置SecuClaw
  - 快速入门指南
title: "快速开始"
---

# 快速开始

本指南将帮助您在几分钟内运行SecuClaw。

## 前置要求

- Node.js 22+
- npm、pnpm或bun
- Anthropic API密钥（推荐）

## 步骤1：安装

```bash
npm install -g secuclaw@latest
```

验证安装：

```bash
secuclaw --version
```

## 步骤2：初始化

```bash
secuclaw init
```

## 步骤3：配置（可选）

```bash
secuclaw configure
```

## 步骤4：启动网关

```bash
secuclaw gateway
```

## 步骤5：访问控制台

打开浏览器：http://127.0.0.1:21000/

## 下一步

<Columns>
  <Card title="配置安全源" href="/zh-CN/gateway/configuration">
    连接SIEM、防火墙、EDR数据源。
  </Card>
  <Card title="探索安全角色" href="/zh-CN/concepts/security-roles">
    了解专业安全代理。
  </Card>
  <Card title="SOAR自动化" href="/zh-CN/automation">
    创建自动化响应剧本。
  </Card>
</Columns>

## 常见命令

```bash
secuclaw health
secuclaw logs
secuclaw update
```

## 故障排除

```bash
secuclaw doctor
```
