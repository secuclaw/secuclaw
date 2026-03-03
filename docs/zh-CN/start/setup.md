---
summary: "SecuClaw 高级设置和开发工作流程"
read_when:
  - 设置新机器
  - 希望使用最新版本同时不破坏现有设置
title: "设置"
---

# 设置

<Note>
如果这是您第一次设置，请从[快速入门](/zh-CN/start/getting-started)开始。
有关向导详情，请参阅[安装向导](/zh-CN/start/wizard)。</Note>

## 简述

- **配置位于仓库外：** `~/.secuclaw/secuclaw.json`（配置）
- **工作区：** `~/.secuclaw/workspace`（安全数据、配置）
- **从源码运行：** `pnpm build && pnpm gateway:watch`

## 前提条件（从源码）

- Node `>=22`
- `pnpm`
- Docker（可选；用于沙箱工具执行）

## 定制策略（以便更新不破坏配置）

如果您希望"完全定制"同时便于更新，请将您的自定义配置保留在：

- **配置：** `~/.secuclaw/secuclaw.json`（JSON/JSON5）
- **工作区：** `~/.secuclaw/workspace`（安全配置、剧本、威胁情报）

初始化一次：

```bash
secuclaw setup
```

## 从源码运行网关

构建后，可以直接运行打包的 CLI：

```bash
node secuclaw.mjs gateway --port 21000 --verbose
```

## 标准工作流程

1. 安装 SecuClaw：`npm install -g secuclaw@latest`
2. 运行设置：`secuclaw setup`
3. 配置：`secuclaw configure`
4. 启动网关：`secuclaw gateway`

### 验证

```bash
secuclaw health
```

## 开发工作流程（终端中的网关）

目标：使用热重载开发 TypeScript 网关。

```bash
pnpm install
pnpm gateway:watch
```

`gateway:watch` 在监视模式下运行网关，检测到 TypeScript 变化时自动重载。

## 配置文件

调试或决定备份内容时使用此参考：

- **AI 提供商凭据：** `~/.secuclaw/credentials/`
- **安全代理会话：** `~/.secuclaw/agents/<agentId>/sessions/`
- **日志：** `~/.secuclaw/logs/`
- **配置：** `~/.secuclaw/secuclaw.json`

## 更新（不破坏现有设置）

- 保持 `~/.secuclaw/workspace` 和 `~/.secuclaw/` 为"您的内容"
- 不要将个人配置放入 `secuclaw` 仓库
- 更新源码：`git pull` + `pnpm install`

## Linux（systemd 用户服务）

Linux 安装使用 systemd **用户**服务。默认情况下，systemd 在注销/空闲时停止用户服务，
这会终止网关。安装向导会尝试为您启用 linger（可能提示需要 sudo）。如果仍然关闭，请运行：

```bash
sudo loginctl enable-linger $USER
```

对于始终运行或多用户服务器，请考虑使用**系统**服务而非用户服务。

## 相关文档

- [网关运维手册](/zh-CN/gateway)（标志、监控、端口）
- [网关配置](/zh-CN/gateway/configuration)（配置架构和示例）
- [安全角色](/zh-CN/concepts/security-roles)
- [合规](/zh-CN/compliance)
