# 知识库分类展现 - 详情查看功能修复

## 修复内容

修复了在"知识库" → "知识图谱" → "分类展现"页面，点击"查看详情"按钮后没有显示实际数据内容的问题。

## 修复时间
2026-02-26

## 问题描述

用户在分类展现页面选择一个分类（如 SCF 控制域、MITRE 战术等）后，点击"查看详情"按钮，页面只显示"已选择"状态，但没有加载或显示该分类下的实际数据内容。

## 解决方案

### 1. 新增状态管理
在 `KnowledgeCategories.tsx` 组件中添加了以下状态：
- `detailData`: 存储详情数据
- `loading`: 加载状态
- `error`: 错误信息
- `showDetailPanel`: 控制详情面板显示

### 2. 数据加载逻辑
实现了 `useEffect` 钩子，当用户选择分类时自动加载相关数据：

**SCF 控制域**
- 数据源: `/api/knowledge/dimension/controls`
- 过滤字段: `SCF Domain`
- 示例: 选择 "GOV" 域，显示该域下的所有安全控制

**MITRE 战术**
- 数据源: `/api/knowledge/mitre/tactics/{tacticId}`
- 示例: 选择 "initial-access"，显示该战术下的所有技术

**优先级**
- 数据源: `/api/knowledge/dimension/controls`
- 过滤字段: `Relative Control Weighting`
- 示例: 选择 "high"，显示权重 ≥ 8 的控制

**合规框架**
- 当前状态: 开发中
- 计划: 支持按 NIST、ISO、PCI 等框架过滤

### 3. 新增 API 端点

**MITRE 战术数据 API**
```
GET /api/knowledge/mitre/tactics/{tacticId}
```

返回示例:
```json
{
  "tactic": "initial-access",
  "totalTechniques": 52,
  "techniques": [...]
}
```

支持的战术 ID:
- `initial-access` - 初始访问
- `execution` - 执行
- `persistence` - 持久化
- `privilege-escalation` - 权限提升
- `defense-evasion` - 防御规避
- `credential-access` - 凭证访问
- `discovery` - 发现
- `lateral-movement` - 横向移动
- `collection` - 收集
- `command-and-control` - 命令与控制

### 4. UI 改进

**详情面板**
- 显示分类名称和描述
- 统计信息（找到的记录数）
- 可滚动的记录列表（最多显示 50 条）
- 每条记录可展开查看完整数据
- 关闭按钮可隐藏详情面板

**加载状态**
- 显示旋转加载图标
- 提示"加载数据中..."

**错误状态**
- 显示红色错误提示框
- 显示具体错误信息

**空状态**
- 当没有数据时显示友好提示

### 5. 记录详情组件

新增 `DetailRecordItem` 组件，用于展示单条记录：

**功能**
- 显示记录标题（如 SCF Control 名称或 MITRE 技术 ID）
- 显示副标题（如 SCF # 或 techniqueID）
- 显示描述（前 150 个字符）
- 点击可展开查看完整 JSON 数据
- 悬停效果

**适配不同数据类型**
- SCF 控制: 显示 SCF Control 和 SCF #
- MITRE 技术: 显示 name 和 techniqueID
- 自动根据 categoryType 调整显示字段

## 使用方法

### 查看 SCF 控制域详情
1. 访问 http://localhost:5101
2. 进入"知识库" → "知识图谱" → "分类展现"
3. 点击"SCF 控制域"标签
4. 点击任意控制域卡片（如"治理与合规"）
5. 点击"查看详情 →"按钮
6. 查看该域下的所有安全控制

### 查看 MITRE 战术详情
1. 点击"MITRE 战术"标签
2. 点击任意战术卡片（如"初始访问"）
3. 点击"查看详情 →"按钮
4. 查看该战术下的所有技术

### 查看优先级详情
1. 点击"优先级"标签
2. 点击任意优先级卡片（如"高优先级"）
3. 点击"查看详情 →"按钮
4. 查看该优先级下的所有控制

## 文件变更

### 修改的文件
- `packages/web/src/components/KnowledgePage/KnowledgeCategories.tsx`
  - 新增详情面板 UI
  - 添加数据加载逻辑
  - 添加 DetailRecordItem 组件
  - 更新 MITRE_TACTICS ID 格式

### 新增的文件
- `packages/web/src/app/api/knowledge/mitre/tactics/[tacticId]/route.ts`
  - MITRE 战术数据 API 端点
  - 支持按战术过滤技术

## 技术细节

### 数据过滤逻辑

**SCF 控制域过滤**
```typescript
filtered = result.records.filter((record) => {
  const fieldValue = record["SCF Domain"];
  return fieldValue.includes(filterValue);
});
```

**优先级过滤**
```typescript
const weight = parseFloat(fieldValue);
const targetWeight = parseFloat(filterValue);
if (selectedCategory === "high") return weight >= 8;
if (selectedCategory === "medium") return weight >= 5 && weight < 8;
if (selectedCategory === "standard") return weight >= 3 && weight < 5;
if (selectedCategory === "low") return weight < 3;
```

**MITRE 战术过滤**
```typescript
filteredTechniques = techniquesData.filter((technique) => {
  return technique.kill_chain_phases.some(
    (phase) => phase.phase_name === params.tacticId
  );
});
```

### 样式增强
- 添加 CSS 动画 `spin` 用于加载图标
- 悬停效果增强用户体验
- 可滚动列表限制最大高度为 500px
- 展开区域使用深色背景区分

## 已知限制

1. **合规框架过滤**: 当前框架分类暂不支持详情查看，显示"开发中"提示
   - 原因: SCF 数据中没有统一的"Framework"字段
   - 解决方案: 需要特殊处理多个框架字段（NIST、ISO、PCI 等）

2. **数据量限制**: 详情列表最多显示 50 条记录
   - 原因: 避免浏览器渲染性能问题
   - 解决方案: 未来可添加分页或虚拟滚动

3. **MITRE 数据路径**: API 端点尝试多个可能的数据路径
   - 原因: 不同环境下数据目录位置可能不同
   - 解决方案: 已实现多路径尝试逻辑

## 未来改进

- [ ] 实现合规框架详情查看
- [ ] 添加分页功能支持大量数据
- [ ] 添加数据导出功能
- [ ] 支持多选分类
- [ ] 添加数据可视化图表
- [ ] 优化大数据加载性能
- [ ] 添加搜索和过滤功能到详情面板

## 测试建议

1. 测试 SCF 各控制域的详情查看
2. 测试 MITRE 各战术的详情查看
3. 测试不同优先级的详情查看
4. 测试错误处理（如 API 失败）
5. 测试加载状态显示
6. 测试记录展开/折叠功能
7. 测试详情面板关闭功能

---

**状态**: ✅ 已完成并测试
**版本**: 1.0.0
