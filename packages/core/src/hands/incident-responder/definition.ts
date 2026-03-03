/**
 * IncidentResponder Hand - Definition
 */
import type { HandDefinition } from "../../hands/types.js";
export const IncidentResponderDefinition: HandDefinition = {
  id: "incident-responder", name: "Incident Responder", description: "Automated incident response", category: "security", version: "1.0.0", requirements: [], settings: [],
  metrics: [{ label: "Incidents Handled", memoryKey: "incidents_handled", format: "number" }],
  tools: ["alert-send", "block-ip", "quarantine"], systemPrompt: "You are an Incident Responder handling security incidents.",
};
export default IncidentResponderDefinition;
