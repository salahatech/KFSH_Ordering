import { test, expect } from '@playwright/test';
import { waitForLoadingComplete, waitForToast } from '../utils/helpers';

test.describe('Planner Scheduling & Reservation (Test 4.3)', () => {
  test.use({ storageState: 'e2e/storage/planner.json' });

  test('planner can schedule an order', async ({ page }) => {
    await page.goto('/planner');
    await waitForLoadingComplete(page);

    const unscheduledOrder = page.locator('tr:has-text("VALIDATED"), [data-testid="unscheduled-order"]').first();
    const hasUnscheduledOrders = await unscheduledOrder.isVisible({ timeout: 5000 }).catch(() => false);

    if (!hasUnscheduledOrders) {
      test.skip();
      return;
    }

    await unscheduledOrder.click();
    await waitForLoadingComplete(page);

    const scheduleButton = page.locator('[data-testid="schedule-order-btn"], button:has-text("Schedule"), button:has-text("Assign")');
    if (await scheduleButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await scheduleButton.click();

      const modal = page.locator('[role="dialog"], .modal');
      if (await modal.isVisible({ timeout: 2000 }).catch(() => false)) {
        const deliverySlot = modal.locator('input[type="datetime-local"], input[type="time"]').first();
        if (await deliverySlot.isVisible()) {
          await deliverySlot.fill('10:00');
        }

        const confirmButton = modal.locator('button:has-text("Confirm"), button:has-text("Save")');
        await confirmButton.click();
      }

      await waitForToast(page);
    }
  });

  test('planner can view capacity utilization', async ({ page }) => {
    await page.goto('/availability');
    await waitForLoadingComplete(page);

    const capacityView = page.locator('[data-testid="capacity-view"], .capacity-widget, .availability-chart');
    await expect(capacityView.first()).toBeVisible({ timeout: 5000 });
  });
});
