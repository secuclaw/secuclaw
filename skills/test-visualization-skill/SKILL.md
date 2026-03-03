---
name: test-visualization-skill
description: Test skill demonstrating all three visualization definition methods
version: 1.0.0
author: secuclaw-team
tags:
  - test
  - visualization
visualizations:
  mode: hybrid
  inline:
    - id: inline-chart
      name: "Inline Chart Example"
      description: "Chart defined directly in SKILL.md frontmatter"
      type: chart
      category: widget
      dataSource: test.metrics
      config:
        chart:
          subType: bar
          xAxis:
            field: category
          yAxis:
            field: value
          series:
            - field: value
              name: "Value"
              color: "#3b82f6"
      layout:
        width: 100%
        height: 300
    
    - id: inline-gauge
      name: "Inline Gauge Example"
      description: "Gauge defined in SKILL.md frontmatter"
      type: gauge
      category: panel
      dataSource: test.progress
      config:
        metrics:
          - field: percent
            label: "Progress"
            max: 100
      layout:
        width: 200
        height: 150
---

# Test Visualization Skill

This skill demonstrates all three methods of defining visualizations:

1. **Inline** - Defined in SKILL.md frontmatter (2 visualizations above)
2. **Manifest** - Defined in visualizations.yaml file
3. **Files** - Individual files in visualizations/ directory

## Data Sources

| Source | Type | Description |
|--------|------|-------------|
| `test.metrics` | Array | Test metrics data |
| `test.progress` | Object | Progress percentage |
| `test.timeline` | Array | Timeline events |
| `test.network` | Object | Network graph data |
