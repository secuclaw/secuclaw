import type { ChannelConfig, ChannelMessage, ChannelAttachment as BaseChannelAttachment } from "../types.js";

export type GoogleChatChannelType = "googlechat";

export interface GoogleChatConfig extends ChannelConfig {
  type: GoogleChatChannelType;
  /** OAuth2 credentials */
  credentials: GoogleChatCredentials;
  /** Application credentials JSON string */
  serviceAccountJson?: string;
  /** Scopes to request */
  scopes?: string[];
  /** Enable webhook mode */
  webhookEnabled?: boolean;
  /** Webhook URL for receiving messages */
  webhookUrl?: string;
  /** Verification token for webhook */
  verificationToken?: string;
}

export interface GoogleChatCredentials {
  /** Access token for API calls */
  accessToken?: string;
  /** Refresh token for obtaining new access tokens */
  refreshToken?: string;
  /** OAuth2 client ID */
  clientId?: string;
  /** OAuth2 client secret */
  clientSecret?: string;
  /** Token expiry timestamp */
  expiryDate?: number;
}

export interface GoogleChatCredentialsJson {
  /** Service account JSON from Google Cloud */
  type?: string;
  project_id?: string;
  private_key?: string;
  client_email?: string;
  token_uri?: string;
}

export type GoogleChatSpaceType = "SPACE_TYPE_UNSPECIFIED" | "DIRECT_MESSAGE" | "GROUP_CHAT" | "SPACE";

export type GoogleChatMembershipState = "MEMBERSHIP_STATE_UNSPECIFIED" | "JOINED" | "INVITED" | "NOT_IN_SPACE";

export interface GoogleChatSpace {
  name: string;
  type: GoogleChatSpaceType;
  displayName?: string;
  spaceThreadingState?: string;
  spaceType?: string;
  singleUserBotDm?: boolean;
  threadOwner?: string;
  createTime?: string;
  lastActiveTime?: string;
}

export interface GoogleChatMessage {
  name: string;
  space: string;
  createTime?: string;
  createMask?: string;
  lastUpdateTime?: string;
  lastRevStartTime?: string;
  sender?: GoogleChatUser;
  oooFormModifier?: GoogleChatUser;
  spaceHistoryState?: string;
  message?: GoogleChatMessageContent;
  thread?: GoogleChatThread;
  annotationHeader?: GoogleChatAnnotation[];
  slashCommand?: GoogleChatSlashCommand;
  card?: GoogleChatCard;
  cardsV2?: GoogleChatCardV2[];
  dialogAction?: GoogleChatDialogAction;
  actionResponse?: GoogleChatActionResponse;
  fallbackText?: string;
  segment?: GoogleChatSegment;
  attachments?: GoogleChatAttachment[];
}

export interface GoogleChatUser {
  name?: string;
  displayName?: string;
  domainId?: string;
  id?: string;
  type?: string;
  isAnonymous?: boolean;
}

export interface GoogleChatMessageContent {
  name?: string;
  body?: string;
  cards?: GoogleChatCard[];
  cardsV2?: GoogleChatCardV2[];
  text?: string;
  segment?: GoogleChatSegment;
  attachments?: GoogleChatAttachment[];
  slashCommand?: GoogleChatSlashCommand;
}

export interface GoogleChatThread {
  name?: string;
  threadKey?: string;
  root?: string;
  replyTo?: string;
}

export interface GoogleChatAnnotation {
  type: string;
  startIndex?: number;
  length?: number;
  slashCommand?: GoogleChatSlashCommand;
  userMention?: GoogleChatUserMention;
  richLink?: GoogleChatRichLink;
}

export interface GoogleChatSlashCommand {
  commandId?: string;
  commandName?: string;
  type?: string;
}

export interface GoogleChatUserMention {
  user?: GoogleChatUser;
  type?: string;
  userId?: string;
}

export interface GoogleChatRichLink {
  uri?: string;
  title?: string;
  mimeType?: string;
}

export interface GoogleChatCard {
  cardId?: string;
  header?: GoogleChatCardHeader;
  sections?: GoogleChatCardSection[];
  cardFixedFooter?: GoogleChatCardFooter;
  cardOnClick?: GoogleChatOnClick;
}

