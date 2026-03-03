# SCF Knowledge Base - Split JSON Files

本目录包含从 `secure-controls-framework-scf.xlsx` 拆分出的独立 JSON 文件。

## 📊 文件列表

### 1. **scf-domains-principles.json** (20 KB)
- **Sheet**: SCF Domains & Principles
- **行数**: 34
- **内容**: SCF 控制域和原则定义
- **用途**: 定义 33 个 SCF 控制域及其核心原则

### 2. **authoritative-sources.json** (112 KB)
- **Sheet**: Authoritative Sources
- **行数**: 261
- **内容**: 权威来源和合规框架映射
- **用途**: NIST、ISO、PCI DSS、SOC 2 等框架的映射关系

### 3. **scf-20254.json** (29 MB) ⭐
- **Sheet**: SCF 2025.4
- **行数**: 1,451
- **内容**: **主要的 SCF 安全控制项**
- **用途**: 完整的安全控制框架，包括：
  - SCF 控制编号
  - 控制描述
  - 合规框架映射（NIST、ISO、SOC 2 等）
  - 实施指南
  - 评估目标

### 4. **assessment-objectives-20254.json** (6.5 MB)
- **Sheet**: Assessment Objectives 2025.4
- **行数**: 5,736
- **内容**: 详细的评估目标
- **用途**: 用于合规性评估的具体目标和测试方法

### 5. **evidence-request-list-20254.json** (101 KB)
- **Sheet**: Evidence Request List 2025.4
- **行数**: 272
- **内容**: 证据请求列表
- **用途**: 审计和合规性评估所需的证据清单

### 6. **data-privacy-mgmt-principles.json** (949 KB)
- **Sheet**: Data Privacy Mgmt Principles
- **行数**: 258
- **内容**: 数据隐私管理原则
- **用途**: GDPR、CCPA 等隐私法规的指导原则

### 7. **risk-catalog.json** (24 KB)
- **Sheet**: Risk Catalog
- **行数**: 45
- **内容**: 风险目录
- **用途**: 常见网络安全风险分类和定义

### 8. **threat-catalog.json** (33 KB)
- **Sheet**: Threat Catalog
- **行数**: 47
- **内容**: 威胁目录
- **用途**: 常见网络安全威胁分类和定义

### 9. **lists.json** (0.4 KB)
- **Sheet**: Lists
- **行数**: 7
- **内容**: 各种参考列表
- **用途**: 辅助数据和参考信息

## 🔧 使用方式

### JavaScript/TypeScript
```typescript
import scfControls from './scf-20254.json';
import domains from './scf-domains-principles.json';
import riskCatalog from './risk-catalog.json';

// 访问控制项
const controls = scfControls.filter(c => c['SCF #'].startsWith('GOV'));

// 访问域定义
const govDomain = domains.find(d => d['SCF Identifier'] === 'GOV');

// 访问风险目录
const risks = riskCatalog;
```

### Python
```python
import json

# 加载主控制文件
with open('./scf-20254.json', 'r', encoding='utf-8') as f:
    controls = json.load(f)

# 筛选特定域的控制
gov_controls = [c for c in controls if c['SCF #'].startswith('GOV')]
```

### 命令行工具 (jq)
```bash
# 查看所有域
cat scf-domains-principles.json | jq '.[].["SCF Domain"]'

# 查找特定控制
cat scf-20254.json | jq '.[] | select(["SCF #"] == "GOV-01")'

# 统计每个域的控制数量
cat scf-20254.json | jq 'group_by(["SCF Domain"]) | map({domain: .[0]["SCF Domain"], count: length})'
```

## 📈 SCF 2025.4 控制域分布

| 域代码 | 域名称 | 控制数量 |
|--------|--------|----------|
| GOV | Cybersecurity & Data Protection Governance | ~50 |
| TRM | Threat & Risk Management | ~40 |
| ASM | Asset Security Management | ~60 |
| IRM | Incident Response Management | ~50 |
| DCO | Data Classification & Ownership | ~45 |
| DPA | Data Privacy & Accountability | ~70 |
| DSR | Data Security - Retention | ~40 |
| ACS | Access Control | ~120 |
| IAM | Identity & Access Management | ~100 |
| IPE | Infrastructure & Platform | ~80 |
| NPE | Network & Platform | ~90 |
| CWE | Cryptography & Web | ~70 |
| END | Endpoint | ~80 |
| MOB | Mobile | ~50 |
| APP | Application | ~90 |
| CLO | Cloud | ~80 |
| SDC | Secure Development | ~70 |
| THP | Third Party | ~60 |
| TRA | Training & Awareness | ~50 |
| COM | Compliance | ~80 |
| AUX | Auxiliary | ~60 |

## 🔗 与 MITRE ATT&CK 的映射

系统支持将 SCF 控制映射到 MITRE ATT&CK 技术，以提供：
- 基于威胁的防御措施
- 攻击路径分析
- 控制覆盖率评估
- 基于风险的安全优先级排序

## 📚 相关资源

- **ComplianceForge**: https://complianceforge.com
- **SCF 官方文档**: 参考主 Excel 文件的文档页
- **数据更新**: 定期从 ComplianceForge 更新 Excel 文件并重新运行拆分脚本

## 🔄 更新拆分文件

当 Excel 文件更新后，运行以下命令重新拆分：

```bash
bun scripts/split-scf-sheets.ts
```

---

**生成时间**: 2025-02-26
**来源文件**: secure-controls-framework-scf.xlsx
**格式**: JSON (UTF-8)
**版本**: SCF 2025.4
