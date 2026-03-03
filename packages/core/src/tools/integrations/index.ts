export * from "./metasploit.js";
export * from "./nessus.js";
export * from "./burpsuite.js";

import { MetasploitClient, createMetasploitClient, type MetasploitConfig } from "./metasploit.js";
import { NessusClient, createNessusClient, type NessusConfig } from "./nessus.js";
import { BurpSuiteClient, createBurpSuiteClient, type BurpSuiteConfig } from "./burpsuite.js";

export interface SecurityToolConfig {
  metasploit?: MetasploitConfig;
  nessus?: NessusConfig;
  burpsuite?: BurpSuiteConfig;
}

export class SecurityToolManager {
  private metasploit: MetasploitClient | null = null;
  private nessus: NessusClient | null = null;
  private burpsuite: BurpSuiteClient | null = null;

  configure(config: SecurityToolConfig): void {
    if (config.metasploit) {
      this.metasploit = createMetasploitClient(config.metasploit);
    }
    if (config.nessus) {
      this.nessus = createNessusClient(config.nessus);
    }
    if (config.burpsuite) {
      this.burpsuite = createBurpSuiteClient(config.burpsuite);
    }
  }

  getMetasploit(): MetasploitClient | null {
    return this.metasploit;
  }

  getNessus(): NessusClient | null {
    return this.nessus;
  }

  getBurpSuite(): BurpSuiteClient | null {
    return this.burpsuite;
  }

  async healthCheck(): Promise<{
    metasploit: boolean;
    nessus: boolean;
    burpsuite: boolean;
  }> {
    const results = {
      metasploit: false,
      nessus: false,
      burpsuite: false,
    };

    if (this.metasploit) {
      try {
        const version = await this.metasploit.getVersion();
        results.metasploit = version !== null;
      } catch {
        results.metasploit = false;
      }
    }

    if (this.nessus) {
      try {
        const status = await this.nessus.getServerStatus();
        results.nessus = status !== null;
      } catch {
        results.nessus = false;
      }
    }

    if (this.burpsuite) {
      try {
        const version = await this.burpsuite.getVersion();
        results.burpsuite = version !== null;
      } catch {
        results.burpsuite = false;
      }
    }

    return results;
  }
}

export const securityToolManager = new SecurityToolManager();

export { MetasploitClient, NessusClient, BurpSuiteClient, createMetasploitClient, createNessusClient, createBurpSuiteClient };
