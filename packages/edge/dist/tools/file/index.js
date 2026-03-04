import fs from "node:fs/promises";
import { FileReader } from "./reader.js";
import { FileWriter } from "./writer.js";
import { FileScanner } from "./scanner.js";
import { FileGuard } from "./guard.js";
export class EdgeFileTool {
    reader = new FileReader();
    writer = new FileWriter();
    scanner = new FileScanner();
    guard;
    constructor(guard) {
        this.guard = guard ?? new FileGuard();
    }
    async read(filePath) {
        this.guard.restrict(filePath);
        await this.enforceSize(filePath);
        return this.reader.read(filePath);
    }
    async write(filePath, content) {
        this.guard.restrict(filePath);
        if (Buffer.byteLength(content, "utf8") > this.guard.getMaxFileSizeBytes()) {
            throw new Error("content exceeds max file size");
        }
        await this.writer.write(filePath, content);
    }
    async list(dir) {
        this.guard.restrict(dir);
        return this.scanner.scan(dir);
    }
    isAllowed(filePath) {
        return this.guard.validate(filePath);
    }
    async enforceSize(filePath) {
        const stat = await fs.stat(filePath);
        if (stat.size > this.guard.getMaxFileSizeBytes()) {
            throw new Error(`file exceeds max size: ${stat.size}`);
        }
    }
}
//# sourceMappingURL=index.js.map