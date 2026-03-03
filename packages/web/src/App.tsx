import { useState, useEffect } from 'react'
import Dashboard from './components/Dashboard/Dashboard'
import Auditor from './components/Auditor/Auditor'
import RiskDashboard from './components/RiskDashboard/RiskDashboard'
import WarRoom from './components/WarRoom/WarRoom'
import Chat from './components/Chat/Chat'
import KnowledgePage from './components/KnowledgePage/KnowledgePage'
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

interface ProviderOption {
  id: string
  name: string
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

// 系统自带页面类型
type BuiltInPageType = 'knowledge' | 'chat' | 'skills'

// 可安装技能类型
type SkillPageType = 'dashboard' | 'threatIntel' | 'compliance' | 'warroom' | 'remediation' | 'auditor' | 'risk'

// 技能页面配置
interface SkillPageConfig {
  id: SkillPageType
  label: string
  icon: string
  color: string
  description: string
  category: string
  component: string // 对应的组件名
}

// 系统自带页面
const SYSTEM_PAGES: { id: BuiltInPageType; label: string; icon: string; color: string }[] = [
  { id: 'knowledge', label: '知识库', icon: '🧠', color: '#6366f1' },
  { id: 'chat', label: 'AI安全专家', icon: '💬', color: '#10b981' },
  { id: 'skills', label: '技能市场', icon: '🛒', color: '#f59e0b' },
]


// 可安装的技能页面
const MARKETPLACE_SKILLS: SkillPageConfig[] = [
  { id: 'dashboard', label: '仪表盘', icon: '📊', color: '#3b82f6', description: '全局安全态势可视化总览', category: '运营分析', component: 'Dashboard' },
  { id: 'threatIntel', label: '威胁情报', icon: '⚠️', color: '#ef4444', description: '威胁情报采集、归并与跟踪', category: '威胁情报', component: 'ThreatIntel' },
  { id: 'compliance', label: '合规报告', icon: '📋', color: '#8b5cf6', description: '自动生成合规评估与报告', category: '合规治理', component: 'ComplianceReport' },
  { id: 'warroom', label: '作战室', icon: '🎯', color: '#f97316', description: '事件处置协同与战情视图', category: '应急响应', component: 'WarRoom' },
  { id: 'remediation', label: '修复任务', icon: '🔧', color: '#06b6d4', description: '漏洞与风险修复任务编排', category: '运维修复', component: 'RemediationTasks' },
  { id: 'auditor', label: '审计', icon: '📝', color: '#ec4899', description: '审计记录追踪与证据汇总', category: '审计取证', component: 'Auditor' },
  { id: 'risk', label: '风险', icon: '⚡', color: '#f59e0b', description: '资产风险评分与趋势评估', category: '风险管理', component: 'RiskDashboard' },
]

type PageType = BuiltInPageType | SkillPageType | 'settings'

const INSTALLED_SKILLS_STORAGE_KEY = 'secuclaw.installedSkills'
const ACTIVATED_SKILLS_STORAGE_KEY = 'secuclaw.activatedSkills'
const isSkillPageType = (value: unknown): value is SkillPageType => MARKETPLACE_SKILLS.some(skill => skill.id === value)

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('knowledge')
  const [skills, setSkills] = useState<SkillInfo[]>([])
  const [selectedSkill, setSelectedSkill] = useState<string>('')
  
  // 可安装技能状态
  const [installedSkills, setInstalledSkills] = useState<SkillPageType[]>([])
  const [activatedSkills, setActivatedSkills] = useState<SkillPageType[]>([])
  
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [providers, setProviders] = useState<ProviderOption[]>([])
  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [sessions, setSessions] = useState<SessionInfo[]>([])
  const [currentSessionKey, setCurrentSessionKey] = useState<string>('')
  const [autoRoute, setAutoRoute] = useState(true)
  const [lastRouting, setLastRouting] = useState<{taskCategory: string, reason: string} | null>(null)
  
  const [mitreStats, setMitreStats] = useState<MitreStats | null>(null)
  const [scfStats, setScfStats] = useState<ScfStats | null>(null)
  const [remediationTasks, setRemediationTasks] = useState<RemediationTask[]>([])
  
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

  // 激活/停用技能
  const toggleSkillActivation = (skillId: SkillPageType) => {
    if (!installedSkills.includes(skillId)) return

    setActivatedSkills(prev => {
      if (prev.includes(skillId)) {
        // 如果停用，当前页面是技能页面则切换到知识库
        if (currentPage === skillId) {
          setCurrentPage('knowledge')
        }
        return prev.filter(s => s !== skillId)
      } else {
        // 激活技能
        return [...prev, skillId]
      }
    })
  }

