import React, { useState, useEffect } from "react";
import {
  Layers,
  Shield,
  Target,
  Lock,
  Database,
  Network,
  Cloud,
  Smartphone,
  FileText,
  Users,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Search,
  Filter,
  TrendingUp,
  Loader2,
  X,
  ChevronDown,
  Code
} from "lucide-react";

interface CategoryDetailProps {
  onCategorySelect?: (category: string, type: string) => void;
}

interface DetailRecord {
  [key: string]: any;
}

type CategoryType = "domain" | "tactic" | "framework" | "priority" | "control-family";

interface Category {
  id: string;
  name: string;
  description: string;
  count: number;
  color: string;
  icon: React.ReactNode;
}

const SCF_DOMAINS: Category[] = [
  { id: "GOV", name: "治理与合规", description: "Cybersecurity & Data Protection Governance", count: 38, color: "#3b82f6", icon: <Shield size={20} /> },
  { id: "AAT", name: "AI与自主技术", description: "Artificial Intelligence & Autonomous Technologies", count: 156, color: "#8b5cf6", icon: <TrendingUp size={20} /> },
  { id: "IAC", name: "身份与认证", description: "Identification & Authentication", count: 112, color: "#f43f5e", icon: <Lock size={20} /> },
  { id: "NET", name: "网络安全", description: "Network Security", count: 98, color: "#22c55e", icon: <Network size={20} /> },
  { id: "DCH", name: "数据分类", description: "Data Classification & Handling", count: 85, color: "#06b6d4", icon: <Database size={20} /> },
  { id: "PRI", name: "数据隐私", description: "Data Privacy", count: 102, color: "#ec4899", icon: <Shield size={20} /> },
  { id: "MON", name: "持续监控", description: "Continuous Monitoring", count: 70, color: "#f97316", icon: <AlertTriangle size={20} /> },
  { id: "AST", name: "资产管理", description: "Asset Management", count: 62, color: "#14b8a6", icon: <Layers size={20} /> },
  { id: "END", name: "终端安全", description: "Endpoint Security", count: 47, color: "#6366f1", icon: <Smartphone size={20} /> },
  { id: "CLD", name: "云安全", description: "Cloud Security", count: 24, color: "#0ea5e9", icon: <Cloud size={20} /> },
];

const MITRE_TACTICS: Category[] = [
  { id: "TA0001", name: "初始访问", description: "Initial Access", count: 52, color: "#ef4444", icon: <Target size={20} /> },
  { id: "TA0002", name: "执行", description: "Execution", count: 78, color: "#f97316", icon: <Target size={20} /> },
  { id: "TA0003", name: "持久化", description: "Persistence", count: 62, color: "#eab308", icon: <Target size={20} /> },
  { id: "TA0004", name: "权限提升", description: "Privilege Escalation", count: 45, color: "#22c55e", icon: <Target size={20} /> },
  { id: "TA0005", name: "防御规避", description: "Defense Evasion", count: 98, color: "#14b8a6", icon: <Shield size={20} /> },
  { id: "TA0006", name: "凭证访问", description: "Credential Access", count: 56, color: "#3b82f6", icon: <Lock size={20} /> },
  { id: "TA0007", name: "发现", description: "Discovery", count: 65, color: "#6366f1", icon: <Search size={20} /> },
  { id: "TA0008", name: "横向移动", description: "Lateral Movement", count: 38, color: "#8b5cf6", icon: <Network size={20} /> },
  { id: "TA0009", name: "收集", description: "Collection", count: 42, color: "#d946ef", icon: <Database size={20} /> },
  { id: "TA0011", name: "命令与控制", description: "Command and Control", count: 48, color: "#ec4899", icon: <Network size={20} /> },
];

