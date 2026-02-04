import { test as setup, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/testUsers';

const STORAGE_DIR = 'e2e/storage';

setup('seed demo data', async ({ request }) => {
  const baseURL = process.env.E2E_BASE_URL || 'http://localhost:5000';
  
  const response = await request.post(`${baseURL}/api/admin/demo/seed`, {
    data: { mode: process.env.DEMO_MODE || 'LIVE_DEMO' },
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (response.status() !== 200 && response.status() !== 201) {
    console.warn('Demo seed returned:', response.status());
  }
});

setup('authenticate all test users', async ({ request, browser }) => {
  const baseURL = process.env.E2E_BASE_URL || 'http://localhost:5000';
  
  for (const [role, user] of Object.entries(TEST_USERS)) {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
      await page.goto(`${baseURL}/login`);
      await page.fill('[data-testid="email-input"], input[type="email"]', user.email);
      await page.fill('[data-testid="password-input"], input[type="password"]', user.password);
      await page.click('[data-testid="login-button"], button[type="submit"]');
      
      await page.waitForURL('**/*', { timeout: 10000 });
      
      const isLoggedIn = await page.locator('[data-testid="user-menu"], [data-testid="logout-button"]').isVisible({ timeout: 5000 }).catch(() => false);
      
      if (isLoggedIn || !page.url().includes('/login')) {
        await context.storageState({ path: `${STORAGE_DIR}/${role}.json` });
        console.log(`✓ Authenticated ${role}: ${user.email}`);
      } else {
        console.warn(`✗ Failed to authenticate ${role}: ${user.email}`);
      }
    } catch (error) {
      console.warn(`✗ Error authenticating ${role}:`, error);
    } finally {
      await context.close();
    }
  }
});
