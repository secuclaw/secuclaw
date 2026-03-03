import { describe, expect, it, vi } from "vitest";
import { healthHandlers } from "./health.js";
import type { MethodContext } from "./types.js";

describe("gateway health handlers", () => {
  it("responds with ok status", async () => {
    const respond = vi.fn();
    const context: MethodContext = {
      connection: {
        id: "c1",
        send: () => undefined,
        close: () => undefined,
      },
      respond,
    };

    const result = await healthHandlers["health.check"]({}, context);
    expect((result as { status: string }).status).toBe("ok");
    expect(respond).toHaveBeenCalled();
  });
});
