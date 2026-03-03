import path from "node:path";

export interface GuardOptions {
  allowedRoots: string[];
  maxFileSizeBytes: number;
}

export class FileGuard {
  private readonly options: GuardOptions;

  constructor(options?: Partial<GuardOptions>) {
    this.options = {
      allowedRoots: options?.allowedRoots ?? [process.cwd()],
      maxFileSizeBytes: options?.maxFileSizeBytes ?? 10 * 1024 * 1024,
    };
  }

  sanitize(filePath: string): string {
    return path.normalize(filePath).replace(/\0/g, "");
  }

  validate(filePath: string): boolean {
    const normalized = this.sanitize(filePath);
    const absolute = path.resolve(normalized);
    return this.options.allowedRoots.some((root) => absolute.startsWith(path.resolve(root)));
  }

  restrict(filePath: string): void {
    if (!this.validate(filePath)) {
      throw new Error(`Path is outside allowed roots: ${filePath}`);
    }
  }

  getMaxFileSizeBytes(): number {
    return this.options.maxFileSizeBytes;
  }
}
