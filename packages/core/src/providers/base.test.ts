import { describe, expect, it } from "vitest";
import { BaseLLMProvider } from "./base.js";
import type { ChatRequest } from "./types.js";

class TestProvider extends BaseLLMProvider {
  constructor() {
    super(
      "test",
      "test",
      {
        streaming: false,
        tools: false,
        vision: false,
        audio: false,
        maxContextLength: 1024,
        supportedModels: ["x"],
      },
      { timeout: 1000, retries: 0 },
    );
  }

  protected async doChat(request: ChatRequest) {
    return {
      content: request.messages.length.toString(),
      model: "x",
    };
  }
}

describe("base llm provider", () => {
  it("normalizes array request", async () => {
    const provider = new TestProvider();
    const res = await provider.chat([{ role: "user", content: "hi" }]);
    expect(res.content).toBe("1");
  });
});