const FRAMEWORKS: Category[] = [
  { id: "NIST", name: "NIST CSF", description: "网络安全框架", count: 234, color: "#3b82f6", icon: <FileText size={20} /> },
  { id: "ISO", name: "ISO 27001", description: "信息安全管理体系", count: 189, color: "#22c55e", icon: <Shield size={20} /> },
  { id: "SOC2", name: "SOC 2", description: "服务组织控制", count: 156, color: "#f97316", icon: <CheckCircle size={20} /> },
  { id: "PCI", name: "PCI DSS", description: "支付卡数据安全标准", count: 142, color: "#ef4444", icon: <Lock size={20} /> },
  { id: "CIS", name: "CIS Controls", description: "网络安全控制", count: 178, color: "#8b5cf6", icon: <Layers size={20} /> },
  { id: "HIPAA", name: "HIPAA", description: "健康保险便携性", count: 98, color: "#06b6d4", icon: <Users size={20} /> },
  { id: "GDPR", name: "GDPR", description: "通用数据保护条例", count: 145, color: "#ec4899", icon: <Shield size={20} /> },
];

const PRIORITY_LEVELS: Category[] = [
  { id: "high", name: "高优先级", description: "权重 ≥ 8 的关键控制", count: 287, color: "#ef4444", icon: <AlertTriangle size={20} /> },
  { id: "medium", name: "中优先级", description: "权重 5-7 的重要控制", count: 582, color: "#f97316", icon: <Shield size={20} /> },
  { id: "standard", name: "标准优先级", description: "权重 3-4 的基础控制", count: 412, color: "#22c55e", icon: <CheckCircle size={20} /> },
  { id: "low", name: "低优先级", description: "权重 1-2 的可选控制", count: 170, color: "#6b7280", icon: <FileText size={20} /> },
];

