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
  ChannelStatus,
  ChannelMetrics,
  UnifiedMessage,
  UnifiedParty,
  HealthResult,
} from "./types.js";

export { BaseChannel } from "./base.js";
export { TelegramChannel, type TelegramConfig, createTelegramChannel } from "./telegram.js";
export { DiscordChannel, type DiscordConfig, createDiscordChannel } from "./discord.js";
export { SlackChannel, type SlackConfig, createSlackChannel } from "./slack.js";
export { WebChannel, type WebConfig, createWebChannel } from "./web.js";
export { ChannelManager, createChannelManager } from "./manager.js";
export { StatusMonitor } from "./status-monitor.js";

export { FeishuChannel, type FeishuConfig, createFeishuChannel } from "./feishu.js";
export * from "./trait.js";
export * from "./message.js";
export * from "./attachment.js";
export * from "./registry.js";
export { ChannelFactoryRegistry, createChannel, createChannelFromConfig } from "./factory.js";

export { GoogleChatChannel, type GoogleChatConfig, createGoogleChatChannel } from "./google-chat/index.js";
export { GoogleChatMessageHandler, createMessageHandler } from "./google-chat/message.js";
export { CardBuilder, createCardBuilder, createAlertCard, createConfirmationCard } from "./google-chat/card-builder.js";
export type {
  GoogleChatCredentials,
  GoogleChatCredentialsJson,
  GoogleChatSpace,
  GoogleChatMessage,
  GoogleChatCardV2,
  GoogleChatConnectionState,
  GoogleChatEventMap,
} from "./google-chat/types.js";
export { IMessageChannel, type IMessageConfig, createIMessageChannel } from "./imessage/index.js";

export { SignalChannel, type SignalConfig, createSignalChannel } from "./signal/index.js";
