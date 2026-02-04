import { Page, Locator, expect } from '@playwright/test';
import { waitForLoadingComplete, waitForToast } from '../utils/helpers';

export class QPQueuePage {
  readonly page: Page;
  readonly batchesTable: Locator;
  readonly batchRows: Locator;
  readonly releaseButton: Locator;
  readonly rejectButton: Locator;
  readonly eSignModal: Locator;
  readonly passwordInput: Locator;
  readonly signatureMeaningSelect: Locator;
  readonly commentInput: Locator;
  readonly confirmReleaseButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.batchesTable = page.locator('[data-testid="qp-queue-table"], table');
    this.batchRows = page.locator('[data-testid="qp-batch-row"], tbody tr');
    this.releaseButton = page.locator('[data-testid="release-batch-btn"], button:has-text("Release")');
    this.rejectButton = page.locator('[data-testid="reject-batch-btn"], button:has-text("Reject")');
    this.eSignModal = page.locator('[data-testid="esign-modal"], [role="dialog"]');
    this.passwordInput = page.locator('[data-testid="esign-password"], input[type="password"]');
    this.signatureMeaningSelect = page.locator('[data-testid="signature-meaning"], select[name="meaning"]');
    this.commentInput = page.locator('[data-testid="esign-comment"], textarea[name="comment"]');
    this.confirmReleaseButton = page.locator('[data-testid="confirm-release-btn"], button:has-text("Confirm"), button:has-text("Sign")');
  }

  async goto(): Promise<void> {
    await this.page.goto('/release');
    await waitForLoadingComplete(this.page);
  }

  async findBatchByNumber(batchNumber: string): Promise<Locator> {
    return this.page.locator(`tr:has-text("${batchNumber}")`);
  }

  async openBatch(batchNumber: string): Promise<void> {
    const row = await this.findBatchByNumber(batchNumber);
    await row.click();
  }

  async releaseBatch(password: string, comment?: string): Promise<void> {
    await this.releaseButton.click();
    await expect(this.eSignModal).toBeVisible();
    
    await this.passwordInput.fill(password);
    await this.signatureMeaningSelect.selectOption('Batch Release');
    
    if (comment) {
      await this.commentInput.fill(comment);
    }
    
    await this.confirmReleaseButton.click();
    await waitForToast(this.page);
  }

  async expectBatchReleased(batchNumber: string): Promise<void> {
    const row = await this.findBatchByNumber(batchNumber);
    await expect(row).toContainText('RELEASED');
  }

  async expectSoDBlocked(): Promise<void> {
    const errorMessage = this.page.locator('[data-testid="sod-error"], .error-message');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText(/separation of duties|SoD|cannot release/i);
  }
}
