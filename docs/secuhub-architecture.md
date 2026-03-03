# SecuHub 技能市场架构与规划

## 概述

SecuHub 是 SecuClaw 的官方技能市场，类似于 AI Agent 的 "App Store"。本文档描述 SecuHub 的架构设计、实现状态和未来规划。

---

## 一、架构总览

### 1.1 系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        SecuHub Marketplace                       │
│                     (secuhub.secuclaw.dev)                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Web UI    │  │  REST API   │  │  CDN/Storage│             │
│  │  (React)    │  │  (Fastify)  │  │  (S3/R2)    │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Core Services                         │   │
│  │  • Skill Validation  • Dependency Resolution            │   │
│  │  • Version Management • Search & Discovery              │   │
│  │  • User Reviews      • Security Scanning                │   │
│  └─────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Data Layer                            │   │
│  │  • PostgreSQL (metadata) • Redis (cache)                │   │
│  │  • S3/R2 (skill bundles) • Elasticsearch (search)        │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SecuClaw Client                            │
│                                                                 │
│  secuclaw skills install @secuhub/threat-hunter                 │
│  secuclaw skills search "vulnerability"                         │
│  secuclaw skills publish ./my-skill                             │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 技术栈

| 层级 | 技术选型 |
|------|----------|
| 前端 | React + TypeScript + Tailwind CSS |
| 后端 API | Fastify + PostgreSQL + Redis |
| 存储 | Cloudflare R2 / AWS S3 |
| 搜索 | Elasticsearch / Meilisearch |
| CDN | Cloudflare CDN |
| 认证 | OAuth (GitHub, GitLab) |

---

## 二、核心数据模型

### 2.1 技能元数据

```typescript
interface SecuHubSkill {
  id: string;
  slug: string;                    // @org/skill-name
  name: string;
  description: string;
  longDescription?: string;
  version: string;
  author: AuthorInfo;
  
  // 分类
  category: SkillCategory;
  tags: string[];
  
  // 安全框架映射
  mitreCoverage?: string[];         // ["T1566", "T1190"]
  scfDomains?: string[];            // ["IR", "MON"]
  roleCombination?: string;         // "SEC+IT"
  
  // 统计
  downloads: number;
  rating: number;
  ratingCount: number;
  
  // 链接
  homepage?: string;
  repository?: string;
  documentation?: string;
  license: string;
  
  // 版本信息
  versions: SkillVersion[];
  latestVersion: string;
  
  // 状态
  status: 'active' | 'deprecated' | 'removed';
  securityPatched: boolean;
  
  // 可视化支持
  hasVisualizations: boolean;
  visualizationTypes: string[];
  
  // 时间戳
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date;
}
```

### 2.2 版本信息

```typescript
interface SkillVersion {
  version: string;                // Semver
  releasedAt: Date;
  changelog: string;
  
  // 兼容性
  compatibility: {
    minCoreVersion: string;
    maxCoreVersion?: string;
    nodeVersion?: string;
  };
  
  // 依赖
  dependencies: SkillDependency[];
  
  // 安全
  securityPatched: boolean;
  deprecated: boolean;
  deprecationReason?: string;
  
  // 文件信息
  bundleSize: number;
  bundleHash: string;
  downloadUrl: string;
}
```

### 2.3 分类系统

```typescript
type SkillCategory =
  | 'threat-intel'      // 威胁情报
  | 'vulnerability'     // 漏洞管理
  | 'compliance'        // 合规审计
  | 'incident-response' // 事件响应
  | 'red-team'          // 红队工具
  | 'blue-team'         // 蓝队工具
  | 'forensics'         // 取证分析
  | 'automation'        // 自动化
  | 'visualization'     // 可视化
  | 'integration';      // 集成连接器
```

---

## 三、已实现功能

### 3.1 核心服务文件

