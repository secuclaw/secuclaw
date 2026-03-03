# SCF 知识库快速参考

## 🎯 常用命令

```bash
# 查询工具
bun scripts/query-scf.ts --stats          # 统计信息
bun scripts/query-scf.ts --domains        # 列出所有域
bun scripts/query-scf.ts --domain GOV     # 查询域
bun scripts/query-scf.ts --control GOV-01 # 查询控制
bun scripts/query-scf.ts --search "关键词" # 搜索

# 数据拆分
bun scripts/split-scf-sheets.ts           # 重新拆分 Excel
```

## 📊 快速统计

- **总控制数**: 1,451
- **控制域**: 34
- **最大域**: AAT (AI & 自主技术) - 156 个控制
- **文件大小**: 29 MB (scf-20254.json)

## 🔥 热门控制域

| 代码 | 名称 | 控制数 |
|------|------|--------|
| GOV | 治理 | 38 |
| NET | 网络安全 | 98 |
| END | 终端安全 | 47 |
| CPL | 合规 | 35 |

## 📍 文件位置

```
/Users/huangzhou/Documents/work/ai_secuclaw/secuclaw/data/scf/
```

## 💻 代码示例

```typescript
import scf from './data/scf/scf-20254.json';

// 查询
const controls = scf.filter(c => c['SCF #'].startsWith('GOV'));
```

## 📖 详细文档

- [INDEX.md](./INDEX.md) - 完整目录
- [README.md](./README.md) - 使用说明
