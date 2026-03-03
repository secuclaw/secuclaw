import { useState, useEffect } from 'react'
import {
  Settings as SettingsIcon,
  Server,
  Shield,
  Bell,
  Database,
  Save,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Trash2,
} from 'lucide-react'

interface ProviderConfig {
  id: string
  name: string
  type: 'local' | 'cloud'
  enabled: boolean
  apiKey?: string
  baseUrl?: string
  model?: string
  organization?: string
  status: 'connected' | 'disconnected' | 'error'
  supportsCustomBaseUrl?: boolean
  availableModels?: string[]
  isCustom?: boolean
}

interface NotificationChannel {
  id: string
  name: string
  type: 'feishu' | 'discord' | 'slack' | 'telegram' | 'email'
  enabled: boolean
  status: 'connected' | 'disconnected' | 'error'
  // 飞书/Lark 配置
  appId?: string
  appSecret?: string
  encryptKey?: string
  verificationToken?: string
  domain?: 'feishu' | 'lark'
  // Discord 配置
  botToken?: string
  channelId?: string
  // Slack 配置
  slackBotToken?: string
  appToken?: string
  slackChannelId?: string
  // Telegram 配置
  telegramBotToken?: string
  telegramChatId?: string
}

type AIExpertMode = 'shared' | 'per_role'

interface AIExpertRoleBinding {
  roleId: string
  roleName: string
  providerId: string
  model: string
}

interface AIExpertConfig {
  mode: AIExpertMode
  shared: {
    providerId: string
    model: string
  }
  bindings: AIExpertRoleBinding[]
}

interface SystemConfig {
  sessionTimeout: number
  maxHistoryDays: number
  enableWebSocket: boolean
  enableNotifications: boolean
  logLevel: 'debug' | 'info' | 'warn' | 'error'
  language: 'zh-CN' | 'en-US'
}

const defaultProviders: ProviderConfig[] = [
  { id: 'ollama', name: 'Ollama', type: 'local', enabled: true, baseUrl: 'http://localhost:11434', model: 'llama3', status: 'connected' },
  { id: 'openai', name: 'OpenAI', type: 'cloud', enabled: false, apiKey: '', model: 'gpt-4', status: 'disconnected', supportsCustomBaseUrl: true },
  { id: 'anthropic', name: 'Anthropic Claude', type: 'cloud', enabled: false, apiKey: '', model: 'claude-3-opus', status: 'disconnected', supportsCustomBaseUrl: true },
  { id: 'deepseek', name: 'DeepSeek', type: 'cloud', enabled: false, apiKey: '', model: 'deepseek-chat', status: 'disconnected', supportsCustomBaseUrl: true },
  { id: 'zhipu', name: '智谱 AI', type: 'cloud', enabled: false, apiKey: '', model: 'glm-4', status: 'disconnected', supportsCustomBaseUrl: true },
  { id: 'moonshot', name: 'Moonshot', type: 'cloud', enabled: false, apiKey: '', model: 'moonshot-v1', status: 'disconnected', supportsCustomBaseUrl: true },
  { id: 'minimax', name: 'MiniMax', type: 'cloud', enabled: false, apiKey: '', model: 'abab6.5-chat', status: 'disconnected', supportsCustomBaseUrl: true },
]
const defaultSystemConfig: SystemConfig = {
  sessionTimeout: 30,
  maxHistoryDays: 90,
  enableWebSocket: true,
  enableNotifications: true,
  logLevel: 'info',
  language: 'zh-CN',
}

const defaultNotificationChannels: NotificationChannel[] = [
  { id: 'feishu', name: '飞书/Lark', type: 'feishu', enabled: false, appId: '', appSecret: '', encryptKey: '', verificationToken: '', domain: 'feishu', status: 'disconnected' },
  { id: 'discord', name: 'Discord', type: 'discord', enabled: false, botToken: '', channelId: '', status: 'disconnected' },
  { id: 'slack', name: 'Slack', type: 'slack', enabled: false, slackBotToken: '', appToken: '', slackChannelId: '', status: 'disconnected' },
  { id: 'telegram', name: 'Telegram', type: 'telegram', enabled: false, telegramBotToken: '', telegramChatId: '', status: 'disconnected' },
  { id: 'email', name: 'Email', type: 'email', enabled: false, status: 'disconnected' },
]

const defaultAIExpertConfig: AIExpertConfig = {
  mode: 'per_role',
  shared: {
    providerId: '',
    model: '',
  },
  bindings: [
    { roleId: 'security-expert', roleName: '安全专家', providerId: '', model: '' },
    { roleId: 'privacy-officer', roleName: '隐私安全官', providerId: '', model: '' },
    { roleId: 'security-architect', roleName: '安全架构师', providerId: '', model: '' },
    { roleId: 'business-security-officer', roleName: '业务安全官', providerId: '', model: '' },
    { roleId: 'ciso', roleName: '首席信息安全官角色', providerId: '', model: '' },
    { roleId: 'supply-chain-security', roleName: '供应链安全官', providerId: '', model: '' },
    { roleId: 'security-ops', roleName: '安全运营官', providerId: '', model: '' },
    { roleId: 'secuclaw-commander', roleName: '全域安全指挥官', providerId: '', model: '' }
  ],
}

const roleIdAliases: Record<string, string> = {
  'privacy-security-officer': 'privacy-officer',
  'chief-security-architect': 'ciso',
  'supply-chain-officer': 'supply-chain-security',
  'supply-chain-security-officer': 'supply-chain-security',
  'security-ops-officer': 'security-ops',
  'business-security-operations': 'security-ops',
  'secuclaw': 'secuclaw-commander',
}

