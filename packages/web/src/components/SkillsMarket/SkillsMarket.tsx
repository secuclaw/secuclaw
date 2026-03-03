import { useMemo, useState } from 'react'
import { Search, Package, Check, Download, Trash2, Power, ExternalLink } from 'lucide-react'

interface SkillDefinition {
  id: string
  label: string
  icon: string
  color: string
  description: string
  category: string
}

interface SkillsMarketProps {
  skills: SkillDefinition[]
  installedSkills: string[]
  activatedSkills: string[]
  onInstallSkill: (skillId: string) => void
  onUninstallSkill: (skillId: string) => void
  onActivateSkill: (skillId: string) => void
  onOpenSkill: (skillId: string) => void
}

function SkillsMarket({
  skills,
  installedSkills,
  activatedSkills,
  onInstallSkill,
  onUninstallSkill,
  onActivateSkill,
  onOpenSkill,
}: SkillsMarketProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<'all' | 'installed'>('all')
  const [message, setMessage] = useState<{ type: 'success' | 'info'; text: string } | null>(null)

  const categories = useMemo(() => {
    const bucket = new Map<string, number>()
    for (const skill of skills) {
      bucket.set(skill.category, (bucket.get(skill.category) || 0) + 1)
    }
    return Array.from(bucket.entries()).map(([name, count]) => ({ name, count }))
  }, [skills])

  const filteredSkills = useMemo(() => {
    const source = activeTab === 'installed'
      ? skills.filter(skill => installedSkills.includes(skill.id))
      : skills

    return source.filter(skill => {
      const matchesSearch = skill.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        skill.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        skill.category.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = selectedCategory === 'all' || skill.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [activeTab, installedSkills, searchTerm, selectedCategory, skills])

  const handleInstall = (skillId: string, skillName: string) => {
    onInstallSkill(skillId)
    setMessage({ type: 'success', text: `已安装技能：${skillName}` })
  }

  const handleUninstall = (skillId: string, skillName: string) => {
    onUninstallSkill(skillId)
    setMessage({ type: 'info', text: `已卸载技能：${skillName}` })
  }

  const handleActivateToggle = (skillId: string, skillName: string, activated: boolean) => {
    onActivateSkill(skillId)
    setMessage({ type: 'success', text: activated ? `已停用：${skillName}` : `已激活：${skillName}（左侧导航可见）` })
  }

  return (
    <div style={{ flex: 1, padding: '1.5rem', color: '#fff', background: '#0f0f1a', overflowY: 'auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Package size={24} />
          技能市场
        </h1>
        <p style={{ color: '#888', fontSize: '0.85rem', marginTop: '0.5rem' }}>
          “仪表盘 / 威胁情报 / 合规报告 / 作战室 / 修复任务 / 审计 / 风险”属于可安装技能。安装并激活后会显示在左侧导航栏。
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={{ background: '#1a1a2e', borderRadius: 10, padding: '0.75rem 1rem' }}>
          <div style={{ color: '#666', fontSize: '0.75rem' }}>可用技能</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{skills.length}</div>
        </div>
        <div style={{ background: '#1a1a2e', borderRadius: 10, padding: '0.75rem 1rem' }}>
          <div style={{ color: '#666', fontSize: '0.75rem' }}>已安装</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{installedSkills.length}</div>
        </div>
        <div style={{ background: '#1a1a2e', borderRadius: 10, padding: '0.75rem 1rem' }}>
          <div style={{ color: '#666', fontSize: '0.75rem' }}>已激活</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{activatedSkills.length}</div>
        </div>
      </div>

      {message && (
        <div style={{
          padding: '0.7rem 0.9rem',
          borderRadius: 8,
          marginBottom: '1rem',
          background: message.type === 'success' ? '#22c55e20' : '#3b82f620',
          border: `1px solid ${message.type === 'success' ? '#22c55e' : '#3b82f6'}`,
          color: message.type === 'success' ? '#22c55e' : '#60a5fa',
        }}>
          {message.text}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button
          onClick={() => setActiveTab('all')}
          style={{
            padding: '0.5rem 1rem',
            border: 'none',
            borderRadius: 6,
            background: activeTab === 'all' ? '#3b82f6' : '#1a1a2e',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          全部技能
        </button>
        <button
          onClick={() => setActiveTab('installed')}
          style={{
            padding: '0.5rem 1rem',
            border: 'none',
            borderRadius: 6,
            background: activeTab === 'installed' ? '#3b82f6' : '#1a1a2e',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          已安装技能
        </button>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', top: '50%', left: 10, transform: 'translateY(-50%)', color: '#666' }} />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="搜索技能名称、描述或分类..."
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem 0.5rem 2rem',
              border: '1px solid #2a2a3e',
              borderRadius: 8,
              background: '#1a1a2e',
              color: '#fff',
            }}
          />
        </div>
        <select
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
          style={{
            minWidth: 160,
            padding: '0.5rem 0.75rem',
            border: '1px solid #2a2a3e',
            borderRadius: 8,
            background: '#1a1a2e',
            color: '#fff',
          }}
        >
          <option value="all">全部分类</option>
          {categories.map(category => (
            <option key={category.name} value={category.name}>
              {category.name} ({category.count})
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
        {filteredSkills.map(skill => {
          const installed = installedSkills.includes(skill.id)
          const activated = activatedSkills.includes(skill.id)

          return (
            <div
              key={skill.id}
              style={{
                background: '#1a1a2e',
                borderRadius: 12,
                border: `1px solid ${activated ? '#22c55e' : installed ? '#3b82f6' : '#2a2a3e'}`,
                padding: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '0.6rem' }}>
                  <div style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: skill.color + '26',
                    fontSize: '1rem',
                  }}>
                    {skill.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: 600 }}>{skill.label}</div>
                    <div style={{ color: '#888', fontSize: '0.75rem' }}>{skill.category}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                  {installed && (
                    <span style={{ fontSize: '0.65rem', color: '#60a5fa', background: '#3b82f620', borderRadius: 10, padding: '0.15rem 0.45rem' }}>
                      已安装
                    </span>
                  )}
                  {activated && (
                    <span style={{ fontSize: '0.65rem', color: '#22c55e', background: '#22c55e20', borderRadius: 10, padding: '0.15rem 0.45rem' }}>
                      已激活
                    </span>
                  )}
                </div>
              </div>

              <p style={{ marginTop: 0, marginBottom: '0.9rem', color: '#a3a3b7', fontSize: '0.82rem', lineHeight: 1.5 }}>
                {skill.description}
              </p>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {!installed && (
                  <button
                    onClick={() => handleInstall(skill.id, skill.label)}
                    style={{
                      flex: 1,
                      minWidth: 110,
                      padding: '0.5rem 0.75rem',
                      border: 'none',
                      borderRadius: 6,
                      background: '#3b82f6',
                      color: '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <Download size={14} />
                    安装
                  </button>
                )}

                {installed && (
                  <>
                    <button
                      onClick={() => handleActivateToggle(skill.id, skill.label, activated)}
                      style={{
                        flex: 1,
                        minWidth: 110,
                        padding: '0.5rem 0.75rem',
                        border: `1px solid ${activated ? '#f97316' : '#22c55e'}`,
                        borderRadius: 6,
                        background: activated ? '#f9731622' : '#22c55e20',
                        color: activated ? '#fdba74' : '#4ade80',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <Power size={14} />
                      {activated ? '停用' : '激活'}
                    </button>
                    <button
                      onClick={() => handleUninstall(skill.id, skill.label)}
                      style={{
                        flex: 1,
                        minWidth: 110,
                        padding: '0.5rem 0.75rem',
                        border: '1px solid #ef4444',
                        borderRadius: 6,
                        background: '#ef444420',
                        color: '#f87171',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <Trash2 size={14} />
                      卸载
                    </button>
                  </>
                )}

                {installed && activated && (
                  <button
                    onClick={() => onOpenSkill(skill.id)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      border: 'none',
                      borderRadius: 6,
                      background: '#2a2a3e',
                      color: '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <ExternalLink size={14} />
                    打开技能页面
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {filteredSkills.length === 0 && (
        <div style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>
          没有找到匹配技能
        </div>
      )}

      <div style={{ marginTop: '1.25rem', color: '#666', fontSize: '0.75rem' }}>
        提示：激活后的技能会出现在左侧导航栏，点击即可在右侧打开对应页面。
      </div>
    </div>
  )
}

export default SkillsMarket
