import type { AppConfig } from "./types.js";

export interface ValidationIssue {
  key: string;
  message: string;
  level: "error" | "warning";
}

export class ConfigValidator {
  private errors: ValidationIssue[] = [];
  private warnings: ValidationIssue[] = [];

  validate(config: Partial<AppConfig>): boolean {
    this.errors = [];
    this.warnings = [];

    if (!config.server?.port || config.server.port <= 0) {
      this.errors.push({
        key: "server.port",
        message: "server.port must be > 0",
        level: "error",
      });
    }

    if (config.agents?.timeout && config.agents.timeout < 1000) {
      this.warnings.push({
        key: "agents.timeout",
        message: "timeout too low may cause premature failures",
        level: "warning",
      });
    }

    if (!config.logging?.level) {
      this.errors.push({
        key: "logging.level",
        message: "logging.level is required",
        level: "error",
      });
    }

    return this.errors.length === 0;
  }

  getErrors(): ValidationIssue[] {
    return [...this.errors];
  }

  getWarnings(): ValidationIssue[] {
    return [...this.warnings];
  }
}
