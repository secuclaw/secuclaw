import { LitElement, html, css } from 'lit';
import { customElement, state, property } from 'lit/decorators.js';
import { t, I18nController } from '../../i18n';

// Dashboard View
@customElement('dashboard-view')
export class DashboardView extends LitElement {
  @property({ type: String }) roleId: string = 'security-expert';
  
  private i18n = new I18nController(this);

  static styles = css`
    :host { display: block; padding: 1.5rem; }
    h1 { font-size: 1.5rem; margin: 0; }
  `;

  render() {
    return html`<h1>${t('dashboard.title')}</h1>`;
  }
}

// Chat View
@customElement('chat-view')
export class ChatView extends LitElement {
  @property({ type: String }) roleId: string = 'security-expert';
  
  private i18n = new I18nController(this);

  static styles = css`
    :host { display: flex; flex-direction: column; height: 100%; }
  `;

  render() {
    return html`<div class="chat">${t('chat.title')}</div>`;
  }
}

// Knowledge View
@customElement('knowledge-view')
export class KnowledgeView extends LitElement {
  private i18n = new I18nController(this);

  static styles = css`
    :host { display: block; padding: 1.5rem; }
  `;

  render() {
    return html`<h1>${t('knowledge.title')}</h1>`;
  }
}


// Placeholder views for other components - with basic styling
const placeholderStyles = css`
  :host { display: block; padding: 1.5rem; }
  div { color: #a0a0b0; font-size: 1rem; }
`;

@customElement('threat-intel-view')
export class ThreatIntelView extends LitElement {
  static styles = placeholderStyles;
  render() { return html`<div>${t('nav.threatIntel')}</div>`; }
}

@customElement('security-incidents-view')
export class SecurityIncidentsView extends LitElement {
  static styles = placeholderStyles;
  render() { return html`<div>${t('nav.securityIncidents')}</div>`; }
}

@customElement('vulnerability-management-view')
export class VulnerabilityManagementView extends LitElement {
  static styles = placeholderStyles;
  render() { return html`<div>${t('nav.vulnManagement')}</div>`; }
}

@customElement('analysis-reports-view')
export class AnalysisReportsView extends LitElement {
  static styles = placeholderStyles;
  render() { return html`<div>${t('nav.analysisReports')}</div>`; }
}

@customElement('compliance-audit-view')
export class ComplianceAuditView extends LitElement {
  static styles = placeholderStyles;
  render() { return html`<div>${t('nav.compliance')}</div>`; }
}

@customElement('security-risk-view')
export class SecurityRiskView extends LitElement {
  static styles = placeholderStyles;
  render() { return html`<div>${t('nav.securityRisk')}</div>`; }
}

@customElement('warroom-view')
export class WarRoomView extends LitElement {
  static styles = placeholderStyles;
  render() { return html`<div>${t('nav.warroom')}</div>`; }
}

@customElement('messaging-view')
export class MessagingView extends LitElement {
  static styles = placeholderStyles;
  render() { return html`<div>${t('nav.messaging')}</div>`; }
}
