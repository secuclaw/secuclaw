// Security: SSRF protection - blocked hosts
const BLOCKED_HOSTS = new Set([
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "::1",
    "[::1]",
    "localtest.me",
    "lvh.me",
]);
// Security: SSRF protection - private IP patterns
const PRIVATE_IP_PATTERNS = [
    /^10\./, // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
    /^192\.168\./, // 192.168.0.0/16
    /^169\.254\./, // 169.254.0.0/16 (link-local)
    /^0\.0\.0\./, // 0.0.0.0/8
    /^22[4-9]\./, // 224.0.0.0/4 (multicast)
    /^23[0-9]\./, // 239.0.0.0/8 (multicast)
    /^255\./, // 255.0.0.0/8 (broadcast)
];
// Security: Validate URL for SSRF protection
function isUrlAllowed(urlString, allowPrivateNetworks) {
    let url;
    try {
        url = new URL(urlString);
    }
    catch {
        return { allowed: false, error: "Invalid URL format" };
    }
    // Only allow http and https protocols
    if (!["http:", "https:"].includes(url.protocol)) {
        return { allowed: false, error: "Only HTTP and HTTPS protocols are allowed" };
    }
    const hostname = url.hostname.toLowerCase();
    // Check blocked hosts
    if (BLOCKED_HOSTS.has(hostname)) {
        return { allowed: false, error: "Access to localhost is blocked" };
    }
    // Check for private IP ranges (unless explicitly allowed)
    if (!allowPrivateNetworks) {
        // Check IPv4 patterns
        for (const pattern of PRIVATE_IP_PATTERNS) {
            if (pattern.test(hostname)) {
                return { allowed: false, error: "Access to private networks is blocked" };
            }
        }
        // Check for IPv6 loopback
        if (hostname.startsWith("::") || hostname === "[::1]") {
            return { allowed: false, error: "Access to localhost is blocked" };
        }
        // Check for internal hostnames (e.g., internal.example.com)
        const internalPatterns = [
            /^internal\./i,
            /^local\./i,
            /^intranet\./i,
            /^private\./i,
            /^\.$/, // Single dot
            /\.local$/i,
            /\.internal$/i,
            /\.intranet$/i,
        ];
        for (const pattern of internalPatterns) {
            if (pattern.test(hostname)) {
                return { allowed: false, error: "Access to internal hostnames is blocked" };
            }
        }
        // Check for IP addresses that could resolve to localhost
        // 127.0.0.1 - 127.255.255.255
        if (/^127\./.test(hostname)) {
            return { allowed: false, error: "Access to localhost is blocked" };
        }
        // 0.0.0.0 variants
        if (/^0\.0\.0\.0$/.test(hostname) || hostname === "0") {
            return { allowed: false, error: "Access to localhost is blocked" };
        }
    }
    // Check for suspicious ports
    const blockedPorts = [22, 23, 25, 110, 143, 993, 995, 3306, 5432, 6379, 27017];
    const port = url.port ? parseInt(url.port, 10) : (url.protocol === "https:" ? 443 : 80);
    if (blockedPorts.includes(port)) {
        return { allowed: false, error: `Access to port ${port} is blocked` };
    }
    return { allowed: true };
}
export class HTTPFetcher {
    async fetch(url, options = {}) {
        // Security: SSRF protection
        const urlCheck = isUrlAllowed(url, options.allowPrivateNetworks ?? false);
        if (!urlCheck.allowed) {
            throw new Error(`SSRF protection: ${urlCheck.error}`);
        }
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 10_000);
        try {
            const response = await fetch(url, {
                method: "GET",
                headers: options.headers,
                signal: controller.signal,
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return this.readWithLimit(response, options.maxBytes ?? 2 * 1024 * 1024);
        }
        finally {
            clearTimeout(timeout);
        }
    }
    async post(url, body, options = {}) {
        // Security: SSRF protection
        const urlCheck = isUrlAllowed(url, options.allowPrivateNetworks ?? false);
        if (!urlCheck.allowed) {
            throw new Error(`SSRF protection: ${urlCheck.error}`);
        }
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 10_000);
        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    ...(options.headers ?? {}),
                },
                body: JSON.stringify(body),
                signal: controller.signal,
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return this.readWithLimit(response, options.maxBytes ?? 2 * 1024 * 1024);
        }
        finally {
            clearTimeout(timeout);
        }
    }
    async *stream(url, options = {}) {
        // Security: SSRF protection
        const urlCheck = isUrlAllowed(url, options.allowPrivateNetworks ?? false);
        if (!urlCheck.allowed) {
            throw new Error(`SSRF protection: ${urlCheck.error}`);
        }
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 10_000);
        try {
            const response = await fetch(url, { signal: controller.signal });
            if (!response.ok || !response.body) {
                throw new Error(`HTTP ${response.status}`);
            }
            const decoder = new TextDecoder();
            const reader = response.body.getReader();
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                yield decoder.decode(value, { stream: true });
            }
        }
        finally {
            clearTimeout(timeout);
        }
    }
    async readWithLimit(response, maxBytes) {
        if (!response.body) {
            return "";
        }
        const chunks = [];
        let total = 0;
        const reader = response.body.getReader();
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            if (!value)
                continue;
            total += value.byteLength;
            if (total > maxBytes) {
                throw new Error("response exceeds max size");
            }
            chunks.push(value);
        }
        const merged = new Uint8Array(total);
        let offset = 0;
        for (const chunk of chunks) {
            merged.set(chunk, offset);
            offset += chunk.byteLength;
        }
        return new TextDecoder().decode(merged);
    }
}
//# sourceMappingURL=fetcher.js.map