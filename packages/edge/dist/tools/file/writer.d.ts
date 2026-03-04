export declare class FileWriter {
    write(filePath: string, content: string): Promise<void>;
    append(filePath: string, content: string): Promise<void>;
    writeStream(filePath: string, chunks: Iterable<string>): Promise<void>;
}
//# sourceMappingURL=writer.d.ts.map