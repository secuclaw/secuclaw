import {
  ToolCategory,
  ToolPolicyMode,
  SecurityTool,
  ToolContext,
  ToolResult,
} from "../types.js";
import {
  createSuccessResult,
  createErrorResult,
  readStringParam,
  readNumberParam,
} from "../common.js";

// Security: SSRF protection
const SSRF_BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "[::1]",
  "localtest.me",
  "lvh.me",
  "metadata.google.internal",  // GCP metadata
  "169.254.169.254",             // Cloud metadata
]);

// Security: SSRF protection - private IP patterns
const SSRF_PRIVATE_PATTERNS = [
  /^10\./,                                           // 10.0.0.0/8
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,                  // 172.16.0.0/12
  /^192\.168\./,                                     // 192.168.0.0/16
  /^169\.254\./,                                     // 169.254.0.0/16 (link-local)
  /^0\.0\.0\./,                                      // 0.0.0.0/8
  /^127\./,                                          // 127.0.0.0/8 (loopback)
  /^22[4-9]\./,                                       // 224.0.0.0/4 (multicast)
  /^23[0-9]\./,                                       // 239.0.0.0/8 (multicast)
  /^255\./,                                           // 255.0.0.0/8 (broadcast)
];

// Security: SSRF protection - blocked ports
const SSRF_BLOCKED_PORTS = [22, 23, 25, 110, 143, 993, 995, 3306, 5432, 6379, 27017, 9200, 9300, 11211];

// Security: SSRF protection - internal hostname patterns
const SSRF_INTERNAL_PATTERNS = [
  /^internal\./i,
  /^local\./i,
  /^intranet\./i,
  /^private\./i,
  /\.local$/i,
  /\.internal$/i,
  /\.intranet$/i,
];

function isSsrfBlocked(url: string): { blocked: boolean; reason?: string } {
  try {
    const parsed = new URL(url);
    
    // Only allow http and https
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { blocked: true, reason: "Only HTTP and HTTPS protocols are allowed" };
    }
    
    const host = parsed.hostname.toLowerCase();
    const port = parsed.port ? parseInt(parsed.port, 10) : 
      parsed.protocol === "https:" ? 443 : 80;

    // Check blocked hosts
    if (SSRF_BLOCKED_HOSTS.has(host)) {
      return { blocked: true, reason: `Access to this host is blocked` };
    }
    
    // Check private IP patterns
    for (const pattern of SSRF_PRIVATE_PATTERNS) {
      if (pattern.test(host)) {
        return { blocked: true, reason: `Access to private networks is blocked` };
      }
    }
    
    // Check internal hostname patterns
    for (const pattern of SSRF_INTERNAL_PATTERNS) {
      if (pattern.test(host)) {
        return { blocked: true, reason: `Access to internal hostnames is blocked` };
      }
    }

    // Check blocked ports
    if (SSRF_BLOCKED_PORTS.includes(port)) {
      return { blocked: true, reason: `Access to port ${port} is blocked` };
    }

    return { blocked: false };
  } catch {
    return { blocked: true, reason: "Invalid URL" };
  }
}

const webFetchExecutor = async (
  params: Record<string, unknown>,
  _context: ToolContext
): Promise<ToolResult> => {
  const url = readStringParam(params, "url", { required: true });
  if (!url) {
    return createErrorResult("URL is required", 400);
  }

  const ssrfCheck = isSsrfBlocked(url);
  if (ssrfCheck.blocked) {
    return createErrorResult(`SSRF protection: ${ssrfCheck.reason}`, 403);
  }

  const method = readStringParam(params, "method") ?? "GET";
  const headers = params.headers as Record<string, string> | undefined;
  const body = readStringParam(params, "body");
  const timeout = readNumberParam(params, "timeout") ?? 30000;
  const followRedirects = params.followRedirects !== false;
  const maxRedirects = readNumberParam(params, "maxRedirects") ?? 5;

  const startTime = Date.now();
  let redirectCount = 0;
  let currentUrl = url;

  try {
    while (redirectCount <= maxRedirects) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(currentUrl, {
        method,
        headers: {
          "User-Agent": "EnterpriseSecurityCommander/1.0",
          ...headers,
        },
        body: body || undefined,
        signal: controller.signal,
        redirect: followRedirects ? "follow" : "manual",
      });

      clearTimeout(timeoutId);

      if (response.status >= 300 && response.status < 400 && followRedirects) {
        const location = response.headers.get("location");
        if (location) {
          const redirectCheck = isSsrfBlocked(location);
          if (redirectCheck.blocked) {
            return createErrorResult(`SSRF protection on redirect: ${redirectCheck.reason}`, 403);
          }
          currentUrl = location;
          redirectCount++;
          continue;
        }
      }

      const responseBody = await response.text();
      const latency = Date.now() - startTime;

      return createSuccessResult({
        url: currentUrl,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseBody.length > 100000 
          ? responseBody.substring(0, 100000) + "\n...[truncated]" 
          : responseBody,
        latency,
        size: responseBody.length,
      }, {
        redirected: redirectCount > 0,
        originalUrl: url,
      });
    }

    return createErrorResult(`Too many redirects (max: ${maxRedirects})`, 400);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return createErrorResult(`Request timeout after ${timeout}ms`, 408);
    }
    return createErrorResult(error instanceof Error ? error.message : "Unknown error", 500);
  }
};

