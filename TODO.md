# SecuClaw TODO 清单

**最后更新**: 2026-03-04  
**项目完成度**: 92%

---

## 项目概述

SecuClaw（安爪安全）是一款AI驱动的企业级安全运营平台，赋予安全从业者"全视角"能力。

### 核心能力矩阵

| 维度 | 内容 |
|------|------|
| 安全角色 | 8种 (SEC/LEG/IT/BIZ组合) |
| 知识库 | MITRE ATT&CK + SCF 2025 (1400+控制项) |
| 合规框架 | NIST, ISO 27001, SOC 2, PCI-DSS, GDPR, CCPA, PIPL |
| 安全工具 | 68+ (攻击/防御/分析/评估) |

---

## 进行中

无

---

## 待处理 (按优先级)

### P0 - 核心功能完善

- [ ] **修复Web UI的TypeScript类型错误**
  - 未使用的导入 (AlertTriangle, Activity等)
  - 隐式any类型参数
  - 优先级: 高

- [ ] **CLI增强**
  - 添加交互式安全评估命令
  - 支持批量漏洞扫描

### P1 - 渠道与集成

- [ ] **渠道集成扩展**
  - 添加Telegram渠道适配器
  - 添加Discord渠道适配器
  - 添加飞书渠道适配器
  - channels/模块已有基础，需完善

- [ ] **威胁情报源集成**
  - 扩展MISP集成
  - 添加OTX/AlienVault支持
  - TAXII服务器连接器

### P2 - 测试与文档

- [ ] **增加核心模块测试**
  - gateway/ 测试用例
  - session/ 测试用例
  - knowledge/ 测试用例
  - skills/ 测试用例

- [ ] **更新API文档**
  - 同步实际实现状态
  - 添加使用示例

### P3 - 功能增强

- [ ] **多LLM路由优化**
  - 添加更多LLM Provider支持
  - 实现智能模型选择策略

- [ ] **可视化增强**
  - 攻击链可视化
  - 风险热力图
  - 合规状态仪表盘

---

## 已完成 ✅

### 核心架构 (100%)

- [x] **Gateway层** - 9个文件完整实现
  - gateway/server.ts, router.ts, protocol.ts
  - gateway/auth.ts, market-routes.ts, wrapper.ts
  - gateway/http-server.ts, types.ts

- [x] **会话管理** - 5个文件完整实现
  - session/manager.ts, persistence.ts
  - session/compaction.ts, types.ts

- [x] **知识图谱** - 完整实现
  - knowledge/graph.ts (15KB)
  - knowledge/mitre/ (MITRE ATT&CK)
  - knowledge/scf/ (SCF框架)
  - ontology/graph.ts, engine.ts, reasoning.ts

- [x] **记忆系统** - 8个文件完整实现
  - memory/vector.ts, sqlite-vec.ts
  - memory/hybrid.ts, bm25.ts
  - memory/manager.ts, persistence.ts

- [x] **多智能体编排** - 完整实现
  - orchestration/multi-agent.ts (19KB)
  - agent/loop.ts, dual-loop.ts, runner.ts

- [x] **自学习系统** - 12个文件完整实现
  - learning/case-learner.ts, case-system.ts
  - learning/skill-evolver.ts, tool-evolver.ts
  - learning/ab-test.ts, remediation.ts

### 安全角色技能 (100%)

- [x] **🛡️ 安全专家 (Security Expert)** - SEC组合
  - 漏洞扫描、渗透测试、红队演练
  - 威胁检测、事件响应、数字取证
  - MITRE ATT&CK全覆盖

- [x] **👔 首席安全官 (CISO)** - SEC+LEG+IT组合
  - 安全战略规划、合规治理
  - 预算管理、董事会汇报
  - 企业风险仪表盘

- [x] **🏗️ 安全架构师 (Security Architect)** - SEC+IT组合
  - 零信任架构、防御纵深设计
  - 云安全架构、应用安全架构
  - 架构弱点分析、攻击路径绘制

- [x] **🔐 隐私安全官 (Privacy Officer)** - SEC+LEG组合
  - GDPR/CCPA/PIPL合规
  - 隐私影响评估、数据分类分级
  - 跨境传输合规、同意管理

- [x] **🔗 供应链安全官 (Supply Chain Security)** - SEC+LEG+BIZ组合
  - 供应商安全评估、第三方风险管理
  - 供应链合规、合同安全条款
  - 供应链攻击模拟

- [x] **📊 业务安全官 (Business Security Officer)** - SEC+BIZ组合
  - 业务连续性管理、灾难恢复
  - 风险量化评估、安全ROI分析
  - 业务逻辑漏洞挖掘

- [x] **🎯 安全运营官 (Security Operations)** - SEC+OPS组合
  - SOC运营、威胁检测
  - 事件响应、日志分析
  - SIEM集成

