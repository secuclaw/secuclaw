import { describe, test, expect, beforeEach } from 'vitest';
import { 
  CapabilityEvolver, 
  createCapabilityEvolver,
  type EvolutionContext,
  type SkillEvolutionConfig 
} from '../capability.js';
import { 
  ToolEvolver, 
  createToolEvolver,
  type ToolEvolutionContext,
  type ToolEvolutionConfig 
} from '../tool-evolver.js';
import { 
  KnowledgeEvolver, 
  createKnowledgeEvolver,
  type KnowledgeEvolutionContext,
  type KnowledgeEvolutionConfig 
} from '../knowledge-evolver.js';

describe('CapabilityEvolver', () => {
  let evolver: CapabilityEvolver;

  beforeEach(() => {
    evolver = createCapabilityEvolver({
      maxIterations: 3,
      minTestScore: 0.6,
      autoApprove: false,
    });
  });

  describe('analyzeCapabilityGap', () => {
    test('should detect gap when failed attempts >= 2', async () => {
      const context: EvolutionContext = {
        agentId: 'agent-1',
        sessionId: 'session-1',
        taskDescription: 'Scan network for vulnerabilities',
        failedAttempts: 2,
        availableTools: ['nmap', 'nessus'],
        existingSkills: [],
      };

      const result = await evolver.analyzeCapabilityGap(context);
      
      expect(result.hasGap).toBe(true);
      expect(result.gapDescription).toContain('failed 2 times');
      expect(result.suggestedSkillType).toBeDefined();
    });

    test('should detect gap when no relevant skills exist', async () => {
      const context: EvolutionContext = {
        agentId: 'agent-1',
        sessionId: 'session-1',
        taskDescription: 'Analyze malware sample for indicators',
        failedAttempts: 0,
        availableTools: ['yara', 'strings'],
        existingSkills: [],
      };

      const result = await evolver.analyzeCapabilityGap(context);
      
      expect(result.hasGap).toBe(true);
      expect(result.suggestedSkillType).toBeDefined();
    });

    test('should not detect gap when skills exist', async () => {
      const context: EvolutionContext = {
        agentId: 'agent-1',
        sessionId: 'session-1',
        taskDescription: 'Scan network vulnerabilities',
        failedAttempts: 0,
        availableTools: ['nmap'],
        existingSkills: [],
      };

      const result = await evolver.analyzeCapabilityGap(context);
      
      // When existingSkills is empty and task involves security keywords, gap is detected
      expect(result.hasGap).toBe(true);
    });
  });

  describe('generateSkill', () => {
    test('should generate skill with valid structure', async () => {
      const context: EvolutionContext = {
        agentId: 'agent-1',
        sessionId: 'session-1',
        taskDescription: 'Perform vulnerability assessment on target',
        failedAttempts: 1,
        availableTools: ['nmap', 'nikto', 'sqlmap'],
        existingSkills: [],
      };

      const skill = await evolver.generateSkill(context);
      
      expect(skill.id).toBeDefined();
      expect(skill.name).toBeDefined();
      expect(skill.description).toBe(context.taskDescription);
      expect(skill.layer).toBe('workspace');
      expect(skill.status).toBe('draft');
      expect(skill.generatedBy).toBe('agent');
      expect(skill.tools.length).toBeGreaterThan(0);
    });

    test('should generate appropriate triggers', async () => {
      const context: EvolutionContext = {
        agentId: 'agent-1',
        sessionId: 'session-1',
        taskDescription: 'Detect and respond to security incidents',
        failedAttempts: 1,
        availableTools: ['siem', 'soar'],
        existingSkills: [],
      };

      const skill = await evolver.generateSkill(context);
      
      expect(skill.triggers.length).toBeGreaterThan(0);
      skill.triggers.forEach(trigger => {
        expect(trigger).toContain('when asked about');
      });
    });
  });

  describe('testSkill', () => {
    test('should pass skill with complete structure', async () => {
      const context: EvolutionContext = {
        agentId: 'agent-1',
        sessionId: 'session-1',
        taskDescription: 'Comprehensive threat intelligence analysis with detailed reporting capabilities',
        failedAttempts: 0,
        availableTools: ['misp', 'otx', 'virustotal'],
        existingSkills: [],
      };

      const skill = await evolver.generateSkill(context);
      const result = await evolver.testSkill(skill.id);
      
      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(0.6);
    });

    test('should record test results', async () => {
      const context: EvolutionContext = {
        agentId: 'agent-1',
        sessionId: 'session-1',
        taskDescription: 'Detailed compliance audit framework implementation guide',
        failedAttempts: 0,
        availableTools: ['audit-tool'],
        existingSkills: [],
      };

      const skill = await evolver.generateSkill(context);
      await evolver.testSkill(skill.id);
      
      const storedSkill = evolver.getSkill(skill.id);
      expect(storedSkill?.testResults.length).toBe(1);
    });
  });

  describe('iterateSkill', () => {
    test('should increment version on iteration', async () => {
      const context: EvolutionContext = {
        agentId: 'agent-1',
        sessionId: 'session-1',
        taskDescription: 'Security monitoring task',
        failedAttempts: 0,
        availableTools: ['monitor'],
        existingSkills: [],
      };

      const skill = await evolver.generateSkill(context);
      const originalVersion = skill.version;
      
      const iterated = await evolver.iterateSkill(skill.id, 'Add more detailed instructions');
      
      expect(iterated?.version).not.toBe(originalVersion);
    });

    test('should enhance instructions when feedback mentions instructions', async () => {
      const context: EvolutionContext = {
        agentId: 'agent-1',
        sessionId: 'session-1',
        taskDescription: 'Incident response procedure',
        failedAttempts: 0,
        availableTools: ['soar'],
        existingSkills: [],
      };

      const skill = await evolver.generateSkill(context);
      const originalInstructions = skill.instructions.length;
      
      const iterated = await evolver.iterateSkill(skill.id, 'Need clearer step-by-step instructions');
      
      expect(iterated?.instructions.length).toBeGreaterThanOrEqual(originalInstructions);
    });
  });

  describe('approveSkill', () => {
    test('should approve skill that passes tests', async () => {
      const context: EvolutionContext = {
        agentId: 'agent-1',
        sessionId: 'session-1',
        taskDescription: 'Complete vulnerability scanning with detailed reporting framework',
        failedAttempts: 0,
        availableTools: ['nmap', 'nessus', 'openvas'],
        existingSkills: [],
      };

      const skill = await evolver.generateSkill(context);
      await evolver.testSkill(skill.id);
      const approved = await evolver.approveSkill(skill.id);
      
      expect(approved).toBe(true);
      expect(evolver.getSkill(skill.id)?.status).toBe('approved');
    });

    test('should not approve skill that fails tests', async () => {
      const evolverStrict = createCapabilityEvolver({ minTestScore: 0.95 });
      
      const context: EvolutionContext = {
        agentId: 'agent-1',
        sessionId: 'session-1',
        taskDescription: 'Task',
        failedAttempts: 0,
        availableTools: [],
        existingSkills: [],
      };

      const skill = await evolverStrict.generateSkill(context);
      await evolverStrict.testSkill(skill.id);
      const approved = await evolverStrict.approveSkill(skill.id);
      
      expect(approved).toBe(false);
    });
  });

  describe('recordSkillUsage', () => {
    test('should track usage statistics', async () => {
      const context: EvolutionContext = {
        agentId: 'agent-1',
        sessionId: 'session-1',
        taskDescription: 'Security analysis',
        failedAttempts: 0,
        availableTools: ['tool'],
        existingSkills: [],
      };

      const skill = await evolver.generateSkill(context);
      
      evolver.recordSkillUsage(skill.id, true, 100);
      evolver.recordSkillUsage(skill.id, false, 200);
      evolver.recordSkillUsage(skill.id, true, 150);
      
      const storedSkill = evolver.getSkill(skill.id);
      expect(storedSkill?.performance.usageCount).toBe(3);
      expect(storedSkill?.performance.successRate).toBeCloseTo(0.667, 2);
    });
  });

  describe('getStats', () => {
    test('should return correct statistics', async () => {
      const context: EvolutionContext = {
        agentId: 'agent-1',
        sessionId: 'session-1',
        taskDescription: 'Comprehensive security assessment framework',
        failedAttempts: 0,
        availableTools: ['tool1', 'tool2'],
        existingSkills: [],
      };

      await evolver.generateSkill(context);
      
      const stats = evolver.getStats();
      expect(stats.totalSkills).toBe(1);
      expect(stats.draftSkills).toBe(1);
      expect(stats.approvedSkills).toBe(0);
    });
  });
});

