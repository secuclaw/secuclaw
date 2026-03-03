---
summary: "Skills system for extending SecuClaw capabilities."
read_when:
  - Creating custom skills
  - Using SecuHub marketplace
title: "Skills"
---

# Skills

SecuClaw's skill system allows you to extend the platform with custom capabilities.

## Overview

Skills are packages that extend SecuClaw's security analysis and operations capabilities.

## SecuHub Marketplace

Visit [SecuHub](https://secuhub.com) to browse and install community skills.

```bash
# List available skills
secuclaw skills list

# Install a skill
secuclaw skills install @secuhub/pentest-tools

# Update a skill
secuclaw skills update @secuhub/pentest-tools
```

## Creating Custom Skills

### Skill Structure

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
description: Custom security analysis skill
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

### Example Skill

```typescript
import { Skill, SkillContext } from '@secuclaw/core';

export default class CustomSkill implements Skill {
  name = 'custom-skill';
  description = 'Custom security analysis';

  async execute(context: SkillContext): Promise<void> {
    const { input, output } = context;
    
    // Analyze security data
    const result = await this.analyze(input);
    
    output.add({
      type: 'analysis',
      data: result,
    });
  }

  private async analyze(input: any) {
    // Custom analysis logic
    return { findings: [] };
  }
}
```

## Publishing Skills

1. Create skill package
2. Test locally
3. Publish to SecuHub

```bash
secuclaw skills publish --org myorg
```

---

_Related: [Tools](/tools)_
