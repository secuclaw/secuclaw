import { spawn, type ChildProcess } from "child_process";
import type {
  SignalConfig,
  SignalAccountInfo,
  SignalCLIResult,
  SignalConnectionStatus,
} from "./types.js";

/**
 * Manages Signal CLI connection and command execution
 */
export class SignalConnection {
  private config: SignalConfig;
  private process?: ChildProcess;
  private status: SignalConnectionStatus = "disconnected";

  constructor(config: SignalConfig) {
    this.config = config;
  }

  /**
   * Get the Signal CLI path
   */
  get cliPath(): string {
    return this.config.signalCliPath || "signal-cli";
  }

  /**
   * Get the configured phone number
   */
  get phoneNumber(): string {
    return this.config.phoneNumber;
  }

  /**
   * Get current connection status
   */
  get connectionStatus(): SignalConnectionStatus {
    return this.status;
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.status === "connected";
  }

  /**
   * Execute a signal-cli command
   */
  async execute(args: string[], timeout = 30000): Promise<SignalCLIResult> {
    return new Promise((resolve) => {
      const cliArgs = this.buildBaseArgs().concat(args);
      const proc = spawn(this.cliPath, cliArgs, {
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      const timeoutHandle = setTimeout(() => {
        proc.kill("SIGTERM");
        resolve({
          success: false,
          error: `Command timed out after ${timeout}ms`,
          exitCode: -1,
        });
      }, timeout);

      proc.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      proc.on("close", (code) => {
        clearTimeout(timeoutHandle);
        if (code === 0) {
          resolve({
            success: true,
            output: stdout.trim(),
            exitCode: code,
          });
        } else {
          resolve({
            success: false,
            output: stdout.trim(),
            error: stderr.trim() || `Command exited with code ${code}`,
            exitCode: code ?? undefined,
          });
        }
      });

      proc.on("error", (err) => {
        clearTimeout(timeoutHandle);
        resolve({
          success: false,
          error: err.message,
          exitCode: -1,
        });
      });
    });
  }

  /**
   * Build base arguments for signal-cli commands
   */
  private buildBaseArgs(): string[] {
    const args: string[] = [];

    // Add service URL if specified
    if (this.config.serviceUrl) {
      args.push("--url", this.config.serviceUrl);
    }

    // Always specify the account
    args.push("-u", this.config.phoneNumber);

    return args;
  }

  /**
   * Get account information
   */
  async getAccountInfo(): Promise<SignalAccountInfo | null> {
    const result = await this.execute(["account"]);

    if (!result.success || !result.output) {
      return null;
    }

    try {
      // Parse account info from JSON output
      const data = JSON.parse(result.output);
      return {
        phoneNumber: this.config.phoneNumber,
        accountId: data.id || data.uuid || "",
        linked: data.linked || false,
        deviceName: data.deviceName || data.name,
      };
    } catch {
      // If not JSON, try to parse from text
      const phoneMatch = result.output.match(/(\+\d+)/);
      return {
        phoneNumber: phoneMatch ? phoneMatch[1] : this.config.phoneNumber,
        accountId: "",
      };
    }
  }

  /**
   * Send a text message
   */
  async sendMessage(recipient: string, message: string): Promise<SignalCLIResult> {
    return this.execute(["send", "-m", message, recipient]);
  }

  /**
   * Send a message with attachment
   */
  async sendAttachment(recipient: string, message: string, attachmentPath: string): Promise<SignalCLIResult> {
    return this.execute(["send", "-m", message, "-a", attachmentPath, recipient]);
  }

  /**
   * Receive pending messages
   */
  async receiveMessages(limit = 10): Promise<string> {
    const result = await this.execute(["receive", "--json", "-l", String(limit)]);
    return result.output || "[]";
  }

  /**
   * List groups
   */
  async listGroups(): Promise<SignalCLIResult> {
    return this.execute(["listGroups", "--json"]);
  }

  /**
   * Create a new group
   */
  async createGroup(name: string, members: string[]): Promise<SignalCLIResult> {
    const memberArgs = members.flatMap((m) => ["--members", m]);
    return this.execute(["createGroup", "--name", name, ...memberArgs]);
  }

  /**
   * Join a group via invite link
   */
  async joinGroup(inviteLink: string): Promise<SignalCLIResult> {
    return this.execute(["joinGroup", "--accept-invite", inviteLink]);
  }

  /**
   * Leave a group
   */
  async leaveGroup(groupId: string): Promise<SignalCLIResult> {
    return this.execute(["leaveGroup", groupId]);
  }

  /**
   * Update profile
   */
  async updateProfile(updates: { name?: string; avatar?: string }): Promise<SignalCLIResult> {
    const args: string[] = ["updateProfile"];
    if (updates.name) {
      args.push("--name", updates.name);
    }
    if (updates.avatar) {
      args.push("--avatar", updates.avatar);
    }
    return this.execute(args);
  }

  /**
   * Send a reaction to a message
   */
  async sendReaction(recipient: string, emoji: string, messageId: string): Promise<SignalCLIResult> {
    return this.execute(["react", "-e", emoji, "--in-reply-to", messageId, recipient]);
  }

  /**
   * Delete a message (for yourself)
   */
  async deleteMessage(messageId: string, recipient: string): Promise<SignalCLIResult> {
    return this.execute(["delete", messageId, recipient]);
  }

  /**
   * Check if CLI is available and working
   */
  async ping(): Promise<boolean> {
    const result = await this.execute(["version"], 5000);
    return result.success;
  }

  /**
   * Set connection status
   */
  private setStatus(status: SignalConnectionStatus): void {
    this.status = status;
  }

  /**
   * Connect and verify the connection
   */
  async connect(): Promise<void> {
    this.setStatus("connecting");

    const isAvailable = await this.ping();
    if (!isAvailable) {
      this.setStatus("error");
      throw new Error("Signal CLI is not available or not properly configured");
    }

    // Verify account is registered
    const accountInfo = await this.getAccountInfo();
    if (!accountInfo) {
      this.setStatus("error");
      throw new Error("Signal account is not registered. Please run registration first.");
    }

    this.setStatus("connected");
  }

  /**
   * Disconnect (cleanup resources)
   */
  async disconnect(): Promise<void> {
    if (this.process) {
      this.process.kill("SIGTERM");
      this.process = undefined;
    }
    this.setStatus("disconnected");
  }
}

/**
 * Create a new Signal connection instance
 */
export function createSignalConnection(config: SignalConfig): SignalConnection {
  return new SignalConnection(config);
}
