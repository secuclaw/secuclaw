import * as fs from "node:fs";
import * as path from "node:path";
import * as childProcess from "node:child_process";
import * as https from "node:https";
import type { Skill, SkillMetadata } from "./types.js";

export interface MarketSkill {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  downloads: number;
  rating: number;
  tags: string[];
  homepage?: string;
  repository?: string;
  installed?: boolean;
}

export interface MarketSearchResult {
  total: number;
  skills: MarketSkill[];
  query: string;
}

export interface SkillInstallProgress {
  stage: "downloading" | "extracting" | "installing" | "complete";
  progress: number;
  message: string;
}

export class SkillMarket {
  private dataDir: string;
  private cacheFile: string;
  private registryUrl: string;
  private cache: Map<string, MarketSkill> = new Map();
  private cacheExpiry: number = 3600000; // 1 hour

  constructor(dataDir: string) {
    this.dataDir = dataDir;
    this.cacheFile = path.join(dataDir, "skill-market-cache.json");
    this.registryUrl = process.env.ESC_SKILL_REGISTRY || "https://skills.esc.dev/api";
    this.loadCache();
  }

  private loadCache(): void {
    if (fs.existsSync(this.cacheFile)) {
      try {
        const content = fs.readFileSync(this.cacheFile, "utf-8");
        const data = JSON.parse(content);
        if (data.expires > Date.now()) {
          for (const skill of data.skills) {
            this.cache.set(skill.id, skill);
          }
        }
      } catch {
        // Ignore cache errors
      }
    }
  }

  private saveCache(): void {
    const data = {
      expires: Date.now() + this.cacheExpiry,
      skills: Array.from(this.cache.values()),
    };
    fs.writeFileSync(this.cacheFile, JSON.stringify(data, null, 2));
  }

  async search(query: string): Promise<MarketSkill[]> {
    try {
      const results = await this.fetchFromRegistry("/search", { q: query });
      const skills = (results.skills as MarketSkill[] | undefined) || [];
      
      for (const skill of skills) {
        this.cache.set(skill.id, skill);
      }
      this.saveCache();
      
      return skills;
    } catch {
      const cached = Array.from(this.cache.values());
      const queryLower = query.toLowerCase();
      
      return cached.filter((s) =>
        s.name.toLowerCase().includes(queryLower) ||
        s.description.toLowerCase().includes(queryLower) ||
        s.tags.some((t) => t.toLowerCase().includes(queryLower))
      );
    }
  }

  async getSkill(skillId: string): Promise<MarketSkill | null> {
    const cached = this.cache.get(skillId);
    if (cached) {
      return cached;
    }

    try {
      const result = await this.fetchFromRegistry(`/skills/${skillId}`, {});
      return (result.skill as MarketSkill | undefined) || null;
    } catch {
      return null;
    }
  }

  async install(skillId: string, targetDir: string): Promise<void> {
    const skill = await this.getSkill(skillId);
    if (!skill) {
      throw new Error(`Skill not found: ${skillId}`);
    }

    const skillDir = path.join(targetDir, skill.name);

    // Check if already installed
    if (fs.existsSync(skillDir)) {
      throw new Error(`Skill already installed: ${skill.name}`);
    }

    // Create skill directory
    fs.mkdirSync(skillDir, { recursive: true });

    // Try different installation methods
    if (skill.repository) {
      await this.installFromGit(skill.repository, skillDir);
    } else {
      await this.installFromRegistry(skillId, skillDir);
    }

    // Create default SKILL.md if not present
    const skillFile = path.join(skillDir, "SKILL.md");
    if (!fs.existsSync(skillFile)) {
      this.createDefaultSkillFile(skill, skillFile);
    }
  }

