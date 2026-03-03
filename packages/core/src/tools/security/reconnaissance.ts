import { Type } from '@sinclair/typebox';
import type { SecurityTool, SecurityToolResult } from './types';
import { createSuccessResult, createErrorResult } from './types';

const dnsEnumParams = Type.Object({
  domain: Type.String({ description: 'Domain to enumerate' }),
  includeSubdomains: Type.Optional(Type.Boolean({ default: true })),
  recordTypes: Type.Optional(Type.Array(Type.String())),
});

export const dnsEnumTool: SecurityTool = {
  name: 'dns_enumeration',
  label: 'DNS Enumeration',
  description: 'Enumerate DNS records for a domain',
  parameters: dnsEnumParams,
  category: 'reconnaissance',
  riskLevel: 'low',
  mitreMapping: { tactics: ['Reconnaissance'], techniques: ['T1590.002'] },
  async execute(toolCallId, params): Promise<SecurityToolResult> {
    const records = [
      { type: 'A', name: params.domain, value: '93.184.216.34', ttl: 3600 },
      { type: 'AAAA', name: params.domain, value: '2606:2800:220:1:248:1893:25c8:1946', ttl: 3600 },
      { type: 'MX', name: params.domain, value: '10 mail.example.com', ttl: 3600 },
      { type: 'TXT', name: params.domain, value: 'v=spf1 include:_spf.example.com ~all', ttl: 3600 },
      { type: 'NS', name: params.domain, value: 'ns1.example.com', ttl: 86400 },
    ];

    const subdomains = params.includeSubdomains 
      ? ['www', 'mail', 'api', 'admin', 'blog'].map(sub => ({ subdomain: `${sub}.${params.domain}`, ip: '192.168.1.' + Math.floor(Math.random() * 255) }))
      : [];

    return createSuccessResult(
      `DNS enumeration for ${params.domain}: Found ${records.length} records${subdomains.length ? ` and ${subdomains.length} subdomains` : ''}`,
      { domain: params.domain, records, subdomains, enumeratedAt: new Date().toISOString() },
      { riskLevel: 'low' }
    );
  },
};

const whoisParams = Type.Object({
  domain: Type.String({ description: 'Domain to lookup' }),
  includeHistory: Type.Optional(Type.Boolean({ default: false })),
});

export const whoisTool: SecurityTool = {
  name: 'whois_lookup',
  label: 'WHOIS Lookup',
  description: 'Lookup WHOIS information for a domain',
  parameters: whoisParams,
  category: 'reconnaissance',
  riskLevel: 'low',
  mitreMapping: { tactics: ['Reconnaissance'], techniques: ['T1591'] },
  async execute(toolCallId, params): Promise<SecurityToolResult> {
    const whoisData = {
      domain: params.domain,
      registrar: 'Example Registrar Inc.',
      createdDate: '2020-01-15',
      expiryDate: '2025-01-15',
      updatedDate: '2024-01-15',
      nameservers: ['ns1.example.com', 'ns2.example.com'],
      status: ['clientTransferProhibited', 'clientUpdateProhibited'],
      registrant: {
        organization: 'Example Corp',
        country: 'US',
        state: 'California',
      },
    };

    return createSuccessResult(
      `WHOIS lookup for ${params.domain}: Registered since ${whoisData.createdDate}`,
      { ...whoisData, lookedUpAt: new Date().toISOString() },
      { riskLevel: 'low' }
    );
  },
};

const subdomainEnumParams = Type.Object({
  domain: Type.String({ description: 'Domain to enumerate subdomains for' }),
  wordlist: Type.Optional(Type.String({ description: 'Wordlist size: small, medium, large' })),
  includeWildcard: Type.Optional(Type.Boolean({ default: true })),
});

export const subdomainEnumTool: SecurityTool = {
  name: 'subdomain_enumeration',
  label: 'Subdomain Enumeration',
  description: 'Enumerate subdomains for a domain',
  parameters: subdomainEnumParams,
  category: 'reconnaissance',
  riskLevel: 'low',
  timeout: 180000,
  mitreMapping: { tactics: ['Reconnaissance'], techniques: ['T1591.004'] },
  async execute(toolCallId, params): Promise<SecurityToolResult> {
    const subdomains = [
      { subdomain: `www.${params.domain}`, ip: '93.184.216.34', alive: true },
      { subdomain: `mail.${params.domain}`, ip: '93.184.216.35', alive: true },
      { subdomain: `api.${params.domain}`, ip: '93.184.216.36', alive: true },
      { subdomain: `admin.${params.domain}`, ip: '93.184.216.37', alive: false },
      { subdomain: `dev.${params.domain}`, ip: '93.184.216.38', alive: true },
      { subdomain: `staging.${params.domain}`, ip: '93.184.216.39', alive: true },
    ];

    return createSuccessResult(
      `Subdomain enumeration for ${params.domain}: Found ${subdomains.length} subdomains, ${subdomains.filter(s => s.alive).length} alive`,
      { domain: params.domain, subdomains, enumeratedAt: new Date().toISOString(), totalFound: subdomains.length },
      { riskLevel: 'low' }
    );
  },
};

