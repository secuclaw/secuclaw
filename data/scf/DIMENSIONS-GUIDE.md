# SCF 知识库维度完全指南

## 📚 维度概览

SCF 知识库包含 **9 个数据维度**，总计 **8,111 条记录**，约 **37 MB** 数据。

### 维度分类

| 类型 | 维度数量 | 说明 |
|------|----------|------|
| **核心数据** | 1 | 安全控制 (主要实体) |
| **分类数据** | 1 | 控制域 (组织结构) |
| **评估数据** | 1 | 评估目标 (测试方法) |
| **证据数据** | 1 | 证据请求 (审计清单) |
| **映射数据** | 1 | 权威来源 (合规框架) |
| **指导数据** | 1 | 隐私原则 (实施指导) |
| **参考数据** | 2 | 风险/威胁目录 (分类参考) |
| **辅助数据** | 1 | 参考列表 (辅助信息) |

## 📋 各维度详解

### 1. 安全控制 (scf-20254.json) ⭐ 核心维度

**文件**: `scf-20254.json`
**记录数**: 1,451
**大小**: 29.3 MB
**类型**: 核心数据

**主要字段**:
- `SCF #` - 控制编号 (如: GOV-01, NET-05)
- `SCF Control` - 控制名称
- `SCF Domain` - 所属控制域
- `Secure Controls Framework (SCF)\r\nControl Description` - 控制描述
- `Relative Control Weighting` - 控制权重 (1-10)
- `Conformity Validation\r\nCadence` - 验证周期
- `Evidence Request List (ERL) #` - 关联的证据请求
- `NIST CSF\r\nFunction Grouping` - NIST 功能分组

**分类维度**:
- 按 **控制域** 分类: 34 个域
- 按 **权重** 分类: 高(8-10), 中(5-7), 标准(3-4), 低(1-2)
- 按 **NIST 功能** 分类: Govern, Identify, Protect, Detect, Respond, Recover
- 按 **PPTDF 类型** 分类: Process, Technology, Data, Facility

**关系**:
- → 被 **控制域** 包含
- → 被 **评估目标** 测试
- → 需要 **证据请求** 支持
- → 遵循 **隐私原则** 指导
- → 映射到 **权威来源** 框架

---

### 2. 控制域 (scf-domains-principles.json)

**文件**: `scf-domains-principles.json`
**记录数**: 34
**大小**: 20.5 KB
**类型**: 分类数据

**主要字段**:
- `# ` - 序号
- `SCF Domain` - 域名称
- `SCF Identifier` - 域标识符 (如: GOV, NET, IAC)
- `Cybersecurity & Data Privacy by Design (C|P) Principles` - 设计原则
- `Principle Intent` - 原则意图

**控制域列表** (前 10 个):
1. **GOV** - Cybersecurity & Data Protection Governance (38 控制)
2. **AAT** - Artificial Intelligence & Autonomous Technologies (156 控制)
3. **IAC** - Identification & Authentication (112 控制)
4. **NET** - Network Security (98 控制)
5. **PRI** - Data Privacy (102 控制)
6. **DCH** - Data Classification & Handling (85 控制)
7. **MON** - Continuous Monitoring (70 控制)
8. **TDA** - Technology Development & Acquisition (70 控制)
9. **AST** - Asset Management (62 控制)
10. **BCD** - Business Continuity & Disaster Recovery (58 控制)

**关系**:
- → 包含 **安全控制**
- → 提供组织架构视图

---

### 3. 评估目标 (assessment-objectives-20254.json)

**文件**: `assessment-objectives-20254.json`
**记录数**: 5,736
**大小**: 6.5 MB
**类型**: 评估数据

**主要字段**:
- `SCF #` - 关联的控制编号
- `SCF AO #` - 评估目标编号
- `SCF Assessment Objective (AO)` - 评估目标描述
- `PPTDF\r\nApplicability` - 适用类型 (Process/Technology/Data/Facility)
- `SCF Assessment Objective (AO) Origin(s)` - 目标来源

**使用场景**:
- 合规性评估测试
- 审计检查清单
- 控制实施验证
- 第三方认证准备

**关系**:
- → 评估 **安全控制** 的实施情况
- → 平均每个控制有 ~4 个评估目标

---

### 4. 证据请求 (evidence-request-list-20254.json)

**文件**: `evidence-request-list-20254.json`
**记录数**: 272
**大小**: 101 KB
**类型**: 证据数据

