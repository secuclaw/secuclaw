import { useState, useEffect, useCallback } from 'react'
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Server,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react'

interface LLMProvider {
  id: string
  name: string
  baseUrl: string
  apiKey: string
  models: string[]
  enabled: boolean
  status: 'connected' | 'disconnected' | 'error'
}

interface ProviderFormData {
  name: string
  baseUrl: string
  apiKey: string
  models: string
}

const STORAGE_KEY = 'secuclaw_llm_providers_v2'

const defaultFormData: ProviderFormData = {
  name: '',
  baseUrl: '',
  apiKey: '',
  models: '',
}

// Default providers for demo
const defaultProviders: LLMProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    enabled: true,
    status: 'connected',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com',
    apiKey: '',
    models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
    enabled: false,
    status: 'disconnected',
  },
]

// Custom hook for localStorage persistence
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  // Get initial value from localStorage or use default
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.error('Error reading localStorage:', error)
      return initialValue
    }
  })

  // Wrap setValue to also update localStorage
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      window.localStorage.setItem(key, JSON.stringify(valueToStore))
    } catch (error) {
      console.error('Error saving to localStorage:', error)
    }
  }, [key, storedValue])

  // Also sync when storedValue changes from outside (e.g., from another component)
  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key)
      if (item) {
        const parsed = JSON.parse(item)
        if (JSON.stringify(parsed) !== JSON.stringify(storedValue)) {
          setStoredValue(parsed)
        }
      }
    } catch (error) {
      console.error('Error syncing localStorage:', error)
    }
  }, [key, storedValue])

  return [storedValue, setValue]
}

