---
summary: "SecuClaw远程访问配置。"
read_when:
  - 远程访问SecuClaw
  - 设置VPN访问
title: "远程访问"
---

# 远程访问

配置对SecuClaw部署的远程访问。

## 选项

### 1. Tailscale（推荐）

```bash
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up
```

配置SecuClaw：

```json5
{
  gateway: {
    remote: {
      tailscale: { enabled: true },
    },
  },
}
```

### 2. SSH隧道

```bash
ssh -N -L 21000:127.0.0.1:21000 user@your-server
```

### 3. 反向代理

```nginx
server {
    listen 443 ssl;
    serverName secuclaw.yourcompany.com;
    location / {
        proxy_pass http://127.0.0.1:21000;
    }
}
```

## 安全注意事项

<Warning>
将SecuClaw暴露到互联网时，请始终：
1. 启用认证
2. 使用HTTPS/TLS
3. 配置白名单
</Warning>

### 启用认证

```json5
{
  gateway: {
    auth: { token: "${SECUCLAW_TOKEN}" },
  },
}
```

---

_相关链接: [配置](/zh-CN/gateway/configuration)_
