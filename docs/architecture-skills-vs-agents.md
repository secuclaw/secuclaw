# 架构决策：8 Skills vs 8 Agents

## 概述

SecuClaw 采用 **8 个 Skills 组合** 而非 **8 个独立 Agents** 的架构设计。本文档解释这一设计决策的原因。

## Agent vs Skill 定义

### Agent（智能体）

一个 **Agent** 是完整的 AI "大脑"，拥有独立的：

| 组件 | 说明 |
|------|------|
| 工作空间 | 文件、AGENTS.md/SOUL.md、个人规则 |
| 状态目录 | 认证配置、模型注册、Agent 专属配置 |
| 会话存储 | 聊天历史 + 路由状态 |
| Skills | 可共享或独立的能力包 |
| 内存 | 独立的对话记忆和上下文 |

**Agent 代表隔离和身份** —— 不同的角色、用户或专门工作者。

### Skill（技能）

一个 **Skill** 是模块化的能力包，教会 Agent 如何使用工具：

| 组件 | 说明 |
|------|------|
| SKILL.md | YAML frontmatter + 指令文本 |
| 脚本/资源 | 可选的 scripts/、references/、assets/ |
| 工作流 | 专门的工具集成和领域知识 |

**Skill 代表能力扩展** —— 添加特定功能而不改变 Agent 身份。

## 核心区别

| 维度 | Agent | Skill |
|------|-------|-------|
| **本质** | 完整的 AI 大脑 | 能力模块包 |
| **定义** | 角色、工作空间、内存 | 如何使用特定工具 |
| **隔离** | 独立会话、认证 | 可跨 Agent 共享 |
| **资源** | 高（独立资源） | 低（组合复用） |
| **示例** | "coding-agent", "social-agent" | "github-skill", "weather-skill" |

## SecuClaw 的 8 种角色

### 角色组合模型

产品方案定义的 8 种角色基于 **能力组合**：

```
                    ┌─────────────────┐
                    │    业务 (BIZ)    │
                    └────────┬────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
          ▼                  ▼                  ▼
   ┌────────────┐     ┌────────────┐     ┌────────────┐
   │  法律(LEG)  │     │  安全(SEC)  │     │    IT      │
   └────────────┘     └────────────┘     └────────────┘
```

### 8 种角色组合

| 类型 | 数量 | 角色名称 | 能力组合 |
|------|------|----------|----------|
| 单一角色 | 1 | 安全专家 | SEC |
| 二元组合 | 3 | 隐私安全官、安全架构师、业务安全官 | SEC+LEG、SEC+IT、SEC+BIZ |
| 三元组合 | 3 | 首席安全架构官、供应链安全官、业务安全运营官 | SEC+LEG+IT、SEC+LEG+BIZ、SEC+IT+BIZ |
| 四元组合 | 1 | 企业安全指挥官 | SEC+LEG+IT+BIZ |

## 为什么选择 Skills？

### 1. 可组合性

**Agent 方式（不推荐）**：
```
需要创建 8 个独立 Agent
= 8× 内存占用
= 8× 会话管理
= 8× 认证配置
= 8× 资源开销
```

**Skill 方式（采用）**：
```
创建 8 个 Skill
→ 按需组合
→ 1 个 Agent 动态加载多个 Skill
→ 资源共享，按需加载
```

### 2. 能力继承

SEC 角色的核心能力可以延伸到组合角色：

```
SEC 基础能力：
  光明面：威胁检测、漏洞修复、安全架构
  黑暗面：攻击模拟、渗透测试、威胁狩猎

↓ 延伸到组合角色

SEC+LEG（隐私安全官）：
  = SEC 能力 + 隐私保护/数据合规延伸

SEC+IT（安全架构师）：
  = SEC 能力 + 基础设施/代码安全延伸

SEC+BIZ（业务安全官）：
  = SEC 能力 + 供应链/业务连续性延伸
```

**Skill 组合支持能力继承，Agent 隔离则不支持。**

### 3. 上下文效率

Skills 采用三级加载策略：

| 级别 | 内容 | 加载时机 | 大小 |
|------|------|----------|------|
| 1 | Metadata (name + description) | 始终加载 | ~100 words |
| 2 | SKILL.md body | 触发时加载 | <5k words |
| 3 | Bundled resources | 按需加载 | 按需 |

