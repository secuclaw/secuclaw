import React from 'react';
import { KnowledgeManagementConsole } from './KnowledgeManagementConsole';
import { useKnowledgeBase } from '../../hooks/useKnowledgeBase';
import { useWebSocket } from '../../context/WebSocketContext';
import type { KnowledgeArticle, Skill, CaseRecord } from './KnowledgeManagementConsole';

export const ConnectedKnowledgeManagementConsole: React.FC = () => {
  const { mitre, scf, loading, error } = useKnowledgeBase();
  const { connected } = useWebSocket();

  const [articles, setArticles] = React.useState<KnowledgeArticle[]>([]);
  const [skills, setSkills] = React.useState<Skill[]>([]);
  const [cases, setCases] = React.useState<CaseRecord[]>([]);

  React.useEffect(() => {
    const articlesFromMitre: KnowledgeArticle[] = mitre.tactics.map((tactic, i) => ({
      id: `article-mitre-${i}`,
      title: `${tactic.name} 战术分析`,
      category: 'reference' as const,
      tags: ['MITRE', tactic.name, 'ATT&CK'],
      content: tactic.description,
      author: 'Security Team',
      createdAt: new Date(),
      updatedAt: new Date(),
      version: '1.0',
      views: Math.floor(Math.random() * 500) + 100,
      rating: 4 + Math.random(),
    }));

    const articlesFromSCF: KnowledgeArticle[] = scf.domains.slice(0, 5).map((domain, i) => ({
      id: `article-scf-${i}`,
      title: `${domain.name} 控制指南`,
      category: 'guide' as const,
      tags: ['SCF', domain.code, '合规'],
      content: domain.description,
      author: 'Compliance Team',
      createdAt: new Date(),
      updatedAt: new Date(),
      version: '1.0',
      views: Math.floor(Math.random() * 300) + 50,
      rating: 4 + Math.random(),
    }));

    setArticles([...articlesFromMitre, ...articlesFromSCF]);
  }, [mitre.tactics, scf.domains]);

  React.useEffect(() => {
    setSkills([
      { id: 'skill-1', name: '威胁狩猎助手', description: '基于MITRE ATT&CK框架进行主动威胁狩猎', category: '威胁检测', version: '2.1.0', author: 'Security Labs', downloads: 15420, rating: 4.8, installed: true },
      { id: 'skill-2', name: '事件响应自动化', description: '自动化事件响应流程和剧本执行', category: '事件响应', version: '1.5.0', author: 'Incident Team', downloads: 8920, rating: 4.6, installed: true },
      { id: 'skill-3', name: '漏洞优先级分析', description: '基于风险和资产的漏洞优先级排序', category: '漏洞管理', version: '3.0.0', author: 'Vuln Team', downloads: 12300, rating: 4.7, installed: true },
      { id: 'skill-4', name: 'APT溯源分析', description: '高级持续性威胁溯源和归因分析', category: '威胁情报', version: '1.2.0', author: 'Threat Intel', downloads: 5620, rating: 4.5, installed: false },
      { id: 'skill-5', name: '合规差距扫描', description: '自动化合规差距分析和报告生成', category: '合规', version: '2.0.0', author: 'Compliance', downloads: 7800, rating: 4.4, installed: false },
      { id: 'skill-6', name: '红队模拟器', description: '基于MITRE ATT&CK的攻击模拟工具', category: '红队', version: '1.8.0', author: 'Red Team', downloads: 4200, rating: 4.9, installed: false },
    ]);
  }, []);

  React.useEffect(() => {
    setCases([
      { id: 'case-1', title: 'APT29 鱼叉式钓鱼攻击', incidentType: '钓鱼攻击', severity: 'critical', summary: '检测到针对高管的定向钓鱼攻击', timeline: [], lessons: ['加强邮件过滤', '提升员工意识'], mitreTactics: ['Initial Access', 'Credential Access'], resolution: '已阻断并溯源', createdBy: 'SOC', createdAt: new Date('2024-01-15') },
      { id: 'case-2', title: '勒索软件 WannaCry 变种', incidentType: '勒索软件', severity: 'critical', summary: '检测到WannaCry变种在局域网传播', timeline: [], lessons: ['及时打补丁', '隔离横向移动'], mitreTactics: ['Lateral Movement', 'Impact'], resolution: '已清除并恢复', createdBy: 'IR Team', createdAt: new Date('2024-02-01') },
      { id: 'case-3', title: '内部数据泄露事件', incidentType: '数据泄露', severity: 'high', summary: '检测到员工异常数据下载行为', timeline: [], lessons: ['DLP规则优化', '用户行为分析'], mitreTactics: ['Collection', 'Exfiltration'], resolution: '已处理并加固', createdBy: 'DLP', createdAt: new Date('2024-02-10') },
    ]);
  }, []);

  const handleArticleCreate = React.useCallback(async (article: Partial<KnowledgeArticle>) => {
    const newArticle: KnowledgeArticle = {
      id: `article-${Date.now()}`,
      title: article.title || 'New Article',
      category: article.category || 'guide',
      tags: article.tags || [],
      content: article.content || '',
      author: 'Current User',
      createdAt: new Date(),
      updatedAt: new Date(),
      version: '1.0',
      views: 0,
      rating: 0,
    };
    setArticles(prev => [newArticle, ...prev]);
  }, []);

  const handleArticleUpdate = React.useCallback(async (id: string, updates: Partial<KnowledgeArticle>) => {
    setArticles(prev => prev.map(a => a.id === id ? { ...a, ...updates, updatedAt: new Date() } : a));
  }, []);

  const handleSkillInstall = React.useCallback(async (skillId: string) => {
    setSkills(prev => prev.map(s => s.id === skillId ? { ...s, installed: true } : s));
  }, []);

  const handleSkillUninstall = React.useCallback(async (skillId: string) => {
    setSkills(prev => prev.map(s => s.id === skillId ? { ...s, installed: false } : s));
  }, []);

  const handleCaseCreate = React.useCallback(async (caseRecord: Partial<CaseRecord>) => {
    const newCase: CaseRecord = {
      id: `case-${Date.now()}`,
      title: caseRecord.title || 'New Case',
      incidentType: caseRecord.incidentType || 'Unknown',
      severity: caseRecord.severity || 'medium',
      summary: caseRecord.summary || '',
      timeline: caseRecord.timeline || [],
      lessons: caseRecord.lessons || [],
      mitreTactics: caseRecord.mitreTactics || [],
      resolution: caseRecord.resolution || '',
      createdBy: 'Current User',
      createdAt: new Date(),
    };
    setCases(prev => [newCase, ...prev]);
  }, []);

  if (loading && articles.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div>加载知识库...</div>
        </div>
      </div>
    );
  }

  if (error && articles.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center text-red-500">
          <div className="text-xl mb-2">⚠️ 加载失败</div>
          <div>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full relative">
      <div className="absolute top-2 right-2 z-10 flex gap-2">
        <div className={`px-2 py-1 rounded text-xs ${connected ? 'bg-green-600' : 'bg-red-600'} text-white`}>
          {connected ? '🟢 实时连接' : '🔴 离线'}
        </div>
      </div>
      <KnowledgeManagementConsole
        articles={articles}
        skills={skills}
        cases={cases}
        onArticleCreate={handleArticleCreate}
        onArticleUpdate={handleArticleUpdate}
        onSkillInstall={handleSkillInstall}
        onSkillUninstall={handleSkillUninstall}
        onCaseCreate={handleCaseCreate}
      />
    </div>
  );
};

export default ConnectedKnowledgeManagementConsole;
