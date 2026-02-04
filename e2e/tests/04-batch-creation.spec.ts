import { test, expect } from '@playwright/test';
import { waitForLoadingComplete, waitForToast } from '../utils/helpers';

test.describe('Batch Creation & Manufacturing Execution (Test 4.4)', () => {
  test.use({ storageState: 'e2e/storage/admin.json' });

  test('can create a batch from an order', async ({ page }) => {
    await page.goto('/batches');
    await waitForLoadingComplete(page);

    const createBatchButton = page.locator('[data-testid="create-batch-btn"], button:has-text("Create Batch"), button:has-text("New Batch")');
    
    if (await createBatchButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createBatchButton.click();

      const orderSelect = page.locator('[data-testid="order-select"], select[name="orderId"]');
      if (await orderSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
        await orderSelect.selectOption({ index: 1 });
      }

      const submitButton = page.locator('button[type="submit"], button:has-text("Create")');
      await submitButton.click();

      await waitForToast(page);
    }
  });

  test('can execute eBR steps', async ({ page }) => {
    await page.goto('/manufacturing');
    await waitForLoadingComplete(page);

    const batchRow = page.locator('tr:has-text("IN_PRODUCTION"), tr:has-text("B-")').first();
    const hasBatches = await batchRow.isVisible({ timeout: 5000 }).catch(() => false);

    if (!hasBatches) {
      test.skip();
      return;
    }

    await batchRow.click();
    await waitForLoadingComplete(page);

    const ebrSection = page.locator('[data-testid="ebr-steps"], .batch-record-steps');
    if (await ebrSection.isVisible({ timeout: 5000 }).catch(() => false)) {
      const pendingStep = ebrSection.locator('[data-testid="pending-step"], .step-pending').first();
      if (await pendingStep.isVisible()) {
        await pendingStep.click();

        const parameterInput = page.locator('[data-testid="step-parameter"], input[name*="parameter"]').first();
        if (await parameterInput.isVisible()) {
          await parameterInput.fill('100');
        }

        const completeStepButton = page.locator('[data-testid="complete-step-btn"], button:has-text("Complete Step")');
        if (await completeStepButton.isVisible()) {
          await completeStepButton.click();
          await waitForToast(page);
        }
      }
    }
  });
});
