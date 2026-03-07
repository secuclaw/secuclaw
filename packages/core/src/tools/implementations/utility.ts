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

const SSRF_BLOCKED_HOSTS = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "10.",
  "172.16.",
  "172.17.",
  "172.18.",
  "172.19.",
  "172.20.",
  "172.21.",
  "172.22.",
  "172.23.",
  "172.24.",
  "172.25.",
  "172.26.",
  "172.27.",
  "172.28.",
  "172.29.",
  "172.30.",
  "172.31.",
  "192.168.",
  "169.254.",
  "::1",
  "fc00:",
  "fe80:",
];

const SSRF_BLOCKED_PORTS = [22, 23, 25, 110, 143, 993, 995, 3306, 5432, 6379, 27017];

function isSsrfBlocked(url: string): { blocked: boolean; reason?: string } {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const port = parsed.port ? parseInt(parsed.port, 10) : 
      parsed.protocol === "https:" ? 443 : 80;

    for (const blocked of SSRF_BLOCKED_HOSTS) {
      if (host === blocked || host.startsWith(blocked)) {
        return { blocked: true, reason: `Blocked host pattern: ${blocked}` };
      }
    }

    if (SSRF_BLOCKED_PORTS.includes(port)) {
      return { blocked: true, reason: `Blocked port: ${port}` };
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