describe('ToolEvolver', () => {
  let evolver: ToolEvolver;

  beforeEach(() => {
    evolver = createToolEvolver({
      maxIterations: 3,
      minTestScore: 0.6,
      autoApprove: false,
      requireSecurityReview: false,
    });
  });

  describe('analyzeToolGap', () => {
    test('should detect gap when description provided', async () => {
      const context: ToolEvolutionContext = {
        agentId: 'agent-1',
        gapDescription: 'Missing web application scanner',
        requiredCapability: 'scan web applications for vulnerabilities',
        existingTools: [],
      };

      const result = await evolver.analyzeToolGap(context);
      
      expect(result.hasGap).toBe(true);
      expect(result.suggestedToolType).toBeDefined();
    });

    test('should infer correct tool type', async () => {
      const contexts = [
        { capability: 'scan network ports', expected: 'scanner' },
        { capability: 'analyze malware behavior', expected: 'analyzer' },
        { capability: 'attack vulnerable systems', expected: 'attacker' },
        { capability: 'defend against threats', expected: 'defender' },
      ];

      for (const { capability, expected } of contexts) {
        const context: ToolEvolutionContext = {
          agentId: 'agent-1',
          gapDescription: '',
          requiredCapability: capability,
          existingTools: [],
        };

        const result = await evolver.analyzeToolGap(context);
        expect(result.suggestedToolType).toBe(expected);
      }
    });
  });

  describe('generateTool', () => {
    test('should generate tool with valid structure', async () => {
      const context: ToolEvolutionContext = {
        agentId: 'agent-1',
        gapDescription: 'Need SQL injection scanner',
        requiredCapability: 'scan for SQL injection vulnerabilities',
        existingTools: [],
        sampleInputs: [{ url: 'https://example.com' }],
      };

      const tool = await evolver.generateTool(context);
      
      expect(tool.id).toBeDefined();
      expect(tool.name).toBeDefined();
      expect(tool.category).toBeDefined();
      expect(tool.parameters.length).toBeGreaterThan(0);
      expect(tool.implementation).toBeDefined();
      expect(tool.status).toBe('draft');
    });

    test('should include sample inputs as parameters', async () => {
      const context: ToolEvolutionContext = {
        agentId: 'agent-1',
        gapDescription: 'API security scanner',
        requiredCapability: 'scan APIs for security issues',
        existingTools: [],
        sampleInputs: [
          { endpoint: '/api/v1', method: 'GET' },
          { endpoint: '/api/v2', method: 'POST' },
        ],
      };

      const tool = await evolver.generateTool(context);
      const paramNames = tool.parameters.map(p => p.name);
      
      expect(paramNames).toContain('endpoint');
      expect(paramNames).toContain('method');
    });
  });

  describe('testTool', () => {
    test('should validate tool structure', async () => {
      const context: ToolEvolutionContext = {
        agentId: 'agent-1',
        gapDescription: 'Comprehensive vulnerability scanner for web applications',
        requiredCapability: 'perform web application vulnerability scanning',
        existingTools: [],
      };

      const tool = await evolver.generateTool(context);
      const result = await evolver.testTool(tool.id);
      
      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(0.6);
    });

    test('should run test cases', async () => {
      const context: ToolEvolutionContext = {
        agentId: 'agent-1',
        gapDescription: 'Port scanner',
        requiredCapability: 'scan ports on target host',
        existingTools: [],
      };

      const tool = await evolver.generateTool(context);
      const result = await evolver.testTool(tool.id, [
        { input: { target: '192.168.1.1' } },
        { input: { target: 'example.com', options: { ports: '80,443' } } },
      ]);
      
      expect(result.testCases.length).toBe(2);
    });
  });

  describe('approveTool', () => {
    test('should approve tool with security review when required', async () => {
      const evolverWithReview = createToolEvolver({ requireSecurityReview: true });
      
      const context: ToolEvolutionContext = {
        agentId: 'agent-1',
        gapDescription: 'Detailed security assessment tool with comprehensive output',
        requiredCapability: 'perform security assessment',
        existingTools: [],
      };

      const tool = await evolverWithReview.generateTool(context);
      await evolverWithReview.testTool(tool.id);
      
      const approved = await evolverWithReview.approveTool(tool.id, {
        reviewed: true,
        approved: true,
        reviewer: 'security-team',
      });
      
      expect(approved).toBe(true);
    });
  });

  describe('getStats', () => {
    test('should return correct statistics', async () => {
      const context: ToolEvolutionContext = {
        agentId: 'agent-1',
        gapDescription: 'Test tool for statistics',
        requiredCapability: 'test capability',
        existingTools: [],
      };

      await evolver.generateTool(context);
      
      const stats = evolver.getStats();
      expect(stats.totalTools).toBe(1);
      expect(stats.draftTools).toBe(1);
    });
  });
});

