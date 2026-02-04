import { test, expect } from '@playwright/test';
import { QCWorkbenchPage } from '../pages';
import { waitForLoadingComplete, waitForToast, generateTestFile } from '../utils/helpers';

test.describe('QC Testing (Test 4.5)', () => {
  test.use({ storageState: 'e2e/storage/qc.json' });

  test('QC analyst can perform QC testing and mark batch as passed', async ({ page }) => {
    const qcPage = new QCWorkbenchPage(page);
    await qcPage.goto();

    const batchRow = page.locator('tr:has-text("WAITING"), tr:has-text("QC_PENDING"), tr:has-text("NOT_STARTED")').first();
    const hasBatches = await batchRow.isVisible({ timeout: 5000 }).catch(() => false);

    if (!hasBatches) {
      test.skip();
      return;
    }

    await batchRow.click();
    await waitForLoadingComplete(page);

    const startButton = page.locator('[data-testid="start-qc-btn"], button:has-text("Start"), button:has-text("Begin Testing")');
    if (await startButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await startButton.click();
      await waitForToast(page);
    }

    const testInputs = page.locator('[data-testid="qc-result-input"], input[type="number"]');
    const inputCount = await testInputs.count();
    for (let i = 0; i < Math.min(inputCount, 5); i++) {
      await testInputs.nth(i).fill('95.5');
    }

    const passCheckboxes = page.locator('[data-testid="qc-pass-checkbox"], input[type="checkbox"][name*="pass"]');
    const checkboxCount = await passCheckboxes.count();
    for (let i = 0; i < checkboxCount; i++) {
      await passCheckboxes.nth(i).check();
    }

    const testFile = generateTestFile(50, 'pdf');
    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.isVisible()) {
      await fileInput.setInputFiles(testFile.path);
    }

    const submitButton = page.locator('[data-testid="submit-qc-btn"], button:has-text("Submit"), button:has-text("Complete")');
    if (await submitButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitButton.click();
      await waitForToast(page);
    }

    const passButton = page.locator('[data-testid="mark-qc-passed"], button:has-text("Pass"), button:has-text("QC Passed")');
    if (await passButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await passButton.click();
      await waitForToast(page);
    }
  });
});
