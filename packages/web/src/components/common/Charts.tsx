import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

interface ChartProps {
  option: EChartsOption;
  height?: number | string;
  width?: number | string;
  style?: React.CSSProperties;
  onEvents?: Record<string, (params: unknown) => void>;
}

export function Chart({ option, height = 300, width = '100%', style, onEvents }: ChartProps) {
  return (
    <ReactECharts
      option={option}
      style={{ height, width, ...style }}
      onEvents={onEvents}
      opts={{ renderer: 'canvas' }}
    />
  );
}

interface LineChartProps {
  data: { name: string; value: number }[];
  title?: string;
  color?: string;
  height?: number;
}

export function LineChart({ data, title, color = '#3b82f6', height = 300 }: LineChartProps) {
  const option: EChartsOption = {
    title: title ? { text: title, textStyle: { color: '#fff', fontSize: 14 }, left: 'center' } : undefined,
    tooltip: { trigger: 'axis', backgroundColor: '#1a1a2e', borderColor: '#333', textStyle: { color: '#fff' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: data.map(d => d.name),
      axisLine: { lineStyle: { color: '#333' } },
      axisLabel: { color: '#888' }
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#333' } },
      axisLabel: { color: '#888' },
      splitLine: { lineStyle: { color: '#222' } }
    },
    series: [{
      type: 'line',
      data: data.map(d => d.value),
      smooth: true,
      lineStyle: { color, width: 2 },
      areaStyle: { 
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: color + '40' },
            { offset: 1, color: color + '05' }
          ]
        }
      },
      itemStyle: { color }
    }]
  };

  return <Chart option={option} height={height} />;
}

interface BarChartProps {
  data: { name: string; value: number }[];
  title?: string;
  color?: string | string[];
  horizontal?: boolean;
  height?: number;
}

export function BarChart({ data, title, color = '#3b82f6', horizontal = false, height = 300 }: BarChartProps) {
  const option: EChartsOption = {
    title: title ? { text: title, textStyle: { color: '#fff', fontSize: 14 }, left: 'center' } : undefined,
    tooltip: { trigger: 'axis', backgroundColor: '#1a1a2e', borderColor: '#333', textStyle: { color: '#fff' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: horizontal ? 'value' : 'category',
      data: horizontal ? undefined : data.map(d => d.name),
      axisLine: { lineStyle: { color: '#333' } },
      axisLabel: { color: '#888' }
    },
    yAxis: {
      type: horizontal ? 'category' : 'value',
      data: horizontal ? data.map(d => d.name) : undefined,
      axisLine: { lineStyle: { color: '#333' } },
      axisLabel: { color: '#888' },
      splitLine: { lineStyle: { color: '#222' } }
    },
    series: [{
      type: 'bar',
      data: data.map(d => d.value),
      itemStyle: { 
        color: Array.isArray(color) ? undefined : color,
        borderRadius: [4, 4, 0, 0]
      },
      ...(Array.isArray(color) ? {
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: color[0] },
              { offset: 1, color: color[1] || color[0] }
            ]
          },
          borderRadius: [4, 4, 0, 0]
        }
      } : {})
    }]
  };

  return <Chart option={option} height={height} />;
}

interface PieChartProps {
  data: { name: string; value: number }[];
  title?: string;
  height?: number;
}

export function PieChart({ data, title, height = 300 }: PieChartProps) {
  const option: EChartsOption = {
    title: title ? { text: title, textStyle: { color: '#fff', fontSize: 14 }, left: 'center' } : undefined,
    tooltip: { 
      trigger: 'item', 
      backgroundColor: '#1a1a2e', 
      borderColor: '#333', 
      textStyle: { color: '#fff' },
      formatter: '{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      textStyle: { color: '#888' }
    },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['40%', '50%'],
      data: data.map(d => ({ name: d.name, value: d.value })),
      itemStyle: {
        borderRadius: 6,
        borderColor: '#1a1a2e',
        borderWidth: 2
      },
      label: { color: '#fff' }
    }],
    color: ['#3b82f6', '#22c55e', '#f97316', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#eab308']
  };

  return <Chart option={option} height={height} />;
}