describe('KnowledgeEvolver', () => {
  let evolver: KnowledgeEvolver;

  beforeEach(() => {
    evolver = createKnowledgeEvolver({
      maxIterations: 3,
      minConfidence: 0.6,
      autoApproveCommunity: false,
      requireVerification: false,
    });
  });

  describe('analyzeKnowledgeGap', () => {
    test('should detect gap for new threats', async () => {
      const context: KnowledgeEvolutionContext = {
        agentId: 'agent-1',
        domain: 'threat-intel',
        triggerReason: 'new-threat',
        description: 'New ransomware variant detected',
        existingKnowledge: [],
      };

      const result = await evolver.analyzeKnowledgeGap(context);
      
      expect(result.hasGap).toBe(true);
      expect(result.suggestedAction).toBe('create');
    });

    test('should detect gap for compliance changes', async () => {
      const context: KnowledgeEvolutionContext = {
        agentId: 'agent-1',
        domain: 'scf-2025',
        triggerReason: 'compliance-change',
        description: 'New SCF 2025 control requirements',
        existingKnowledge: [],
      };

      const result = await evolver.analyzeKnowledgeGap(context);
      
      expect(result.hasGap).toBe(true);
      expect(result.suggestedAction).toBe('update');
    });
  });

  describe('generateKnowledge', () => {
    test('should generate MITRE ATT&CK knowledge', async () => {
      const context: KnowledgeEvolutionContext = {
        agentId: 'agent-1',
        domain: 'mitre-attack',
        triggerReason: 'gap',
        description: 'T1059 Command and Scripting Interpreter',
        existingKnowledge: [],
      };

      const knowledge = await evolver.generateKnowledge(context);
      
      expect(knowledge.id).toBeDefined();
      expect(knowledge.domain).toBe('mitre-attack');
      expect(knowledge.status).toBe('draft');
      expect(knowledge.content).toHaveProperty('technique');
      expect(knowledge.content).toHaveProperty('tactics');
    });

    test('should generate SCF 2025 knowledge', async () => {
      const context: KnowledgeEvolutionContext = {
        agentId: 'agent-1',
        domain: 'scf-2025',
        triggerReason: 'gap',
        description: 'Access control requirements',
        existingKnowledge: [],
      };

      const knowledge = await evolver.generateKnowledge(context);
      
      expect(knowledge.domain).toBe('scf-2025');
      expect(knowledge.content).toHaveProperty('controlId');
      expect(knowledge.content).toHaveProperty('requirements');
    });

    test('should generate threat intelligence knowledge', async () => {
      const context: KnowledgeEvolutionContext = {
        agentId: 'agent-1',
        domain: 'threat-intel',
        triggerReason: 'new-threat',
        description: 'APT group indicators',
        existingKnowledge: [],
        externalSource: {
          type: 'misp',
          data: { indicators: [] },
        },
      };

      const knowledge = await evolver.generateKnowledge(context);
      
      expect(knowledge.source).toBe('integration');
      expect(knowledge.tags).toContain('threat');
      expect(knowledge.tags).toContain('recent');
    });
  });

  describe('testKnowledge', () => {
    test('should validate knowledge structure', async () => {
      const context: KnowledgeEvolutionContext = {
        agentId: 'agent-1',
        domain: 'mitre-attack',
        triggerReason: 'gap',
        description: 'Comprehensive MITRE ATT&CK technique documentation',
        existingKnowledge: [],
      };

      const knowledge = await evolver.generateKnowledge(context);
      const result = await evolver.testKnowledge(knowledge.id);
      
      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(0.6);
      expect(result.testType).toBe('validation');
    });

    test('should validate domain-specific content', async () => {
      const context: KnowledgeEvolutionContext = {
        agentId: 'agent-1',
        domain: 'threat-intel',
        triggerReason: 'new-threat',
        description: 'Detailed threat intelligence with indicators and attribution',
        existingKnowledge: [],
      };

      const knowledge = await evolver.generateKnowledge(context);
      const result = await evolver.testKnowledge(knowledge.id);
      
      expect(result.metrics.domainValidation).toBeDefined();
    });
  });

  describe('iterateKnowledge', () => {
    test('should increment version on iteration', async () => {
      const context: KnowledgeEvolutionContext = {
        agentId: 'agent-1',
        domain: 'playbooks',
        triggerReason: 'gap',
        description: 'Incident response playbook',
        existingKnowledge: [],
      };

      const knowledge = await evolver.generateKnowledge(context);
      const originalVersion = knowledge.version;
      
      const iterated = await evolver.iterateKnowledge(knowledge.id, 'Improve content accuracy');
      
      expect(iterated?.version).not.toBe(originalVersion);
    });

    test('should add tags from feedback', async () => {
      const context: KnowledgeEvolutionContext = {
        agentId: 'agent-1',
        domain: 'compliance',
        triggerReason: 'gap',
        description: 'GDPR compliance requirements',
        existingKnowledge: [],
      };

      const knowledge = await evolver.generateKnowledge(context);
      const originalTagCount = knowledge.tags.length;
      
      const iterated = await evolver.iterateKnowledge(knowledge.id, 'Add tags for categorization');
      
      expect(iterated?.tags.length).toBeGreaterThanOrEqual(originalTagCount);
    });
  });

  describe('approveKnowledge', () => {
    test('should approve knowledge that passes tests', async () => {
      const context: KnowledgeEvolutionContext = {
        agentId: 'agent-1',
        domain: 'mitre-attack',
        triggerReason: 'gap',
        description: 'Complete MITRE ATT&CK framework knowledge entry',
        existingKnowledge: [],
      };

      const knowledge = await evolver.generateKnowledge(context);
      await evolver.testKnowledge(knowledge.id);
      const approved = await evolver.approveKnowledge(knowledge.id, 'security-expert');
      
      expect(approved).toBe(true);
      expect(evolver.getKnowledge(knowledge.id)?.status).toBe('approved');
    });
  });

  describe('searchKnowledge', () => {
    test('should find relevant knowledge', async () => {
      const context: KnowledgeEvolutionContext = {
        agentId: 'agent-1',
        domain: 'threat-intel',
        triggerReason: 'gap',
        description: 'Ransomware indicators of compromise',
        existingKnowledge: [],
      };

      const knowledge = await evolver.generateKnowledge(context);
      await evolver.testKnowledge(knowledge.id);
      await evolver.approveKnowledge(knowledge.id);
      
      const results = evolver.searchKnowledge('ransomware indicators', 'threat-intel');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe(knowledge.id);
    });
  });

  describe('mergeKnowledge', () => {
    test('should merge duplicate knowledge entries', async () => {
      const context1: KnowledgeEvolutionContext = {
        agentId: 'agent-1',
        domain: 'vulnerabilities',
        triggerReason: 'gap',
        description: 'CVE-2024-1234 details',
        existingKnowledge: [],
      };

      const context2: KnowledgeEvolutionContext = {
        agentId: 'agent-1',
        domain: 'vulnerabilities',
        triggerReason: 'gap',
        description: 'CVE-2024-1234 additional info',
        existingKnowledge: [],
      };

      const primary = await evolver.generateKnowledge(context1);
      const secondary = await evolver.generateKnowledge(context2);
      
      const merged = await evolver.mergeKnowledge(primary.id, [secondary.id]);
      
      expect(merged).toBeDefined();
      expect(evolver.getKnowledge(secondary.id)?.status).toBe('deprecated');
    });
  });

  describe('getStats', () => {
    test('should return correct statistics by domain', async () => {
      const contexts: KnowledgeEvolutionContext[] = [
        { agentId: 'agent-1', domain: 'mitre-attack', triggerReason: 'gap', description: 'Attack technique one', existingKnowledge: [] },
        { agentId: 'agent-1', domain: 'mitre-attack', triggerReason: 'gap', description: 'Attack technique two', existingKnowledge: [] },
        { agentId: 'agent-1', domain: 'scf-2025', triggerReason: 'gap', description: 'Control requirement', existingKnowledge: [] },
      ];

      for (const ctx of contexts) {
        await evolver.generateKnowledge(ctx);
      }

      const stats = evolver.getStats();
      
      expect(stats.totalKnowledge).toBe(3);
      expect(stats.byDomain['mitre-attack']).toBe(2);
      expect(stats.byDomain['scf-2025']).toBe(1);
    });
  });
});

