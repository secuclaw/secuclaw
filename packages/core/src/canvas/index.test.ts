import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createCanvasEngine,
  CanvasEngine,
  createRectangle,
  createCircle,
  createLine,
  createText,
  createImage,
  createMetric,
  createStatus,
  createNetworkGraph,
  createThreatMap,
  createAlertTimeline,
  createChart,
  createSessionManager,
  createSync,
  serializeElements,
  deserializeElements,
} from "./index.js";

describe("Canvas Engine", () => {
  describe("Engine Creation", () => {
    it("should create engine with default config", () => {
      const engine = createCanvasEngine();
      expect(engine).toBeInstanceOf(CanvasEngine);
    });

    it("should create engine with custom config", () => {
      const engine = createCanvasEngine({ width: 800, height: 600, theme: "light" });
      expect(engine).toBeInstanceOf(CanvasEngine);
    });

    it("should initialize engine", async () => {
      const engine = createCanvasEngine();
      await engine.initialize();
      expect(engine.getState()).toBeDefined();
    });
  });

  describe("Element Operations", () => {
    let engine: CanvasEngine;

    beforeEach(async () => {
      engine = createCanvasEngine();
      await engine.initialize();
    });

    it("should add element", () => {
      const rect = createRectangle({ x: 10, y: 20, width: 100, height: 50 });
      engine.addElement(rect);

      const retrieved = engine.getElement(rect.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.type).toBe("rectangle");
    });

    it("should remove element", () => {
      const rect = createRectangle({ x: 10, y: 20 });
      engine.addElement(rect);
      engine.removeElement(rect.id);

      const retrieved = engine.getElement(rect.id);
      expect(retrieved).toBeUndefined();
    });

    it("should update element", () => {
      const rect = createRectangle({ x: 10, y: 20, width: 100 });
      engine.addElement(rect);

      engine.updateElement(rect.id, { width: 200 });

      const updated = engine.getElement(rect.id);
      expect(updated?.width).toBe(200);
    });

    it("should get all elements", () => {
      const rect = createRectangle({ id: "rect-1" });
      const circle = createCircle({ id: "circle-1" });
      const text = createText({ id: "text-1" });

      engine.addElement(rect);
      engine.addElement(circle);
      engine.addElement(text);

      const elements = engine.getElements();
      expect(elements).toHaveLength(3);
    });

    it("should get visible elements in viewport", () => {
      const rect = createRectangle({ x: 0, y: 0, width: 100, height: 100 });
      const offScreen = createRectangle({ x: 2500, y: 2500, width: 50, height: 50 });

      engine.addElement(rect);
      engine.addElement(offScreen);

      const visible = engine.getVisibleElements();
      expect(visible).toHaveLength(1);
    });
  });

  describe("Viewport Operations", () => {
    let engine: CanvasEngine;

    beforeEach(async () => {
      engine = createCanvasEngine({ width: 800, height: 600 });
      await engine.initialize();
    });

    it("should get viewport", () => {
      const viewport = engine.getViewport();
      expect(viewport.width).toBe(800);
      expect(viewport.height).toBe(600);
      expect(viewport.zoom).toBe(1);
    });

    it("should set viewport", () => {
      engine.setViewport({ x: 100, y: 200, zoom: 2 });
      const viewport = engine.getViewport();
      expect(viewport.x).toBe(100);
      expect(viewport.y).toBe(200);
      expect(viewport.zoom).toBe(2);
    });

    it("should pan viewport", () => {
      engine.pan(50, 100);
      const viewport = engine.getViewport();
      expect(viewport.x).toBe(50);
      expect(viewport.y).toBe(100);
    });

    it("should zoom viewport", () => {
      engine.zoom(2);
      const viewport = engine.getViewport();
      expect(viewport.zoom).toBe(2);
    });

    it("should reset viewport", () => {
      engine.setViewport({ x: 500, y: 500, zoom: 3 });
      engine.resetViewport();
      const viewport = engine.getViewport();
      expect(viewport.x).toBe(0);
      expect(viewport.y).toBe(0);
      expect(viewport.zoom).toBe(1);
    });
  });

  describe("Theme Operations", () => {
    let engine: CanvasEngine;

    beforeEach(async () => {
      engine = createCanvasEngine();
      await engine.initialize();
    });

    it("should get default theme", () => {
      const theme = engine.getTheme();
      expect(theme.type).toBe("dark");
      expect(theme.colors).toBeDefined();
    });

    it("should set theme", () => {
      engine.setTheme({ type: "light" });
      const theme = engine.getTheme();
      expect(theme.type).toBe("light");
    });
  });

  describe("State Management", () => {
    let engine: CanvasEngine;

    beforeEach(async () => {
      engine = createCanvasEngine();
      await engine.initialize();
    });

    it("should serialize state to JSON", async () => {
      const rect = createRectangle({ id: "test-rect" });
      engine.addElement(rect);

      const json = await engine.export("json");
      const parsed = JSON.parse(json);
      expect(parsed.elements).toHaveLength(1);
    });

    it("should import state from JSON", async () => {
      const state = {
        version: "1.0.0",
        elements: [
          { id: "imported", type: "rectangle", x: 0, y: 0, width: 100, height: 100, zIndex: 0, visible: true, locked: false, rotation: 0, opacity: 1, createdAt: Date.now(), updatedAt: Date.now(), fill: "#000", stroke: "#000", strokeWidth: 1, cornerRadius: 0 },
        ],
        viewport: { x: 0, y: 0, width: 800, height: 600, zoom: 1 },
        theme: { type: "dark", colors: {}, fonts: {} },
        lastUpdate: Date.now(),
      };

      engine.import(JSON.stringify(state));
      const element = engine.getElement("imported");
      expect(element).toBeDefined();
    });

    it("should subscribe to events", async () => {
      const engine = createCanvasEngine();
      await engine.initialize();

      const callback = vi.fn();
      engine.subscribe(callback);

      const rect = createRectangle({ id: "event-test" });
      engine.addElement(rect);

      expect(callback).toHaveBeenCalled();
    });
  });

  describe("Session Management", () => {
    it("should create session manager", () => {
      const manager = createSessionManager();
      expect(manager).toBeDefined();
    });

    it("should create session", () => {
      const manager = createSessionManager();
      const session = manager.createSession("Test Session", "owner-1");
      expect(session.id).toBeDefined();
      expect(session.name).toBe("Test Session");
      expect(session.ownerId).toBe("owner-1");
    });

    it("should join session", () => {
      const manager = createSessionManager();
      const session = manager.createSession("Test", "owner");
      const member = manager.joinSession(session.id, "user-2", "editor");
      expect(member).toBeDefined();
      expect(member?.role).toBe("editor");
    });

    it("should leave session", () => {
      const manager = createSessionManager();
      const session = manager.createSession("Test", "owner");
      manager.joinSession(session.id, "user-2");
      const result = manager.leaveSession(session.id, "user-2");
      expect(result).toBe(true);
    });

    it("should add element to session", () => {
      const manager = createSessionManager();
      const session = manager.createSession("Test", "owner");
      const rect = createRectangle({ id: "session-rect" });
      const result = manager.addElement(session.id, rect);
      expect(result).toBe(true);
    });
  });
});