interface GaugeChartProps {
  value: number;
  max?: number;
  title?: string;
  color?: string;
  height?: number;
}

export function GaugeChart({ value, max = 100, title, height = 200 }: GaugeChartProps) {
  const option: EChartsOption = {
    series: [{
      type: 'gauge',
      startAngle: 180,
      endAngle: 0,
      min: 0,
      max,
      splitNumber: 5,
      axisLine: {
        lineStyle: {
          width: 20,
          color: [
            [0.3, '#22c55e'],
            [0.7, '#eab308'],
            [1, '#ef4444']
          ]
        }
      },
      pointer: {
        itemStyle: { color: '#fff' }
      },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      detail: {
        valueAnimation: true,
        formatter: '{value}',
        color: '#fff',
        fontSize: 24,
        offsetCenter: [0, '70%']
      },
      data: [{ value, name: title }],
      title: { show: false }
    }]
  };

  return <Chart option={option} height={height} />;
}

interface RadarChartProps {
  data: { name: string; value: number }[];
  max?: number;
  title?: string;
  height?: number;
}

export function RadarChart({ data, max = 100, title, height = 300 }: RadarChartProps) {
  const option: EChartsOption = {
    title: title ? { text: title, textStyle: { color: '#fff', fontSize: 14 }, left: 'center' } : undefined,
    tooltip: { backgroundColor: '#1a1a2e', borderColor: '#333', textStyle: { color: '#fff' } },
    radar: {
      indicator: data.map(d => ({ name: d.name, max })),
      axisName: { color: '#888' },
      splitLine: { lineStyle: { color: '#333' } },
      splitArea: { areaStyle: { color: ['transparent', 'rgba(59, 130, 246, 0.05)'] } },
      axisLine: { lineStyle: { color: '#333' } }
    },
    series: [{
      type: 'radar',
      data: [{
        value: data.map(d => d.value),
        name: title || 'Data',
        areaStyle: { color: 'rgba(59, 130, 246, 0.3)' },
        lineStyle: { color: '#3b82f6', width: 2 },
        itemStyle: { color: '#3b82f6' }
      }]
    }]
  };

  return <Chart option={option} height={height} />;
}

interface HeatmapChartProps {
  data: [number, number, number][];
  xAxisData: string[];
  yAxisData: string[];
  title?: string;
  height?: number;
}

export function HeatmapChart({ data, xAxisData, yAxisData, title, height = 300 }: HeatmapChartProps) {
  const option: EChartsOption = {
    title: title ? { text: title, textStyle: { color: '#fff', fontSize: 14 }, left: 'center' } : undefined,
    tooltip: { 
      position: 'top',
      backgroundColor: '#1a1a2e', 
      borderColor: '#333', 
      textStyle: { color: '#fff' } 
    },
    grid: { left: '10%', right: '10%', bottom: '15%', containLabel: true },
    xAxis: {
      type: 'category',
      data: xAxisData,
      splitArea: { show: true },
      axisLine: { lineStyle: { color: '#333' } },
      axisLabel: { color: '#888' }
    },
    yAxis: {
      type: 'category',
      data: yAxisData,
      splitArea: { show: true },
      axisLine: { lineStyle: { color: '#333' } },
      axisLabel: { color: '#888' }
    },
    visualMap: {
      min: 0,
      max: 100,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '0%',
      inRange: {
        color: ['#1a1a2e', '#3b82f6', '#ef4444']
      },
      textStyle: { color: '#888' }
    },
    series: [{
      type: 'heatmap',
      data,
      label: { show: false },
      emphasis: {
        itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' }
      }
    }]
  };

  return <Chart option={option} height={height} />;
}

export default Chart;
