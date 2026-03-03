/**
 * Type declarations for @whiskeysockets/baileys
 * WhatsApp Web API library
 */

declare module "@whiskeysockets/baileys" {
  import { EventEmitter } from "events";

  // Connection state
  export type ConnectionState = "connecting" | "connected" | "disconnecting" | "disconnected" | "close" | "open";
  export type ConnectionState = "connecting" | "connected" | "disconnecting" | "disconnected";

  // Main socket type with event emitter
  export interface WASocket extends EventEmitter {
    user: { id: string; name?: string } | undefined;
    authState: AuthenticationState;
    ws: WebSocket | undefined;
    ev: BaileysEventEmitter;

    sendMessage(
      jid: string,
      content: AnyMessageContent,
      options?: MiscMessageGenerationOptions
    ): Promise<proto.WebMessageInfo>;

    end(reason?: string): void;
    logout(): Promise<void>;
    groupFetchAllParticipating(): Promise<Record<string, GroupMetadata>>;
    groupMetadata(jid: string): Promise<GroupMetadata>;
    profilePictureUrl(jid: string, type?: "image" | "preview"): Promise<string | undefined>;
    onWhatsApp(jids: string[]): Promise<{ jid: string; exists: boolean }[]>;
    sendMessageRead(jid: string, participant: string, messageIds: string[]): Promise<void>;
    presenceSubscribe(jid: string): Promise<void>;
    sendPresenceUpdate(type: WAPresence, jid?: string): Promise<void>;
    requestPresenceUpdate(jid: string): Promise<void>;
    readMessages(keys: proto.IMessageKey[]): Promise<void>;
    fetchMessagesFromWA(jid: string, count: number): Promise<proto.IWebMessageInfo[]>;
    loadMessageFromWA(jid: string, id: string): Promise<proto.IWebMessageInfo | undefined>;
  }

  // Event emitter interface
  export interface BaileysEventEmitter {
    on(event: "connection.update", listener: (update: Partial<ConnectionUpdate>) => void): void;
    on(event: "creds.update", listener: () => void): void;
    on(event: "messages.upsert", listener: (data: MessagesUpsertEvent) => void): void;
    on(event: "messages.update", listener: (data: MessagesUpdateEvent) => void): void;
    on(event: "messages.delete", listener: (data: MessagesDeleteEvent) => void): void;
    on(event: "chats.upsert", listener: (chats: Chat[]) => void): void;
    on(event: "chats.update", listener: (chats: Partial<Chat>[]) => void): void;
    on(event: "chats.delete", listener: (jids: string[]) => void): void;
    on(event: "groups.update", listener: (groups: Partial<GroupMetadata>[]) => void): void;
    on(event: string, listener: (...args: any[]) => void): void;
    off(event: string, listener: (...args: any[]) => void): void;
    emit(event: string, ...args: any[]): void;
  }
  // Connection update event
  export interface ConnectionUpdate {
    connection: ConnectionState;
    lastDisconnect?: {
      error?: Error & { output?: { statusCode: number } };
      date?: Date;
    };
    isNewLogin?: boolean;
    qr?: string;
    receivedPendingNotifications?: boolean;
  }

  // Alias for backwards compatibility
  export type ConnectionStateUpdate = ConnectionUpdate;

  // Message events
  export interface MessagesUpsertEvent {
    messages: proto.IWebMessageInfo[];
    type: "append" | "notify" | "prepend";
  }

  export interface MessagesUpdateEvent {
    keys: proto.IMessageKey[];
    update: Partial<proto.IWebMessageInfo>;
  }

  export interface MessagesDeleteEvent {
    keys: proto.IMessageKey[];
  }

  // Chat type
  export interface Chat {
    id: string;
    name?: string;
    conversationTimestamp?: number;
    unreadCount?: number;
    archived?: boolean;
    pinned?: boolean;
  }

  // Group metadata
  export interface GroupMetadata {
    id: string;
    subject: string;
    creation: number;
    owner: string;
    desc?: string;
    participants: GroupParticipant[];
  }

  export interface GroupParticipant {
    id: string;
    admin?: "admin" | "superadmin";
  }

  // Authentication types
  export interface AuthenticationState {
    creds: AuthenticationCreds;
    keys: SignalKeyStoreWithTransaction;
  }

  export interface AuthenticationCreds {
    me: { id: string; name?: string } | undefined;
    account: { id: string } | undefined;
    noiseKey: KeyPair;
    signedIdentityKey: KeyPair;
    signedPreKey: SignedPreKey;
    registrationId: number;
    advSecretKey: string;
    processedHistoryMessages: ProcessedHistoryMessage[];
    nextPreKeyId: number;
    firstUnuploadedPreKeyId: number;
    accountSettings: AccountSettings | undefined;
    deviceId: number;
    lastAccountSyncTimestamp?: number;
    myAppStateKeyId?: string;
  }

  export interface KeyPair {
    private: Uint8Array;
    public: Uint8Array;
  }

  export interface SignedPreKey {
    keyPair: KeyPair;
    signature: Uint8Array;
    keyId: number;
  }

  export interface ProcessedHistoryMessage {
    key: string;
    messageTimestamp: number;
  }

  export interface AccountSettings {
    unarchiveChats: boolean;
  }

  export interface SignalKeyStoreWithTransaction {
    get(type: string, ids: string[]): Promise<Record<string, Uint8Array | undefined>>;
    set(data: Record<string, Record<string, Uint8Array>>): Promise<void>;
    clear(transaction?: string): Promise<void>;
  }

