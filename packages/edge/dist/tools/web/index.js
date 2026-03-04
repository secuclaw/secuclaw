import { HTTPFetcher } from "./fetcher.js";
import { ResponseCache } from "./cache.js";
import { WebGuard } from "./guard.js";
export class EdgeWebTool {
    fetcher = new HTTPFetcher();
    cache = new ResponseCache();
    guard;
    constructor(guard) {
        this.guard = guard ?? new WebGuard();
    }
    async fetch(url) {
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
    async fetchJSON(url) {
        const body = await this.fetch(url);
        return JSON.parse(body);
    }
    isAllowed(url) {
        return this.guard.filter(url);
    }
}
//# sourceMappingURL=index.js.map