function LLMServiceConfig() {
  const [providers, setProviders] = useLocalStorage<LLMProvider[]>(STORAGE_KEY, defaultProviders)
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<ProviderFormData>(defaultFormData)
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Initialize loading state
  useEffect(() => {
    setLoading(false)
  }, [])

  const handleAddNew = () => {
    setEditingId('new')
    setFormData(defaultFormData)
    setError(null)
  }

  const handleEdit = (provider: LLMProvider) => {
    setEditingId(provider.id)
    setFormData({
      name: provider.name,
      baseUrl: provider.baseUrl,
      apiKey: provider.apiKey || '',
      models: provider.models?.join(', ') || '',
    })
    setError(null)
  }

  const handleCancel = () => {
    setEditingId(null)
    setFormData(defaultFormData)
    setError(null)
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('请输入服务商名称')
      return
    }
    if (!formData.baseUrl.trim()) {
      setError('请输入 Base URL')
      return
    }

    try {
      const providerData: LLMProvider = {
        id: editingId === 'new' ? `provider-${Date.now()}` : editingId!,
        name: formData.name,
        baseUrl: formData.baseUrl,
        apiKey: formData.apiKey,
        models: formData.models.split(',').map(m => m.trim()).filter(Boolean),
        enabled: true,
        status: 'connected',
      }

      let newProviders: LLMProvider[]
      if (editingId === 'new') {
        newProviders = [...providers, providerData]
      } else {
        newProviders = providers.map(p => 
          p.id === editingId ? providerData : p
        )
      }

      setProviders(newProviders)
      setSuccess(editingId === 'new' ? '服务商添加成功' : '服务商更新成功')
      setTimeout(() => setSuccess(null), 2000)
      handleCancel()
    } catch (err) {
      setError('保存失败')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此服务商吗？')) return

    try {
      const newProviders = providers.filter(p => p.id !== id)
      setProviders(newProviders)
      setSuccess('服务商已删除')
      setTimeout(() => setSuccess(null), 2000)
    } catch (err) {
      setError('删除失败')
    }
  }

  const handleToggleEnabled = (id: string) => {
    const newProviders = providers.map(p => 
      p.id === id ? { ...p, enabled: !p.enabled, status: !p.enabled ? 'connected' as const : 'disconnected' as const } : p
    )
    setProviders(newProviders)
  }

  const toggleApiKeyVisibility = (id: string) => {
    setShowApiKey(prev => ({ ...prev, [id]: !prev[id] }))
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
        加载中...
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>LLM 服务配置</h2>
          <p style={{ color: '#888', fontSize: '0.85rem' }}>
            管理大语言模型服务商，配置 API 密钥和模型列表
          </p>
        </div>
        {editingId !== 'new' && (
          <button
            onClick={handleAddNew}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              background: '#3b82f6',
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            <Plus size={16} />
            添加服务商
          </button>
        )}
      </div>

      {error && (
        <div style={{
          padding: '0.75rem 1rem',
          background: '#ef444420',
          border: '1px solid #ef4444',
          borderRadius: 8,
          marginBottom: '1rem',
          color: '#ef4444',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {success && (
        <div style={{
          padding: '0.75rem 1rem',
          background: '#22c55e20',
          border: '1px solid #22c55e',
          borderRadius: 8,
          marginBottom: '1rem',
          color: '#22c55e',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <Check size={16} />
          {success}
        </div>
      )}

      {/* Add/Edit Form */}
      {editingId && (
        <div style={{
          background: '#1a1a2e',
          borderRadius: 12,
          padding: '1.5rem',
          marginBottom: '1rem',
          border: '1px solid #3b82f6',
        }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>
            {editingId === 'new' ? '添加新服务商' : '编辑服务商'}
          </h3>
          
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888', fontSize: '0.85rem' }}>
                服务商名称 *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例如: OpenAI, Anthropic, DeepSeek"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: '#0f0f1a',
                  border: '1px solid #2a2a3e',
                  borderRadius: 8,
                  color: '#fff',
                  fontSize: '0.9rem',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888', fontSize: '0.85rem' }}>
                Base URL *
              </label>
              <input
                type="text"
                value={formData.baseUrl}
                onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                placeholder="例如: https://api.openai.com/v1"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: '#0f0f1a',
                  border: '1px solid #2a2a3e',
                  borderRadius: 8,
                  color: '#fff',
                  fontSize: '0.9rem',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888', fontSize: '0.85rem' }}>
                API Key
              </label>
              <input
                type="password"
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                placeholder="sk-..."
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: '#0f0f1a',
                  border: '1px solid #2a2a3e',
                  borderRadius: 8,
                  color: '#fff',
                  fontSize: '0.9rem',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888', fontSize: '0.85rem' }}>
                模型列表 (逗号分隔)
              </label>
              <input
                type="text"
                value={formData.models}
                onChange={(e) => setFormData({ ...formData, models: e.target.value })}
                placeholder="例如: gpt-4, gpt-3.5-turbo, gpt-4-turbo"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: '#0f0f1a',
                  border: '1px solid #2a2a3e',
                  borderRadius: 8,
                  color: '#fff',
                  fontSize: '0.9rem',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button
              onClick={handleSave}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                background: '#3b82f6',
                border: 'none',
                borderRadius: 8,
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              <Check size={16} />
              保存
            </button>
            <button
              onClick={handleCancel}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                background: '#2a2a3e',
                border: 'none',
                borderRadius: 8,
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              <X size={16} />
              取消
            </button>
          </div>
        </div>
      )}

      {/* Provider List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {providers.length === 0 && !editingId ? (
          <div style={{
            padding: '3rem',
            textAlign: 'center',
            color: '#888',
            background: '#1a1a2e',
            borderRadius: 12,
          }}>
            <Server size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p>暂无 LLM 服务商配置</p>
            <p style={{ fontSize: '0.85rem' }}>点击上方"添加服务商"按钮开始配置</p>
          </div>
        ) : (
          providers.map((provider) => (
            <div
              key={provider.id}
              style={{
                background: '#1a1a2e',
                borderRadius: 12,
                padding: '1.25rem',
                border: `1px solid ${provider.enabled ? '#3b82f6' : '#2a2a3e'}`,
                opacity: provider.enabled ? 1 : 0.6,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      background: '#3b82f620',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Server size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '1rem' }}>{provider.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#888' }}>
                        {provider.baseUrl}
                      </div>
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleToggleEnabled(provider.id)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.7rem',
                          background: provider.enabled ? '#22c55e20' : '#2a2a4a',
                          border: 'none',
                          borderRadius: 4,
                          color: provider.enabled ? '#22c55e' : '#888',
                          cursor: 'pointer',
                        }}
                      >
                        {provider.enabled ? '已启用' : '已禁用'}
                      </button>
                      <span style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: provider.status === 'connected' ? '#22c55e' : '#ef4444',
                      }} />
                    </div>
                  </div>

                  {provider.apiKey && (
                    <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: '#888' }}>API Key:</span>
                      <code style={{
                        fontSize: '0.75rem',
                        background: '#0f0f1a',
                        padding: '0.25rem 0.5rem',
                        borderRadius: 4,
                        color: showApiKey[provider.id] ? '#fff' : '#888',
                      }}>
                        {showApiKey[provider.id] ? provider.apiKey : '••••••••••••'}
                      </code>
                      <button
                        onClick={() => toggleApiKeyVisibility(provider.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#888',
                          cursor: 'pointer',
                          padding: '0.25rem',
                        }}
                      >
                        {showApiKey[provider.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  )}

                  {provider.models && provider.models.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {provider.models.map((model) => (
                        <span
                          key={model}
                          style={{
                            fontSize: '0.75rem',
                            background: '#2a2a4a',
                            padding: '0.25rem 0.5rem',
                            borderRadius: 4,
                            color: '#aaa',
                          }}
                        >
                          {model}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleEdit(provider)}
                    style={{
                      background: '#2a2a4a',
                      border: 'none',
                      borderRadius: 6,
                      padding: '0.5rem',
                      color: '#888',
                      cursor: 'pointer',
                    }}
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(provider.id)}
                    style={{
                      background: '#ef444420',
                      border: 'none',
                      borderRadius: 6,
                      padding: '0.5rem',
                      color: '#ef4444',
                      cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default LLMServiceConfig