**主要字段**:
- `ERL #` - 证据请求编号 (如: E-GOV-01)
- `Area of Focus` - 关注领域
- `Documentation Artifact` - 文档工件
- `Artifact Description` - 工件描述

**使用场景**:
- 合规审计准备
- 证据收集指导
- 文档清单管理
- 审计轨迹建立

**关系**:
- → 支持 **安全控制** 的验证
- → 被引用在控制的 `Evidence Request List (ERL) #` 字段

---

### 5. 权威来源 (authoritative-sources.json)

**文件**: `authoritative-sources.json`
**记录数**: 261
**大小**: 111.6 KB
**类型**: 映射数据

**主要字段**:
- `Geography` - 适用地区 (US/EU/Global/APAC)
- `Mapping Column Header` - 映射列标题
- `Source` - 来源框架 (NIST/ISO/PCI/CIS/HIPAA/GDPR)
- `Authoritative Source - Law, Regulation or Framework (LRF)` - 法律/法规/框架
- `URL - Authoritative Source` - 官方链接

**支持的框架**:
- **NIST CSF** - 网络安全框架 (US)
- **NIST 800-53** - 安全控制指南 (US)
- **ISO 27001** - 信息安全管理体系 (Global)
- **ISO 27002** - 信息安全控制 (Global)
- **SOC 2** - 服务组织控制报告 (US)
- **PCI DSS** - 支付卡数据安全标准 (Global)
- **CIS Controls** - 网络安全控制 (Global)
- **HIPAA** - 健康保险便携性 (US)
- **GDPR** - 通用数据保护条例 (EU)
- **CCPA** - 加州消费者隐私法案 (US)

**使用场景**:
- 合规框架映射
- 跨框架对照
- 合规差距分析
- 多框架认证

---

### 6. 隐私原则 (data-privacy-mgmt-principles.json)

**文件**: `data-privacy-mgmt-principles.json`
**记录数**: 258
**大小**: 949.5 KB
**类型**: 指导数据

**主要字段**:
- `#` - 序号
- `Principle Name` - 原则名称
- `SCF Data Privacy Management Principle (SCF-DPMP) Description` - 原则描述
- `SCF Control` - 关联的控制
- `SCF #` - 控制编号

**隐私原则类别**:
- **Lawfulness** - 合法性
- **Fairness** - 公平性
- **Transparency** - 透明度
- **Purpose Limitation** - 目的限制
- **Data Minimization** - 数据最小化
- **Accuracy** - 准确性
- **Storage Limitation** - 存储限制
- **Integrity** - 完整性
- **Confidentiality** - 保密性

**使用场景**:
- GDPR/CCPA 合规
- 隐私保护设计
- 数据治理指导
- 隐私影响评估

---

### 7. 风险目录 (risk-catalog.json)

**文件**: `risk-catalog.json`
**记录数**: 45
**大小**: 23.6 KB
**类型**: 参考数据

**内容**: 网络安全风险分类和定义

**使用场景**:
- 风险识别参考
- 风险评估指导
- 控制缺陷分析
- 风险登记册

---

### 8. 威胁目录 (threat-catalog.json)

**文件**: `threat-catalog.json`
**记录数**: 47
**大小**: 33.1 KB
**类型**: 参考数据

**内容**: 网络安全威胁分类和定义

**使用场景**:
- 威胁建模参考
- 威胁识别指导
- 对抗措施规划
- 威胁情报基础

**与 MITRE ATT&CK 关联**:
- 可映射到 MITRE 战术
- 支持威胁分析
- 指导防御策略

---

### 9. 参考列表 (lists.json)

**文件**: `lists.json`
**记录数**: 7
**大小**: 408 B
**类型**: 辅助数据

**内容**: 各种参考数据和列表

**使用场景**:
- 辅助分类
- 参考对照
- 数据验证

---

## 🔗 维度关系图

```
┌─────────────────────────────────────────────────────────────┐
│                    安全控制 (核心)                            │
│                  scf-20254.json (1,451)                     │
└────┬──────────────┬──────────────┬──────────────┬────────────┘
     │              │              │              │
     ↓              ↓              ↓              ↓
┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│控制域   │  │评估目标  │  │证据请求  │  │隐私原则  │
│(34)     │  │(5,736)   │  │(272)     │  │(258)     │
└─────────┘  └──────────┘  └──────────┘  └──────────┘
     │              │              │              │
     ↓              ↓              ↓              ↓
  按域组织      测试方法       证据收集      隐私合规

     └──────────────┬──────────────┘
                    ↓
             ┌──────────┐
             │权威来源  │
             │(261)     │
             └──────────┘
                    ↓
              框架映射对照
```

