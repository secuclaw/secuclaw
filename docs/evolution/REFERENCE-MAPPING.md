# 参考代码文件路径映射

> 本文档列出所有任务对应的参考代码文件路径

---

## Phase 1: 多渠道 + 多平台

### T01 WhatsApp渠道集成
```yaml
OpenClaw:
  - openclaw-2026.3.1/extensions/whatsapp/index.ts
  - openclaw-2026.3.1/extensions/whatsapp/src/channel.ts
  - openclaw-2026.3.1/extensions/whatsapp/src/runtime.ts
  - openclaw-2026.3.1/src/config/types.whatsapp.ts
  - openclaw-2026.3.1/test/mocks/baileys.ts
  - openclaw-2026.3.1/docs/channels/whatsapp.md

参考模式:
  - openclaw-2026.3.1/src/telegram/accounts.ts
  - openclaw-2026.3.1/src/telegram/bot/bot-handlers.ts
  - openclaw-2026.3.1/src/discord/client.ts

SecuClaw:
  - secuclaw/packages/core/src/channels/base.ts
  - secuclaw/packages/core/src/channels/telegram/
```

### T02 Signal渠道集成
```yaml
OpenClaw:
  - openclaw-2026.3.1/extensions/signal/index.ts
  - openclaw-2026.3.1/extensions/signal/src/
  - openclaw-2026.3.1/src/config/types.signal.ts
  - openclaw-2026.3.1/src/commands/signal-install.ts
  - openclaw-2026.3.1/docs/channels/signal.md

参考模式:
  - openclaw-2026.3.1/src/telegram/accounts.ts
  - openclaw-2026.3.1/src/telegram/audit.ts

SecuClaw:
  - secuclaw/packages/core/src/channels/base.ts
```

### T03 iMessage渠道集成
```yaml
OpenClaw:
  - openclaw-2026.3.1/extensions/imessage/index.ts
  - openclaw-2026.3.1/extensions/imessage/src/
  - openclaw-2026.3.1/extensions/bluebubbles/index.ts
  - openclaw-2026.3.1/extensions/bluebubbles/src/
  - openclaw-2026.3.1/docs/channels/imessage.md
  - openclaw-2026.3.1/docs/channels/bluebubbles.md
  - openclaw-2026.3.1/src/test-utils/imessage-test-plugin.ts

SecuClaw:
  - secuclaw/packages/core/src/channels/base.ts
```

### T04 Google Chat渠道集成
```yaml
OpenClaw:
  - openclaw-2026.3.1/extensions/googlechat/index.ts
  - openclaw-2026.3.1/extensions/googlechat/src/
  - openclaw-2026.3.1/src/config/types.googlechat.ts
  - openclaw-2026.3.1/docs/channels/googlechat.md

SecuClaw:
  - secuclaw/packages/core/src/channels/base.ts
```

### T05 Microsoft Teams渠道集成
```yaml
OpenClaw:
  - openclaw-2026.3.1/extensions/msteams/index.ts
  - openclaw-2026.3.1/extensions/msteams/src/
  - openclaw-2026.3.1/src/config/types.msteams.ts
  - openclaw-2026.3.1/docs/channels/msteams.md

SecuClaw:
  - secuclaw/packages/core/src/channels/base.ts
```

### T06 渠道管理器重构
```yaml
OpenClaw:
  - openclaw-2026.3.1/src/channels/channel-config.ts
  - openclaw-2026.3.1/src/channels/dock.ts
  - openclaw-2026.3.1/src/channels/allow-from.ts
  - openclaw-2026.3.1/src/channels/allowlists/
  - openclaw-2026.3.1/src/channels/conversation-label.ts
  - openclaw-2026.3.1/src/channels/command-gating.ts

SecuClaw:
  - secuclaw/packages/core/src/channels/manager.ts
  - secuclaw/packages/core/src/channels/base.ts
```

### T07 Voice Wake唤醒检测
```yaml
OpenClaw:
  - openclaw-2026.3.1/src/infra/voicewake.ts
  - openclaw-2026.3.1/src/gateway/server-methods/voicewake.ts
  - openclaw-2026.3.1/src/plugins/voice-call.plugin.test.ts

参考:
  - Porcupine Wake Word Engine
```

### T08 Talk Mode持续对话
```yaml
OpenClaw:
  - openclaw-2026.3.1/src/discord/voice/
  - openclaw-2026.3.1/src/discord/voice-message.ts
  - openclaw-2026.3.1/src/telegram/voice.ts
  - openclaw-2026.3.1/src/telegram/voice.test.ts
```

### T09 TTS语音合成
```yaml
OpenClaw:
  - openclaw-2026.3.1/src/tts/tts.ts
  - openclaw-2026.3.1/src/tts/tts-core.ts
  - openclaw-2026.3.1/src/tts/tts.test.ts
  - openclaw-2026.3.1/src/agents/tools/tts-tool.ts
  - openclaw-2026.3.1/src/gateway/server-methods/tts.ts
```