  const installSkill = (skillId: SkillPageType) => {
    setInstalledSkills(prev => (prev.includes(skillId) ? prev : [...prev, skillId]))
  }

  const uninstallSkill = (skillId: SkillPageType) => {
    setInstalledSkills(prev => prev.filter(id => id !== skillId))
    setActivatedSkills(prev => prev.filter(id => id !== skillId))

    if (currentPage === skillId) {
      setCurrentPage('skills')
    }
  }

  useEffect(() => {
    fetch('/api/llm/providers')
      .then(res => res.json())
      .then(data => {
        const configuredProviders = Array.isArray(data.providers)
          ? data.providers
              .filter((provider: { id?: string; name?: string; enabled?: boolean }) => provider.enabled && provider.id)
              .map((provider: { id: string; name?: string }) => ({
                id: provider.id,
                name: provider.name || provider.id,
              }))
          : []

        setProviders(configuredProviders)
        setSelectedProvider(configuredProviders[0]?.id || '')
      })
      .catch(async () => {
        try {
          const res = await fetch('/api/providers')
          const data = await res.json()
          const options = Array.isArray(data.options)
            ? data.options
                .filter((provider: { id?: string }) => Boolean(provider.id))
                .map((provider: { id: string; name?: string }) => ({
                  id: provider.id,
                  name: provider.name || provider.id,
                }))
            : Array.isArray(data.available)
              ? data.available.map((providerId: string) => ({ id: providerId, name: providerId }))
              : []

          setProviders(options)
          setSelectedProvider(data.default || options[0]?.id || '')
        } catch {
          setProviders([])
        }
      })
    
    fetch('/api/skills')
      .then(res => res.json())
      .then(data => {
        let skillList = data.skills || []
        
        if (skillList.length === 0) {
          skillList = [
            { id: 'security-expert', name: '安全专家', description: 'SEC - 威胁检测/漏洞评估/渗透测试', emoji: '🛡️', role: 'SEC', combination: 'single' },
            { id: 'privacy-officer', name: '隐私安全官', description: 'SEC+LEG - 隐私保护/数据合规', emoji: '🔐', role: 'SEC+LEG', combination: 'binary' },
            { id: 'security-architect', name: '安全架构师', description: 'SEC+IT - 基础设施安全/代码安全', emoji: '🏗️', role: 'SEC+IT', combination: 'binary' },
            { id: 'business-security-officer', name: '业务安全官', description: 'SEC+BIZ - 供应链安全/业务连续性', emoji: '📊', role: 'SEC+BIZ', combination: 'binary' },
            { id: 'ciso', name: '首席信息安全官角色', description: 'SEC+LEG+IT - 企业安全战略与合规治理', emoji: '👔', role: 'SEC+LEG+IT', combination: 'ternary' },
            { id: 'supply-chain-security', name: '供应链安全官', description: 'SEC+LEG+BIZ - 供应链风险与第三方治理', emoji: '🔗', role: 'SEC+LEG+BIZ', combination: 'ternary' },
            { id: 'security-ops', name: '安全运营官', description: 'SEC+IT+BIZ - SOC运营与事件响应', emoji: '⚙️', role: 'SEC+IT+BIZ', combination: 'ternary' },
            { id: 'secuclaw-commander', name: '全域安全指挥官', description: 'SEC+LEG+IT+BIZ - 全域安全指挥', emoji: '🎯', role: 'SEC+LEG+IT+BIZ', combination: 'quaternary' }
          ];
        }
        
        setSkills(skillList);
        if (skillList.length > 0) {
          setSelectedSkill(skillList[0].id);
        }
      })
      .catch(() => {
        setSkills([
          { id: 'security-expert', name: '安全专家', description: 'SEC - 威胁检测/漏洞评估/渗透测试', emoji: '🛡️', role: 'SEC', combination: 'single' },
          { id: 'privacy-officer', name: '隐私安全官', description: 'SEC+LEG - 隐私保护/数据合规', emoji: '🔐', role: 'SEC+LEG', combination: 'binary' },
          { id: 'security-architect', name: '安全架构师', description: 'SEC+IT - 基础设施安全/代码安全', emoji: '🏗️', role: 'SEC+IT', combination: 'binary' },
          { id: 'business-security-officer', name: '业务安全官', description: 'SEC+BIZ - 供应链安全/业务连续性', emoji: '📊', role: 'SEC+BIZ', combination: 'binary' },
          { id: 'ciso', name: '首席信息安全官角色', description: 'SEC+LEG+IT - 企业安全战略与合规治理', emoji: '👔', role: 'SEC+LEG+IT', combination: 'ternary' },
          { id: 'supply-chain-security', name: '供应链安全官', description: 'SEC+LEG+BIZ - 供应链风险与第三方治理', emoji: '🔗', role: 'SEC+LEG+BIZ', combination: 'ternary' },
          { id: 'security-ops', name: '安全运营官', description: 'SEC+IT+BIZ - SOC运营与事件响应', emoji: '⚙️', role: 'SEC+IT+BIZ', combination: 'ternary' },
          { id: 'secuclaw-commander', name: '全域安全指挥官', description: 'SEC+LEG+IT+BIZ - 全域安全指挥', emoji: '🎯', role: 'SEC+LEG+IT+BIZ', combination: 'quaternary' }
        ])
      })
    
    try {
      const rawInstalled = localStorage.getItem(INSTALLED_SKILLS_STORAGE_KEY)
      const rawActivated = localStorage.getItem(ACTIVATED_SKILLS_STORAGE_KEY)

      const parsedInstalled = rawInstalled ? JSON.parse(rawInstalled) : []
      const parsedActivated = rawActivated ? JSON.parse(rawActivated) : []

      const installed = Array.isArray(parsedInstalled) ? parsedInstalled.filter(isSkillPageType) : []
      const activated = Array.isArray(parsedActivated) ? parsedActivated.filter(isSkillPageType) : []

      setInstalledSkills(installed)
      setActivatedSkills(activated.filter(id => installed.includes(id)))
    } catch {
      setInstalledSkills([])
      setActivatedSkills([])
    }

    loadKnowledgeStats()
  }, [])

