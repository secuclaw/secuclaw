import { URL } from "node:url";
export declare class WebGuard {
    private readonly allowedDomains;
    constructor(allowedDomains?: string[]);
    validate(raw: string): URL;
    checkSSRF(raw: string): boolean;
    filter(raw: string): boolean;
}
//# sourceMappingURL=guard.d.ts.map