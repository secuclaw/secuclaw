export class WhitelistManager {
  private readonly allowed = new Set<string>([
    "echo",
    "cat",
    "ls",
    "pwd",
    "uname",
    "date",
  ]);

  add(command: string): void {
    this.allowed.add(command.trim());
  }

  remove(command: string): boolean {
    return this.allowed.delete(command.trim());
  }

  check(command: string): boolean {
    return this.allowed.has(command.trim());
  }

  list(): string[] {
    return Array.from(this.allowed.values()).sort();
  }
}
