import type { SCFDomain, SCFControl, SCFMapping, SCFData } from './types.js';

export const SCF_DOMAINS: SCFDomain[] = [
  {
    code: 'GOV',
    name: 'Cybersecurity & Data Protection Governance',
    description: 'Establish and maintain a cybersecurity governance program',
    controls: [
      {
        id: 'GOV-01',
        name: 'Cybersecurity Leadership',
        description: 'Establish executive-level cybersecurity leadership and accountability',
        category: 'governance',
        mappings: [
          { framework: 'NIST', controlId: 'GV.OC-01' },
          { framework: 'ISO27001', controlId: 'A.5.1' },
          { framework: 'SOC2', controlId: 'CC1.1' },
          { framework: 'CIS', controlId: '1.1' },
        ],
      },
      {
        id: 'GOV-02',
        name: 'Cybersecurity Policies',
        description: 'Document and maintain cybersecurity policies',
        category: 'governance',
        mappings: [
          { framework: 'NIST', controlId: 'GV.PO-01' },
          { framework: 'ISO27001', controlId: 'A.5.1.1' },
          { framework: 'SOC2', controlId: 'CC1.2' },
          { framework: 'PCI-DSS', controlId: '12.1' },
        ],
      },
      {
        id: 'GOV-03',
        name: 'Roles and Responsibilities',
        description: 'Define cybersecurity roles and responsibilities',
        category: 'governance',
        mappings: [
          { framework: 'NIST', controlId: 'GV.RR-01' },
          { framework: 'ISO27001', controlId: 'A.6.1.1' },
          { framework: 'SOC2', controlId: 'CC1.3' },
        ],
      },
      {
        id: 'GOV-04',
        name: 'Risk Management Program',
        description: 'Implement enterprise risk management',
        category: 'risk',
        mappings: [
          { framework: 'NIST', controlId: 'GV.RM-01' },
          { framework: 'ISO27001', controlId: 'A.5.1.2' },
          { framework: 'SOC2', controlId: 'CC3.1' },
        ],
      },
    ],
  },
  {
    code: 'IAM',
    name: 'Identity & Access Management',
    description: 'Manage identities and control access to systems and data',
    controls: [
      {
        id: 'IAM-01',
        name: 'Identity Management',
        description: 'Establish identity lifecycle management processes',
        category: 'access',
        mappings: [
          { framework: 'NIST', controlId: 'PR.AA-01' },
          { framework: 'ISO27001', controlId: 'A.9.2.1' },
          { framework: 'SOC2', controlId: 'CC6.1' },
          { framework: 'PCI-DSS', controlId: '8.1' },
        ],
      },
      {
        id: 'IAM-02',
        name: 'Access Control',
        description: 'Implement role-based access control',
        category: 'access',
        mappings: [
          { framework: 'NIST', controlId: 'PR.AA-02' },
          { framework: 'ISO27001', controlId: 'A.9.1.1' },
          { framework: 'SOC2', controlId: 'CC6.1' },
          { framework: 'CIS', controlId: '5.1' },
        ],
      },
      {
        id: 'IAM-03',
        name: 'Multi-Factor Authentication',
        description: 'Require MFA for privileged access',
        category: 'access',
        mappings: [
          { framework: 'NIST', controlId: 'PR.AA-03' },
          { framework: 'ISO27001', controlId: 'A.9.4.2' },
          { framework: 'PCI-DSS', controlId: '8.3' },
          { framework: 'CIS', controlId: '6.1' },
        ],
      },
      {
        id: 'IAM-04',
        name: 'Privileged Access Management',
        description: 'Manage and monitor privileged accounts',
        category: 'access',
        mappings: [
          { framework: 'NIST', controlId: 'PR.AA-04' },
          { framework: 'ISO27001', controlId: 'A.9.2.3' },
          { framework: 'SOC2', controlId: 'CC6.2' },
          { framework: 'CIS', controlId: '5.4' },
        ],
      },
      {
        id: 'IAM-05',
        name: 'Session Management',
        description: 'Control and monitor user sessions',
        category: 'access',
        mappings: [
          { framework: 'NIST', controlId: 'PR.AA-05' },
          { framework: 'ISO27001', controlId: 'A.9.4.2' },
          { framework: 'PCI-DSS', controlId: '8.1.8' },
        ],
      },
    ],
  },
  {
    code: 'AST',
    name: 'Asset Management',
    description: 'Identify and manage organizational assets',
    controls: [
      {
        id: 'AST-01',
        name: 'Asset Inventory',
        description: 'Maintain inventory of hardware assets',
        category: 'asset',
        mappings: [
          { framework: 'NIST', controlId: 'ID.AM-01' },
          { framework: 'ISO27001', controlId: 'A.8.1.1' },
          { framework: 'SOC2', controlId: 'CC6.1' },
          { framework: 'CIS', controlId: '1.1' },
        ],
      },
      {
        id: 'AST-02',
        name: 'Software Inventory',
        description: 'Maintain inventory of software assets',
        category: 'asset',
        mappings: [
          { framework: 'NIST', controlId: 'ID.AM-02' },
          { framework: 'ISO27001', controlId: 'A.8.1.2' },
          { framework: 'CIS', controlId: '2.1' },
        ],
      },
      {
        id: 'AST-03',
        name: 'Data Classification',
        description: 'Classify data based on sensitivity',
        category: 'data',
        mappings: [
          { framework: 'NIST', controlId: 'ID.AM-05' },
          { framework: 'ISO27001', controlId: 'A.8.2.1' },
          { framework: 'SOC2', controlId: 'CC6.1' },
          { framework: 'PCI-DSS', controlId: '12.3' },
        ],
      },
      {
        id: 'AST-04',
        name: 'Asset Ownership',
        description: 'Assign ownership for all assets',
        category: 'asset',
        mappings: [
          { framework: 'ISO27001', controlId: 'A.8.1.3' },
          { framework: 'SOC2', controlId: 'CC6.1' },
        ],
      },
    ],
  },
  {
    code: 'NET',
    name: 'Network Security',
    description: 'Secure network infrastructure and communications',
    controls: [
      {
        id: 'NET-01',
        name: 'Network Architecture',
        description: 'Design secure network architecture',
        category: 'network',
        mappings: [
          { framework: 'NIST', controlId: 'PR.AC-05' },
          { framework: 'ISO27001', controlId: 'A.13.1.1' },
          { framework: 'PCI-DSS', controlId: '1.1' },
          { framework: 'CIS', controlId: '12.1' },
        ],
      },
      {
        id: 'NET-02',
        name: 'Network Segmentation',
        description: 'Segment networks based on sensitivity',
        category: 'network',
        mappings: [
          { framework: 'NIST', controlId: 'PR.AC-05' },
          { framework: 'ISO27001', controlId: 'A.13.1.3' },
          { framework: 'PCI-DSS', controlId: '1.2' },
          { framework: 'CIS', controlId: '12.4' },
        ],
      },
      {
        id: 'NET-03',
        name: 'Firewall Management',
        description: 'Configure and manage firewalls',
        category: 'network',
        mappings: [
          { framework: 'NIST', controlId: 'PR.PT-04' },
          { framework: 'ISO27001', controlId: 'A.13.1.1' },
          { framework: 'PCI-DSS', controlId: '1.1' },
          { framework: 'CIS', controlId: '12.1' },
        ],
      },
      {
        id: 'NET-04',
        name: 'Intrusion Detection',
        description: 'Monitor for network intrusions',
        category: 'monitoring',
        mappings: [
          { framework: 'NIST', controlId: 'DE.CM-01' },
          { framework: 'ISO27001', controlId: 'A.12.4' },
          { framework: 'PCI-DSS', controlId: '11.4' },
        ],
      },
    ],
  },
  {
    code: 'END',
    name: 'Endpoint Security',
    description: 'Secure endpoints including workstations and mobile devices',
    controls: [
      {
        id: 'END-01',
        name: 'Endpoint Protection',
        description: 'Deploy endpoint protection solutions',
        category: 'endpoint',
        mappings: [
          { framework: 'NIST', controlId: 'PR.IP-01' },
          { framework: 'ISO27001', controlId: 'A.12.2.1' },
          { framework: 'CIS', controlId: '10.1' },
        ],
      },
      {
        id: 'END-02',
        name: 'Endpoint Hardening',
        description: 'Harden endpoint configurations',
        category: 'endpoint',
        mappings: [
          { framework: 'NIST', controlId: 'PR.IP-01' },
          { framework: 'ISO27001', controlId: 'A.11.2.1' },
          { framework: 'CIS', controlId: '2.2' },
        ],
      },
      {
        id: 'END-03',
        name: 'Patch Management',
        description: 'Manage endpoint patches and updates',
        category: 'vulnerability',
        mappings: [
          { framework: 'NIST', controlId: 'PR.IP-12' },
          { framework: 'ISO27001', controlId: 'A.12.6.1' },
          { framework: 'PCI-DSS', controlId: '6.1' },
          { framework: 'CIS', controlId: '3.1' },
        ],
      },
    ],
  },
  {
    code: 'VPM',
    name: 'Vulnerability & Patch Management',
    description: 'Identify and remediate vulnerabilities',
    controls: [
      {
        id: 'VPM-01',
        name: 'Vulnerability Scanning',
        description: 'Conduct regular vulnerability scans',
        category: 'vulnerability',
        mappings: [
          { framework: 'NIST', controlId: 'ID.RA-01' },
          { framework: 'ISO27001', controlId: 'A.12.6.1' },
          { framework: 'PCI-DSS', controlId: '11.2' },
          { framework: 'CIS', controlId: '3.1' },
        ],
      },
      {
        id: 'VPM-02',
        name: 'Vulnerability Remediation',
        description: 'Remediate identified vulnerabilities',
        category: 'vulnerability',
        mappings: [
          { framework: 'NIST', controlId: 'RS.MI-01' },
          { framework: 'ISO27001', controlId: 'A.12.6.1' },
          { framework: 'PCI-DSS', controlId: '6.1' },
          { framework: 'CIS', controlId: '3.2' },
        ],
      },
      {
        id: 'VPM-03',
        name: 'Patch Management Process',
        description: 'Establish patch management procedures',
        category: 'vulnerability',
        mappings: [
          { framework: 'NIST', controlId: 'PR.IP-12' },
          { framework: 'ISO27001', controlId: 'A.12.6.1' },
          { framework: 'PCI-DSS', controlId: '6.2' },
        ],
      },
    ],
  },
  {
    code: 'IR',
    name: 'Incident Response',
    description: 'Detect, respond to, and recover from incidents',
    controls: [
      {
        id: 'IR-01',
        name: 'Incident Response Plan',
        description: 'Maintain incident response procedures',
        category: 'incident',
        mappings: [
          { framework: 'NIST', controlId: 'RS.RP-01' },
          { framework: 'ISO27001', controlId: 'A.16.1.1' },
          { framework: 'SOC2', controlId: 'CC7.4' },
          { framework: 'PCI-DSS', controlId: '12.10' },
        ],
      },
      {
        id: 'IR-02',
        name: 'Incident Detection',
        description: 'Detect security incidents',
        category: 'incident',
        mappings: [
          { framework: 'NIST', controlId: 'DE.AE-01' },
          { framework: 'ISO27001', controlId: 'A.12.4' },
          { framework: 'SOC2', controlId: 'CC7.1' },
        ],
      },
      {
        id: 'IR-03',
        name: 'Incident Response Team',
        description: 'Establish incident response team',
        category: 'incident',
        mappings: [
          { framework: 'NIST', controlId: 'RS.CO-01' },
          { framework: 'ISO27001', controlId: 'A.16.1.1' },
          { framework: 'SOC2', controlId: 'CC7.4' },
        ],
      },
      {
        id: 'IR-04',
        name: 'Incident Analysis',
        description: 'Analyze and investigate incidents',
        category: 'incident',
        mappings: [
          { framework: 'NIST', controlId: 'RS.AN-01' },
          { framework: 'ISO27001', controlId: 'A.16.1.4' },
          { framework: 'SOC2', controlId: 'CC7.2' },
        ],
      },
    ],
  },
  {
    code: 'BCD',
    name: 'Business Continuity & Disaster Recovery',
    description: 'Ensure business continuity and recovery capabilities',
    controls: [
      {
        id: 'BCD-01',
        name: 'Business Continuity Plan',
        description: 'Maintain business continuity procedures',
        category: 'continuity',
        mappings: [
          { framework: 'NIST', controlId: 'PR.IP-09' },
          { framework: 'ISO27001', controlId: 'A.17.1.1' },
          { framework: 'SOC2', controlId: 'A1.1' },
        ],
      },
      {
        id: 'BCD-02',
        name: 'Disaster Recovery Plan',
        description: 'Maintain disaster recovery procedures',
        category: 'continuity',
        mappings: [
          { framework: 'NIST', controlId: 'PR.IP-09' },
          { framework: 'ISO27001', controlId: 'A.17.1.2' },
          { framework: 'SOC2', controlId: 'A1.2' },
        ],
      },
      {
        id: 'BCD-03',
        name: 'Backup and Recovery',
        description: 'Implement backup and recovery procedures',
        category: 'continuity',
        mappings: [
          { framework: 'NIST', controlId: 'PR.IP-04' },
          { framework: 'ISO27001', controlId: 'A.12.3.1' },
          { framework: 'PCI-DSS', controlId: '12.3.2' },
          { framework: 'CIS', controlId: '11.1' },
        ],
      },
    ],
  },
  {
    code: 'CRY',
    name: 'Cryptography',
    description: 'Protect data using cryptographic controls',
    controls: [
      {
        id: 'CRY-01',
        name: 'Encryption Policy',
        description: 'Establish encryption policies',
        category: 'data',
        mappings: [
          { framework: 'NIST', controlId: 'PR.DS-01' },
          { framework: 'ISO27001', controlId: 'A.10.1.1' },
          { framework: 'PCI-DSS', controlId: '3.4' },
        ],
      },
      {
        id: 'CRY-02',
        name: 'Encryption at Rest',
        description: 'Encrypt data at rest',
        category: 'data',
        mappings: [
          { framework: 'NIST', controlId: 'PR.DS-01' },
          { framework: 'ISO27001', controlId: 'A.10.1.1' },
          { framework: 'PCI-DSS', controlId: '3.4' },
        ],
      },
      {
        id: 'CRY-03',
        name: 'Encryption in Transit',
        description: 'Encrypt data in transit',
        category: 'data',
        mappings: [
          { framework: 'NIST', controlId: 'PR.DS-02' },
          { framework: 'ISO27001', controlId: 'A.10.1.1' },
          { framework: 'PCI-DSS', controlId: '4.1' },
        ],
      },
      {
        id: 'CRY-04',
        name: 'Key Management',
        description: 'Manage cryptographic keys',
        category: 'data',
        mappings: [
          { framework: 'NIST', controlId: 'PR.DS-01' },
          { framework: 'ISO27001', controlId: 'A.10.1.2' },
          { framework: 'PCI-DSS', controlId: '3.5' },
        ],
      },
    ],
  },
  {
    code: 'MON',
    name: 'Continuous Monitoring',
    description: 'Monitor systems and detect anomalies',
    controls: [
      {
        id: 'MON-01',
        name: 'Security Monitoring',
        description: 'Implement continuous security monitoring',
        category: 'monitoring',
        mappings: [
          { framework: 'NIST', controlId: 'DE.CM-01' },
          { framework: 'ISO27001', controlId: 'A.12.4' },
          { framework: 'SOC2', controlId: 'CC7.1' },
          { framework: 'PCI-DSS', controlId: '10.1' },
        ],
      },
      {
        id: 'MON-02',
        name: 'Log Management',
        description: 'Collect and analyze security logs',
        category: 'monitoring',
        mappings: [
          { framework: 'NIST', controlId: 'DE.AE-03' },
          { framework: 'ISO27001', controlId: 'A.12.4.1' },
          { framework: 'PCI-DSS', controlId: '10.2' },
          { framework: 'CIS', controlId: '8.1' },
        ],
      },
      {
        id: 'MON-03',
        name: 'SIEM',
        description: 'Implement SIEM solution',
        category: 'monitoring',
        mappings: [
          { framework: 'NIST', controlId: 'DE.AE-03' },
          { framework: 'SOC2', controlId: 'CC7.2' },
          { framework: 'PCI-DSS', controlId: '10.5' },
        ],
      },
    ],
  },
  {
    code: 'SAT',
    name: 'Security Awareness & Training',
    description: 'Train personnel on security practices',
    controls: [
      {
        id: 'SAT-01',
        name: 'Security Awareness Program',
        description: 'Implement security awareness program',
        category: 'training',
        mappings: [
          { framework: 'NIST', controlId: 'PR.AT-01' },
          { framework: 'ISO27001', controlId: 'A.7.2.2' },
          { framework: 'SOC2', controlId: 'CC1.4' },
          { framework: 'PCI-DSS', controlId: '12.6' },
        ],
      },
      {
        id: 'SAT-02',
        name: 'Role-Based Training',
        description: 'Provide role-specific security training',
        category: 'training',
        mappings: [
          { framework: 'NIST', controlId: 'PR.AT-02' },
          { framework: 'ISO27001', controlId: 'A.7.2.2' },
        ],
      },
      {
        id: 'SAT-03',
        name: 'Phishing Awareness',
        description: 'Conduct phishing awareness training',
        category: 'training',
        mappings: [
          { framework: 'NIST', controlId: 'PR.AT-01' },
          { framework: 'SOC2', controlId: 'CC1.4' },
        ],
      },
    ],
  },
  {
    code: 'THM',
    name: 'Threat Management',
    description: 'Manage threats to the organization',
    controls: [
      {
        id: 'THM-01',
        name: 'Threat Intelligence',
        description: 'Collect and analyze threat intelligence',
        category: 'threat',
        mappings: [
          { framework: 'NIST', controlId: 'ID.RA-02' },
          { framework: 'ISO27001', controlId: 'A.16.1.4' },
        ],
      },
      {
        id: 'THM-02',
        name: 'Threat Hunting',
        description: 'Proactively search for threats',
        category: 'threat',
        mappings: [
          { framework: 'NIST', controlId: 'DE.AE-01' },
        ],
      },
      {
        id: 'THM-03',
        name: 'Penetration Testing',
        description: 'Conduct regular penetration tests',
        category: 'assessment',
        mappings: [
          { framework: 'NIST', controlId: 'ID.RA-01' },
          { framework: 'ISO27001', controlId: 'A.12.6.1' },
          { framework: 'PCI-DSS', controlId: '11.3' },
        ],
      },
    ],
  },
  {
    code: 'TPM',
    name: 'Third-Party Management',
    description: 'Manage third-party and supply chain risks',
    controls: [
      {
        id: 'TPM-01',
        name: 'Vendor Risk Assessment',
        description: 'Assess third-party security risks',
        category: 'third-party',
        mappings: [
          { framework: 'NIST', controlId: 'ID.SC-01' },
          { framework: 'ISO27001', controlId: 'A.15.1.1' },
          { framework: 'SOC2', controlId: 'CC9.2' },
          { framework: 'PCI-DSS', controlId: '12.8' },
        ],
      },
      {
        id: 'TPM-02',
        name: 'Vendor Contracts',
        description: 'Include security in vendor contracts',
        category: 'third-party',
        mappings: [
          { framework: 'NIST', controlId: 'ID.SC-02' },
          { framework: 'ISO27001', controlId: 'A.15.1.2' },
        ],
      },
      {
        id: 'TPM-03',
        name: 'Vendor Monitoring',
        description: 'Monitor vendor security posture',
        category: 'third-party',
        mappings: [
          { framework: 'NIST', controlId: 'ID.SC-03' },
          { framework: 'ISO27001', controlId: 'A.15.1.3' },
        ],
      },
    ],
  },
];

