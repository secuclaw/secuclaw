import { useState, useEffect } from 'react'
import {
  Shield,
  Check,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'

interface SecurityRole {
  id: string
  name: string
  nameZh: string
  description: string
  icon: string
  providerId?: string
  modelName?: string
}

interface LLMProvider {
  id: string
  name: string
  baseUrl: string
  models: string[]
  enabled: boolean
}

interface RoleLLMConfig {
  roleId: string
  providerId: string
  modelName: string
}

// 预定义的8个安全专家角色
const SECURITY_ROLES: SecurityRole[] = [
  {
    id: 'security-expert',
    name: 'Security Expert',
    nameZh: '安全专家',
    description: '威胁检测、漏洞评估、事件响应、渗透测试',
    icon: '🛡️',
  },
  {
    id: 'privacy-security-officer',
    name: 'Privacy Security Officer',
    nameZh: '隐私安全官',
    description: '安全攻防 + 隐私保护/数据安全合规',
    icon: '🔒',
  },
  {
    id: 'security-architect',
    name: 'Security Architect',
    nameZh: '安全架构师',
    description: '安全攻防 + 基础设施/代码/网络安全',
    icon: '🏗️',
  },
  {
    id: 'business-security-officer',
    name: 'Business Security Officer',
    nameZh: '业务安全官',
    description: '安全攻防 + 供应链安全/业务连续性',
    icon: '💼',
  },
  {
    id: 'chief-security-architect',
    name: 'Chief Security Architect',
    nameZh: '首席安全架构官',
    description: '安全攻防 + 合规 + 技术安全全面负责',
    icon: '👔',
  },
  {
    id: 'supply-chain-security-officer',
    name: 'Supply Chain Security Officer',
    nameZh: '供应链安全官',
    description: '安全攻防 + 隐私合规 + 供应链安全',
    icon: '🔗',
  },
  {
    id: 'business-security-operations',
    name: 'Business Security Operations',
    nameZh: '业务安全运营官',
    description: '安全攻防 + 技术安全 + 业务连续性',
    icon: '⚙️',
  },
  {
    id: 'secuclaw',
    name: 'Enterprise Security Commander',
    nameZh: '全域安全指挥官',
    description: '完整安全攻防 + 全维度安全属性',
    icon: '🎖️',
  },
]

function AISecurityExpertConfig() {
  const [providers, setProviders] = useState<LLMProvider[]>([])
  const [roleConfigs, setRoleConfigs] = useState<Record<string, RoleLLMConfig>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // 获取providers
      const providersRes = await fetch('/api/llm/providers')
      if (providersRes.ok) {
        const data = await providersRes.json()
        setProviders(data.providers || [])
      }

      // 获取角色配置
      const rolesRes = await fetch('/api/roles/llm-config')
      if (rolesRes.ok) {
        const data = await rolesRes.json()
        const configsMap: Record<string, RoleLLMConfig> = {}
        ;(data.configs || []).forEach((config: RoleLLMConfig) => {
          configsMap[config.roleId] = config
        })
        setRoleConfigs(configsMap)
      }
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRoleConfigChange = (roleId: string, field: 'providerId' | 'modelName', value: string) => {
    setRoleConfigs(prev => {
      const currentConfig = prev[roleId] || { roleId, providerId: '', modelName: '' }
      
      if (field === 'providerId') {
        // 当更换provider时，重置model
        const selectedProvider = providers.find(p => p.id === value)
        const defaultModel = selectedProvider?.models?.[0] || ''
        return {
          ...prev,
          [roleId]: {
            ...currentConfig,
            providerId: value,
            modelName: defaultModel,
          },
        }
      }
      
      return {
        ...prev,
        [roleId]: {
          ...currentConfig,
          [field]: value,
        },
      }
    })
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    try {
      const configs = Object.values(roleConfigs).filter(c => c.providerId && c.modelName)
      
      const response = await fetch('/api/roles/llm-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configs }),
      })

      if (response.ok) {
        setSuccess('角色 LLM 配置保存成功')
        setTimeout(() => setSuccess(null), 2000)
      } else {
        const errData = await response.json()
        setError(errData.message || '保存失败')
      }
    } catch (err) {
      setError('网络错误，请重试')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setRoleConfigs({})
    setSuccess('已重置为默认配置')
    setTimeout(() => setSuccess(null), 2000)
  }

  const getProviderModels = (providerId: string) => {
    const provider = providers.find(p => p.id === providerId)
    return provider?.models || []
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
          <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>AI 安全专家配置</h2>
          <p style={{ color: '#888', fontSize: '0.85rem' }}>
            为每个安全专家角色配置专用的 LLM 模型，支持多角色共享同一模型
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={handleReset}
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
            <RefreshCw size={16} />
            重置
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              background: saving ? '#4a4a6a' : '#3b82f6',
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            <Check size={16} />
            {saving ? '保存中...' : '保存配置'}
          </button>
        </div>
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

      {providers.length === 0 ? (
        <div style={{
          padding: '3rem',
          textAlign: 'center',
          color: '#888',
          background: '#1a1a2e',
          borderRadius: 12,
        }}>
          <Shield size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <p>请先在"LLM 服务配置"中添加服务商</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {SECURITY_ROLES.map((role) => {
            const config = roleConfigs[role.id] || { roleId: role.id, providerId: '', modelName: '' }
            
            return (
              <div
                key={role.id}
                style={{
                  background: '#1a1a2e',
                  borderRadius: 12,
                  padding: '1.25rem',
                  border: '1px solid #2a2a3e',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                  {/* Role Icon & Info */}
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 10,
                    background: '#3b82f620',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    flexShrink: 0,
                  }}>
                    {role.icon}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 600 }}>{role.nameZh}</span>
                      <span style={{ fontSize: '0.75rem', color: '#888' }}>{role.name}</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: '#888', marginBottom: '1rem' }}>
                      {role.description}
                    </p>

                    {/* Provider & Model Selection */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{
                          display: 'block',
                          marginBottom: '0.5rem',
                          color: '#888',
                          fontSize: '0.8rem',
                        }}>
                          LLM 服务商
                        </label>
                        <select
                          value={config.providerId}
                          onChange={(e) => handleRoleConfigChange(role.id, 'providerId', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.6rem',
                            background: '#0f0f1a',
                            border: '1px solid #2a2a3e',
                            borderRadius: 8,
                            color: '#fff',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                          }}
                        >
                          <option value="">选择服务商</option>
                          {providers.filter(p => p.enabled).map((provider) => (
                            <option key={provider.id} value={provider.id}>
                              {provider.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{
                          display: 'block',
                          marginBottom: '0.5rem',
                          color: '#888',
                          fontSize: '0.8rem',
                        }}>
                          模型
                        </label>
                        <select
                          value={config.modelName}
                          onChange={(e) => handleRoleConfigChange(role.id, 'modelName', e.target.value)}
                          disabled={!config.providerId}
                          style={{
                            width: '100%',
                            padding: '0.6rem',
                            background: '#0f0f1a',
                            border: '1px solid #2a2a3e',
                            borderRadius: 8,
                            color: '#fff',
                            fontSize: '0.9rem',
                            cursor: config.providerId ? 'pointer' : 'not-allowed',
                            opacity: config.providerId ? 1 : 0.5,
                          }}
                        >
                          <option value="">选择模型</option>
                          {getProviderModels(config.providerId).map((model) => (
                            <option key={model} value={model}>
                              {model}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Current Config Display */}
                    {config.providerId && config.modelName && (
                      <div style={{
                        marginTop: '0.75rem',
                        padding: '0.5rem 0.75rem',
                        background: '#0f0f1a',
                        borderRadius: 6,
                        fontSize: '0.75rem',
                        color: '#888',
                      }}>
                        当前配置: {providers.find(p => p.id === config.providerId)?.name} / {config.modelName}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Configuration Summary */}
      {providers.length > 0 && (
        <div style={{
          marginTop: '1.5rem',
          padding: '1rem',
          background: '#1a1a2e',
          borderRadius: 12,
          border: '1px solid #2a2a3e',
        }}>
          <h3 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: '#888' }}>
            配置统计
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#3b82f6' }}>
                {SECURITY_ROLES.length}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#888' }}>安全角色</div>
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#22c55e' }}>
                {Object.values(roleConfigs).filter(c => c.providerId && c.modelName).length}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#888' }}>已配置</div>
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#f59e0b' }}>
                {providers.filter(p => p.enabled).length}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#888' }}>可用服务商</div>
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#8b5cf6' }}>
                {new Set(Object.values(roleConfigs).map(c => c.providerId)).size}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#888' }}>使用中服务商</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AISecurityExpertConfig
