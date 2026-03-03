import { createServer as createHttpServer, Server as HttpServer } from "http";
import type { Server as HttpsServer } from "https";

export interface HttpServerOptions {
  host?: string;
  port?: number;
  cors?: boolean;
  corsOrigins?: string[];
}

export class HttpServerManager {
  private server: HttpServer | HttpsServer | null = null;
  private options: Required<HttpServerOptions>;

  constructor(options: HttpServerOptions = {}) {
    this.options = {
      host: options.host ?? "0.0.0.0",
      port: options.port ?? 3001,
      cors: options.cors ?? true,
      corsOrigins: options.corsOrigins ?? ["*"],
    };
  }

  async start(
    handler: (req: Request) => Promise<Response>,
    onStart?: (address: { host: string; port: number }) => void
  ): Promise<void> {
    if (this.server) {
      throw new Error("Server already running");
    }

    this.server = createHttpServer(async (req, res) => {
      const url = new URL(req.url || "/", `http://${req.headers.host}`);
      const request = new Request(url.toString(), {
        method: req.method,
        headers: req.headers as Record<string, string>,
        body: req.method !== "GET" && req.method !== "HEAD" ? req as unknown as BodyInit : undefined,
      });

      try {
        const response = await handler(request);

        // CORS headers
        if (this.options.cors) {
          const origin = req.headers.origin || "*";
          res.setHeader("Access-Control-Allow-Origin", this.options.corsOrigins.includes("*") ? origin : this.options.corsOrigins[0]);
          res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
          res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
          res.setHeader("Access-Control-Max-Age", "86400");
        }

        res.statusCode = response.status;

        response.headers.forEach((value, key) => {
          res.setHeader(key, value);
        });

        const body = await response.text();
        res.end(body);
      } catch (error) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: "Internal Server Error" }));
      }
    });

    return new Promise((resolve) => {
      this.server!.listen(this.options.port, this.options.host, () => {
        onStart?.({ host: this.options.host, port: this.options.port });
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.server.close((err) => {
        if (err) {
          reject(err);
        } else {
          this.server = null;
          resolve();
        }
      });
    });
  }

  getAddress(): { host: string; port: number } | null {
    const address = this.server?.address();
    if (!address || typeof address === "string") return null;
    return {
      host: address.address,
      port: address.port,
    };
  }

  isRunning(): boolean {
    return this.server !== null;
  }
}

export { HttpServerManager as default };
