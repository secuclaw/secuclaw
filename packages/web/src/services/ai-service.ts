// AI Service - Stub implementation for topic detection

export async function detectTopic(text: string): Promise<string> {
  // Simple keyword-based detection (stub)
  const keywords: Record<string, string[]> = {
    'vulnerability': ['漏洞', 'cve', 'vuln', 'exploit', '攻击'],
    'incident': ['事件', 'incident', '告警', 'alert', '应急'],
    'compliance': ['合规', 'compliance', '审计', 'audit', 'iso'],
    'threat': ['威胁', 'threat', '恶意', 'malware', 'apt'],
    'network': ['网络', 'network', '流量', 'traffic', '防火墙'],
  };

  const lowerText = text.toLowerCase();
  for (const [topic, words] of Object.entries(keywords)) {
    if (words.some(w => lowerText.includes(w))) {
      return topic;
    }
  }
  return 'general';
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function sendChatMessage(
  messages: ChatMessage[],
  roleId: string
): Promise<string> {
  // Stub - will connect to backend later
  return '这是安全助手。请描述您遇到的安全问题。';
}