const providerModelFallbackMap: Record<string, string[]> = {
  openai: ['gpt-4o', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4o-mini'],
  anthropic: ['claude-3-7-sonnet-latest', 'claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest'],
  deepseek: ['deepseek-chat', 'deepseek-reasoner'],
  zhipu: ['glm-4-plus', 'glm-4-air', 'glm-4-flash'],
  moonshot: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
  minimax: ['abab6.5-chat', 'abab6.5s-chat'],
}

type SettingsTab = 'providers' | 'aiExpert' | 'knowledge' | 'system' | 'security' | 'notifications' | 'about'

function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('providers')
  const [providers, setProviders] = useState<ProviderConfig[]>([])
  const [systemConfig, setSystemConfig] = useState<SystemConfig>(defaultSystemConfig)
  const [notificationChannels, setNotificationChannels] = useState<NotificationChannel[]>(defaultNotificationChannels)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({})
  const [testResult, setTestResult] = useState<{provider: string, success: boolean, message: string} | null>(null)
  const [mitreStats, setMitreStats] = useState<{loaded: boolean; tactics: number; techniques: number; groups: number; mitigations: number} | null>(null)
  const [scfStats, setScfStats] = useState<{loaded: boolean; domains: number; controls: number; frameworks: string[]} | null>(null)
  const [updatingKnowledge, setUpdatingKnowledge] = useState(false)
  const [providersLoading, setProvidersLoading] = useState(true)
  const [modelsLoading, setModelsLoading] = useState<Record<string, boolean>>({})
  const [aiExpertConfig, setAiExpertConfig] = useState<AIExpertConfig>(defaultAIExpertConfig)

  const normalizeAIExpertConfig = (value: unknown): AIExpertConfig => {
    if (!value || typeof value !== 'object') return defaultAIExpertConfig
    const raw = value as Partial<AIExpertConfig>
    const mode: AIExpertMode = raw.mode === 'shared' ? 'shared' : 'per_role'
    const bindingsMap = new Map<string, AIExpertRoleBinding>()

    if (Array.isArray(raw.bindings)) {
      raw.bindings.forEach((item) => {
        if (!item || typeof item !== 'object') return
        const row = item as Partial<AIExpertRoleBinding>
        if (!row.roleId) return
        const normalizedRoleId = roleIdAliases[row.roleId] || row.roleId
        bindingsMap.set(normalizedRoleId, {
          roleId: normalizedRoleId,
          roleName: row.roleName || normalizedRoleId,
          providerId: row.providerId || '',
          model: row.model || '',
        })
      })
    }

    return {
      mode,
      shared: {
        providerId: raw.shared?.providerId || '',
        model: raw.shared?.model || '',
      },
      bindings: defaultAIExpertConfig.bindings.map((role) => {
        const existing = bindingsMap.get(role.roleId)
        return existing
          ? {
              ...role,
              providerId: existing.providerId || '',
              model: existing.model || '',
            }
          : { ...role }
      }),
    }
  }

  const mergeModels = (providerId: string, models: string[]) => {
    const fallback = providerModelFallbackMap[providerId] || []
    return Array.from(new Set([...models, ...fallback].filter(Boolean)))
  }

  const updateProviderModels = (providerId: string, models: string[]) => {
    const mergedModels = mergeModels(providerId, models)
    setProviders(prev => prev.map(p => {
      if (p.id !== providerId) return p
      const keepCurrent = p.model && mergedModels.includes(p.model)
      return {
        ...p,
        availableModels: mergedModels,
        model: keepCurrent ? p.model : (p.model || mergedModels[0] || ''),
      }
    }))
  }

  const getProviderModels = (providerId: string) => {
    if (!providerId) return []
    const provider = providers.find((item) => item.id === providerId)
    return provider?.availableModels || []
  }

  const updateRoleBinding = (roleId: string, patch: Partial<AIExpertRoleBinding>) => {
    setAiExpertConfig((prev) => ({
      ...prev,
      bindings: prev.bindings.map((role) => (role.roleId === roleId ? { ...role, ...patch } : role)),
    }))
  }

  useEffect(() => {
    // Fetch providers from API
    setProvidersLoading(true)
    fetch('/api/llm/providers')
      .then(r => r.json())
      .then(data => {
        if (data.providers) {
          const hydratedProviders = (data.providers as ProviderConfig[]).map(provider => {
            const availableModels = mergeModels(provider.id, provider.availableModels || [])
            return {
              ...provider,
              availableModels,
              model: provider.model || availableModels[0] || '',
            }
          })
          setProviders(hydratedProviders)
        }
      })
      .catch(() => {
        // If API fails, use default providers as fallback
        setProviders(defaultProviders.map(provider => ({
          ...provider,
          availableModels: mergeModels(provider.id, []),
        })))
      })
      .finally(() => {
        setProvidersLoading(false)
      })
    fetch('/api/config/system')
      .then(r => r.json())
      .then(data => {
        if (data.config) setSystemConfig(data.config)
      })
      .catch(() => {})
    
    fetch('/api/config/channels')
      .then(r => r.json())
      .then(data => {
        if (data.channels && data.channels.length > 0) setNotificationChannels(data.channels)
      })
      .catch(() => {})

    fetch('/api/config/ai-expert')
      .then(r => r.json())
      .then(data => {
        if (data.config) {
          setAiExpertConfig(normalizeAIExpertConfig(data.config))
        }
      })
      .catch(() => {
        setAiExpertConfig(defaultAIExpertConfig)
      })
  }, [])
  
  // Load knowledge stats
  const loadKnowledgeStats = () => {
    fetch('/api/knowledge/mitre/stats')
      .then(r => r.json())
      .then(data => setMitreStats(data))
      .catch(() => {})
    
    fetch('/api/knowledge/scf/stats')
      .then(r => r.json())
      .then(data => setScfStats(data))
      .catch(() => {})
  }
  
  useEffect(() => {
    loadKnowledgeStats()
  }, [])
  
  const updateMitreData = async () => {
    setUpdatingKnowledge(true)
    try {
      const res = await fetch('/api/knowledge/mitre/update', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        loadKnowledgeStats()
      }
    } catch (err) {
      console.error('Failed to update MITRE data:', err)
    }
    setUpdatingKnowledge(false)
  }
  
  const updateScfData = async () => {
    setUpdatingKnowledge(true)
    try {
      const res = await fetch('/api/knowledge/scf/update', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        loadKnowledgeStats()
      }
    } catch (err) {
      console.error('Failed to update SCF data:', err)
    }
    setUpdatingKnowledge(false)
  }

  const saveConfig = async () => {
    setLoading(true)
    try {
      // Save providers to new API
      await fetch('/api/llm/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providers }),
      })
      await fetch('/api/config/system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: systemConfig }),
      })
      await fetch('/api/config/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channels: notificationChannels }),
      })
      await fetch('/api/config/ai-expert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: aiExpertConfig }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('Failed to save config:', err)
    }
    setLoading(false)
  }

  const testProvider = async (providerId: string) => {
    const provider = providers.find(p => p.id === providerId)
    if (!provider) return
    
    setTestResult(null)
    try {
      const res = await fetch('/api/providers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          provider: providerId,
          baseUrl: provider.baseUrl,
          apiKey: provider.apiKey,
          model: provider.model
        }),
      })
      const data = await res.json()
      const models = Array.isArray(data.models)
        ? data.models.filter((item: unknown): item is string => typeof item === 'string' && item.length > 0)
        : []

      setTestResult({
        provider: providerId,
        success: data.success,
        message: data.message || (data.success ? '连接成功' : '连接失败'),
      })
      
      setProviders(prev => prev.map(p => 
        p.id === providerId 
          ? { ...p, status: data.success ? 'connected' : 'error' }
          : p
      ))

      if (data.success) {
        updateProviderModels(providerId, models)
      }
    } catch (err) {
      setTestResult({
        provider: providerId,
        success: false,
        message: '测试失败',
      })
    }
  }

  const toggleApiKeyVisibility = (providerId: string) => {
    setShowApiKeys(prev => ({ ...prev, [providerId]: !prev[providerId] }))
  }

  // 添加自定义厂商
  const addCustomProvider = async () => {
    const id = `custom-${Date.now()}`
    const newProvider: ProviderConfig = {
      id,
      name: '自定义厂商',
      type: 'cloud',
      enabled: false,
      apiKey: '',
      baseUrl: '',
      model: '',
      status: 'disconnected',
      supportsCustomBaseUrl: true,
      isCustom: true,
    }
    
    try {
      const response = await fetch('/api/llm/providers/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProvider),
      })
      
      if (response.ok) {
        setProviders(prev => [...prev, newProvider])
      } else {
        console.error('Failed to add provider')
      }
    } catch (error) {
      console.error('Failed to add provider:', error)
      // Fallback to local state update
      setProviders(prev => [...prev, newProvider])
    }
  }

  // 删除厂商（仅自定义厂商可删除）
  const removeProvider = async (providerId: string) => {
    const provider = providers.find(p => p.id === providerId)
    if (!provider?.isCustom) return
    
    try {
      const response = await fetch(`/api/llm/providers/${providerId}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        setProviders(prev => prev.filter(p => p.id !== providerId))
      } else {
        console.error('Failed to remove provider')
      }
    } catch (error) {
      console.error('Failed to remove provider:', error)
      // Fallback to local state update
      setProviders(prev => prev.filter(p => p.id !== providerId))
    }
  }
  
  // Update provider property
  const updateProvider = (providerId: string, field: string, value: any) => {
    setProviders(prev => prev.map(p => 
      p.id === providerId ? { ...p, [field]: value } : p
    ))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return '#22c55e'
      case 'error': return '#ef4444'
      default: return '#6b7280'
    }
  }

  // 动态获取模型列表（从API）
  const fetchModels = async (providerId: string) => {
    const provider = providers.find(p => p.id === providerId)
    if (!provider) return

    setModelsLoading(prev => ({ ...prev, [providerId]: true }))
    try {
      const res = await fetch('/api/providers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: providerId,
          baseUrl: provider.baseUrl,
          apiKey: provider.apiKey,
          model: provider.model,
        }),
      })
      const data = await res.json()
      const models = Array.isArray(data.models)
        ? data.models.filter((item: unknown): item is string => typeof item === 'string' && item.length > 0)
        : []

      if (data.success) {
        updateProviderModels(providerId, models)
        setTestResult({
          provider: providerId,
          success: true,
          message: models.length > 0 ? `已识别 ${models.length} 个可用模型` : (data.message || '模型列表获取完成'),
        })
      } else {
        setTestResult({
          provider: providerId,
          success: false,
          message: data.message || '模型列表获取失败',
        })
      }
    } catch (e) {
      console.error('Failed to fetch models:', e)
      setTestResult({
        provider: providerId,
        success: false,
        message: '模型列表获取失败',
      })
    } finally {
      setModelsLoading(prev => ({ ...prev, [providerId]: false }))
    }
  }

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'providers', label: 'LLM 提供商', icon: <Server size={18} /> },
    { id: 'aiExpert', label: 'AI安全专家', icon: <Shield size={18} /> },
    { id: 'knowledge', label: '知识库', icon: <Database size={18} /> },
    { id: 'system', label: '系统设置', icon: <SettingsIcon size={18} /> },
    { id: 'security', label: '安全配置', icon: <Shield size={18} /> },
    { id: 'notifications', label: '通知设置', icon: <Bell size={18} /> },
    { id: 'about', label: '关于系统', icon: <Database size={18} /> },
  ]

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0f0f1a', color: '#fff' }}>
      <header style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #2a2a3e' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <SettingsIcon size={24} />
            系统配置
          </h1>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {saved && (
              <span style={{ color: '#22c55e', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <CheckCircle size={14} />
                已保存
              </span>
            )}
            <button
              onClick={saveConfig}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                background: loading ? '#4a4a6a' : '#3b82f6',
                border: 'none',
                borderRadius: 8,
                color: '#fff',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
              {loading ? '保存中...' : '保存配置'}
            </button>
          </div>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <aside style={{ width: 200, borderRight: '1px solid #2a2a3e', padding: '1rem 0' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                width: '100%',
                padding: '0.75rem 1.25rem',
                border: 'none',
                background: activeTab === tab.id ? '#2a2a4a' : 'transparent',
                color: activeTab === tab.id ? '#fff' : '#888',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '0.9rem',
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </aside>

        <main style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {activeTab === 'providers' && (
            <div>
              <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>LLM 提供商配置</h2>
              <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                配置和管理大语言模型提供商。本地提供商无需 API Key，云服务提供商需要配置 API Key。
              </p>
              
              {/* 添加自定义厂商按钮 */}
              <button
                onClick={addCustomProvider}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1rem',
                  background: '#1a1a2e',
                  border: '1px dashed #3b82f6',
                  borderRadius: 12,
                  color: '#3b82f6',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  width: '100%',
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>+</span>
                添加自定义厂商
              </button>
              
              {providersLoading ? (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  padding: '2rem',
                  color: '#888'
                }}>
                  加载中...
                </div>
              ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {providers.map(provider => (
                  <div
                    key={provider.id}
                    style={{
                      background: '#1a1a2e',
                      borderRadius: 12,
                      padding: '1.25rem',
                      border: `1px solid ${provider.enabled ? '#3b82f6' : '#2a2a3e'}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: 40,
                          height: 40,
                          borderRadius: 8,
                          background: provider.type === 'local' ? '#22c55e20' : '#3b82f620',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.2rem',
                        }}>
                          {provider.type === 'local' ? '🏠' : '☁️'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{provider.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#888' }}>
                            {provider.type === 'local' ? '本地部署' : '云服务'}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          fontSize: '0.75rem',
                          color: getStatusColor(provider.status),
                        }}>
                          <div style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: getStatusColor(provider.status),
                          }} />
                          {provider.status === 'connected' ? '已连接' : provider.status === 'error' ? '错误' : '未连接'}
                        </span>
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={provider.enabled}
                            onChange={(e) => updateProvider(provider.id, 'enabled', e.target.checked)}
                            style={{ accentColor: '#3b82f6', width: 16, height: 16 }}
                          />
                        </label>
                        {provider.isCustom && (
                          <button
                            onClick={() => removeProvider(provider.id)}
                            title="删除此厂商"
                            style={{
                              padding: '0.25rem',
                              background: 'transparent',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                    </div>
                  </div>
                    {provider.enabled && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        {provider.type === 'local' ? (
                          <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>
                              Base URL
                            </label>
                            <input
                              type="text"
                              value={provider.baseUrl || ''}
                              onChange={(e) => updateProvider(provider.id, 'baseUrl', e.target.value)}
                              placeholder="http://localhost:11434"
                              style={{
                                width: '100%',
                                padding: '0.5rem 0.75rem',
                                borderRadius: 6,
                                border: '1px solid #333',
                                background: '#0f0f1a',
                                color: '#fff',
                                fontSize: '0.85rem',
                              }}
                            />
                          </div>
                        ) : (
                          <>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>
                                API Key
                              </label>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input
                                  type={showApiKeys[provider.id] ? 'text' : 'password'}
                                  value={provider.apiKey || ''}
                                  onChange={(e) => updateProvider(provider.id, 'apiKey', e.target.value)}
                                  placeholder="sk-..."
                                  style={{
                                    flex: 1,
                                    padding: '0.5rem 0.75rem',
                                    borderRadius: 6,
                                    border: '1px solid #333',
                                    background: '#0f0f1a',
                                    color: '#fff',
                                    fontSize: '0.85rem',
                                  }}
                                />
                                <button
                                  onClick={() => toggleApiKeyVisibility(provider.id)}
                                  style={{
                                    padding: '0.5rem',
                                    background: '#2a2a3e',
                                    border: 'none',
                                    borderRadius: 6,
                                    color: '#888',
                                    cursor: 'pointer',
                                  }}
                                >
                                  {showApiKeys[provider.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                              </div>
                            </div>
                            {/* 自定义厂商名称 */}
                            {provider.isCustom && (
                              <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>
                                  厂商名称
                                </label>
                                <input
                                  type="text"
                                  value={provider.name}
                                  onChange={(e) => updateProvider(provider.id, 'name', e.target.value)}
                                  placeholder="自定义厂商"
                                  style={{
                                    width: '100%',
                                    padding: '0.5rem 0.75rem',
                                    borderRadius: 6,
                                    border: '1px solid #333',
                                    background: '#0f0f1a',
                                    color: '#fff',
                                    fontSize: '0.85rem',
                                  }}
                                />
                              </div>
                            )}
                          </>
                        )}
                        
                        {/* 自定义 Base URL - 仅云厂商（支持自定义URL） */}
                        {provider.type !== 'local' && (provider.supportsCustomBaseUrl || provider.isCustom) && (
                          <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>
                              Base URL
                            </label>
                            <input
                              type="text"
                              value={provider.baseUrl || ''}
                              onChange={(e) => updateProvider(provider.id, 'baseUrl', e.target.value)}
                              placeholder="https://api.example.com/v1"
                              style={{
                                width: '100%',
                                padding: '0.5rem 0.75rem',
                                borderRadius: 6,
                                border: '1px solid #333',
                                background: '#0f0f1a',
                                color: '#fff',
                                fontSize: '0.85rem',
                              }}
                            />
                          </div>
                        )}
                        
                        {/* 模型配置 */}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>
                            默认模型
                          </label>
                          {provider.availableModels && provider.availableModels.length > 0 && (
                            <select
                              value={provider.model || ''}
                              onChange={(e) => updateProvider(provider.id, 'model', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '0.5rem 0.75rem',
                                borderRadius: 6,
                                border: '1px solid #333',
                                background: '#0f0f1a',
                                color: '#fff',
                                fontSize: '0.85rem',
                                marginBottom: '0.5rem',
                              }}
                            >
                              <option value="">请选择模型</option>
                              {provider.availableModels.map(model => (
                                <option key={model} value={model}>{model}</option>
                              ))}
                            </select>
                          )}
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                              type="text"
                              value={provider.model || ''}
                              onChange={(e) => updateProvider(provider.id, 'model', e.target.value)}
                              placeholder="可手动输入模型名称"
                              list={provider.availableModels && provider.availableModels.length > 0 ? `models-${provider.id}` : undefined}
                              style={{
                                flex: 1,
                                padding: '0.5rem 0.75rem',
                                borderRadius: 6,
                                border: '1px solid #333',
                                background: '#0f0f1a',
                                color: '#fff',
                                fontSize: '0.85rem',
                              }}
                            />
                            {provider.availableModels && provider.availableModels.length > 0 && (
                              <datalist id={`models-${provider.id}`}>
                                {provider.availableModels.map(model => (
                                  <option key={model} value={model} />
                                ))}
                              </datalist>
                            )}
                            <button
                              onClick={() => fetchModels(provider.id)}
                              title="获取当前厂商可用模型"
                              disabled={modelsLoading[provider.id]}
                              style={{
                                padding: '0.5rem',
                                background: '#2a2a3e',
                                border: 'none',
                                borderRadius: 6,
                                color: '#888',
                                cursor: modelsLoading[provider.id] ? 'wait' : 'pointer',
                                opacity: modelsLoading[provider.id] ? 0.7 : 1,
                              }}
                            >
                              <RefreshCw size={16} style={modelsLoading[provider.id] ? { animation: 'spin 1s linear infinite' } : undefined} />
                            </button>
                          </div>
                          <div style={{ marginTop: '0.35rem', fontSize: '0.72rem', color: '#7a7a93' }}>
                            {provider.availableModels && provider.availableModels.length > 0
                              ? `已识别 ${provider.availableModels.length} 个可用模型，可直接选择一个作为默认模型`
                              : '请填写 Base URL / API Key 后点击刷新按钮识别模型清单'}
                          </div>
                        </div>
                        
                        <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => testProvider(provider.id)}
                            style={{
                              padding: '0.5rem 1rem',
                              background: '#2a2a3e',
                              border: '1px solid #3b82f6',
                              borderRadius: 6,
                              color: '#3b82f6',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                            }}
                          >
                            测试连接
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {testResult && testResult.provider === provider.id && (
                      <div style={{
                        marginTop: '0.75rem',
                        padding: '0.5rem 0.75rem',
                        borderRadius: 6,
                        background: testResult.success ? '#22c55e20' : '#ef444420',
                        color: testResult.success ? '#22c55e' : '#ef4444',
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}>
                        {testResult.success ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                        {testResult.message}
                      </div>
                    )}
                  </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'aiExpert' && (
            <div>
              <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>AI安全专家配置</h2>
              <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                为不同安全角色绑定 LLM 厂商与模型。支持统一模型（全部角色共用）和按角色独立模型两种方式。
              </p>

              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                <button
                  onClick={() => setAiExpertConfig(prev => ({ ...prev, mode: 'shared' }))}
                  style={{
                    padding: '0.45rem 0.75rem',
                    borderRadius: 6,
                    border: aiExpertConfig.mode === 'shared' ? '1px solid #3b82f6' : '1px solid #2a2a3e',
                    background: aiExpertConfig.mode === 'shared' ? '#3b82f620' : '#1a1a2e',
                    color: aiExpertConfig.mode === 'shared' ? '#93c5fd' : '#a1a1aa',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                  }}
                >
                  统一模型
                </button>
                <button
                  onClick={() => setAiExpertConfig(prev => ({ ...prev, mode: 'per_role' }))}
                  style={{
                    padding: '0.45rem 0.75rem',
                    borderRadius: 6,
                    border: aiExpertConfig.mode === 'per_role' ? '1px solid #3b82f6' : '1px solid #2a2a3e',
                    background: aiExpertConfig.mode === 'per_role' ? '#3b82f620' : '#1a1a2e',
                    color: aiExpertConfig.mode === 'per_role' ? '#93c5fd' : '#a1a1aa',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                  }}
                >
                  按角色绑定
                </button>
              </div>

              {aiExpertConfig.mode === 'shared' ? (
                <div style={{ background: '#1a1a2e', borderRadius: 12, padding: '1rem', border: '1px solid #2a2a3e' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>LLM 厂商</label>
                      <select
                        value={aiExpertConfig.shared.providerId}
                        onChange={(e) => setAiExpertConfig(prev => ({
                          ...prev,
                          shared: { providerId: e.target.value, model: '' },
                        }))}
                        style={{
                          width: '100%',
                          padding: '0.5rem 0.75rem',
                          borderRadius: 6,
                          border: '1px solid #333',
                          background: '#0f0f1a',
                          color: '#fff',
                          fontSize: '0.85rem',
                        }}
                      >
                        <option value="">请选择厂商</option>
                        {providers.map(provider => (
                          <option key={provider.id} value={provider.id}>
                            {provider.name}{provider.enabled ? '' : '（未启用）'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>默认模型</label>
                      <input
                        value={aiExpertConfig.shared.model}
                        onChange={(e) => setAiExpertConfig(prev => ({
                          ...prev,
                          shared: { ...prev.shared, model: e.target.value },
                        }))}
                        list="shared-role-models"
                        placeholder="可手动输入或从列表选择"
                        style={{
                          width: '100%',
                          padding: '0.5rem 0.75rem',
                          borderRadius: 6,
                          border: '1px solid #333',
                          background: '#0f0f1a',
                          color: '#fff',
                          fontSize: '0.85rem',
                        }}
                      />
                      <datalist id="shared-role-models">
                        {getProviderModels(aiExpertConfig.shared.providerId).map(model => (
                          <option key={model} value={model} />
                        ))}
                      </datalist>
                    </div>
                  </div>
                  <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#7a7a93' }}>
                    统一模型模式下，全部 8 个安全角色都会使用该厂商与模型。
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {aiExpertConfig.bindings.map(role => (
                    <div
                      key={role.roleId}
                      style={{
                        background: '#1a1a2e',
                        borderRadius: 12,
                        padding: '1rem',
                        border: '1px solid #2a2a3e',
                      }}
                    >
                      <div style={{ marginBottom: '0.6rem', fontWeight: 600, fontSize: '0.9rem' }}>
                        {role.roleName}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>LLM 厂商</label>
                          <select
                            value={role.providerId}
                            onChange={(e) => updateRoleBinding(role.roleId, { providerId: e.target.value, model: '' })}
                            style={{
                              width: '100%',
                              padding: '0.5rem 0.75rem',
                              borderRadius: 6,
                              border: '1px solid #333',
                              background: '#0f0f1a',
                              color: '#fff',
                              fontSize: '0.85rem',
                            }}
                          >
                            <option value="">请选择厂商</option>
                            {providers.map(provider => (
                              <option key={provider.id} value={provider.id}>
                                {provider.name}{provider.enabled ? '' : '（未启用）'}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>默认模型</label>
                          <input
                            value={role.model}
                            onChange={(e) => updateRoleBinding(role.roleId, { model: e.target.value })}
                            list={`role-models-${role.roleId}`}
                            placeholder="可手动输入或从列表选择"
                            style={{
                              width: '100%',
                              padding: '0.5rem 0.75rem',
                              borderRadius: 6,
                              border: '1px solid #333',
                              background: '#0f0f1a',
                              color: '#fff',
                              fontSize: '0.85rem',
                            }}
                          />
                          <datalist id={`role-models-${role.roleId}`}>
                            {getProviderModels(role.providerId).map(model => (
                              <option key={model} value={model} />
                            ))}
                          </datalist>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'knowledge' && (
            <div>
              <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>知识库配置</h2>
              <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                配置 MITRE ATT&CK 和 SCF 安全控制框架知识库。
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ background: '#1a1a2e', borderRadius: 12, padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '1.5rem' }}>🎯</span>
                      <div>
                        <div style={{ fontWeight: 600 }}>MITRE ATT&CK</div>
                        <div style={{ fontSize: '0.75rem', color: '#888' }}>企业攻击战术与技术知识库</div>
                      </div>
                    </div>
                    <span style={{ color: '#22c55e', fontSize: '0.75rem' }}>已加载</span>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                    <div style={{ padding: '0.75rem', background: '#0f0f1a', borderRadius: 8, textAlign: 'center' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#3b82f6' }}>{mitreStats?.tactics || '-'}</div>
                      <div style={{ fontSize: '0.7rem', color: '#888' }}>战术</div>
                    </div>
                    <div style={{ padding: '0.75rem', background: '#0f0f1a', borderRadius: 8, textAlign: 'center' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#22c55e' }}>{mitreStats?.techniques || '-'}</div>
                      <div style={{ fontSize: '0.7rem', color: '#888' }}>技术</div>
                    </div>
                    <div style={{ padding: '0.75rem', background: '#0f0f1a', borderRadius: 8, textAlign: 'center' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#f97316' }}>{mitreStats?.groups || '-'}</div>
                      <div style={{ fontSize: '0.7rem', color: '#888' }}>组织</div>
                    </div>
                    <div style={{ padding: '0.75rem', background: '#0f0f1a', borderRadius: 8, textAlign: 'center' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#8b5cf6' }}>{mitreStats?.mitigations || '-'}</div>
                      <div style={{ fontSize: '0.7rem', color: '#888' }}>缓解</div>
                    </div>
                  </div>
                  
                  <div style={{ marginTop: '1rem' }}>
                    <button 
                      onClick={updateMitreData}
                      disabled={updatingKnowledge}
                      style={{
                      padding: '0.5rem 1rem',
                      background: '#2a2a3e',
                      border: '1px solid #3b82f6',
                      borderRadius: 6,
                      color: '#3b82f6',
                      cursor: updatingKnowledge ? 'wait' : 'pointer',
                      fontSize: '0.85rem',
                      marginRight: '0.5rem',
                    }}>
                      {updatingKnowledge ? '更新中...' : '更新数据'}
                    </button>
                    <button 
                      onClick={() => setActiveTab('knowledge')}
                      style={{
                      padding: '0.5rem 1rem',
                      background: '#2a2a3e',
                      border: 'none',
                      borderRadius: 6,
                      color: '#888',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                    }}>
                    </button>
                  </div>
                </div>
                
                <div style={{ background: '#1a1a2e', borderRadius: 12, padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '1.5rem' }}>📋</span>
                      <div>
                        <div style={{ fontWeight: 600 }}>SCF 安全控制框架</div>
                        <div style={{ fontSize: '0.75rem', color: '#888' }}>安全能力框架与控制项</div>
                      </div>
                    </div>
                    <span style={{ color: '#22c55e', fontSize: '0.75rem' }}>已加载</span>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                    <div style={{ padding: '0.75rem', background: '#0f0f1a', borderRadius: 8, textAlign: 'center' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#3b82f6' }}>{scfStats?.domains || '-'}</div>
                      <div style={{ fontSize: '0.7rem', color: '#888' }}>控制域</div>
                    </div>
                    <div style={{ padding: '0.75rem', background: '#0f0f1a', borderRadius: 8, textAlign: 'center' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#22c55e' }}>{scfStats?.controls || '-'}</div>
                      <div style={{ fontSize: '0.7rem', color: '#888' }}>控制项</div>
                    </div>
                    <div style={{ padding: '0.75rem', background: '#0f0f1a', borderRadius: 8, textAlign: 'center' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#f97316' }}>{scfStats?.frameworks?.length || 0}</div>
                      <div style={{ fontSize: '0.7rem', color: '#888' }}>框架</div>
                    </div>
                  </div>
                  
                  <div style={{ marginTop: '1rem' }}>
                    <button 
                      onClick={updateScfData}
                      disabled={updatingKnowledge}
                      style={{
                      padding: '0.5rem 1rem',
                      background: '#2a2a3e',
                      border: '1px solid #22c55e',
                      borderRadius: 6,
                      color: '#22c55e',
                      cursor: updatingKnowledge ? 'wait' : 'pointer',
                      fontSize: '0.85rem',
                      marginRight: '0.5rem',
                    }}>
                      {updatingKnowledge ? '更新中...' : '更新数据'}
                    </button>
                    <button 
                      onClick={() => setActiveTab('knowledge')}
                      style={{
                      padding: '0.5rem 1rem',
                      background: '#2a2a3e',
                      border: 'none',
                      borderRadius: 6,
                      color: '#888',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                    }}>
                    </button>
                  </div>
                </div>
                
                <div style={{ background: '#1a1a2e', borderRadius: 12, padding: '1.25rem' }}>
                  <h3 style={{ fontSize: '0.95rem', marginBottom: '1rem' }}>知识库同步</h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                      <div>
                        <div style={{ fontWeight: 500 }}>自动同步</div>
                        <div style={{ fontSize: '0.75rem', color: '#888' }}>每周自动更新知识库数据</div>
                      </div>
                      <input
                        type="checkbox"
                        defaultChecked
                        style={{ accentColor: '#3b82f6', width: 18, height: 18 }}
                      />
                    </label>
                    
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                      <div>
                        <div style={{ fontWeight: 500 }}>离线模式</div>
                        <div style={{ fontSize: '0.75rem', color: '#888' }}>仅使用本地缓存数据</div>
                      </div>
                      <input
                        type="checkbox"
                        style={{ accentColor: '#3b82f6', width: 18, height: 18 }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div>
              <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>系统设置</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ background: '#1a1a2e', borderRadius: 12, padding: '1.25rem' }}>
                  <h3 style={{ fontSize: '0.95rem', marginBottom: '1rem' }}>会话设置</h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>
                        会话超时 (分钟)
                      </label>
                      <input
                        type="number"
                        value={systemConfig.sessionTimeout}
                        onChange={(e) => setSystemConfig({ ...systemConfig, sessionTimeout: parseInt(e.target.value) || 30 })}
                        style={{
                          width: '100%',
                          padding: '0.5rem 0.75rem',
                          borderRadius: 6,
                          border: '1px solid #333',
                          background: '#0f0f1a',
                          color: '#fff',
                        }}
                      />
                    </div>
                    
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>
                        历史保留天数
                      </label>
                      <input
                        type="number"
                        value={systemConfig.maxHistoryDays}
                        onChange={(e) => setSystemConfig({ ...systemConfig, maxHistoryDays: parseInt(e.target.value) || 90 })}
                        style={{
                          width: '100%',
                          padding: '0.5rem 0.75rem',
                          borderRadius: 6,
                          border: '1px solid #333',
                          background: '#0f0f1a',
                          color: '#fff',
                        }}
                      />
                    </div>
                  </div>
                </div>
                
                <div style={{ background: '#1a1a2e', borderRadius: 12, padding: '1.25rem' }}>
                  <h3 style={{ fontSize: '0.95rem', marginBottom: '1rem' }}>功能开关</h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                      <div>
                        <div style={{ fontWeight: 500 }}>WebSocket 实时通信</div>
                        <div style={{ fontSize: '0.75rem', color: '#888' }}>启用实时数据推送</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={systemConfig.enableWebSocket}
                        onChange={(e) => setSystemConfig({ ...systemConfig, enableWebSocket: e.target.checked })}
                        style={{ accentColor: '#3b82f6', width: 18, height: 18 }}
                      />
                    </label>
                    
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                      <div>
                        <div style={{ fontWeight: 500 }}>系统通知</div>
                        <div style={{ fontSize: '0.75rem', color: '#888' }}>启用告警和事件通知</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={systemConfig.enableNotifications}
                        onChange={(e) => setSystemConfig({ ...systemConfig, enableNotifications: e.target.checked })}
                        style={{ accentColor: '#3b82f6', width: 18, height: 18 }}
                      />
                    </label>
                  </div>
                </div>
                
                <div style={{ background: '#1a1a2e', borderRadius: 12, padding: '1.25rem' }}>
                  <h3 style={{ fontSize: '0.95rem', marginBottom: '1rem' }}>日志与语言</h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>
                        日志级别
                      </label>
                      <select
                        value={systemConfig.logLevel}
                        onChange={(e) => setSystemConfig({ ...systemConfig, logLevel: e.target.value as SystemConfig['logLevel'] })}
                        style={{
                          width: '100%',
                          padding: '0.5rem 0.75rem',
                          borderRadius: 6,
                          border: '1px solid #333',
                          background: '#0f0f1a',
                          color: '#fff',
                        }}
                      >
                        <option value="debug">Debug</option>
                        <option value="info">Info</option>
                        <option value="warn">Warn</option>
                        <option value="error">Error</option>
                      </select>
                    </div>
                    
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>
                        界面语言
                      </label>
                      <select
                        value={systemConfig.language}
                        onChange={(e) => setSystemConfig({ ...systemConfig, language: e.target.value as SystemConfig['language'] })}
                        style={{
                          width: '100%',
                          padding: '0.5rem 0.75rem',
                          borderRadius: 6,
                          border: '1px solid #333',
                          background: '#0f0f1a',
                          color: '#fff',
                        }}
                      >
                        <option value="zh-CN">简体中文</option>
                        <option value="en-US">English</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div>
              <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>安全配置</h2>
              
              <div style={{ background: '#1a1a2e', borderRadius: 12, padding: '1.25rem' }}>
                <h3 style={{ fontSize: '0.95rem', marginBottom: '1rem' }}>访问控制</h3>
                <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  安全配置功能正在开发中。当前版本暂不支持多用户认证。
                </p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ padding: '0.75rem', background: '#0f0f1a', borderRadius: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>SSO 单点登录</span>
                      <span style={{ color: '#888', fontSize: '0.75rem' }}>即将推出</span>
                    </div>
                  </div>
                  <div style={{ padding: '0.75rem', background: '#0f0f1a', borderRadius: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>RBAC 权限控制</span>
                      <span style={{ color: '#888', fontSize: '0.75rem' }}>即将推出</span>
                    </div>
                  </div>
                  <div style={{ padding: '0.75rem', background: '#0f0f1a', borderRadius: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>API Key 管理</span>
                      <span style={{ color: '#888', fontSize: '0.75rem' }}>即将推出</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div>
              <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>通知设置</h2>
              <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                配置告警通知渠道。支持飞书、Discord、Slack、Telegram等多种通知方式。
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {notificationChannels.map(channel => (
                  <div
                    key={channel.id}
                    style={{
                      background: '#1a1a2e',
                      borderRadius: 12,
                      padding: '1.25rem',
                      border: `1px solid ${channel.enabled ? '#3b82f6' : '#2a2a3e'}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: 40,
                          height: 40,
                          borderRadius: 8,
                          background: channel.enabled ? '#3b82f620' : '#2a2a3e',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.2rem',
                        }}>
                          {channel.type === 'feishu' ? '🎧' : 
                           channel.type === 'discord' ? '💬' : 
                           channel.type === 'slack' ? '💼' : 
                           channel.type === 'telegram' ? '🤖' : 
                           '📧'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{channel.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#888' }}>
                            {channel.type === 'feishu' ? '飞书机器人 (App ID + App Secret)' : 
                             channel.type === 'discord' ? 'Discord Bot (Bot Token)' : 
                             channel.type === 'slack' ? 'Slack Bot (Bot Token + App Token)' : 
                             channel.type === 'telegram' ? 'Telegram Bot (Bot Token + Chat ID)' : 
                             '邮件通知'}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          fontSize: '0.75rem',
                          color: channel.status === 'connected' ? '#22c55e' : channel.status === 'error' ? '#ef4444' : '#6b7280',
                        }}>
                          <div style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: channel.status === 'connected' ? '#22c55e' : channel.status === 'error' ? '#ef4444' : '#6b7280',
                          }} />
                          {channel.status === 'connected' ? '已连接' : channel.status === 'error' ? '错误' : '未配置'}
                        </span>
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={channel.enabled}
                            onChange={(e) => {
                              setNotificationChannels(prev => prev.map(c => 
                                c.id === channel.id ? { ...c, enabled: e.target.checked } : c
                              ))
                            }}
                            style={{ accentColor: '#3b82f6', width: 16, height: 16 }}
                          />
                        </label>
                      </div>
                    </div>
                    
                    {channel.enabled && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {/* 飞书/Lark 配置 */}
                        {channel.type === 'feishu' && (
                          <>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                              <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>
                                  App ID
                                </label>
                                <input
                                  type="text"
                                  value={channel.appId || ''}
                                  onChange={(e) => {
                                    setNotificationChannels(prev => prev.map(c => 
                                      c.id === channel.id ? { ...c, appId: e.target.value } : c
                                    ))
                                  }}
                                  placeholder="cli_a1b2c3d4e5f6g7h8"
                                  style={{
                                    width: '100%',
                                    padding: '0.5rem 0.75rem',
                                    borderRadius: 6,
                                    border: '1px solid #333',
                                    background: '#0f0f1a',
                                    color: '#fff',
                                    fontSize: '0.85rem',
                                  }}
                                />
                              </div>
                              <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>
                                  App Secret
                                </label>
                                <input
                                  type="password"
                                  value={channel.appSecret || ''}
                                  onChange={(e) => {
                                    setNotificationChannels(prev => prev.map(c => 
                                      c.id === channel.id ? { ...c, appSecret: e.target.value } : c
                                    ))
                                  }}
                                  placeholder="请输入App Secret"
                                  style={{
                                    width: '100%',
                                    padding: '0.5rem 0.75rem',
                                    borderRadius: 6,
                                    border: '1px solid #333',
                                    background: '#0f0f1a',
                                    color: '#fff',
                                    fontSize: '0.85rem',
                                  }}
                                />
                              </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                              <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>
                                  Encrypt Key (可选)
                                </label>
                                <input
                                  type="password"
                                  value={channel.encryptKey || ''}
                                  onChange={(e) => {
                                    setNotificationChannels(prev => prev.map(c => 
                                      c.id === channel.id ? { ...c, encryptKey: e.target.value } : c
                                    ))
                                  }}
                                  placeholder="加密Key"
                                  style={{
                                    width: '100%',
                                    padding: '0.5rem 0.75rem',
                                    borderRadius: 6,
                                    border: '1px solid #333',
                                    background: '#0f0f1a',
                                    color: '#fff',
                                    fontSize: '0.85rem',
                                  }}
                                />
                              </div>
                              <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>
                                  Verification Token (可选)
                                </label>
                                <input
                                  type="password"
                                  value={channel.verificationToken || ''}
                                  onChange={(e) => {
                                    setNotificationChannels(prev => prev.map(c => 
                                      c.id === channel.id ? { ...c, verificationToken: e.target.value } : c
                                    ))
                                  }}
                                  placeholder="验证Token"
                                  style={{
                                    width: '100%',
                                    padding: '0.5rem 0.75rem',
                                    borderRadius: 6,
                                    border: '1px solid #333',
                                    background: '#0f0f1a',
                                    color: '#fff',
                                    fontSize: '0.85rem',
                                  }}
                                />
                              </div>
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>
                                域名
                              </label>
                              <select
                                value={channel.domain || 'feishu'}
                                onChange={(e) => {
                                  setNotificationChannels(prev => prev.map(c => 
                                    c.id === channel.id ? { ...c, domain: e.target.value as 'feishu' | 'lark' } : c
                                  ))
                                }}
                                style={{
                                  width: '100%',
                                  padding: '0.5rem 0.75rem',
                                  borderRadius: 6,
                                  border: '1px solid #333',
                                  background: '#0f0f1a',
                                  color: '#fff',
                                  fontSize: '0.85rem',
                                }}
                              >
                                <option value="feishu">飞书 (中国)</option>
                                <option value="lark">Lark (国际)</option>
                              </select>
                            </div>
                          </>
                        )}
                        
                        {/* Discord 配置 */}
                        {channel.type === 'discord' && (
                          <>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>
                                Bot Token
                              </label>
                              <input
                                type="password"
                                value={channel.botToken || ''}
                                onChange={(e) => {
                                  setNotificationChannels(prev => prev.map(c => 
                                    c.id === channel.id ? { ...c, botToken: e.target.value } : c
                                  ))
                                }}
                                placeholder="请输入Discord Bot Token"
                                style={{
                                  width: '100%',
                                  padding: '0.5rem 0.75rem',
                                  borderRadius: 6,
                                  border: '1px solid #333',
                                  background: '#0f0f1a',
                                  color: '#fff',
                                  fontSize: '0.85rem',
                                }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>
                                Channel ID (可选)
                              </label>
                              <input
                                type="text"
                                value={channel.channelId || ''}
                                onChange={(e) => {
                                  setNotificationChannels(prev => prev.map(c => 
                                    c.id === channel.id ? { ...c, channelId: e.target.value } : c
                                  ))
                                }}
                                placeholder="123456789012345678"
                                style={{
                                  width: '100%',
                                  padding: '0.5rem 0.75rem',
                                  borderRadius: 6,
                                  border: '1px solid #333',
                                  background: '#0f0f1a',
                                  color: '#fff',
                                  fontSize: '0.85rem',
                                }}
                              />
                            </div>
                          </>
                        )}
                        
                        {/* Slack 配置 */}
                        {channel.type === 'slack' && (
                          <>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>
                                Bot Token (xoxb-...)
                              </label>
                              <input
                                type="password"
                                value={channel.slackBotToken || ''}
                                onChange={(e) => {
                                  setNotificationChannels(prev => prev.map(c => 
                                    c.id === channel.id ? { ...c, slackBotToken: e.target.value } : c
                                  ))
                                }}
                                placeholder="xoxb-123456789012-1234567890123-AbCdEfGhIjKlMnOpQrStUvWx"
                                style={{
                                  width: '100%',
                                  padding: '0.5rem 0.75rem',
                                  borderRadius: 6,
                                  border: '1px solid #333',
                                  background: '#0f0f1a',
                                  color: '#fff',
                                  fontSize: '0.85rem',
                                }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>
                                App Token (xapp-...)
                              </label>
                              <input
                                type="password"
                                value={channel.appToken || ''}
                                onChange={(e) => {
                                  setNotificationChannels(prev => prev.map(c => 
                                    c.id === channel.id ? { ...c, appToken: e.target.value } : c
                                  ))
                                }}
                                placeholder="xapp-1-A1234567-1234567890123-abcdef1234567890abcdef1234567890ab"
                                style={{
                                  width: '100%',
                                  padding: '0.5rem 0.75rem',
                                  borderRadius: 6,
                                  border: '1px solid #333',
                                  background: '#0f0f1a',
                                  color: '#fff',
                                  fontSize: '0.85rem',
                                }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>
                                Channel ID (可选)
                              </label>
                              <input
                                type="text"
                                value={channel.slackChannelId || ''}
                                onChange={(e) => {
                                  setNotificationChannels(prev => prev.map(c => 
                                    c.id === channel.id ? { ...c, slackChannelId: e.target.value } : c
                                  ))
                                }}
                                placeholder="C1234567890"
                                style={{
                                  width: '100%',
                                  padding: '0.5rem 0.75rem',
                                  borderRadius: 6,
                                  border: '1px solid #333',
                                  background: '#0f0f1a',
                                  color: '#fff',
                                  fontSize: '0.85rem',
                                }}
                              />
                            </div>
                          </>
                        )}
                        
                        {/* Telegram 配置 */}
                        {channel.type === 'telegram' && (
                          <>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>
                                Bot Token
                              </label>
                              <input
                                type="password"
                                value={channel.telegramBotToken || ''}
                                onChange={(e) => {
                                  setNotificationChannels(prev => prev.map(c => 
                                    c.id === channel.id ? { ...c, telegramBotToken: e.target.value } : c
                                  ))
                                }}
                                placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                                style={{
                                  width: '100%',
                                  padding: '0.5rem 0.75rem',
                                  borderRadius: 6,
                                  border: '1px solid #333',
                                  background: '#0f0f1a',
                                  color: '#fff',
                                  fontSize: '0.85rem',
                                }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>
                                Chat ID
                              </label>
                              <input
                                type="text"
                                value={channel.telegramChatId || ''}
                                onChange={(e) => {
                                  setNotificationChannels(prev => prev.map(c => 
                                    c.id === channel.id ? { ...c, telegramChatId: e.target.value } : c
                                  ))
                                }}
                                placeholder="-1001234567890"
                                style={{
                                  width: '100%',
                                  padding: '0.5rem 0.75rem',
                                  borderRadius: 6,
                                  border: '1px solid #333',
                                  background: '#0f0f1a',
                                  color: '#fff',
                                  fontSize: '0.85rem',
                                }}
                              />
                            </div>
                          </>
                        )}
                        
                        {channel.type === 'email' && (
                          <div style={{ color: '#888', fontSize: '0.85rem' }}>
                            邮件通知配置需要设置SMTP服务器。请联系管理员配置。
                          </div>
                        )}
                        
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => {
                              setNotificationChannels(prev => prev.map(c => 
                                c.id === channel.id ? { ...c, status: 'connected' } : c
                              ))
                            }}
                            style={{
                              padding: '0.5rem 1rem',
                              background: '#2a2a3e',
                              border: '1px solid #3b82f6',
                              borderRadius: 6,
                              color: '#3b82f6',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                            }}
                          >
                            测试连接
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                <div style={{ background: '#1a1a2e', borderRadius: 12, padding: '1.25rem' }}>
                  <h3 style={{ fontSize: '0.95rem', marginBottom: '1rem' }}>通知事件</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                      <div>
                        <div style={{ fontWeight: 500 }}>安全告警</div>
                        <div style={{ fontSize: '0.75rem', color: '#888' }}>威胁检测、漏洞发现等</div>
                      </div>
                      <input type="checkbox" defaultChecked style={{ accentColor: '#3b82f6', width: 18, height: 18 }} />
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                      <div>
                        <div style={{ fontWeight: 500 }}>系统事件</div>
                        <div style={{ fontSize: '0.75rem', color: '#888' }}>服务状态、任务完成等</div>
                      </div>
                      <input type="checkbox" defaultChecked style={{ accentColor: '#3b82f6', width: 18, height: 18 }} />
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                      <div>
                        <div style={{ fontWeight: 500 }}>合规报告</div>
                        <div style={{ fontSize: '0.75rem', color: '#888' }}>合规检查结果、审计报告等</div>
                      </div>
                      <input type="checkbox" style={{ accentColor: '#3b82f6', width: 18, height: 18 }} />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'about' && (
            <div>
              <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>关于系统</h2>
              
              <div style={{ background: '#1a1a2e', borderRadius: 12, padding: '1.25rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🛡️</div>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>SecuClaw</h3>
                  <div style={{ color: '#888', fontSize: '0.85rem' }}>AI驱动全域安全专家系统</div>
                  <div style={{ color: '#666', fontSize: '0.75rem', marginTop: '0.5rem' }}>Version 1.0.0</div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ padding: '1rem', background: '#0f0f1a', borderRadius: 8 }}>
                    <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>MITRE ATT&CK</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#3b82f6' }}>14 战术</div>
                  </div>
                  <div style={{ padding: '1rem', background: '#0f0f1a', borderRadius: 8 }}>
                    <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>SCF 控制框架</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#22c55e' }}>33 域</div>
                  </div>
                  <div style={{ padding: '1rem', background: '#0f0f1a', borderRadius: 8 }}>
                    <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>安全角色</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#8b5cf6' }}>8 种组合</div>
                  </div>
                  <div style={{ padding: '1rem', background: '#0f0f1a', borderRadius: 8 }}>
                    <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>核心模块</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#f97316' }}>62+ 模块</div>
                  </div>
                </div>
                
                <div style={{ marginTop: '1.5rem', textAlign: 'center', color: '#666', fontSize: '0.75rem' }}>
                  © 2024 SecuClaw. All rights reserved.
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default Settings
