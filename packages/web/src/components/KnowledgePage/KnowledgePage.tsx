import React, { useEffect, useState } from "react";
import { Network, Shield, Target, BarChart3, RefreshCw, AlertTriangle, CheckCircle, Layers, GitBranch, Activity, X, Database } from "lucide-react";
import KnowledgeGraph, { GraphNode, GraphEdge } from "../KnowledgeGraph/KnowledgeGraph";
import KnowledgeCategories from "./KnowledgeCategories";
import DimensionsViewer from "../DimensionsViewer/DimensionsViewer";

interface GraphStats {
  techniques: number;
  tactics: number;
  controls: number;
  domains: number;
  threats: number;
  links: number;
  controlCoverage: Record<string, number>;
}

interface AttackChainNode {
  id: string;
  type: "tactic" | "technique" | "control";
  name: string;
  tacticOrder: number;
  controls: string[];
}

interface AttackChain {
  id: string;
  name: string;
  nodes: AttackChainNode[];
  coverage: number;
}

interface DomainCoverage {
  domainCode: string;
  domainName: string;
  controlCount: number;
  techniqueCoverage: number;
  effectiveness: number;
  gaps: number;
  priority: string;
}

interface SCFMITREMapping {
  scfControlId: string;
  scfControlName: string;
  scfDomain: string;
  mitreTechniqueId: string;
  mitreTechniqueName: string;
  mitreTactic: string;
  relationship: string;
  confidence: number;
}

interface ThreatAnalysis {
  threatId: string;
  threatName: string;
  category: string;
  severity: string;
  techniques: {
    techniqueId: string;
    techniqueName: string;
    tactic: string;
    isCovered: boolean;
    effectiveness: string;
  }[];
  residualRisk: number;
  coverageScore: number;
}

type ViewMode = "graph" | "attack-chains" | "coverage" | "scf-mitre" | "attack-path" | "defense" | "categories";

