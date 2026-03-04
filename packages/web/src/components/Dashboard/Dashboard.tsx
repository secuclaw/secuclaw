import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Play, Shield } from 'lucide-react'
import { BarChart, PieChart, RadarChart, GaugeChart } from '../common/Charts'

interface SecurityStats {
  overallScore: number
  threatLevel: 'low' | 'medium' | 'high' | 'critical'
  activeThreats: number
  mitigatedToday: number
  pendingActions: number
  mitreCoverage: {
    tactic: string
    count: number
    percentage: number
  }[]
  recentAlerts: {
    id: string
    type: string
    severity: string
    message: string
    timestamp: number
  }[]
  topRisks: {
    id: string
    name: string
    score: number
    category: string
  }[]
}

function Dashboard() {
  const { t } = useTranslation()
  const [stats, setStats] = useState<SecurityStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [simulatedData, setSimulatedData] = useState<SecurityStats | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/knowledge/mitre/stats').then(r => r.json()).catch(() => ({ tactics: 0, techniques: 0, groups: 0 })),
      fetch('/api/knowledge/mitre/tactics').then(r => r.json()).catch(() => ({ tactics: [] })),
      fetch('/api/knowledge/scf/stats').then(r => r.json()).catch(() => ({ domains: 0, controls: 0 })),
      fetch('/api/assets').then(r => r.json()).catch(() => ({ assets: [] })),
      fetch('/api/vulnerabilities').then(r => r.json()).catch(() => ({ vulnerabilities: [] })),
    ]).then(([mitreStats, mitreTactics, , assetsData, vulnData]: unknown[]) => {
      const tactics = (mitreTactics as { tactics: unknown[] }).tactics || []
      const assetList = (assetsData as { assets: unknown[] }).assets || []
      const vulnList = (vulnData as { vulnerabilities: unknown[] }).vulnerabilities || []
      
      const criticalVulns = vulnList.filter((v) => (v as { severity: string }).severity === 'critical').length
      const highVulns = vulnList.filter((v) => (v as { severity: string }).severity === 'high').length
      
      setStats({
        overallScore: Math.max(0, 100 - (criticalVulns * 15 + highVulns * 8)),
        threatLevel: criticalVulns > 0 ? 'critical' : highVulns > 0 ? 'high' : 'medium',
        activeThreats: assetList.length,
        mitigatedToday: vulnList.filter((v) => (v as { status: string }).status === 'remediated').length,
        pendingActions: vulnList.filter((v) => (v as { status: string }).status === 'open').length,
        mitreCoverage: tactics.slice(0, 10).map((t) => {
          const tactic = t as { name?: string; shortName?: string; id?: string }
          return {
            tactic: tactic.name || tactic.shortName || 'Unknown',
            count: Math.floor(Math.random() * 50) + 10,
            percentage: Math.floor(Math.random() * 40) + 60,
          }
        }),
        recentAlerts: vulnList.slice(0, 3).map((v, i) => {
          const vuln = v as { id?: string; severity?: string; description?: string; cve?: string }
          return {
            id: vuln.id || `alert-${i}`,
            type: 'vulnerability',
            severity: vuln.severity || 'medium',
            message: vuln.description || vuln.cve || 'New vulnerability detected',
            timestamp: Date.now() - Math.random() * 86400000,
          }
        }),
        topRisks: assetList.slice(0, 3).map((a, i) => {
          const asset = a as { hostname?: string; ip?: string; os?: string; risk?: number; id?: string }
          return {
            id: asset.id || `risk-${i}`,
            name: `${asset.hostname || asset.ip}风险`,
            score: asset.risk || 50,
            category: asset.os || 'Unknown',
          }
        }),
      })
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })
  }, [])

  const simulateSituation = async () => {
    setLoading(true)
    
    await new Promise(r => setTimeout(r, 1500))
    
    const threatScenarios = [
      { name: "日常运营", baseScore: 75, threatLevel: 'low' as const, critical: 2, high: 5 },
      { name: "攻防演练", baseScore: 55, threatLevel: 'high' as const, critical: 8, high: 15 },
      { name: "护网行动", baseScore: 45, threatLevel: 'critical' as const, critical: 12, high: 20 },
      { name: "应急响应", baseScore: 60, threatLevel: 'medium' as const, critical: 5, high: 10 },
      { name: "安全巡检", baseScore: 80, threatLevel: 'low' as const, critical: 1, high: 3 },
    ]
    
    const scenario = threatScenarios[Math.floor(Math.random() * threatScenarios.length)]
    const critical = scenario.critical + Math.floor(Math.random() * 3)
    const high = scenario.high + Math.floor(Math.random() * 5)
    const medium = Math.floor(Math.random() * 10)
    
    const mitreTactics = [
      { id: 'TA0001', name: '初始访问', base: 65 },
      { id: 'TA0002', name: '执行', base: 70 },
      { id: 'TA0003', name: '持久化', base: 55 },
      { id: 'TA0004', name: '权限提升', base: 50 },
      { id: 'TA0005', name: '防御规避', base: 60 },
      { id: 'TA0006', name: '凭证访问', base: 65 },
      { id: 'TA0007', name: '发现', base: 75 },
      { id: 'TA0008', name: '横向移动', base: 45 },
      { id: 'TA0009', name: '收集', base: 70 },
      { id: 'TA0010', name: '命令与控制', base: 40 },
    ]
    
    const assets = [
      { id: '1', hostname: 'web-server-01', ip: '192.168.1.10', os: 'Linux', risk: 85 },
      { id: '2', hostname: 'db-server-01', ip: '192.168.1.20', os: 'Linux', risk: 72 },
      { id: '3', hostname: 'app-server-01', ip: '192.168.1.30', os: 'Windows', risk: 68 },
      { id: '4', hostname: 'firewall-01', ip: '192.168.1.1', os: 'Network', risk: 45 },
      { id: '5', hostname: 'mail-server-01', ip: '192.168.1.50', os: 'Linux', risk: 78 },
    ]
    
    const alertTypes = [
      { type: '入侵检测', message: '检测到可疑登录尝试' },
      { type: '漏洞告警', message: 'OpenSSL安全漏洞CVE-2024-1234' },
      { type: '异常行为', message: '异常网络流量模式' },
      { type: '配置变更', message: '防火墙规则被修改' },
      { type: '恶意软件', message: '检测到可疑文件上传' },
    ]
    
    const simulated: SecurityStats = {
      overallScore: Math.max(30, Math.min(95, scenario.baseScore + Math.floor(Math.random() * 20 - 10))),
      threatLevel: scenario.threatLevel,
      activeThreats: critical + high + medium,
      mitigatedToday: Math.floor(Math.random() * 15) + 5,
      pendingActions: critical + high,
      mitreCoverage: mitreTactics.map(t => ({
        tactic: t.name,
        count: Math.floor(Math.random() * 30) + 10,
        percentage: Math.max(20, Math.min(95, t.base + Math.floor(Math.random() * 30 - 15))),
      })),
      recentAlerts: Array(5).fill(0).map((_, i) => {
        const alertType = alertTypes[Math.floor(Math.random() * alertTypes.length)]
        const severities = ['critical', 'high', 'medium', 'low']
        return {
          id: `alert-${i}`,
          type: alertType.type,
          severity: severities[Math.floor(Math.random() * severities.length)],
          message: alertType.message,
          timestamp: Date.now() - Math.random() * 86400000 * 3,
        }
      }),
      topRisks: assets.slice(0, 3).map(a => ({
        id: a.id,
        name: `${a.hostname}风险`,
        score: a.risk,
        category: a.os,
      })),
    }
    
    setSimulatedData(simulated)
    setStats(simulated)
    setLoading(false)
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#22c55e'
    if (score >= 60) return '#eab308'
    if (score >= 40) return '#f97316'
    return '#ef4444'
  }

  const getThreatColor = (level: string) => {
    switch (level) {
      case 'low': return '#22c55e'
      case 'medium': return '#eab308'
      case 'high': return '#f97316'
      case 'critical': return '#ef4444'
      default: return '#888'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#ef4444'
      case 'high': return '#f97316'
      case 'medium': return '#eab308'
      case 'low': return '#22c55e'
      default: return '#888'
    }
  }

  const formatTime = (timestamp: number) => {
    const diff = Math.floor((Date.now() - timestamp) / 1000)
    if (diff < 60) return t('dashboard.secondsAgo', { count: diff })
    if (diff < 3600) return t('dashboard.minutesAgo', { count: Math.floor(diff / 60) })
    return t('dashboard.hoursAgo', { count: Math.floor(diff / 3600) })
  }

  if (loading || !stats) {
    return (
      <div style={{ padding: '1.5rem', color: '#fff', background: '#0f0f1a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div>{t('app.loading')}</div>
      </div>
    )
  }

  const mitreBarData = stats.mitreCoverage.slice(0, 6).map(t => ({ name: t.tactic, value: t.percentage }))
  
  const alertDistribution = [
    { name: t('app.critical'), value: stats.recentAlerts.filter(a => a.severity === 'critical').length || 1 },
    { name: t('app.high'), value: stats.recentAlerts.filter(a => a.severity === 'high').length || 2 },
    { name: t('app.medium'), value: stats.recentAlerts.filter(a => a.severity === 'medium').length || 3 },
    { name: t('app.low'), value: stats.recentAlerts.filter(a => a.severity === 'low').length || 1 },
  ]

  const securityPosture = [
    { name: t('dashboard.networkProtection'), value: 75 + Math.floor(Math.random() * 20) },
    { name: t('dashboard.endpointSecurity'), value: 60 + Math.floor(Math.random() * 25) },
    { name: t('dashboard.accessControl'), value: 70 + Math.floor(Math.random() * 20) },
    { name: t('dashboard.dataProtection'), value: 55 + Math.floor(Math.random() * 30) },
    { name: t('dashboard.monitoringAlerting'), value: 80 + Math.floor(Math.random() * 15) },
    { name: t('dashboard.emergencyResponse'), value: 65 + Math.floor(Math.random() * 25) },
  ]

  return (
    <div style={{ flex: 1, padding: '1.5rem', color: '#fff', background: '#0f0f1a', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Shield size={24} />
          {t('dashboard.situationalAwareness')}
          {simulatedData && (
            <span style={{ fontSize: '0.7rem', background: '#8b5cf6', color: '#fff', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
              {t('dashboard.simulated')}
            </span>
          )}
        </h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={simulateSituation}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              background: '#8b5cf6',
              border: 'none',
              borderRadius: 6,
              color: '#fff',
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            <Play size={14} />
            {loading ? t('dashboard.generating') : t('dashboard.simulateSituation')}
          </button>
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: '#1a1a2e', padding: '1.25rem', borderRadius: 12 }}>
          <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.5rem' }}>{t('dashboard.securityScore')}</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: getScoreColor(stats.overallScore) }}>
            {stats.overallScore}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '0.25rem' }}>{t('dashboard.maxScore')}</div>
        </div>
        
        <div style={{ background: '#1a1a2e', padding: '1.25rem', borderRadius: 12 }}>
          <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.5rem' }}>{t('dashboard.threatLevel')}</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: getThreatColor(stats.threatLevel), textTransform: 'uppercase' }}>
            {stats.threatLevel === 'low' ? '🟢 ' + t('dashboard.low') : stats.threatLevel === 'medium' ? '🟡 ' + t('dashboard.medium') : stats.threatLevel === 'high' ? '🟠 ' + t('dashboard.high') : '🔴 ' + t('dashboard.critical')}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '0.25rem' }}>{t('dashboard.activeThreatsCount', { count: stats.activeThreats })}</div>
        </div>
        
        <div style={{ background: '#1a1a2e', padding: '1.25rem', borderRadius: 12 }}>
          <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.5rem' }}>{t('dashboard.mitigatedToday')}</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#22c55e' }}>{stats.mitigatedToday}</div>
          <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '0.25rem' }}>{t('dashboard.securityEvents')}</div>
        </div>
        
        <div style={{ background: '#1a1a2e', padding: '1.25rem', borderRadius: 12 }}>
          <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.5rem' }}>{t('dashboard.pendingActions')}</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#eab308' }}>{stats.pendingActions}</div>
          <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '0.25rem' }}>{t('dashboard.securityActions')}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: '#1a1a2e', padding: '1.25rem', borderRadius: 12 }}>
          <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem', color: '#fff' }}>{t('dashboard.securityRadar')}</h3>
          <RadarChart data={securityPosture} height={250} />
        </div>
        
        <div style={{ background: '#1a1a2e', padding: '1.25rem', borderRadius: 12 }}>
          <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem', color: '#fff' }}>{t('dashboard.alertDistribution')}</h3>
          <PieChart data={alertDistribution} height={250} />
        </div>
        
        <div style={{ background: '#1a1a2e', padding: '1.25rem', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h3 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: '#fff' }}>{t('dashboard.overallSecurityScore')}</h3>
          <GaugeChart value={stats.overallScore} height={220} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        <div style={{ background: '#1a1a2e', padding: '1.25rem', borderRadius: 12 }}>
          <h2 style={{ fontSize: '1rem', marginBottom: '1rem', color: '#fff' }}>📊 {t('dashboard.mitreTacticCoverage')}</h2>
          <BarChart data={mitreBarData} horizontal height={280} color={['#3b82f6', '#22c55e']} />
        </div>

        <div style={{ background: '#1a1a2e', padding: '1.25rem', borderRadius: 12 }}>
          <h2 style={{ fontSize: '1rem', marginBottom: '1rem', color: '#fff' }}>⚠️ {t('dashboard.highRiskItems')}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {stats.topRisks.map((risk) => (
              <div key={risk.id} style={{ 
                padding: '0.75rem', 
                background: '#2a2a3e', 
                borderRadius: 8,
                borderLeft: `3px solid ${getScoreColor(100 - risk.score)}`,
              }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>{risk.name}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#888' }}>
                  <span>{risk.category}</span>
                  <span style={{ color: getScoreColor(100 - risk.score) }}>{t('dashboard.risk')} {risk.score}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ background: '#1a1a2e', padding: '1.25rem', borderRadius: 12, marginTop: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', marginBottom: '1rem', color: '#fff' }}>🔔 {t('dashboard.recentAlerts')}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {stats.recentAlerts.map((alert) => (
            <div 
              key={alert.id} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '1rem', 
                padding: '0.75rem 1rem', 
                background: '#2a2a3e', 
                borderRadius: 8,
              }}
            >
              <div style={{ 
                width: 8, 
                height: 8, 
                borderRadius: '50%', 
                background: getSeverityColor(alert.severity),
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.85rem' }}>{alert.message}</div>
                <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '0.25rem' }}>
                  {alert.type} · {formatTime(alert.timestamp)}
                </div>
              </div>
              <button style={{
                padding: '0.25rem 0.75rem',
                fontSize: '0.7rem',
                border: '1px solid #4a4a6a',
                borderRadius: 4,
                background: 'transparent',
                color: '#888',
                cursor: 'pointer',
              }}>
                {t('dashboard.view')}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
        <button style={{
          flex: 1,
          padding: '1rem',
          background: '#3b82f6',
          border: 'none',
          borderRadius: 8,
          color: '#fff',
          fontSize: '0.9rem',
          cursor: 'pointer',
        }}>
          🔍 {t('dashboard.startThreatHunt')}
        </button>
        <button style={{
          flex: 1,
          padding: '1rem',
          background: '#1a1a2e',
          border: '1px solid #3b82f6',
          borderRadius: 8,
          color: '#3b82f6',
          fontSize: '0.9rem',
          cursor: 'pointer',
        }}>
          📋 {t('dashboard.generateReport')}
        </button>
        <button style={{
          flex: 1,
          padding: '1rem',
          background: '#1a1a2e',
          border: '1px solid #f97316',
          borderRadius: 8,
          color: '#f97316',
          fontSize: '0.9rem',
          cursor: 'pointer',
        }}>
          🔴 {t('dashboard.redTeamDrill')}
        </button>
      </div>
    </div>
  )
}

export default Dashboard
