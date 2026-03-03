---
summary: "健康监控和诊断。"
read_when:
  - 监控网关健康
  - 故障排除问题
title: "健康与监控"
---

# 健康与监控

SecuClaw提供健康检查和监控功能。

## 健康检查

```bash
# 基本健康
secuclaw health

# 详细状态
secuclaw status

# 深度探测
secuclaw status --deep
```

## 指标

| 指标 | 描述 |
|--------|-------------|
| 运行时间 | 网关运行时间 |
| 内存 | 当前内存使用 |
| CPU | CPU利用率 |
| 会话 | 活动会话数 |
| 告警 | 待处理告警数 |

## 日志

```bash
# 查看日志
secuclaw logs

# 按级别过滤
secuclaw logs --level error

# 跟踪日志
secuclaw logs --follow

# 时间过滤
secuclaw logs --since "1 hour ago"
```

## 诊断

```bash
# 运行诊断
secuclaw doctor

# 自动修复问题
secuclaw doctor --fix

# 详细报告
secuclaw doctor --verbose
```

## Prometheus指标

启用Prometheus端点：

```json5
{
  monitoring: {
    prometheus: {
      enabled: true,
      port: 9090,
      path: "/metrics",
    },
  },
}
```

抓取指标：

```bash
curl http://127.0.0.1:9090/metrics
```

## 可用指标

- `secuclaw_sessions_active` - 活动会话
- `secuclaw_alerts_total` - 总告警数
- `secuclaw_memory_used_bytes` - 内存使用
- `secuclaw_cpu_percent` - CPU使用率
- `secuclaw_requests_total` - 总请求数