export const SCF_ALL_DATA: SCFData = {
  domains: SCF_DOMAINS,
  version: '2025.4',
  source: 'Secure Controls Framework (SCF) Council',
};

export function getSCFDomain(code: string): SCFDomain | undefined {
  return SCF_DOMAINS.find(d => d.code === code);
}

export function getSCFControl(controlId: string): SCFControl | undefined {
  for (const domain of SCF_DOMAINS) {
    const control = domain.controls.find(c => c.id === controlId);
    if (control) return control;
  }
  return undefined;
}

export function getSCFControlsByFramework(framework: string): SCFControl[] {
  const controls: SCFControl[] = [];
  for (const domain of SCF_DOMAINS) {
    for (const control of domain.controls) {
      if (control.mappings.some(m => m.framework === framework)) {
        controls.push(control);
      }
    }
  }
  return controls;
}

export function getSCFControlsByCategory(category: string): SCFControl[] {
  const controls: SCFControl[] = [];
  for (const domain of SCF_DOMAINS) {
    for (const control of domain.controls) {
      if (control.category === category) {
        controls.push(control);
      }
    }
  }
  return controls;
}

export function getSCFStats(): {
  totalDomains: number;
  totalControls: number;
  frameworks: string[];
  categories: string[];
} {
  const frameworks = new Set<string>();
  const categories = new Set<string>();
  let totalControls = 0;

  for (const domain of SCF_DOMAINS) {
    totalControls += domain.controls.length;
    for (const control of domain.controls) {
      categories.add(control.category);
      for (const mapping of control.mappings) {
        frameworks.add(mapping.framework);
      }
    }
  }

  return {
    totalDomains: SCF_DOMAINS.length,
    totalControls,
    frameworks: Array.from(frameworks),
    categories: Array.from(categories),
  };
}
