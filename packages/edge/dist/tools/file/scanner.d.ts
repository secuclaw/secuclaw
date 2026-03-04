export declare class FileScanner {
    scan(dir: string): Promise<string[]>;
    match(files: string[], pattern: RegExp): string[];
    filter(files: string[], predicate: (filePath: string) => boolean): string[];
}
//# sourceMappingURL=scanner.d.ts.map