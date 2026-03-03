import { watch, type FSWatcher } from "node:fs";

export interface ConfigChangeEvent {
  file: string;
  eventType: "rename" | "change";
  changedAt: number;
}

export type ConfigChangeCallback = (event: ConfigChangeEvent) => Promise<void> | void;

export class ConfigWatcher {
  private watcher: FSWatcher | null = null;
  private readonly callbacks = new Set<ConfigChangeCallback>();

  watch(path: string): void {
    this.unwatch();
    this.watcher = watch(path, (eventType, filename) => {
      if (!filename) {
        return;
      }
      const event: ConfigChangeEvent = {
        file: filename,
        eventType,
        changedAt: Date.now(),
      };
      for (const callback of this.callbacks) {
        void callback(event);
      }
    });
  }

  unwatch(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }

  onChange(callback: ConfigChangeCallback): void {
    this.callbacks.add(callback);
  }
}
