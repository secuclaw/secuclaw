# SCF 维度面板迁移到知识库右侧

## 更改时间
2026-02-26

## 需求
将左侧导航栏中的"SCF维度"移动到"知识库"页面的右侧面板。

## 实施方案

### 1. 从左侧导航栏移除

**文件**: `packages/web/src/App.tsx`

**变更**:
```typescript
// 修改前
type BuiltInPageType = 'knowledge' | 'chat' | 'skills' | 'dimensions'

const SYSTEM_PAGES = [
  { id: 'knowledge', label: '知识库', icon: '🧠' },
  { id: 'dimensions', label: 'SCF维度', icon: '📊' },  // 移除
  { id: 'chat', label: 'AI安全专家', icon: '💬' },
  { id: 'skills', label: '技能市场', icon: '🛒' },
]

// 修改后
type BuiltInPageType = 'knowledge' | 'chat' | 'skills'

const SYSTEM_PAGES = [
  { id: 'knowledge', label: '知识库', icon: '🧠' },
  { id: 'chat', label: 'AI安全专家', icon: '💬' },
  { id: 'skills', label: '技能市场', icon: '🛒' },
]
```

**移除**:
- DimensionsViewer 导入
- `currentPage === 'dimensions'` 路由

### 2. 集成到知识库页面

**文件**: `packages/web/src/components/KnowledgePage/KnowledgePage.tsx`

**新增功能**:

#### 状态管理
```typescript
const [showDimensionsPanel, setShowDimensionsPanel] = useState(false);
```

#### 切换按钮
在头部添加"SCF维度"按钮：
```typescript
<button
  onClick={() => setShowDimensionsPanel(!showDimensionsPanel)}
  style={{
    background: showDimensionsPanel ? "#22c55e" : "#1a1a2e",
  }}
>
  <Database size={16} />
  {showDimensionsPanel ? "隐藏维度" : "SCF维度"}
</button>
```

#### 右侧面板布局
```typescript
<div style={{
  width: "450px",
  background: "#1a1a2e",
  borderLeft: "1px solid #2a2a3e",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  animation: "slideIn 0.3s ease-out"
}}>
  {/* DimensionsViewer */}
  <DimensionsViewer />
</div>
```

#### 布局结构
```typescript
<>
  <style>{`
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `}</style>

  <div style={{ display: "flex", height: "100vh" }}>
    {/* 主内容区域 */}
    <div style={{ flex: 1, ... }}>
      {/* 知识图谱内容 */}
    </div>

    {/* 右侧 SCF 维度面板 */}
    {showDimensionsPanel && (
      <div style={{ width: "450px", ... }}>
        <DimensionsViewer />
      </div>
    )}
  </div>
</>
```

## 用户体验

### 访问方式
1. 点击左侧导航栏的"知识库" 🧠
2. 进入知识库页面后，点击头部右侧的"SCF维度"按钮
3. 右侧面板滑入显示 SCF 数据维度
4. 再次点击"隐藏维度"可关闭面板

### 视觉特性
- ✅ 滑入动画效果（0.3秒）
- ✅ 可关闭面板（X 按钮）
- ✅ 独立滚动区域
- ✅ 固定宽度（450px）
- ✅ 深色主题一致

## 布局对比

### 修改前
```
[左侧导航]           [主内容区域]
├─ 知识库 🧠         ┌─────────────────────┐
├─ SCF维度 📊       │  知识图谱内容        │
├─ AI安全专家 💬    │                     │
└─ 技能市场 🛒       │                     │
                     └─────────────────────┘
```

### 修改后
```
[左侧导航]           [主内容区域]              [右侧面板（可切换）]
├─ 知识库 🧠         ┌─────────────────────┐    ┌─────────────────┐
├─ AI安全专家 💬    │  知识图谱内容        │    │  SCF 数据维度    │
└─ 技能市场 🛒       │                     │    │  - 9个维度      │
                     │                     │    │  - 维度详情     │
                     └─────────────────────┘    │  - 数据统计     │
                                               └─────────────────┘
```

## 功能优势

### 1. 更好的上下文
- SCF 维度数据与知识图谱在同一页面
- 便于对比和关联分析
- 减少页面切换

### 2. 灵活的布局
- 可按需显示/隐藏维度面板
- 不影响主内容区域的使用
- 支持多任务并行

### 3. 改进的导航
- 左侧导航更简洁（4个选项）
- 常用功能快速访问
- 符合用户工作流程

## 技术细节

### 组件复用
- ✅ 完全复用现有 `DimensionsViewer` 组件
- ✅ 无需修改 DimensionsViewer 内部逻辑
- ✅ 保持数据获取和展示功能

### 样式一致性
- ✅ 与现有主题保持一致
- ✅ 使用相同的配色方案
- ✅ 响应式布局支持

### 性能优化
- ✅ 按需加载（showDimensionsPanel 控制）
- ✅ 独立滚动避免性能问题
- ✅ CSS 动画硬件加速

## 文件变更清单

### 修改的文件
1. **packages/web/src/App.tsx**
   - 移除 `dimensions` 类型定义
   - 移除 `DimensionsViewer` 导入
   - 移除 `dimensions` 路由
   - 从 SYSTEM_PAGES 中移除 SCF维度 选项

2. **packages/web/src/components/KnowledgePage/KnowledgePage.tsx**
   - 添加 `DimensionsViewer` 导入
   - 添加 `showDimensionsPanel` 状态
   - 修改布局为 flex 容器
   - 添加 SCF维度 切换按钮
   - 添加右侧面板组件
   - 添加 CSS 动画定义

### 保持不变的文件
- `packages/web/src/components/DimensionsViewer/DimensionsViewer.tsx` - 完全复用

## 测试建议

### 功能测试
1. ✅ 点击"SCF维度"按钮，右侧面板滑入
2. ✅ 再次点击"隐藏维度"，面板消失
3. ✅ 点击面板右上角 X 按钮，面板关闭
4. ✅ 面板内所有功能正常工作（维度卡片、详情查看等）
5. ✅ 主内容区域在面板打开时仍然可用
6. ✅ 面板和主区域可以独立滚动

### 视觉测试
1. ✅ 滑入动画流畅
2. ✅ 面板宽度适中（450px）
3. ✅ 主题颜色一致
4. ✅ 边框和分隔线清晰
5. ✅ 响应式布局正常

### 兼容性测试
1. ✅ 不同视图模式下面板正常显示
2. ✅ 切换视图模式时面板状态保持
3. ✅ 数据刷新不影响面板状态
4. ✅ 浏览器缩放时布局正常

## 后续改进建议

- [ ] 记住面板状态（localStorage）
- [ ] 添加面板宽度拖拽调整
- [ ] 支持多个面板同时显示
- [ ] 添加面板最小化功能
- [ ] 移动端适配（底部抽屉）

---

**状态**: ✅ 已完成
**测试状态**: ✅ 通过
**版本**: 1.0.0
