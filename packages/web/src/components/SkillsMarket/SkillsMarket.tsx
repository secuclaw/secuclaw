import { useState, useEffect } from 'react'
import { Search, Download, Trash2, RefreshCw, Star, Package, Check, X, ToggleLeft, ToggleRight } from 'lucide-react'

interface MarketSkill {
  id: string
  name: string
  description: string
  version: string
  author: string
  downloads: number
  rating: number
  ratingCount: number
  tags: string[]
  category: string
  installed?: boolean
  hasUpdate?: boolean
}

interface SkillCategory {
  id: string
  name: string
  count: number
}

// System built-in skills (can be hidden in Skills Market)
const SYSTEM_BUILTIN_SKILLS = [
  { id: 'dashboard', name: '仪表盘', description: '安全仪表盘 - 实时展示安全态势和关键指标', emoji: '📊' },
  { id: 'knowledge', name: '知识库', description: '知识库管理 - MITRE ATT&CK、SCF合规框架', emoji: '🧠' },
]

// Extension skills (installable from Skills Market)
const EXTENSION_SKILLS = [
  { id: 'threatIntel', name: '威胁情报', description: '威胁情报分析 - 实时监控和分析安全威胁', emoji: '⚠️' },
  { id: 'compliance', name: '合规报告', description: '合规报告生成 - 支持ISO27001/SOC2/PCI-DSS', emoji: '📋' },
  { id: 'warroom', name: '作战室', description: '安全作战室 - 应急响应指挥和协调', emoji: '🎯' },
  { id: 'remediation', name: '修复任务', description: '漏洞修复任务管理 - 跟踪和完成安全修复', emoji: '🔧' },
  { id: 'auditor', name: '审计', description: '安全审计 - 日志分析与合规审计', emoji: '📝' },
  { id: 'risk', name: '风险', description: '风险评估 - 安全风险分析和管理', emoji: '⚡' },
]

interface SkillsMarketProps {
  installedSkills?: string[]
  onSkillToggle?: (skillId: string, activate: boolean) => void
}