export interface GoogleChatCardV2 {
  cardId?: string;
  card?: GoogleChatCard;
}

export interface GoogleChatCardHeader {
  title: string;
  subtitle?: string;
  imageStyle?: string;
  imageUrl?: string;
}

export interface GoogleChatCardSection {
  header?: string;
  widgets?: GoogleChatWidget[];
  collapsible?: boolean;
  numUncollapsibleWidgets?: number;
}

export type GoogleChatWidget = 
  | { textParagraph?: GoogleChatTextParagraph }
  | { image?: GoogleChatImage }
  | { keyValue?: GoogleChatKeyValue }
  | { buttonList?: GoogleChatButtonList }
  | { textInput?: GoogleChatTextInput }
  | { selectionInput?: GoogleChatSelectionInput }
  | { dateTimePicker?: GoogleChatDateTimePicker }
  | { decoratedText?: GoogleChatDecoratedText }
  | { divider?: Record<string, never> }
  | { grid?: GoogleChatGrid };

export interface GoogleChatTextParagraph {
  text: string;
}

export interface GoogleChatImage {
  imageUrl: string;
  onClick?: GoogleChatOnClick;
  aspectRatio?: number;
}

export interface GoogleChatKeyValue {
  topLabel?: string;
  content: string;
  contentMultiline?: boolean;
  bottomLabel?: string;
  startIcon?: GoogleChatIcon;
  endIcon?: GoogleChatIcon;
  button?: GoogleChatButton;
  onClick?: GoogleChatOnClick;
}

export interface GoogleChatButtonList {
  buttons: GoogleChatButton[];
}

export interface GoogleChatButton {
  text: string;
  icon?: GoogleChatIcon;
  onClick: GoogleChatOnClick;
  disabled?: boolean;
}

export interface GoogleChatIcon {
  iconUrl?: string;
  knownIcon?: string;
}

export interface GoogleChatOnClick {
  action?: GoogleChatAction;
  openLink?: GoogleChatOpenLink;
  function?: string;
}

export interface GoogleChatAction {
  function: string;
  parameters?: GoogleChatActionParameter[];
  navigations?: GoogleChatNavigation[];
  persist?: boolean;
  authorizations?: GoogleChatAuthorization[];
}

export interface GoogleChatActionParameter {
  key: string;
  value: string;
}

export interface GoogleChatNavigation {
  pop?: string;
  push?: GoogleChatCard;
  updateCard?: GoogleChatCard;
}

export interface GoogleChatAuthorization {
  authorizationType?: string;
  userOnClockAction?: string;
}

export interface GoogleChatOpenLink {
  url: string;
  openAs?: string;
}

export interface GoogleChatTextInput {
  type?: string;
  label: string;
  value?: string;
  hintText?: string;
  valueChangeBehavior?: string;
  onChangeAction?: string;
  onChangeParameter?: string;
  choices?: GoogleChatChoice[];
}

export interface GoogleChatSelectionInput {
  type: "CHECK_BOX" | "RADIO_BUTTON" | "SWITCH" | "DROPDOWN";
  label: string;
  items: GoogleChatChoice[];
  onChangeAction?: string;
  onChangeParameter?: string;
}

export interface GoogleChatChoice {
  value: string;
  label: string;
}

export interface GoogleChatDateTimePicker {
  type: "DATE_AND_TIME" | "DATE" | "TIME";
  label: string;
  valueMsEpoch?: number;
  timezoneOffsetDateJson?: string;
  onChangeAction?: string;
  onChangeParameter?: string;
}

export interface GoogleChatDecoratedText {
  text: string;
  startIcon?: GoogleChatIcon;
  endIcon?: GoogleChatIcon;
  button?: GoogleChatButton;
  onClick?: GoogleChatOnClick;
}

export interface GoogleChatGrid {
  title?: string;
  columnCount?: number;
  borderStyle?: GoogleChatBorderStyle;
  columns?: GoogleChatGridColumn[];
}

export interface GoogleChatBorderStyle {
  type?: "NO_BORDER" | "STROKE" | "OUTLINE";
  strokeColor?: GoogleChatColor;
  cornerRadius?: number;
}

export interface GoogleChatColor {
  red?: number;
  green?: number;
  blue?: number;
  alpha?: number;
}

