import { useState } from 'react'
import {
  Settings as SettingsIcon,
  Server,
  Database,
  Shield,
  Bell,
  Save,
  CheckCircle,
  Cpu,
  Users,
} from 'lucide-react'
import LLMServiceConfig from './LLMServiceConfig'
import AISecurityExpertConfig from './AISecurityExpertConfig'

interface ProviderConfig {
  id: string
  name: string
  type: 'local' | 'cloud'
  enabled: boolean
  apiKey?: string
  baseUrl?: string
  model?: string
  status: 'connected' | 'disconnected' | 'error'
}

const defaultProviders: ProviderConfig[] = [
  { id: 'ollama', name: 'Ollama', type: 'local', enabled: true, baseUrl: 'http://localhost:11434', model: 'llama3', status: 'connected' },
  { id: 'openai', name: 'OpenAI', type: 'cloud', enabled: false, model: 'gpt-4', status: 'disconnected' },
  { id: 'anthropic', name: 'Anthropic Claude', type: 'cloud', enabled: false, model: 'claude-3-opus', status: 'disconnected' },
]

const tabs = [
  { id: 'ai-experts', label: 'AI安全专家配置', icon: <Users size={18} /> },
  { id: 'llm-service', label: 'LLM服务配置', icon: <Cpu size={18} /> },
  { id: 'providers', label: 'LLM 提供商', icon: <Server size={18} /> },
  { id: 'knowledge', label: '知识库', icon: <Database size={18} /> },
  { id: 'system', label: '系统设置', icon: <SettingsIcon size={18} /> },
  { id: 'security', label: '安全配置', icon: <Shield size={18} /> },
  { id: 'notifications', label: '通知设置', icon: <Bell size={18} /> },
  { id: 'about', label: '关于系统', icon: <Database size={18} /> },
]

function Settings() {
  const [activeTab, setActiveTab] = useState('providers')
  const [providers, setProviders] = useState<ProviderConfig[]>(defaultProviders)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }, 500)
  }

  const toggleProvider = (id: string) => {
    setProviders(providers.map(p => 
      p.id === id ? { ...p, enabled: !p.enabled } : p
    ))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return '#22c55e'
      case 'error': return '#ef4444'
      default: return '#888'
    }
  }

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
              onClick={handleSave}
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
          {activeTab === 'ai-experts' && (
            <AISecurityExpertConfig />
          )}

          {activeTab === 'llm-service' && (
            <LLMServiceConfig />
          )}

          {activeTab === 'providers' && (
            <div>
              <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>LLM 提供商配置</h2>
              <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                配置和管理大语言模型提供商。
              </p>
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                          {provider.status === 'connected' ? '已连接' : '未连接'}
                        </span>
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={provider.enabled}
                            onChange={() => toggleProvider(provider.id)}
                            style={{ accentColor: '#3b82f6', width: 16, height: 16 }}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'knowledge' && (
            <div>
              <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>知识库配置</h2>
              <p style={{ color: '#888', fontSize: '0.85rem' }}>
                配置 MITRE ATT&CK 和 SCF 安全控制框架知识库。
              </p>
            </div>
          )}

          {activeTab === 'system' && (
            <div>
              <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>系统设置</h2>
              <p style={{ color: '#888', fontSize: '0.85rem' }}>
                系统配置选项。
              </p>
            </div>
          )}

          {activeTab === 'security' && (
            <div>
              <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>安全配置</h2>
              <p style={{ color: '#888', fontSize: '0.85rem' }}>
                安全相关配置。
              </p>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div>
              <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>通知设置</h2>
              <p style={{ color: '#888', fontSize: '0.85rem' }}>
                通知渠道配置。
              </p>
            </div>
          )}

          {activeTab === 'about' && (
            <div>
              <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>关于系统</h2>
              <p style={{ color: '#888', fontSize: '0.85rem' }}>
                SecuClaw - AI-Driven Enterprise Security Operations Platform
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default Settings
