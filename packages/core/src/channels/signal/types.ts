import type { ChannelConfig, ChannelAttachment } from "../types.js";

/**
 * Signal channel configuration
 */
export interface SignalConfig extends ChannelConfig {
  type: "signal";
  /** Signal phone number (E.164 format) */
  phoneNumber: string;
  /** Path to signal-cli binary */
  signalCliPath?: string;
  /** Signal service URL (for containerized/restricted setups) */
  serviceUrl?: string;
  /** Receive timeout in milliseconds */
  receiveTimeout?: number;
  /** Maximum attachment size in bytes (default: 100MB) */
  maxAttachmentSize?: number;
}

/**
 * Signal message from receive operation
 */
export interface SignalReceivedMessage {
  /** Unique message ID */
  id: string;
  /** Sender phone number */
  sender: string;
  /** Message timestamp */
  timestamp: number;
  /** Message body */
  body: string;
  /** Attachments */
  attachments?: SignalAttachment[];
  /** Group info if message is from a group */
  groupInfo?: SignalGroupInfo;
  /** Message reactions */
  reactions?: SignalReaction[];
}

/**
 * Signal message to send
 */
export interface SignalOutgoingMessage {
  /** Recipient phone number or group ID */
  recipient: string;
  /** Message body */
  body: string;
  /** Attachments to send */
  attachments?: SignalAttachment[];
  /** Whether this is a group message */
  isGroupMessage?: boolean;
}

/**
 * Signal attachment
 */
export interface SignalAttachment {
  /** Attachment ID */
  id: string;
  /** Content type (MIME type) */
  contentType: string;
  /** File name if available */
  filename?: string;
  /** Size in bytes */
  size?: number;
  /** Local path or URL */
  path?: string;
}

/**
 * Signal group information
 */
export interface SignalGroupInfo {
  /** Group ID */
  id: string;
  /** Group name */
  name?: string;
  /** Group members */
  members?: string[];
}

/**
 * Signal reaction (emoji response)
 */
export interface SignalReaction {
  /** Reactor phone number */
  reactor: string;
  /** Emoji */
  emoji: string;
  /** Target message ID */
  targetMessageId: string;
}

/**
 * Signal account info
 */
export interface SignalAccountInfo {
  /** Phone number */
  phoneNumber: string;
  /** Account ID */
  accountId: string;
  /** Whether device is linked */
  linked?: boolean;
  /** Device name */
  deviceName?: string;
}

/**
 * Signal connection status
 */
export type SignalConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

/**
 * Signal CLI execution result
 */
export interface SignalCLIResult {
  success: boolean;
  output?: string;
  error?: string;
  exitCode?: number;
}
