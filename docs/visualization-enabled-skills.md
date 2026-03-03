# Visualization-Enabled Skills 架构

## 概述

Visualization-Enabled Skills 是 SecuClaw 的核心架构升级，允许 Skills 不仅扩展后端能力，还能携带自己的可视化组件。这使得开源贡献者可以通过编写 Skills 来扩展系统的可视化能力，而无需修改核心前端代码。

## 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                    SKILL.md (YAML Frontmatter)                  │
├─────────────────────────────────────────────────────────────────┤
│  name: threat-hunter                                            │
│  description: Threat hunting skill                              │
│  visualizations:                                                │
│    mode: hybrid                                                 │
│    inline:                                                      │
│      - id: attack-timeline                                      │
│        type: timeline                                           │
│        dataSource: hunting.findings                             │
│        config: {...}                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              VisualizationLoader                                │
│  • 解析 inline 配置 (SKILL.md frontmatter)                       │
│  • 加载 visualizations.yaml manifest                            │
│  • 加载独立 visualization 文件                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│           SkillVisualizationManager                             │
│  • 注册/注销 skill 可视化                                        │
│  • 按类型/类别查询                                                │
│  • 连接 VisualizationRegistry                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              VisualizationRegistry                              │
│  • 管理可视化定义和实例                                           │
│  • 创建 Dashboard                                                │
│  • 8种内置可视化类型                                              │
└─────────────────────────────────────────────────────────────────┘
```

## 可视化定义方式

### 方式一：Inline（推荐用于简单场景）

直接在 `SKILL.md` 的 frontmatter 中定义可视化：

```yaml
---
name: my-skill
visualizations:
  mode: inline
  inline:
    - id: my-chart
      name: "My Chart"
      type: chart
      dataSource: mySkill.data
      config:
        chart:
          subType: bar
          xAxis:
            field: category
          yAxis:
            field: value
---
```

### 方式二：Manifest 文件（推荐用于复杂场景）

创建 `visualizations.yaml` 文件：

```yaml
version: "1.0"
visualizations:
  - id: attack-timeline
    name: "Attack Timeline"
    type: timeline
    dataSource: hunting.findings
    config:
      timeField: timestamp
      eventField: title
      groupField: mitreTactic

components:
  - path: ./components/custom-viz.ts
    format: typescript
    exports: ["CustomVisualization"]

dependencies:
  d3: "^7.0.0"
```

### 方式三：独立文件

在 `visualizations/` 目录下创建单独的文件：

```
skills/my-skill/
├── SKILL.md
└── visualizations/
    ├── timeline.yaml
    ├── graph.yaml
    └── table.yaml
```

## 支持的可视化类型

| 类型 | 描述 | 适用场景 |
|------|------|----------|
| `timeline` | 时间线 | 事件序列、攻击链 |
| `chart` | 图表（line/bar/pie等） | 趋势分析、对比 |
| `table` | 数据表 | 详细数据展示 |
| `graph` | 网络图 | 关系分析、拓扑 |
| `heatmap` | 热力图 | MITRE覆盖、密度分析 |
| `gauge` | 仪表盘 | 指标监控、进度 |
| `map` | 地图 | 地理分布 |
| `treemap` | 树图 | 层级结构 |
| `sankey` | 桑基图 | 流向分析 |
| `custom` | 自定义 | 任意 React/Vue 组件 |

## 配置参考

### 基础配置

```typescript
interface SkillVisualizationConfig {
  id: string;                    // 唯一标识
  name: string;                  // 显示名称
  description?: string;          // 描述
  type: VisualizationType;       // 可视化类型
  category?: VisualizationCategory; // dashboard/report/widget/panel/modal
  
  dataSource: string;            // 数据源路径
  dataTransform?: string;        // 数据转换函数
  refreshInterval?: number;      // 刷新间隔(ms)
  
  config: Record<string, unknown>; // 类型特定配置
  layout?: LayoutConfig;         // 布局配置
  styling?: StylingConfig;       // 样式配置
  interactions?: Interaction[];  // 交互配置
  permissions?: PermissionConfig; // 权限配置
}
```

### Timeline 配置示例

```yaml
- id: attack-timeline
  type: timeline
  dataSource: hunting.findings
  config:
    timeField: timestamp
    eventField: title
    groupField: mitreTactic
    colorBy: severity
    zoomable: true
    showLabels: true
    orientation: horizontal
  layout:
    width: 100%
    height: 400
  interactions:
    - type: click
      action: drilldown
      params:
        target: finding-detail
```

### Graph 配置示例

```yaml
- id: ioc-network
  type: graph
  dataSource: hunting.iocs
  config:
    nodeField: id
    layout: force          # force/tree/radial/circular/hierarchical
    nodeConfig:
      labelField: value
      sizeField: connections
      colorField: type
      shape: circle        # circle/square/diamond/icon
    edgeConfig:
      curved: true
      animated: true
    zoomable: true
    draggable: true
  layout:
    width: 100%
    height: 500
