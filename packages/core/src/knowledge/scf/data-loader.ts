export interface SCFControl {
  id: string;
  domainCode: string;
  controlCode: string;
  name: string;
  description: string;
  requirements: string[];
  maturityLevel: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  categories: string[];
  mappings: SCFMapping[];
  threats: string[];
  risks: string[];
  relatedControls: string[];
}

export interface SCFMapping {
  framework: string;
  controlId: string;
  coverage: 'full' | 'partial' | 'none';
}

export interface SCFDomain {
  code: string;
  name: string;
  description: string;
  controlCount: number;
  subdomains: SCFSubdomain[];
}

export interface SCFSubdomain {
  code: string;
  name: string;
  controlCount: number;
}

export interface SCFThreat {
  code: string;
  category: 'natural' | 'human';
  name: string;
  description: string;
  likelihood: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  impact: 'negligible' | 'minor' | 'moderate' | 'major' | 'severe';
}

export interface SCFRisk {
  code: string;
  category: string;
  name: string;
  description: string;
  affectedControls: string[];
}

export interface SCF2025Data {
  version: string;
  domains: SCFDomain[];
  controls: SCFControl[];
  threats: SCFThreat[];
  risks: SCFRisk[];
  frameworks: SCFFramework[];
  stats: {
    totalControls: number;
    totalDomains: number;
    totalMappings: number;
    totalThreats: number;
    totalRisks: number;
  };
}

export interface SCFFramework {
  code: string;
  name: string;
  version: string;
  controlCount: number;
}

const SCF_2025_DOMAINS: SCFDomain[] = [
  { code: 'GOV', name: 'Cybersecurity & Data Privacy Governance', description: 'Overall governance structure for cybersecurity and data privacy', controlCount: 25, subdomains: [] },
  { code: 'IAM', name: 'Identity & Access Management', description: 'Managing identities and access to systems and data', controlCount: 22, subdomains: [] },
  { code: 'AAT', name: 'AI & Autonomous Technologies', description: 'Security controls for AI and autonomous systems', controlCount: 18, subdomains: [] },
  { code: 'AST', name: 'Asset Management', description: 'Managing and protecting organizational assets', controlCount: 15, subdomains: [] },
  { code: 'BCD', name: 'Business Continuity & Disaster Recovery', description: 'Ensuring business continuity and disaster recovery capabilities', controlCount: 20, subdomains: [] },
  { code: 'CAP', name: 'Capacity & Performance Planning', description: 'Planning for adequate capacity and performance', controlCount: 8, subdomains: [] },
  { code: 'CHG', name: 'Change Management', description: 'Managing changes to systems and configurations', controlCount: 12, subdomains: [] },
  { code: 'CLD', name: 'Cloud Security', description: 'Security controls for cloud environments', controlCount: 28, subdomains: [] },
  { code: 'CPL', name: 'Compliance', description: 'Regulatory and compliance requirements', controlCount: 16, subdomains: [] },
  { code: 'CFG', name: 'Configuration Management', description: 'Managing system configurations securely', controlCount: 10, subdomains: [] },
  { code: 'MON', name: 'Continuous Monitoring', description: 'Continuous security monitoring and alerting', controlCount: 14, subdomains: [] },
  { code: 'CRY', name: 'Cryptography', description: 'Encryption and cryptographic controls', controlCount: 12, subdomains: [] },
  { code: 'DCH', name: 'Data Classification & Handling', description: 'Classifying and handling data appropriately', controlCount: 18, subdomains: [] },
  { code: 'EMB', name: 'Embedded Technology', description: 'Security for embedded and IoT devices', controlCount: 15, subdomains: [] },
  { code: 'END', name: 'Endpoint Security', description: 'Securing endpoint devices', controlCount: 20, subdomains: [] },
  { code: 'HRS', name: 'Human Resources Security', description: 'Security aspects of human resources', controlCount: 14, subdomains: [] },
  { code: 'IR', name: 'Incident Response', description: 'Incident detection and response capabilities', controlCount: 22, subdomains: [] },
  { code: 'IA', name: 'Information Assurance', description: 'Ensuring information integrity and availability', controlCount: 16, subdomains: [] },
  { code: 'MA', name: 'Maintenance', description: 'System maintenance and patching', controlCount: 10, subdomains: [] },
  { code: 'MDM', name: 'Mobile Device Management', description: 'Managing and securing mobile devices', controlCount: 12, subdomains: [] },
  { code: 'NET', name: 'Network Security', description: 'Network infrastructure security', controlCount: 24, subdomains: [] },
  { code: 'PES', name: 'Physical & Environmental Security', description: 'Physical security controls', controlCount: 18, subdomains: [] },
  { code: 'PRV', name: 'Data Privacy', description: 'Data privacy and protection controls', controlCount: 22, subdomains: [] },
  { code: 'PRJ', name: 'Project & Resource Management', description: 'Security in project management', controlCount: 8, subdomains: [] },
  { code: 'RSK', name: 'Risk Management', description: 'Risk assessment and management', controlCount: 20, subdomains: [] },
  { code: 'SEA', name: 'Security Engineering & Architecture', description: 'Secure system design and architecture', controlCount: 18, subdomains: [] },
  { code: 'OPS', name: 'Security Operations', description: 'Day-to-day security operations', controlCount: 24, subdomains: [] },
  { code: 'SAT', name: 'Security Awareness & Training', description: 'Security training and awareness programs', controlCount: 12, subdomains: [] },
  { code: 'TDA', name: 'Technology Development & Acquisition', description: 'Security in technology development', controlCount: 14, subdomains: [] },
  { code: 'THM', name: 'Threat Management', description: 'Threat intelligence and management', controlCount: 16, subdomains: [] },
  { code: 'TPM', name: 'Third-Party Management', description: 'Managing third-party risks', controlCount: 18, subdomains: [] },
  { code: 'VPM', name: 'Vulnerability & Patch Management', description: 'Vulnerability assessment and patching', controlCount: 14, subdomains: [] },
  { code: 'WEB', name: 'Web Security', description: 'Web application security', controlCount: 16, subdomains: [] },
];

