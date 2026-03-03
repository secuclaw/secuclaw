---
summary: "扩展SecuClaw能力的技能系统。"
read_when:
  - 创建自定义技能
  - 使用SecuHub市场
title: "技能"
---

# 技能

SecuClaw的技能系统允许您通过自定义功能扩展平台。

## 概述

技能是扩展SecuClaw安全分析和运营能力的包。

## SecuHub市场

访问 [SecuHub](https://secuhub.com) 浏览和安装社区技能。

```bash
# 列出可用技能
secuclaw skills list

# 安装技能
secuclaw skills install @secuhub/pentest-tools

# 更新技能
secuclaw skills update @secuhub/pentest-tools
```

## 创建自定义技能

### 技能结构

```
my-skill/
├── skill.yaml
├── src/
│   └── index.ts
└── README.md
```

### skill.yaml

```yaml
name: @myorg/custom-skill
version: 1.0.0
description: 自定义安全分析技能
capabilities:
  - vulnerability-scan
  - config-audit
config:
  apiKey:
    required: true
  endpoint:
    required: false
    default: "https://api.example.com"
```

### 示例技能

```typescript
import { Skill, SkillContext } from '@secuclaw/core';

export default class CustomSkill implements Skill {
  name = 'custom-skill';
  description = '自定义安全分析';

  async execute(context: SkillContext): Promise<void> {
    const { input, output } = context;
    
    // 分析安全数据
    const result = await this.analyze(input);
    
    output.add({
      type: 'analysis',
      data: result,
    });
  }

  private async analyze(input: any) {
    // 自定义分析逻辑
    return { findings: [] };
  }
}
```

## 发布技能

1. 创建技能包
2. 本地测试
3. 发布到SecuHub

```bash
secuclaw skills publish --org myorg
```

---

_相关链接: [工具](/zh-CN/tools)_
