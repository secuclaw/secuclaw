/**
 * SecuHub Marketplace REST API Routes
 * Provides HTTP endpoints for skill marketplace operations
 */

import type { SkillMarketService, MarketSkill, MarketSearchOptions, MarketSearchResult, SkillPublishOptions } from "../skills/market-service.js";

export interface MarketApiRouteContext {
  marketService: SkillMarketService;
  userId?: string;
}

interface RouteHandler {
  (request: Request, ctx: MarketApiRouteContext): Promise<Response>;
}

interface RouteDefinition {
  pattern: RegExp;
  method: string;
  handler: RouteHandler;
  paramNames?: string[];
}

const CATEGORY_COLORS: Record<string, string> = {
  "threat-intel": "#ef4444",
  "security": "#3b82f6",
  "compliance": "#10b981",
  "red-team": "#f97316",
  "blue-team": "#6366f1",
  "forensics": "#8b5cf6",
  "automation": "#14b8a6",
  "analysis": "#f59e0b",
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

function paramToNumber(value: string | null, defaultValue: number): number {
  if (!value) return defaultValue;
  const num = parseInt(value, 10);
  return isNaN(num) ? defaultValue : num;
}

function addVisualizationsToSkill(skill: MarketSkill): MarketSkill & { visualizations: Array<{ type: string; name: string }> } {
  const visualizationTypes = ["chart", "graph", "map", "table", "timeline", "heatmap", "treemap", "gauge", "flowchart", "dashboard"];
  const vizCount = Math.floor(Math.random() * 3) + 1;
  
  const visualizations = [];
  for (let i = 0; i < vizCount; i++) {
    visualizations.push({
      type: visualizationTypes[Math.floor(Math.random() * visualizationTypes.length)],
      name: `Visualization ${i + 1}`,
    });
  }
  
  return { ...skill, visualizations };
}

const routes: RouteDefinition[] = [
  // GET /api/market/skills - List all skills with search/filter
  {
    pattern: /^\/api\/market\/skills$/,
    method: "GET",
    handler: async (request: Request, ctx: MarketApiRouteContext) => {
      const url = new URL(request.url);
      const options: MarketSearchOptions = {
        query: url.searchParams.get("q") || url.searchParams.get("query") || undefined,
        category: url.searchParams.get("category") || undefined,
        tags: url.searchParams.getAll("tags"),
        author: url.searchParams.get("author") || undefined,
        sortBy: (url.searchParams.get("sort") as MarketSearchOptions["sortBy"]) || "downloads",
        sortOrder: (url.searchParams.get("order") as MarketSearchOptions["sortOrder"]) || "desc",
        limit: paramToNumber(url.searchParams.get("limit"), 20),
        offset: paramToNumber(url.searchParams.get("offset"), 0),
      };

      const result = await ctx.marketService.search(options);
      
      const skillsWithViz = result.skills.map(addVisualizationsToSkill);
      
      return jsonResponse({
        ...result,
        skills: skillsWithViz,
      });
    },
  },

  // GET /api/market/skills/:id - Get skill by ID
  {
    pattern: /^\/api\/market\/skills\/([^/]+)$/,
    method: "GET",
    paramNames: ["id"],
    handler: async (request: Request, ctx: MarketApiRouteContext) => {
      const url = new URL(request.url);
      const match = url.pathname.match(/^\/api\/market\/skills\/([^/]+)$/);
      if (!match) return errorResponse("Invalid URL", 400);
      
      const skillId = match[1];
      const skill = await ctx.marketService.getSkill(skillId);
      
      if (!skill) {
        return errorResponse("Skill not found", 404);
      }
      
      return jsonResponse(addVisualizationsToSkill(skill));
    },
  },

  // POST /api/market/skills/:id/install - Install a skill
  {
    pattern: /^\/api\/market\/skills\/([^/]+)\/install$/,
    method: "POST",
    paramNames: ["id"],
    handler: async (request: Request, ctx: MarketApiRouteContext) => {
      const url = new URL(request.url);
      const match = url.pathname.match(/^\/api\/market\/skills\/([^/]+)\/install$/);
      if (!match) return errorResponse("Invalid URL", 400);
      
      const skillId = match[1];
      
      try {
        const result = await ctx.marketService.install(skillId);
        return jsonResponse(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Installation failed";
        return errorResponse(message, 500);
      }
    },
  },

  // POST /api/market/skills/:id/uninstall - Uninstall a skill
  {
    pattern: /^\/api\/market\/skills\/([^/]+)\/uninstall$/,
    method: "POST",
    paramNames: ["id"],
    handler: async (request: Request, ctx: MarketApiRouteContext) => {
      const url = new URL(request.url);
      const match = url.pathname.match(/^\/api\/market\/skills\/([^/]+)\/uninstall$/);
      if (!match) return errorResponse("Invalid URL", 400);
      
      const skillId = match[1];
      
      try {
        const result = await ctx.marketService.uninstall(skillId);
        return jsonResponse(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Uninstallation failed";
        return errorResponse(message, 500);
      }
    },
  },

  // POST /api/market/skills/:id/update - Update a skill
  {
    pattern: /^\/api\/market\/skills\/([^/]+)\/update$/,
    method: "POST",
    paramNames: ["id"],
    handler: async (request: Request, ctx: MarketApiRouteContext) => {
      const url = new URL(request.url);
      const match = url.pathname.match(/^\/api\/market\/skills\/([^/]+)\/update$/);
      if (!match) return errorResponse("Invalid URL", 400);
      
      const skillId = match[1];
      
      try {
        const result = await ctx.marketService.update(skillId);
        return jsonResponse(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Update failed";
        return errorResponse(message, 500);
      }
    },
  },

  // GET /api/market/categories - List all categories
  {
    pattern: /^\/api\/market\/categories$/,
    method: "GET",
    handler: async (_request: Request, _ctx: MarketApiRouteContext) => {
      const categories = [
        { id: "threat-intel", name: "Threat Intelligence", nameZh: "威胁情报", color: CATEGORY_COLORS["threat-intel"], count: 0 },
        { id: "security", name: "Security", nameZh: "安全工具", color: CATEGORY_COLORS["security"], count: 0 },
        { id: "compliance", name: "Compliance", nameZh: "合规审计", color: CATEGORY_COLORS["compliance"], count: 0 },
        { id: "red-team", name: "Red Team", nameZh: "红队攻防", color: CATEGORY_COLORS["red-team"], count: 0 },
        { id: "blue-team", name: "Blue Team", nameZh: "蓝队防御", color: CATEGORY_COLORS["blue-team"], count: 0 },
        { id: "forensics", name: "Forensics", nameZh: "取证分析", color: CATEGORY_COLORS["forensics"], count: 0 },
        { id: "automation", name: "Automation", nameZh: "自动化", color: CATEGORY_COLORS["automation"], count: 0 },
        { id: "analysis", name: "Analysis", nameZh: "分析工具", color: CATEGORY_COLORS["analysis"], count: 0 },
      ];
      
      return jsonResponse(categories);
    },
  },

  // GET /api/market/featured - Get featured skills
  {
    pattern: /^\/api\/market\/featured$/,
    method: "GET",
    handler: async (_request: Request, ctx: MarketApiRouteContext) => {
      const result = await ctx.marketService.search({ sortBy: "rating", limit: 6 });
      return jsonResponse(result.skills.map(addVisualizationsToSkill));
    },
  },

  // GET /api/market/stats - Get marketplace statistics
  {
    pattern: /^\/api\/market\/stats$/,
    method: "GET",
    handler: async (_request: Request, ctx: MarketApiRouteContext) => {
      const allSkills = await ctx.marketService.search({ limit: 1000 });
      const totalDownloads = allSkills.skills.reduce((sum, s) => sum + s.downloads, 0);
      
      return jsonResponse({
        totalSkills: allSkills.total,
        totalDownloads,
        categories: 8,
        lastUpdated: new Date().toISOString(),
      });
    },
  },

  // GET /api/market/installed - Get installed skills
  {
    pattern: /^\/api\/market\/installed$/,
    method: "GET",
    handler: async (_request: Request, ctx: MarketApiRouteContext) => {
      const result = await ctx.marketService.listInstalledSkills();
      return jsonResponse(result.map(addVisualizationsToSkill));
    },
  },

  // POST /api/market/publish - Publish a new skill
  {
    pattern: /^\/api\/market\/publish$/,
    method: "POST",
    handler: async (request: Request, ctx: MarketApiRouteContext) => {
      try {
        const body = await request.json() as SkillPublishOptions;
        
        if (!body.name || !body.description || !body.version || !body.author) {
          return errorResponse("Missing required fields: name, description, version, author", 400);
        }
        
        const result = await ctx.marketService.publish(body);
        return jsonResponse(result, 201);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Publish failed";
        return errorResponse(message, 500);
      }
    },
  },

  // GET /api/market/skills/:id/reviews - Get skill reviews
  {
    pattern: /^\/api\/market\/skills\/([^/]+)\/reviews$/,
    method: "GET",
    paramNames: ["id"],
    handler: async (request: Request, ctx: MarketApiRouteContext) => {
      const url = new URL(request.url);
      const match = url.pathname.match(/^\/api\/market\/skills\/([^/]+)\/reviews$/);
      if (!match) return errorResponse("Invalid URL", 400);
      
      const skillId = match[1];
      const reviews = await ctx.marketService.getReviews(skillId);
      
      return jsonResponse(reviews);
    },
  },

  // POST /api/market/skills/:id/reviews - Add a review
  {
    pattern: /^\/api\/market\/skills\/([^/]+)\/reviews$/,
    method: "POST",
    paramNames: ["id"],
    handler: async (request: Request, ctx: MarketApiRouteContext) => {
      const url = new URL(request.url);
      const match = url.pathname.match(/^\/api\/market\/skills\/([^/]+)\/reviews$/);
      if (!match) return errorResponse("Invalid URL", 400);
      
      const skillId = match[1];
      
      try {
        const body = await request.json() as { rating: number; comment: string };
        
        if (!body.rating || body.rating < 1 || body.rating > 5) {
          return errorResponse("Rating must be between 1 and 5", 400);
        }
        
        const result = await ctx.marketService.addReview(skillId, {
          userId: ctx.userId || "anonymous",
          userName: "User",
          rating: body.rating,
          comment: body.comment || "",
        });
        
        return jsonResponse(result, result.success ? 201 : 400);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to add review";
        return errorResponse(message, 500);
      }
    },
  },
];

export function createMarketApiHandler(ctx: MarketApiRouteContext): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;

    // Handle OPTIONS for CORS preflight
    if (method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // Find matching route
    for (const route of routes) {
      if (route.pattern.test(pathname) && route.method === method) {
        return route.handler(request, ctx);
      }
    }

    // No route found
    return errorResponse("Not Found", 404);
  };
}

export { CATEGORY_COLORS };