const FRAMEWORK_MAPPINGS: SCFFramework[] = [
  { code: 'NIST-800-53', name: 'NIST SP 800-53 Rev 5', version: '5.1.1', controlCount: 1095 },
  { code: 'NIST-CSF', name: 'NIST Cybersecurity Framework', version: '2.0', controlCount: 108 },
  { code: 'ISO-27001', name: 'ISO/IEC 27001:2022', version: '2022', controlCount: 114 },
  { code: 'ISO-27002', name: 'ISO/IEC 27002:2022', version: '2022', controlCount: 93 },
  { code: 'SOC2', name: 'SOC 2 Type II', version: '2017', controlCount: 119 },
  { code: 'PCI-DSS', name: 'Payment Card Industry Data Security Standard', version: '4.0', controlCount: 264 },
  { code: 'GDPR', name: 'General Data Protection Regulation', version: '2018', controlCount: 99 },
  { code: 'HIPAA', name: 'Health Insurance Portability and Accountability Act', version: '2013', controlCount: 75 },
  { code: 'CCPA', name: 'California Consumer Privacy Act', version: '2020', controlCount: 45 },
  { code: 'FedRAMP', name: 'Federal Risk and Authorization Management Program', version: 'Rev 5', controlCount: 432 },
  { code: 'CIS', name: 'CIS Controls', version: '8.1', controlCount: 153 },
  { code: 'COBIT', name: 'COBIT 2019', version: '2019', controlCount: 40 },
];

export class SCFDataLoader {
  private data: SCF2025Data | null = null;

  async load(): Promise<SCF2025Data> {
    if (this.data) {
      return this.data;
    }

    const data = this.buildSCFData();
    this.data = data;
    return data;
  }

  private buildSCFData(): SCF2025Data {
    const controls = this.generateControls();
    const threats = this.generateThreats();
    const risks = this.generateRisks();

    return {
      version: '2025.4',
      domains: SCF_2025_DOMAINS,
      controls,
      threats,
      risks,
      frameworks: FRAMEWORK_MAPPINGS,
      stats: {
        totalControls: controls.length,
        totalDomains: SCF_2025_DOMAINS.length,
        totalMappings: controls.reduce((sum, c) => sum + c.mappings.length, 0),
        totalThreats: threats.length,
        totalRisks: risks.length,
      },
    };
  }

