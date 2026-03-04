import fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
export class FileWriter {
    async write(filePath, content) {
        await fs.writeFile(filePath, content, "utf8");
    }
    async append(filePath, content) {
        await fs.appendFile(filePath, content, "utf8");
    }
    async writeStream(filePath, chunks) {
        await new Promise((resolve, reject) => {
            const stream = createWriteStream(filePath, { encoding: "utf8" });
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