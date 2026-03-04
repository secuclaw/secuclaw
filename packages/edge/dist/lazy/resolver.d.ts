import type { ModuleMetadata, ResolverEntry } from "./types.js";
export declare class ModuleResolver {
    private readonly entries;
    register(name: string, importer: ResolverEntry["importer"], metadata?: Partial<ModuleMetadata>): void;
    resolve(name: string): ResolverEntry;
    exists(name: string): boolean;
    getMetadata(name: string): ModuleMetadata | undefined;
    list(): string[];
}
//# sourceMappingURL=resolver.d.ts.map