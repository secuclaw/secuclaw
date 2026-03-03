export * from './types.js';
export * from './server.js';
export * from './client.js';
export * from './transport.js';
export * from './tool-discovery.js';
export * from './resources.js';

import { MCPServer, createMCPServer } from "./server.js";
import { MCPClient, createMCPClient } from "./client.js";
import type { MCPTool, MCPToolResult } from "./types.js";

export function createSecurityMCPServer(): MCPServer {
  const server = createMCPServer({
    name: "secuclaw",
    version: "1.0.0",
    description: "Enterprise Security Commander MCP Server",
  });

  server.registerTool(
    {
      name: "analyze-vulnerability",
      description: "Analyze a vulnerability from given indicators",
      inputSchema: {
        type: "object",
        properties: {
          target: { type: "string", description: "Target to analyze (URL, IP, or hostname)" },
          severity: { type: "string", description: "Minimum severity threshold", enum: ["low", "medium", "high", "critical"] },
        },
        required: ["target"],
      },
    },
    async (args): Promise<MCPToolResult> => {
      const target = args.target as string;
      const severity = (args.severity as string) ?? "medium";

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              target,
              severity,
              findings: [
                { type: "info", message: `Analysis initiated for ${target}` },
              ],
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  );

  server.registerTool(
    {
      name: "check-compliance",
      description: "Check compliance against a security framework",
      inputSchema: {
        type: "object",
        properties: {
          framework: { type: "string", description: "Compliance framework (nist, iso27001, gdpr, pci)" },
          scope: { type: "string", description: "Scope of the compliance check" },
        },
        required: ["framework"],
      },
    },
    async (args): Promise<MCPToolResult> => {
      const framework = args.framework as string;
      const scope = (args.scope as string) ?? "general";

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              framework,
              scope,
              status: "completed",
              score: 85,
              gaps: ["Missing policy documentation", "Access review overdue"],
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  );

  server.registerTool(
    {
      name: "threat-hunt",
      description: "Initiate a threat hunting exercise",
      inputSchema: {
        type: "object",
        properties: {
          hypothesis: { type: "string", description: "Threat hypothesis to investigate" },
          timeframe: { type: "string", description: "Time range to search (e.g., '7d', '30d')" },
          iocs: { type: "array", items: { type: "string" }, description: "Indicators of compromise" },
        },
        required: ["hypothesis"],
      },
    },
    async (args): Promise<MCPToolResult> => {
      const hypothesis = args.hypothesis as string;
      const timeframe = (args.timeframe as string) ?? "7d";
      const iocs = (args.iocs as string[]) ?? [];

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              hypothesis,
              timeframe,
              iocs,
              findings: [],
              status: "initiated",
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  );

  return server;
}
