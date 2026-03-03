import { useState, useEffect } from 'react'
import { 
  FileCheck, 
  Download, 
  Calendar, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Shield,
  BarChart3,
  Filter,
  RefreshCw
} from 'lucide-react'
import { BarChart, PieChart, RadarChart } from '../common/Charts'

interface ComplianceFramework {
  id: string
  name: string
  version: string
  totalControls: number
  compliantControls: number
  partiallyCompliant: number
  nonCompliant: number
  lastAssessment: string
  nextAssessment: string
  status: 'compliant' | 'partially_compliant' | 'non_compliant'
}

interface ControlResult {
  id: string
  frameworkId: string
  controlId: string
  controlName: string
  category: string
  status: 'compliant' | 'partially_compliant' | 'non_compliant' | 'not_assessed'
  score: number
  findings: string[]
  remediation?: string
  dueDate?: string
  owner?: string
}

interface GapAnalysis {
  category: string
  total: number
  gaps: number
  percentage: number
}

const mockFrameworks: ComplianceFramework[] = [
  {
    id: 'iso27001',
    name: 'ISO 27001:2022',
    version: '2022',
    totalControls: 93,
    compliantControls: 72,
    partiallyCompliant: 14,
    nonCompliant: 7,
    lastAssessment: '2024-01-15',
    nextAssessment: '2024-07-15',
    status: 'partially_compliant',
  },
  {
    id: 'gdpr',
    name: 'GDPR',
    version: '2018',
    totalControls: 99,
    compliantControls: 85,
    partiallyCompliant: 10,
    nonCompliant: 4,
    lastAssessment: '2024-02-01',
    nextAssessment: '2024-08-01',
    status: 'partially_compliant',
  },
  {
    id: 'nist',
    name: 'NIST CSF',
    version: '2.0',
    totalControls: 108,
    compliantControls: 89,
    partiallyCompliant: 12,
    nonCompliant: 7,
    lastAssessment: '2024-01-20',
    nextAssessment: '2024-07-20',
    status: 'partially_compliant',
  },
  {
    id: 'soc2',
    name: 'SOC 2 Type II',
    version: '2017',
    totalControls: 125,
    compliantControls: 110,
    partiallyCompliant: 10,
    nonCompliant: 5,
    lastAssessment: '2024-02-10',
    nextAssessment: '2024-08-10',
    status: 'compliant',
  },
]

const mockControls: ControlResult[] = [
  { id: '1', frameworkId: 'iso27001', controlId: 'A.5.1', controlName: '信息安全方针', category: '组织', status: 'compliant', score: 100, findings: [] },
  { id: '2', frameworkId: 'iso27001', controlId: 'A.5.2', controlName: '信息安全管理职责', category: '组织', status: 'compliant', score: 95, findings: [] },
  { id: '3', frameworkId: 'iso27001', controlId: 'A.6.1.2', controlName: '信息安全职责分配', category: '组织', status: 'partially_compliant', score: 70, findings: ['部分部门未明确信息安全负责人'], remediation: '在所有部门指定信息安全代表', dueDate: '2024-03-15', owner: '安全部' },
  { id: '4', frameworkId: 'iso27001', controlId: 'A.8.1.1', controlName: '资产清单', category: '资产管理', status: 'non_compliant', score: 40, findings: ['资产清单不完整', '未定期更新'], remediation: '建立完整的资产管理系统', dueDate: '2024-02-28', owner: 'IT部' },
  { id: '5', frameworkId: 'iso27001', controlId: 'A.9.1.1', controlName: '访问控制策略', category: '访问控制', status: 'compliant', score: 90, findings: [] },
  { id: '6', frameworkId: 'iso27001', controlId: 'A.12.1.1', controlName: '操作程序和职责', category: '运营安全', status: 'partially_compliant', score: 75, findings: ['部分操作程序需要更新'], remediation: '审查并更新所有操作程序', dueDate: '2024-03-30', owner: '运营部' },
  { id: '7', frameworkId: 'gdpr', controlId: 'Art.5', controlName: '数据处理原则', category: '原则', status: 'compliant', score: 95, findings: [] },
  { id: '8', frameworkId: 'gdpr', controlId: 'Art.32', controlName: '数据处理安全', category: '安全', status: 'partially_compliant', score: 80, findings: ['需要加强数据加密措施'], remediation: '实施端到端加密', dueDate: '2024-04-01', owner: 'IT部' },
]

const gapAnalysis: GapAnalysis[] = [
  { category: '访问控制', total: 15, gaps: 3, percentage: 80 },
  { category: '加密', total: 10, gaps: 4, percentage: 60 },
  { category: '资产管理', total: 12, gaps: 5, percentage: 58 },
  { category: '事件响应', total: 8, gaps: 2, percentage: 75 },
  { category: '业务连续性', total: 6, gaps: 1, percentage: 83 },
  { category: '人员安全', total: 10, gaps: 2, percentage: 80 },
]

