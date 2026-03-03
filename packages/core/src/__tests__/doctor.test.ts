/**
 * Doctor Diagnostic Tests
 */

import { describe, it, expect } from "vitest";
import {
  checkNodeVersion,
  checkMemory,
  checkDiskSpace,
  checkConfig,
  checkApiKeys,
  checkConnectivity,
  checkSecurity,
  checkDependencies,
  runDiagnostics,
  generateReport,
  generateJsonReport,
  getSystemInfo,
  maskApiKey,
} from "../diagnostic/doctor";
import * as os from "os";

describe("Doctor Diagnostic Tests", () => {
  describe("getSystemInfo", () => {
    it("should return system information", async () => {
      const info = await getSystemInfo();
      
      expect(info).toHaveProperty("platform");
      expect(info).toHaveProperty("arch");
      expect(info).toHaveProperty("nodeVersion");
      expect(info).toHaveProperty("cpuCount");
      expect(info).toHaveProperty("totalMemory");
      expect(info).toHaveProperty("freeMemory");
      expect(info).toHaveProperty("homeDir");
      expect(info).toHaveProperty("tempDir");
      
      expect(info.platform).toBe(os.platform());
      expect(info.arch).toBe(os.arch());
      expect(info.nodeVersion).toBe(process.version);
    });
  });

  describe("maskApiKey", () => {
    it("should return (not set) for undefined", () => {
      expect(maskApiKey(undefined)).toBe("(not set)");
    });

    it("should return (not set) for empty string", () => {
      expect(maskApiKey("")).toBe("(not set)");
    });

    it("should mask short keys", () => {
      expect(maskApiKey("abc")).toBe("****");
    });

    it("should mask long keys properly", () => {
      const key = "sk-1234567890abcdef";
      const masked = maskApiKey(key);
      // Should mask the key, not reveal it
      expect(masked).not.toBe(key);
      expect(masked.includes("****")).toBe(true);
    });
  });

  describe("checkNodeVersion", () => {
    it("should pass for Node.js v18+", async () => {
      const result = await checkNodeVersion();
      
      expect(result.check).toBe("node-version");
      expect(["ok", "warning"]).toContain(result.status);
      expect(result.message).toContain(process.version);
    });
  });

  describe("checkMemory", () => {
    it("should return memory status", async () => {
      const result = await checkMemory();
      
      expect(result.check).toBe("memory");
      expect(result.details).toHaveProperty("totalGB");
      expect(result.details).toHaveProperty("freeGB");
      expect(result.details).toHaveProperty("usedPercent");
      expect(result.fixable).toBe(false);
    });
  });

  describe("checkDiskSpace", () => {
    it("should return disk space status", async () => {
      const result = await checkDiskSpace();
      
      expect(result.check).toBe("disk-space");
      expect(result.status).toMatch(/^(ok|warning)$/);
    });
  });

  describe("checkConfig", () => {
    it("should check configuration status", async () => {
      const result = await checkConfig();
      
      expect(result.check).toBe("config");
      expect(["ok", "warning"]).toContain(result.status);
    });
  });

  describe("checkApiKeys", () => {
    it("should check for configured providers", async () => {
      const result = await checkApiKeys();
      
      expect(result.check).toBe("api-keys");
      expect(result.status).toMatch(/^(ok|warning)$/);
      expect(result.details).toHaveProperty("configuredProviders");
      expect(result.details).toHaveProperty("availableProviders");
    });
  });

  describe("checkConnectivity", () => {
    it("should handle no providers configured", async () => {
      const result = await checkConnectivity();
      
      expect(result.check).toBe("connectivity");
      expect(result.status).toBe("ok");
    });
  });

  describe("checkSecurity", () => {
    it("should check security settings", async () => {
      const result = await checkSecurity();
      
      expect(result.check).toBe("security");
      expect(result.status).toMatch(/^(ok|warning)$/);
    });
  });

  describe("checkDependencies", () => {
    it("should check dependencies", async () => {
      const result = await checkDependencies();
      
      expect(result.check).toBe("dependencies");
      expect(result.status).toMatch(/^(ok|warning)$/);
    });
  });

  describe("runDiagnostics", () => {
    it("should run all checks by default", async () => {
      const results = await runDiagnostics();
      
      expect(results.length).toBeGreaterThan(0);
      
      const checkNames = results.map(r => r.check);
      expect(checkNames).toContain("node-version");
      expect(checkNames).toContain("memory");
      expect(checkNames).toContain("config");
    });

    it("should run only specified checks", async () => {
      const results = await runDiagnostics({ checks: ["node-version", "memory"] });
      
      expect(results.length).toBe(2);
      expect(results[0].check).toBe("node-version");
      expect(results[1].check).toBe("memory");
    });

    it("should return error for unknown checks", async () => {
      const results = await runDiagnostics({ checks: ["unknown-check"] });
      
      expect(results.length).toBe(1);
      expect(results[0].status).toBe("error");
      expect(results[0].message).toContain("Unknown check");
    });
  });

  describe("generateReport", () => {
    it("should generate human-readable report", () => {
      const results = [
        {
          check: "test-check",
          status: "ok" as const,
          message: "Test passed",
          fixable: false,
        },
        {
          check: "test-warning",
          status: "warning" as const,
          message: "Test warning",
          fixable: false,
        },
        {
          check: "test-error",
          status: "error" as const,
          message: "Test error",
          fixable: false,
        },
      ];
      
      const report = generateReport(results);
      
      expect(report).toContain("✅");
      expect(report).toContain("⚠️");
      expect(report).toContain("❌");
      expect(report).toContain("Summary");
      expect(report).toContain("1 passed");
    });
  });

  describe("generateJsonReport", () => {
    it("should generate valid JSON report", () => {
      const results = [
        {
          check: "test-check",
          status: "ok" as const,
          message: "Test passed",
          fixable: false,
        },
      ];
      
      const report = generateJsonReport(results);
      const parsed = JSON.parse(report);
      
      expect(parsed).toHaveProperty("timestamp");
      expect(parsed).toHaveProperty("results");
      expect(parsed).toHaveProperty("summary");
      expect(parsed.summary.total).toBe(1);
      expect(parsed.summary.ok).toBe(1);
    });
  });
});
