import { useState, useEffect } from 'react'
import { 
  AlertTriangle, 
  Globe, 
  Target, 
  Clock, 
  Activity
} from 'lucide-react'
import { BarChart, PieChart } from '../common/Charts'

interface ThreatActor {
  id: string
  name: string
  aliases: string[]
  country: string
  motivation: string
  firstSeen: string
  lastSeen: string
  threatLevel: 'critical' | 'high' | 'medium' | 'low'
  description: string
  techniques: string[]
  iocs: IOC[]
  campaigns: Campaign[]
}

interface IOC {
  id: string
  type: 'ip' | 'domain' | 'hash' | 'url' | 'email'
  value: string
  confidence: number
  firstSeen: string
  lastSeen: string
  tags: string[]
}

interface Campaign {
  id: string
  name: string
  startDate: string
  endDate?: string
  targets: string[]
  sectors: string[]
  status: 'active' | 'dormant' | 'finished'
}

interface ThreatEvent {
  id: string
  type: string
  title: string
  description: string
  timestamp: number
  severity: 'critical' | 'high' | 'medium' | 'low'
}

const mockThreatActors: ThreatActor[] = [
  {
    id: 'apt29',
    name: 'APT29 (Cozy Bear)',
    aliases: ['Cozy Bear', 'The Dukes', 'Nobelium'],
    country: 'Russia',
    motivation: 'Espionage',
    firstSeen: '2008',
    lastSeen: '2024',
    threatLevel: 'critical',
    description: 'APT29 is a threat group attributed to Russia\'s Foreign Intelligence Service (SVR). Known for sophisticated cyber espionage operations targeting government, think tanks, and healthcare sectors.',
    techniques: ['T1566.001', 'T1078', 'T1110', 'T1021.001', 'T1055', 'T1003'],
    iocs: [
      { id: '1', type: 'ip', value: '185.141.63.120', confidence: 95, firstSeen: '2024-01-15', lastSeen: '2024-02-20', tags: ['C2', 'phishing'] },
      { id: '2', type: 'domain', value: 'microsoftonline.cc', confidence: 88, firstSeen: '2024-01-10', lastSeen: '2024-02-18', tags: ['phishing', 'typosquatting'] },
      { id: '3', type: 'hash', value: 'a1b2c3d4e5f6...', confidence: 92, firstSeen: '2024-01-20', lastSeen: '2024-02-22', tags: ['malware', 'cobalt-strike'] },
    ],
    campaigns: [
      { id: '1', name: 'SolarWinds Supply Chain', startDate: '2020-03', endDate: '2021-07', targets: ['US Government', 'Fortune 500'], sectors: ['Government', 'Technology'], status: 'finished' },
      { id: '2', name: 'COVID-19 Vaccine Research', startDate: '2023-01', targets: ['Research Labs', 'Pharma'], sectors: ['Healthcare', 'Pharma'], status: 'active' },
    ],
  },
  {
    id: 'apt41',
    name: 'APT41 (Winnti Group)',
    aliases: ['Winnti', 'Barium', 'Double Dragon'],
    country: 'China',
    motivation: 'Espionage & Financial',
    firstSeen: '2007',
    lastSeen: '2024',
    threatLevel: 'critical',
    description: 'APT41 is a prolific Chinese state-sponsored threat group known for both espionage and financially motivated cyber operations. Unique in their dual mission profile.',
    techniques: ['T1195.002', 'T1199', 'T1134', 'T1566.002', 'T1059', 'T1071'],
    iocs: [
      { id: '4', type: 'domain', value: 'cdn-update.net', confidence: 90, firstSeen: '2023-11-01', lastSeen: '2024-02-15', tags: ['C2', 'supply-chain'] },
      { id: '5', type: 'hash', value: 'f8e7d6c5b4a3...', confidence: 85, firstSeen: '2023-12-10', lastSeen: '2024-01-28', tags: ['backdoor', 'keyboy'] },
    ],
    campaigns: [
      { id: '3', name: 'CCleaner Supply Chain', startDate: '2017-08', endDate: '2018-03', targets: ['Tech Companies'], sectors: ['Technology'], status: 'finished' },
      { id: '4', name: 'Gaming Industry Attacks', startDate: '2023-06', targets: ['Game Studios', 'Publishers'], sectors: ['Gaming'], status: 'active' },
    ],
  },
  {
    id: 'lockbit',
    name: 'LockBit 3.0',
    aliases: ['LockBit Black', 'ABCD'],
    country: 'Russia',
    motivation: 'Financial',
    firstSeen: '2019-09',
    lastSeen: '2024',
    threatLevel: 'high',
    description: 'LockBit is one of the most prolific ransomware-as-a-service (RaaS) operations. Known for aggressive tactics and a sophisticated affiliate program.',
    techniques: ['T1486', 'T1566.001', 'T1190', 'T1133', 'T1021', 'T1048'],
    iocs: [
      { id: '6', type: 'ip', value: '193.106.191.57', confidence: 97, firstSeen: '2024-01-05', lastSeen: '2024-02-24', tags: ['C2', 'ransomware'] },
      { id: '7', type: 'url', value: 'http://lockbit7...onion', confidence: 99, firstSeen: '2024-01-01', lastSeen: '2024-02-24', tags: ['leak-site', 'tor'] },
    ],
    campaigns: [
      { id: '5', name: 'Global Extortion Campaign', startDate: '2024-01', targets: ['Global'], sectors: ['All'], status: 'active' },
    ],
  },
]

