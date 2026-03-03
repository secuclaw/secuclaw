import React, { useEffect, useRef, useState, useCallback } from "react";
import { ZoomIn, ZoomOut, Maximize2, RotateCcw, Network, Eye, RefreshCw } from "lucide-react";

export interface GraphNode {
  id: string;
  label: string;
  type: "asset" | "threat" | "vulnerability" | "control" | "incident" | "risk" | "actor";
  x?: number;
  y?: number;
  metadata?: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  linkType: string;
  weight?: number;
}

interface KnowledgeGraphProps {
  nodes?: GraphNode[];
  edges?: GraphEdge[];
  width?: number;
  height?: number;
  onNodeClick?: (node: GraphNode) => void;
  onEdgeClick?: (edge: GraphEdge) => void;
}

const nodeColors: Record<string, string> = {
  asset: "#3b82f6",
  threat: "#ef4444",
  vulnerability: "#f97316",
  control: "#22c55e",
  incident: "#a855f7",
  risk: "#eab308",
  actor: "#ec4899",
};

const edgeColors: Record<string, string> = {
  exploits: "#ef4444",
  mitigates: "#22c55e",
  depends_on: "#f97316",
  transmits: "#3b82f6",
  contains: "#a855f7",
  belongs_to: "#6b7280",
};

function generateMockData() {
  const nodes: GraphNode[] = [
    { id: "n1", label: "Web服务器", type: "asset" },
    { id: "n2", label: "数据库", type: "asset" },
    { id: "n3", label: "用户终端", type: "asset" },
    { id: "n4", label: "SQL注入", type: "vulnerability" },
    { id: "n5", label: "XSS漏洞", type: "vulnerability" },
    { id: "n6", label: "弱口令", type: "vulnerability" },
    { id: "n7", label: "APT29组织", type: "threat" },
    { id: "n8", label: "勒索软件", type: "threat" },
    { id: "n9", label: "WAF防护", type: "control" },
    { id: "n10", label: "访问控制", type: "control" },
    { id: "n11", label: "数据加密", type: "control" },
    { id: "n12", label: "安全事件#001", type: "incident" },
    { id: "n13", label: "财务风险", type: "risk" },
    { id: "n14", label: "运维人员", type: "actor" },
  ];

  const edges: GraphEdge[] = [
    { id: "e1", source: "n7", target: "n4", linkType: "exploits" },
    { id: "e2", source: "n7", target: "n5", linkType: "exploits" },
    { id: "e3", source: "n8", target: "n6", linkType: "exploits" },
    { id: "e4", source: "n4", target: "n1", linkType: "affects" },
    { id: "e5", source: "n5", target: "n1", linkType: "affects" },
    { id: "e6", source: "n6", target: "n2", linkType: "affects" },
    { id: "e7", source: "n9", target: "n4", linkType: "mitigates" },
    { id: "e8", source: "n10", target: "n6", linkType: "mitigates" },
    { id: "e9", source: "n11", target: "n2", linkType: "protects" },
    { id: "e10", source: "n1", target: "n2", linkType: "depends_on" },
    { id: "e11", source: "n3", target: "n1", linkType: "transmits" },
    { id: "e12", source: "n12", target: "n7", linkType: "caused_by" },
    { id: "e13", source: "n12", target: "n1", linkType: "affects" },
    { id: "e14", source: "n13", target: "n2", linkType: "impacts" },
    { id: "e15", source: "n14", target: "n10", linkType: "manages" },
  ];

  return { nodes, edges };
}

