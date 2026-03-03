import React from "react";
import { Send, ThumbsUp, ThumbsDown, Loader2 } from "lucide-react";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  feedback?: "positive" | "negative" | "neutral";
  messageId?: string;
  taskCategory?: string;
}

export interface SkillInfo {
  id: string;
  name: string;
  description?: string;
  emoji?: string;
  role?: string;
  combination?: string;
}

export interface ChatProps {
  messages: ChatMessage[];
  input: string;
  loading: boolean;
  currentSkill?: SkillInfo;
  onSend: (message: string) => void;
  onInputChange: (value: string) => void;
  onFeedback?: (index: number, rating: "positive" | "negative" | "neutral") => void;
}

export const Chat: React.FC<ChatProps> = ({
  messages,
  input,
  loading,
  currentSkill,
  onSend,
  onInputChange,
  onFeedback,
}) => {
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !loading) {
        onSend(input);
      }
    }
  };

  const handleSend = () => {
    if (input.trim() && !loading) {
      onSend(input);
    }
  };

  return (
    <main style={{ flex: 1, display: "flex", flexDirection: "column", background: "#0f0f1a" }}>
      <header style={{ padding: "1rem", borderBottom: "1px solid #2a2a3e", color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "1.5rem" }}>{currentSkill?.emoji || "👤"}</span>
          <div>
            <div style={{ fontWeight: 600 }}>{currentSkill?.name || "Select Role"}</div>
            <div style={{ fontSize: "0.75rem", color: "#888" }}>
              {currentSkill?.role || currentSkill?.combination}
            </div>
          </div>
        </div>
        {currentSkill?.description && (
          <div style={{ fontSize: "0.75rem", color: "#888", marginTop: "0.5rem" }}>
            {currentSkill.description}
          </div>
        )}
      </header>

      <div style={{ flex: 1, overflowY: "auto", padding: "1rem" }}>
        {messages.length === 0 && (
          <div style={{ color: "#666", textAlign: "center", marginTop: "3rem" }}>
            <p>开始与 {currentSkill?.name || "Security Assistant"} 对话</p>
            <p style={{ fontSize: "0.875rem", marginTop: "0.5rem" }}>
              例如: 分析企业系统的钓鱼攻击风险
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              maxWidth: "80%",
              margin: "0.5rem 0",
              padding: "0.75rem 1rem",
              borderRadius: 12,
              background: msg.role === "user" ? "#3b82f6" : "#2a2a3e",
              color: "#fff",
              marginLeft: msg.role === "user" ? "auto" : 0,
            }}
          >
            <div style={{ whiteSpace: "pre-wrap" }}>{msg.content}</div>
            {msg.role === "assistant" && !msg.feedback && onFeedback && (
              <div
                style={{
                  marginTop: "0.5rem",
                  display: "flex",
                  gap: "0.5rem",
                  borderTop: "1px solid #3a3a4e",
                  paddingTop: "0.5rem",
                }}
              >
                <span style={{ fontSize: "0.7rem", color: "#888" }}>这个回答有帮助吗？</span>
                <button
                  onClick={() => onFeedback(i, "positive")}
                  style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "1rem" }}
                >
                  <ThumbsUp size={14} />
                </button>
                <button
                  onClick={() => onFeedback(i, "negative")}
                  style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "1rem" }}
                >
                  <ThumbsDown size={14} />
                </button>
              </div>
            )}
            {msg.role === "assistant" && msg.feedback && (
              <div
                style={{
                  marginTop: "0.5rem",
                  fontSize: "0.7rem",
                  color: "#4ade80",
                  borderTop: "1px solid #3a3a4e",
                  paddingTop: "0.5rem",
                }}
              >
                {msg.feedback === "positive"
                  ? "✓ 感谢您的正面反馈，系统将学习优化此类回答"
                  : "✓ 感谢反馈，系统将改进此类回答"}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ color: "#888", padding: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Loader2 size={14} className="animate-spin" style={{ animation: "spin 1s linear infinite" }} />
            思考中...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <footer style={{ padding: "1rem", borderTop: "1px solid #2a2a3e" }}>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            type="text"
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入安全问题..."
            style={{
              flex: 1,
              padding: "0.75rem 1rem",
              borderRadius: 8,
              border: "1px solid #3a3a4e",
              background: "#1a1a2e",
              color: "#fff",
              fontSize: "0.875rem",
            }}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            style={{
              padding: "0.75rem 1.5rem",
              borderRadius: 8,
              border: "none",
              background: loading || !input.trim() ? "#4a4a6a" : "#3b82f6",
              color: "#fff",
              cursor: loading || !input.trim() ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <Send size={16} />
            发送
          </button>
        </div>
      </footer>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </main>
  );
};

export default Chat;
