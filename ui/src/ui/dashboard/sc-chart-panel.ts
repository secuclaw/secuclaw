/**
 * SecuClaw Chart Panel Component with ECharts
 */

import { LitElement, html, css, PropertyValues } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import * as echarts from 'echarts';

export interface ChartData {
  dates: string[];
  threats: number[];
  incidents: number[];
  vulnerabilities: number[];
}

@customElement('sc-chart-panel')
export class ScChartPanel extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .chart-container {
      height: 300px;
      width: 100%;
    }
  `;

  @query('.chart-container')
  private _chartContainer!: HTMLDivElement;

  @property({ type: Object })
  data: ChartData = {
    dates: [],
    threats: [],
    incidents: [],
    vulnerabilities: [],
  };

  private _chart: echarts.ECharts | null = null;

  connectedCallback() {
    super.connectedCallback();
    // Generate mock data if empty
    if (this.data.dates.length === 0) {
      this.data = this._generateMockData();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._chart?.dispose();
  }

  protected firstUpdated(_changedProperties: PropertyValues): void {
    this._initChart();
    window.addEventListener('resize', this._handleResize);
  }

  protected updated(_changedProperties: PropertyValues): void {
    if (_changedProperties.has('data')) {
      this._updateChart();
    }
  }

  private _generateMockData(): ChartData {
    const dates: string[] = [];
    const threats: number[] = [];
    const incidents: number[] = [];
    const vulnerabilities: number[] = [];

    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      dates.push(date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }));
      threats.push(Math.floor(Math.random() * 50) + 20);
      incidents.push(Math.floor(Math.random() * 20) + 5);
      vulnerabilities.push(Math.floor(Math.random() * 30) + 10);
    }

    return { dates, threats, incidents, vulnerabilities };
  }

  private _initChart(): void {
    if (!this._chartContainer) return;

    this._chart = echarts.init(this._chartContainer, 'dark');
    this._updateChart();
  }

  private _updateChart(): void {
    if (!this._chart) return;

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(30, 41, 59, 0.9)',
        borderColor: '#334155',
        textStyle: {
          color: '#f8fafc',
        },
      },
      legend: {
        data: ['威胁情报', '安全事件', '漏洞'],
        textStyle: {
          color: '#94a3b8',
        },
        top: 0,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: this.data.dates,
        axisLine: {
          lineStyle: {
            color: '#334155',
          },
        },
        axisLabel: {
          color: '#64748b',
        },
      },
      yAxis: {
        type: 'value',
        axisLine: {
          lineStyle: {
            color: '#334155',
          },
        },
        axisLabel: {
          color: '#64748b',
        },
        splitLine: {
          lineStyle: {
            color: '#334155',
            type: 'dashed',
          },
        },
      },
      series: [
        {
          name: '威胁情报',
          type: 'line',
          smooth: true,
          data: this.data.threats,
          lineStyle: {
            color: '#f59e0b',
            width: 2,
          },
          itemStyle: {
            color: '#f59e0b',
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(245, 158, 11, 0.3)' },
              { offset: 1, color: 'rgba(245, 158, 11, 0)' },
            ]),
          },
        },
        {
          name: '安全事件',
          type: 'line',
          smooth: true,
          data: this.data.incidents,
          lineStyle: {
            color: '#ef4444',
            width: 2,
          },
          itemStyle: {
            color: '#ef4444',
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(239, 68, 68, 0.3)' },
              { offset: 1, color: 'rgba(239, 68, 68, 0)' },
            ]),
          },
        },
        {
          name: '漏洞',
          type: 'line',
          smooth: true,
          data: this.data.vulnerabilities,
          lineStyle: {
            color: '#06b6d4',
            width: 2,
          },
          itemStyle: {
            color: '#06b6d4',
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(6, 182, 212, 0.3)' },
              { offset: 1, color: 'rgba(6, 182, 212, 0)' },
            ]),
          },
        },
      ],
    };

    this._chart.setOption(option);
  }

  private _handleResize = (): void => {
    this._chart?.resize();
  };

  render() {
    return html`
      <div class="chart-container"></div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sc-chart-panel': ScChartPanel;
  }
}