function forceLayout(nodes: GraphNode[], edges: GraphEdge[]) {
  const width = 800;
  const height = 600;
  
  nodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / nodes.length;
    const radius = Math.min(width, height) / 3;
    node.x = width / 2 + radius * Math.cos(angle);
    node.y = height / 2 + radius * Math.sin(angle);
  });

  for (let iter = 0; iter < 100; iter++) {
    const forces: Record<string, { fx: number; fy: number }> = {};
    nodes.forEach(n => {
      forces[n.id] = { fx: 0, fy: 0 };
    });

    nodes.forEach(n1 => {
      nodes.forEach(n2 => {
        if (n1.id === n2.id) return;
        const dx = (n1.x || 0) - (n2.x || 0);
        const dy = (n1.y || 0) - (n2.y || 0);
        const dist = Math.sqrt(dx * dx + dy * dy) + 0.1;
        const force = 1000 / (dist * dist);
        forces[n1.id].fx += (dx / dist) * force;
        forces[n1.id].fy += (dy / dist) * force;
      });
    });

    edges.forEach(e => {
      const s = nodes.find(n => n.id === e.source);
      const t = nodes.find(n => n.id === e.target);
      if (!s || !t) return;
      const dx = (t.x || 0) - (s.x || 0);
      const dy = (t.y || 0) - (s.y || 0);
      const dist = Math.sqrt(dx * dx + dy * dy) + 0.1;
      const force = (dist - 150) * 0.1;
      forces[s.id].fx += (dx / dist) * force;
      forces[s.id].fy += (dy / dist) * force;
      forces[t.id].fx -= (dx / dist) * force;
      forces[t.id].fy -= (dy / dist) * force;
    });

    nodes.forEach(n => {
      n.x = ((n.x || 0) + forces[n.id].fx * 0.1) || 100;
      n.y = ((n.y || 0) + forces[n.id].fy * 0.1) || 100;
      n.x = Math.max(50, Math.min(width - 50, n.x));
      n.y = Math.max(50, Math.min(height - 50, n.y));
    });
  }
}

