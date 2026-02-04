import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/testUsers';
import { waitForLoadingComplete, waitForToast } from '../utils/helpers';

test.describe('Order Validation (Test 4.2)', () => {
  test.use({ storageState: 'e2e/storage/orderdesk.json' });

  test('order desk can validate and approve an order', async ({ page }) => {
    await page.goto('/orders');
    await waitForLoadingComplete(page);

    const pendingOrder = page.locator('tr:has-text("SUBMITTED"), tr:has-text("PENDING")').first();
    const hasPendingOrders = await pendingOrder.isVisible({ timeout: 5000 }).catch(() => false);

    if (!hasPendingOrders) {
      test.skip();
      return;
    }

    await pendingOrder.click();
    await waitForLoadingComplete(page);

    const validateButton = page.locator('[data-testid="validate-order-btn"], button:has-text("Validate"), button:has-text("Approve")');
    await expect(validateButton).toBeVisible({ timeout: 5000 });

    await validateButton.click();

    const confirmModal = page.locator('[role="dialog"], .modal');
    if (await confirmModal.isVisible({ timeout: 2000 }).catch(() => false)) {
      const confirmButton = confirmModal.locator('button:has-text("Confirm"), button:has-text("Yes")');
      await confirmButton.click();
    }

    await waitForToast(page);

    const statusBadge = page.locator('[data-testid="order-status"], .status-badge');
    await expect(statusBadge).toContainText(/VALIDATED|APPROVED/i, { timeout: 5000 });
  });
});