```

### Table 配置示例

```yaml
- id: findings-table
  type: table
  dataSource: hunting.findings
  config:
    columns:
      - field: timestamp
        header: "Time"
        sortable: true
        render: date
      - field: title
        header: "Finding"
        sortable: true
        filterable: true
      - field: severity
        header: "Severity"
        render: badge
        renderConfig:
          colors:
            critical: "#dc3545"
            high: "#fd7e14"
            medium: "#ffc107"
            low: "#28a745"
    pagination:
      enabled: true
      pageSize: 20
    sorting:
      enabled: true
      defaultField: timestamp
      defaultDirection: desc
    filtering:
      enabled: true
      globalSearch: true
    selection: multiple
```

### Chart 配置示例

```yaml
- id: threat-trend
  type: chart
  dataSource: threats.timeline
  config:
    chart:
      subType: line
      xAxis:
        field: date
        type: time
      yAxis:
        field: count
        type: linear
      series:
        - field: detected
          name: "Detected"
          color: "#dc3545"
        - field: blocked
          name: "Blocked"
          color: "#28a745"
      legend:
        position: bottom
        show: true
      tooltip:
        show: true
        trigger: axis
      zoom: true
      animation: true
```

## API 参考

### VisualizationLoader

```typescript
import { 
  loadSkillVisualizations,
  parseVisualizationsFromFrontmatter,
  loadVisualizationManifest,
  loadVisualizationFiles,
} from '@secuclaw/core/skills';

// 加载 skill 的所有可视化
const viz = loadSkillVisualizations(skill, 'hybrid');

// 解析 frontmatter 中的可视化
const inlineViz = parseVisualizationsFromFrontmatter(frontmatter);

// 加载 manifest 文件
const manifest = loadVisualizationManifest('/path/to/skill');

// 加载独立文件
const fileViz = loadVisualizationFiles('/path/to/skill');
```

### SkillVisualizationManager

```typescript
import { createSkillVisualizationManager } from '@secuclaw/core/skills';

const manager = createSkillVisualizationManager();

// 注册 skill
manager.registerSkill(skill);

// 查询可视化
const viz = manager.getVisualization('threat-hunter', 'attack-timeline');
const allCharts = manager.getVisualizationsByType('chart');
const dashboards = manager.getVisualizationsByCategory('dashboard');

// 获取统计
const stats = manager.getStatistics();
// { totalSkills: 5, totalVisualizations: 23, byType: {...}, byCategory: {...} }

// 连接渲染层
manager.setRegistry(visualizationRegistry);
```

### VisualizationRegistry

```typescript
import { createVisualizationRegistry } from '@secuclaw/core/visualization';

const registry = createVisualizationRegistry();

// 注册可视化
registry.registerSkillVisualization({
  skillId: 'threat-hunter',
  name: 'Attack Timeline',
  type: 'timeline',
  dataSchema: { input: [...] },
  config: { ... }
});

// 创建实例
const instance = registry.createInstance({
  visualizationId: 'viz_xxx',
  context: { dashboardId: 'main' },
  data: findings
});

// 创建 Dashboard
const dashboard = registry.createDashboard({
  name: 'Security Overview',
  widgets: [
    { visualizationId: 'viz_1', position: { x: 0, y: 0, width: 6, height: 4 } },
    { visualizationId: 'viz_2', position: { x: 6, y: 0, width: 6, height: 4 } },
  ]
});
```

## 数据源规范

Skills 需要提供数据源以供可视化使用。数据源通过 `dataSource` 字段指定：

```yaml
visualizations:
  - id: my-viz
    dataSource: mySkill.metrics
```

### 数据源命名约定

```
{skillName}.{entity}[.{attribute}]
```

示例：
- `hunting.findings` - 威胁狩猎发现
- `hunting.mitreCoverage` - MITRE 覆盖率
- `hunting.iocs` - IOC 列表
- `hunting.progress` - 搜索进度
- `trace.attackChain` - 攻击链
- `remediation.items` - 整改项
- `propagation.graph` - 风险传播图

### 数据转换

使用 `dataTransform` 指定转换函数：

```yaml
dataSource: hunting.findings
dataTransform: sortByTimestamp
```

内置转换函数：
- `sortByTimestamp` - 按时间排序
- `groupBySeverity` - 按严重程度分组
- `filterActive` - 过滤活跃项
- `aggregate` - 聚合统计

## 权限控制

```yaml
visualizations:
  - id: sensitive-data
    permissions:
      viewRoles: ["security-analyst", "admin"]
      editRoles: ["admin"]
```

## 完整示例

参见 `/skills/threat-hunter/SKILL.md` - 包含 5 种可视化类型的完整示例：

1. **Attack Timeline** - 攻击事件时间线
2. **MITRE Heatmap** - MITRE ATT&CK 覆盖热力图
3. **IOC Network** - IOC 关系网络图
4. **Hunt Progress** - 搜索进度仪表盘
5. **Findings Table** - 发现详情表

## 贡献指南

### 创建带可视化的 Skill

1. 创建 Skill 目录
```bash
mkdir -p skills/my-skill
```

2. 创建 SKILL.md
```markdown
---
name: my-skill
visualizations:
  inline:
    - id: my-viz
      type: chart
      ...
