---
summary: "安全代理初始化流程，包含工作区和身份文件的配置"
read_when:
  - 了解首次代理运行时的行为
  - 说明初始化文件的位置
  - 调试安装身份设置
title: "代理初始化"
sidebarTitle: "初始化"
---

# 代理初始化

初始化是**首次运行**时的准备流程，用于配置安全代理工作区和收集身份详情。
它在安装向导之后、首次启动安全代理时发生。

## 初始化的作用

首次代理运行时，SecuClaw 初始化工作区（默认 `~/.secuclaw/workspace`）：

- 植入 `AGENTS.md`、`BOOTSTRAP.md`、`IDENTITY.md`、`USER.md`、`SECURITY_PROFILE.md`
- 运行简短的问答环节（一次一个问题）
- 收集安全角色偏好和运营上下文
- 将身份和偏好写入 `IDENTITY.md`、`USER.md`、`SECURITY_PROFILE.md`
- 完成后删除 `BOOTSTRAP.md`，确保只运行一次

## 运行位置

初始化始终在**网关主机**上运行。如果您连接到远程网关，
工作区和初始化文件位于该远程机器上。

<Note>
当网关在另一台机器上运行时，在网关主机上编辑工作区文件
（例如 `user@gateway-host:~/.secuclaw/workspace`）。
</Note>

## 安全配置

SecuClaw 代理初始化时附带安全配置，定义：

- **主要角色**：SEC、SEC+LEG、SEC+IT、SEC+BIZ 等
- **运营范围**：代理可访问的系统和数据
- **合规框架**：SOC 2、ISO 27001、GDPR 等
- **响应协议**：SOAR 剧本、升级路径

## 相关文档

- [安全角色](/zh-CN/concepts/security-roles)
- [工作区布局](/zh-CN/concepts/agent-workspace)
- [安装向导](/zh-CN/start/wizard)
