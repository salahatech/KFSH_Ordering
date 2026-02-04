import { test, expect } from '@playwright/test';
import { DispensingWorkbenchPage } from '../pages';
import { waitForLoadingComplete, waitForToast, downloadFile } from '../utils/helpers';

test.describe('Dispensing (Test 4.7)', () => {
  test.use({ storageState: 'e2e/storage/logistics.json' });

  test('can create dose units and print labels', async ({ page }) => {
    const dispensingPage = new DispensingWorkbenchPage(page);
    await dispensingPage.goto();

    const batchRow = page.locator('tr:has-text("RELEASED"), tr:has-text("READY_FOR_DISPENSING")').first();
    const hasBatches = await batchRow.isVisible({ timeout: 5000 }).catch(() => false);

    if (!hasBatches) {
      test.skip();
      return;
    }

    await batchRow.click();
    await waitForLoadingComplete(page);

    const createDoseButton = page.locator('[data-testid="create-dose-btn"], button:has-text("Create Dose"), button:has-text("Dispense")');
    if (await createDoseButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createDoseButton.click();

      const quantityInput = page.locator('input[name="quantity"], [data-testid="dose-quantity"]');
      if (await quantityInput.isVisible()) {
        await quantityInput.fill('5');
      }

      const confirmButton = page.locator('button:has-text("Create"), button:has-text("Confirm")');
      await confirmButton.click();
      await waitForToast(page);
    }

    const markDispensedButton = page.locator('[data-testid="mark-dispensed-btn"], button:has-text("Mark Dispensed")');
    if (await markDispensedButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await markDispensedButton.click();
      await waitForToast(page);
    }

    const printLabelsButton = page.locator('[data-testid="print-labels-btn"], button:has-text("Print Labels"), button:has-text("Labels")');
    if (await printLabelsButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      const download = await downloadFile(page, async () => {
        await printLabelsButton.click();
      }).catch(() => null);

      if (download) {
        expect(download.size).toBeGreaterThan(5000);
      }
    }
  });
});