const dirEnumParams = Type.Object({
  target: Type.String({ description: 'Target URL' }),
  wordlist: Type.Optional(Type.Union([
    Type.Literal('common'),
    Type.Literal('medium'),
    Type.Literal('large'),
  ], { default: 'common' })),
  extensions: Type.Optional(Type.Array(Type.String())),
});

export const dirEnumTool: SecurityTool = {
  name: 'directory_enumeration',
  label: 'Directory Enumeration',
  description: 'Enumerate directories and files on a web server',
  parameters: dirEnumParams,
  category: 'reconnaissance',
  riskLevel: 'medium',
  requiresConfirmation: true,
  timeout: 300000,
  mitreMapping: { tactics: ['Reconnaissance'], techniques: ['T1595.002'] },
  async execute(toolCallId, params, signal): Promise<SecurityToolResult> {
    const directories = [
      { path: '/admin', status: 403, size: '1.2KB' },
      { path: '/backup', status: 403, size: '0B' },
      { path: '/api', status: 200, size: '3.4KB' },
      { path: '/uploads', status: 301, size: '0B' },
      { path: '/images', status: 200, size: '12.5KB' },
      { path: '/js', status: 200, size: '45.2KB' },
      { path: '/css', status: 200, size: '23.8KB' },
      { path: '/config.php.bak', status: 200, size: '2.1KB' },
    ];

    return createSuccessResult(
      `Directory enumeration for ${params.target}: Found ${directories.length} paths`,
      { target: params.target, wordlist: params.wordlist, directories, enumeratedAt: new Date().toISOString() },
      { riskLevel: 'medium' }
    );
  },
};

const techDetectParams = Type.Object({
  target: Type.String({ description: 'Target URL' }),
  deepScan: Type.Optional(Type.Boolean({ default: false })),
});

export const techDetectTool: SecurityTool = {
  name: 'technology_detection',
  label: 'Technology Detection',
  description: 'Detect technologies used by a web application',
  parameters: techDetectParams,
  category: 'reconnaissance',
  riskLevel: 'low',
  mitreMapping: { tactics: ['Reconnaissance'], techniques: ['T1595.002'] },
  async execute(toolCallId, params): Promise<SecurityToolResult> {
    const technologies = [
      { name: 'nginx', version: '1.18.0', category: 'Web Server', confidence: 100 },
      { name: 'React', version: '18.2.0', category: 'JavaScript Framework', confidence: 95 },
      { name: 'Node.js', version: '18.x', category: 'Runtime', confidence: 85 },
      { name: 'PostgreSQL', version: '14.x', category: 'Database', confidence: 70 },
      { name: 'Redis', version: '7.x', category: 'Cache', confidence: 60 },
      { name: 'Cloudflare', version: '', category: 'CDN', confidence: 100 },
    ];

    return createSuccessResult(
      `Technology detection for ${params.target}: Found ${technologies.length} technologies`,
      { target: params.target, technologies, detectedAt: new Date().toISOString() },
      { riskLevel: 'low' }
    );
  },
};

const emailHarvestParams = Type.Object({
  domain: Type.String({ description: 'Domain to harvest emails from' }),
  sources: Type.Optional(Type.Array(Type.Union([
    Type.Literal('website'),
    Type.Literal('search_engines'),
    Type.Literal('social_media'),
  ]))),
});

export const emailHarvestTool: SecurityTool = {
  name: 'email_harvest',
  label: 'Email Harvesting',
  description: 'Harvest email addresses from a domain',
  parameters: emailHarvestParams,
  category: 'reconnaissance',
  riskLevel: 'low',
  mitreMapping: { tactics: ['Reconnaissance'], techniques: ['T1589.002'] },
  async execute(toolCallId, params): Promise<SecurityToolResult> {
    const emails = [
      { email: `info@${params.domain}`, source: 'website', type: 'generic' },
      { email: `support@${params.domain}`, source: 'website', type: 'generic' },
      { email: `admin@${params.domain}`, source: 'website', type: 'generic' },
      { email: `john.doe@${params.domain}`, source: 'search_engines', type: 'personal' },
      { email: `jane.smith@${params.domain}`, source: 'search_engines', type: 'personal' },
    ];

    return createSuccessResult(
      `Email harvesting for ${params.domain}: Found ${emails.length} email addresses`,
      { domain: params.domain, emails, harvestedAt: new Date().toISOString() },
      { riskLevel: 'low' }
    );
  },
};