- [x] **🌐 全域安全指挥官 (Security Commander)** - 全组合
  - 跨域协调、战略规划
  - 全景态势感知

### CLI命令 (100%)

- [x] **config命令组** - 9个子命令全部实现
- [x] **providers命令组** - 2个子命令全部实现
- [x] **security命令组** - 5个子命令全部实现
- [x] **skill命令组** - 6个子命令全部实现
- [x] **主命令secuclaw** - 已统一

### Web界面 (95%)

- [x] **37个组件** - 全部实现
- [x] **10个技能可视化支持**
- [ ] TypeScript类型错误 (待修复)

### 安全模块 (100%)

- [x] **威胁狩猎** - hunting/engine.ts
- [x] **红蓝对抗** - redblue/engine.ts
- [x] **合规分析** - compliance/gap-analyzer.ts
- [x] **威胁情报** - threat-intel/ (MISP, OTX, TAXII)
- [x] **MITRE ATT&CK** - knowledge/mitre/
- [x] **SCF框架** - knowledge/scf/

### 安全工具 (100%)

| 类别 | 工具数 | 状态 |
|------|--------|------|
| 攻击类 | 5 | ✅ |
| 防御类 | 4 | ✅ |
| 分析类 | 4 | ✅ |
| 评估类 | 5 | ✅ |

---

## 项目状态概览

### 代码统计

| 包 | 文件数 | 代码行数 | 完成度 |
|----|--------|----------|--------|
| core | 308 | 79,154 | 92% |
| edge | 20+ | ~5,000 | 90% |
| cli | 8 | ~2,000 | 100% |
| web | 37 | ~15,000 | 95% |
| **总计** | **373** | **~101,000** | **92%** |

### 模块清单

```
✅ agent (7文件)        ✅ gateway (9文件)      ✅ session (5文件)
✅ knowledge (4+)       ✅ ontology (7文件)     ✅ memory (8文件)
✅ learning (12文件)    ✅ orchestration (2)    ✅ compliance (5文件)
✅ hunting (3文件)      ✅ redblue (3文件)     ✅ threat-intel (7文件)
✅ skills (20文件)      ✅ sandbox (1文件)     ✅ providers (多文件)
✅ tools (多文件)       ✅ evolution (含测试)  ✅ edge (轻量运行时)
```

### 四层架构完成度

| 架构层 | 完成度 |
|--------|--------|
| 应用层 | **95%** |
| 智能体层 | **95%** |
| 认知层 | **90%** |
| 基础设施层 | **90%** |
| **总体** | **92%** |

---

## 与需求对比

| 需求模块 | 状态 | 代码位置 |
|----------|------|----------|
| 全景态势感知 | ✅ 100% | PanoramicDashboard.tsx |
| 角色切换 | ✅ 100% | RoleSelector.tsx, roles/definitions.ts |
| 攻击链分析 | ✅ 100% | AttackChain/, redblue/ |
| 威胁狩猎 | ✅ 100% | hunting/engine.ts |
| 红蓝对抗 | ✅ 100% | redblue/engine.ts |
| 合规差距分析 | ✅ 100% | compliance/gap-analyzer.ts |
| 风险量化 | ✅ 100% | risk/, roi/ |
| 业务风险地图 | ✅ 100% | BusinessRiskMap/ |
| MITRE ATT&CK | ✅ 100% | knowledge/mitre/ |
| SCF框架 | ✅ 100% | knowledge/scf/ |

---

## 下次工作重点

1. **修复Web UI TypeScript错误** - 清理未使用导入和any类型
2. **渠道集成** - 添加Telegram/Discord/飞书集成
3. **测试覆盖** - 增加核心模块测试用例

---

## 项目结构

```
secuclaw/
├── packages/
│   ├── core/          # 核心引擎 - AI智能体、技能、记忆、会话管理
│   ├── edge/          # 边缘运行时 - 轻量部署
│   ├── web/           # Web界面
│   └── cli/           # 命令行工具
├── skills/            # 安全角色技能（8大角色）
│   ├── security-expert/
│   ├── ciso/
│   ├── security-architect/
│   ├── privacy-officer/
│   ├── supply-chain-security/
│   ├── business-security-officer/
│   ├── security-ops/
│   └── secuclaw-commander/
├── data/
│   ├── mitre/         # MITRE ATT&CK知识库
│   └── scf/           # Secure Controls Framework 2025
├── config/            # 配置文件
├── docs/              # 文档
└── helm/              # Kubernetes部署清单
```

---

## 参考资源

- 实际实现状态: `docs/ACTUAL-IMPLEMENTATION-STATUS.md`
- 架构文档: `docs/concepts/architecture.md`
- 品牌信息: `README.md`
