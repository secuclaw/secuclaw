# SecuClaw - AI-Driven Security Operations Platform

[English](#english) | [中文](#中文)

---

## English

### Overview

SecuClaw is an AI-powered security operations platform that enables security professionals to operate with a "full-spectrum" perspective. Unlike traditional security tools that focus solely on defense, SecuClaw combines offensive security (red team), defensive security (blue team), legal compliance, and business continuity perspectives into a unified AI assistant.

### Core Philosophy

> In the field of security, there is no absolute division between good and evil—only different perspectives.

Traditional security products often approach challenges from the "defender's" perspective, focusing on building defenses, detecting threats, and responding to incidents. However, a true full-spectrum security expert must possess "full-spectrum" thinking—capable of thinking like a white-hat hacker to map attack paths, evaluating compliance risks like a legal consultant, and balancing security with efficiency like a business leader.

### Key Capabilities

#### 🎭 8 Security Roles

| Role | Combination | Description |
|------|-------------|-------------|
| 🛡️ Security Expert | SEC | Offensive & defensive security, penetration testing, vulnerability analysis |
| 👔 CISO | SEC+LEG+IT | Security strategy, compliance governance, board reporting |
| 🏗️ Security Architect | SEC+IT | Zero-trust architecture, defense-in-depth, security infrastructure |
| 🔐 Privacy Officer | SEC+LEG | Data privacy, GDPR/CCPA/PIPL compliance, privacy impact assessment |
| 🔗 Supply Chain Security | SEC+LEG+BIZ | Third-party risk management, vendor security assessment |
| 📊 Business Security Officer | SEC+BIZ | Business continuity, risk quantification, ROI analysis |
| 🎯 Security Operations | SEC+OPS | SOC operations, threat detection, incident response |
| 🌐 Security Commander | Full Spectrum | Cross-domain coordination, strategic planning |

#### 🧠 Knowledge Graph Integration

- **MITRE ATT&CK**: Enterprise, Mobile, ICS attack techniques coverage
- **SCF 2025**: Secure Controls Framework with 1,400+ security controls
- **Compliance Mappings**: NIST, ISO 27001, SOC 2, PCI-DSS, GDPR, CCPA, PIPL

#### 🔧 Security Tools (68+)

| Category | Tools |
|----------|-------|
| Attack | Path discovery, exploit validation, penetration testing, threat hunting |
| Defense | Threat detection, vulnerability scanning, architecture design, incident response |
| Analysis | Log analysis, threat intelligence, risk analysis, compliance analysis |
| Assessment | Compliance audit, vulnerability assessment, control evaluation, architecture review |

### Technical Architecture

```
secuclaw/
├── packages/
│   ├── core/          # Core engine - AI agents, skills, memory, session management
│   ├── edge/          # Edge runtime - lightweight deployment
│   ├── web/           # Web interface
│   └── cli/           # Command-line interface
├── skills/            # Security role skills (8 roles)
├── data/
│   ├── mitre/         # MITRE ATT&CK knowledge base
│   └── scf/           # Secure Controls Framework 2025
├── config/            # Configuration files
├── docs/              # Documentation
└── helm/              # Kubernetes deployment manifests
```

### Tech Stack

- **Runtime**: Bun / Node.js 18+
- **Language**: TypeScript
- **Database**: SQLite (via Drizzle ORM)
- **AI**: Multi-LLM routing support
- **i18n**: react-i18next (Internationalization support)

### Internationalization (i18n)

The web interface supports multiple languages. Currently available:

| Language | Code | Status |
|----------|------|--------|
| English | `en-US` | ✅ Complete |
| 简体中文 | `zh-CN` | ✅ Complete |

#### Adding a New Language

1. Create a new locale file in `packages/web/src/i18n/locales/`:
   ```bash
   # Example: Adding Japanese
   cp packages/web/src/i18n/locales/en-US.json packages/web/src/i18n/locales/ja-JP.json
   ```

2. Translate all strings in the new JSON file

3. Register the new language in `packages/web/src/i18n/index.ts`:
   ```typescript
   import jaJP from './locales/ja-JP.json';
   
   const resources = {
     'zh-CN': { translation: zhCN },
     'en-US': { translation: enUS },
     'ja-JP': { translation: jaJP }, // Add new language
   };
   
   export const availableLanguages = [
     { code: 'zh-CN', name: '简体中文', native: '简体中文' },
     { code: 'en-US', name: 'English', native: 'English' },
     { code: 'ja-JP', name: 'Japanese', native: '日本語' }, // Add to list
   ];
   ```

#### Using Translations in Components

```tsx
import { useTranslation } from 'react-i18next';

const MyComponent = () => {
  const { t } = useTranslation();
  
  return <div>{t('dashboard.title')}</div>;
};
```

#### Translation Key Structure

```
app.*          # Common app strings (loading, error, etc.)
nav.*          # Navigation menu items
dashboard.*    # Dashboard page
console.*      # Console page
compliance.*    # Compliance page
threatIntel.*  # Threat Intel page
risk.*         # Risk page
knowledge.*    # Knowledge Graph page
dimensions.*   # SCF Dimensions page
roles.*        # Security roles
operations.*   # Operations console
graph.*        # Graph visualization
common.*       # Common UI elements (buttons, dialogs)
```
### Quick Start

```bash
# Install dependencies
pnpm install

# Download knowledge base
pnpm run download-mitre
pnpm run download-scf

# Start development
pnpm run dev

# Or use CLI
pnpm run cli --help
```

### Deployment

```bash
# Docker
docker-compose up -d

# Kubernetes
helm install secuclaw ./helm/secuclaw
```

### License

MIT License

---

## 中文

### 项目概述

SecuClaw（安爪安全）是一款AI驱动的企业级安全运营平台，旨在赋予安全从业者"全视角"能力。不同于传统安全工具仅聚焦防御，SecuClaw将 offensive security（红队）、defensive security（蓝队）、法律合规和业务连续性视角整合为统一的AI助手。

### 核心理念

> 在安全领域，不存在绝对的正邪之分，只有视角的不同。

传统的安全产品往往只从"防御者"视角出发，专注于构建防线、检测威胁、响应事件。然而，真正的全域安全专家必须具备"全视角"思维——既能像白帽黑客一样思考攻击路径，也能像法律顾问一样评估合规风险，还能像业务负责人一样权衡安全与效率。

### 核心能力

#### 🎭 8大安全角色

| 角色 | 组合 | 描述 |
|------|------|------|
| 🛡️ 安全专家 | SEC | 攻防兼备、渗透测试、漏洞分析 |
| 👔 首席安全官 | SEC+LEG+IT | 企业安全战略、合规治理、董事会汇报 |
| 🏗️ 安全架构师 | SEC+IT | 零信任架构、防御纵深、安全基础设施 |
| 🔐 隐私安全官 | SEC+LEG | 数据隐私、GDPR/CCPA/PIPL合规、隐私影响评估 |
| 🔗 供应链安全官 | SEC+LEG+BIZ | 第三方风险管理、供应商安全评估 |
| 📊 业务安全官 | SEC+BIZ | 业务连续性、风险量化、投资回报分析 |
| 🎯 安全运营官 | SEC+OPS | SOC运营、威胁检测、事件响应 |
| 🌐 全域安全指挥官 | 全组合 | 跨域协调、战略规划 |

#### 🧠 知识图谱集成

- **MITRE ATT&CK**: 覆盖 Enterprise、Mobile、ICS 攻击技术
- **SCF 2025**: 安全控制框架，包含1400+安全控制项
- **合规映射**: NIST、ISO 27001、SOC 2、PCI-DSS、GDPR、CCPA、PIPL

#### 🔧 安全工具 (68+)

| 类别 | 工具 |
|------|------|
| 攻击 | 攻击路径发现、漏洞利用验证、渗透测试、威胁狩猎 |
| 防御 | 威胁检测、漏洞扫描、架构设计、事件响应 |
| 分析 | 日志分析、威胁情报、风险分析、合规分析 |
| 评估 | 合规审计、漏洞评估、控制评估、架构评审 |

### 技术架构

```
secuclaw/
├── packages/
│   ├── core/          # 核心引擎 - AI智能体、技能、记忆、会话管理
│   ├── edge/          # 边缘运行时 - 轻量部署
│   ├── web/           # Web界面
│   └── cli/          # 命令行工具
├── skills/           # 安全角色技能（8大角色）
├── data/
│   ├── mitre/        # MITRE ATT&CK 知识库
│   └── scf/         # 安全控制框架 2025
├── config/           # 配置文件
├── docs/             # 文档
└── helm/             # Kubernetes 部署清单
```

### 技术栈

- **运行时**: Bun / Node.js 18+
- **语言**: TypeScript
- **数据库**: SQLite (通过 Drizzle ORM)
- **AI**: 多LLM路由支持
- **国际化**: react-i18next (多语言支持)

### 国际化 (i18n)

Web 界面支持多语言切换。当前支持的语言：

| 语言 | 代码 | 状态 |
|------|------|------|
| 简体中文 | `zh-CN` | ✅ 已完成 |
| English | `en-US` | ✅ 已完成 |

#### 添加新语言

1. 在 `packages/web/src/i18n/locales/` 目录创建新的语言文件：
   ```bash
   # 示例：添加日语支持
   cp packages/web/src/i18n/locales/zh-CN.json packages/web/src/i18n/locales/ja-JP.json
   ```

2. 翻译 JSON 文件中的所有字符串

3. 在 `packages/web/src/i18n/index.ts` 中注册新语言：
   ```typescript
   import jaJP from './locales/ja-JP.json';
   
   const resources = {
     'zh-CN': { translation: zhCN },
     'en-US': { translation: enUS },
     'ja-JP': { translation: jaJP }, // 添加新语言
   };
   
   export const availableLanguages = [
     { code: 'zh-CN', name: '简体中文', native: '简体中文' },
     { code: 'en-US', name: 'English', native: 'English' },
     { code: 'ja-JP', name: 'Japanese', native: '日本語' }, // 添加到列表
   ];
   ```

#### 在组件中使用翻译

```tsx
import { useTranslation } from 'react-i18next';

const MyComponent = () => {
  const { t } = useTranslation();
  
  return <div>{t('dashboard.title')}</div>;
};
```

#### 翻译键结构

```
app.*          # 通用应用字符串（加载、错误等）
nav.*          # 导航菜单项
dashboard.*    # 仪表盘页面
console.*      # 控制台页面
compliance.*   # 合规页面
threatIntel.*  # 威胁情报页面
risk.*         # 风险页面
knowledge.*    # 知识图谱页面
dimensions.*   # SCF 维度页面
roles.*        # 安全角色
operations.*   # 运营控制台
graph.*        # 图谱可视化
common.*       # 通用 UI 元素（按钮、对话框）
```
### 快速开始

```bash
# 安装依赖
pnpm install

# 下载知识库
pnpm run download-mitre
pnpm run download-scf

# 启动开发
pnpm run dev

# 或使用CLI
pnpm run cli --help
```

### 部署

```bash
# Docker
docker-compose up -d

# Kubernetes
helm install secuclaw ./helm/secuclaw
```

### 许可证

MIT License

---

### Slogan

**利爪守护，智御未来**
