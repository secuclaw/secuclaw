import React, { useState, useEffect } from "react";
import {
  Database,
  Shield,
  FileText,
  Target,
  Layers,
  Lock,
  Network,
  Cloud,
  Search,
  ChevronRight,
  BarChart3,
  BookOpen,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Filter,
  Download,
  RefreshCw
} from "lucide-react";

interface Dimension {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  file: string;
  recordCount: number;
  size: string;
  type: string;
  icon: React.ReactNode;
  color: string;
}

interface DimensionDetail {
  dimension: Dimension;
  records: any[];
  fields: string[];
  categories: Record<string, string[]>;
}

const DIMENSIONS: Dimension[] = [
  {
    id: "controls",
    name: "安全控制",
    nameEn: "Security Controls",
    description: "SCF 2025.4 核心安全控制项，包含 1,451 个控制",
    file: "scf-20254.json",
    recordCount: 1451,
    size: "29.3 MB",
    type: "核心",
    icon: <Shield size={24} />,
    color: "#ef4444"
  },
  {
    id: "domains",
    name: "控制域",
    nameEn: "Control Domains",
    description: "34 个安全控制域的定义和原则",
    file: "scf-domains-principles.json",
    recordCount: 34,
    size: "20 KB",
    type: "分类",
    icon: <Layers size={24} />,
    color: "#3b82f6"
  },
  {
    id: "assessment",
    name: "评估目标",
    nameEn: "Assessment Objectives",
    description: "5,736 个评估目标和测试方法",
    file: "assessment-objectives-20254.json",
    recordCount: 5736,
    size: "6.5 MB",
    type: "评估",
    icon: <Target size={24} />,
    color: "#f97316"
  },
  {
    id: "evidence",
    name: "证据请求",
    nameEn: "Evidence Request List",
    description: "272 个审计和合规性评估所需的证据清单",
    file: "evidence-request-list-20254.json",
    recordCount: 272,
    size: "101 KB",
    type: "证据",
    icon: <FileText size={24} />,
    color: "#22c55e"
  },
  {
    id: "sources",
    name: "权威来源",
    nameEn: "Authoritative Sources",
    description: "261 个合规框架和法律映射的权威来源",
    file: "authoritative-sources.json",
    recordCount: 261,
    size: "112 KB",
    type: "映射",
    icon: <BookOpen size={24} />,
    color: "#8b5cf6"
  },
  {
    id: "privacy",
    name: "隐私原则",
    nameEn: "Data Privacy Principles",
    description: "258 个 GDPR、CCPA 等隐私法规的指导原则",
    file: "data-privacy-mgmt-principles.json",
    recordCount: 258,
    size: "949 KB",
    type: "指导",
    icon: <Lock size={24} />,
    color: "#ec4899"
  },
  {
    id: "risk",
    name: "风险目录",
    nameEn: "Risk Catalog",
    description: "45 个网络安全风险分类和定义",
    file: "risk-catalog.json",
    recordCount: 45,
    size: "24 KB",
    type: "参考",
    icon: <AlertTriangle size={24} />,
    color: "#eab308"
  },
  {
    id: "threat",
    name: "威胁目录",
    nameEn: "Threat Catalog",
    description: "47 个网络安全威胁分类和定义",
    file: "threat-catalog.json",
    recordCount: 47,
    size: "33 KB",
    type: "参考",
    icon: <Network size={24} />,
    color: "#6366f1"
  },
  {
    id: "lists",
    name: "参考列表",
    nameEn: "Reference Lists",
    description: "7 个各种参考数据和列表",
    file: "lists.json",
    recordCount: 7,
    size: "<1 KB",
    type: "辅助",
    icon: <Database size={24} />,
    color: "#6b7280"
  }
];

