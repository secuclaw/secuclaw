# SCF 知识库总览

**位置**: `/Users/huangzhou/Documents/work/ai_secuclaw/secuclaw/data/scf`
**版本**: SCF 2025.4
**更新日期**: 2025-02-26

## 📊 数据总览

| 指标 | 数量 |
|------|------|
| **安全控制项** | 1,451 |
| **控制域** | 34 |
| **评估目标** | 5,736 |
| **风险条目** | 45 |
| **威胁条目** | 47 |
| **权威来源** | 261 |
| **证据请求** | 272 |

## 📁 文件结构

```
data/scf/
├── 📄 secure-controls-framework-scf.xlsx          # 原始 Excel 文件 (5.3 MB)
├── 📋 scf-20254.json                               # ⭐ 主控制文件 (29 MB, 1,451 个控制)
├── 📋 scf-domains-principles.json                  # 控制域定义 (34 个域)
├── 📋 assessment-objectives-20254.json             # 评估目标 (5,736 个)
├── 📋 authoritative-sources.json                   # 权威来源映射 (261 个)
├── 📋 evidence-request-list-20254.json             # 证据请求列表 (272 个)
├── 📋 data-privacy-mgmt-principles.json            # 隐私管理原则 (258 个)
├── 📋 risk-catalog.json                            # 风险目录 (45 个)
├── 📋 threat-catalog.json                          # 威胁目录 (47 个)
├── 📋 lists.json                                   # 参考列表 (7 个)
├── 📖 README.md                                    # 详细使用说明
├── 📖 SCF-SPLIT-SUMMARY.md                         # 拆分汇总报告
└── 📖 INDEX.md                                     # 本文件
```

## 🎯 快速开始

### 1. 查询控制 (使用命令行工具)

```bash
# 进入项目目录
cd /Users/huangzhou/Documents/work/ai_secuclaw/secuclaw

# 列出所有控制域
bun scripts/query-scf.ts --domains

# 显示统计信息
bun scripts/query-scf.ts --stats

# 查询特定域 (例如: GOV)
bun scripts/query-scf.ts --domain GOV

# 查询特定控制 (例如: GOV-01)
bun scripts/query-scf.ts --control GOV-01

# 搜索关键词
bun scripts/query-scf.ts --search "governance"
```

### 2. 在代码中使用

```typescript
// 加载主控制文件
import controls from './data/scf/scf-20254.json';
import domains from './data/scf/scf-domains-principles.json';

// 示例 1: 获取所有治理域的控制
const govControls = controls.filter(c =>
  c['SCF #'].startsWith('GOV')
);

// 示例 2: 查找特定控制
const gov01 = controls.find(c =>
  c['SCF #'] === 'GOV-01'
);

// 示例 3: 按权重排序
const highPriorityControls = controls
  .filter(c => c['Relative Control Weighting'] >= 8)
  .sort((a, b) => b['Relative Control Weighting'] - a['Relative Control Weighting']);

// 示例 4: 获取域信息
const govDomain = domains.find(d =>
  d['SCF Identifier'] === 'GOV'
);
```

### 3. 使用 jq 查询 (命令行)

```bash
# 列出所有控制域
cat data/scf/scf-domains-principles.json | jq -r '.[].["SCF Domain"]'

# 查找特定控制
cat data/scf/scf-20254.json | jq '.[] | select(["SCF #"] == "GOV-01")'

# 统计每个域的控制数量
cat data/scf/scf-20254.json | jq '
  group_by(["SCF Domain"]) |
  map({domain: .[0]["SCF Domain"], count: length}) |
  sort_by(.count) |
  reverse
'

# 搜索包含关键词的控制
cat data/scf/scf-20254.json | jq '.[] | select(["SCF Control"] | ascii_downcase | contains("governance"))'
```

## 📋 SCF 2025.4 控制域

### 34 个控制域概览