const KnowledgePage: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("graph");
  const [stats, setStats] = useState<GraphStats | null>(null);
  const [attackChains, setAttackChains] = useState<AttackChain[]>([]);
  const [coverage, setCoverage] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [showDimensionsPanel, setShowDimensionsPanel] = useState(false);
  
  // New state for SCF-MITRE views
  const [scfMitreNodes, setScfMitreNodes] = useState<GraphNode[]>([]);
  const [scfMitreEdges, setScfMitreEdges] = useState<GraphEdge[]>([]);
  const [mappings, setMappings] = useState<SCFMITREMapping[]>([]);
  const [domainCoverage, setDomainCoverage] = useState<DomainCoverage[]>([]);
  const [threatAnalysis, setThreatAnalysis] = useState<ThreatAnalysis[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, chainsRes, coverageRes, nodesRes, edgesRes] = await Promise.all([
        fetch("/api/graph/stats"),
        fetch("/api/graph/attack-chains?limit=100"),
        fetch("/api/graph/control-coverage"),
        fetch("/api/graph/nodes"),
        fetch("/api/graph/edges"),
      ]);

      const statsData = await statsRes.json();
      const chainsData = await chainsRes.json();
      const coverageData = await coverageRes.json();
      const nodesData = await nodesRes.json();
      const edgesData = await edgesRes.json();

      setStats(statsData);
      setAttackChains(chainsData.chains || []);
      setCoverage(coverageData.coverage || {});
      setNodes(nodesData.nodes || []);
      setEdges(edgesData.edges || []);
    } catch (err) {
      console.error("Failed to load knowledge data:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadSCFMITREData = async () => {
    setLoading(true);
    try {
      console.log("[SCF-MITRE] Loading data...");
      
      // 根据当前视图模式加载对应的图谱数据
      let graphNodes: GraphNode[] = [];
      let graphEdges: GraphEdge[] = [];
      
      if (viewMode === "scf-mitre") {
        console.log("[SCF-MITRE] Fetching coverage graph...");
        const res = await fetch("/api/graph/scf-mitre-coverage");
        const data = await res.json();
        console.log("[SCF-MITRE] Coverage response:", data);
        if (data.graph) {
          graphNodes = data.graph.nodes || [];
          graphEdges = data.graph.edges || [];
        }
      } else if (viewMode === "attack-path") {
        console.log("[SCF-MITRE] Fetching attack path graph...");
        const res = await fetch("/api/graph/attack-path-control");
        const data = await res.json();
        console.log("[SCF-MITRE] Attack path response:", data);
        if (data.graph) {
          graphNodes = data.graph.nodes || [];
          graphEdges = data.graph.edges || [];
        }
      } else if (viewMode === "defense") {
        console.log("[SCF-MITRE] Fetching defense graph...");
        const res = await fetch("/api/graph/defense-in-depth");
        const data = await res.json();
        console.log("[SCF-MITRE] Defense response:", data);
        if (data.graph) {
          graphNodes = data.graph.nodes || [];
          graphEdges = data.graph.edges || [];
        }
      }
      
      // 获取其他数据
      const [mappingsRes, domainRes, threatRes] = await Promise.all([
        fetch("/api/graph/scf-mitre-mappings"),
        fetch("/api/graph/domain-coverage"),
        fetch("/api/graph/threat-analysis"),
      ]);
      
      const mappingsData = await mappingsRes.json();
      const domainData = await domainRes.json();
      const threatData = await threatRes.json();
      
      console.log("[SCF-MITRE] Nodes:", graphNodes.length, "Edges:", graphEdges.length);
      console.log("[SCF-MITRE] Mappings:", mappingsData.mappings?.length);
      console.log("[SCF-MITRE] Domains:", domainData.domains?.length);
      
      setScfMitreNodes(graphNodes);
      setScfMitreEdges(graphEdges);
      setMappings(mappingsData.mappings || []);
      setDomainCoverage(domainData.domains || []);
      setThreatAnalysis(threatData.analysis || []);
      
    } catch (err) {
      console.error("[SCF-MITRE] Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (viewMode === "scf-mitre" || viewMode === "attack-path" || viewMode === "defense") {
      loadSCFMITREData();
    }
  }, [viewMode]);

  const avgCoverage = stats?.controlCoverage
    ? Math.round(Object.values(stats.controlCoverage).reduce((a, b) => a + b, 0) / Object.values(stats.controlCoverage).length)
    : 0;

  return (
    <>
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div style={{ display: "flex", height: "100vh", background: "#0f0f1a" }}>
      {/* 主内容区域 */}
      <div style={{
        flex: 1,
        padding: "1.5rem",
        overflow: "auto",
        transition: "margin-right 0.3s"
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h1 style={{ display: "flex", alignItems: "center", gap: "0.75rem", color: "#fff", fontSize: "1.5rem", margin: 0 }}>
            <Network size={28} />
            知识图谱
            <span style={{ fontSize: "0.8rem", color: "#666", fontWeight: "normal" }}>
              MITRE ATT&CK + SCF 本体论引擎
            </span>
          </h1>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              onClick={() => setShowDimensionsPanel(!showDimensionsPanel)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 1rem",
                background: showDimensionsPanel ? "#22c55e" : "#1a1a2e",
                border: "1px solid #2a2a3e",
                borderRadius: 8,
                color: "#fff",
                cursor: "pointer",
                fontSize: "0.85rem",
              }}
            >
              <Database size={16} />
              {showDimensionsPanel ? "隐藏维度" : "SCF维度"}
            </button>
            <button
              onClick={() => viewMode === "graph" ? loadData() : loadSCFMITREData()}
              disabled={loading}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 1rem",
                background: "#3b82f6",
                border: "none",
                borderRadius: 8,
                color: "#fff",
                cursor: loading ? "wait" : "pointer",
                fontSize: "0.85rem",
              }}
            >
              <RefreshCw size={16} style={loading ? { animation: "spin 1s linear infinite" } : {}} />
              刷新数据
            </button>
          </div>
        </div>

      {/* Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <StatCard label="MITRE 技术" value={stats?.techniques || 0} color="#f43f5e" icon={<Target size={18} />} />
        <StatCard label="MITRE 战术" value={stats?.tactics || 0} color="#8b5cf6" icon={<AlertTriangle size={18} />} />
        <StatCard label="SCF 控制" value={stats?.controls || 0} color="#22c55e" icon={<Shield size={18} />} />
        <StatCard label="SCF 域" value={stats?.domains || 0} color="#0ea5e9" icon={<BarChart3 size={18} />} />
        <StatCard label="知识链接" value={stats?.links || 0} color="#6366f1" icon={<Network size={18} />} />
        <StatCard label="平均覆盖率" value={`${avgCoverage}%`} color="#14b8a6" icon={<CheckCircle size={18} />} />
      </div>

      {/* View Mode Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <TabButton active={viewMode === "graph"} onClick={() => setViewMode("graph")}>
          <Network size={16} /> 知识图谱
        </TabButton>
        <TabButton active={viewMode === "attack-chains"} onClick={() => setViewMode("attack-chains")}>
          <Target size={16} /> 攻击链分析
        </TabButton>
        <TabButton active={viewMode === "coverage"} onClick={() => setViewMode("coverage")}>
          <Shield size={16} /> 控制覆盖
        </TabButton>
        <TabButton active={viewMode === "scf-mitre"} onClick={() => setViewMode("scf-mitre")}>
          <Layers size={16} /> SCF-MITRE
        </TabButton>
        <TabButton active={viewMode === "attack-path"} onClick={() => setViewMode("attack-path")}>
          <GitBranch size={16} /> 攻击路径
        </TabButton>
        <TabButton active={viewMode === "defense"} onClick={() => setViewMode("defense")}>
          <Activity size={16} /> 深度防御
        </TabButton>
        <TabButton active={viewMode === "categories"} onClick={() => setViewMode("categories")}>
          <Layers size={16} /> 分类展现
        </TabButton>
      </div>

      {/* Content */}
      {loading && !stats ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 400, color: "#666" }}>
          加载中...
        </div>
      ) : (
        <>
          {viewMode === "graph" && (
            <KnowledgeGraph nodes={nodes} edges={edges} width={1100} height={600} />
          )}

          {viewMode === "attack-chains" && (
            <AttackChainView chains={attackChains} />
          )}

          {viewMode === "coverage" && (
            <CoverageView coverage={coverage} />
          )}

          {viewMode === "scf-mitre" && (
            <SCFMITREView 
              nodes={scfMitreNodes} 
              edges={scfMitreEdges}
              mappings={mappings}
              domainCoverage={domainCoverage}
            />
          )}

          {viewMode === "attack-path" && (
            <AttackPathControlView 
              nodes={scfMitreNodes}
              edges={scfMitreEdges}
              threatAnalysis={threatAnalysis}
            />
          )}

          {viewMode === "defense" && (
            <DefenseInDepthView
              nodes={scfMitreNodes}
              edges={scfMitreEdges}
              domainCoverage={domainCoverage}
            />
          )}

          {viewMode === "categories" && (
            <KnowledgeCategories
              onCategorySelect={(categoryId, categoryType) => {
                console.log("Selected category:", categoryId, "Type:", categoryType);
                // 这里可以添加跳转到详情页的逻辑
              }}
            />
          )}
        </>
      )}
      </div>

      {/* 右侧 SCF 维度面板 */}
      {showDimensionsPanel && (
        <div style={{
          width: "450px",
          background: "#1a1a2e",
          borderLeft: "1px solid #2a2a3e",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "slideIn 0.3s ease-out"
        }}>
          {/* 面板头部 */}
          <div style={{
            padding: "1rem 1.5rem",
            borderBottom: "1px solid #2a2a3e",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Database size={20} style={{ color: "#22c55e" }} />
              <h2 style={{ color: "#fff", fontSize: "1.1rem", margin: 0 }}>SCF 数据维度</h2>
            </div>
            <button
              onClick={() => setShowDimensionsPanel(false)}
              style={{
                padding: "0.4rem",
                background: "#2a2a3e",
                border: "none",
                borderRadius: 6,
                color: "#888",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
              title="关闭维度面板"
            >
              <X size={18} />
            </button>
          </div>

          {/* DimensionsViewer 内容 */}
          <div style={{ flex: 1, overflow: "auto" }}>
            <DimensionsViewer />
          </div>
        </div>
      )}
    </div>
    </>
  );
};

// Stat Card Component
const StatCard: React.FC<{
  label: string;
  value: number | string;
  color: string;
  icon: React.ReactNode;
}> = ({ label, value, color, icon }) => (
  <div style={{
    background: "#1a1a2e",
    borderRadius: 12,
    padding: "1rem",
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  }}>
    <div style={{
      width: 40,
      height: 40,
      borderRadius: 10,
      background: `${color}20`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color,
    }}>
      {icon}
    </div>
    <div>
      <div style={{ fontSize: "1.5rem", fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: "0.75rem", color: "#666" }}>{label}</div>
    </div>
  </div>
);

// Tab Button Component
const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    style={{
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      padding: "0.6rem 1rem",
      background: active ? "#3b82f6" : "#1a1a2e",
      border: "none",
      borderRadius: 8,
      color: active ? "#fff" : "#888",
      cursor: "pointer",
      fontSize: "0.85rem",
      transition: "all 0.2s",
    }}
  >
    {children}
  </button>
);

// SCF-MITRE View Component
const SCFMITREView: React.FC<{
  nodes: GraphNode[];
  edges: GraphEdge[];
  mappings: SCFMITREMapping[];
  domainCoverage: DomainCoverage[];
}> = ({ nodes, edges, mappings, domainCoverage }) => {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: "1rem" }}>
      <div style={{ background: "#1a1a2e", borderRadius: 12, padding: "1rem" }}>
        <h3 style={{ color: "#fff", margin: "0 0 1rem 0" }}>SCF-MITRE 覆盖矩阵</h3>
        {nodes.length > 0 ? (
          <KnowledgeGraph nodes={nodes} edges={edges} width={650} height={500} />
        ) : (
          <div style={{ height: 500, display: "flex", alignItems: "center", justifyContent: "center", color: "#666" }}>
            加载图谱数据...
          </div>
        )}
      </div>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {/* Domain Coverage */}
        <div style={{ background: "#1a1a2e", borderRadius: 12, padding: "1rem" }}>
          <h4 style={{ color: "#fff", margin: "0 0 1rem 0" }}>SCF 域覆盖</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: 200, overflow: "auto" }}>
            {domainCoverage.map(domain => (
              <div key={domain.domainCode} style={{
                padding: "0.5rem",
                background: "#0f0f1a",
                borderRadius: 6,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}>
                <span style={{ color: "#fff", fontSize: "0.85rem" }}>{domain.domainCode}</span>
                <span style={{ 
                  color: domain.effectiveness >= 0.7 ? "#22c55e" : domain.effectiveness >= 0.4 ? "#eab308" : "#ef4444",
                  fontSize: "0.85rem",
                }}>
                  {Math.round(domain.effectiveness * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Mappings Summary */}
        <div style={{ background: "#1a1a2e", borderRadius: 12, padding: "1rem" }}>
          <h4 style={{ color: "#fff", margin: "0 0 1rem 0" }}>映射关系 ({mappings.length})</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: 200, overflow: "auto" }}>
            {mappings.slice(0, 10).map((m, idx) => (
              <div key={idx} style={{
                padding: "0.5rem",
                background: "#0f0f1a",
                borderRadius: 6,
                fontSize: "0.75rem",
              }}>
                <span style={{ color: "#3b82f6" }}>{m.scfControlId}</span>
                <span style={{ color: "#666" }}> → </span>
                <span style={{ color: "#ef4444" }}>{m.mitreTechniqueId}</span>
                <span style={{ color: "#666", marginLeft: "0.5rem" }}>({m.relationship})</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Attack Path Control View
const AttackPathControlView: React.FC<{
  nodes: GraphNode[];
  edges: GraphEdge[];
  threatAnalysis: ThreatAnalysis[];
}> = ({ nodes, edges, threatAnalysis }) => {
  const [selectedThreat, setSelectedThreat] = useState<ThreatAnalysis | null>(null);
  
  return (
    <div style={{ display: "grid", gridTemplateColumns: "350px 1fr", gap: "1rem" }}>
      <div style={{ background: "#1a1a2e", borderRadius: 12, padding: "1rem", maxHeight: 600, overflow: "auto" }}>
        <h4 style={{ color: "#fff", margin: "0 0 1rem 0" }}>威胁分析</h4>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {threatAnalysis.map(threat => (
            <button
              key={threat.threatId}
              onClick={() => setSelectedThreat(threat)}
              style={{
                padding: "0.75rem",
                background: selectedThreat?.threatId === threat.threatId ? "#3b82f6" : "#0f0f1a",
                border: "1px solid #2a2a4a",
                borderRadius: 8,
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <div style={{ color: "#fff", fontSize: "0.85rem", marginBottom: "0.25rem" }}>{threat.threatName}</div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ 
                  fontSize: "0.7rem",
                  color: threat.severity === "critical" ? "#ef4444" : threat.severity === "high" ? "#f97316" : "#eab308",
                }}>{threat.severity.toUpperCase()}</span>
                <span style={{ fontSize: "0.7rem", color: "#666" }}>
                  剩余风险: {Math.round(threat.residualRisk * 100)}%
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
      
      <div style={{ background: "#1a1a2e", borderRadius: 12, padding: "1rem" }}>
        <h4 style={{ color: "#fff", margin: "0 0 1rem 0" }}>攻击路径与控制映射</h4>
        {nodes.length > 0 ? (
          <KnowledgeGraph nodes={nodes} edges={edges} width={700} height={550} />
        ) : (
          <div style={{ height: 400, display: "flex", alignItems: "center", justifyContent: "center", color: "#666" }}>
            选择左侧威胁查看详情
          </div>
        )}
      </div>
    </div>
  );
};

// Defense In Depth View
const DefenseInDepthView: React.FC<{
  nodes: GraphNode[];
  edges: GraphEdge[];
  domainCoverage: DomainCoverage[];
}> = ({ nodes, edges, domainCoverage }) => {
  const layers = [
    { name: "预防层", color: "#22c55e", desc: "阻止攻击发生" },
    { name: "检测层", color: "#f59e0b", desc: "发现正在进行的攻击" },
    { name: "响应层", color: "#3b82f6", desc: "响应已发生的攻击" },
    { name: "恢复层", color: "#8b5cf6", desc: "恢复受损系统" },
  ];
  
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 350px", gap: "1rem" }}>
      <div style={{ background: "#1a1a2e", borderRadius: 12, padding: "1rem" }}>
        <h3 style={{ color: "#fff", margin: "0 0 1rem 0" }}>深度防御分析</h3>
        {nodes.length > 0 ? (
          <KnowledgeGraph nodes={nodes} edges={edges} width={700} height={500} />
        ) : (
          <div style={{ height: 400, display: "flex", alignItems: "center", justifyContent: "center", color: "#666" }}>
            加载图谱数据...
          </div>
        )}
      </div>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ background: "#1a1a2e", borderRadius: 12, padding: "1rem" }}>
          <h4 style={{ color: "#fff", margin: "0 0 1rem 0" }}>防御层级</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {layers.map(layer => (
              <div key={layer.name} style={{
                padding: "0.75rem",
                background: "#0f0f1a",
                borderRadius: 8,
                borderLeft: `4px solid ${layer.color}`,
              }}>
                <div style={{ color: layer.color, fontWeight: 600, fontSize: "0.9rem" }}>{layer.name}</div>
                <div style={{ color: "#666", fontSize: "0.75rem" }}>{layer.desc}</div>
              </div>
            ))}
          </div>
        </div>
        
        <div style={{ background: "#1a1a2e", borderRadius: 12, padding: "1rem" }}>
          <h4 style={{ color: "#fff", margin: "0 0 1rem 0" }}>域有效性</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {domainCoverage.map(domain => (
              <div key={domain.domainCode}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                  <span style={{ color: "#fff", fontSize: "0.8rem" }}>{domain.domainCode}</span>
                  <span style={{ color: "#666", fontSize: "0.75rem" }}>{Math.round(domain.effectiveness * 100)}%</span>
                </div>
                <div style={{ height: 4, background: "#0f0f1a", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{
                    width: `${domain.effectiveness * 100}%`,
                    height: "100%",
                    background: domain.effectiveness >= 0.7 ? "#22c55e" : domain.effectiveness >= 0.4 ? "#eab308" : "#ef4444",
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Attack Chain View Component (existing)
const AttackChainView: React.FC<{ chains: AttackChain[] }> = ({ chains }) => {
  const [selectedChain, setSelectedChain] = useState<AttackChain | null>(null);
  const [filter, setFilter] = useState("");

  const filteredChains = chains.filter(c =>
    c.name.toLowerCase().includes(filter.toLowerCase())
  );

  const coveredCount = chains.filter(c => c.coverage > 0).length;
  const uncoveredCount = chains.length - coveredCount;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "350px 1fr", gap: "1rem" }}>
      <div style={{ background: "#1a1a2e", borderRadius: 12, padding: "1rem", maxHeight: 600, overflow: "auto" }}>
        <div style={{ marginBottom: "1rem" }}>
          <input
            type="text"
            placeholder="搜索攻击链..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{
              width: "100%",
              padding: "0.5rem 0.75rem",
              background: "#0f0f1a",
              border: "1px solid #2a2a4a",
              borderRadius: 6,
              color: "#fff",
              fontSize: "0.85rem",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", fontSize: "0.75rem" }}>
          <span style={{ color: "#22c55e" }}>已覆盖: {coveredCount}</span>
          <span style={{ color: "#ef4444" }}>未覆盖: {uncoveredCount}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {filteredChains.slice(0, 50).map(chain => (
            <button
              key={chain.id}
              onClick={() => setSelectedChain(chain)}
              style={{
                padding: "0.75rem",
                background: selectedChain?.id === chain.id ? "#3b82f6" : "#0f0f1a",
                border: "1px solid #2a2a4a",
                borderRadius: 8,
                textAlign: "left",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <div style={{ color: "#fff", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                {chain.name}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.7rem", color: "#666" }}>
                  {chain.nodes.length} 节点
                </span>
                <span style={{
                  fontSize: "0.7rem",
                  padding: "0.15rem 0.5rem",
                  borderRadius: 10,
                  background: chain.coverage > 0 ? "#22c55e" : "#ef4444",
                  color: "#fff",
                }}>
                  {chain.coverage}%
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: "#1a1a2e", borderRadius: 12, padding: "1.5rem" }}>
        {selectedChain ? (
          <>
            <h3 style={{ color: "#fff", margin: "0 0 1rem 0", fontSize: "1.2rem" }}>{selectedChain.name}</h3>
            
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", overflowX: "auto", padding: "1rem 0" }}>
              {selectedChain.nodes.map((node, idx) => (
                <React.Fragment key={node.id}>
                  <div style={{
                    minWidth: 120,
                    padding: "0.75rem",
                    background: node.type === "tactic" ? "#8b5cf6" : node.type === "technique" ? "#f43f5e" : "#22c55e",
                    borderRadius: 8,
                    textAlign: "center",
                  }}>
                    <div style={{ fontSize: "0.65rem", opacity: 0.8, marginBottom: "0.25rem" }}>
                      {node.type.toUpperCase()}
                    </div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#fff" }}>
                      {node.name}
                    </div>
                    {node.controls.length > 0 && (
                      <div style={{ fontSize: "0.65rem", marginTop: "0.25rem", opacity: 0.8 }}>
                        {node.controls.length} 控制措施
                      </div>
                    )}
                  </div>
                  {idx < selectedChain.nodes.length - 1 && (
                    <div style={{ color: "#666" }}>→</div>
                  )}
                </React.Fragment>
              ))}
            </div>

            <div style={{ marginTop: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <span style={{ color: "#888", fontSize: "0.85rem" }}>控制覆盖率</span>
                <span style={{ color: "#fff", fontSize: "0.85rem" }}>{selectedChain.coverage}%</span>
              </div>
              <div style={{ height: 8, background: "#0f0f1a", borderRadius: 4, overflow: "hidden" }}>
                <div style={{
                  width: `${selectedChain.coverage}%`,
                  height: "100%",
                  background: selectedChain.coverage > 50 ? "#22c55e" : selectedChain.coverage > 25 ? "#eab308" : "#ef4444",
                  transition: "width 0.3s",
                }} />
              </div>
            </div>
          </>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: "#666" }}>
            选择左侧攻击链查看详情
          </div>
        )}
      </div>
    </div>
  );
};

// Coverage View Component (existing)
const CoverageView: React.FC<{ coverage: Record<string, number> }> = ({ coverage }) => {
  const sortedTactics = Object.entries(coverage).sort((a, b) => a[1] - b[1]);

  const getCoverageColor = (value: number) => {
    if (value >= 70) return "#22c55e";
    if (value >= 40) return "#eab308";
    return "#ef4444";
  };

  return (
    <div style={{ background: "#1a1a2e", borderRadius: 12, padding: "1.5rem" }}>
      <h3 style={{ color: "#fff", margin: "0 0 1.5rem 0", fontSize: "1.2rem" }}>
        MITRE ATT&CK 战术控制覆盖率
      </h3>

      <div style={{ display: "grid", gap: "1rem" }}>
        {sortedTactics.map(([tactic, value]) => (
          <div key={tactic} style={{
            display: "grid",
            gridTemplateColumns: "200px 1fr 80px",
            alignItems: "center",
            gap: "1rem",
          }}>
            <div style={{ color: "#fff", fontSize: "0.9rem" }}>{tactic}</div>
            <div style={{ height: 24, background: "#0f0f1a", borderRadius: 6, overflow: "hidden", position: "relative" }}>
              <div style={{
                width: `${value}%`,
                height: "100%",
                background: getCoverageColor(value),
                transition: "width 0.5s",
                borderRadius: 6,
              }} />
            </div>
            <div style={{
              textAlign: "right",
              color: getCoverageColor(value),
              fontSize: "0.9rem",
              fontWeight: 600,
            }}>
              {value}%
            </div>
          </div>
        ))}
      </div>

      {sortedTactics.length === 0 && (
        <div style={{ textAlign: "center", color: "#666", padding: "2rem" }}>
          暂无覆盖率数据，请确保已加载 MITRE 和 SCF 知识库
        </div>
      )}

      <div style={{ marginTop: "2rem", padding: "1rem", background: "#0f0f1a", borderRadius: 8 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", textAlign: "center" }}>
          <div>
            <div style={{ color: "#22c55e", fontSize: "1.5rem", fontWeight: 700 }}>
              {sortedTactics.filter(([, v]) => v >= 70).length}
            </div>
            <div style={{ color: "#666", fontSize: "0.75rem" }}>高覆盖 (≥70%)</div>
          </div>
          <div>
            <div style={{ color: "#eab308", fontSize: "1.5rem", fontWeight: 700 }}>
              {sortedTactics.filter(([, v]) => v >= 40 && v < 70).length}
            </div>
            <div style={{ color: "#666", fontSize: "0.75rem" }}>中覆盖 (40-70%)</div>
          </div>
          <div>
            <div style={{ color: "#ef4444", fontSize: "1.5rem", fontWeight: 700 }}>
              {sortedTactics.filter(([, v]) => v < 40).length}
            </div>
            <div style={{ color: "#666", fontSize: "0.75rem" }}>低覆盖 (&lt;40%)</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgePage;