  // Auth state result from useMultiFileAuthState
  export interface AuthStateResult {
    state: AuthenticationState;
    saveCreds: () => Promise<void>;
  }

  // Message options
  export interface MiscMessageGenerationOptions {
    quoted?: proto.IWebMessageInfo;
    mentions?: string[];
    caption?: string;
    ephemeralExpiration?: number;
    timestamp?: number;
  }

  // Message content types
  export type AnyMessageContent =
    | { text: string }
    | { image: { url: string | Buffer }; caption?: string; mimetype?: string }
    | { video: { url: string | Buffer }; caption?: string; mimetype?: string }
    | { document: { url: string | Buffer }; caption?: string; mimetype?: string; fileName?: string }
    | { audio: { url: string | Buffer }; mimetype?: string; ptt?: boolean }
    | { sticker: { url: string | Buffer } }
    | { reaction: { key: proto.IMessageKey; text: string } }
    | { location: { degreesLatitude: number; degreesLongitude: number } }
    | { contact: { displayName: string; vcard: string } }
    | { delete: proto.IMessageKey }
    | proto.IMessage;

  export type WAPresence = "unavailable" | "available" | "composing" | "recording" | "paused";

  // Proto namespace
  export namespace proto {
    export interface IWebMessageInfo {
      key: IMessageKey;
      message?: IMessage;
      messageTimestamp?: number | Long;
      status?: number;
    }

    export interface IMessageKey {
      remoteJid?: string | null;
      fromMe?: boolean | null;
      id?: string | null;
      participant?: string | null;
    }

    export interface IMessage {
      conversation?: string;
      extendedTextMessage?: { text?: string; contextInfo?: IContextInfo };
      imageMessage?: { url?: string; caption?: string; mimetype?: string; jpegThumbnail?: string };
      videoMessage?: { url?: string; caption?: string; mimetype?: string; jpegThumbnail?: string };
      documentMessage?: { url?: string; caption?: string; mimetype?: string; fileName?: string };
      audioMessage?: { url?: string; mimetype?: string; ptt?: boolean };
      stickerMessage?: { url?: string };
      // Outgoing message support (for constructing messages to send)
      image?: { url?: string; buffer?: Buffer; caption?: string; mimetype?: string };
      video?: { url?: string; buffer?: Buffer; caption?: string; mimetype?: string; gifPlayback?: boolean };
      audio?: { url?: string; buffer?: Buffer; mimetype?: string; ptt?: boolean };
      document?: { url?: string; buffer?: Buffer; caption?: string; mimetype?: string; fileName?: string };
      sticker?: { url?: string; buffer?: Buffer };
      text?: string;
    }

    export interface IContextInfo {
      quotedMessage?: IMessage;
      mentionedJid?: string[];
    }

    export interface WebMessageInfo extends IWebMessageInfo {}
    export interface MessageKey extends IMessageKey {}
  }

  export interface Long {
    low: number;
    high: number;
    unsigned: boolean;
  }

  // Disconnect reason constants
  export const DisconnectReason: {
    timedOut: 0;
    loggedOut: 401;
    banned: 403;
    restartRequired: 405;
    conflict: 409;
    connectionClosed: 428;
    connectionReplaced: 440;
    badSession: 500;
    connectionLost: 503;
  };

  export type DisconnectReasonCode = typeof DisconnectReason[keyof typeof DisconnectReason];

  // Factory function
  export function makeWASocket(config: SocketConfig): WASocket;

  export interface SocketConfig {
    auth: AuthenticationState;
    printQRInTerminal?: boolean;
    browser?: [string, string, string];
    version?: number[];
    connectTimeoutMs?: number;
    keepAliveIntervalMs?: number;
    qrTimeout?: number;
    markOnlineOnConnect?: boolean;
    emitOwnEvents?: boolean;
    getMessage?: (key: proto.IMessageKey) => Promise<proto.IMessage | undefined>;
  }

  // Auth state helpers
  export function useMultiFileAuthState(path: string): Promise<AuthStateResult>;

  export function fetchLatestBaileysVersion(): Promise<{
    version: number[];
    isLatest: boolean;
  }>;

  // Store helpers
  export function makeInMemoryStore(): {
    bind: (socket: WASocket) => void;
    loadMessage: (jid: string, id: string) => proto.IWebMessageInfo | undefined;
    upsertMessage: (msg: proto.IWebMessageInfo, type: string) => void;
    toJSON: () => string;
    fromJSON: (json: string) => void;
    readFromFile: (path: string) => Promise<void>;
    writeToFile: (path: string) => Promise<void>;
  };

  // Media download helper
  export function downloadMediaMessage(
    socket: WASocket,
    message: proto.IWebMessageInfo,
    type: "buffer" | "stream",
    options?: DownloadMediaOptions
  ): Promise<Buffer | NodeJS.ReadableStream>;

  export interface DownloadMediaOptions {
    logger?: { error: (...args: any[]) => void; warn: (...args: any[]) => void };
    reuploadRequest?: (msg: proto.IMessage) => Promise<proto.IMessage>;
  }

  // Browser configs
  export const Browsers: {
    ubuntu: (browser: string) => [string, string, string];
    macOS: (browser: string) => [string, string, string];
    windows: (browser: string) => [string, string, string];
    appropriate: (browser: string) => [string, string, string];
  };

  // Utility
  export function delay(ms: number): Promise<void>;
}
