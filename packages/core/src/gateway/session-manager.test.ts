import { describe, expect, it } from "vitest";
import { SessionManager } from "./session-manager.js";

describe("gateway session manager", () => {
  it("creates and lists sessions", () => {
    const manager = new SessionManager();
    const session = manager.createSession("agent-1", { title: "test" });
    expect(manager.getSession(session.id)?.agentId).toBe("agent-1");
    expect(manager.listSessions()).toHaveLength(1);
  });

  it("appends transcript and compacts session", () => {
    const manager = new SessionManager();
    const session = manager.createSession("agent-2");
    for (let i = 0; i < 30; i++) {
      manager.appendMessage(session.id, {
        id: `m-${i}`,
        role: "user",
        content: `message-${i}`,
        timestamp: Date.now(),
      });
    }
    expect(manager.getTranscript(session.id)).toHaveLength(30);
    manager.compactSession(session.id);
    expect(manager.getTranscript(session.id).length).toBeLessThan(30);
  });
});
