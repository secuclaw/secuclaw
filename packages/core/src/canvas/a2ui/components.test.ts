import { describe, expect, it } from "vitest";
import {
  buildThreatDashboard,
  createAlertListComponent,
  createSecurityMetricComponent,
  createThreatCardComponent,
} from "./components.js";

describe("a2ui security components", () => {
  it("creates threat card component", () => {
    const component = createThreatCardComponent("threat-1", {
      severity: "high",
      title: "Suspicious Login",
      description: "Multiple failed logins",
      indicators: ["ip:1.2.3.4"],
      timestamp: Date.now(),
      actions: [{ id: "a1", label: "Investigate", actionName: "investigate" }],
    });
    expect(component.component.ThreatCard.severity).toBe("high");
  });

  it("creates metric and alert list components", () => {
    const metric = createSecurityMetricComponent("metric-1", {
      label: "Risk Score",
      value: 89,
      status: "warning",
      trend: "up",
    });
    const alerts = createAlertListComponent("alerts-1", {
      alerts: [{ id: "1", severity: "critical", title: "Ransomware", timestamp: Date.now() }],
      groupBySeverity: true,
      maxItems: 10,
    });

    expect(metric.component.SecurityMetric.value).toBe(89);
    expect(alerts.component.AlertList.alerts).toHaveLength(1);
  });

  it("builds threat dashboard bundle", () => {
    const dashboard = buildThreatDashboard([
      {
        id: "t-1",
        severity: "medium",
        title: "Phishing Attempt",
        description: "Suspicious link clicked",
        indicators: ["domain:evil.example"],
        timestamp: Date.now(),
      },
    ]);

    expect(dashboard.length).toBe(2);
  });
});