| 文件 | 功能 | 状态 |
|------|------|------|
| `market-service.ts` | 市场核心服务 | ✅ 完成 |
| `market.ts` | 安装/发布逻辑 | ✅ 完成 |
| `clawhub.ts` | 验证/依赖/版本管理 | ✅ 完成 |
| `registry.ts` | Skill 注册表 | ✅ 完成 |
| `manager.ts` | Skill 管理器 | ✅ 完成 |

### 3.2 已实现功能

#### SkillMarketService (market-service.ts)

```typescript
class SkillMarketService {
  // 搜索
  async search(options: MarketSearchOptions): Promise<MarketSearchResult>;
  
  // 安装管理
  async install(skillId: string): Promise<{ success: boolean; message: string }>;
  async uninstall(skillId: string): Promise<{ success: boolean; message: string }>;
  async update(skillId: string): Promise<{ success: boolean; message: string }>;
  
  // 发布
  async publish(options: SkillPublishOptions): Promise<{ success: boolean; skillId: string }>;
  
  // 评价
  async addReview(skillId: string, review: Omit<SkillReview, 'id'>): Promise<void>;
  async markReviewHelpful(skillId: string, reviewId: string): Promise<void>;
  
  // 统计
  getStats(): MarketStats;
  listTopSkills(limit: number): MarketSkill[];
  listRecentSkills(limit: number): MarketSkill[];
  checkForUpdates(): MarketSkill[];
}
```

#### SecuHubManager (clawhub.ts)

```typescript
class SecuHubManager {
  // 验证
  async validateSkill(content: string): Promise<SkillValidationResult>;
  
  // 依赖解析
  async resolveDependencies(skillId: string): Promise<DependencyResolution>;
  
  // 版本管理
  getVersionHistory(skillId: string): SkillVersion[];
  
  // 能力进化
  async generateCapabilityEvolution(trigger: string): Promise<CapabilityEvolution>;
}
```

### 3.3 预置技能 (8个)

| ID | 名称 | 分类 | 下载量 |
|----|------|------|--------|
| threat-intel | Threat Intelligence | threat-intel | 1,542 |
| vuln-scanner | Vulnerability Scanner | vulnerability | 3,210 |
| compliance-nist | NIST CSF Compliance | compliance | 876 |
| phishing-sim | Phishing Simulator | red-team | 2,100 |
| incident-response | Incident Response | incident-response | 4,500 |
| forensic-analyzer | Forensic Analyzer | forensics | 980 |
| supply-chain | Supply Chain Security | vulnerability | 650 |
| pentest-automation | Pentest Automation | red-team | 1,890 |

---

## 四、CLI 命令设计

### 4.1 技能发现

```bash
# 搜索技能
secuclaw skills search "threat hunting"
secuclaw skills search --category red-team
secuclaw skills search --mitre T1566
secuclaw skills search --scf IR

# 浏览技能
secuclaw skills list
secuclaw skills list --installed
secuclaw skills info @secuhub/threat-intel
secuclaw skills trending
secuclaw skills recent
```

### 4.2 技能安装

```bash
# 安装技能
secuclaw skills install @secuhub/threat-intel
secuclaw skills install @secuhub/threat-intel@1.2.0
secuclaw skills install @secuhub/threat-intel --force

# 更新技能
secuclaw skills update @secuhub/threat-intel
secuclaw skills update --all

# 卸载技能
secuclaw skills uninstall @secuhub/threat-intel
```

### 4.3 技能发布

```bash
# 登录
secuclaw skills login
secuclaw skills login --token <token>

# 发布
secuclaw skills publish ./my-skill
secuclaw skills publish ./my-skill --version 1.0.0 --changelog "Initial release"
secuclaw skills publish ./my-skill --private

# 更新
secuclaw skills bump patch --changelog "Bug fixes"
secuclaw skills bump minor --changelog "New features"
```

### 4.4 技能验证

```bash
# 验证技能
secuclaw skills validate ./my-skill
secuclaw skills validate ./my-skill --strict

# 检查依赖
secuclaw skills deps ./my-skill
secuclaw skills deps ./my-skill --resolve
```