  useEffect(() => {
    localStorage.setItem(INSTALLED_SKILLS_STORAGE_KEY, JSON.stringify(installedSkills))
  }, [installedSkills])

  useEffect(() => {
    localStorage.setItem(ACTIVATED_SKILLS_STORAGE_KEY, JSON.stringify(activatedSkills))
  }, [activatedSkills])

  const sendChat = async (content?: string) => {
    const prompt = (content ?? input).trim()
    if (!prompt) return

    const requestMessages = [...messages, { role: 'user', content: prompt }]
    const userMessage: Message = { role: 'user', content: prompt }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)
    
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: requestMessages,
          skill: selectedSkill,
          provider: autoRoute ? undefined : (selectedProvider || undefined),
          sessionKey: currentSessionKey || undefined,
          autoRoute,
        }),
      })
      
      const data = await res.json()
      const assistantContent = data.content || data.response
      
      if (assistantContent) {
        const assistantMessage: Message = { 
          role: 'assistant', 
          content: assistantContent,
          messageId: data.messageId,
          taskCategory: data.taskCategory,
        }
        setMessages(prev => [...prev, assistantMessage])
      }
      
      if (data.routing) {
        setLastRouting(data.routing)
      }
      if (data.sessionKey && !currentSessionKey) {
        setCurrentSessionKey(data.sessionKey)
        loadSessions()
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

  // 过滤出已激活的技能
  const activatedSkillConfigs = MARKETPLACE_SKILLS.filter(s => activatedSkills.includes(s.id))

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, sans-serif', background: '#0f0f1a' }}>
      <aside style={{ width: 260, background: '#1a1a2e', color: '#fff', padding: '1rem', display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #2a2a4a' }}>
          <h1 style={{ fontSize: '1.25rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🛡️</span>
            <span>SecuClaw</span>
          </h1>
          <div style={{ fontSize: '0.7rem', color: '#666' }}>AI驱动全域安全专家系统</div>
        </div>
        
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '1rem' }}>
          {/* 系统自带页面 */}
          <div style={{ fontSize: '0.7rem', color: '#666', marginBottom: '0.5rem', marginTop: '0.5rem' }}>系统能力</div>
          {SYSTEM_PAGES.map(item => (
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
            </button>
          ))}


          {/* 已激活的技能 */}
          {activatedSkillConfigs.length > 0 && (
            <>
              <div style={{ fontSize: '0.7rem', color: '#666', marginBottom: '0.5rem', marginTop: '1rem' }}>已激活技能</div>
              {activatedSkillConfigs.map(item => (
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
                  {item.id === 'remediation' && (
                    <span style={{ fontSize: '0.65rem', background: '#f97316', padding: '0.15rem 0.4rem', borderRadius: 10 }}>
                      {remediationTasks.filter(t => t.status !== 'completed').length}
                    </span>
                  )}
                </button>
              ))}
            </>
          )}
        </nav>

        {/* AI安全专家角色选择 */}
        {currentPage === 'chat' && (
        <>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.5rem' }}>安全角色</div>
            {skills.map(skill => (
              <button
                key={skill.id}
                onClick={() => setSelectedSkill(skill.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  marginBottom: '0.25rem',
                  background: selectedSkill === skill.id ? '#10b98120' : 'transparent',
                  border: 'none',
                  borderRadius: 6,
                  color: selectedSkill === skill.id ? '#10b981' : '#888',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  textAlign: 'left' as const,
                }}
              >
                <span>{skill.emoji}</span>
                <span style={{ flex: 1 }}>{skill.name}</span>
              </button>
            ))}
          </div>

          <div style={{ marginBottom: '1rem', paddingTop: '0.5rem', borderTop: '1px solid #2a2a4a' }}>
            <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.5rem' }}>LLM 厂商</div>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              disabled={autoRoute}
              style={{
                width: '100%',
                padding: '0.5rem 0.65rem',
                borderRadius: 6,
                border: '1px solid #2f2f4a',
                background: autoRoute ? '#1f1f32' : '#141426',
                color: autoRoute ? '#666' : '#c7c7d9',
                fontSize: '0.8rem',
                marginBottom: '0.5rem',
              }}
            >
              {providers.length > 0 ? (
                providers.map(provider => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))
              ) : (
                <option value="">暂无可用厂商</option>
              )}
            </select>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#9ca3af', fontSize: '0.75rem' }}>
              <input
                type="checkbox"
                checked={autoRoute}
                onChange={(e) => setAutoRoute(e.target.checked)}
                style={{ accentColor: '#10b981', width: 14, height: 14 }}
              />
              自动切换厂商
            </label>

            <div style={{ marginTop: '0.45rem', fontSize: '0.7rem', color: '#6b7280', lineHeight: 1.4 }}>
              {autoRoute
                ? '已开启自动切换：系统将根据任务类型自动选择最优厂商与模型。'
                : `手动模式：当前使用 ${selectedProvider || '未选择'}。`}
            </div>

            {lastRouting && (
              <div style={{
                marginTop: '0.55rem',
                padding: '0.45rem 0.55rem',
                borderRadius: 6,
                background: '#10b98118',
                border: '1px solid #10b9813d',
                color: '#86efac',
                fontSize: '0.7rem',
                lineHeight: 1.35,
              }}>
                路由: {lastRouting.taskCategory} | {lastRouting.reason}
              </div>
            )}
          </div>
        </>
        )}

        {/* 系统配置 */}
        <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #2a2a4a' }}>
          <button 
            onClick={() => setCurrentPage('settings')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              width: '100%',
              padding: '0.75rem 1rem',
              border: 'none',
              borderRadius: 8,
              background: currentPage === 'settings' ? '#64748b20' : 'transparent',
              color: currentPage === 'settings' ? '#64748b' : '#a0a0b0',
              cursor: 'pointer',
              fontSize: '0.9rem',
              transition: 'all 0.2s',
            }}
          >
            <span>⚙️</span>
            <span>系统配置</span>
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, overflow: 'auto', background: '#0f0f1a' }}>
        {/* 知识库 */}
        {currentPage === 'knowledge' && <KnowledgePage />}

        {/* AI安全专家 */}
        {currentPage === 'chat' && (
          <Chat
            messages={messages}
            input={input}
            loading={loading}
            currentSkill={currentSkill}
            onSend={sendChat}
            onInputChange={setInput}
            onFeedback={submitFeedback}
          />
        )}
        
        {/* 仪表盘 */}
        {currentPage === 'dashboard' && <Dashboard />}
        
        {/* 威胁情报 */}
        {currentPage === 'threatIntel' && <ThreatIntel />}
        
        {/* 合规报告 */}
        {currentPage === 'compliance' && <ComplianceReport />}
        
        {/* 作战室 */}
        {currentPage === 'warroom' && <WarRoom />}
        
        {/* 审计 */}
        {currentPage === 'auditor' && <Auditor />}
        
        {/* 风险 */}
        {currentPage === 'risk' && <RiskDashboard />}
        
        {/* 修复任务 */}
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

        {/* 技能市场 */}
        {currentPage === 'skills' && (
          <SkillsMarket 
            skills={MARKETPLACE_SKILLS}
            installedSkills={installedSkills}
            activatedSkills={activatedSkills}
            onInstallSkill={(skillId) => {
              if (isSkillPageType(skillId)) installSkill(skillId)
            }}
            onUninstallSkill={(skillId) => {
              if (isSkillPageType(skillId)) uninstallSkill(skillId)
            }}
            onActivateSkill={(skillId) => {
              if (isSkillPageType(skillId)) toggleSkillActivation(skillId)
            }}
            onOpenSkill={(skillId) => {
              if (isSkillPageType(skillId)) setCurrentPage(skillId)
            }}
          />
        )}
        
        {/* 系统配置 */}
        {currentPage === 'settings' && (
          <div style={{ flex: 1, overflow: 'auto' }}>
            <Settings />
          </div>
        )}
      </main>
    </div>
  )
}

export default App
