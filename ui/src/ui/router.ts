/**
 * SecuClaw Router - Simple client-side router
 */

import { Signal, signal, computed } from '@lit-labs/signals';

export type RouteParams = Record<string, string>;

export interface Route {
  path: string;
  component: string;
  title?: string;
  params?: RouteParams;
}

const routes: Route[] = [
  { path: '/login', component: 'sc-login-page', title: '登录' },
  { path: '/', component: 'sc-dashboard', title: '仪表盘' },
  { path: '/threats', component: 'sc-threats-page', title: '威胁情报' },
  { path: '/threats/:id', component: 'sc-threat-detail', title: '威胁详情' },
  { path: '/incidents', component: 'sc-incidents-page', title: '安全事件' },
  { path: '/vulnerabilities', component: 'sc-vulnerabilities-page', title: '漏洞管理' },
  { path: '/compliance', component: 'sc-compliance-page', title: '合规审计' },
  { path: '/reports', component: 'sc-reports-page', title: '分析报告' },
  { path: '/settings', component: 'sc-settings-page', title: '系统设置' },
];

// Current path signal
const currentPath = signal<string>(window.location.hash.slice(1) || '/');

// Current route signal
export const currentRoute = computed(() => {
  const path = currentPath.get();
  return matchRoute(path);
});

// Match a path to a route
function matchRoute(path: string): Route | null {
  // Try exact match first
  let route = routes.find(r => r.path === path);
  if (route) return { ...route };

  // Try pattern match
  for (const r of routes) {
    const params = matchPattern(r.path, path);
    if (params) {
      return { ...r, params };
    }
  }

  // Return dashboard as default
  return routes[0] ? { ...routes[0] } : null;
}

// Match a pattern like /threats/:id against a path like /threats/123
function matchPattern(pattern: string, path: string): RouteParams | null {
  const patternParts = pattern.split('/');
  const pathParts = path.split('/');

  if (patternParts.length !== pathParts.length) {
    return null;
  }

  const params: RouteParams = {};

  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i];
    const pathPart = pathParts[i];

    if (patternPart.startsWith(':')) {
      params[patternPart.slice(1)] = pathPart;
    } else if (patternPart !== pathPart) {
      return null;
    }
  }

  return params;
}

// Navigate to a new path
export function navigate(path: string): void {
  window.location.hash = path;
}

// Handle hash changes
function handleHashChange(): void {
  const path = window.location.hash.slice(1) || '/';
  currentPath.set(path);
  
  // Update document title
  const route = currentRoute.get();
  if (route?.title) {
    document.title = `${route.title} - SecuClaw`;
  }
}

// Initialize router
export function initRouter(): void {
  window.addEventListener('hashchange', handleHashChange);
  handleHashChange();
}

// Get all routes
export function getRoutes(): Route[] {
  return routes;
}

// Export current path for direct access
export { currentPath };
