import { spawn } from "node:child_process";
import * as path from "node:path";
// Security: Whitelist of allowed commands
const ALLOWED_COMMANDS = new Set([
    // File operations (read-only)
    "ls", "cat", "head", "tail", "less", "more", "wc", "file", "stat",
    // Search and filter
    "grep", "find", "awk", "sed", "cut", "sort", "uniq", "tr", "xargs",
    // Network diagnostics
    "ping", "traceroute", "nslookup", "dig", "whois", "curl", "wget",
    // System info
    "uname", "hostname", "date", "uptime", "free", "df", "du", "ps", "top",
    // Text processing
    "echo", "printf", "tee", "diff",
    // Compression (read)
    "tar", "gzip", "gunzip", "zcat", "unzip",
]);
// Security: Blocked dangerous commands
const BLOCKED_COMMANDS = new Set([
    "rm", "rmdir", "dd", "mkfs", "fdisk", "format",
    "chmod", "chown", "chgrp",
    "su", "sudo", "doas", "pkexec",
    "ssh", "scp", "rsync", "ftp", "sftp",
    "nc", "netcat", "telnet",
    "crontab", "at", "batch",
    "systemctl", "service", "init",
    "iptables", "ip6tables", "ufw", "firewall-cmd",
    "useradd", "userdel", "usermod", "passwd",
    "eval", "exec", "source",
]);
// Security: Validate command
function isCommandAllowed(command, bypassWhitelist) {
    // Extract base command name
    const baseCmd = path.basename(command.split("/").pop() || command);
    // Always block dangerous commands
    if (BLOCKED_COMMANDS.has(baseCmd)) {
        return false;
    }
    // If bypass is enabled, allow (except blocked commands)
    if (bypassWhitelist) {
        return true;
    }
    // Check whitelist
    return ALLOWED_COMMANDS.has(baseCmd);
}
// Security: Validate arguments (no shell injection)
function validateArgs(args) {
    const dangerousPatterns = [
        /;/, // Command separator
        /\|/, // Pipe
        /&/, // Background execution
        /\$\(/, // Command substitution
        /`/, // Backtick substitution
        />/, // Redirect
        /</, // Redirect
        /\n/, // Newline
        /\r/, // Carriage return
    ];
    for (let i = 0; i < args.length; i++) {
        for (const pattern of dangerousPatterns) {
            if (pattern.test(args[i])) {
                return { valid: false, error: `Dangerous pattern found in argument ${i}` };
            }
        }
    }
    return { valid: true };
}
export class CommandExecutor {
    async execute(command, args = [], options = {}) {
        return this.executeWithTimeout(command, args, options.timeoutMs ?? 10_000, options);
    }
    async executeWithTimeout(command, args = [], timeoutMs, options = {}) {
        const started = Date.now();
        // Security: Validate command
        if (!isCommandAllowed(command, options.bypassWhitelist ?? false)) {
            return {
                success: false,
                stdout: "",
                stderr: `Command not allowed: ${command}. Use bypassWhitelist option with caution.`,
                exitCode: 126,
                durationMs: Date.now() - started,
            };
        }
        // Security: Validate arguments
        const argsValidation = validateArgs(args);
        if (!argsValidation.valid) {
            return {
                success: false,
                stdout: "",
                stderr: argsValidation.error || "Invalid arguments",
                exitCode: 126,
                durationMs: Date.now() - started,
            };
        }
        return new Promise((resolve) => {
            const child = spawn(command, args, {
                cwd: options.cwd,
                env: {
                    PATH: process.env.PATH,
                    ...(options.env ?? {}),
                },
                stdio: ["ignore", "pipe", "pipe"],
            });
            let stdout = "";
            let stderr = "";
            let settled = false;
            const timer = setTimeout(() => {
                child.kill("SIGKILL");
                if (!settled) {
                    settled = true;
                    resolve({
                        success: false,
                        stdout,
                        stderr: `${stderr}\ncommand-timeout`,
                        exitCode: 124,
                        durationMs: Date.now() - started,
                    });
                }
            }, timeoutMs);
            child.stdout.on("data", (chunk) => {
                stdout += chunk.toString();
            });
            child.stderr.on("data", (chunk) => {
                stderr += chunk.toString();
            });
            child.once("error", (error) => {
                clearTimeout(timer);
                if (!settled) {
                    settled = true;
                    resolve({
                        success: false,
                        stdout,
                        stderr: `${stderr}\n${error.message}`,
                        exitCode: 1,
                        durationMs: Date.now() - started,
                    });
                }
            });
            child.once("exit", (code) => {
                clearTimeout(timer);
                if (!settled) {
                    settled = true;
                    resolve({
                        success: code === 0,
                        stdout,
                        stderr,
                        exitCode: code ?? 1,
                        durationMs: Date.now() - started,
                    });
                }
            });
        });
    }
    async *stream(command, args = [], options = {}) {
        // Security: Validate command
        if (!isCommandAllowed(command, options.bypassWhitelist ?? false)) {
            throw new Error(`Command not allowed: ${command}`);
        }
        // Security: Validate arguments
        const argsValidation = validateArgs(args);
        if (!argsValidation.valid) {
            throw new Error(argsValidation.error || "Invalid arguments");
        }
        const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
        const queue = [];
        let done = false;
        child.stdout.on("data", (chunk) => queue.push(chunk.toString()));
        child.stderr.on("data", (chunk) => queue.push(chunk.toString()));
        child.on("close", () => {
            done = true;
        });
        while (!done || queue.length > 0) {
            const next = queue.shift();
            if (next) {
                yield next;
            }
            else {
                await new Promise((resolve) => setTimeout(resolve, 5));
            }
        }
    }
}
//# sourceMappingURL=executor.js.map