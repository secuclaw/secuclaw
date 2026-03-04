export interface FetcherOptions {
    timeoutMs?: number;
    maxBytes?: number;
    headers?: Record<string, string>;
}
export declare class HTTPFetcher {
    fetch(url: string, options?: FetcherOptions): Promise<string>;
    post(url: string, body: unknown, options?: FetcherOptions): Promise<string>;
    stream(url: string, options?: FetcherOptions): AsyncIterable<string>;
    private readWithLimit;
}
//# sourceMappingURL=fetcher.d.ts.map