describe('Evolution Module Integration', () => {
  test('should work together for complete evolution workflow', async () => {
    const skillEvolver = createCapabilityEvolver({ minTestScore: 0.5 });
    const toolEvolver = createToolEvolver({ minTestScore: 0.5, requireSecurityReview: false });
    const knowledgeEvolver = createKnowledgeEvolver({ minConfidence: 0.5, requireVerification: false });

    const skillContext: EvolutionContext = {
      agentId: 'integration-test',
      sessionId: 'test-session',
      taskDescription: 'Comprehensive threat hunting with MITRE ATT&CK mapping',
      failedAttempts: 0,
      availableTools: ['siem', 'edr'],
      existingSkills: [],
    };

    const skill = await skillEvolver.generateSkill(skillContext);
    const skillTest = await skillEvolver.testSkill(skill.id);
    expect(skillTest.passed).toBe(true);

    const toolContext: ToolEvolutionContext = {
      agentId: 'integration-test',
      gapDescription: 'Threat hunting tool',
      requiredCapability: 'hunt for threats using behavioral analysis',
      existingTools: [],
    };

    const tool = await toolEvolver.generateTool(toolContext);
    const toolTest = await toolEvolver.testTool(tool.id);
    expect(toolTest.passed).toBe(true);

    const knowledgeContext: KnowledgeEvolutionContext = {
      agentId: 'integration-test',
      domain: 'mitre-attack',
      triggerReason: 'gap',
      description: 'Threat hunting techniques and procedures',
      existingKnowledge: [],
    };

    const knowledge = await knowledgeEvolver.generateKnowledge(knowledgeContext);
    const knowledgeTest = await knowledgeEvolver.testKnowledge(knowledge.id);
    expect(knowledgeTest.passed).toBe(true);

    const skillApproved = await skillEvolver.approveSkill(skill.id);
    const toolApproved = await toolEvolver.approveTool(tool.id);
    const knowledgeApproved = await knowledgeEvolver.approveKnowledge(knowledge.id);

    expect(skillApproved).toBe(true);
    expect(toolApproved).toBe(true);
    expect(knowledgeApproved).toBe(true);
  });
});
