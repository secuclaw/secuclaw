/**
 * SecuClaw Control UI Assets Handler
 * 
 * Serves the built Control UI static files from dist/control-ui/
 * Based on OpenClaw's control-ui-assets pattern.
 */

import { existsSync } from "fs";
import { readFile, stat } from "fs/promises";
import { join, extname } from "path";

// MIME types for static files
const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
  ".webp": "image/webp",
};

// Paths to look for Control UI assets
const CONTROL_UI_PATHS = [
  // Built output
  join(process.cwd(), "dist", "control-ui"),
  // Development path
  join(process.cwd(), "ui", "dist"),
];

let controlUiRoot: string | null = null;

/**
 * Resolve the Control UI root directory
 */
export function resolveControlUiRoot(): string | null {
  if (controlUiRoot) {
    return controlUiRoot;
  }

  for (const path of CONTROL_UI_PATHS) {
    if (existsSync(path)) {
      const indexPath = join(path, "index.html");
      if (existsSync(indexPath)) {
        controlUiRoot = path;
        return controlUiRoot;
      }
    }
  }

  return null;
}

/**
 * Check if Control UI assets are built and available
 */
export function isControlUiAvailable(): boolean {
  return resolveControlUiRoot() !== null;
}

/**
 * Get the content type for a file path
 */
function getContentType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
}

/**
 * Handle Control UI HTTP requests
 * Returns null if the request should be passed to other handlers
 */
export async function handleControlUiRequest(
  request: Request
): Promise<Response | null> {
  const url = new URL(request.url);
  let pathname = url.pathname;

  // Only handle GET requests
  if (request.method !== "GET" && request.method !== "HEAD") {
    return null;
  }

  const root = resolveControlUiRoot();
  if (!root) {
    return null;
  }

  // Normalize path - remove leading slash
  if (pathname.startsWith("/")) {
    pathname = pathname.slice(1);
  }

  // Default to index.html for root path
  if (!pathname || pathname === "/") {
    pathname = "index.html";
  }

  // Security: prevent directory traversal
  if (pathname.includes("..")) {
    return new Response("Not Found", { status: 404 });
  }

  // Resolve file path
  const filePath = join(root, pathname);

  // Check if file exists
  try {
    const stats = await stat(filePath);
    if (!stats.isFile()) {
      // If it's a directory, serve index.html (SPA fallback)
      const indexPath = join(filePath, "index.html");
      if (existsSync(indexPath)) {
        return serveFile(indexPath, request);
      }
      return null;
    }
    return serveFile(filePath, request);
  } catch {
    // File not found - serve index.html for SPA routing
    const indexPath = join(root, "index.html");
    if (existsSync(indexPath)) {
      return serveFile(indexPath, request);
    }
    return null;
  }
}

/**
 * Serve a static file
 */
async function serveFile(
  filePath: string,
  request: Request
): Promise<Response> {
  const contentType = getContentType(filePath);

  // Handle HEAD requests
  if (request.method === "HEAD") {
    return new Response(null, {
      status: 200,
      headers: {
        "Content-Type": contentType,
      },
    });
  }

  try {
    const content = await readFile(filePath);

    return new Response(content, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error(`Failed to serve ${filePath}:`, error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

/**
 * Control UI route configuration
 */
export interface ControlUiConfig {
  enabled?: boolean;
  basePath?: string;
}

/**
 * Create Control UI route handler
 */
export function createControlUiHandler(config: ControlUiConfig = {}) {
  const { enabled = true, basePath = "/" } = config;

  if (!enabled) {
    return null;
  }

  return async (request: Request): Promise<Response | null> => {
    const url = new URL(request.url);

    // Check if request is for Control UI
    if (basePath !== "/" && !url.pathname.startsWith(basePath)) {
      return null;
    }

    // Handle Control UI request
    return handleControlUiRequest(request);
  };
}

export default {
  resolveControlUiRoot,
  isControlUiAvailable,
  handleControlUiRequest,
  createControlUiHandler,
};