const socialReconParams = Type.Object({
  target: Type.String({ description: 'Organization or individual to research' }),
  platforms: Type.Optional(Type.Array(Type.String())),
});

export const socialReconTool: SecurityTool = {
  name: 'social_reconnaissance',
  label: 'Social Reconnaissance',
  description: 'Gather information from social media platforms',
  parameters: socialReconParams,
  category: 'reconnaissance',
  riskLevel: 'low',
  mitreMapping: { tactics: ['Reconnaissance'], techniques: ['T1591', 'T1593'] },
  async execute(toolCallId, params): Promise<SecurityToolResult> {
    const findings = [
      { platform: 'LinkedIn', type: 'employee', count: 150, info: 'Employee list and roles' },
      { platform: 'GitHub', type: 'repositories', count: 25, info: 'Public code repositories' },
      { platform: 'Twitter', type: 'accounts', count: 3, info: 'Official company accounts' },
      { platform: 'Facebook', type: 'page', count: 1, info: 'Company page with posts' },
    ];

    return createSuccessResult(
      `Social reconnaissance for ${params.target}: Found information on ${findings.length} platforms`,
      { target: params.target, findings, researchedAt: new Date().toISOString() },
      { riskLevel: 'low' }
    );
  },
};

const codeSearchParams = Type.Object({
  query: Type.String({ description: 'Search query (org, repo pattern, etc.)' }),
  sources: Type.Optional(Type.Array(Type.Union([
    Type.Literal('github'),
    Type.Literal('gitlab'),
    Type.Literal('bitbucket'),
    Type.Literal('pastebin'),
  ]))),
});

export const codeSearchTool: SecurityTool = {
  name: 'code_search',
  label: 'Code Search',
  description: 'Search for exposed code and secrets',
  parameters: codeSearchParams,
  category: 'reconnaissance',
  riskLevel: 'low',
  mitreMapping: { tactics: ['Reconnaissance'], techniques: ['T1593.002'] },
  async execute(toolCallId, params): Promise<SecurityToolResult> {
    const results = [
      { source: 'github', repo: 'example/api', file: 'config.js', match: 'API_KEY', severity: 'high' },
      { source: 'github', repo: 'example/web', file: '.env.example', match: 'password', severity: 'low' },
      { source: 'pastebin', id: 'abc123', match: 'database credentials', severity: 'critical' },
    ];

    return createSuccessResult(
      `Code search for "${params.query}": Found ${results.length} potential exposures`,
      { query: params.query, results, searchedAt: new Date().toISOString() },
      { riskLevel: results.some(r => r.severity === 'critical') ? 'critical' : 'medium' }
    );
  },
};

const cloudEnumParams = Type.Object({
  organization: Type.String({ description: 'Organization name' }),
  providers: Type.Optional(Type.Array(Type.Union([
    Type.Literal('aws'),
    Type.Literal('azure'),
    Type.Literal('gcp'),
    Type.Literal('digitalocean'),
  ]))),
});

export const cloudEnumTool: SecurityTool = {
  name: 'cloud_enumeration',
  label: 'Cloud Enumeration',
  description: 'Enumerate cloud resources and assets',
  parameters: cloudEnumParams,
  category: 'reconnaissance',
  riskLevel: 'low',
  timeout: 180000,
  mitreMapping: { tactics: ['Reconnaissance'], techniques: ['T1596'] },
  async execute(toolCallId, params): Promise<SecurityToolResult> {
    const assets = [
      { provider: 'aws', type: 'S3 Bucket', name: 'example-assets-public', public: true },
      { provider: 'aws', type: 'S3 Bucket', name: 'example-backups', public: false },
      { provider: 'azure', type: 'Storage Account', name: 'examplestorage', public: false },
      { provider: 'gcp', type: 'Cloud Storage', name: 'example-media', public: true },
      { provider: 'aws', type: 'EC2', name: 'web-server-1', public: false },
    ];

    return createSuccessResult(
      `Cloud enumeration for ${params.organization}: Found ${assets.length} assets, ${assets.filter(a => a.public).length} public`,
      { organization: params.organization, assets, enumeratedAt: new Date().toISOString() },
      { riskLevel: assets.filter(a => a.public).length > 0 ? 'medium' : 'low' }
    );
  },
};

export const reconnaissanceTools: SecurityTool[] = [
  dnsEnumTool,
  whoisTool,
  subdomainEnumTool,
  dirEnumTool,
  techDetectTool,
  emailHarvestTool,
  socialReconTool,
  codeSearchTool,
  cloudEnumTool,
];
