import { WebGuard } from "./guard.js";
export declare class EdgeWebTool {
    private readonly fetcher;
    private readonly cache;
    private readonly guard;
    constructor(guard?: WebGuard);
    fetch(url: string): Promise<string>;
    fetchJSON<T = unknown>(url: string): Promise<T>;
    isAllowed(url: string): boolean;
}
//# sourceMappingURL=index.d.ts.map