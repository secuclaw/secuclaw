---
summary: "SecuClaw网关配置概览。"
read_when:
  - 首次设置SecuClaw
  - 查找常见配置模式
title: "配置"
---

# 配置

SecuClaw从 `~/.secuclaw/secuclaw.json` 读取可选的JSON5配置。

如果文件不存在，SecuClaw使用安全的默认值。添加配置的常见原因：

- 配置安全数据源和集成
- 设置模型、工具、沙盒或自动化
- 调整会话、安全策略或UI

有关每个可用字段的完整参考，请参阅[完整参考](/zh-CN/gateway/configuration-reference)。

<Tip>
**不熟悉配置？** 从 `secuclaw init` 开始进行交互式设置，或查看[配置示例](/zh-CN/gateway/configuration-examples)指南获取完整的复制粘贴配置。
</Tip>

## 最小配置

```json5
// ~/.secuclaw/secuclaw.json
{
  agents: { defaults: { workspace: "~/.secuclaw/workspace" } },
  security: {
    sources: {
      siem: { enabled: true },
    },
  },
}
```

## 编辑配置

<Tabs>
  <Tab title="交互式向导">
    ```bash
    secuclaw init           # 完整设置向导
    secuclaw configure      # 配置向导
    ```
  </Tab>
  <Tab title="CLI（单行命令）">
    ```bash
    secuclaw config get agents.defaults.workspace
    secuclaw config set agents.defaults.model "anthropic/claude-sonnet-4-5"
    secuclaw config unset security.sources.siem
    ```
  </Tab>
  <Tab title="控制UI">
    打开 [http://127.0.0.1:21000](http://127.0.0.1:21000) 并使用**配置**选项卡。
    控制UI从配置模式呈现表单，并提供**原始JSON**编辑器作为应急方案。
  </Tab>
  <Tab title="直接编辑">
    直接编辑 `~/.secuclaw/secuclaw.json`。网关会监视文件并自动应用更改（请参阅[热重载](#config-hot-reload)）。
  </Tab>
</Tabs>

## 严格验证

<Warning>
SecuClaw只接受与模式完全匹配的配置。未知键、格式错误的类型或无效值会导致网关**拒绝启动**。唯一的根级例外是 `$schema`（字符串），因此编辑器可以附加JSON Schema元数据。
</Warning>

验证失败时：
- 网关不会启动
- 只有诊断命令可用（`secuclaw doctor`、`secuclaw logs`、`secuclaw health`、`secuclaw status`）
- 运行 `secuclaw doctor` 查看具体问题
- 运行 `secuclaw doctor --fix`（或 `--yes`）来应用修复

## 常见任务

<AccordionGroup>
  <Accordion title="配置安全数据源">
    连接到您的安全数据源：

    ```json5
    {
      security: {
        sources: {
          siem: {
            enabled: true,
            endpoint: "https://your-siem.example.com",
            apiKey: "${SIEM_API_KEY}",
          },
          firewall: {
            enabled: true,
            type: "Palo Alto Networks",
            logs: "/var/log/firewall",
          },
          edr: {
            enabled: true,
            provider: "crowdstrike",
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="选择和配置模型">
    设置主模型和可选的备用模型：

    ```json5
    {
      agents: {
        defaults: {
          model: {
            primary: "anthropic/claude-sonnet-4-5",
            fallbacks: ["openai/gpt-4o"],
          },
          models: {
            "anthropic/claude-sonnet-4-5": { alias: "Sonnet" },
            "openai/gpt-4o": { alias: "GPT" },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="配置安全代理">
    设置专业安全代理：

    ```json5
    {
      agents: {
        list: [
          { id: "sec", role: "SEC", name: "安全专家" },
          { id: "legal", role: "SEC+LEG", name: "隐私官" },
          { id: "arch", role: "SEC+IT", name: "安全架构师" },
          { id: "biz", role: "SEC+BIZ", name: "业务安全官" },
        ],
      },
    }
    ```

  </Accordion>

  <Accordion title="设置威胁情报">
    配置威胁情报源：

    ```json5
    {
      threatIntel: {
        mitre: { enabled: true, version: "v18.1" },
        stix: {
          enabled: true,
          sources: ["https://feed.example.com/stix"],
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="配置合规设置">
    设置合规框架：

    ```json5
    {
      compliance: {
        frameworks: ["SCF2025", "SOC2", "ISO27001"],
        autoRemediation: true,
        reportingInterval: "monthly",
      },
    }
    ```

  </Accordion>

  <Accordion title="配置SOAR自动化">
    设置自动化剧本：

    ```json5
    {
      soar: {
        enabled: true,
        playbooks: {
          phishing: {
            trigger: "alert.severity >= high AND alert.type = phishing",
            steps: ["collect", "analyze", "respond"],
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="配置沙盒">
    在隔离的Docker容器中运行代理会话：

    ```json5
    {
      agents: {
        defaults: {
          sandbox: {
            mode: "non-main",  // off | non-main | all
            scope: "agent",    // session | agent | shared
          },
        },
      },
    }
    ```

  </Accordion>
</AccordionGroup>

## 配置热重载

网关监视 `~/.secuclaw/secuclaw.json` 并自动应用更改——大多数设置无需手动重启。

### 重载模式

| 模式 | 行为 |
| ---------------------- | --------------------------------------------------------------------------------------- |
| **`hybrid`**（默认） | 立即热应用安全更改。自动重启关键更改。 |
| **`hot`** | 仅热应用安全更改。日志警告需要重启时——由您处理。 |
| **`restart`** | 任何配置更改都重启网关，无论安全与否。 |
| **`off`** | 禁用文件监视。更改在下次手动重启时生效。 |

```json5
{
  gateway: {
    reload: { mode: "hybrid", debounceMs: 300 },
  },
}
```

## 环境变量

SecuClaw从父进程读取环境变量，加上：

- 当前工作目录的 `.env`（如果存在）
- `~/.secuclaw/.env`（全局回退）

这两个文件都不会覆盖现有的环境变量。您也可以在配置中设置内联环境变量：

```json5
{
  env: {
    ANTHROPIC_API_KEY: "${ANTHROPIC_API_KEY}",
    SIEM_API_KEY: "${SIEM_API_KEY}",
  },
}
```

## 完整参考

有关完整的逐字段参考，请参阅**[配置参考](/zh-CN/gateway/configuration-reference)**。

---

_相关链接：[配置示例](/zh-CN/gateway/configuration-examples) · [配置参考](/zh-CN/gateway/configuration-reference) · [快速开始](/zh-CN/start/getting-started)_