| 代码 | 域名称 | 控制数 | 优先级 |
|------|--------|--------|--------|
| AAT | Artificial Intelligence & Autonomous Technologies | 156 | 🔴 高 |
| IAC | Identification & Authentication | 112 | 🔴 高 |
| PRI | Data Privacy | 102 | 🔴 高 |
| NET | Network Security | 98 | 🔴 高 |
| DCH | Data Classification & Handling | 85 | 🟡 中 |
| MON | Continuous Monitoring | 70 | 🟡 中 |
| TDA | Technology Development & Acquisition | 70 | 🟡 中 |
| AST | Asset Management | 62 | 🟡 中 |
| BCD | Business Continuity & Disaster Recovery | 58 | 🟡 中 |
| PES | Physical & Environmental Security | 51 | 🟡 中 |
| END | Endpoint Security | 47 | 🟡 中 |
| HRS | Human Resources Security | 46 | 🟡 中 |
| SEA | Secure Engineering & Architecture | 44 | 🟡 中 |
| IRO | Incident Response | 41 | 🟡 中 |
| GOV | Cybersecurity & Data Protection Governance | 38 | 🟢 低 |
| CPL | Compliance | 35 | 🟢 低 |
| VPM | Vulnerability & Patch Management | 33 | 🟢 低 |
| RSK | Risk Management | 32 | 🟢 低 |
| CRY | Cryptographic Protections | 29 | 🟢 低 |
| CFG | Configuration Management | 28 | 🟢 低 |
| MNT | Maintenance | 28 | 🟢 低 |
| TPM | Third-Party Management | 28 | 🟢 低 |
| CLD | Cloud Security | 24 | 🟢 低 |
| CHG | Change Management | 19 | 🟢 低 |
| EMB | Embedded Technology | 19 | 🟢 低 |
| SAT | Security Awareness & Training | 17 | 🟢 低 |
| IAO | Information Assurance | 15 | 🟢 低 |
| WEB | Web Security | 15 | 🟢 低 |
| THR | Threat Management | 13 | 🟢 低 |
| MDM | Mobile Device Management | 11 | 🟢 低 |
| PRM | Project & Resource Management | 11 | 🟢 低 |
| OPS | Security Operations | 8 | 🟢 低 |
| CAP | Capacity & Performance Planning | 6 | 🟢 低 |

## 🔗 合规框架映射

SCF 支持映射到以下框架：
- **NIST CSF** - 网络安全框架
- **NIST 800-53** - 安全控制指南
- **ISO 27001** - 信息安全管理体系
- **SOC 2** - 服务组织控制报告
- **PCI DSS** - 支付卡行业数据安全标准
- **CIS Controls** - 网络安全控制
- **HIPAA** - 健康保险便携性和责任法案
- **GDPR** - 通用数据保护条例
- **COBIT** - 信息技术控制目标
- **CCPA** - 加州消费者隐私法案

## 📚 详细文档

- **[README.md](./README.md)** - 完整的数据结构和使用说明
- **[SCF-SPLIT-SUMMARY.md](./SCF-SPLIT-SUMMARY.md)** - Excel 拆分过程汇总

## 🔄 数据更新

当需要更新 SCF 数据时：

```bash
# 1. 替换 Excel 文件
#    secure-controls-framework-scf.xlsx

# 2. 重新拆分
bun scripts/split-scf-sheets.ts

# 3. 验证数据
bun scripts/query-scf.ts --stats

# 4. 测试查询
bun scripts/query-scf.ts --control GOV-01
```

## 💾 数据统计

```bash
# 查看目录大小
du -sh data/scf/

# 查看各文件大小
ls -lh data/scf/*.json

# 统计 JSON 记录数
cat data/scf/scf-20254.json | jq '. | length'
```

## 🚀 集成到应用

### Gateway 集成

数据已在 Gateway 中自动加载：
```typescript
// packages/core/src/gateway/wrapper.ts
const scfDataPath = path.join(projectDataDir, "scf");
this.scfLoader = new SCFLoaderExtended(scfDataPath);
```

### API 端点

- **统计**: `GET /api/knowledge/scf/stats`
- **控制域**: `GET /api/knowledge/scf/domains`
- **更新**: `POST /api/knowledge/scf/update`

---

**数据完整**: ✅ 已验证
**更新日期**: 2025-02-26
**SCF 版本**: 2025.4
**状态**: 生产就绪
