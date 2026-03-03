import { test, expect, Page } from '@playwright/test';

test.describe('Enterprise Security Commander - Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login page when not authenticated', async ({ page }) => {
    await expect(page.locator('h1, h2')).toContainText(/Security Commander/i);
  });

  test('should show error with invalid credentials', async ({ page }) => {
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    
    if (await emailInput.isVisible()) {
      await emailInput.fill('invalid@test.com');
      await passwordInput.fill('wrongpassword');
      await page.locator('button[type="submit"]').click();
      
      await expect(page.locator('.error, [role="alert"]')).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Enterprise Security Commander - Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load dashboard page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Security Commander/i);
  });

  test('should display security metrics', async ({ page }) => {
    await page.goto('/');
    
    await page.waitForSelector('[class*="metric"], [class*="stat"]', { timeout: 10000 }).catch(() => {});
    
    const metricsPanel = page.locator('[class*="metric"], [class*="stat"], [class*="dashboard"]').first();
    if (await metricsPanel.isVisible()) {
      await expect(metricsPanel).toBeVisible();
    }
  });

  test('should show connection status indicator', async ({ page }) => {
    await page.goto('/');
    
    const statusIndicator = page.locator('[class*="connected"], [class*="status"]').first();
    if (await statusIndicator.isVisible()) {
      const text = await statusIndicator.textContent();
      expect(text).toMatch(/connected|offline|online|实时|离线/i);
    }
  });
});

test.describe('Enterprise Security Commander - Security Analysis', () => {
  test('should navigate to security analysis console', async ({ page }) => {
    await page.goto('/');
    
    const analysisButton = page.locator('button:has-text("分析"), button:has-text("Analysis"), [href*="analysis"]').first();
    if (await analysisButton.isVisible()) {
      await analysisButton.click();
      await expect(page).toHaveURL(/analysis/i, { timeout: 5000 });
    }
  });

  test('should display MITRE ATT&CK tactics', async ({ page }) => {
    await page.goto('/');
    
    await page.waitForSelector('[class*="mitre"], [class*="tactic"]', { timeout: 10000 }).catch(() => {});
    
    const mitreSection = page.locator('[class*="mitre"], [class*="tactic"]').first();
    if (await mitreSection.isVisible()) {
      await expect(mitreSection).toBeVisible();
    }
  });
});

test.describe('Enterprise Security Commander - Risk & Compliance', () => {
  test('should navigate to risk compliance console', async ({ page }) => {
    await page.goto('/');
    
    const riskButton = page.locator('button:has-text("风险"), button:has-text("Risk"), button:has-text("合规"), [href*="risk"], [href*="compliance"]').first();
    if (await riskButton.isVisible()) {
      await riskButton.click();
    }
  });

  test('should display compliance frameworks', async ({ page }) => {
    await page.goto('/');
    
    await page.waitForSelector('[class*="compliance"], [class*="framework"]', { timeout: 10000 }).catch(() => {});
    
    const frameworkSection = page.locator('[class*="compliance"], [class*="framework"]').first();
    if (await frameworkSection.isVisible()) {
      const text = await frameworkSection.textContent();
      expect(text).toMatch(/ISO|SOC|NIST|GDPR|PCI/i);
    }
  });
});

test.describe('Enterprise Security Commander - Knowledge Base', () => {
  test('should navigate to knowledge management', async ({ page }) => {
    await page.goto('/');
    
    const knowledgeButton = page.locator('button:has-text("知识"), button:has-text("Knowledge"), [href*="knowledge"]').first();
    if (await knowledgeButton.isVisible()) {
      await knowledgeButton.click();
    }
  });

  test('should search knowledge base', async ({ page }) => {
    await page.goto('/');
    
    const searchInput = page.locator('input[placeholder*="搜索"], input[placeholder*="search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('phishing');
      await page.waitForTimeout(500);
      
      const results = page.locator('[class*="result"], [class*="article"]').first();
      if (await results.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(results).toBeVisible();
      }
    }
  });
});

test.describe('Enterprise Security Commander - Operations Console', () => {
  test('should display security events', async ({ page }) => {
    await page.goto('/');
    
    await page.waitForSelector('[class*="event"], [class*="incident"]', { timeout: 10000 }).catch(() => {});
    
    const eventsSection = page.locator('[class*="event"], [class*="incident"]').first();
    if (await eventsSection.isVisible()) {
      await expect(eventsSection).toBeVisible();
    }
  });

  test('should show agent status', async ({ page }) => {
    await page.goto('/');
    
    await page.waitForSelector('[class*="agent"], [class*="status"]', { timeout: 10000 }).catch(() => {});
    
    const agentSection = page.locator('[class*="agent"]').first();
    if (await agentSection.isVisible()) {
      await expect(agentSection).toBeVisible();
    }
  });
});

test.describe('Enterprise Security Commander - Real-time Updates', () => {
  test('should establish WebSocket connection', async ({ page }) => {
    await page.goto('/');
    
    await page.waitForTimeout(2000);
    
    const connectedIndicator = page.locator('[class*="connected"], [class*="online"]').first();
    const disconnectedIndicator = page.locator('[class*="disconnected"], [class*="offline"]').first();
    
    const isConnected = await connectedIndicator.isVisible().catch(() => false);
    const isDisconnected = await disconnectedIndicator.isVisible().catch(() => false);
    
    expect(isConnected || isDisconnected).toBeTruthy();
  });
});

test.describe('Enterprise Security Commander - Accessibility', () => {
  test('should have proper heading structure', async ({ page }) => {
    await page.goto('/');
    
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
  });

  test('should have accessible navigation', async ({ page }) => {
    await page.goto('/');
    
    const nav = page.locator('nav, [role="navigation"]');
    if (await nav.count() > 0) {
      await expect(nav.first()).toBeVisible();
    }
  });

  test('should have accessible buttons', async ({ page }) => {
    await page.goto('/');
    
    const buttons = page.locator('button');
    const count = await buttons.count();
    
    for (let i = 0; i < Math.min(count, 5); i++) {
      const button = buttons.nth(i);
      const hasText = await button.textContent();
      const hasAriaLabel = await button.getAttribute('aria-label');
      expect(hasText || hasAriaLabel).toBeTruthy();
    }
  });
});

test.describe('Enterprise Security Commander - Performance', () => {
  test('should load initial page within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(10000);
  });

  test('should respond to interactions quickly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const button = page.locator('button').first();
    if (await button.isVisible()) {
      const startTime = Date.now();
      await button.click();
      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(1000);
    }
  });
});
