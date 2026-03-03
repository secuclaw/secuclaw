---
summary: "飞书机器人支持状态、功能和配置"
read_when:
  - 想要连接飞书/Lark机器人
  - 正在配置飞书通道
title: "飞书"
---

# 飞书机器人

飞书（Lark）是企业团队协作和沟通平台。此通道通过平台的 WebSocket 事件订阅将 SecuClaw 连接到飞书/Lark 机器人，无需暴露公共 Webhook URL 即可接收消息。

---

## 快速设置

添加飞书通道有两种方式：

### 方式一：引导向导（推荐）

如果您刚安装 SecuClaw，运行向导：

```bash
secuclaw onboard
```

向导将引导您：

1. 创建飞书应用并收集凭证
2. 在 SecuClaw 中配置应用凭证
3. 启动网关

### 方式二：CLI 设置

如果您已完成初始安装，通过 CLI 添加通道：

```bash
secuclaw channels add
```

选择 **Feishu**，然后输入 App ID 和 App Secret。

---

## 步骤一：创建飞书应用

### 1. 打开飞书开放平台

访问 [飞书开放平台](https://open.feishu.cn/app) 并登录。

Lark（国际版）租户应使用 [https://open.larksuite.com/app](https://open.larksuite.com/app) 并在飞书配置中设置 `domain: "lark"`。

### 2. 创建应用

1. 点击 **创建企业自建应用**
2. 填写应用名称和描述
3. 选择应用图标

### 3. 复制凭证

在 **凭证与基础信息** 页面，复制：

- **App ID**（格式：`cli_xxx`）
- **App Secret**

### 4. 配置权限

在 **权限管理** 页面，点击 **批量添加** 并粘贴：

```json
{
  "scopes": {
    "tenant": [
      "im:message",
      "im:message.group_at_msg:readonly",
      "im:message.p2p_msg:readonly",
      "im:message:readonly",
      "im:message:send_as_bot",
      "im:resource"
    ]
  }
}
```

### 5. 启用机器人能力

在 **应用能力** > **机器人**：

1. 启用机器人能力
2. 设置机器人名称

### 6. 配置事件订阅

在 **事件订阅**：

1. 选择 **使用长连接接收事件**（WebSocket）
2. 添加事件：`im.message.receive_v1`

### 7. 发布应用

1. 在 **版本管理与发布** 创建版本
2. 提交审核并发布
3. 等待管理员审批（企业自建应用通常自动通过）

---

## 步骤二：配置 SecuClaw

### 使用向导配置（推荐）

```bash
secuclaw channels add
```

选择 **Feishu** 并粘贴您的 App ID 和 App Secret。

### 通过配置文件配置

编辑 `~/.secuclaw/config.json`：

```json5
{
  channels: {
    feishu: {
      enabled: true,
      dmPolicy: "pairing",
      accounts: {
        main: {
          appId: "cli_xxx",
          appSecret: "xxx",
          botName: "我的AI助手",
        },
      },
    },
  },
}
```

### 通过环境变量配置

```bash
export FEISHU_APP_ID="cli_xxx"
export FEISHU_APP_SECRET="xxx"
```

### Lark（国际版）域名

如果您的租户使用 Lark（国际版），设置域名为 `lark`：

```json5
{
  channels: {
    feishu: {
      domain: "lark",
      accounts: {
        main: {
          appId: "cli_xxx",
          appSecret: "xxx",
        },
      },
    },
  },
}
```

---

## 步骤三：启动并测试

### 1. 启动网关

```bash
secuclaw gateway
```

### 2. 发送测试消息

在飞书中找到您的机器人并发送消息。

### 3. 批准配对

默认情况下，机器人会回复一个配对码。批准它：

```bash
secuclaw pairing approve feishu <CODE>
```

批准后，即可正常对话。

---

## 概述

- **飞书机器人通道**：由网关管理的飞书机器人
- **确定性路由**：回复始终返回飞书
- **会话隔离**：私聊共享主会话；群聊相互隔离
- **WebSocket 连接**：通过飞书 SDK 建立长连接，无需公共 URL

---

## 访问控制

### 私聊消息

- **默认**：`dmPolicy: "pairing"`（未知用户收到配对码）
- **批准配对**：

  ```bash
  secuclaw pairing list feishu
  secuclaw pairing approve feishu <CODE>
  ```

- **白名单模式**：设置 `channels.feishu.allowFrom` 包含允许的 Open ID

### 群聊消息

**1. 群组策略**（`channels.feishu.groupPolicy`）：

- `"open"` = 允许群组中所有人（默认）
- `"allowlist"` = 仅允许 `groupAllowFrom` 中的用户
- `"disabled"` = 禁用群组消息

**2. 提及要求**（`channels.feishu.groups.<chat_id>.requireMention`）：

- `true` = 需要 @提及（默认）
- `false` = 无需提及即可响应

---

## 群组配置示例

### 允许所有群组，需要 @提及（默认）

```json5
{
  channels: {
    feishu: {
      groupPolicy: "open",
      // 默认 requireMention: true
    },
  },
}
```

### 允许所有群组，无需 @提及

```json5
{
  channels: {
    feishu: {
      groups: {
        oc_xxx: { requireMention: false },
      },
    },
  },
}
```

### 仅允许群组中特定用户

```json5
{
  channels: {
    feishu: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["ou_xxx", "ou_yyy"],
    },
  },
}
```

---

## 获取群组/用户 ID

### 群组 ID（chat_id）

群组 ID 格式为 `oc_xxx`。

**方法一（推荐）**

1. 启动网关并在群组中 @提及机器人
2. 运行 `secuclaw logs --follow` 并查找 `chat_id`

### 用户 ID（open_id）

用户 ID 格式为 `ou_xxx`。

**方法一（推荐）**

1. 启动网关并私聊机器人
2. 运行 `secuclaw logs --follow` 并查找 `open_id`

---

## 常用命令

| 命令       | 描述           |
| ---------- | -------------- |
| `/status`  | 显示机器人状态 |
| `/reset`   | 重置会话       |
| `/model`   | 显示/切换模型  |

> 注意：飞书暂不支持原生命令菜单，命令需以文本形式发送。

## 网关管理命令

| 命令                       | 描述             |
| -------------------------- | ---------------- |
| `secuclaw gateway status`  | 显示网关状态     |
| `secuclaw gateway restart` | 重启网关服务     |
| `secuclaw logs --follow`   | 查看网关实时日志 |

---

## 故障排除

### 机器人在群聊中不响应

1. 确保机器人已添加到群组
2. 确保您 @提及了机器人（默认行为）
3. 检查 `groupPolicy` 未设置为 `"disabled"`
4. 检查日志：`secuclaw logs --follow`

### 机器人收不到消息

1. 确保应用已发布并通过审核
2. 确保事件订阅包含 `im.message.receive_v1`
3. 确保 **长连接** 已启用
4. 确保应用权限完整
5. 确保网关正在运行：`secuclaw gateway status`
6. 检查日志：`secuclaw logs --follow`

### App Secret 泄露

1. 在飞书开放平台重置 App Secret
2. 更新配置中的 App Secret
3. 重启网关

### 消息发送失败

1. 确保应用有 `im:message:send_as_bot` 权限
2. 确保应用已发布
3. 检查日志获取详细错误

---

## 高级配置

### 多账户

```json5
{
  channels: {
    feishu: {
      accounts: {
        main: {
          appId: "cli_xxx",
          appSecret: "xxx",
          botName: "主机器人",
        },
        backup: {
          appId: "cli_yyy",
          appSecret: "yyy",
          botName: "备用机器人",
          enabled: false,
        },
      },
    },
  },
}
```

### 消息限制

- `textChunkLimit`：出站文本块大小（默认：2000 字符）
- `mediaMaxMb`：媒体上传/下载限制（默认：30MB）

### 流式输出

飞书通过交互式卡片支持流式回复：

```json5
{
  channels: {
    feishu: {
      streaming: true, // 启用流式卡片输出（默认 true）
      blockStreaming: true, // 启用块级流式输出（默认 true）
    },
  },
}
```

---

## 配置参考

关键选项：

| 设置                                              | 描述                        | 默认值           |
| ------------------------------------------------- | --------------------------- | ---------------- |
| `channels.feishu.enabled`                         | 启用/禁用通道               | `true`           |
| `channels.feishu.domain`                          | API 域名（`feishu` 或 `lark`）| `feishu`       |
| `channels.feishu.connectionMode`                  | 事件传输模式                | `websocket`      |
| `channels.feishu.accounts.<id>.appId`             | App ID                      | -                |
| `channels.feishu.accounts.<id>.appSecret`         | App Secret                  | -                |
| `channels.feishu.dmPolicy`                        | 私聊策略                    | `pairing`        |
| `channels.feishu.allowFrom`                       | 私聊白名单（open_id 列表）  | -                |
| `channels.feishu.groupPolicy`                     | 群组策略                    | `open`           |
| `channels.feishu.groups.<chat_id>.requireMention` | 需要 @提及                  | `true`           |
| `channels.feishu.textChunkLimit`                  | 消息块大小                  | `2000`           |
| `channels.feishu.mediaMaxMb`                      | 媒体文件大小限制            | `30`             |
| `channels.feishu.streaming`                       | 启用流式卡片输出            | `true`           |

---

## dmPolicy 参考

| 值            | 行为                                             |
| ------------- | ------------------------------------------------ |
| `"pairing"`   | **默认。** 未知用户收到配对码；必须批准后才能对话 |
| `"allowlist"` | 仅 `allowFrom` 中的用户可以对话                  |
| `"open"`      | 允许所有用户（需要 allowFrom 包含 `"*"`）        |
| `"disabled"`  | 禁用私聊                                         |

---

## 支持的消息类型

### 接收

- ✅ 文本
- ✅ 富文本（帖子）
- ✅ 图片
- ✅ 文件
- ✅ 音频
- ✅ 视频
- ✅ 表情包

### 发送

- ✅ 文本
- ✅ 图片
- ✅ 文件
- ✅ 音频
- ⚠️ 富文本（部分支持）

## 相关文档

- [通道通信](/channels/communication)
- [网关配置](/gateway/configuration)
- [故障排除](/help/troubleshooting)
