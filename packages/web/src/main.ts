import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import './components/layout/app-layout';
import './services/gateway';

@customElement('secuclaw-app')
export class SecuClawApp extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
  `;

  render() {
    return html`<app-layout></app-layout>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'secuclaw-app': SecuClawApp;
  }
}