### T10 STT语音识别
```yaml
OpenFang:
  - openfang-0.3.1/crates/openfang-runtime/src/stt/
  - 参考5种STT后端实现

OpenClaw:
  - openclaw-2026.3.1/src/telegram/voice.ts (语音处理模式)
  - openclaw-2026.3.1/src/discord/voice-message.ts
```

### T11 Live Canvas引擎
```yaml
OpenClaw:
  - openclaw-2026.3.1/src/canvas-host/server.ts
  - openclaw-2026.3.1/src/canvas-host/a2ui.ts
  - openclaw-2026.3.1/src/canvas-host/file-resolver.ts
  - openclaw-2026.3.1/src/infra/canvas-host-url.ts
  - openclaw-2026.3.1/src/gateway/canvas-capability.ts
  - openclaw-2026.3.1/src/agents/tools/canvas-tool.ts
```

### T12 A2UI协议实现
```yaml
OpenClaw:
  - openclaw-2026.3.1/src/canvas-host/a2ui/
  - openclaw-2026.3.1/src/canvas-host/a2ui.ts
  - openclaw-2026.3.1/vendor/a2ui/
```

### T13 Gateway WebSocket控制平面
```yaml
OpenClaw:
  - openclaw-2026.3.1/src/gateway/auth.ts
  - openclaw-2026.3.1/src/gateway/boot.ts
  - openclaw-2026.3.1/src/gateway/call.ts
  - openclaw-2026.3.1/src/gateway/chat-abort.ts
  - openclaw-2026.3.1/src/gateway/channel-health-monitor.ts
  - openclaw-2026.3.1/src/gateway/server-methods/
  - openclaw-2026.3.1/src/infra/gateway-lock.ts

SecuClaw:
  - secuclaw/packages/core/src/gateway/
```

### T14 Doctor诊断工具
```yaml
OpenClaw:
  - openclaw-2026.3.1/src/commands/doctor.ts (如果存在)

ZeroClaw:
  - zeroclaw-0.1.7/src/doctor/
  - zeroclaw-0.1.7/src/health/

SecuClaw:
  - secuclaw/packages/cli/src/commands/
```

### T15 Azure OpenAI提供商
```yaml
OpenClaw:
  - openclaw-2026.3.1/src/config/zod-schema.providers-azure.ts (如果存在)
  - 依赖: @azure/identity

OpenFang:
  - openfang-0.3.1/crates/openfang-runtime/src/providers/azure/

SecuClaw:
  - secuclaw/packages/core/src/providers/base.ts
```

### T16 AWS Bedrock提供商
```yaml
OpenClaw:
  - 依赖: @aws-sdk/client-bedrock

SecuClaw:
  - secuclaw/packages/core/src/providers/base.ts
```

---

## Phase 2: 自主Hands + 安全增强

### T17 Hand基类设计
```yaml
OpenFang:
  - openfang-0.3.1/crates/openfang-hands/src/lib.rs
  - openfang-0.3.1/crates/openfang-hands/src/registry.rs
  - openfang-0.3.1/crates/openfang-hands/src/bundled.rs
  - openfang-0.3.1/crates/openfang-kernel/src/scheduler/

SecuClaw:
  - secuclaw/packages/core/src/hands/ (新建)
```

### T18 Hand调度器
```yaml
OpenFang:
  - openfang-0.3.1/crates/openfang-kernel/src/scheduler/
  - openfang-0.3.1/crates/openfang-runtime/src/cron/

SecuClaw:
  - secuclaw/packages/core/src/hands/scheduler/
```

### T19-T25 安全Hands
```yaml
OpenFang Hands参考:
  - openfang-0.3.1/crates/openfang-hands/src/bundled.rs (内置Hands)
  - openfang-0.3.1/crates/openfang-hands/src/registry.rs

SecuClaw现有:
  - secuclaw/packages/core/src/threat-intel/
  - secuclaw/packages/core/data/mitre/
  - secuclaw/packages/core/data/scf/
```

### T26 污点追踪系统
```yaml
OpenFang:
  - openfang-0.3.1/crates/openfang-security/src/taint/ (如果存在)
  - openfang-0.3.1/crates/openfang-cli/src/tui/screens/security.rs

SecuClaw:
  - secuclaw/packages/core/src/security/taint/
```

### T27 智能体身份系统
```yaml
ZeroClaw:
  - zeroclaw-0.1.7/src/identity.rs
  - zeroclaw-0.1.7/src/auth/

OpenFang:
  - openfang-0.3.1/crates/openfang-security/src/identity/ (如果存在)

SecuClaw:
  - secuclaw/packages/core/src/security/identity/
```

