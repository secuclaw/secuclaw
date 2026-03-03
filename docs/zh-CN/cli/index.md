---
summary: "SecuClaw CLI命令参考。"
read_when:
  - 使用CLI
  - 自动化任务
title: "CLI参考"
---

# CLI参考

SecuClaw提供全面的CLI来管理您的安全运营。

## 命令

### 网关

```bash
# 启动网关
secuclaw gateway

# 使用特定端口启动
secuclaw gateway --port 21000

# 使用令牌认证启动
secuclaw gateway --token "your-token"
```

### 配置

```bash
# 初始化配置
secuclaw init

# 打开配置向导
secuclaw configure

# 获取配置值
secuclaw config get agents.defaults.model

# 设置配置值
secuclaw config set agents.defaults.model "anthropic/claude-sonnet-4-5"

# 取消设置配置值
secuclaw config unset agents.defaults.model
```

### 健康与状态

```bash
# 检查网关健康
secuclaw health

# 获取完整状态
secuclaw status

# 检查特定渠道
secuclaw status --channel telegram
```

### 日志

```bash
# 查看日志
secuclaw logs

# 按级别过滤
secuclaw logs --level error

# 按时间过滤
secuclaw logs --since "1 hour ago"

# 跟踪日志
secuclaw logs --follow
```

### 安全运营

```bash
# 分析威胁
secuclaw analyze --type threat --data "suspicious file hash"

# 检查漏洞
secuclaw vuln-check --target "192.168.1.1"

# 查询威胁情报
secuclaw intel query --indicator "malware-signature"

# 运行合规检查
secuclaw compliance check --framework SCF2025
```

### 代理

```bash
# 列出可用代理
secuclaw agents list

# 获取代理状态
secuclaw agents status sec

# 配置代理
secuclaw agents configure sec --model "anthropic/claude-sonnet-4-5"
```

### 会话

```bash
# 列出会话
secuclaw sessions list

# 获取会话信息
secuclaw sessions info session-id

# 清除会话
secuclaw sessions clear session-id
```

### 技能

```bash
# 列出技能
secuclaw skills list

# 从市场安装技能
secuclaw skills install @secuhub/pentest-tools

# 更新技能
secuclaw skills update @secuhub/pentest-tools
```

### 工具

```bash
# 列出可用工具
secuclaw tools list

# 运行工具
secuclaw tools run nmap --target "10.0.0.1"
```

### 更新与维护

```bash
# 更新SecuClaw
secuclaw update

# 检查更新
secuclaw update --check

# 运行诊断
secuclaw doctor

# 自动修复问题
secuclaw doctor --fix
```

## 全局选项

| 选项 | 描述 |
|------|-------------|
| `--version` | 显示版本 |
| `--help` | 显示帮助 |
| 自定义配置路径 `--config` | |
| `--debug` | 启用调试输出 |

## 环境变量

| 变量 | 描述 |
|----------|-------------|
| `SECUCLAW_HOME` | 配置目录 |
| `SECUCLAW_TOKEN` | 网关认证令牌 |
| `ANTHROPIC_API_KEY` | Anthropic API密钥 |

---

_相关链接：[配置](/zh-CN/gateway/configuration) · [快速开始](/zh-CN/start/getting-started)_