---
# My Skill
...
```

3. （可选）创建独立可视化文件
```bash
mkdir -p skills/my-skill/visualizations
# 创建 .yaml 或 .json 文件
```

4. 测试
```typescript
const skill = loadSkillFromDir('./skills/my-skill');
const viz = loadSkillVisualizations(skill);
console.log(viz.manifest.visualizations);
```

### 最佳实践

1. **选择合适的类型** - 简单可视化用 inline，复杂可视化用 manifest
2. **合理命名数据源** - 遵循 `{skill}.{entity}` 命名约定
3. **设置权限** - 敏感数据可视化需要权限控制
4. **响应式布局** - 使用百分比宽度和 minHeight
5. **性能优化** - 大数据量使用分页和虚拟滚动

## 文件结构

```
packages/core/src/skills/
├── visualization-types.ts    # 类型定义
├── visualization-loader.ts   # 加载器
├── visualization-manager.ts  # 管理器
└── index.ts                  # 导出

packages/core/src/visualization/
├── types.ts                  # 可视化核心类型
├── engine.ts                 # VisualizationRegistry
└── index.ts                  # 导出

skills/
├── threat-hunter/
│   ├── SKILL.md              # Skill 定义 + 可视化配置
│   └── visualizations/       # （可选）独立可视化文件
└── test-visualization-skill/ # 验证用测试 Skill
    ├── SKILL.md              # 2 个 inline 可视化
    ├── visualizations.yaml   # 2 个 manifest 可视化
    └── visualizations/       # 2 个 file 可视化
        ├── network-graph.yaml
        └── heatmap.json
```

## 功能验证

### 验证测试 Skill

项目提供了 `test-visualization-skill` 用于验证三种可视化定义方式都能正常工作。

```
skills/test-visualization-skill/
├── SKILL.md                    # Inline: inline-chart, inline-gauge
├── visualizations.yaml         # Manifest: manifest-timeline, manifest-table
└── visualizations/
    ├── network-graph.yaml      # File: files-network-graph
    └── heatmap.json            # File: files-heatmap
```

### 测试用例

测试文件: `packages/core/src/skills/visualization-loader.test.ts`

```typescript
describe('Visualization Loader - Three Definition Methods', () => {
  // Method 1: Inline
  it('should parse inline visualizations from frontmatter', () => {
    const inlineViz = parseVisualizationsFromFrontmatter(frontmatter);
    expect(inlineViz.length).toBeGreaterThanOrEqual(2);
    expect(inlineViz.find(v => v.id === 'inline-chart')).toBeDefined();
    expect(inlineViz.find(v => v.id === 'inline-gauge')).toBeDefined();
  });

  // Method 2: Manifest
  it('should load visualization manifest from skill directory', () => {
    const manifest = loadVisualizationManifest(TEST_SKILL_DIR);
    expect(manifest?.visualizations.length).toBeGreaterThanOrEqual(2);
    expect(manifest?.visualizations.find(v => v.id === 'manifest-timeline')).toBeDefined();
    expect(manifest?.visualizations.find(v => v.id === 'manifest-table')).toBeDefined();
  });

  // Method 3: Files
  it('should load visualization files from visualizations/ directory', () => {
    const fileViz = loadVisualizationFiles(TEST_SKILL_DIR);
    expect(fileViz.length).toBeGreaterThanOrEqual(2);
    expect(fileViz.find(v => v.id === 'files-network-graph')).toBeDefined();
    expect(fileViz.find(v => v.id === 'files-heatmap')).toBeDefined();
  });

  // Hybrid: All Three Combined
  it('should combine visualizations from all three sources', () => {
    const skillViz = loadSkillVisualizations(skill, 'hybrid');
    expect(skillViz?.manifest.visualizations.length).toBeGreaterThanOrEqual(6);
    
    const ids = skillViz!.manifest.visualizations.map(v => v.id);
    expect(ids).toContain('inline-chart');       // Inline
    expect(ids).toContain('inline-gauge');       // Inline
    expect(ids).toContain('manifest-timeline');  // Manifest
    expect(ids).toContain('manifest-table');     // Manifest
    expect(ids).toContain('files-network-graph'); // File
    expect(ids).toContain('files-heatmap');     // File
  });
});
```

### 验证结果

| 方式 | 测试文件数 | 可视化数量 | 验证状态 |
|------|-----------|-----------|----------|
| **Inline** | 1 (SKILL.md) | 2 | ✅ 通过 |
| **Manifest** | 1 (visualizations.yaml) | 2 | ✅ 通过 |
| **Files** | 2 (*.yaml, *.json) | 2 | ✅ 通过 |
| **Hybrid** | 以上所有 | 6 | ✅ 通过 |

### 运行测试

```bash
cd secuclaw/packages/core
pnpm test visualization-loader.test.ts
```

### 验证覆盖范围

- ✅ Inline 可视化解析
- ✅ Manifest 文件加载
- ✅ Files 目录扫描 (YAML + JSON)
- ✅ Hybrid 模式组合
- ✅ 去重逻辑
- ✅ 加载模式切换 (inline/external/hybrid)
- ✅ 配置验证 (类型、类别、必填字段)

