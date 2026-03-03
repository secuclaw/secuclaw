import type {
  AlertItem,
  AlertListComponent,
  AlertListProps,
  SecurityMetricComponent,
  SecurityMetricProps,
  ThreatCardComponent,
  ThreatCardProps,
} from "./types.js";

export type { ThreatCardComponent, ThreatCardProps } from "./types.js";
export type { SecurityMetricComponent, SecurityMetricProps } from "./types.js";
export type { AlertListComponent, AlertListProps, AlertItem } from "./types.js";

export interface Threat {
  id: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  indicators: string[];
  timestamp: number;
}

export function createThreatCardComponent(id: string, props: ThreatCardProps): ThreatCardComponent {
  return {
    id,
    component: {
      ThreatCard: props,
    },
  };
}

export function createSecurityMetricComponent(id: string, props: SecurityMetricProps): SecurityMetricComponent {
  return {
    id,
    component: {
      SecurityMetric: props,
    },
  };
}

export function createAlertListComponent(id: string, props: AlertListProps): AlertListComponent {
  return {
    id,
    component: {
      AlertList: props,
    },
  };
}

export function buildThreatDashboard(threats: Threat[]): Array<ThreatCardComponent | AlertListComponent> {
  const cards = threats.map((threat) =>
    createThreatCardComponent(`threat-${threat.id}`, {
      severity: threat.severity,
      title: threat.title,
      description: threat.description,
      indicators: threat.indicators,
      timestamp: threat.timestamp,
      actions: [
        { id: `investigate-${threat.id}`, label: "Investigate", actionName: "investigateThreat" },
        { id: `dismiss-${threat.id}`, label: "Dismiss", actionName: "dismissThreat" },
      ],
    }),
  );

  const alerts: AlertItem[] = threats.map((threat) => ({
    id: threat.id,
    severity: threat.severity,
    title: threat.title,
    timestamp: threat.timestamp,
  }));

  const alertList = createAlertListComponent("alerts-overview", {
    alerts,
    groupBySeverity: true,
    maxItems: 20,
  });

  return [...cards, alertList];
}
