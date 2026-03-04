import { FileGuard } from "./guard.js";
export declare class EdgeFileTool {
    private readonly reader;
    private readonly writer;
    private readonly scanner;
    private readonly guard;
    constructor(guard?: FileGuard);
    read(filePath: string): Promise<string>;
    write(filePath: string, content: string): Promise<void>;
    list(dir: string): Promise<string[]>;
    isAllowed(filePath: string): boolean;
    private enforceSize;
}
//# sourceMappingURL=index.d.ts.map