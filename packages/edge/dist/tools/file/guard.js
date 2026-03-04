import path from "node:path";
export class FileGuard {
    options;
    constructor(options) {
        this.options = {
            allowedRoots: options?.allowedRoots ?? [process.cwd()],
            maxFileSizeBytes: options?.maxFileSizeBytes ?? 10 * 1024 * 1024,
        };
    }
    sanitize(filePath) {
        return path.normalize(filePath).replace(/\0/g, "");
    }
    validate(filePath) {
        const normalized = this.sanitize(filePath);
        const absolute = path.resolve(normalized);
        return this.options.allowedRoots.some((root) => absolute.startsWith(path.resolve(root)));
    }
    restrict(filePath) {
        if (!this.validate(filePath)) {
            throw new Error(`Path is outside allowed roots: ${filePath}`);
        }
    }
    getMaxFileSizeBytes() {
        return this.options.maxFileSizeBytes;
    }
}
//# sourceMappingURL=guard.js.map