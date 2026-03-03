import { readFileSync, watch, type FSWatcher } from "node:fs";
import { extname } from "node:path";
import YAML from "yaml";

export type Config = Record<string, unknown>;

export class ConfigHotReloader {
  private readonly configPath: string;
  private watcher: FSWatcher | null = null;
  private callbacks = new Set<(config: Config) => void>();
  private currentConfig: Config = {};
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(configPath: string) {
    this.configPath = configPath;
    this.currentConfig = this.readConfig();
  }

  start(): void {
    if (this.watcher) {
      return;
    }
    this.watcher = watch(this.configPath, () => {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }
      this.debounceTimer = setTimeout(() => {
        this.currentConfig = this.readConfig();
        for (const callback of this.callbacks) {
          callback(this.currentConfig);
        }
      }, 50);
    });
  }

  stop(): void {
    if (!this.watcher) {
      return;
    }
    this.watcher.close();
    this.watcher = null;
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  onReload(callback: (config: Config) => void): void {
    this.callbacks.add(callback);
  }

  getCurrentConfig(): Config {
    return this.currentConfig;
  }

  private readConfig(): Config {
    const raw = readFileSync(this.configPath, "utf-8");
    const extension = extname(this.configPath).toLowerCase();

    if (extension === ".yaml" || extension === ".yml") {
      const parsed = YAML.parse(raw) as unknown;
      if (typeof parsed === "object" && parsed !== null) {
        return parsed as Config;
      }
      return {};
    }

    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed === "object" && parsed !== null) {
      return parsed as Config;
    }
    return {};
  }
}
