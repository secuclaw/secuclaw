import { writeFileSync, appendFileSync, existsSync } from "node:fs";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { LogLevel, LogFormat, LogOutput } from "../config/types.js";

export interface LoggerOptions {
  level: LogLevel;
  format: LogFormat;
  output: LogOutput[];
  filePath?: string;
  context?: string;
}

interface LogEntry {
  timestamp: string;
  level: string;
  context?: string;
  message: string;
  data?: Record<string, unknown>;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class Logger {
  private level: LogLevel;
  private format: LogFormat;
  private output: LogOutput[];
  private filePath: string | undefined;
  private context: string;

  constructor(options: LoggerOptions) {
    this.level = options.level;
    this.format = options.format;
    this.output = options.output;
    this.filePath = options.filePath;
    this.context = options.context ?? "app";
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>
  ): string {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message,
      data,
    };

    if (this.format === "json") {
      return JSON.stringify(entry);
    }

    const dataStr = data ? ` ${JSON.stringify(data)}` : "";
    return `[${entry.timestamp}] [${level.toUpperCase()}] [${this.context}] ${message}${dataStr}`;
  }

  private write(formattedMessage: string): void {
    if (this.output.includes("stdout")) {
      console.log(formattedMessage);
    }

    if (this.output.includes("file") && this.filePath) {
      const dir = dirname(this.filePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      appendFileSync(this.filePath, formattedMessage + "\n", "utf-8");
    }
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const formatted = this.formatMessage(level, message, data);
    this.write(formatted);
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.log("debug", message, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log("info", message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log("warn", message, data);
  }

  error(message: string, data?: Record<string, unknown>): void {
    this.log("error", message, data);
  }

  child(additionalContext: string): Logger {
    return new Logger({
      level: this.level,
      format: this.format,
      output: this.output,
      filePath: this.filePath,
      context: `${this.context}:${additionalContext}`,
    });
  }
}

export function createLogger(options: LoggerOptions): Logger {
  return new Logger(options);
}