const DimensionsViewer: React.FC = () => {
  const [selectedDimension, setSelectedDimension] = useState<Dimension | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [loading, setLoading] = useState(false);

  // 过滤维度
  const filteredDimensions = DIMENSIONS.filter(dim => {
    const matchesSearch =
      dim.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dim.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dim.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter = filterType === "all" || dim.type === filterType;

    return matchesSearch && matchesFilter;
  });

  // 维度类型统计
  const typeStats = DIMENSIONS.reduce((acc, dim) => {
    acc[dim.type] = (acc[dim.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // 总记录数
  const totalRecords = DIMENSIONS.reduce((sum, dim) => sum + dim.recordCount, 0);

  return (
    <div style={{ padding: "1.5rem", background: "#0f0f1a", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          color: "#fff",
          fontSize: "1.75rem",
          margin: 0
        }}>
          <Database size={32} />
          SCF 知识库维度
          <span style={{ fontSize: "0.85rem", color: "#666", fontWeight: "normal" }}>
            9 个数据维度 • {totalRecords.toLocaleString()} 条记录
          </span>
        </h1>
        <p style={{ color: "#888", marginTop: "0.5rem", fontSize: "0.9rem" }}>
          浏览和查询 SCF 安全控制框架的各个维度数据
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "1rem",
        marginBottom: "1.5rem"
      }}>
        <StatCard
          label="总维度"
          value={DIMENSIONS.length}
          color="#3b82f6"
          icon={<Database size={18} />}
        />
        <StatCard
          label="总记录数"
          value={totalRecords.toLocaleString()}
          color="#22c55e"
          icon={<BarChart3 size={18} />}
        />
        <StatCard
          label="核心维度"
          value={typeStats["核心"] || 0}
          color="#ef4444"
          icon={<Shield size={18} />}
        />
        <StatCard
          label="参考维度"
          value={typeStats["参考"] || 0}
          color="#8b5cf6"
          icon={<BookOpen size={18} />}
        />
      </div>

      {/* Control Bar */}
      <div style={{
        display: "flex",
        gap: "1rem",
        marginBottom: "1.5rem",
        flexWrap: "wrap",
        alignItems: "center"
      }}>
        {/* Search */}
        <div style={{
          flex: 1,
          minWidth: "300px",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          background: "#1a1a2e",
          padding: "0.75rem 1rem",
          borderRadius: 12,
          border: "1px solid #2a2a3e"
        }}>
          <Search size={20} style={{ color: "#666" }} />
          <input
            type="text"
            placeholder="搜索维度名称、描述..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              color: "#fff",
              fontSize: "0.9rem",
              outline: "none"
            }}
          />
        </div>

        {/* Filter */}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <FilterButton
            active={filterType === "all"}
            onClick={() => setFilterType("all")}
            label="全部"
            count={DIMENSIONS.length}
          />
          <FilterButton
            active={filterType === "核心"}
            onClick={() => setFilterType("核心")}
            label="核心"
            count={typeStats["核心"] || 0}
          />
          <FilterButton
            active={filterType === "分类"}
            onClick={() => setFilterType("分类")}
            label="分类"
            count={typeStats["分类"] || 0}
          />
          <FilterButton
            active={filterType === "评估"}
            onClick={() => setFilterType("评估")}
            label="评估"
            count={typeStats["评估"] || 0}
          />
        </div>

        {/* View Toggle */}
        <div style={{
          display: "flex",
          gap: "0.5rem",
          background: "#1a1a2e",
          padding: "0.5rem",
          borderRadius: 10,
          border: "1px solid #2a2a3e"
        }}>
          <ViewButton
            active={viewMode === "grid"}
            onClick={() => setViewMode("grid")}
            icon={<Database size={16} />}
          />
          <ViewButton
            active={viewMode === "list"}
            onClick={() => setViewMode("list")}
            icon={<BarChart3 size={16} />}
          />
        </div>
      </div>

      {/* Dimensions Grid/List */}
      {viewMode === "grid" ? (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: "1rem"
        }}>
          {filteredDimensions.map((dimension) => (
            <DimensionCard
              key={dimension.id}
              dimension={dimension}
              selected={selectedDimension?.id === dimension.id}
              onClick={() => setSelectedDimension(dimension)}
            />
          ))}
        </div>
      ) : (
        <div style={{ background: "#1a1a2e", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#0f0f1a" }}>
                <th style={{ padding: "1rem", textAlign: "left", color: "#888", fontSize: "0.85rem" }}>维度</th>
                <th style={{ padding: "1rem", textAlign: "left", color: "#888", fontSize: "0.85rem" }}>类型</th>
                <th style={{ padding: "1rem", textAlign: "right", color: "#888", fontSize: "0.85rem" }}>记录数</th>
                <th style={{ padding: "1rem", textAlign: "right", color: "#888", fontSize: "0.85rem" }}>大小</th>
                <th style={{ padding: "1rem", textAlign: "center", color: "#888", fontSize: "0.85rem" }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredDimensions.map((dimension) => (
                <tr
                  key={dimension.id}
                  onClick={() => setSelectedDimension(dimension)}
                  style={{
                    borderBottom: "1px solid #2a2a3e",
                    cursor: "pointer",
                    background: selectedDimension?.id === dimension.id ? "#1e1e35" : "transparent"
                  }}
                  onMouseEnter={(e) => {
                    if (selectedDimension?.id !== dimension.id) {
                      e.currentTarget.style.background = "#1e1e35";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedDimension?.id !== dimension.id) {
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >
                  <td style={{ padding: "1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <div style={{
                        padding: "0.5rem",
                        background: `${dimension.color}20`,
                        borderRadius: 8,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                        <span style={{ color: dimension.color }}>{dimension.icon}</span>
                      </div>
                      <div>
                        <div style={{ color: "#fff", fontSize: "0.95rem", fontWeight: 500 }}>
                          {dimension.name}
                        </div>
                        <div style={{ color: "#888", fontSize: "0.8rem" }}>
                          {dimension.nameEn}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "1rem" }}>
                    <span style={{
                      padding: "0.25rem 0.75rem",
                      background: `${dimension.color}20`,
                      color: dimension.color,
                      borderRadius: 12,
                      fontSize: "0.8rem",
                      fontWeight: 500
                    }}>
                      {dimension.type}
                    </span>
                  </td>
                  <td style={{ padding: "1rem", textAlign: "right", color: "#fff" }}>
                    {dimension.recordCount.toLocaleString()}
                  </td>
                  <td style={{ padding: "1rem", textAlign: "right", color: "#888" }}>
                    {dimension.size}
                  </td>
                  <td style={{ padding: "1rem", textAlign: "center" }}>
                    <ChevronRight size={18} style={{ color: dimension.color }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Dimension Detail Panel */}
      {selectedDimension && (
        <DimensionDetailPanel
          dimension={selectedDimension}
          onClose={() => setSelectedDimension(null)}
        />
      )}
    </div>
  );
};

// Dimension Card Component
const DimensionCard: React.FC<{
  dimension: Dimension;
  selected: boolean;
  onClick: () => void;
}> = ({ dimension, selected, onClick }) => {
  const recordsPercent = (dimension.recordCount / 5736) * 100;
  const sizePercent = {
    "29.3 MB": 100,
    "6.5 MB": 22,
    "949 KB": 3,
    "112 KB": 0.4,
    "101 KB": 0.3,
    "33 KB": 0.1,
    "24 KB": 0.1,
    "20 KB": 0.1,
    "<1 KB": 0.01
  }[dimension.size] || 0;

  return (
    <div
      onClick={onClick}
      style={{
        padding: "1.25rem",
        background: selected ? "#1e1e35" : "#1a1a2e",
        border: selected ? `2px solid ${dimension.color}` : "1px solid #2a2a3e",
        borderRadius: 12,
        cursor: "pointer",
        transition: "all 0.2s"
      }}
      onMouseEnter={(e) => {
        if (!selected) {
          e.currentTarget.style.background = "#1e1e35";
          e.currentTarget.style.transform = "translateY(-2px)";
        }
      }}
      onMouseLeave={(e) => {
        if (!selected) {
          e.currentTarget.style.background = "#1a1a2e";
          e.currentTarget.style.transform = "translateY(0)";
        }
      }}
    >
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "0.75rem",
        marginBottom: "1rem"
      }}>
        <div style={{
          padding: "0.75rem",
          background: `${dimension.color}20`,
          borderRadius: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <span style={{ color: dimension.color }}>{dimension.icon}</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <h3 style={{ color: "#fff", fontSize: "1rem", margin: 0, fontWeight: 600 }}>
              {dimension.name}
            </h3>
            <span style={{
              padding: "0.2rem 0.5rem",
              background: `${dimension.color}20`,
              color: dimension.color,
              borderRadius: 6,
              fontSize: "0.7rem",
              fontWeight: 600
            }}>
              {dimension.type}
            </span>
          </div>
          <p style={{ color: "#888", fontSize: "0.8rem", margin: 0 }}>
            {dimension.nameEn}
          </p>
        </div>
      </div>

      {/* Description */}
      <p style={{
        color: "#888",
        fontSize: "0.85rem",
        margin: "0 0 1rem 0",
        lineHeight: 1.5
      }}>
        {dimension.description}
      </p>

      {/* Stats */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "0.75rem"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <BarChart3 size={14} style={{ color: "#666" }} />
          <span style={{ color: "#888", fontSize: "0.85rem" }}>
            {dimension.recordCount.toLocaleString()} 条
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Database size={14} style={{ color: "#666" }} />
          <span style={{ color: "#888", fontSize: "0.85rem" }}>
            {dimension.size}
          </span>
        </div>
      </div>

      {/* Progress Bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <div>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "0.25rem",
            fontSize: "0.75rem",
            color: "#666"
          }}>
            <span>记录数占比</span>
            <span>{recordsPercent.toFixed(1)}%</span>
          </div>
          <div style={{
            height: "6px",
            background: "#0f0f1a",
            borderRadius: 3,
            overflow: "hidden"
          }}>
            <div style={{
              height: "100%",
              width: `${recordsPercent}%`,
              background: dimension.color,
              borderRadius: 3
            }} />
          </div>
        </div>
        <div>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "0.25rem",
            fontSize: "0.75rem",
            color: "#666"
          }}>
            <span>文件大小</span>
            <span>{sizePercent.toFixed(1)}%</span>
          </div>
          <div style={{
            height: "6px",
            background: "#0f0f1a",
            borderRadius: 3,
            overflow: "hidden"
          }}>
            <div style={{
              height: "100%",
              width: `${sizePercent}%`,
              background: dimension.color,
              borderRadius: 3
            }} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        marginTop: "1rem",
        paddingTop: "1rem",
        borderTop: "1px solid #2a2a3e",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <span style={{ color: "#666", fontSize: "0.8rem" }}>
          {dimension.file}
        </span>
        <ChevronRight size={16} style={{ color: dimension.color }} />
      </div>
    </div>
  );
};

// Dimension Detail Panel Component
const DimensionDetailPanel: React.FC<{
  dimension: Dimension;
  onClose: () => void;
}> = ({ dimension, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<any[]>([]);

  useEffect(() => {
    const loadDimensionData = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/knowledge/dimension/${dimension.id}`);
        if (response.ok) {
          const data = await response.json();
          setRecords(data.records || []);
        }
      } catch (error) {
        console.error(`Failed to load dimension ${dimension.id}:`, error);
      } finally {
        setLoading(false);
      }
    };

    loadDimensionData();
  }, [dimension.id]);

  return (
    <div style={{
      marginTop: "2rem",
      padding: "1.5rem",
      background: "#1a1a2e",
      borderRadius: 12,
      border: `1px solid ${dimension.color}30`,
      position: "relative"
    }}>
      {/* Close Button */}
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: "1rem",
          right: "1rem",
          background: "transparent",
          border: "none",
          color: "#888",
          cursor: "pointer",
          padding: "0.5rem"
        }}
      >
        ✕
      </button>

      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        marginBottom: "1.5rem",
        paddingRight: "2rem"
      }}>
        <div style={{
          padding: "1rem",
          background: `${dimension.color}20`,
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <span style={{ color: dimension.color, fontSize: "2rem" }}>
            {dimension.icon}
          </span>
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ color: "#fff", fontSize: "1.5rem", margin: 0, marginBottom: "0.25rem" }}>
            {dimension.name}
          </h2>
          <p style={{ color: "#888", fontSize: "0.9rem", margin: 0 }}>
            {dimension.nameEn}
          </p>
        </div>
        <div style={{
          padding: "1rem",
          background: "#0f0f1a",
          borderRadius: 12,
          textAlign: "center"
        }}>
          <div style={{ color: dimension.color, fontSize: "2rem", fontWeight: "bold" }}>
            {dimension.recordCount.toLocaleString()}
          </div>
          <div style={{ color: "#888", fontSize: "0.8rem" }}>条记录</div>
        </div>
      </div>

      {/* Description */}
      <p style={{
        color: "#ccc",
        fontSize: "0.95rem",
        margin: "0 0 1.5rem 0",
        lineHeight: 1.6
      }}>
        {dimension.description}
      </p>

      {/* File Info */}
      <div style={{
        display: "flex",
        gap: "1rem",
        marginBottom: "1.5rem",
        flexWrap: "wrap"
      }}>
        <InfoChip
          label="文件"
          value={dimension.file}
          icon={<FileText size={14} />}
        />
        <InfoChip
          label="大小"
          value={dimension.size}
          icon={<Database size={14} />}
        />
        <InfoChip
          label="类型"
          value={dimension.type}
          icon={<Layers size={14} />}
        />
      </div>

      {/* Content */}
      {loading ? (
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "3rem",
          color: "#888"
        }}>
          <RefreshCw size={24} style={{ animation: "spin 1s linear infinite", marginRight: "1rem" }} />
          加载数据中...
        </div>
      ) : (
        <div>
          {/* Records Preview */}
          <div style={{
            background: "#0f0f1a",
            borderRadius: 8,
            padding: "1rem",
            marginBottom: "1rem"
          }}>
            <h4 style={{ color: "#fff", margin: "0 0 1rem 0", fontSize: "0.9rem" }}>
              数据预览
            </h4>
            <div style={{
              maxHeight: "300px",
              overflow: "auto",
              background: "#1a1a2e",
              borderRadius: 6,
              padding: "1rem"
            }}>
              {records.length > 0 ? (
                <pre style={{
                  color: "#888",
                  fontSize: "0.8rem",
                  margin: 0,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word"
                }}>
                  {JSON.stringify(records[0], null, 2)}
                </pre>
              ) : (
                <p style={{ color: "#666", margin: 0, textAlign: "center" }}>
                  暂无数据预览
                </p>
              )}
            </div>
            {records.length > 1 && (
              <div style={{
                marginTop: "1rem",
                padding: "0.75rem",
                background: "#1a1a2e",
                borderRadius: 6,
                textAlign: "center",
                color: "#888",
                fontSize: "0.85rem"
              }}>
                还有 {records.length - 1} 条记录...
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              style={{
                flex: 1,
                padding: "0.75rem 1rem",
                background: dimension.color,
                border: "none",
                borderRadius: 8,
                color: "#fff",
                cursor: "pointer",
                fontSize: "0.9rem",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem"
              }}
            >
              <Download size={16} />
              导出数据
            </button>
            <button
              style={{
                flex: 1,
                padding: "0.75rem 1rem",
                background: "#2a2a3e",
                border: "1px solid #3b82f6",
                borderRadius: 8,
                color: "#3b82f6",
                cursor: "pointer",
                fontSize: "0.9rem",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem"
              }}
            >
              <Search size={16} />
              查询数据
            </button>
          </div>
        </div>
      )}
    </div>
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
    border: "1px solid #2a2a3e"
  }}>
    <div style={{
      padding: "0.75rem",
      background: `${color}20`,
      borderRadius: 10,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }}>
      <span style={{ color }}>{icon}</span>
    </div>
    <div>
      <div style={{ color, fontSize: "1.5rem", fontWeight: "bold", lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ color: "#888", fontSize: "0.75rem" }}>{label}</div>
    </div>
  </div>
);

// Filter Button Component
const FilterButton: React.FC<{
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}> = ({ active, onClick, label, count }) => (
  <button
    onClick={onClick}
    style={{
      padding: "0.5rem 1rem",
      background: active ? "#3b82f6" : "#1a1a2e",
      border: active ? "1px solid #3b82f6" : "1px solid #2a2a3e",
      borderRadius: 8,
      color: active ? "#fff" : "#888",
      cursor: "pointer",
      fontSize: "0.85rem",
      transition: "all 0.2s"
    }}
  >
    {label}
    <span style={{
      marginLeft: "0.5rem",
      padding: "0.15rem 0.5rem",
      background: active ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.05)",
      borderRadius: 10,
      fontSize: "0.75rem"
    }}>
      {count}
    </span>
  </button>
);

// View Button Component
const ViewButton: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}> = ({ active, onClick, icon }) => (
  <button
    onClick={onClick}
    style={{
      padding: "0.5rem",
      background: active ? "#3b82f6" : "transparent",
      border: "none",
      borderRadius: 6,
      color: active ? "#fff" : "#888",
      cursor: "pointer",
      transition: "all 0.2s"
    }}
  >
    {icon}
  </button>
);

// Info Chip Component
const InfoChip: React.FC<{
  label: string;
  value: string;
  icon: React.ReactNode;
}> = ({ label, value, icon }) => (
  <div style={{
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.5rem 0.75rem",
    background: "#0f0f1a",
    borderRadius: 8,
    border: "1px solid #2a2a3e"
  }}>
    <span style={{ color: "#666", fontSize: "0.8rem" }}>{icon}</span>
    <span style={{ color: "#888", fontSize: "0.8rem" }}>{label}:</span>
    <span style={{ color: "#fff", fontSize: "0.85rem", fontWeight: 500 }}>{value}</span>
  </div>
);

export default DimensionsViewer;
