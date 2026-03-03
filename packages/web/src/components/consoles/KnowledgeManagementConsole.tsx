import React, { useState, useMemo } from 'react';

export interface KnowledgeArticle {
  id: string;
  title: string;
  category: 'playbook' | 'runbook' | 'guide' | 'reference' | 'case_study';
  tags: string[];
  content: string;
  author: string;
  createdAt: Date;
  updatedAt: Date;
  version: string;
  views: number;
  rating: number;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  author: string;
  downloads: number;
  rating: number;
  installed: boolean;
}

export interface CaseRecord {
  id: string;
  title: string;
  incidentType: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  summary: string;
  timeline: { time: Date; action: string; result: string }[];
  lessons: string[];
  mitreTactics: string[];
  resolution: string;
  createdBy: string;
  createdAt: Date;
}

interface KnowledgeManagementConsoleProps {
  articles: KnowledgeArticle[];
  skills: Skill[];
  cases: CaseRecord[];
  onArticleCreate: (article: Partial<KnowledgeArticle>) => Promise<void>;
  onArticleUpdate: (id: string, updates: Partial<KnowledgeArticle>) => Promise<void>;
  onSkillInstall: (skillId: string) => Promise<void>;
  onSkillUninstall: (skillId: string) => Promise<void>;
  onCaseCreate: (caseRecord: Partial<CaseRecord>) => Promise<void>;
}