export const webFetch: SecurityTool = {
  id: "utility-web-fetch",
  name: "webFetch",
  description: "Fetch content from web URLs with SSRF protection, timeout handling, and redirect following",
  category: ToolCategory.UTILITY,
  schema: {
    name: "webFetch",
    description: "Fetch web content securely",
    parameters: {
      type: "object",
      properties: {
        url: {
          name: "url",
          description: "URL to fetch",
          type: "string",
          required: true,
        },
        method: {
          name: "method",
          description: "HTTP method",
          type: "string",
          required: false,
          enum: ["GET", "POST", "PUT", "DELETE"],
          default: "GET",
        },
        headers: {
          name: "headers",
          description: "HTTP headers to include",
          type: "object",
          required: false,
        },
        body: {
          name: "body",
          description: "Request body for POST/PUT",
          type: "string",
          required: false,
        },
        timeout: {
          name: "timeout",
          description: "Request timeout in milliseconds",
          type: "number",
          required: false,
          default: 30000,
        },
        followRedirects: {
          name: "followRedirects",
          description: "Whether to follow redirects",
          type: "boolean",
          required: false,
          default: true,
        },
        maxRedirects: {
          name: "maxRedirects",
          description: "Maximum number of redirects to follow",
          type: "number",
          required: false,
          default: 5,
        },
      },
    },
  },
  executor: webFetchExecutor,
  policy: { mode: ToolPolicyMode.ALLOW },
  tags: ["http", "fetch", "network", "security"],
};

const webSearchExecutor = async (
  params: Record<string, unknown>,
  _context: ToolContext
): Promise<ToolResult> => {
  const query = readStringParam(params, "query", { required: true });
  if (!query) {
    return createErrorResult("Query is required", 400);
  }

  const engine = readStringParam(params, "engine") ?? "duckduckgo";
  const limit = readNumberParam(params, "limit") ?? 10;

  try {
    if (engine === "brave" && process.env.BRAVE_API_KEY) {
      const response = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${limit}`,
        {
          headers: {
            "Accept": "application/json",
            "X-Subscription-Token": process.env.BRAVE_API_KEY,
          },
        }
      );

      if (!response.ok) {
        return createErrorResult(`Brave API error: ${response.status}`, response.status);
      }

      const data = await response.json() as { 
        web?: { 
          results?: Array<{ title: string; url: string; description: string }> 
        } 
      };

      return createSuccessResult({
        query,
        results: (data.web?.results ?? []).slice(0, limit).map(r => ({
          title: r.title,
          url: r.url,
          snippet: r.description,
        })),
        engine: "brave",
      });
    }

    const response = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`
    );

    if (!response.ok) {
      return createErrorResult(`DuckDuckGo API error: ${response.status}`, response.status);
    }

    const data = await response.json() as { 
      AbstractText?: string; 
      AbstractURL?: string; 
      RelatedTopics?: Array<{ Text?: string; FirstURL?: string }> 
    };

    return createSuccessResult({
      query,
      results: [
        ...(data.AbstractText 
          ? [{ title: "Summary", url: data.AbstractURL ?? "", snippet: data.AbstractText }] 
          : []),
        ...(data.RelatedTopics ?? []).slice(0, limit - 1).map(t => ({
          title: t.Text?.split(" - ")[0] ?? "",
          url: t.FirstURL ?? "",
          snippet: t.Text ?? "",
        })),
      ].slice(0, limit),
      engine: "duckduckgo",
    });
  } catch (error) {
    return createErrorResult(error instanceof Error ? error.message : "Search failed", 500);
  }
};

export const webSearch: SecurityTool = {
  id: "utility-web-search",
  name: "webSearch",
  description: "Search the web using Brave or DuckDuckGo search engines",
  category: ToolCategory.UTILITY,
  schema: {
    name: "webSearch",
    description: "Search the web",
    parameters: {
      type: "object",
      properties: {
        query: {
          name: "query",
          description: "Search query",
          type: "string",
          required: true,
        },
        engine: {
          name: "engine",
          description: "Search engine to use",
          type: "string",
          required: false,
          enum: ["brave", "duckduckgo"],
          default: "duckduckgo",
        },
        limit: {
          name: "limit",
          description: "Maximum number of results",
          type: "number",
          required: false,
          default: 10,
        },
      },
    },
  },
  executor: webSearchExecutor,
  policy: { mode: ToolPolicyMode.ALLOW },
  tags: ["search", "web", "information"],
};

export const utilityTools: SecurityTool[] = [webFetch, webSearch];
