---
summary: "Slack bot support status, capabilities, and configuration"
read_when:
  - Working on Slack channel features
  - You want to connect a Slack bot
title: "Slack"
---

# Slack (Bot API)

Status: ready for DMs and channels via the official Slack API.

<CardGroup cols={3}>
  <Card title="Pairing" icon="link" href="/channels/pairing">
    Slack DMs default to pairing mode.
  </Card>
  <Card title="Channel troubleshooting" icon="wrench" href="/help/troubleshooting">
    Cross-channel diagnostics and repair flow.
  </Card>
  <Card title="Gateway configuration" icon="settings" href="/gateway/configuration">
    Core Gateway settings, tokens, and provider config.
  </Card>
</CardGroup>

## Quick setup

<Steps>
  <Step title="Create a Slack App">
    Go to the [Slack API: Applications](https://api.slack.com/apps) page and click **Create New App**.

    Choose **From scratch**, give it a name (like "SecuClaw"), and select your workspace.

  </Step>

  <Step title="Configure Bot Token Scopes">
    Navigate to **OAuth & Permissions** in the sidebar.

    Under **Bot Token Scopes**, add these scopes:

    - `app_mentions:read` - Read messages that mention the bot
    - `channels:history` - Read messages in public channels
    - `chat:write` - Send messages
    - `files:read` - Read files shared in channels
    - `files:write` - Upload files
    - `groups:history` - Read messages in private channels
    - `im:history` - Read direct messages
    - `im:read` - View direct message channels
    - `im:write` - Start direct messages
    - `mpim:history` - Read group DMs
    `mpim:read` - View group DMs
    - `mpim:write` - Start group DMs
    - `reactions:read` - Read message reactions
    - `reactions:write` - Add message reactions
    - `users:read` - View user profiles
    - `users:read.email` - View user email addresses

  </Step>

  <Step title="Enable Socket Mode">
    Navigate to **Socket Mode** in the sidebar and enable it.

    Generate an App-Level Token with `connections:write` scope.

  </Step>

  <Step title="Subscribe to Events">
    Navigate to **Event Subscriptions** in the sidebar and enable it.

    Subscribe to these bot events:

    - `message.channels` - Read messages in public channels
    - `message.groups` - Read messages in private channels
    - `message.im` - Read direct messages
    - `message.mpim` - Read group DMs
    - `app_mention` - Read mentions

  </Step>

  <Step title="Install the App">
    Navigate to **Install App** in the sidebar and install the app to your workspace.

    Copy the **Bot User OAuth Token** (starts with `xoxb-`).

  </Step>

  <Step title="Configure SecuClaw">

```bash
secuclaw config set channels.slack.token '"xoxb-your-token"' --json
secuclaw config set channels.slack.enabled true --json
secuclaw gateway
```

  </Step>

  <Step title="Approve first DM pairing">
    DM your bot in Slack. It will respond with a pairing code.

```bash
secuclaw pairing list slack
secuclaw pairing approve slack <CODE>
```

    Pairing codes expire after 1 hour.

  </Step>
</Steps>

## Runtime model

- Gateway owns the Slack connection via Socket Mode.
- Reply routing is deterministic: Slack inbound replies back to Slack.
- By default, direct chats share the agent main session.
- Public and private channels are isolated session keys.

## Access control and routing

<Tabs>
  <Tab title="DM policy">
    `channels.slack.dmPolicy` controls DM access:

    - `pairing` (default)
    - `allowlist`
    - `open` (requires `channels.slack.allowFrom` to include `"*"`)
    - `disabled`

    `channels.slack.allowFrom` accepts Slack user IDs.

  </Tab>

  <Tab title="Channel policy">
    Channel handling is controlled by `channels.slack.groupPolicy`:

    - `open`
    - `allowlist`
    - `disabled`

    `allowlist` behavior:

    - channel must match `channels.slack.channels`
    - optional sender allowlists: `users` (user IDs)

    Example:

```json5
{
  channels: {
    slack: {
      groupPolicy: "allowlist",
      channels: {
        "C1234567890": {
          requireMention: true,
          users: ["U1234567890"],
        },
      },
    },
  },
}
```

  </Tab>

  <Tab title="Mentions">
    Channel messages are mention-gated by default.

    Mention detection includes:

    - explicit bot mention (`<@U1234567890>`)
    - configured mention patterns

    `requireMention` is configured per channel.

  </Tab>
</Tabs>

## Feature details

<AccordionGroup>
  <Accordion title="Message formatting">
    Outbound text uses Slack's mrkdwn format.

    - Markdown is converted to Slack-compatible formatting
    - Code blocks are preserved
    - Links are rendered as Slack links

  </Accordion>

  <Accordion title="Thread replies">
    Slack supports threaded replies.

    - Replies in threads stay in the same thread
    - `replyToMode` controls threading behavior:
      - `off` (default) - no threading
      - `first` - reply to first message
      - `all` - always reply in thread

  </Accordion>

  <Accordion title="Reactions">
    `ackReaction` sends an acknowledgement emoji while SecuClaw is processing an inbound message.

    Resolution order:

    - `channels.slack.ackReaction`
    - agent identity emoji fallback (default: "eyes")

  </Accordion>

  <Accordion title="File attachments">
    SecuClaw can send and receive files:

    - Images are displayed inline
    - Documents are uploaded as attachments
    - `mediaMaxMb` controls max file size (default: 30MB)

  </Accordion>

  <Accordion title="Message limits">
    - `textChunkLimit`: max message length (default: 40000 chars)
    - Slack's API limit is 40000 characters per message
    - Longer messages are split automatically

  </Accordion>
</AccordionGroup>

## Tools and action gates

Slack message actions include messaging, reactions, and channel operations.

Core examples:

- messaging: `sendMessage`, `postMessage`, `updateMessage`, `deleteMessage`
- reactions: `addReaction`, `removeReaction`
- channels: `createChannel`, `archiveChannel`, `inviteToChannel`

Action gates live under `channels.slack.actions.*`.

Default gate behavior:

| Action group | Default |
| --- | --- |
| messages, reactions, files | enabled |
| channels, admin | disabled |

## Troubleshooting

<AccordionGroup>
  <Accordion title="Bot does not respond in channels">

    - Verify the bot is added to the channel
    - Check `groupPolicy` is not set to `"disabled"`
    - Verify `requireMention` behavior
    - Check logs: `secuclaw logs --follow`

  </Accordion>

  <Accordion title="Socket Mode connection issues">

    - Verify Socket Mode is enabled in your Slack App
    - Verify App-Level Token has `connections:write` scope
    - Restart the gateway
    - Check network connectivity

  </Accordion>

  <Accordion title="Permission errors">

    - Verify all required bot token scopes are added
    - Reinstall the app to your workspace
    - Check the bot has necessary permissions in the channel

  </Accordion>

  <Accordion title="DM and pairing issues">

    - DM disabled: `channels.slack.dm.enabled=false`
    - DM policy disabled: `channels.slack.dmPolicy="disabled"`
    - Check logs for pairing code

  </Accordion>
</AccordionGroup>

## Configuration reference

High-signal Slack fields:

- `channels.slack.enabled`: enable/disable channel startup
- `channels.slack.token`: Bot User OAuth Token (xoxb-)
- `channels.slack.appToken`: App-Level Token (xapp-) for Socket Mode
- `channels.slack.dmPolicy`: `pairing | allowlist | open | disabled`
- `channels.slack.allowFrom`: DM allowlist (user IDs)
- `channels.slack.groupPolicy`: `open | allowlist | disabled`
- `channels.slack.channels`: per-channel config
- `channels.slack.textChunkLimit`: max message length
- `channels.slack.mediaMaxMb`: max file size

## Environment variables

```bash
SLACK_BOT_TOKEN=xoxb-...
SLACK_APP_TOKEN=xapp-...
```

## Safety and operations

- Treat bot tokens as secrets.
- Grant least-privilege Slack scopes.
- If connection is stale, restart gateway.

## Related

- [Channel communication](/channels/communication)
- [Gateway configuration](/gateway/configuration)
- [Troubleshooting](/help/troubleshooting)