export interface GoogleChatGridColumn {
  title?: string;
  widgets?: GoogleChatWidget[];
}

export interface GoogleChatCardFooter {
  primaryButton?: GoogleChatButton;
  secondaryButton?: GoogleChatButton;
}

export interface GoogleChatAttachment {
  name?: string;
  contentName?: string;
  contentUrl?: string;
  source?: string;
  attachmentDataRef?: GoogleChatAttachmentDataRef;
}

export interface GoogleChatAttachmentDataRef {
  resourceName?: string;
  permission?: string;
}

export interface GoogleChatSegment {
  type?: string;
  userMention?: GoogleChatUserMention;
  slashCommand?: GoogleChatSlashCommand;
}

export interface GoogleChatDialogAction {
  actionStatus?: string;
  dialog?: GoogleChatDialog;
}

export interface GoogleChatDialog {
  body?: GoogleChatCard;
}

export interface GoogleChatActionResponse {
  type: "TYPE_UNSPECIFIED" | "NEW_WINDOW" | "REQUEST_CONFIG" | "DIALOG" | "UPDATE_MESSAGE" | "UPDATE_USER_MESSAGE_CARDS" | "AUTHORIZATION";
  dialogAction?: GoogleChatDialogAction;
  authorizationAction?: GoogleChatAuthorizationAction;
}

export interface GoogleChatAuthorizationAction {
  authorizationGrant?: GoogleChatAuthorizationGrant;
}

export interface GoogleChatAuthorizationGrant {
  type?: "AUTHORIZATION_GRANT_TYPE_UNSPECIFIED" | "AUTHORIZATION";
  resource?: GoogleChatResource;
}

export interface GoogleChatResource {
  name?: string;
  resourceId?: string;
  permission?: string;
}

export interface GoogleChatMessageEvent {
  type: string;
  eventTime?: string;
  token?: string;
  message?: GoogleChatMessage;
  user?: GoogleChatUser;
  space?: GoogleChatSpace;
  thread?: GoogleChatThread;
  actionResponse?: GoogleChatActionResponse;
}

export type GoogleChatEventType = 
  | "MESSAGE"
  | "ADDED_TO_SPACE"
  | "REMOVED_FROM_SPACE"
  | "CARD_CLICKED"
  | "SUBMITTED_FORM"
  | "SUBMIT_ACTION"
  | "SLASH_COMMAND"
  | "PREMADE_CARD_INTERACTION"
  | "DISMISS_DIALOG"
  | "ON_CHANGE";

export interface GoogleChatFormInput {
  key: string;
  value: string | string[];
}

export interface GoogleChatFormAction {
  actionMethodName?: string;
  parameters?: GoogleChatActionParameter[];
}

export interface GoogleChatActionReturnValue {
  parameter?: GoogleChatActionParameter[];
  formInputs?: Record<string, GoogleChatFormInput>;
  actionResponse?: GoogleChatActionResponse;
}

export interface GoogleChatSendMessageRequest {
  parent: string;
  message: GoogleChatMessage;
}

export interface GoogleChatCreateSpaceRequest {
  space: Partial<GoogleChatSpace>;
}

export interface GoogleChatMessageDeletedEvent {
  name: string;
  deleteTime?: string;
  lastRevStartTime?: string;
}

export interface GoogleChatMembership {
  name: string;
  state: GoogleChatMembershipState;
  member?: GoogleChatUser;
  createTime?: string;
}

export type GoogleChatConnectionState = 
  | "disconnected"
  | "connecting"
  | "connected"
  | "authenticating"
  | "error"
  | "reconnecting";

export interface GoogleChatEventMap {
  message: GoogleChatMessageEvent;
  membership: GoogleChatMembership;
  error: Error;
  connected: void;
  disconnected: { reason?: string };
}

export interface GoogleChatSendResult {
  name: string;
  space: string;
  thread?: string;
  createTime?: string;
}

export type GoogleChatMessageType = "text" | "image" | "file" | "card";

export interface GoogleChatMessageOptions {
  threadKey?: string;
  parent?: string;
  requestId?: string;
}

export interface GoogleChatReactionOptions {
  emoji: {
    unicode: string;
  };
}
