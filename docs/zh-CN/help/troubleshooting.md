---
summary: "排除常见问题。"
read_when:
  - 网关无法启动
  - 连接问题
title: "故障排除"
---

# 故障排除

解决SecuClaw常见问题。

## 网关问题

### 网关无法启动

**症状**: `secuclaw gateway` 启动失败

**解决方案**:
```bash
# 检查配置
secuclaw doctor

# 验证端口是否可用
lsof -i :21000

# 检查日志
secuclaw logs --level error
```

### 端口已被占用

**症状**: `Error: listen EADDRINUSE: address already in use`

**解决方案**:
```bash
# 查找占用端口的进程
lsof -i :21000

# 终止现有进程
kill <PID>

# 或使用不同端口
secuclaw gateway --port 18790
```

## 配置问题

### 无效配置

**症状**: 网关因验证错误拒绝启动

**解决方案**:
```bash
# 验证配置
secuclaw doctor --fix

# 检查配置语法
cat ~/.secuclaw/secuclaw.json | python3 -m json.tool
```

### 缺少API密钥

**症状**: `Error: API key not found`

**解决方案**:
```bash
# 设置API密钥
export ANTHROPIC_API_KEY="sk-ant-..."

# 或添加到配置
secuclaw config set models.providers.anthropic.apiKey "sk-ant-..."
```

## 连接问题

### 无法连接到网关

**症状**: Web UI显示"连接被拒绝"

**解决方案**:
```bash
# 检查网关是否运行
secuclaw health

# 检查端口绑定
ss -ltnp | grep 21000

# 检查防火墙
iptables -L -n
```

### WebSocket连接失败

**症状**: 控制台频繁断开连接

**解决方案**:
```bash
# 检查网络
ping 127.0.0.1

# 验证WebSocket
curl -i http://127.0.0.1:21000/health
```

## 性能问题

### 内存使用过高

**症状**: 网关占用过多内存

**解决方案**:
```json5
{
  session: {
    maxHistory: 100,
    compaction: {
      enabled: true,
      threshold: 50,
    },
  },
}
```

### 响应缓慢

**症状**: 代理响应时间过长

**解决方案**:
- 检查LLM提供商状态
- 增加超时设置
- 启用缓存

## 获取帮助

```bash
# 运行诊断
secuclaw doctor

# 获取详细日志
secuclaw logs --level debug

# 检查系统状态
secuclaw status
```

---

_相关链接：[配置](/zh-CN/gateway/configuration)_