---

## 五、技能验证规则

### 5.1 必填字段

| 字段 | 规则 |
|------|------|
| name | 必填，仅字母数字、空格、连字符、下划线 |
| description | 必填，至少 20 字符 |
| version | 必填，符合 semver (x.y.z) |

### 5.2 安全检查

```typescript
const dangerousPatterns = [
  /eval\s*\(/gi,
  /Function\s*\(/gi,
  /exec\s*\(/gi,
  /child_process/gi,
  /password\s*=\s*['"]/gi,
  /api[_-]?key\s*=\s*['"]/gi,
  /secret\s*=\s*['"]/gi,
];
```

### 5.3 安全框架映射

```yaml
# MITRE ATT&CK 格式验证
mitre_coverage:
  - T1566        # 技术ID
  - T1566.001    # 子技术ID

# SCF 域格式验证
scf_coverage:
  - IR           # 事件响应
  - MON          # 持续监控
```

---

## 六、依赖管理

### 6.1 依赖声明

```yaml
# SKILL.md
---
name: incident-response
dependencies:
  required:
    - skill: @secuhub/threat-intel
      version: ">=1.0.0"
  optional:
    - skill: @secuhub/vuln-scanner
      version: ">=2.0.0"
---
```

### 6.2 依赖解析

```typescript
interface DependencyResolution {
  resolved: ResolvedDependency[];
  conflicts: DependencyConflict[];
  missing: string[];
  installOrder: string[];
}
```

---

## 七、与 SecuHub 对比

| 特性 | SecuHub (OpenClaw) | SecuHub (SecuClaw) |
|------|-------------------|-------------------|
| 域名 | clawhub.ai | secuhub.secuclaw.dev |
| 定位 | 通用 AI 技能市场 | 安全领域技能市场 |
| 框架映射 | 无 | MITRE + SCF |
| 角色关联 | 无 | 8种安全角色 |
| 可视化 | 无 | Visualization-Enabled |
| 验证规则 | 通用 | 安全增强 |
| 分类 | 通用分类 | 安全专属分类 |

---

## 八、未来规划

### Phase 1: 核心完善 (Q1 2026)

- [ ] Web UI 上线
- [ ] REST API 完成
- [ ] 用户认证系统
- [ ] 技能审核流程

### Phase 2: 功能增强 (Q2 2026)

- [ ] 可视化技能支持
- [ ] 私有技能仓库
- [ ] 组织账户
- [ ] 技能分析统计

### Phase 3: 生态建设 (Q3 2026)

- [ ] 开发者激励计划
- [ ] 技能认证体系
- [ ] 企业版支持
- [ ] 技能市场 API

### Phase 4: 智能化 (Q4 2026)

- [ ] 能力进化系统
- [ ] 智能推荐
- [ ] 自动依赖分析
- [ ] 安全扫描自动化

---

## 九、参考文件

### 9.1 实现文件

```
packages/core/src/skills/
├── market-service.ts    # 市场服务 (518行)
├── market.ts            # 安装发布 (423行)
├── clawhub.ts           # 验证管理 (559行)
├── registry.ts          # 注册表 (89行)
├── manager.ts           # 管理器
├── types.ts             # 类型定义 (166行)
├── loader.ts            # 加载器 (194行)
├── visualization-*.ts   # 可视化支持
└── index.ts             # 导出
```

### 9.2 文档文件

```
docs/
├── tools/skills.md              # 技能系统文档
├── architecture-skills-vs-agents.md
├── visualization-enabled-skills.md
└── concepts/
    ├── architecture.md
    └── security-roles.md
```

### 9.3 参考

- OpenClaw SecuHub: `/Users/huangzhou/Documents/work/ai_专家1.0/openclaw/docs/tools/clawhub.md`
- 产品方案: `/Users/huangzhou/Documents/work/ai_专家1.0/产品方案_全域安全专家系统.md`