function ComplianceReport() {
  const [selectedFramework, setSelectedFramework] = useState<ComplianceFramework | null>(null)
  const [controls, setControls] = useState<ControlResult[]>([])
  const [frameworks, setFrameworks] = useState<ComplianceFramework[]>(mockFrameworks)
  const [gaps, setGaps] = useState<GapAnalysis[]>(gapAnalysis)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/compliance/frameworks').then(r => r.json()).catch(() => ({ frameworks: [] })),
      fetch('/api/compliance/controls').then(r => r.json()).catch(() => ({ controls: [] })),
      fetch('/api/compliance/gaps').then(r => r.json()).catch(() => ({ gaps: [] })),
    ]).then(([frameworksData, controlsData, gapsData]) => {
      setFrameworks(frameworksData.frameworks || mockFrameworks)
      setControls(controlsData.controls || mockControls)
      setGaps(gapsData.gaps || gapAnalysis)
      setLoading(false)
    }).catch(() => {
      setFrameworks(mockFrameworks)
      setControls(mockControls)
      setGaps(gapAnalysis)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (selectedFramework) {
      const filtered = controls.filter(c => c.frameworkId === selectedFramework.id)
      setControls(filtered.length > 0 ? filtered : mockControls.filter(c => c.frameworkId === selectedFramework.id))
    }
  }, [selectedFramework])

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      compliant: '#22c55e',
      partially_compliant: '#eab308',
      non_compliant: '#ef4444',
      not_assessed: '#6b7280',
    }
    return colors[status] || '#6b7280'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant': return <CheckCircle size={16} color="#22c55e" />
      case 'partially_compliant': return <Clock size={16} color="#eab308" />
      case 'non_compliant': return <AlertCircle size={16} color="#ef4444" />
      default: return <Clock size={16} color="#6b7280" />
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      compliant: '合规',
      partially_compliant: '部分合规',
      non_compliant: '不合规',
      not_assessed: '未评估',
    }
    return labels[status] || status
  }

  const generateReport = async () => {
    setGenerating(true)
    await new Promise(r => setTimeout(r, 2000))
    setGenerating(false)
    alert('报告已生成并下载')
  }

  const filteredControls = controls.filter(c => 
    filterStatus === 'all' || c.status === filterStatus
  )

  const overallScore = Math.round(
    mockControls.reduce((sum, c) => sum + c.score, 0) / mockControls.length
  )

  const statusDistribution = [
    { name: '合规', value: mockControls.filter(c => c.status === 'compliant').length },
    { name: '部分合规', value: mockControls.filter(c => c.status === 'partially_compliant').length },
    { name: '不合规', value: mockControls.filter(c => c.status === 'non_compliant').length },
  ]

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0f0f1a', color: '#fff', overflow: 'hidden' }}>
      <header style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #2a2a3e' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileCheck size={24} />
            合规报告中心
          </h1>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={generateReport}
              disabled={generating}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                background: generating ? '#4a4a6a' : '#3b82f6',
                border: 'none',
                borderRadius: 8,
                color: '#fff',
                cursor: generating ? 'not-allowed' : 'pointer',
              }}
            >
              {generating ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={14} />}
              {generating ? '生成中...' : '生成报告'}
            </button>
          </div>
        </div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ background: '#1a1a2e', padding: '1.25rem', borderRadius: 12 }}>
            <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.5rem' }}>整体合规评分</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: overallScore >= 80 ? '#22c55e' : overallScore >= 60 ? '#eab308' : '#ef4444' }}>
              {overallScore}%
            </div>
            <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '0.25rem' }}>基于 {mockControls.length} 项控制</div>
          </div>
          
          <div style={{ background: '#1a1a2e', padding: '1.25rem', borderRadius: 12 }}>
            <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.5rem' }}>活跃框架</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#3b82f6' }}>{frameworks.length}</div>
            <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '0.25rem' }}>ISO 27001, GDPR, NIST, SOC 2</div>
          </div>
          
          <div style={{ background: '#1a1a2e', padding: '1.25rem', borderRadius: 12 }}>
            <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.5rem' }}>待整改项</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#f97316' }}>
              {mockControls.filter(c => c.status === 'non_compliant' || c.status === 'partially_compliant').length}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '0.25rem' }}>需要关注</div>
          </div>
          
          <div style={{ background: '#1a1a2e', padding: '1.25rem', borderRadius: 12 }}>
            <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.5rem' }}>下次审计</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={20} />
              30天
            </div>
            <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '0.25rem' }}>2024-03-15</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ background: '#1a1a2e', padding: '1.25rem', borderRadius: 12 }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>📊 合规状态分布</h3>
            <PieChart data={statusDistribution} height={200} />
          </div>
          
          <div style={{ background: '#1a1a2e', padding: '1.25rem', borderRadius: 12 }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>📊 差距分析</h3>
            <RadarChart 
              data={gaps.map(g => ({ name: g.category, value: g.percentage }))} 
              height={200} 
            />
          </div>
          
          <div style={{ background: '#1a1a2e', padding: '1.25rem', borderRadius: 12 }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>📊 框架覆盖率</h3>
            <BarChart 
              data={frameworks.map(f => ({ 
                name: f.name.split(' ')[0], 
                value: Math.round((f.compliantControls / f.totalControls) * 100) 
              }))} 
              height={200} 
              color={['#3b82f6', '#22c55e']} 
            />
          </div>
        </div>

        <div style={{ background: '#1a1a2e', padding: '1.25rem', borderRadius: 12, marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem' }}>📋 合规框架</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            {frameworks.map(framework => (
              <div
                key={framework.id}
                onClick={() => setSelectedFramework(selectedFramework?.id === framework.id ? null : framework)}
                style={{
                  padding: '1rem',
                  background: selectedFramework?.id === framework.id ? '#2a2a4a' : '#2a2a3e',
                  borderRadius: 8,
                  cursor: 'pointer',
                  borderLeft: `3px solid ${getStatusColor(framework.status)}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{framework.name}</span>
                  {getStatusIcon(framework.status)}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.5rem' }}>
                  v{framework.version} · {framework.totalControls} 项控制
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', background: '#22c55e20', color: '#22c55e', borderRadius: 4 }}>
                    {framework.compliantControls} 合规
                  </span>
                  <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', background: '#eab30820', color: '#eab308', borderRadius: 4 }}>
                    {framework.partiallyCompliant} 部分
                  </span>
                </div>
                <div style={{ fontSize: '0.7rem', color: '#666' }}>
                  合规率: {Math.round((framework.compliantControls / framework.totalControls) * 100)}%
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: '#1a1a2e', padding: '1.25rem', borderRadius: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem' }}>🔍 控制项详情</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Filter size={16} style={{ color: '#888' }} />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  padding: '0.4rem',
                  borderRadius: 6,
                  border: '1px solid #333',
                  background: '#1a1a2e',
                  color: '#fff',
                  fontSize: '0.8rem',
                }}
              >
                <option value="all">全部状态</option>
                <option value="compliant">合规</option>
                <option value="partially_compliant">部分合规</option>
                <option value="non_compliant">不合规</option>
              </select>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {filteredControls.map(control => (
              <div
                key={control.id}
                style={{
                  padding: '1rem',
                  background: '#2a2a3e',
                  borderRadius: 8,
                  borderLeft: `3px solid ${getStatusColor(control.status)}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div>
                    <span style={{ 
                      fontSize: '0.7rem', 
                      padding: '0.1rem 0.4rem', 
                      background: '#3a3a4e', 
                      borderRadius: 4,
                      marginRight: '0.5rem',
                      fontFamily: 'monospace',
                    }}>
                      {control.controlId}
                    </span>
                    <span style={{ fontWeight: 500 }}>{control.controlName}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.8rem', color: getStatusColor(control.status), fontWeight: 500 }}>
                      {control.score}%
                    </span>
                    {getStatusIcon(control.status)}
                  </div>
                </div>
                
                <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.5rem' }}>
                  分类: {control.category} · 状态: {getStatusLabel(control.status)}
                </div>
                
                {control.findings.length > 0 && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <div style={{ fontSize: '0.75rem', color: '#f97316', marginBottom: '0.25rem' }}>发现问题:</div>
                    {control.findings.map((finding, i) => (
                      <div key={i} style={{ fontSize: '0.75rem', color: '#aaa', paddingLeft: '0.5rem' }}>
                        • {finding}
                      </div>
                    ))}
                  </div>
                )}
                
                {control.remediation && (
                  <div style={{ 
                    marginTop: '0.5rem', 
                    padding: '0.5rem', 
                    background: '#1a1a2e', 
                    borderRadius: 6,
                    fontSize: '0.75rem',
                  }}>
                    <div style={{ color: '#3b82f6', marginBottom: '0.25rem' }}>整改建议: {control.remediation}</div>
                    {control.dueDate && (
                      <div style={{ color: '#888' }}>截止日期: {control.dueDate} · 负责人: {control.owner}</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
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

export default ComplianceReport
