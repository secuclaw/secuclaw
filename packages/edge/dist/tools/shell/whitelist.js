export class WhitelistManager {
    allowed = new Set([
        "echo",
        "cat",
        "ls",
        "pwd",
        "uname",
        "date",
    ]);
    add(command) {
        this.allowed.add(command.trim());
    }
    remove(command) {
        return this.allowed.delete(command.trim());
    }
    check(command) {
        return this.allowed.has(command.trim());
    }
    list() {
        return Array.from(this.allowed.values()).sort();
    }
}
//# sourceMappingURL=whitelist.js.map