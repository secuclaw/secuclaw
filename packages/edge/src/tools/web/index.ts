import { HTTPFetcher } from "./fetcher.js";
import { ResponseCache } from "./cache.js";
import { WebGuard } from "./guard.js";

export class EdgeWebTool {
  private readonly fetcher = new HTTPFetcher();
  private readonly cache = new ResponseCache();
  private readonly guard: WebGuard;

  constructor(guard?: WebGuard) {
    this.guard = guard ?? new WebGuard();
  }

  async fetch(url: string): Promise<string> {
    if (!this.isAllowed(url)) {
      throw new Error(`URL not allowed: ${url}`);
    }

    const cached = this.cache.get(url);
    if (cached !== undefined) {
      return cached;
    }

    const body = await this.fetcher.fetch(url);
    this.cache.set(url, body);
    return body;
  }

  async fetchJSON<T = unknown>(url: string): Promise<T> {
    const body = await this.fetch(url);
    return JSON.parse(body) as T;
  }

  isAllowed(url: string): boolean {
    return this.guard.filter(url);
  }
}