这意味着系统可以轻量地维护 8 个 Skills 的元数据，只在需要时加载具体实现。

### 4. 开放扩展

Skills 可以通过 **SecuHub** 市场分发：

```
SecuHub Marketplace
├── 官方 Skills
│   ├── security-expert
│   ├── privacy-officer
│   └── ...
├── 社区 Skills
│   ├── custom-threat-hunter
│   └── compliance-validator
└── 企业 Skills
    └── internal-security-policy
```

这符合开源协作模式，便于社区贡献。

## 架构图

```
┌─────────────────────────────────────────────────────────┐
│                     SecuClaw Agent                      │
│            (单一 Agent，动态加载 Skills)                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │                Skill Registry                      │ │
│  │                                                    │ │
│  │  ┌──────────────┐ ┌──────────────┐ ┌────────────┐ │ │
│  │  │security-     │ │privacy-      │ │security-   │ │ │
│  │  │expert        │ │officer       │ │architect   │ │ │
│  │  │              │ │              │ │            │ │ │
│  │  │ role: SEC    │ │ role: SEC+LEG│ │role:SEC+IT │ │ │
│  │  │ 组合: 基础   │ │ 组合: 二元   │ │组合: 二元  │ │ │
│  │  └──────────────┘ └──────────────┘ └────────────┘ │ │
│  │                                                    │ │
│  │  ┌──────────────┐ ┌──────────────┐ ┌────────────┐ │ │
│  │  │business-     │ │supply-chain- │ │ciso        │ │ │
│  │  │security      │ │security      │ │            │ │ │
│  │  │              │ │              │ │            │ │ │
│  │  │role:SEC+BIZ  │ │role:三元组合 │ │role: 四元  │ │ │
│  │  └──────────────┘ └──────────────┘ └────────────┘ │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  Role Composition Engine                               │
│                                                         │
│  用户选择角色 → 加载对应 Skills → 组合能力 → 执行任务   │
│                                                         │
│  示例：                                                 │
│  CISO = security-expert                                │
│       + privacy-officer                                │
│       + security-architect                             │
│       + ciso                                           │
└─────────────────────────────────────────────────────────┘
```

## 配置示例

### roles.yaml

```yaml
roles:
  security-expert:
    name: 安全专家
    code: SEC
    skills:
      - security-expert
    combination: single
    
  privacy-security-officer:
    name: 隐私安全官
    code: SEC+LEG
    skills:
      - security-expert
      - privacy-officer
    combination: binary
    
  ciso:
    name: 首席安全架构官
    code: CISO
    skills:
      - security-expert
      - privacy-officer
      - security-architect
      - ciso
    combination: tertiary
    
  secuclaw-commander:
    name: 企业安全指挥官
    code: COMMANDER
    skills:
      - security-expert
      - privacy-officer
      - security-architect
      - business-security-officer
      - ciso
      - supply-chain-security
      - security-ops
      - secuclaw-commander
    combination: quaternary
```

### Skill 文件结构

```
skills/
├── security-expert/
│   └── SKILL.md          # SEC 基础能力
├── privacy-officer/
│   └── SKILL.md          # SEC+LEG 延伸
├── security-architect/
│   └── SKILL.md          # SEC+IT 延伸
├── business-security-officer/
│   └── SKILL.md          # SEC+BIZ 延伸
├── ciso/
│   └── SKILL.md          # 三元组合能力
├── supply-chain-security/
│   └── SKILL.md          # 三元组合能力
├── security-ops/
│   └── SKILL.md          # 三元组合能力
└── secuclaw-commander/
    └── SKILL.md          # 四元组合能力
```

## 设计原则总结

| 原则 | 说明 |
|------|------|
| **组合优于隔离** | Skills 可组合，Agents 隔离 |
| **复用优于重复** | 基础 Skill 被多个角色复用 |
| **继承优于复制** | 组合角色继承基础角色能力 |
| **按需优于预分配** | 动态加载，按需扩展 |
| **开放优于封闭** | Skills 可通过市场分发 |

## 参考资料

- [OpenClaw Skills 架构](https://docs.openclaw.ai/tools/skills)
- [产品方案：企业安全指挥官系统](/产品方案_企业安全指挥官系统.md)
- [Visualization-Enabled Skills](/docs/visualization-enabled-skills.md)
