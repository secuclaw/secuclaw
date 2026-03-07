/**
 * SecuClaw Layout Components
 */

import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * Main Layout Container
 */
@customElement('sc-layout')
export class ScLayout extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }

    ::slotted(*) {
      flex: 1;
    }
  `;

  render() {
    return html`
      <slot></slot>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sc-layout': ScLayout;
  }
}