  private generateControls(): SCFControl[] {
    const controls: SCFControl[] = [];
    
    const controlTemplates = [
      { prefix: 'GOV', count: 25, priority: 'high' as const },
      { prefix: 'IAM', count: 22, priority: 'critical' as const },
      { prefix: 'CLD', count: 28, priority: 'high' as const },
      { prefix: 'NET', count: 24, priority: 'high' as const },
      { prefix: 'END', count: 20, priority: 'high' as const },
      { prefix: 'IR', count: 22, priority: 'critical' as const },
      { prefix: 'PRV', count: 22, priority: 'critical' as const },
      { prefix: 'RSK', count: 20, priority: 'high' as const },
      { prefix: 'VPM', count: 14, priority: 'critical' as const },
      { prefix: 'THM', count: 16, priority: 'high' as const },
    ];

    for (const template of controlTemplates) {
      const domain = SCF_2025_DOMAINS.find(d => d.code === template.prefix);
      if (!domain) continue;

      for (let i = 1; i <= Math.min(template.count, 15); i++) {
        const controlCode = `${template.prefix}-${String(i).padStart(2, '0')}`;
        controls.push({
          id: `scf-${controlCode.toLowerCase()}`,
          domainCode: template.prefix,
          controlCode,
          name: this.generateControlName(template.prefix, i),
          description: `${domain.name} control ${i} for ensuring security and compliance`,
          requirements: [
            `Implement ${domain.name.toLowerCase()} procedures`,
            `Document and maintain evidence of compliance`,
            `Perform regular reviews and updates`,
          ],
          maturityLevel: Math.ceil(Math.random() * 5),
          priority: i <= 3 ? template.priority : 'medium',
          categories: [domain.name],
          mappings: this.generateMappings(controlCode),
          threats: [`NT-${Math.ceil(Math.random() * 10)}`, `MT-${Math.ceil(Math.random() * 15)}`],
          risks: [`R-${['AC', 'AM', 'BC', 'EX', 'GV', 'IR', 'SA', 'SC'][Math.floor(Math.random() * 8)]}`],
          relatedControls: [],
        });
      }
    }

    return controls;
  }

  private generateControlName(domain: string, index: number): string {
    const names: Record<string, string[]> = {
      GOV: ['Security Governance Framework', 'Security Policy Management', 'Roles and Responsibilities', 'Security Awareness Program'],
      IAM: ['Access Control Policy', 'Identity Management', 'Multi-Factor Authentication', 'Privileged Access Management'],
      CLD: ['Cloud Security Architecture', 'Cloud Access Controls', 'Cloud Data Protection', 'Cloud Monitoring'],
      NET: ['Network Segmentation', 'Firewall Management', 'Intrusion Detection', 'Network Monitoring'],
      END: ['Endpoint Protection', 'Device Management', 'Endpoint Detection and Response', 'Patch Management'],
      IR: ['Incident Response Plan', 'Incident Detection', 'Incident Containment', 'Incident Recovery'],
      PRV: ['Data Classification', 'Data Protection', 'Privacy Controls', 'Data Retention'],
      RSK: ['Risk Assessment', 'Risk Treatment', 'Risk Monitoring', 'Risk Reporting'],
      VPM: ['Vulnerability Scanning', 'Vulnerability Assessment', 'Patch Management', 'Vulnerability Remediation'],
      THM: ['Threat Intelligence', 'Threat Detection', 'Threat Hunting', 'Threat Response'],
    };

    const domainNames = names[domain] || ['Security Control'];
    return domainNames[(index - 1) % domainNames.length] || `${domain} Control ${index}`;
  }

  private generateMappings(controlCode: string): SCFMapping[] {
    const frameworks = ['NIST-800-53', 'ISO-27001', 'SOC2', 'PCI-DSS', 'CIS'];
    const count = Math.floor(Math.random() * 3) + 1;
    
    return frameworks.slice(0, count).map(framework => ({
      framework,
      controlId: `${framework}-${controlCode}`,
      coverage: Math.random() > 0.3 ? 'full' : 'partial',
    }));
  }

