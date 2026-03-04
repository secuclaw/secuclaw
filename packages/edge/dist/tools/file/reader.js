import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
export class FileReader {
    async read(filePath, encoding = "utf8") {
        return fs.readFile(filePath, encoding);
    }
    async readLines(filePath) {
        const content = await this.read(filePath);
        return content.split(/\r?\n/);
    }
    async *readStream(filePath) {
        const stream = createReadStream(filePath, { encoding: "utf8" });
        for await (const chunk of stream) {
            yield chunk;
        }
    }
}
//# sourceMappingURL=reader.js.map