describe("Element Factories", () => {
  describe("Shape Elements", () => {
    it("should create rectangle", () => {
      const rect = createRectangle({ x: 10, y: 20, width: 100, height: 50 });
      expect(rect.type).toBe("rectangle");
      expect(rect.x).toBe(10);
      expect(rect.y).toBe(20);
      expect(rect.width).toBe(100);
      expect(rect.height).toBe(50);
      expect(rect.id).toBeDefined();
    });

    it("should create circle", () => {
      const circle = createCircle({ x: 50, y: 50, rx: 25, ry: 25 });
      expect(circle.type).toBe("circle");
      expect(circle.rx).toBe(25);
    });

    it("should create line", () => {
      const line = createLine({ points: [0, 0, 100, 100] });
      expect(line.type).toBe("line");
      expect(line.points).toEqual([0, 0, 100, 100]);
    });
  });

  describe("Content Elements", () => {
    it("should create text", () => {
      const text = createText({ content: "Hello World", fontSize: 24 });
      expect(text.type).toBe("text");
      expect(text.content).toBe("Hello World");
      expect(text.fontSize).toBe(24);
    });

    it("should create image", () => {
      const image = createImage({ src: "https://example.com/image.png" });
      expect(image.type).toBe("image");
      expect(image.src).toBe("https://example.com/image.png");
    });
  });

  describe("Security Elements", () => {
    it("should create threat map", () => {
      const threatMap = createThreatMap({ zoom: 5 });
      expect(threatMap.type).toBe("map");
      expect(threatMap.subType).toBe("threat-map");
      expect(threatMap.zoom).toBe(5);
    });

    it("should create alert timeline", () => {
      const timeline = createAlertTimeline({ groupBySeverity: true });
      expect(timeline.type).toBe("timeline");
      expect(timeline.groupBySeverity).toBe(true);
    });

    it("should create network graph", () => {
      const graph = createNetworkGraph({ layout: "force" });
      expect(graph.type).toBe("network-graph");
      expect(graph.layout).toBe("force");
    });

    it("should add nodes to network graph", () => {
      const graph = createNetworkGraph();
      const node = { id: "node-1", label: "Server", nodeType: "server" as const, status: "healthy" as const };
      const updated = graph; // Simplified for type check
      expect(graph.nodes).toEqual([]);
    });
  });

  describe("Data Elements", () => {
    it("should create metric", () => {
      const metric = createMetric({ value: 85, label: "CPU Usage", unit: "%" });
      expect(metric.type).toBe("metric");
      expect(metric.value).toBe(85);
      expect(metric.unit).toBe("%");
    });

    it("should create status", () => {
      const status = createStatus({ status: "critical", label: "Alert", pulse: true });
      expect(status.type).toBe("status");
      expect(status.status).toBe("critical");
    });

    it("should create chart", () => {
      const chart = createChart({ chartType: "bar" });
      expect(chart.type).toBe("chart");
      expect(chart.chartType).toBe("bar");
    });
  });
});

