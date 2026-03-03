---
summary: "Discord bot support status, capabilities, and configuration"
read_when:
  - Working on Discord channel features
title: "Discord"
---

# Discord (Bot API)

Status: ready for DMs and guild channels via the official Discord gateway.

<CardGroup cols={3}>
  <Card title="Pairing" icon="link" href="/channels/pairing">
    Discord DMs default to pairing mode.
  </Card>
  <Card title="Channel troubleshooting" icon="wrench" href="/help/troubleshooting">
    Cross-channel diagnostics and repair flow.
  </Card>
  <Card title="Gateway configuration" icon="settings" href="/gateway/configuration">
    Core Gateway settings, tokens, and provider config.
  </Card>
</CardGroup>

## Quick setup

You will need to create a new application with a bot, add the bot to your server, and pair it to SecuClaw.

<Steps>
  <Step title="Create a Discord application and bot">
    Go to the [Discord Developer Portal](https://discord.com/developers/applications) and click **New Application**. Name it something like "SecuClaw".

    Click **Bot** on the sidebar. Set the **Username** to whatever you call your SecuClaw agent.

  </Step>

  <Step title="Enable privileged intents">
    Still on the **Bot** page, scroll down to **Privileged Gateway Intents** and enable:

    - **Message Content Intent** (required)
    - **Server Members Intent** (recommended; required for role allowlists)
    - **Presence Intent** (optional; only needed for presence updates)

  </Step>

  <Step title="Copy your bot token">
    Scroll back up on the **Bot** page and click **Reset Token**.

    Copy the token and save it somewhere. This is your **Bot Token** and you will need it shortly.

  </Step>

  <Step title="Generate an invite URL and add the bot to your server">
    Click **OAuth2** on the sidebar. You'll generate an invite URL with the right permissions.

    Scroll down to **OAuth2 URL Generator** and enable:

    - `bot`
    - `applications.commands`

    A **Bot Permissions** section will appear below. Enable:

    - View Channels
    - Send Messages
    - Read Message History
    - Embed Links
    - Attach Files
    - Add Reactions (optional)

    Copy the generated URL, paste it into your browser, select your server, and click **Continue**.

  </Step>

  <Step title="Enable Developer Mode and collect your IDs">
    Back in the Discord app:

    1. Click **User Settings** → **Advanced** → toggle on **Developer Mode**
    2. Right-click your **server icon** → **Copy Server ID**
    3. Right-click your **own avatar** → **Copy User ID**

    Save your **Server ID** and **User ID** alongside your Bot Token.

  </Step>

  <Step title="Set your bot token securely">

```bash
secuclaw config set channels.discord.token '"YOUR_BOT_TOKEN"' --json
secuclaw config set channels.discord.enabled true --json
secuclaw gateway
```

  </Step>

  <Step title="Approve first DM pairing">
    DM your bot in Discord. It will respond with a pairing code.

```bash
secuclaw pairing list discord
secuclaw pairing approve discord <CODE>
```

    Pairing codes expire after 1 hour.

  </Step>
</Steps>

## Runtime model

- Gateway owns the Discord connection.
- Reply routing is deterministic: Discord inbound replies back to Discord.
- By default, direct chats share the agent main session.
- Guild channels are isolated session keys.
- Group DMs are ignored by default.

## Access control and routing

<Tabs>
  <Tab title="DM policy">
    `channels.discord.dmPolicy` controls DM access:

    - `pairing` (default)
    - `allowlist`
    - `open` (requires `channels.discord.allowFrom` to include `"*"`)
    - `disabled`

    DM target format for delivery:

    - `user:<id>`
    - `<@id>` mention

  </Tab>

  <Tab title="Guild policy">
    Guild handling is controlled by `channels.discord.groupPolicy`:

    - `open`
    - `allowlist`
    - `disabled`

    `allowlist` behavior:

    - guild must match `channels.discord.guilds`
    - optional sender allowlists: `users` (IDs or names) and `roles` (role IDs only)
    - if a guild has `channels` configured, non-listed channels are denied

    Example:

```json5
{
  channels: {
    discord: {
      groupPolicy: "allowlist",
      guilds: {
        "123456789012345678": {
          requireMention: true,
          users: ["987654321098765432"],
          roles: ["123456789012345678"],
          channels: {
            general: { allow: true },
            help: { allow: true, requireMention: true },
          },
        },
      },
    },
  },
}
```

  </Tab>

  <Tab title="Mentions and group DMs">
    Guild messages are mention-gated by default.

    Mention detection includes:

    - explicit bot mention
    - configured mention patterns
    - implicit reply-to-bot behavior in supported cases

    `requireMention` is configured per guild/channel.

    Group DMs:

    - default: ignored (`dm.groupEnabled=false`)
    - optional allowlist via `dm.groupChannels`

  </Tab>
</Tabs>

## Feature details

<AccordionGroup>
  <Accordion title="Reply tags and native replies">
    Discord supports reply tags in agent output:

    - `[[reply_to_current]]`
    - `[[reply_to:<id>]]`

    Controlled by `channels.discord.replyToMode`:

    - `off` (default)
    - `first`
    - `all`

  </Accordion>

  <Accordion title="History, context, and thread behavior">
    Guild history context:

    - `channels.discord.historyLimit` default `20`
    - `0` disables

    Thread behavior:

    - Discord threads are routed as channel sessions
    - thread config inherits parent channel config unless a thread-specific entry exists

  </Accordion>

  <Accordion title="Reaction notifications">
    Per-guild reaction notification mode:

    - `off`
    - `own` (default)
    - `all`
    - `allowlist`

  </Accordion>

  <Accordion title="Ack reactions">
    `ackReaction` sends an acknowledgement emoji while SecuClaw is processing an inbound message.

    Resolution order:

    - `channels.discord.ackReaction`
    - agent identity emoji fallback (default: "👀")

  </Accordion>

  <Accordion title="Gateway proxy">
    Route Discord gateway WebSocket traffic through an HTTP(S) proxy:

```json5
{
  channels: {
    discord: {
      proxy: "http://proxy.example:8080",
    },
  },
}
```

  </Accordion>

  <Accordion title="Presence configuration">
    Status only example:

```json5
{
  channels: {
    discord: {
      status: "idle",
    },
  },
}
```

    Activity example:

```json5
{
  channels: {
    discord: {
      activity: "Focus time",
      activityType: 4,
    },
  },
}
```

    Activity type map:

    - 0: Playing
    - 1: Streaming (requires `activityUrl`)
    - 2: Listening
    - 3: Watching
    - 4: Custom
    - 5: Competing

  </Accordion>
</AccordionGroup>

## Tools and action gates

Discord message actions include messaging, channel admin, moderation, presence, and metadata actions.

Core examples:

- messaging: `sendMessage`, `readMessages`, `editMessage`, `deleteMessage`, `threadReply`
- reactions: `react`, `reactions`, `emojiList`
- moderation: `timeout`, `kick`, `ban`
- presence: `setPresence`

Action gates live under `channels.discord.actions.*`.

Default gate behavior:

| Action group | Default |
| --- | --- |
| reactions, messages, threads, pins, polls, search, memberInfo | enabled |
| roles | disabled |
| moderation | disabled |
| presence | disabled |

## Voice messages

Discord voice messages show a waveform preview and require OGG/Opus audio plus metadata. SecuClaw generates the waveform automatically, but it needs `ffmpeg` and `ffprobe` available on the gateway host.

Requirements:

- Provide a **local file path** (URLs are rejected).
- Omit text content (Discord does not allow text + voice message in the same payload).

## Troubleshooting

<AccordionGroup>
  <Accordion title="Used disallowed intents or bot sees no guild messages">

    - enable Message Content Intent
    - enable Server Members Intent when you depend on user/member resolution
    - restart gateway after changing intents

  </Accordion>

  <Accordion title="Guild messages blocked unexpectedly">

    - verify `groupPolicy`
    - verify guild allowlist under `channels.discord.guilds`
    - if guild `channels` map exists, only listed channels are allowed
    - verify `requireMention` behavior

```bash
secuclaw doctor
secuclaw channels status --probe
secuclaw logs --follow
```

  </Accordion>

  <Accordion title="Require mention false but still blocked">
    Common causes:

    - `groupPolicy="allowlist"` without matching guild/channel allowlist
    - `requireMention` configured in the wrong place
    - sender blocked by guild/channel `users` allowlist

  </Accordion>

  <Accordion title="DM and pairing issues">

    - DM disabled: `channels.discord.dm.enabled=false`
    - DM policy disabled: `channels.discord.dmPolicy="disabled"`
    - awaiting pairing approval in `pairing` mode

  </Accordion>
</AccordionGroup>

## Configuration reference pointers

High-signal Discord fields:

- startup/auth: `enabled`, `token`, `accounts.*`, `allowBots`
- policy: `groupPolicy`, `dm.*`, `guilds.*`, `guilds.*.channels.*`
- reply/history: `replyToMode`, `historyLimit`, `dmHistoryLimit`
- delivery: `textChunkLimit`, `chunkMode`, `maxLinesPerMessage`
- media/retry: `mediaMaxMb`, `retry`
- actions: `actions.*`
- presence: `activity`, `status`, `activityType`, `activityUrl`

## Safety and operations

- Treat bot tokens as secrets (`DISCORD_BOT_TOKEN` preferred in supervised environments).
- Grant least-privilege Discord permissions.
- If command deploy/state is stale, restart gateway and re-check with `secuclaw channels status --probe`.

## Related

- [Channel communication](/channels/communication)
- [Gateway configuration](/gateway/configuration)
- [Troubleshooting](/help/troubleshooting)