function ThreatIntel() {
  const [selectedActor, setSelectedActor] = useState<ThreatActor | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterLevel, setFilterLevel] = useState<string>('all')
  const [events, setEvents] = useState<ThreatEvent[]>([])
  const [actors, setActors] = useState<ThreatActor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/threatintel/actors').then(r => r.json()).catch(() => ({ actors: [] })),
      fetch('/api/threatintel/events').then(r => r.json()).catch(() => ({ events: [] })),
    ]).then(([actorsData, eventsData]) => {
      setActors(actorsData.actors || mockThreatActors)
      setEvents(eventsData.events || [])
      setLoading(false)
    }).catch(() => {
      setActors(mockThreatActors)
      setLoading(false)
    })
  }, [])

  const filteredActors = actors.filter(actor => {
    const matchesSearch = actor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      actor.aliases.some(a => a.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesLevel = filterLevel === 'all' || actor.threatLevel === filterLevel
    return matchesSearch && matchesLevel
  })

  const getThreatColor = (level: string) => {
    const colors: Record<string, string> = {
      critical: '#ef4444',
      high: '#f97316',
      medium: '#eab308',
      low: '#22c55e',
    }
    return colors[level] || '#6b7280'
  }

  const getSeverityBg = (severity: string) => {
    const colors: Record<string, string> = {
      critical: '#ef4444',
      high: '#f97316',
      medium: '#eab308',
      low: '#22c55e',
    }
    return colors[severity] || '#6b7280'
  }

  const techniqueDistribution = [
    { name: '初始访问', value: 35 },
    { name: '执行', value: 28 },
    { name: '持久化', value: 22 },
    { name: '权限提升', value: 18 },
    { name: '防御规避', value: 25 },
    { name: '凭证访问', value: 30 },
  ]

  const countryDistribution = [
    { name: '俄罗斯', value: 12 },
    { name: '中国', value: 8 },
    { name: '伊朗', value: 5 },
    { name: '朝鲜', value: 4 },
    { name: '其他', value: 6 },
  ]

  const formatTime = (timestamp: number) => {
    const diff = Math.floor((Date.now() - timestamp) / 1000)
    if (diff < 60) return `${diff}秒前`
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
    return `${Math.floor(diff / 3600)}小时前`
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0f0f1a', color: '#fff' }}>
      <header style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #2a2a3e' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={24} />
            威胁情报中心
          </h1>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <input
              type="text"
              placeholder="搜索威胁组织..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: 8,
                border: '1px solid #333',
                background: '#1a1a2e',
                color: '#fff',
                width: 250,
              }}
            />
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: 8,
                border: '1px solid #333',
                background: '#1a1a2e',
                color: '#fff',
              }}
            >
              <option value="all">所有级别</option>
              <option value="critical">严重</option>
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
          </div>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <aside style={{ width: 350, borderRight: '1px solid #2a2a3e', overflowY: 'auto', padding: '1rem' }}>
          <h2 style={{ fontSize: '0.9rem', color: '#888', marginBottom: '1rem' }}>威胁组织 ({filteredActors.length})</h2>
          {filteredActors.map(actor => (
            <div
              key={actor.id}
              onClick={() => setSelectedActor(actor)}
              style={{
                padding: '1rem',
                background: selectedActor?.id === actor.id ? '#2a2a4a' : '#1a1a2e',
                borderRadius: 8,
                marginBottom: '0.5rem',
                cursor: 'pointer',
                borderLeft: `3px solid ${getThreatColor(actor.threatLevel)}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 600 }}>{actor.name}</span>
                <span style={{
                  padding: '0.15rem 0.5rem',
                  borderRadius: 4,
                  fontSize: '0.7rem',
                  background: getThreatColor(actor.threatLevel),
                }}>
                  {actor.threatLevel}
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#888' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Globe size={12} />
                  {actor.country}
                </div>
                <div style={{ marginTop: '0.25rem' }}>{actor.techniques.length} 技术 · {actor.iocs.length} IOC</div>
              </div>
            </div>
          ))}
        </aside>

        <main style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {selectedActor ? (
            <div>
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{selectedActor.name}</h2>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {selectedActor.aliases.map(alias => (
                        <span key={alias} style={{
                          padding: '0.15rem 0.5rem',
                          background: '#2a2a3e',
                          borderRadius: 4,
                          fontSize: '0.75rem',
                          color: '#888',
                        }}>
                          {alias}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span style={{
                    padding: '0.5rem 1rem',
                    borderRadius: 8,
                    background: getThreatColor(selectedActor.threatLevel),
                    fontWeight: 'bold',
                  }}>
                    {selectedActor.threatLevel.toUpperCase()}
                  </span>
                </div>
                <p style={{ marginTop: '1rem', color: '#aaa', lineHeight: 1.6 }}>{selectedActor.description}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ background: '#1a1a2e', padding: '1rem', borderRadius: 8 }}>
                  <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>国家/地区</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Globe size={16} />
                    {selectedActor.country}
                  </div>
                </div>
                <div style={{ background: '#1a1a2e', padding: '1rem', borderRadius: 8 }}>
                  <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>动机</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Target size={16} />
                    {selectedActor.motivation}
                  </div>
                </div>
                <div style={{ background: '#1a1a2e', padding: '1rem', borderRadius: 8 }}>
                  <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>首次发现</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Clock size={16} />
                    {selectedActor.firstSeen}
                  </div>
                </div>
                <div style={{ background: '#1a1a2e', padding: '1rem', borderRadius: 8 }}>
                  <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>活动状态</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#22c55e' }}>
                    <Activity size={16} />
                    活跃中
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ background: '#1a1a2e', padding: '1.25rem', borderRadius: 12 }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>📊 技术分布</h3>
                  <BarChart data={techniqueDistribution} height={200} />
                </div>
                <div style={{ background: '#1a1a2e', padding: '1.25rem', borderRadius: 12 }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>📊 活动战役</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {selectedActor.campaigns.map(campaign => (
                      <div key={campaign.id} style={{
                        padding: '0.75rem',
                        background: '#2a2a3e',
                        borderRadius: 8,
                        borderLeft: `3px solid ${campaign.status === 'active' ? '#ef4444' : '#22c55e'}`,
                      }}>
                        <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>{campaign.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#888' }}>
                          {campaign.startDate} - {campaign.endDate || '进行中'}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                          {campaign.sectors.map(s => (
                            <span key={s} style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', background: '#3a3a4e', borderRadius: 4 }}>
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ background: '#1a1a2e', padding: '1.25rem', borderRadius: 12 }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>🔐 威胁指标 (IOCs)</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #2a2a3e' }}>
                      <th style={{ textAlign: 'left', padding: '0.5rem', color: '#888', fontSize: '0.75rem' }}>类型</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem', color: '#888', fontSize: '0.75rem' }}>值</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem', color: '#888', fontSize: '0.75rem' }}>置信度</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem', color: '#888', fontSize: '0.75rem' }}>标签</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem', color: '#888', fontSize: '0.75rem' }}>最后发现</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedActor.iocs.map(ioc => (
                      <tr key={ioc.id} style={{ borderBottom: '1px solid #2a2a3e' }}>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <span style={{
                            padding: '0.15rem 0.5rem',
                            background: ioc.type === 'ip' ? '#3b82f6' : ioc.type === 'domain' ? '#22c55e' : ioc.type === 'hash' ? '#f97316' : '#8b5cf6',
                            borderRadius: 4,
                            fontSize: '0.7rem',
                          }}>
                            {ioc.type.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                          {ioc.value.substring(0, 25)}...
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ flex: 1, height: 4, background: '#2a2a3e', borderRadius: 2, width: 50 }}>
                              <div style={{ width: `${ioc.confidence}%`, height: '100%', background: ioc.confidence > 80 ? '#22c55e' : '#eab308', borderRadius: 2 }} />
                            </div>
                            <span style={{ fontSize: '0.75rem' }}>{ioc.confidence}%</span>
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                            {ioc.tags.map(tag => (
                              <span key={tag} style={{ fontSize: '0.7rem', padding: '0.1rem 0.3rem', background: '#2a2a3e', borderRadius: 3, color: '#888' }}>
                                {tag}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem', color: '#888' }}>{ioc.lastSeen}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ background: '#1a1a2e', padding: '1.25rem', borderRadius: 12 }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>📊 威胁组织分布</h3>
                  <PieChart data={countryDistribution} height={250} />
                </div>
                <div style={{ background: '#1a1a2e', padding: '1.25rem', borderRadius: 12 }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>📊 技术使用频率</h3>
                  <BarChart data={techniqueDistribution} height={250} />
                </div>
              </div>

              <div style={{ background: '#1a1a2e', padding: '1.25rem', borderRadius: 12 }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>⚡ 实时威胁事件</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {events.map(event => (
                    <div key={event.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '0.75rem',
                      background: '#2a2a3e',
                      borderRadius: 8,
                      borderLeft: `3px solid ${getSeverityBg(event.severity)}`,
                    }}>
                      <div style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: getSeverityBg(event.severity),
                      }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500 }}>{event.title}</div>
                        <div style={{ fontSize: '0.75rem', color: '#888' }}>{event.description}</div>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#666' }}>{formatTime(event.timestamp)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default ThreatIntel
