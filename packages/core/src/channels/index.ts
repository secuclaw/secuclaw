export type {
  ChannelType,
  ChannelMessage,
  ChannelAttachment,
  ChannelResponse,
  ChannelConfig,
  Channel,
  ChannelContext,
  ChannelManagerOptions,
  ChannelStats,
} from "./types.js";

export { BaseChannel } from "./base.js";
export { TelegramChannel, type TelegramConfig, createTelegramChannel } from "./telegram.js";
export { DiscordChannel, type DiscordConfig, createDiscordChannel } from "./discord.js";
export { SlackChannel, type SlackConfig, createSlackChannel } from "./slack.js";
export { WebChannel, type WebConfig, createWebChannel } from "./web.js";
export { ChannelManager, createChannelManager } from "./manager.js";

export { FeishuChannel, type FeishuConfig, createFeishuChannel } from "./feishu.js";