import { URL } from "node:url";
import net from "node:net";
const DISALLOWED_HOSTS = new Set([
    "localhost",
    "169.254.169.254",
    "metadata.google.internal",
]);
function isPrivateIPv4(host) {
    if (!net.isIP(host)) {
        return false;
    }
    if (host.startsWith("10."))
        return true;
    if (host.startsWith("127."))
        return true;
    if (host.startsWith("192.168."))
        return true;
    if (host.startsWith("169.254."))
        return true;
    const parts = host.split(".");
    const first = Number(parts[0]);
    const second = Number(parts[1]);
    if (first === 172 && second >= 16 && second <= 31)
        return true;
    return false;
}
export class WebGuard {
    allowedDomains;
    constructor(allowedDomains = []) {
        this.allowedDomains = allowedDomains;
    }
    validate(raw) {
        const url = new URL(raw);
        if (!["http:", "https:"].includes(url.protocol)) {
            throw new Error(`unsupported protocol: ${url.protocol}`);
        }
        return url;
    }
    checkSSRF(raw) {
        const url = this.validate(raw);
        const host = url.hostname.toLowerCase();
        if (DISALLOWED_HOSTS.has(host)) {
            return false;
        }
        if (isPrivateIPv4(host)) {
            return false;
        }
        return true;
    }
    filter(raw) {
        const url = this.validate(raw);
        if (!this.checkSSRF(raw)) {
            return false;
        }
        if (this.allowedDomains.length === 0) {
            return true;
        }
        return this.allowedDomains.some((domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`));
    }
}
//# sourceMappingURL=guard.js.map