  private generateThreats(): SCFThreat[] {
    const naturalThreats: SCFThreat[] = [
      { code: 'NT-01', category: 'natural', name: 'Natural Disaster', description: 'Earthquakes, floods, hurricanes', likelihood: 'low', impact: 'severe' },
      { code: 'NT-02', category: 'natural', name: 'Extreme Weather', description: 'Severe storms, temperature extremes', likelihood: 'medium', impact: 'major' },
      { code: 'NT-03', category: 'natural', name: 'Pandemic', description: 'Health emergencies affecting operations', likelihood: 'low', impact: 'severe' },
    ];

    const humanThreats: SCFThreat[] = [
      { code: 'MT-01', category: 'human', name: 'Cyber Attack', description: 'External cyber attacks and intrusions', likelihood: 'high', impact: 'severe' },
      { code: 'MT-02', category: 'human', name: 'Insider Threat', description: 'Malicious or negligent insiders', likelihood: 'medium', impact: 'major' },
      { code: 'MT-03', category: 'human', name: 'Social Engineering', description: 'Phishing, pretexting, baiting', likelihood: 'high', impact: 'major' },
      { code: 'MT-04', category: 'human', name: 'Ransomware', description: 'Ransomware attacks encrypting data', likelihood: 'high', impact: 'severe' },
      { code: 'MT-05', category: 'human', name: 'Data Breach', description: 'Unauthorized access to sensitive data', likelihood: 'medium', impact: 'severe' },
      { code: 'MT-06', category: 'human', name: 'Supply Chain Attack', description: 'Attacks through third-party vendors', likelihood: 'medium', impact: 'major' },
      { code: 'MT-07', category: 'human', name: 'Advanced Persistent Threat', description: 'Sophisticated targeted attacks', likelihood: 'medium', impact: 'severe' },
      { code: 'MT-08', category: 'human', name: 'Denial of Service', description: 'DoS/DDoS attacks', likelihood: 'medium', impact: 'moderate' },
    ];

    return [...naturalThreats, ...humanThreats];
  }

  private generateRisks(): SCFRisk[] {
    return [
      { code: 'R-AC', category: 'Access Control', name: 'Access Control Risk', description: 'Inability to maintain individual accountability', affectedControls: ['IAM-01', 'IAM-02', 'IAM-03'] },
      { code: 'R-AM', category: 'Asset Management', name: 'Asset Management Risk', description: 'Assets lost, damaged, or stolen', affectedControls: ['AST-01', 'AST-02'] },
      { code: 'R-BC', category: 'Business Continuity', name: 'Business Continuity Risk', description: 'Business operations interrupted', affectedControls: ['BCD-01', 'BCD-02', 'BCD-03'] },
      { code: 'R-EX', category: 'Exposure', name: 'Exposure Risk', description: 'Revenue loss from security incidents', affectedControls: ['IR-01', 'RSK-01'] },
      { code: 'R-GV', category: 'Governance', name: 'Governance Risk', description: 'Unable to support business processes', affectedControls: ['GOV-01', 'GOV-02'] },
      { code: 'R-IR', category: 'Incident Response', name: 'Incident Response Risk', description: 'Unable to investigate or prosecute incidents', affectedControls: ['IR-01', 'IR-02', 'IR-03'] },
      { code: 'R-SA', category: 'Situational Awareness', name: 'Situational Awareness Risk', description: 'Unable to detect security events', affectedControls: ['MON-01', 'THM-01'] },
      { code: 'R-SC', category: 'Supply Chain', name: 'Supply Chain Risk', description: 'Third-party cybersecurity exposure', affectedControls: ['TPM-01', 'TPM-02'] },
    ];
  }

  getControlsByDomain(domainCode: string): SCFControl[] {
    if (!this.data) return [];
    return this.data.controls.filter(c => c.domainCode === domainCode);
  }

  getControlsByFramework(framework: string): SCFControl[] {
    if (!this.data) return [];
    return this.data.controls.filter(c => 
      c.mappings.some(m => m.framework === framework)
    );
  }

  search(query: string, limit = 50): SCFControl[] {
    if (!this.data) return [];
    
    const q = query.toLowerCase();
    return this.data.controls
      .filter(c => 
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.controlCode.toLowerCase().includes(q)
      )
      .slice(0, limit);
  }

  getStats(): SCF2025Data['stats'] {
    return this.data?.stats || {
      totalControls: 0,
      totalDomains: 0,
      totalMappings: 0,
      totalThreats: 0,
      totalRisks: 0,
    };
  }
}

export const scfDataLoader = new SCFDataLoader();
