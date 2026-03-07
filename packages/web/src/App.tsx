import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import Dashboard from './components/Dashboard/Dashboard'
import Auditor from './components/Auditor/Auditor'
import RiskDashboard from './components/RiskDashboard/RiskDashboard'
import WarRoom from './components/WarRoom/WarRoom'
import Chat from './components/Chat/Chat'
import KnowledgeGraph from './components/KnowledgeGraph/KnowledgeGraph'
import ThreatIntel from './components/ThreatIntel/ThreatIntel'
import ComplianceReport from './components/ComplianceReport/ComplianceReport'
import Settings from './components/Settings/Settings'
import SkillsMarket from './components/SkillsMarket/SkillsMarket'

interface SkillInfo {
  id: string
  name: string
  description?: string
  emoji?: string
  role?: string
  combination?: string
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  feedback?: 'positive' | 'negative' | 'neutral'
  messageId?: string
  taskCategory?: string
}

interface SessionInfo {
  id: string
  key: string
  title?: string
  createdAt: number
  updatedAt: number
  messageCount: number
}

interface MitreStats {
  loaded: boolean
  tactics: number
  techniques: number
  groups: number
  mitigations: number
}

interface ScfStats {
  loaded: boolean
  domains: number
  controls: number
  frameworks: string[]
}

interface RemediationTask {
  id: string
  title: string
  status: 'pending' | 'in_progress' | 'completed'
  priority: 'low' | 'medium' | 'high' | 'critical'
}

// Fixed navigation items (always visible)
const NAV_ITEMS = [
  { id: 'chat' as const, label: 'AI安全专家', icon: '🤖', color: '#10b981' },
  { id: 'skills' as const, label: '技能市场', icon: '📦', color: '#a855f7' },
  { id: 'settings' as const, label: '系统配置', icon: '⚙️', color: '#64748b' },
]

// System built-in skills (can be hidden in Skills Market)
const SYSTEM_BUILTIN_SKILLS = [
  { id: 'dashboard' as const, label: '仪表盘', icon: '📊', color: '#3b82f6', pageId: 'dashboard' },
  { id: 'knowledge' as const, label: '知识库', icon: '🧠', color: '#6366f1', pageId: 'knowledge' },
]

// Extension skills (installable from Skills Market)
const EXTENSION_SKILLS = [
  { id: 'threatIntel' as const, label: '威胁情报', icon: '⚠️', color: '#ef4444', pageId: 'threatIntel' },
  { id: 'compliance' as const, label: '合规报告', icon: '📋', color: '#8b5cf6', pageId: 'compliance' },
  { id: 'warroom' as const, label: '作战室', icon: '🎯', color: '#f97316', pageId: 'warroom' },
  { id: 'remediation' as const, label: '修复任务', icon: '🔧', color: '#06b6d4', pageId: 'remediation' },
  { id: 'auditor' as const, label: '审计', icon: '📝', color: '#ec4899', pageId: 'auditor' },
  { id: 'risk' as const, label: '风险', icon: '⚡', color: '#f59e0b', pageId: 'risk' },
]

// AI安全专家 roles
const SECURITY_ROLES: SkillInfo[] = [
  { id: 'security-expert', name: '安全专家', description: 'SEC - 威胁检测/漏洞评估/渗透测试', emoji: '🛡️', role: 'SEC', combination: 'single' },
  { id: 'privacy-security-officer', name: '隐私安全官', description: 'SEC+LEG - 隐私保护/数据合规', emoji: '🔒', role: 'SEC+LEG', combination: 'binary' },
  { id: 'security-architect', name: '安全架构师', description: 'SEC+IT - 基础设施安全/代码安全', emoji: '🏗️', role: 'SEC+IT', combination: 'binary' },
  { id: 'business-security-officer', name: '业务安全官', description: 'SEC+BIZ - 供应链安全/业务连续性', emoji: '💼', role: 'SEC+BIZ', combination: 'binary' },
  { id: 'chief-security-architect', name: '首席安全架构官', description: 'SEC+LEG+IT - 企业安全架构', emoji: '👔', role: 'SEC+LEG+IT', combination: 'ternary' },
  { id: 'supply-chain-officer', name: '供应链安全官', description: 'SEC+LEG+BIZ - 供应链风险', emoji: '🔗', role: 'SEC+LEG+BIZ', combination: 'ternary' },
  { id: 'security-ops-officer', name: '业务安全运营官', description: 'SEC+IT+BIZ - 业务运营安全', emoji: '⚙️', role: 'SEC+IT+BIZ', combination: 'ternary' },
  { id: 'secuclaw-commander', name: 'SecuClaw指挥官', description: 'SEC+LEG+IT+BIZ - 全域安全指挥', emoji: '🎖️', role: 'SEC+LEG+IT+BIZ', combination: 'quaternary' },
]

