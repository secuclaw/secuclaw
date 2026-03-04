import fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
import * as path from "node:path";
// Security: Allowed base directory for file operations
const DEFAULT_ALLOWED_DIR = process.env.FILE_ALLOWED_DIR || process.cwd();
// Security: Validate path to prevent path traversal
function validatePath(filePath, allowedDir = DEFAULT_ALLOWED_DIR) {
    try {
        // Resolve to absolute path
        const resolved = path.resolve(filePath);
        const allowedResolved = path.resolve(allowedDir);
        // Check for path traversal attempts
        if (filePath.includes("..")) {
            return { valid: false, error: "Path traversal detected" };
        }
        // Check for null bytes (can be used to bypass checks)
        if (filePath.includes("\0")) {
            return { valid: false, error: "Null byte in path" };
        }
        // Check for dangerous file patterns
        const dangerousPatterns = [
            /\.env$/i,
            /id_rsa/i,
            /id_ed25519/i,
            /\.pem$/i,
            /\.key$/i,
            /\.ssh/i,
            /\.gnupg/i,
            /passwd$/i,
            /shadow$/i,
            /hosts$/i,
        ];
        for (const pattern of dangerousPatterns) {
            if (pattern.test(resolved)) {
                return { valid: false, error: "Writing to this file type is not allowed" };
            }
        }
        // Check if the resolved path is within the allowed directory
        if (!resolved.startsWith(allowedResolved + path.sep) && resolved !== allowedResolved) {
            return { valid: false, error: "Path is outside allowed directory" };
        }
        return { valid: true, resolved };
    }
    catch (error) {
        return { valid: false, error: "Invalid path" };
    }
}
export class FileWriter {
    allowedDir;
    constructor(allowedDir) {
        this.allowedDir = allowedDir ?? DEFAULT_ALLOWED_DIR;
    }
    async write(filePath, content) {
        // Security: Validate path
        const validation = validatePath(filePath, this.allowedDir);
        if (!validation.valid) {
            throw new Error(`Security error: ${validation.error}`);
        }
        await fs.writeFile(validation.resolved, content, "utf8");
    }
    async append(filePath, content) {
        // Security: Validate path
        const validation = validatePath(filePath, this.allowedDir);
        if (!validation.valid) {
            throw new Error(`Security error: ${validation.error}`);
        }
        await fs.appendFile(validation.resolved, content, "utf8");
    }
    async writeStream(filePath, chunks) {
        // Security: Validate path
        const validation = validatePath(filePath, this.allowedDir);
        if (!validation.valid) {
            throw new Error(`Security error: ${validation.error}`);
        }
        await new Promise((resolve, reject) => {
            const stream = createWriteStream(validation.resolved, { encoding: "utf8" });
            stream.on("error", reject);
            stream.on("finish", resolve);
            for (const chunk of chunks) {
                stream.write(chunk);
            }
            stream.end();
        });
    }
}
//# sourceMappingURL=writer.js.map