---
summary: "CLI安装向导：网关、安全代理和配置的引导式设置"
read_when:
  - 运行或配置安装向导
  - 设置新环境
title: "安装向导 (CLI)"
sidebarTitle: "安装向导: CLI"
---

# 安装向导 (CLI)

安装向导是在 macOS、Linux 或 Windows（通过 WSL2）上设置 SecuClaw 的**推荐**方式。
它在一个引导流程中配置本地网关、安全代理、数据源和合规设置。

```bash
secuclaw onboard
```

<Info>
最快体验：打开安全控制台（无需数据源设置）。运行 `secuclaw console`，在浏览器中访问 http://127.0.0.1:21000/。</Info>

后续重新配置：

```bash
secuclaw configure
secuclaw agents add <name>
```

<Tip>
推荐：设置 Anthropic API 密钥，以便安全代理可以使用高级 AI 能力。
最简单的方式：`secuclaw configure --section agents` 配置 AI 提供商。</Tip>

## 快速开始 vs 高级模式

向导提供**快速开始**（默认）和**高级**（完全控制）两种模式。

<Tabs>
  <Tab title="快速开始（默认）">
    - 本地网关（loopback）
    - 默认安全工作区
    - 网关端口 **21000**
    - 网关认证 **Token**（自动生成）
    - Tailscale 暴露 **关闭**
    - 默认安全角色：**SEC**（安全分析师）
  </Tab>
  <Tab title="高级（完全控制）">
    - 展示每个步骤（模式、工作区、网关、代理、数据源、合规）。
  </Tab>
</Tabs>

## 向导配置内容

**本地模式（默认）**引导您完成以下步骤：

1. **模型/认证** — Anthropic API 密钥（推荐）、OpenAI 或自定义提供商
   （OpenAI兼容、Anthropic兼容或未知自动检测）。选择默认模型。
2. **安全角色** — 选择主要角色：SEC、SEC+LEG、SEC+IT、SEC+BIZ 或自定义。
3. **工作区** — 安全数据和代理文件的位置（默认 `~/.secuclaw/workspace`）。
4. **网关** — 端口、绑定地址、认证模式、Tailscale 暴露。
5. **数据源** — 可选：SIEM、防火墙、EDR 集成。
6. **合规** — 可选：SOC 2、ISO 27001、GDPR 框架。
7. **守护进程** — 安装 LaunchAgent（macOS）或 systemd 用户单元（Linux/WSL2）。
8. **健康检查** — 启动网关并验证运行状态。

<Note>
重新运行向导**不会**清除任何内容，除非您明确选择**重置**（或传递 `--reset`）。
如果配置无效或包含旧密钥，向导会提示您先运行 `secuclaw doctor`。</Note>

**远程模式**仅配置本地客户端连接到其他地方的网关。
它**不会**在远程主机上安装或更改任何内容。

## 添加另一个安全代理

使用 `secuclaw agents add <name>` 创建具有独立工作区、会话和配置的安全代理。
不带 `--workspace` 运行将启动向导。

设置内容：

- `agents.list[].name`
- `agents.list[].role`
- `agents.list[].workspace`

注意：

- 默认工作区遵循 `~/.secuclaw/workspace-<agentId>`
- 添加 `bindings` 来路由入站请求（向导可以完成）
- 非交互标志：`--model`、`--role`、`--agent-dir`、`--bind`、`--non-interactive`

## 完整参考

有关详细的分步说明、非交互式脚本、RPC API，
以及向导写入的配置字段完整列表，请参阅
[向导参考](/reference/wizard)。

## 相关文档

- CLI 命令参考：[`secuclaw onboard`](/zh-CN/cli/onboard)
- 安装概览：[安装概览](/zh-CN/start/onboarding-overview)
- 代理初始化：[代理初始化](/zh-CN/start/bootstrapping)
