import type { ChannelConfig, ChannelAttachment as BaseChannelAttachment } from "../types.js";

export type TeamsChannelType = "teams";

export interface TeamsConfig extends ChannelConfig {
  type: TeamsChannelType;
  /** Microsoft App ID (also known as bot ID) */
  appId: string;
  /** Microsoft App password (bot password) */
  appPassword: string;
  /** Tenant ID for multi-tenant apps */
  tenantId?: string;
  /** Service URL for the bot */
  serviceUrl?: string;
  /** OAuth endpoint for token acquisition */
  oauthEndpoint?: string;
  /** Scopes to request */
  scopes?: string[];
  /** Enable webhook mode for receiving messages */
  webhookEnabled?: boolean;
  /** Webhook URL for receiving messages */
  webhookUrl?: string;
  /** Verification token for webhook */
  verificationToken?: string;
}

export interface TeamsCredentials {
  /** Access token for API calls */
  accessToken?: string;
  /** Refresh token for obtaining new access tokens */
  refreshToken?: string;
  /** OAuth2 client ID (same as appId) */
  clientId?: string;
  /** OAuth2 client secret (same as appPassword) */
  clientSecret?: string;
  /** Token expiry timestamp */
  expiresAt?: number;
  /** Object ID in Azure AD */
  objectId?: string;
}

export type TeamsChannelTypeEnum = "personal" | "groupChat" | "team";

export interface TeamsChannelInfo {
  id: string;
  type: TeamsChannelTypeEnum;
  name?: string;
  aadObjectId?: string;
  tenantId?: string;
}

export interface TeamsConversation {
  id: string;
  name?: string;
  aadObjectId?: string;
  conversationType: TeamsChannelTypeEnum;
  tenantId?: string;
  serviceUrl?: string;
}

export interface TeamsMessage {
  id: string;
  conversationId: string;
  from: TeamsUser;
  recipient?: TeamsUser;
  text?: string;
  attachments?: TeamsAttachment[];
  timestamp: string;
  channelData?: TeamsChannelData;
  summary?: string;
  locale?: string;
  textFormat?: string;
  mentionEntities?: TeamsMention[];
}

export interface TeamsUser {
  id: string;
  name?: string;
  aadObjectId?: string;
  email?: string;
  userPrincipalName?: string;
  givenName?: string;
  surname?: string;
}

export interface TeamsAttachment {
  id?: string;
  contentType: string;
  contentUrl?: string;
  content?: TeamsAdaptiveCard | Record<string, unknown>;
  name?: string;
  thumbnailUrl?: string;
}

export interface TeamsAdaptiveCard {
  type: "AdaptiveCard";
  version: string;
  body: TeamsAdaptiveCardElement[];
  actions?: TeamsAdaptiveCardAction[];
  msteams?: TeamsMSTeamsProps;
  $schema?: string;
  id?: string;
}

export type TeamsAdaptiveCardElement =
  | TeamsTextBlock
  | TeamsContainer
  | TeamsColumnSet
  | TeamsImage
  | TeamsFactSet
  | TeamsImageSet
  | TeamsActionSet
  | TeamsInput;

export interface TeamsTextBlock {
  type: "TextBlock";
  text: string;
  weight?: "bolder" | "lighter" | "normal";
  size?: "extraLarge" | "large" | "medium" | "small" | "default";
  color?: "accent" | "attention" | "default" | "good" | "warning";
  isSubtle?: boolean;
  wrap?: boolean;
  maxLines?: number;
  horizontalAlignment?: "center" | "left" | "right";
}

export interface TeamsContainer {
  type: "Container";
  items: TeamsAdaptiveCardElement[];
  style?: string;
  verticalContentAlignment?: "center" | "top" | "bottom";
  horizontalAlignment?: "center" | "left" | "right";
}

export interface TeamsColumn {
  type: "Column";
  width?: string | number;
  items?: TeamsAdaptiveCardElement[];
  verticalContentAlignment?: "center" | "top" | "bottom";
  horizontalAlignment?: "center" | "left" | "right";
}

export interface TeamsColumnSet {
  type: "ColumnSet";
  columns: TeamsColumn[];
  horizontalAlignment?: "center" | "left" | "right";
}

export interface TeamsImage {
  type: "Image";
  url: string;
  altText?: string;
  size?: "auto" | "stretch" | "small" | "medium" | "large";
  horizontalAlignment?: "center" | "left" | "right";
  style?: "person" | "default";
}