type PageType = 'chat' | 'dashboard' | 'warroom' | 'auditor' | 'risk' | 'knowledge' | 'remediation' | 'threatIntel' | 'compliance' | 'settings' | 'skills'

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard')
  const [skills] = useState<SkillInfo[]>(SECURITY_ROLES)
  const [selectedSkill, setSelectedSkill] = useState<string>(SECURITY_ROLES[0]?.id || '')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [providers, setProviders] = useState<string[]>([])
  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [sessions, setSessions] = useState<SessionInfo[]>([])
  const [currentSessionKey, setCurrentSessionKey] = useState<string>('')
  const [autoRoute, setAutoRoute] = useState(true)
  const [lastRouting, setLastRouting] = useState<{taskCategory: string, reason: string} | null>(null)
  const { t, i18n } = useTranslation()
  
  // Installed skills (activated from Skills Market)
  const [installedSkills, setInstalledSkills] = useState<string[]>([
    'dashboard', 'knowledge',
    'threatIntel', 'compliance', 'warroom', 'remediation', 'auditor', 'risk'
  ])
  
  // Knowledge base stats
  const [mitreStats, setMitreStats] = useState<MitreStats | null>(null)
  const [scfStats, setScfStats] = useState<ScfStats | null>(null)
  const [remediationTasks, setRemediationTasks] = useState<RemediationTask[]>([])
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const loadSessions = () => {
    fetch('/api/sessions')
      .then(res => res.json())
      .then(data => setSessions(data.sessions || []))
      .catch(() => setSessions([]))
  }

  const loadKnowledgeStats = () => {
    fetch('/api/knowledge/mitre/stats')
      .then(res => res.json())
      .then(data => setMitreStats(data))
      .catch(() => {})
    
    fetch('/api/knowledge/scf/stats')
      .then(res => res.json())
      .then(data => setScfStats(data))
      .catch(() => {})
      
    fetch('/api/remediation/list')
      .then(res => res.json())
      .then(data => setRemediationTasks(data.tasks || []))
      .catch(() => {})
  }

  const handleSkillToggle = (skillId: string, enabled: boolean) => {
    setInstalledSkills(prev => 
      enabled 
        ? [...prev, skillId]
        : prev.filter(id => id !== skillId)
    )
  }

  useEffect(() => {
    fetch('/api/providers')
      .then(res => res.json())
      .then(data => {
        setProviders(data.available || [])
        setSelectedProvider(data.default || data.available?.[0] || '')
      })
      .catch(() => setProviders([]))
    
    loadSessions()
    loadKnowledgeStats()
  }, [])

  useEffect(() => {
    if (currentPage === 'knowledge' || currentPage === 'remediation') {
      loadKnowledgeStats()
    }
  }, [currentPage])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendChat = async () => {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    const newMessages = [...messages, { role: 'user' as const, content: userMessage }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: newMessages,
          skill: selectedSkill,
          provider: autoRoute ? undefined : (selectedProvider || undefined),
          sessionKey: currentSessionKey || undefined,
          autoRoute: autoRoute
        }),
      })
      const data = await res.json()
      
      if (data.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${data.error}` }])
      } else {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: data.content,
          messageId: `msg-${Date.now()}`,
          taskCategory: data.routing?.taskCategory
        }])
        if (data.routing) {
          setLastRouting(data.routing)
        }
        if (data.sessionKey && !currentSessionKey) {
          setCurrentSessionKey(data.sessionKey)
          loadSessions()
        }
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err}` }])
    } finally {
      setLoading(false)
    }
  }

  const createNewSession = async () => {
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '新对话' }),
      })
      const data = await res.json()
      setCurrentSessionKey(data.sessionKey)
      setMessages([])
      loadSessions()
    } catch (err) {
      console.error('Failed to create session:', err)
    }
  }

  const submitFeedback = async (messageIndex: number, rating: 'positive' | 'negative' | 'neutral') => {
    const message = messages[messageIndex]
    if (!message || message.role !== 'assistant') return

    const userMessage = messages[messageIndex - 1]
    
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSessionKey || 'anonymous',
          messageId: message.messageId || `msg-${Date.now()}`,
          skill: selectedSkill,
          query: userMessage?.content || '',
          response: message.content,
          rating: rating,
          provider: selectedProvider,
          model: 'unknown',
          taskCategory: lastRouting?.taskCategory || 'general-chat'
        })
      })
      
      setMessages(prev => prev.map((m, i) => 
        i === messageIndex ? { ...m, feedback: rating } : m
      ))
    } catch (err) {
      console.error('Failed to submit feedback:', err)
    }
  }

  const switchSession = (sessionKey: string) => {
    setCurrentSessionKey(sessionKey)
    setMessages([])
  }

  const currentSkill = skills.find(s => s.id === selectedSkill)

  // Build dynamic navigation items
  const dynamicNavItems = [
    ...NAV_ITEMS,
    ...SYSTEM_BUILTIN_SKILLS.filter(skill => installedSkills.includes(skill.id)),
    ...EXTENSION_SKILLS.filter(skill => installedSkills.includes(skill.id))
  ]

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, sans-serif', background: '#0f0f1a' }}>
      <aside style={{ width: 260, background: '#1a1a2e', color: '#fff', padding: '1rem', display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #2a2a4a' }}>
          <h1 style={{ fontSize: '1.25rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🛡️</span>
            <span>SecuClaw</span>
          </h1>
          <div style={{ fontSize: '0.7rem', color: '#666' }}>AI驱动全域安全指挥官系统</div>
        </div>

        {/* Language Switcher */}
        <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => i18n.changeLanguage('zh-CN')}
            style={{
              flex: 1,
              padding: '0.4rem 0.5rem',
              fontSize: '0.75rem',
              border: 'none',
              borderRadius: 4,
              background: i18n.language === 'zh-CN' ? '#3b82f6' : '#2a2a3e',
              color: i18n.language === 'zh-CN' ? '#fff' : '#888',
              cursor: 'pointer',
            }}
          >
            中文
          </button>
          <button
            onClick={() => i18n.changeLanguage('en-US')}
            style={{
              flex: 1,
              padding: '0.4rem 0.5rem',
              fontSize: '0.75rem',
              border: 'none',
              borderRadius: 4,
              background: i18n.language === 'en-US' ? '#3b82f6' : '#2a2a3e',
              color: i18n.language === 'en-US' ? '#fff' : '#888',
              cursor: 'pointer',
            }}
          >
            EN
          </button>
        </div>
        
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '1.5rem' }}>
          {dynamicNavItems.map(item => (
            <button 
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                border: 'none',
                borderRadius: 8,
                background: currentPage === item.id ? item.color + '20' : 'transparent',
                color: currentPage === item.id ? item.color : '#a0a0b0',
                cursor: 'pointer',
                fontSize: '0.9rem',
                textAlign: 'left' as const,
                transition: 'all 0.2s',
              }}
            >
              <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.id === 'knowledge' && mitreStats && (
                <span style={{ fontSize: '0.65rem', background: '#3b82f6', padding: '0.15rem 0.4rem', borderRadius: 10 }}>
                  {mitreStats.techniques}
                </span>
              )}
              {item.id === 'remediation' && (
                <span style={{ fontSize: '0.65rem', background: '#f97316', padding: '0.15rem 0.4rem', borderRadius: 10 }}>
                  {remediationTasks.filter(t => t.status !== 'completed').length}
                </span>
              )}
            </button>
          ))}
        </nav>

        {currentPage === 'chat' && (
        <>
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.7rem', color: '#666', marginBottom: '0.5rem' }}>安全角色</div>
          {skills.map(skill => (
            <button
              key={skill.id}
              onClick={() => { setSelectedSkill(skill.id); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                width: '100%',
                padding: '0.5rem 0.75rem',
                marginBottom: '0.25rem',
                border: 'none',
                borderRadius: 6,
                background: selectedSkill === skill.id ? '#4a4a6a' : 'transparent',
                color: '#fff',
                cursor: 'pointer',
                textAlign: 'left' as const,
                fontSize: '0.8rem',
              }}
            >
              <span>{skill.emoji || '👤'}</span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {skill.name}
              </span>
            </button>
          ))}
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.7rem', color: '#666' }}>对话历史</span>
            <button 
              onClick={createNewSession}
              style={{
                padding: '0.2rem 0.5rem',
                fontSize: '0.65rem',
                border: '1px solid #333',
                borderRadius: 4,
                background: 'transparent',
                color: '#888',
                cursor: 'pointer',
              }}
            >
              + 新对话
            </button>
          </div>
          {sessions.slice(0, 5).map(session => (
            <div
              key={session.id}
              onClick={() => switchSession(session.key)}
              style={{
                padding: '0.4rem 0.75rem',
                marginBottom: '0.25rem',
                borderRadius: 6,
                background: currentSessionKey === session.key ? '#4a4a6a' : 'transparent',
                cursor: 'pointer',
                fontSize: '0.75rem',
                color: '#a0a0b0',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {session.title || `对话 ${session.id.slice(0, 6)}`}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #2a2a4a' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '0.5rem' }}>
            <input 
              type="checkbox" 
              checked={autoRoute} 
              onChange={e => setAutoRoute(e.target.checked)}
              style={{ accentColor: '#3b82f6' }}
            />
            <span style={{ fontSize: '0.75rem', color: autoRoute ? '#3b82f6' : '#666' }}>
              自动路由
            </span>
          </label>
          
          {!autoRoute && (
            <select 
              value={selectedProvider}
              onChange={e => setSelectedProvider(e.target.value)}
              style={{
                width: '100%',
                padding: '0.4rem',
                borderRadius: 4,
                border: '1px solid #333',
                background: '#2a2a3e',
                color: '#fff',
                fontSize: '0.75rem',
              }}
            >
              {providers.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          )}
        </div>
        </>
        )}
      </aside>

      <main style={{ flex: 1, overflow: 'auto', background: '#0f0f1a' }}>
        {currentPage === 'dashboard' && <Dashboard />}
        
        {currentPage === 'auditor' && <Auditor />}
        
        {currentPage === 'risk' && <RiskDashboard />}
        
        {currentPage === 'warroom' && <WarRoom />}
        
        {currentPage === 'knowledge' && (
          <KnowledgeGraph />
        )}
        
        {currentPage === 'threatIntel' && <ThreatIntel />}
        
        {currentPage === 'compliance' && <ComplianceReport />}
        
        {currentPage === 'remediation' && (
          <div style={{ padding: '2rem' }}>
            <h2 style={{ color: '#fff', marginBottom: '1.5rem', fontSize: '1.5rem' }}>🔧 修复任务</h2>
            
            <div style={{ display: 'grid', gap: '1rem' }}>
              {remediationTasks.map(task => (
                <div
                  key={task.id}
                  style={{
                    padding: '1rem',
                    background: '#1a1a2e',
                    borderRadius: 8,
                    borderLeft: task.status === 'completed' ? '3px solid #10b981' 
                      : task.status === 'in_progress' ? '3px solid #f97316' 
                      : '3px solid #666',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ color: '#fff', fontWeight: 500 }}>{task.title}</span>
                    <span style={{
                      padding: '0.2rem 0.6rem',
                      borderRadius: 4,
                      fontSize: '0.7rem',
                      background: task.priority === 'critical' ? '#dc2626' 
                        : task.priority === 'high' ? '#f97316' 
                        : task.priority === 'medium' ? '#eab308' 
                        : '#666',
                    }}>
                      {task.priority}
                    </span>
                  </div>
                  <div style={{ color: '#888', fontSize: '0.8rem' }}>
                    状态: 
                    <span style={{ 
                      color: task.status === 'completed' ? '#10b981' 
                        : task.status === 'in_progress' ? '#f97316' 
                        : '#888',
                      marginLeft: '0.5rem',
                    }}>
                      {task.status === 'completed' ? '已完成' 
                        : task.status === 'in_progress' ? '进行中' 
                        : '待处理'}
                    </span>
                  </div>
                </div>
              ))}
              
              {remediationTasks.length === 0 && (
                <div style={{ color: '#666', textAlign: 'center', padding: '2rem' }}>
                  暂无修复任务
                </div>
              )}
            </div>
          </div>
        )}

        {currentPage === 'chat' && (
          <Chat
            messages={messages}
            input={input}
            loading={loading}
            currentSkill={currentSkill}
            onSend={(msg) => { setInput(msg); sendChat(); }}
            onInputChange={setInput}
            onFeedback={submitFeedback}
          />
        )}
        
        {currentPage === 'settings' && <Settings />}
        
        {currentPage === 'skills' && (
          <SkillsMarket
            installedSkills={installedSkills}
            onSkillToggle={handleSkillToggle}
          />
        )}
      </main>
    </div>
  )
}

export default App