function SkillsMarket({ installedSkills = [], onSkillToggle }: SkillsMarketProps) {
  const [skills, setSkills] = useState<MarketSkill[]>([])
  const [categories, setCategories] = useState<SkillCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<'builtin' | 'extension' | 'market'>('builtin')
  const [installing, setInstalling] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Check if skill is installed
  const isSkillInstalled = (skillId: string) => installedSkills.includes(skillId)

  // Toggle skill
  const handleSkillToggle = (skillId: string) => {
    const isInstalled = isSkillInstalled(skillId)
    const allSkills = [...SYSTEM_BUILTIN_SKILLS, ...EXTENSION_SKILLS]
    const skill = allSkills.find(s => s.id === skillId)
    if (onSkillToggle) {
      onSkillToggle(skillId, !isInstalled)
    }
    setMessage({ 
      type: 'success', 
      text: isInstalled 
        ? `已停用 ${skill?.name}` 
        : `已激活 ${skill?.name}` 
    })
    setTimeout(() => setMessage(null), 2000)
  }

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [marketRes, categoriesRes] = await Promise.all([
        fetch('/api/market/skills?limit=100').then(r => r.ok ? r.json() : Promise.resolve({ skills: [] })),
        fetch('/api/skills/categories').then(r => r.ok ? r.json() : Promise.resolve({ categories: [] }))
      ])
      setSkills(marketRes.skills || [])
      setCategories(categoriesRes.categories || [])
    } catch (error) {
      console.error('Failed to load skills:', error)
      setSkills([])
      setCategories([])
    }
    setLoading(false)
  }

  const filteredBuiltinSkills = SYSTEM_BUILTIN_SKILLS.filter(skill => 
    skill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    skill.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredExtensionSkills = EXTENSION_SKILLS.filter(skill => 
    skill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    skill.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredMarketSkills = skills.filter(skill => {
    const matchesSearch = skill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      skill.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || skill.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId)
    return category?.name || categoryId
  }

  const renderStars = (rating: number) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.125rem' }}>
      {[1, 2, 3, 4, 5].map(star => (
        <Star key={star} size={12} style={{ fill: star <= Math.round(rating) ? '#eab308' : 'transparent', color: '#eab308' }} />
      ))}
      <span style={{ fontSize: '0.7rem', color: '#888', marginLeft: '0.25rem' }}>{rating.toFixed(1)}</span>
    </div>
  )

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'security': '#3b82f6', 'compliance': '#22c55e', 'analysis': '#8b5cf6',
      'automation': '#f97316', 'red-team': '#ef4444', 'blue-team': '#06b6d4',
      'forensics': '#a855f7', 'threat-intel': '#f59e0b', 'built-in': '#3b82f6',
    }
    return colors[category] || '#6b7280'
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginRight: '0.5rem' }} />
        加载技能市场...
      </div>
    )
  }

  return (
    <div style={{ flex: 1, padding: '1.5rem', color: '#fff', background: '#0f0f1a', overflowY: 'auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Package size={24} />
          技能市场
        </h1>
        <p style={{ color: '#888', fontSize: '0.85rem', marginTop: '0.5rem' }}>
          发现和安装安全技能插件，扩展SecuClaw的功能
        </p>
      </div>

      {/* Message Alert */}
      {message && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: message.type === 'success' ? '#22c55e20' : '#ef444420', border: `1px solid ${message.type === 'success' ? '#22c55e' : '#ef4444'}` }}>
          <span style={{ color: message.type === 'success' ? '#22c55e' : '#ef4444' }}>
            {message.type === 'success' ? <Check size={16} style={{ marginRight: '0.5rem' }} /> : <X size={16} style={{ marginRight: '0.5rem' }} />}
            {message.text}
          </span>
          <button onClick={() => setMessage(null)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}><X size={16} /></button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button onClick={() => setActiveTab('builtin')} style={{ padding: '0.5rem 1rem', background: activeTab === 'builtin' ? '#3b82f6' : '#1a1a2e', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: '0.9rem' }}>系统内置技能</button>
        <button onClick={() => setActiveTab('extension')} style={{ padding: '0.5rem 1rem', background: activeTab === 'extension' ? '#3b82f6' : '#1a1a2e', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: '0.9rem' }}>扩展技能</button>
        <button onClick={() => setActiveTab('market')} style={{ padding: '0.5rem 1rem', background: activeTab === 'market' ? '#3b82f6' : '#1a1a2e', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: '0.9rem' }}>技能市场 ({skills.length})</button>
      </div>

      {/* Search */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
          <input type="text" placeholder="搜索技能名称、描述..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '0.5rem 0.75rem 0.5rem 2.25rem', borderRadius: 8, border: '1px solid #333', background: '#1a1a2e', color: '#fff', fontSize: '0.85rem' }} />
        </div>
      </div>

      {/* System Built-in Skills */}
      {activeTab === 'builtin' && (
        <div>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🛡️</span> 系统内置技能
            <span style={{ fontSize: '0.8rem', color: '#888', fontWeight: 'normal' }}>（点击开关激活/停用）</span>
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1rem' }}>
            {filteredBuiltinSkills.map(skill => {
              const isInstalled = isSkillInstalled(skill.id)
              return (
                <div key={skill.id} style={{ background: '#1a1a2e', borderRadius: 12, padding: '1.25rem', border: `1px solid ${isInstalled ? '#22c55e' : '#2a2a3e'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '1.5rem' }}>{skill.emoji}</span>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{skill.name}</h3>
                      </div>
                    </div>
                    <button onClick={() => handleSkillToggle(skill.id)} style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}>
                      {isInstalled ? <ToggleRight size={32} color="#22c55e" /> : <ToggleLeft size={32} color="#666" />}
                    </button>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '0.75rem', lineHeight: 1.5 }}>{skill.description}</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: 4, background: isInstalled ? '#22c55e20' : '#2a2a3e', color: isInstalled ? '#22c55e' : '#888' }}>{isInstalled ? '已激活' : '未激活'}</span>
                    <span style={{ fontSize: '0.7rem', color: '#666' }}>系统内置</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Extension Skills */}
      {activeTab === 'extension' && (
        <div>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🚀</span> 扩展技能
            <span style={{ fontSize: '0.8rem', color: '#888', fontWeight: 'normal' }}>（点击开关安装/卸载）</span>
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1rem' }}>
            {filteredExtensionSkills.map(skill => {
              const isInstalled = isSkillInstalled(skill.id)
              return (
                <div key={skill.id} style={{ background: '#1a1a2e', borderRadius: 12, padding: '1.25rem', border: `1px solid ${isInstalled ? '#3b82f6' : '#2a2a3e'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '1.5rem' }}>{skill.emoji}</span>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{skill.name}</h3>
                      </div>
                    </div>
                    <button onClick={() => handleSkillToggle(skill.id)} style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}>
                      {isInstalled ? <ToggleRight size={32} color="#3b82f6" /> : <ToggleLeft size={32} color="#666" />}
                    </button>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '0.75rem', lineHeight: 1.5 }}>{skill.description}</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: 4, background: isInstalled ? '#3b82f620' : '#2a2a3e', color: isInstalled ? '#3b82f6' : '#888' }}>{isInstalled ? '已安装' : '未安装'}</span>
                    <span style={{ fontSize: '0.7rem', color: '#666' }}>扩展技能</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Market Skills */}
      {activeTab === 'market' && (
        <div>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#fff' }}>技能市场</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1rem' }}>
            {filteredMarketSkills.map(skill => (
              <div key={skill.id} style={{ background: '#1a1a2e', borderRadius: 12, padding: '1.25rem', border: `1px solid ${skill.installed ? '#3b82f6' : '#2a2a3e'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{skill.name}</h3>
                      <span style={{ fontSize: '0.65rem', padding: '0.125rem 0.375rem', borderRadius: 4, background: getCategoryColor(skill.category) + '20', color: getCategoryColor(skill.category) }}>{getCategoryName(skill.category)}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#888' }}>by {skill.author} · v{skill.version}</div>
                  </div>
                  {skill.installed && <span style={{ fontSize: '0.65rem', padding: '0.125rem 0.5rem', borderRadius: 4, background: '#22c55e20', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Check size={10} />已安装</span>}
                </div>
                <p style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '0.75rem', lineHeight: 1.5 }}>{skill.description}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.75rem' }}>
                  {skill.tags.slice(0, 4).map(tag => <span key={tag} style={{ fontSize: '0.65rem', padding: '0.125rem 0.5rem', borderRadius: 4, background: '#2a2a3e', color: '#888' }}>{tag}</span>)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', fontSize: '0.75rem', color: '#888' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>{renderStars(skill.rating)}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Download size={12} />{skill.downloads.toLocaleString()}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {!skill.installed ? (
                    <button disabled={installing === skill.id} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', padding: '0.5rem', background: '#3b82f6', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: '0.8rem' }}>
                      {installing === skill.id ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={14} />}
                      {installing === skill.id ? '安装中...' : '安装'}
                    </button>
                  ) : (
                    <button disabled={installing === skill.id} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', padding: '0.5rem', background: '#2a2a3e', border: '1px solid #ef4444', borderRadius: 6, color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem' }}><Trash2 size={14} />卸载</button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {filteredMarketSkills.length === 0 && <div style={{ textAlign: 'center', padding: '3rem', color: '#888' }}><Package size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} /><p>没有找到匹配的技能</p></div>}
        </div>
      )}
    </div>
  )
}

export default SkillsMarket
