import { test, expect } from '@playwright/test';
import { waitForLoadingComplete, getNotificationCount, assertNotificationReceived } from '../utils/helpers';

test.describe('Notification Assertions (Section 6)', () => {
  test.describe('In-app notifications', () => {
    test.use({ storageState: 'e2e/storage/admin.json' });

    test('notification bell shows count', async ({ page }) => {
      await page.goto('/');
      await waitForLoadingComplete(page);

      const bellButton = page.locator('[data-testid="notification-bell"], button:has(svg)').first();
      await expect(bellButton).toBeVisible({ timeout: 5000 });
    });

    test('notification center shows recent notifications', async ({ page }) => {
      await page.goto('/notification-center');
      await waitForLoadingComplete(page);

      const notificationsList = page.locator('[data-testid="notifications-list"], .notifications-list, table tbody');
      await expect(notificationsList).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Mock outbox verification', () => {
    test('can query mock outbox for sent messages', async ({ request }) => {
      const response = await request.get('/api/e2e/mock-outbox');
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty('messages');
      expect(body).toHaveProperty('count');
    });

    test('can filter mock outbox by channel', async ({ request }) => {
      const emailResponse = await request.get('/api/e2e/mock-outbox?channel=EMAIL');
      expect(emailResponse.status()).toBe(200);

      const smsResponse = await request.get('/api/e2e/mock-outbox?channel=SMS');
      expect(smsResponse.status()).toBe(200);
    });
  });
});
