/**
 * Hand Framework - Requirement Checking
 * 
 * Provides dependency checking for Hand requirements (binaries, env vars, API keys).
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { HandRequirement, HandInstallInfo } from "./types.js";

const execAsync = promisify(exec);

// Result of a requirement check
export interface RequirementCheckResult {
  key: string;
  available: boolean;
  install?: HandInstallInfo;
  message?: string;
}

// Requirement checker class
export class RequirementChecker {
  /**
   * Check a single requirement
   */
  static async check(requirement: HandRequirement): Promise<RequirementCheckResult> {
    const { key, requirementType, checkValue, install } = requirement;

    try {
      switch (requirementType) {
        case "binary":
          return await this.checkBinary(key, checkValue, install);
        case "env-var":
          return this.checkEnvVar(key, checkValue, install);
        case "api-key":
          return this.checkApiKey(key, checkValue, install);
        default:
          return {
            key,
            available: false,
            install,
            message: `Unknown requirement type: ${requirementType}`,
          };
      }
    } catch (error) {
      return {
        key,
        available: false,
        install,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Check all requirements
   */
  static async checkAll(requirements: HandRequirement[]): Promise<RequirementCheckResult[]> {
    const results = await Promise.all(requirements.map((req) => this.check(req)));
    return results;
  }

  /**
   * Check if a binary is available
   */
  private static async checkBinary(
    key: string,
    binaryName: string,
    install?: HandInstallInfo
  ): Promise<RequirementCheckResult> {
    // Check if binary exists in PATH
    try {
      // Try to find the binary using `which` command
      const isWindows = process.platform === "win32";
      const command = isWindows ? `where ${binaryName}` : `which ${binaryName}`;
      
      await execAsync(command, { timeout: 5000 });
      
      return {
        key,
        available: true,
        install,
        message: `Binary '${binaryName}' found`,
      };
    } catch {
      // Binary not found
      return {
        key,
        available: false,
        install,
        message: `Binary '${binaryName}' not found in PATH`,
      };
    }
  }

  /**
   * Check if an environment variable is set
   */
  private static checkEnvVar(
    key: string,
    varName: string,
    install?: HandInstallInfo
  ): RequirementCheckResult {
    const value = process.env[varName];
    
    if (value && value.length > 0) {
      return {
        key,
        available: true,
        install,
        message: `Environment variable '${varName}' is set`,
      };
    }
    
    return {
      key,
      available: false,
      install,
      message: `Environment variable '${varName}' is not set`,
    };
  }

  /**
   * Check if an API key is configured
   */
  private static checkApiKey(
    key: string,
    envVarName: string,
    install?: HandInstallInfo
  ): RequirementCheckResult {
    const value = process.env[envVarName];
    
    if (value && value.length > 0) {
      // Check if it looks like a valid API key (not just "YOUR_KEY_HERE")
      if (value === "YOUR_KEY_HERE" || value.startsWith("sk-") === false && value.length < 10) {
        return {
          key,
          available: false,
          install,
          message: `API key appears to be a placeholder`,
        };
      }
      
      return {
        key,
        available: true,
        install,
        message: `API key '${envVarName}' is configured`,
      };
    }
    
    return {
      key,
      available: false,
      install,
      message: `API key environment variable '${envVarName}' is not set`,
    };
  }

  /**
   * Generate installation instructions for a requirement
   */
  static getInstallInstructions(install: HandInstallInfo): string {
    const { kind, formula, package: pkg, label } = install;
    
    switch (kind) {
      case "brew":
        return `Install with: brew install ${formula}`;
      case "node":
        return `Install with: npm install -g ${pkg}`;
      case "go":
        return `Install with: go install ${formula}`;
      case "pip":
        return `Install with: pip install ${pkg}`;
      case "download":
        return install.url ? `Download from: ${install.url}` : "Download from the project website";
      default:
        return label ?? "See documentation for installation";
    }
  }
}