export const KnowledgeManagementConsole: React.FC<KnowledgeManagementConsoleProps> = ({
  articles,
  skills,
  cases,
  onArticleCreate,
  onArticleUpdate,
  onSkillInstall,
  onSkillUninstall,
  onCaseCreate,
}) => {
  const [selectedTab, setSelectedTab] = useState<'knowledge' | 'skills' | 'cases' | 'learning'>('knowledge');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null);

  const filteredArticles = useMemo(() => {
    let result = articles;
    if (selectedCategory !== 'all') {
      result = result.filter(a => a.category === selectedCategory);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(a =>
        a.title.toLowerCase().includes(query) ||
        a.tags.some(t => t.toLowerCase().includes(query))
      );
    }
    return result;
  }, [articles, selectedCategory, searchQuery]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'playbook': return '📖';
      case 'runbook': return '📋';
      case 'guide': return '📚';
      case 'reference': return '📑';
      case 'case_study': return '🔬';
      default: return '📄';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'playbook': return 'Playbook';
      case 'runbook': return 'Runbook';
      case 'guide': return '指南';
      case 'reference': return '参考文档';
      case 'case_study': return '案例研究';
      default: return category;
    }
  };

  return (
    <div className="knowledge-management-console h-full flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 px-6 py-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">知识管理控制台</h1>
          <div className="flex items-center gap-4">
            <div className="relative">
              <input
                type="text"
                placeholder="搜索知识库..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded px-3 py-2 pl-10 w-64"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            </div>
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded">
              + 创建内容
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4 p-4 bg-gray-800/50">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-gray-400 text-sm">知识文章</div>
          <div className="text-3xl font-bold">{articles.length}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-gray-400 text-sm">技能包</div>
          <div className="text-3xl font-bold">{skills.filter(s => s.installed).length}/{skills.length}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-gray-400 text-sm">案例库</div>
          <div className="text-3xl font-bold">{cases.length}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-gray-400 text-sm">本月学习</div>
          <div className="text-3xl font-bold text-green-500">+12</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-700 px-6">
        <div className="flex gap-6">
          {[
            { key: 'knowledge', label: '知识库' },
            { key: 'skills', label: '技能市场' },
            { key: 'cases', label: '案例库' },
            { key: 'learning', label: '自学习' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSelectedTab(key as typeof selectedTab)}
              className={`py-3 px-1 border-b-2 transition-colors ${
                selectedTab === key
                  ? 'border-blue-500 text-blue-500'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-6">
        {selectedTab === 'knowledge' && (
          <div className="grid grid-cols-3 gap-6">
            {/* Category Filter */}
            <div className="col-span-1 space-y-4">
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <h3 className="font-semibold mb-3">分类筛选</h3>
                <div className="space-y-2">
                  {['all', 'playbook', 'runbook', 'guide', 'reference', 'case_study'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`w-full text-left p-2 rounded flex items-center gap-2 ${
                        selectedCategory === cat ? 'bg-blue-600' : 'bg-gray-700/50 hover:bg-gray-700'
                      }`}
                    >
                      <span>{cat === 'all' ? '📚' : getCategoryIcon(cat)}</span>
                      <span>{cat === 'all' ? '全部' : getCategoryLabel(cat)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Popular Tags */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <h3 className="font-semibold mb-3">热门标签</h3>
                <div className="flex flex-wrap gap-2">
                  {['MITRE', '勒索软件', '钓鱼', 'APT', '零日漏洞', '横向移动', '凭证窃取', 'C2'].map(tag => (
                    <button
                      key={tag}
                      onClick={() => setSearchQuery(tag)}
                      className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <h3 className="font-semibold mb-3">最近更新</h3>
                <div className="space-y-2">
                  {articles.slice(0, 5).map(article => (
                    <div key={article.id} className="text-sm">
                      <div className="font-medium truncate">{article.title}</div>
                      <div className="text-gray-400 text-xs">
                        {new Date(article.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Article List */}
            <div className="col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">{filteredArticles.length} 篇文章</span>
                <select className="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-sm">
                  <option>最近更新</option>
                  <option>最多浏览</option>
                  <option>最高评分</option>
                </select>
              </div>

              {filteredArticles.map(article => (
                <div
                  key={article.id}
                  onClick={() => setSelectedArticle(article)}
                  className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-blue-500 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{getCategoryIcon(article.category)}</span>
                      <div>
                        <h3 className="font-medium">{article.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-gray-400">{article.author}</span>
                          <span className="text-gray-600">·</span>
                          <span className="text-sm text-gray-400">
                            {new Date(article.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-yellow-400">{'★'.repeat(Math.round(article.rating))}{'☆'.repeat(5 - Math.round(article.rating))}</div>
                      <div className="text-sm text-gray-400">{article.views} 次浏览</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-3">
                    {article.tags.map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-gray-700 rounded text-xs">{tag}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedTab === 'skills' && (
          <div className="space-y-6">
            {/* Installed Skills */}
            <div>
              <h3 className="text-lg font-semibold mb-4">已安装技能</h3>
              <div className="grid grid-cols-3 gap-4">
                {skills.filter(s => s.installed).map(skill => (
                  <div key={skill.id} className="bg-gray-800 rounded-lg p-4 border border-blue-500">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{skill.name}</h4>
                      <span className="px-2 py-0.5 bg-green-600 rounded text-xs">已安装</span>
                    </div>
                    <p className="text-sm text-gray-400 mb-3">{skill.description}</p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">v{skill.version}</span>
                      <button
                        onClick={() => onSkillUninstall(skill.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        卸载
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Available Skills */}
            <div>
              <h3 className="text-lg font-semibold mb-4">可用技能</h3>
              <div className="grid grid-cols-3 gap-4">
                {skills.filter(s => !s.installed).map(skill => (
                  <div key={skill.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{skill.name}</h4>
                      <div className="text-yellow-400 text-sm">
                        {'★'.repeat(Math.round(skill.rating))}
                      </div>
                    </div>
                    <p className="text-sm text-gray-400 mb-3">{skill.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-400">
                        <span>{skill.downloads} 次下载</span>
                        <span className="mx-2">·</span>
                        <span>{skill.category}</span>
                      </div>
                      <button
                        onClick={() => onSkillInstall(skill.id)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                      >
                        安装
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'cases' && (
          <div className="space-y-4">
            {/* Case Stats */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="text-sm text-gray-400">总案例数</div>
                <div className="text-2xl font-bold">{cases.length}</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="text-sm text-gray-400">严重事件</div>
                <div className="text-2xl font-bold text-red-500">
                  {cases.filter(c => c.severity === 'critical').length}
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="text-sm text-gray-400">本季度新增</div>
                <div className="text-2xl font-bold text-green-500">8</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="text-sm text-gray-400">经验教训</div>
                <div className="text-2xl font-bold">156</div>
              </div>
            </div>

            {/* Case List */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="text-left p-3">案例名称</th>
                    <th className="text-left p-3">类型</th>
                    <th className="text-left p-3">严重程度</th>
                    <th className="text-left p-3">MITRE 战术</th>
                    <th className="text-left p-3">创建时间</th>
                    <th className="text-left p-3">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map(caseRecord => (
                    <tr key={caseRecord.id} className="border-t border-gray-700 hover:bg-gray-700/50">
                      <td className="p-3">
                        <div className="font-medium">{caseRecord.title}</div>
                        <div className="text-sm text-gray-400">{caseRecord.summary}</div>
                      </td>
                      <td className="p-3 text-gray-400">{caseRecord.incidentType}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          caseRecord.severity === 'critical' ? 'bg-red-600' :
                          caseRecord.severity === 'high' ? 'bg-orange-600' :
                          caseRecord.severity === 'medium' ? 'bg-yellow-600' : 'bg-green-600'
                        }`}>
                          {caseRecord.severity}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {caseRecord.mitreTactics.slice(0, 2).map(tactic => (
                            <span key={tactic} className="px-2 py-0.5 bg-purple-600/50 rounded text-xs">
                              {tactic}
                            </span>
                          ))}
                          {caseRecord.mitreTactics.length > 2 && (
                            <span className="px-2 py-0.5 bg-gray-600 rounded text-xs">
                              +{caseRecord.mitreTactics.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-gray-400 text-sm">
                        {new Date(caseRecord.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <button className="text-blue-400 hover:text-blue-300 text-sm">查看</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={() => onCaseCreate({})}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
            >
              + 添加案例
            </button>
          </div>
        )}

        {selectedTab === 'learning' && (
          <div className="space-y-6">
            {/* Self-Learning Overview */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <h3 className="text-lg font-semibold mb-4">自学习引擎</h3>
                <p className="text-gray-400 text-sm mb-4">
                  系统自动从历史事件、威胁情报和社区反馈中学习，持续提升检测和响应能力。
                </p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">模型版本</span>
                    <span className="font-mono text-blue-400">v2.4.1</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">上次训练</span>
                    <span className="text-gray-400">2小时前</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">训练样本</span>
                    <span className="text-gray-400">1.2M</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">准确率</span>
                    <span className="text-green-400">94.7%</span>
                  </div>
                </div>
                <button className="w-full mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded">
                  手动触发训练
                </button>
              </div>

              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <h3 className="text-lg font-semibold mb-4">学习来源</h3>
                <div className="space-y-3">
                  {[
                    { source: '安全事件', count: 15420, enabled: true },
                    { source: '威胁情报', count: 89234, enabled: true },
                    { source: '社区反馈', count: 3421, enabled: true },
                    { source: '误报标注', count: 892, enabled: true },
                    { source: '红队演练', count: 156, enabled: false },
                  ].map(item => (
                    <div key={item.source} className="flex items-center justify-between p-2 bg-gray-700/50 rounded">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={item.enabled} className="rounded" readOnly />
                        <span>{item.source}</span>
                      </div>
                      <span className="text-gray-400 text-sm">{item.count.toLocaleString()} 条</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Learning Progress */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4">学习进度</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">威胁检测模型</span>
                    <span className="text-green-400 text-sm">已完成</span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500" style={{ width: '100%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">响应建议模型</span>
                    <span className="text-blue-400 text-sm">训练中 78%</span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: '78%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">误报过滤模型</span>
                    <span className="text-gray-400 text-sm">等待中</span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gray-500" style={{ width: '0%' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Learnings */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4">最近学习成果</h3>
              <div className="space-y-3">
                {[
                  { type: 'new_pattern', desc: '识别到新型钓鱼邮件模板', confidence: 0.92, time: '10分钟前' },
                  { type: 'ioc_update', desc: '更新 Cobalt Strike C2 检测规则', confidence: 0.98, time: '1小时前' },
                  { type: 'false_positive', desc: '标记误报: 内部扫描活动', confidence: 0.95, time: '2小时前' },
                  { type: 'tactic', desc: '学习 APT29 新TTP模式', confidence: 0.87, time: '3小时前' },
                ].map((item, idx) => (
                  <div key={idx} className="p-3 bg-gray-700/50 rounded">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          item.type === 'new_pattern' ? 'bg-purple-600' :
                          item.type === 'ioc_update' ? 'bg-red-600' :
                          item.type === 'false_positive' ? 'bg-yellow-600' : 'bg-blue-600'
                        }`}>
                          {item.type}
                        </span>
                        <span className="text-sm">{item.desc}</span>
                      </div>
                      <span className="text-gray-400 text-sm">{item.time}</span>
                    </div>
                    <div className="mt-2 text-sm text-gray-400">
                      置信度: {(item.confidence * 100).toFixed(0)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KnowledgeManagementConsole;
