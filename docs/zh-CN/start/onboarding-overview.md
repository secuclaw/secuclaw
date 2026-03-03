---
summary: "SecuClaw 安装选项和流程概览"
read_when:
  - 选择安装路径
  - 设置新环境
title: "安装概览"
sidebarTitle: "安装概览"
---

# 安装概览

SecuClaw 支持多种安装路径，具体取决于网关运行位置和您偏好的 AI 提供商配置方式。

## 选择您的安装路径

- **CLI 向导**：适用于 macOS、Linux 和 Windows（通过 WSL2）
- **手动设置**：适用于希望完全控制的高级用户

## CLI 安装向导

在终端中运行向导：

```bash
secuclaw onboard
```

当您希望完全控制网关、安全代理、数据源和合规设置时使用 CLI 向导。文档：

- [安装向导 (CLI)](/zh-CN/start/wizard)
- [`secuclaw onboard` 命令](/zh-CN/cli/onboard)

## 手动设置

适用于偏好手动配置的高级用户：

```bash
secuclaw init
secuclaw configure
```

手动设置允许您：
- 直接编辑配置：`~/.secuclaw/secuclaw.json`
- 配置自定义 AI 提供商
- 设置特定的安全数据源
- 手动定义合规框架

## 自定义提供商

如果您需要未列出的端点（包括托管的、提供标准 OpenAI 或 Anthropic API 的提供商），
在 CLI 向导中选择**自定义提供商**。系统会询问您：

- 选择 OpenAI 兼容、Anthropic 兼容或**未知**（自动检测）
- 输入基础 URL 和 API 密钥（如果提供商需要）
- 提供模型 ID 和可选别名
- 选择端点 ID 以便多个自定义端点共存

有关详细步骤，请遵循上述 CLI 安装文档。