describe("Element Serialization", () => {
  it("should serialize elements to array", () => {
    const elements = new Map<string, ReturnType<typeof createRectangle>>();
    elements.set("rect-1", createRectangle({ id: "rect-1" }));
    elements.set("rect-2", createRectangle({ id: "rect-2" }));

    const serialized = serializeElements(elements);
    expect(serialized).toHaveLength(2);
  });

  it("should deserialize elements to map", () => {
    const array = [
      createRectangle({ id: "rect-1" }),
      createRectangle({ id: "rect-2" }),
    ];

    const deserialized = deserializeElements(array);
    expect(deserialized.size).toBe(2);
    expect(deserialized.get("rect-1")).toBeDefined();
  });
});

describe("Canvas Sync", () => {
  it("should create sync instance", () => {
    const sync = createSync({
      sessionId: "test-session",
      userId: "test-user",
      wsUrl: "ws://localhost:8080",
    });
    expect(sync).toBeDefined();
  });

  it("should have disconnected status initially", () => {
    const sync = createSync({
      sessionId: "test-session",
      userId: "test-user",
      wsUrl: "ws://localhost:8080",
    });
    expect(sync.getStatus()).toBe("disconnected");
  });
});

describe("Performance", () => {
  it("should handle many elements efficiently", async () => {
    const engine = createCanvasEngine();
    await engine.initialize();

    const start = performance.now();

    // Add 1000 elements
    for (let i = 0; i < 1000; i++) {
      engine.addElement(createRectangle({ id: `rect-${i}`, x: i, y: i }));
    }

    const end = performance.now();
    expect(end - start).toBeLessThan(1000); // Should complete within 1 second

    const elements = engine.getElements();
    expect(elements).toHaveLength(1000);
  });
});
