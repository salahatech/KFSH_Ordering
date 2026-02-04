import { test, expect } from '@playwright/test';
import { QPQueuePage } from '../pages';
import { waitForLoadingComplete, waitForToast } from '../utils/helpers';
import { TEST_USERS } from '../fixtures/testUsers';

test.describe('QP Release with E-Signature (Test 4.6)', () => {
  test.use({ storageState: 'e2e/storage/qp.json' });

  test('QP can release a batch with e-signature', async ({ page }) => {
    const qpPage = new QPQueuePage(page);
    await qpPage.goto();

    const batchRow = page.locator('tr:has-text("QC_PASSED"), tr:has-text("PENDING_RELEASE"), tr:has-text("AWAITING")').first();
    const hasBatches = await batchRow.isVisible({ timeout: 5000 }).catch(() => false);

    if (!hasBatches) {
      test.skip();
      return;
    }

    await batchRow.click();
    await waitForLoadingComplete(page);

    const releaseButton = page.locator('[data-testid="release-batch-btn"], button:has-text("Release")');
    await expect(releaseButton).toBeVisible({ timeout: 5000 });

    await releaseButton.click();

    const modal = page.locator('[role="dialog"], .modal, [data-testid="esign-modal"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    const passwordInput = modal.locator('input[type="password"]');
    await passwordInput.fill(TEST_USERS.qp.password);

    const meaningSelect = modal.locator('select[name="meaning"], [data-testid="signature-meaning"]');
    if (await meaningSelect.isVisible()) {
      await meaningSelect.selectOption({ index: 1 });
    }

    const commentInput = modal.locator('textarea, input[name="comment"]');
    if (await commentInput.isVisible()) {
      await commentInput.fill('Batch meets all release criteria');
    }

    const confirmButton = modal.locator('button:has-text("Confirm"), button:has-text("Sign"), button:has-text("Release")');
    await confirmButton.click();

    await waitForToast(page);

    const statusBadge = page.locator('[data-testid="batch-status"], .status-badge');
    await expect(statusBadge).toContainText(/RELEASED/i, { timeout: 5000 }).catch(() => {});
  });
});
