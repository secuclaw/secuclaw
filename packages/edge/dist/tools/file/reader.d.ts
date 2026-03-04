export declare class FileReader {
    read(filePath: string, encoding?: BufferEncoding): Promise<string>;
    readLines(filePath: string): Promise<string[]>;
    readStream(filePath: string): AsyncIterable<string>;
}
//# sourceMappingURL=reader.d.ts.map