const KnowledgeCategories: React.FC<CategoryDetailProps> = ({ onCategorySelect }) => {
  const [selectedType, setSelectedType] = useState<CategoryType>("domain");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [detailData, setDetailData] = useState<DetailRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);

  const categories = {
    domain: SCF_DOMAINS,
    tactic: MITRE_TACTICS,
    framework: FRAMEWORKS,
    priority: PRIORITY_LEVELS,
    "control-family": SCF_DOMAINS,
  };

  const currentCategories = categories[selectedType] || [];
  const filteredCategories = currentCategories.filter(cat =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cat.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cat.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Fetch detail data when category is selected
  useEffect(() => {
    const fetchDetailData = async () => {
      if (!selectedCategory || !showDetailPanel) {
        setDetailData([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        let dimensionId = "";
        let filterField = "";
        let filterValue = selectedCategory;

        // Map category types to dimension IDs and filter fields
        switch (selectedType) {
          case "domain":
            dimensionId = "controls";
            filterField = "SCF Domain";
            break;
          case "tactic":
            dimensionId = "mitre";
            filterField = "tactic";
            break;
          case "framework":
            // Frameworks require special handling - show message for now
            setError("Framework filtering is under development. Please use Domain or Priority views.");
            setLoading(false);
            return;
          case "priority":
            dimensionId = "controls";
            filterField = "Relative Control Weighting";
            // Map priority levels to numeric ranges
            const priorityMap: Record<string, string> = {
              "high": "8",
              "medium": "5",
              "standard": "3",
              "low": "1"
            };
            filterValue = priorityMap[selectedCategory] || selectedCategory;
            break;
        }

        if (dimensionId === "mitre") {
          // For MITRE tactics, use the local API route
          const response = await fetch(`/api/knowledge/mitre/tactics/${selectedCategory}`);
          if (!response.ok) {
            throw new Error("Failed to fetch MITRE data");
          }
          const data = await response.json();
          setDetailData(data.techniques || []);
        } else {
          // Fetch from SCF dimension API
          const response = await fetch(`/api/knowledge/dimension/${dimensionId}`);
          if (!response.ok) {
            throw new Error("Failed to fetch dimension data");
          }
          const result = await response.json();

          // Filter records based on category
          let filtered = result.records;
          if (filterField) {
            filtered = result.records.filter((record: DetailRecord) => {
              const fieldValue = record[filterField];
              if (!fieldValue) return false;

              // Handle priority filtering (numeric comparison)
              if (selectedType === "priority") {
                const weight = parseFloat(fieldValue);
                const targetWeight = parseFloat(filterValue);
                if (selectedCategory === "high") return weight >= 8;
                if (selectedCategory === "medium") return weight >= 5 && weight < 8;
                if (selectedCategory === "standard") return weight >= 3 && weight < 5;
                if (selectedCategory === "low") return weight < 3;
                return false;
              }

              // Handle string filtering
              if (typeof fieldValue === "string") {
                return fieldValue.includes(filterValue) || filterValue.includes(fieldValue);
              }
              return fieldValue === filterValue;
            });
          }

          setDetailData(filtered);
        }
      } catch (err) {
        console.error("Error fetching detail data:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
        setDetailData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDetailData();
  }, [selectedCategory, selectedType, showDetailPanel]);

  const handleCategoryClick = (category: Category) => {
    setSelectedCategory(category.id);
    if (onCategorySelect) {
      onCategorySelect(category.id, selectedType);
    }
  };

  const handleViewDetails = () => {
    setShowDetailPanel(true);
  };

  return (
    <>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div style={{ padding: "1.5rem", background: "#0f0f1a", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ display: "flex", alignItems: "center", gap: "0.75rem", color: "#fff", fontSize: "1.75rem", margin: 0 }}>
          <Layers size={32} />
          知识库分类展现
          <span style={{ fontSize: "0.85rem", color: "#666", fontWeight: "normal" }}>
            按不同维度浏览知识库
          </span>
        </h1>
        <p style={{ color: "#888", marginTop: "0.5rem", fontSize: "0.9rem" }}>
          选择分类维度，查看相关的安全控制、威胁技术和合规框架
        </p>
      </div>

      {/* Type Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <TypeTab
          active={selectedType === "domain"}
          onClick={() => setSelectedType("domain")}
          icon={<Shield size={16} />}
          label="SCF 控制域"
          count={SCF_DOMAINS.reduce((sum, d) => sum + d.count, 0)}
        />
        <TypeTab
          active={selectedType === "tactic"}
          onClick={() => setSelectedType("tactic")}
          icon={<Target size={16} />}
          label="MITRE 战术"
          count={MITRE_TACTICS.reduce((sum, t) => sum + t.count, 0)}
        />
        <TypeTab
          active={selectedType === "framework"}
          onClick={() => setSelectedType("framework")}
          icon={<FileText size={16} />}
          label="合规框架"
          count={FRAMEWORKS.reduce((sum, f) => sum + f.count, 0)}
        />
        <TypeTab
          active={selectedType === "priority"}
          onClick={() => setSelectedType("priority")}
          icon={<TrendingUp size={16} />}
          label="优先级"
          count={PRIORITY_LEVELS.reduce((sum, p) => sum + p.count, 0)}
        />
      </div>

      {/* Search Bar */}
      <div style={{
        display: "flex",
        gap: "0.75rem",
        marginBottom: "1.5rem",
        background: "#1a1a2e",
        padding: "0.75rem 1rem",
        borderRadius: 12,
        border: "1px solid #2a2a3e"
      }}>
        <Search size={20} style={{ color: "#666", marginTop: "2px" }} />
        <input
          type="text"
          placeholder="搜索分类名称、描述或ID..."
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
        {searchQuery && (
          <span style={{ color: "#888", fontSize: "0.85rem", padding: "0.25rem 0.75rem" }}>
            找到 {filteredCategories.length} 个结果
          </span>
        )}
      </div>

      {/* Categories Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
        gap: "1rem"
      }}>
        {filteredCategories.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            selected={selectedCategory === category.id}
            onClick={() => handleCategoryClick(category)}
          />
        ))}
      </div>

      {/* Stats Summary */}
      <div style={{
        marginTop: "2rem",
        padding: "1.25rem",
        background: "#1a1a2e",
        borderRadius: 12,
        border: "1px solid #2a2a3e"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h3 style={{ color: "#fff", margin: 0, fontSize: "1rem" }}>分类统计</h3>
            <p style={{ color: "#888", fontSize: "0.85rem", margin: "0.25rem 0 0 0" }}>
              当前显示: {filteredCategories.length} 个分类
            </p>
          </div>
          <div style={{ display: "flex", gap: "1.5rem" }}>
            <StatItem label="总条目" value={filteredCategories.reduce((sum, c) => sum + c.count, 0)} color="#3b82f6" />
            <StatItem label="分类数" value={filteredCategories.length} color="#22c55e" />
            <StatItem label="平均" value={Math.round(filteredCategories.reduce((sum, c) => sum + c.count, 0) / filteredCategories.length)} color="#f97316" />
          </div>
        </div>
      </div>

      {/* Selected Category Detail */}
      {selectedCategory && !showDetailPanel && (
        <div style={{
          marginTop: "1.5rem",
          padding: "1.25rem",
          background: "#1a1a2e",
          borderRadius: 12,
          border: "1px solid #3b82f6"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <CheckCircle size={20} style={{ color: "#22c55e" }} />
            <span style={{ color: "#fff", fontSize: "0.9rem" }}>
              已选择: <strong>{currentCategories.find(c => c.id === selectedCategory)?.name}</strong>
            </span>
          </div>
          <button
            onClick={handleViewDetails}
            style={{
              padding: "0.5rem 1rem",
              background: "#3b82f6",
              border: "none",
              borderRadius: 6,
              color: "#fff",
              cursor: "pointer",
              fontSize: "0.85rem"
            }}
          >
            查看详情 →
          </button>
        </div>
      )}

      {/* Detail Panel */}
      {showDetailPanel && selectedCategory && (
        <div style={{
          marginTop: "1.5rem",
          padding: "1.5rem",
          background: "#1a1a2e",
          borderRadius: 12,
          border: "1px solid #3b82f6"
        }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <CheckCircle size={24} style={{ color: "#22c55e" }} />
              <div>
                <h2 style={{ color: "#fff", fontSize: "1.25rem", margin: 0, fontWeight: 600 }}>
                  {currentCategories.find(c => c.id === selectedCategory)?.name}
                </h2>
                <p style={{ color: "#888", fontSize: "0.85rem", margin: "0.25rem 0 0 0" }}>
                  {currentCategories.find(c => c.id === selectedCategory)?.description}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowDetailPanel(false);
                setSelectedCategory(null);
                setDetailData([]);
              }}
              style={{
                padding: "0.5rem 1rem",
                background: "#ef4444",
                border: "none",
                borderRadius: 6,
                color: "#fff",
                cursor: "pointer",
                fontSize: "0.85rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem"
              }}
            >
              <X size={16} />
              关闭
            </button>
          </div>

          {/* Loading State */}
          {loading && (
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "1rem",
              padding: "3rem",
              color: "#888"
            }}>
              <Loader2 size={32} style={{ animation: "spin 1s linear infinite" }} />
              <span>加载数据中...</span>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div style={{
              padding: "1.5rem",
              background: "#ef444420",
              border: "1px solid #ef4444",
              borderRadius: 8,
              color: "#ef4444"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <AlertTriangle size={20} />
                <strong>加载失败</strong>
              </div>
              <p style={{ margin: 0, fontSize: "0.9rem" }}>{error}</p>
            </div>
          )}

          {/* Data Display */}
          {!loading && !error && detailData.length > 0 && (
            <div>
              {/* Summary Stats */}
              <div style={{
                display: "flex",
                gap: "1.5rem",
                marginBottom: "1.5rem",
                padding: "1rem",
                background: "#0f0f1a",
                borderRadius: 8
              }}>
                <div>
                  <div style={{ color: "#888", fontSize: "0.75rem" }}>找到记录</div>
                  <div style={{ color: "#3b82f6", fontSize: "1.5rem", fontWeight: "bold" }}>
                    {detailData.length}
                  </div>
                </div>
                <div>
                  <div style={{ color: "#888", fontSize: "0.75rem" }}>分类</div>
                  <div style={{ color: "#22c55e", fontSize: "1rem", fontWeight: 600 }}>
                    {currentCategories.find(c => c.id === selectedCategory)?.name}
                  </div>
                </div>
              </div>

              {/* Records List */}
              <div style={{
                maxHeight: "500px",
                overflowY: "auto",
                background: "#0f0f1a",
                borderRadius: 8,
                border: "1px solid #2a2a3e"
              }}>
                {detailData.slice(0, 50).map((record, index) => (
                  <DetailRecordItem
                    key={index}
                    record={record}
                    categoryType={selectedType}
                  />
                ))}
                {detailData.length > 50 && (
                  <div style={{
                    padding: "1rem",
                    textAlign: "center",
                    color: "#888",
                    fontSize: "0.85rem",
                    borderTop: "1px solid #2a2a3e"
                  }}>
                    显示前 50 条，共 {detailData.length} 条记录
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && detailData.length === 0 && (
            <div style={{
              padding: "3rem",
              textAlign: "center",
              color: "#888"
            }}>
              <Database size={48} style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
              <p style={{ margin: 0 }}>暂无数据</p>
            </div>
          )}
        </div>
      )}
      </div>
    </>
  );
};

// Components
const TypeTab: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
}> = ({ active, onClick, icon, label, count }) => (
  <button
    onClick={onClick}
    style={{
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      padding: "0.6rem 1rem",
      background: active ? "#3b82f6" : "#1a1a2e",
      border: active ? "1px solid #3b82f6" : "1px solid #2a2a3e",
      borderRadius: 8,
      color: active ? "#fff" : "#888",
      cursor: "pointer",
      fontSize: "0.85rem",
      transition: "all 0.2s"
    }}
  >
    {icon}
    <span>{label}</span>
    <span style={{
      padding: "0.15rem 0.5rem",
      background: active ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.05)",
      borderRadius: 10,
      fontSize: "0.75rem"
    }}>
      {count}
    </span>
  </button>
);

const CategoryCard: React.FC<{
  category: Category;
  selected: boolean;
  onClick: () => void;
}> = ({ category, selected, onClick }) => (
  <div
    onClick={onClick}
    style={{
      padding: "1.25rem",
      background: selected ? "#1e1e35" : "#1a1a2e",
      border: selected ? `2px solid ${category.color}` : "1px solid #2a2a3e",
      borderRadius: 12,
      cursor: "pointer",
      transition: "all 0.2s",
      opacity: selected ? 1 : 0.9
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
    <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", marginBottom: "0.75rem" }}>
      <div style={{
        padding: "0.5rem",
        background: `${category.color}20`,
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <span style={{ color: category.color }}>{category.icon}</span>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
          <h3 style={{ color: "#fff", fontSize: "1rem", margin: 0, fontWeight: 600 }}>
            {category.name}
          </h3>
          <span style={{
            padding: "0.15rem 0.4rem",
            background: `${category.color}20`,
            color: category.color,
            borderRadius: 4,
            fontSize: "0.7rem",
            fontWeight: 600
          }}>
            {category.id}
          </span>
        </div>
        <p style={{ color: "#888", fontSize: "0.8rem", margin: 0, lineHeight: 1.4 }}>
          {category.description}
        </p>
      </div>
    </div>

    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <Layers size={14} style={{ color: "#666" }} />
        <span style={{ color: "#888", fontSize: "0.85rem" }}>
          {category.count} 个条目
        </span>
      </div>
      <ChevronRight size={16} style={{ color: category.color }} />
    </div>

    {/* Progress bar */}
    <div style={{
      marginTop: "0.75rem",
      height: "4px",
      background: "#0f0f1a",
      borderRadius: 2,
      overflow: "hidden"
    }}>
      <div style={{
        height: "100%",
        width: `${Math.min((category.count / 200) * 100, 100)}%`,
        background: category.color,
        borderRadius: 2,
        transition: "width 0.3s"
      }} />
    </div>
  </div>
);

const StatItem: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div style={{ textAlign: "center" }}>
    <div style={{ color, fontSize: "1.5rem", fontWeight: "bold", lineHeight: 1 }}>{value}</div>
    <div style={{ color: "#888", fontSize: "0.75rem" }}>{label}</div>
  </div>
);

const DetailRecordItem: React.FC<{
  record: DetailRecord;
  categoryType: CategoryType;
}> = ({ record, categoryType }) => {
  const [expanded, setExpanded] = useState(false);

  // Get key fields based on category type
  const getTitle = () => {
    switch (categoryType) {
      case "domain":
        return record["SCF Control"] || record["SCF #"] || "Unknown";
      case "tactic":
        return record.name || record.ID || "Unknown";
      case "framework":
        return record["SCF Control"] || record["SCF #"] || "Unknown";
      case "priority":
        return record["SCF Control"] || record["SCF #"] || "Unknown";
      default:
        return "Unknown";
    }
  };

  const getSubtitle = () => {
    switch (categoryType) {
      case "domain":
        return record["SCF #"] || "";
      case "tactic":
        return record.techniqueID || "";
      case "framework":
        return record["SCF #"] || "";
      case "priority":
        return record["SCF #"] || "";
      default:
        return "";
    }
  };

  const getDescription = () => {
    switch (categoryType) {
      case "domain":
        return record["Control Statement"] || record.Description || "";
      case "tactic":
        return record.description || "";
      case "framework":
        return record["Control Statement"] || record.Description || "";
      case "priority":
        return record["Control Statement"] || record.Description || "";
      default:
        return "";
    }
  };

  return (
    <div style={{
      padding: "1rem",
      borderBottom: "1px solid #2a2a3e",
      cursor: "pointer",
      transition: "background 0.2s"
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = "#1a1a2e";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = "transparent";
    }}
    >
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <span style={{ color: "#fff", fontSize: "0.95rem", fontWeight: 600 }}>
              {getTitle()}
            </span>
            {getSubtitle() && (
              <span style={{
                padding: "0.15rem 0.4rem",
                background: "#3b82f620",
                color: "#3b82f6",
                borderRadius: 4,
                fontSize: "0.7rem",
                fontWeight: 600
              }}>
                {getSubtitle()}
              </span>
            )}
          </div>
          <p style={{ color: "#888", fontSize: "0.85rem", margin: 0, lineHeight: 1.4 }}>
            {getDescription().slice(0, 150)}
            {getDescription().length > 150 ? "..." : ""}
          </p>
        </div>
        <ChevronDown
          size={16}
          style={{
            color: "#666",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
            marginTop: "4px"
          }}
        />
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div style={{
          marginTop: "1rem",
          padding: "1rem",
          background: "#0f0f1a",
          borderRadius: 8,
          border: "1px solid #2a2a3e"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <Code size={14} style={{ color: "#888" }} />
            <span style={{ color: "#888", fontSize: "0.8rem" }}>完整数据</span>
          </div>
          <pre style={{
            margin: 0,
            padding: "1rem",
            background: "#1a1a2e",
            borderRadius: 6,
            overflowX: "auto",
            fontSize: "0.8rem",
            color: "#a5b4fc",
            lineHeight: 1.5
          }}>
            {JSON.stringify(record, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default KnowledgeCategories;