## 💡 维度使用场景

### 场景 1: 安全控制实施
```
1. 查看 scf-20254.json - 选择控制
2. 参考 scf-domains-principles.json - 了解所属域
3. 使用 assessment-objectives-20254.json - 确定测试方法
4. 准备 evidence-request-list-20254.json - 收集证据
```

### 场景 2: 合规认证
```
1. 使用 authoritative-sources.json - 选择框架 (如: ISO 27001)
2. 查看映射关系 - 确定覆盖的控制
3. 运行 assessment-objectives-20254.json - 执行评估
4. 生成 evidence-request-list-20254.json - 准备审计
```

### 场景 3: 隐私合规
```
1. 参考 data-privacy-mgmt-principles.json - 了解隐私原则
2. 映射到 scf-20254.json - 实施相关控制
3. 使用 risk-catalog.json - 评估隐私风险
4. 对接 GDPR 框架 - 确保合规
```

### 场景 4: 威胁建模
```
1. 参考 threat-catalog.json - 识别威胁
2. 映射到 MITRE ATT&CK - 分析技术
3. 查看 scf-20254.json - 选择防御控制
4. 使用 assessment-objectives-20254.json - 验证防护
```

## 📊 维度统计

### 记录数分布
```
评估目标:    5,736 (70.7%)  ████████████████████████████████
安全控制:    1,451 (17.9%)  ████████
隐私原则:      258 ( 3.2%)  █
权威来源:      261 ( 3.2%)  █
证据请求:      272 ( 3.4%)  █
威胁目录:       47 ( 0.6%)  ▏
风险目录:       45 ( 0.6%)  ▏
控制域:         34 ( 0.4%)  ▏
参考列表:        7 ( 0.1%)  ▏
```

### 大小分布
```
安全控制:     29.3 MB (79.2%)  ████████████████████████████████
评估目标:      6.5 MB (17.6%)  ███████
隐私原则:      0.9 MB ( 2.4%)  ██
权威来源:      0.1 MB ( 0.3%)  ▏
证据请求:      0.1 MB ( 0.3%)  ▏
其他:         0.1 MB ( 0.2%)  ▏
```

## 🔍 维度查询示例

### 查询 1: 获取某个域的所有控制
```typescript
// 1. 从 scf-domains-principles.json 获取域信息
const domain = domains.find(d => d['SCF Identifier'] === 'GOV');

// 2. 从 scf-20254.json 筛选该域的控制
const govControls = controls.filter(c => c['SCF Domain'] === domain['SCF Domain']);
```

### 查询 2: 获取某个控制的评估目标
```typescript
// 从 assessment-objectives-20254.json 查找
const objectives = assessmentObjectives.filter(
  ao => ao['SCF #'] === 'GOV-01'
);
```

### 查询 3: 获取控制对应的证据请求
```typescript
// 解析控制中的 ERL 引用
const control = controls.find(c => c['SCF #'] === 'GOV-01');
const erlRefs = control['Evidence Request List (ERL) #'].split(/\r\n/);

// 从 evidence-request-list-20254.json 查找
const evidenceRequests = erlRefs
  .map(ref => evidenceList.find(e => e['ERL #'] === ref))
  .filter(Boolean);
```

### 查询 4: 获取框架映射
```typescript
// 从 authoritative-sources.json 查找特定框架
const nistSources = authoritativeSources.filter(
  s => s['Source'] === 'NIST CSF'
);
```

## 📈 扩展维度

系统支持以下维度扩展：

### 计划中的维度
- [ ] **控制实施指南** - 实施步骤和最佳实践
- [ ] **控制测试用例** - 详细测试场景
- [ ] **常见问题解答** - FAQ 知识库
- [ ] **工具推荐** - 实施工具清单
- [ ] **培训材料** - 员工培训资源

### 自定义维度
- [ ] 组织特定控制
- [ ] 行业特定要求
- [ ] 地方法规映射
- [ ] 内部流程文档

## 🔄 维度更新

当 SCF 更新时：
```bash
# 1. 更新 Excel 文件
# 2. 重新拆分
bun scripts/split-scf-sheets.ts

# 3. 重新分析维度
bun scripts/analyze-scf-dimensions.ts

# 4. 验证数据
bun scripts/query-scf.ts --stats
```

---

**版本**: 1.0.0
**更新**: 2025-02-26
**状态**: ✅ 完成
