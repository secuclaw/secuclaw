import React, { useState, useEffect, useMemo } from "react";
import type { ProviderConfig, ModelConfig, TaskCategory, RoutingRule } from "@esc/core/providers";

interface ModelRouterProps {
  onModelSelect?: (provider: string, model: string) => void;
  onRoutingChange?: (rules: RoutingRule[]) => void;
  providers?: Map<string, ProviderConfig>;
  currentProvider?: string;
  currentModel?: string;
}

const TASK_CATEGORIES: TaskCategory[] = [
  "reasoning", "coding", "analysis", "translation",
  "summarization", "classification", "extraction", "creative", "chat"
];

const DEFAULT_ROUTING: RoutingRule[] = [
  { category: "reasoning", preferredProvider: "openai", preferredModel: "o3-mini" },
  { category: "coding", preferredProvider: "anthropic", preferredModel: "claude-3-5-sonnet" },
  { category: "analysis", preferredProvider: "google", preferredModel: "gemini-2.0-flash" },
  { category: "translation", preferredProvider: "deepseek", preferredModel: "deepseek-chat" },
  { category: "chat", preferredProvider: "ollama", preferredModel: "qwen3:8b" },
];

export function ModelRouter({
  onModelSelect,
  onRoutingChange,
  providers: externalProviders,
  currentProvider: extCurrentProvider,
  currentModel: extCurrentModel,
}: ModelRouterProps): JSX.Element {
  const [providers, setProviders] = useState<Array<{ name: string; models: ModelConfig[]; available: boolean }>>([]);
  const [selectedProvider, setSelectedProvider] = useState(extCurrentProvider ?? "");
  const [selectedModel, setSelectedModel] = useState(extCurrentModel ?? "");
  const [routingRules, setRoutingRules] = useState<RoutingRule[]>(DEFAULT_ROUTING);
  const [activeTab, setActiveTab] = useState<"manual" | "auto">("manual");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProviders();
  }, []);

  useEffect(() => {
    if (extCurrentProvider) setSelectedProvider(extCurrentProvider);
    if (extCurrentModel) setSelectedModel(extCurrentModel);
  }, [extCurrentProvider, extCurrentModel]);

  const loadProviders = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/providers");
      const data = await response.json() as { providers: Array<{ name: string; available: boolean; models: number }> };
      
      const providerList = data.providers.map(p => ({
        name: p.name,
        models: [],
        available: p.available,
      }));
      
      setProviders(providerList);
      
      if (providerList.length > 0 && !selectedProvider) {
        const firstAvailable = providerList.find(p => p.available)?.name ?? providerList[0].name;
        setSelectedProvider(firstAvailable);
      }
    } catch {
      setProviders([
        { name: "openai", models: [], available: true },
        { name: "anthropic", models: [], available: true },
        { name: "ollama", models: [], available: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleProviderChange = (provider: string) => {
    setSelectedProvider(provider);
    setSelectedModel("");
    onModelSelect?.(provider, "");
  };

  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    onModelSelect?.(selectedProvider, model);
  };

  const handleRoutingRuleChange = (category: TaskCategory, field: keyof RoutingRule, value: string) => {
    const updated = routingRules.map(rule =>
      rule.category === category ? { ...rule, [field]: value } : rule
    );
    setRoutingRules(updated);
    onRoutingChange?.(updated);
  };

  const availableProviders = useMemo(() => 
    providers.filter(p => p.available).map(p => p.name),
    [providers]
  );

  return (
    <div className="model-router">
      <div className="tabs">
        <button 
          className={activeTab === "manual" ? "active" : ""}
          onClick={() => setActiveTab("manual")}
        >
          手动选择
        </button>
        <button
          className={activeTab === "auto" ? "active" : ""}
          onClick={() => setActiveTab("auto")}
        >
          智能路由
        </button>
      </div>

      {activeTab === "manual" && (
        <div className="manual-selection">
          <div className="form-group">
            <label>Provider</label>
            <select 
              value={selectedProvider} 
              onChange={(e) => handleProviderChange(e.target.value)}
              disabled={loading}
            >
              <option value="">选择Provider</option>
              {providers.map(p => (
                <option key={p.name} value={p.name} disabled={!p.available}>
                  {p.name} {!p.available && "(不可用)"}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Model</label>
            <select
              value={selectedModel}
              onChange={(e) => handleModelChange(e.target.value)}
              disabled={!selectedProvider}
            >
              <option value="">选择模型</option>
            </select>
          </div>

          <div className="current-selection">
            <span>当前: </span>
            <strong>{selectedProvider || "未选择"}</strong>
            {selectedModel && <span> / {selectedModel}</span>}
          </div>
        </div>
      )}

      {activeTab === "auto" && (
        <div className="auto-routing">
          <p className="hint">根据任务类型自动选择最优模型</p>
          
          <table className="routing-table">
            <thead>
              <tr>
                <th>任务类型</th>
                <th>首选Provider</th>
                <th>首选模型</th>
              </tr>
            </thead>
            <tbody>
              {routingRules.map(rule => (
                <tr key={rule.category}>
                  <td>{rule.category}</td>
                  <td>
                    <select
                      value={rule.preferredProvider ?? ""}
                      onChange={(e) => handleRoutingRuleChange(rule.category, "preferredProvider", e.target.value)}
                    >
                      <option value="">自动</option>
                      {availableProviders.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="text"
                      value={rule.preferredModel ?? ""}
                      onChange={(e) => handleRoutingRuleChange(rule.category, "preferredModel", e.target.value)}
                      placeholder="留空自动选择"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        .model-router {
          background: #1a1a2e;
          border-radius: 8px;
          padding: 16px;
          color: #fff;
        }
        .tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }
        .tabs button {
          flex: 1;
          padding: 8px 16px;
          border: none;
          background: #16213e;
          color: #a0a0a0;
          border-radius: 4px;
          cursor: pointer;
        }
        .tabs button.active {
          background: #0f3460;
          color: #fff;
        }
        .form-group {
          margin-bottom: 12px;
        }
        .form-group label {
          display: block;
          margin-bottom: 4px;
          color: #a0a0a0;
          font-size: 12px;
        }
        .form-group select, .form-group input {
          width: 100%;
          padding: 8px;
          border: 1px solid #333;
          background: #0f3460;
          color: #fff;
          border-radius: 4px;
        }
        .current-selection {
          margin-top: 16px;
          padding: 8px;
          background: #0f3460;
          border-radius: 4px;
          font-size: 14px;
        }
        .routing-table {
          width: 100%;
          border-collapse: collapse;
        }
        .routing-table th, .routing-table td {
          padding: 8px;
          text-align: left;
          border-bottom: 1px solid #333;
        }
        .routing-table th {
          color: #a0a0a0;
          font-size: 12px;
        }
        .routing-table select, .routing-table input {
          padding: 4px 8px;
          border: 1px solid #333;
          background: #0f3460;
          color: #fff;
          border-radius: 4px;
          width: 100%;
        }
        .hint {
          color: #a0a0a0;
          font-size: 12px;
          margin-bottom: 12px;
        }
      `}</style>
    </div>
  );
}

export default ModelRouter;
