# SecuClaw - 安爪安全

> AI 驱动的企业级安全运营与指挥平台（当前仓库实现对齐版）

[English](./README.md) | 中文

## 项目概览

SecuClaw 是一个以安全运营场景为核心的 AI 系统，包含：

- 多角色安全技能体系（SEC/LEG/IT/BIZ 组合）
- Gateway API + WebSocket 实时通道
- CLI 运维与安全分析命令
- MITRE ATT&CK 与 SCF 知识能力
- Web 控制台（`packages/web`）与独立控制台 UI（`ui`）

## 当前代码结构（实际）

```text
secuclaw/
├── packages/
│   ├── core/          # 核心引擎：gateway/skills/session/memory/knowledge 等
│   ├── cli/           # 命令行入口与子命令
│   ├── web/           # 控制台（Vite）
│   └── edge/          # Edge 轻量运行时
├── ui/                # 独立控制台 UI（构建输出到 dist/control-ui）
├── config/            # default/knowledge/roles/tools 配置
├── data/              # mitre/scf/sessions 等数据
├── docs/              # 中英文文档
├── docker-compose.yml # 容器编排
├── Dockerfile         # API/Gateway 镜像
├── Dockerfile.web     # Web 镜像
├── k8s/               # Kubernetes 清单
└── helm/              # Helm Chart
```

## 主要能力（基于当前实现）

- 安全运营命令：`scan`、`threat-hunt`、`compliance`、`ioc`、`risk`
- 技能管理：列出、详情、可视化配置、模板创建、市场检索
- Gateway 服务：HTTP API、`/health`、`/api/chat`、会话管理、知识接口
- 知识库：MITRE ATT&CK（tactics/techniques/stats）、SCF（domains/controls/stats）
- 学习反馈：`/api/feedback`、`/api/learning/stats`、`/api/learning/patterns`
- 配置管理：CLI `config` 子命令 + `~/.secuclaw/config.json`

## 环境要求

- Node.js >= 18
- pnpm >= 8
- Bun >= 1.0（`packages/core` / `packages/cli` 脚本使用 Bun）

## 快速开始（本地开发）

```bash
# 1) 安装依赖
pnpm install

# 2) 可选：更新 MITRE 数据
pnpm run download-mitre
pnpm run import-mitre

# 3) 构建 Web 控制台资源（Gateway 会读取 packages/web/dist）
pnpm --filter @secuclaw/control-ui build

# 4) 启动 Gateway（默认端口 21000）
bun packages/cli/src/index.ts gateway start --port 21000 --host 0.0.0.0
```

启动后可访问：

- HTTP: `http://127.0.0.1:21000`
- Health: `http://127.0.0.1:21000/health`
- WebSocket: `ws://127.0.0.1:21000/ws`

## CLI 命令（当前 program.ts 已注册）

```text
secuclaw
├── config
│   ├── get <key>
│   ├── set <key> <value>
│   ├── list
│   ├── delete <key>
│   ├── keys
│   ├── path
│   ├── reset
│   ├── export <file>
│   └── import <file>
├── providers
│   ├── list
│   └── test <name>
├── security
│   ├── scan
│   ├── threat-hunt
│   ├── compliance
│   ├── ioc <value>
│   └── risk
├── skill
│   ├── list
│   ├── dirs
│   ├── show <name>
│   ├── viz <name>
│   ├── install-dir
│   ├── create <name>
│   └── market
├── gateway
│   ├── start
│   ├── stop
│   ├── status
│   └── logs
└── status
```

## 核心 API（示例）

- `GET /health`
- `POST /api/chat`
- `GET /api/providers`
- `GET /api/skills`
- `GET|POST|DELETE /api/sessions`
- `GET /api/knowledge/mitre/stats`
- `GET /api/knowledge/scf/stats`
- `POST /api/feedback`
- `GET /api/learning/stats`
- `GET /api/graph/nodes`
- `GET /api/remediation/list`

完整路由可查看：`packages/core/src/gateway/wrapper.ts`

## 常用脚本（仓库根目录）

```bash
pnpm run dev          # workspace 并行 dev
pnpm run build        # workspace 并行 build + ui build
pnpm run test         # workspace 并行 test
pnpm run lint         # workspace 并行 lint
pnpm run cli          # 通过 tsx 执行 CLI 源码入口
pnpm run ui:dev       # 启动 ui/ (port 5174)
pnpm run ui:build     # 构建 ui/ 到 dist/control-ui
```

## 配置与数据路径

- 全局配置：`~/.secuclaw/config.json`
- Gateway 运行数据：`~/.secuclaw/`
- 仓库内默认数据：`data/mitre/`、`data/scf/`、`data/sessions/`
- 角色与工具配置：`config/roles.yaml`、`config/tools.yaml`

## 部署说明

仓库已提供以下部署资产：

- Docker: `Dockerfile`、`Dockerfile.web`、`docker-compose.yml`
- Kubernetes: `k8s/` 与 `deploy/kubernetes/`
- Helm: `helm/secuclaw/`

建议在落地部署前统一端口与启动命令（见下方“已知差异”）。

## 已知差异（请先阅读）

- `k8s/` 目录中仍有一套历史清单使用 `3000` 端口，和当前主线 `21000` 仍不一致。
- 文档目录下部分旧页面仍包含历史命令（如 `health`、`logs` 顶层命令），与当前 `program.ts` 不完全一致。

## 文档

- 中文文档入口：`docs/zh-CN/index.md`
- 英文文档入口：`docs/index.md`

## License

MIT