### T28 P2P双向认证
```yaml
OpenClaw:
  - openclaw-2026.3.1/src/pairing/pairing-store.ts
  - openclaw-2026.3.1/src/pairing/pairing-challenge.ts
  - openclaw-2026.3.1/src/pairing/pairing-messages.ts

ZeroClaw:
  - zeroclaw-0.1.7/src/auth/

SecuClaw:
  - secuclaw/packages/core/src/security/p2p/
```

### T29 提示注入防护
```yaml
OpenClaw:
  - openclaw-2026.3.1/src/security/ (安全相关)
  - openclaw-2026.3.1/src/agents/tools/gateway.ts (工具安全)

SecuClaw:
  - secuclaw/packages/core/src/security/prompt/
```

### T30 工具调用循环防护
```yaml
OpenClaw:
  - openclaw-2026.3.1/src/agents/tools/ (工具调用模式)

SecuClaw:
  - secuclaw/packages/core/src/security/loop/
```

---

## Phase 3: 边缘部署 + 轻量化

### T31 边缘轻量运行时
```yaml
ZeroClaw:
  - zeroclaw-0.1.7/src/main.rs
  - zeroclaw-0.1.7/src/lib.rs
  - zeroclaw-0.1.7/src/config/
  - zeroclaw-0.1.7/src/agent/
  - zeroclaw-0.1.7/src/gateway/
  - zeroclaw-0.1.7/src/memory/

SecuClaw:
  - secuclaw/packages/edge/ (新建)
```

### T32 内存优化
```yaml
ZeroClaw:
  - zeroclaw-0.1.7/src/memory/
  - zeroclaw-0.1.7/src/tools/memory_*.rs

SecuClaw:
  - secuclaw/packages/edge/src/memory/
```

### T33 懒加载机制
```yaml
ZeroClaw:
  - zeroclaw-0.1.7/src/lib.rs (模块加载模式)
  - zeroclaw-0.1.7/src/tools/mod.rs (工具懒加载)

SecuClaw:
  - secuclaw/packages/edge/src/lazy/
```

### T34-T36 边缘工具
```yaml
ZeroClaw:
  - zeroclaw-0.1.7/src/tools/shell.rs
  - zeroclaw-0.1.7/src/tools/file_*.rs
  - zeroclaw-0.1.7/src/tools/web_fetch.rs
  - zeroclaw-0.1.7/src/tools/cron_*.rs

SecuClaw:
  - secuclaw/packages/edge/src/tools/
```

### T37 Tailscale隧道集成
```yaml
ZeroClaw:
  - zeroclaw-0.1.7/src/tunnel/tailscale.rs
  - zeroclaw-0.1.7/src/tunnel/mod.rs

SecuClaw:
  - secuclaw/packages/core/src/tunnel/tailscale/
```

### T38 Cloudflare Tunnel集成
```yaml
ZeroClaw:
  - zeroclaw-0.1.7/src/tunnel/cloudflare.rs
  - zeroclaw-0.1.7/src/tunnel/mod.rs

SecuClaw:
  - secuclaw/packages/core/src/tunnel/cloudflare/
```

### T39 ngrok隧道集成
```yaml
ZeroClaw:
  - zeroclaw-0.1.7/src/tunnel/ngrok.rs
  - zeroclaw-0.1.7/src/tunnel/mod.rs

SecuClaw:
  - secuclaw/packages/core/src/tunnel/ngrok/
```

### T40 自定义隧道框架
```yaml
ZeroClaw:
  - zeroclaw-0.1.7/src/tunnel/custom.rs
  - zeroclaw-0.1.7/src/tunnel/none.rs
  - zeroclaw-0.1.7/src/tunnel/mod.rs

SecuClaw:
  - secuclaw/packages/core/src/tunnel/custom/
```

### T41 Trait驱动架构
```yaml
ZeroClaw:
  - zeroclaw-0.1.7/src/lib.rs (Trait定义)
  - zeroclaw-0.1.7/src/agent/ (Agent Trait)
  - zeroclaw-0.1.7/src/channels/ (Channel Trait)
  - zeroclaw-0.1.7/src/tools/ (Tool Trait)
  - zeroclaw-0.1.7/src/memory/ (Memory Trait)

SecuClaw:
  - secuclaw/packages/core/src/traits/
```

### T42 配置热更新系统
```yaml
ZeroClaw:
  - zeroclaw-0.1.7/src/config/
  - zeroclaw-0.1.7/src/daemon/

OpenClaw:
  - openclaw-2026.3.1/src/config/

SecuClaw:
  - secuclaw/packages/core/src/config/
```

---

## 快速查找命令

```bash
# 查找OpenClaw渠道相关文件
find openclaw-2026.3.1 -path "*/channels/*" -name "*.ts"

# 查找OpenFang Hands相关文件
find openfang-0.3.1 -path "*/hands/*" -name "*.rs"

# 查找ZeroClaw隧道相关文件
find zeroclaw-0.1.7 -path "*/tunnel/*" -name "*.rs"

# 查找SecuClaw核心模块
find secuclaw/packages/core/src -name "*.ts"
```
