export declare class FileReader {
    private allowedDir;
    constructor(allowedDir?: string);
    read(filePath: string, encoding?: BufferEncoding): Promise<string>;
    readLines(filePath: string): Promise<string[]>;
    readStream(filePath: string): AsyncIterable<string>;
}
//# sourceMappingURL=reader.d.ts.map