export default function KnowledgeGraph({
  nodes: initialNodes,
  edges: initialEdges,
  width = 900,
  height = 650,
  onNodeClick,
}: KnowledgeGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [showLabels, setShowLabels] = useState(true);
  const [showLegend] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const [loading, setLoading] = useState(true);

  const loadData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    
    if (initialNodes && initialEdges) {
      setNodes(initialNodes);
      setEdges(initialEdges);
      forceLayout(initialNodes, initialEdges);
      setNodes([...initialNodes]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const [nodesRes, edgesRes] = await Promise.all([
        fetch('/api/graph/nodes'),
        fetch('/api/graph/edges'),
      ]);
      
      const nodesData = await nodesRes.json();
      const edgesData = await edgesRes.json();
      
      const nodesWithPos = [...(nodesData.nodes || [])];
      const edgesList = edgesData.edges || [];
      
      forceLayout(nodesWithPos, edgesList);
      
      setNodes(nodesWithPos);
      setEdges(edgesList);
    } catch (err) {
      console.error('Failed to load graph data:', err);
      const mock = generateMockData();
      forceLayout(mock.nodes, mock.edges);
      setNodes(mock.nodes);
      setEdges(mock.edges);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData(false);
  };

  useEffect(() => {
    loadData(true);
  }, [initialNodes, initialEdges]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.scale, transform.scale);

    edges.forEach(edge => {
      const source = nodes.find(n => n.id === edge.source);
      const target = nodes.find(n => n.id === edge.target);
      if (!source || !target) return;

      ctx.beginPath();
      ctx.moveTo(source.x || 0, source.y || 0);
      ctx.lineTo(target.x || 0, target.y || 0);
      ctx.strokeStyle = edgeColors[edge.linkType] || "#6b7280";
      ctx.lineWidth = 2;
      ctx.globalAlpha = selectedNode?.id === source.id || selectedNode?.id === target.id ? 1 : 0.4;
      ctx.stroke();
      ctx.globalAlpha = 1;

      const midX = ((source.x || 0) + (target.x || 0)) / 2;
      const midY = ((source.y || 0) + (target.y || 0)) / 2;
      const angle = Math.atan2((target.y || 0) - (source.y || 0), (target.x || 0) - (source.x || 0));
      
      ctx.save();
      ctx.translate(midX, midY);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(-4, 4);
      ctx.lineTo(-4, -4);
      ctx.closePath();
      ctx.fillStyle = edgeColors[edge.linkType] || "#6b7280";
      ctx.fill();
      ctx.restore();
    });

    nodes.forEach(node => {
      const x = node.x || 0;
      const y = node.y || 0;
      const isSelected = selectedNode?.id === node.id;
      const isHovered = hoveredNode?.id === node.id;
      const radius = isSelected || isHovered ? 18 : 14;

      ctx.beginPath();
      ctx.arc(x, y, radius + 4, 0, Math.PI * 2);
      ctx.fillStyle = nodeColors[node.type] || "#6b7280";
      ctx.globalAlpha = 0.2;
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = nodeColors[node.type] || "#6b7280";
      ctx.fill();
      ctx.strokeStyle = isSelected ? "#fff" : "transparent";
      ctx.lineWidth = isSelected ? 3 : 0;
      ctx.stroke();

      if (showLabels) {
        ctx.fillStyle = "#fff";
        ctx.font = "11px system-ui";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(node.label, x, y + radius + 6);
      }

      const typeIcon = node.type.charAt(0).toUpperCase();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(typeIcon, x, y);
    });

    ctx.restore();
  }, [nodes, edges, transform, hoveredNode, selectedNode, showLabels]);

  useEffect(() => {
    draw();
  }, [draw]);

  const getNodeAt = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left - transform.x) / transform.scale;
    const y = (clientY - rect.top - transform.y) / transform.scale;

    return nodes.find(n => {
      const nx = n.x || 0;
      const ny = n.y || 0;
      return Math.sqrt((x - nx) ** 2 + (y - ny) ** 2) < 20;
    }) || null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const node = getNodeAt(e.clientX, e.clientY);
    setHoveredNode(node);

    if (isDragging.current) {
      setTransform(t => ({
        ...t,
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y,
      }));
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleClick = (e: React.MouseEvent) => {
    const node = getNodeAt(e.clientX, e.clientY);
    if (node) {
      setSelectedNode(node);
      onNodeClick?.(node);
    } else {
      setSelectedNode(null);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform(t => ({
      ...t,
      scale: Math.max(0.3, Math.min(3, t.scale * delta)),
    }));
  };

  const zoomIn = () => setTransform(t => ({ ...t, scale: Math.min(3, t.scale * 1.2) }));
  const zoomOut = () => setTransform(t => ({ ...t, scale: Math.max(0.3, t.scale * 0.8) }));
  const resetView = () => setTransform({ x: 0, y: 0, scale: 1 });
  const fitView = () => {
    forceLayout(nodes, edges);
    setNodes([...nodes]);
    resetView();
  };

  const connectedEdges = selectedNode
    ? edges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id)
    : [];

  return (
    <div style={{ background: '#1a1a2e', borderRadius: 12, padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff', fontSize: '1.1rem', margin: 0 }}>
          <Network size={20} />
          知识图谱
        </h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={handleRefresh} style={{ ...btnStyle, background: refreshing ? '#3b82f6' : '#2a2a3e' }} title="刷新数据" disabled={refreshing}>
            <RefreshCw size={16} className={refreshing ? 'spin' : ''} style={refreshing ? { animation: 'spin 1s linear infinite' } : {}} />
          </button>
          <button onClick={zoomIn} style={btnStyle} title="放大">
            <ZoomIn size={16} />
          </button>
          <button onClick={zoomOut} style={btnStyle} title="缩小">
            <ZoomOut size={16} />
          </button>
          <button onClick={resetView} style={btnStyle} title="重置">
            <RotateCcw size={16} />
          </button>
          <button onClick={fitView} style={btnStyle} title="适应画布">
            <Maximize2 size={16} />
          </button>
          <button 
            onClick={() => setShowLabels(!showLabels)} 
            style={{ ...btnStyle, background: showLabels ? '#3b82f6' : '#2a2a3e' }}
            title="显示标签"
          >
            <Eye size={16} />
          </button>
        </div>
      </div>

      <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', background: '#0f0f1a' }}>
        {loading && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15, 15, 26, 0.8)',
            color: '#888',
            zIndex: 10,
          }}>
            加载中...
          </div>
        )}
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleClick}
          onWheel={handleWheel}
          style={{ cursor: isDragging.current ? 'grabbing' : 'grab', display: 'block' }}
        />

        {showLegend && (
          <div style={{
            position: 'absolute',
            top: 12,
            left: 12,
            background: 'rgba(26, 26, 46, 0.9)',
            padding: '0.75rem',
            borderRadius: 8,
            fontSize: '0.7rem',
          }}>
            <div style={{ color: '#888', marginBottom: '0.5rem', fontWeight: 600 }}>节点类型</div>
            {Object.entries(nodeColors).map(([type, color]) => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', color: '#ccc' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                {type}
              </div>
            ))}
          </div>
        )}

        {selectedNode && (
          <div style={{
            position: 'absolute',
            bottom: 12,
            left: 12,
            right: 280,
            background: 'rgba(26, 26, 46, 0.95)',
            padding: '0.75rem',
            borderRadius: 8,
            border: `1px solid ${nodeColors[selectedNode.type]}`,
            maxHeight: '180px',
            overflow: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ color: nodeColors[selectedNode.type], fontWeight: 600, fontSize: '1rem' }}>{selectedNode.label}</span>
              <button
                onClick={() => setSelectedNode(null)}
                style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', padding: '0.25rem' }}
              >
                ✕
              </button>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ 
                background: nodeColors[selectedNode.type], 
                padding: '0.15rem 0.5rem', 
                borderRadius: 4, 
                fontSize: '0.7rem',
                color: '#fff',
              }}>
                {selectedNode.type}
              </span>
              <span style={{ color: '#888', fontSize: '0.7rem' }}>ID: {selectedNode.id}</span>
            </div>
            
            {connectedEdges.length > 0 && (
              <div style={{ marginTop: '0.5rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: '0.25rem' }}>
                  关联关系 ({connectedEdges.length}):
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', maxHeight: '80px', overflow: 'auto' }}>
                  {connectedEdges.slice(0, 5).map(edge => {
                    const isSource = edge.source === selectedNode.id;
                    const otherNodeId = isSource ? edge.target : edge.source;
                    const otherNode = nodes.find(n => n.id === otherNodeId);
                    return (
                      <span key={edge.id} style={{ 
                        background: '#2a2a3e', 
                        padding: '0.15rem 0.4rem', 
                        borderRadius: 4, 
                        fontSize: '0.65rem',
                        color: '#ccc',
                      }}>
                        {isSource ? '→' : '←'} {otherNode?.label || otherNodeId} ({edge.linkType})
                      </span>
                    );
                  })}
                  {connectedEdges.length > 5 && (
                    <span style={{ fontSize: '0.65rem', color: '#888' }}>
                      +{connectedEdges.length - 5} 更多
                    </span>
                  )}
                </div>
              </div>
            )}
            
            {selectedNode.metadata && Object.keys(selectedNode.metadata).length > 0 && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: '#888' }}>
                {Object.entries(selectedNode.metadata).slice(0, 3).map(([k, v]) => (
                  <div key={k}><span style={{ color: '#666' }}>{k}:</span> {String(v)}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={statCard}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#3b82f6' }}>{nodes.length}</div>
          <div style={{ fontSize: '0.7rem', color: '#888' }}>节点</div>
        </div>
        <div style={statCard}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#22c55e' }}>{edges.length}</div>
          <div style={{ fontSize: '0.7rem', color: '#888' }}>关系</div>
        </div>
        <div style={statCard}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>
            {nodes.filter(n => n.type === 'threat').length}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#888' }}>威胁</div>
        </div>
        <div style={statCard}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#22c55e' }}>
            {nodes.filter(n => n.type === 'control').length}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#888' }}>控制措施</div>
        </div>
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: '0.4rem',
  border: 'none',
  borderRadius: 6,
  background: '#2a2a3e',
  color: '#fff',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const statCard: React.CSSProperties = {
  background: '#0f0f1a',
  padding: '0.75rem 1rem',
  borderRadius: 8,
  textAlign: 'center' as const,
  minWidth: 70,
};