export interface TeamsFact {
  title: string;
  value: string;
}

export interface TeamsFactSet {
  type: "FactSet";
  facts: TeamsFact[];
}

export interface TeamsImageSet {
  type: "ImageSet";
  images: TeamsImage[];
  imageSize?: "auto" | "stretch" | "small" | "medium" | "large";
}

export interface TeamsAdaptiveCardAction {
  type: "Action.Execute" | "Action.OpenUrl" | "Action.Submit" | "Action.ToggleVisibility" | "Action.ShowCard";
  title: string;
  iconUrl?: string;
  data?: string | Record<string, unknown>;
  url?: string;
  verb?: string;
  isPrimary?: boolean;
}

export interface TeamsActionSet {
  type: "ActionSet";
  actions: TeamsAdaptiveCardAction[];
}

export type TeamsInputType = "Text" | "Number" | "Date" | "Time" | "Toggle" | "ChoiceSet" | "TextInput";

export interface TeamsInput {
  type: TeamsInputType;
  id: string;
  label?: string;
  value?: string;
  isRequired?: boolean;
  errorMessage?: string;
  placeholder?: string;
  style?: "text" | "tel" | "url" | "email" | "password";
  maxLength?: number;
  isMultiline?: boolean;
  choices?: TeamsChoice[];
}

export interface TeamsChoice {
  title: string;
  value: string;
  isSelected?: boolean;
}

export interface TeamsMSTeamsProps {
  teamsx?: {
    rootElementId?: string;
  };
  channelData?: TeamsChannelData;
}

export interface TeamsChannelData {
  channel?: {
    id: string;
    name?: string;
  };
  team?: {
    id: string;
    name?: string;
    aadGroupId?: string;
  };
  meeting?: {
    id?: string;
    conversation?: {
      isGroup?: boolean;
      id?: string;
    };
  };
  onBehalfOf?: Array<{
    itemId: number;
    mentionType?: string;
    mri?: string;
    displayName?: string;
  }>;
}

export interface TeamsMention {
  mentioned: TeamsUser;
  text: string;
  id: number;
}

export interface TeamsActivity {
  type: string;
  id: string;
  timestamp: string;
  localTimestamp?: string;
  localTimezone?: string;
  callerId?: string;
  serviceUrl: string;
  channelId?: string;
  conversation?: TeamsConversation;
  from: TeamsUser;
  recipient?: TeamsUser;
  textAttachments?: unknown[];
  attachments?: TeamsAttachment[];
  channelData?: TeamsChannelData;
  text?: string;
  summary?: string;
  speak?: string;
  inputHint?: "acceptingInput" | "expectingInput" | "ignoringInput";
  value?: unknown;
  valueType?: string;
  name?: string;
  relatesTo?: {
    channelId?: string;
    conversation?: {
      id: string;
      name?: string;
    };
    scope?: string;
    user?: TeamsUser;
  };
  code?: string;
  expiration?: string;
  locale?: string;
  entities?: unknown[];
  mentions?: TeamsMention[];
  role?: string;
}

export interface TeamsSendMessageRequest {
  recipient: TeamsUser;
  conversation?: TeamsConversation;
  text?: string;
  attachments?: TeamsAttachment[];
  channelData?: TeamsChannelData;
  textFormat?: string;
  locale?: string;
}

export interface TeamsSendResult {
  id: string;
  conversationId: string;
  recipientId: string;
  timestamp: string;
}

export type TeamsConnectionState =
  | "disconnected"
  | "connecting"
  | "authenticating"
  | "connected"
  | "error"
  | "reconnecting";

export interface TeamsEventMap {
  message: TeamsActivity;
  error: Error;
  connected: void;
  disconnected: { reason?: string };
}

export type TeamsMessageType = "text" | "file" | "card";

export interface TeamsMessageOptions {
  /** Message to send */
  text?: string;
  /** Adaptive Card to send */
  card?: TeamsAdaptiveCard;
  /** Attachments to send */
  attachments?: TeamsAttachment[];
  /** Whether the message is a reply */
  replyToId?: string;
  /** Entity mentions */
  mentions?: TeamsMention[];
}

export interface TeamsConversationParameters {
  isGroup: boolean;
  bot?: TeamsUser;
  channelData?: TeamsChannelData;
  members?: TeamsUser[];
  topicName?: string;
}