  private async installFromGit(repoUrl: string, targetDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
      childProcess.exec(
        `git clone --depth 1 ${repoUrl} ${targetDir}`,
        (error) => {
          if (error) {
            reject(new Error(`Git clone failed: ${error.message}`));
          } else {
            // Remove .git directory
            const gitDir = path.join(targetDir, ".git");
            if (fs.existsSync(gitDir)) {
              fs.rmSync(gitDir, { recursive: true });
            }
            resolve();
          }
        }
      );
    });
  }

  private async installFromRegistry(skillId: string, targetDir: string): Promise<void> {
    // Download skill archive from registry
    const archiveUrl = `${this.registryUrl}/skills/${skillId}/download`;
    const archivePath = path.join(this.dataDir, "temp", `${skillId}.tar.gz`);
    
    fs.mkdirSync(path.dirname(archivePath), { recursive: true });

    await this.downloadFile(archiveUrl, archivePath);
    
    // Extract archive
    await this.extractArchive(archivePath, targetDir);
    
    // Cleanup
    fs.unlinkSync(archivePath);
  }

  private downloadFile(url: string, targetPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(targetPath);
      
      https.get(url, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          // Follow redirect
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            file.close();
            this.downloadFile(redirectUrl, targetPath)
              .then(resolve)
              .catch(reject);
            return;
          }
        }

        if (response.statusCode !== 200) {
          file.close();
          reject(new Error(`Download failed: ${response.statusCode}`));
          return;
        }

        response.pipe(file);
        
        file.on("finish", () => {
          file.close();
          resolve();
        });
      }).on("error", (err) => {
        file.close();
        reject(err);
      });
    });
  }

  private async extractArchive(archivePath: string, targetDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
      childProcess.execFile(
        "tar",
        ["-xzf", archivePath, "-C", targetDir, "--strip-components=1"],
        (error) => {
          if (error) {
            reject(new Error(`Extraction failed: ${error.message}`));
          } else {
            resolve();
          }
        }
      );
    });
  }

  private createDefaultSkillFile(skill: MarketSkill, filePath: string): void {
    const content = `---
name: "${skill.name}"
description: "${skill.description}"
version: "${skill.version}"
author: "${skill.author}"
tags: ${JSON.stringify(skill.tags)}
---

# ${skill.name}

${skill.description}

## Usage

This skill was installed from the ESC Skill Market.

## Author

${skill.author}
`;
    fs.writeFileSync(filePath, content);
  }

  async publish(skillPath: string): Promise<{ success: boolean; message: string; skillId?: string }> {
    const skillFile = path.join(skillPath, "SKILL.md");
    
    if (!fs.existsSync(skillFile)) {
      throw new Error("SKILL.md not found in skill directory");
    }

    // Read and parse SKILL.md
    const content = fs.readFileSync(skillFile, "utf-8");
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    
    if (!frontmatterMatch) {
      throw new Error("Invalid SKILL.md format: missing frontmatter");
    }

    const frontmatter = this.parseFrontmatter(content);
    const requiredFields = ["name", "description", "version", "author"];
    const missingFields = requiredFields.filter(f => !frontmatter[f]);
    if (missingFields.length > 0) {
      throw new Error("Missing required fields: " + missingFields.join(", "));
    }

    const skillPackage = {
      name: frontmatter.name as string,
      description: frontmatter.description as string,
      version: frontmatter.version as string,
      author: frontmatter.author as string,
      tags: (frontmatter.tags as string[]) || [],
    };

    try {
      const result = await this.publishToRegistry(skillPath, skillPackage);
      return { success: true, message: "Published " + skillPackage.name + "@" + skillPackage.version, skillId: result.skillId };
    } catch (error) {
      return { success: false, message: "Registry unavailable. Visit " + this.registryUrl + "/publish to upload manually." };
    }
  }

  private async publishToRegistry(skillPath: string, skillPackage: {
    name: string;
    description: string;
    version: string;
    author: string;
    tags: string[];
  }): Promise<{ skillId: string }> {
    // Upload skill to the registry
    const url = `${this.registryUrl}/skills`;
    
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(skillPackage);
      
      const req = https.request(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      }, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const result = JSON.parse(data) as { skillId: string };
              resolve(result);
            } catch {
              reject(new Error('Invalid response from registry'));
            }
          } else {
            reject(new Error(`Registry returned status ${res.statusCode}`));
          }
        });
      });
      
      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }

  async listInstalled(skillsDir: string): Promise<MarketSkill[]> {
    const installed: MarketSkill[] = [];
    
    if (!fs.existsSync(skillsDir)) {
      return installed;
    }

    const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      
      const skillFile = path.join(skillsDir, entry.name, "SKILL.md");
      if (fs.existsSync(skillFile)) {
        const content = fs.readFileSync(skillFile, "utf-8");
        const frontmatter = this.parseFrontmatter(content);
        
        installed.push({
          id: entry.name.toLowerCase().replace(/\s+/g, "-"),
          name: (frontmatter.name as string) || entry.name,
          description: (frontmatter.description as string) || "",
          version: (frontmatter.version as string) || "0.0.1",
          author: (frontmatter.author as string) || "unknown",
          downloads: 0,
          rating: 0,
          tags: (frontmatter.tags as string[]) || [],
          installed: true,
        });
      }
    }

    return installed;
  }

  private parseFrontmatter(content: string): Record<string, unknown> {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return {};
    
    const frontmatter: Record<string, unknown> = {};
    const lines = match[1].split("\n");
    
    for (const line of lines) {
      const colonIndex = line.indexOf(":");
      if (colonIndex > 0) {
        const key = line.slice(0, colonIndex).trim();
        let value: unknown = line.slice(colonIndex + 1).trim();
        
        // Parse JSON values
        if (typeof value === "string") {
          if ((value.startsWith("[") && value.endsWith("]")) ||
              (value.startsWith("{") && value.endsWith("}"))) {
            try {
              value = JSON.parse(value);
            } catch {
              // Keep as string
            }
          } else if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
          }
        }
        
        frontmatter[key] = value;
      }
    }
    
    return frontmatter;
  }

  private async fetchFromRegistry(endpoint: string, params: Record<string, string>): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, this.registryUrl);
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });

      https.get(url.toString(), (response) => {
        let data = "";
        
        response.on("data", (chunk) => {
          data += chunk;
        });
        
        response.on("end", () => {
          if (response.statusCode === 200) {
            try {
              resolve(JSON.parse(data));
            } catch {
              reject(new Error("Invalid JSON response"));
            }
          } else {
            reject(new Error(`Registry error: ${response.statusCode}`));
          }
        });
      }).on("error", reject);
    });
  }

  // Demo data for offline use
  getDemoSkills(): MarketSkill[] {
    return [
      {
        id: "threat-intel",
        name: "Threat Intelligence",
        description: "Query threat intelligence feeds and correlate with MITRE ATT&CK",
        version: "1.2.0",
        author: "ESC Team",
        downloads: 1542,
        rating: 4.8,
        tags: ["threat", "intelligence", "mitre"],
      },
      {
        id: "vuln-scanner",
        name: "Vulnerability Scanner",
        description: "Scan systems for known vulnerabilities using multiple tools",
        version: "2.0.1",
        author: "Security Labs",
        downloads: 3210,
        rating: 4.5,
        tags: ["vulnerability", "scanner", "nmap"],
      },
      {
        id: "compliance-nist",
        name: "NIST Compliance",
        description: "Audit systems against NIST Cybersecurity Framework",
        version: "1.0.0",
        author: "ESC Team",
        downloads: 876,
        rating: 4.2,
        tags: ["compliance", "nist", "audit"],
      },
      {
        id: "phishing-sim",
        name: "Phishing Simulator",
        description: "Simulate phishing attacks for security awareness training",
        version: "1.5.0",
        author: "Red Team Tools",
        downloads: 2100,
        rating: 4.6,
        tags: ["phishing", "simulation", "training"],
      },
      {
        id: "incident-response",
        name: "Incident Response",
        description: "Automated incident response workflows and playbooks",
        version: "3.0.0",
        author: "Blue Team",
        downloads: 4500,
        rating: 4.9,
        tags: ["incident", "response", "playbook"],
      },
    ];
  }
}
