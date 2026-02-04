import { Page, Locator, expect } from '@playwright/test';
import { waitForLoadingComplete, waitForToast } from '../utils/helpers';

export class QCWorkbenchPage {
  readonly page: Page;
  readonly batchesTable: Locator;
  readonly batchRows: Locator;
  readonly startTestingButton: Locator;
  readonly testResultsForm: Locator;
  readonly submitResultsButton: Locator;
  readonly markPassedButton: Locator;
  readonly markFailedButton: Locator;
  readonly attachmentInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.batchesTable = page.locator('[data-testid="qc-batches-table"], table');
    this.batchRows = page.locator('[data-testid="qc-batch-row"], tbody tr');
    this.startTestingButton = page.locator('[data-testid="start-testing-btn"], button:has-text("Start Testing")');
    this.testResultsForm = page.locator('[data-testid="test-results-form"]');
    this.submitResultsButton = page.locator('[data-testid="submit-results-btn"], button:has-text("Submit Results")');
    this.markPassedButton = page.locator('[data-testid="mark-passed-btn"], button:has-text("Mark Passed"), button:has-text("QC Passed")');
    this.markFailedButton = page.locator('[data-testid="mark-failed-btn"], button:has-text("Mark Failed"), button:has-text("QC Failed")');
    this.attachmentInput = page.locator('[data-testid="qc-attachment"], input[type="file"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/qc');
    await waitForLoadingComplete(this.page);
  }

  async findBatchByNumber(batchNumber: string): Promise<Locator> {
    return this.page.locator(`tr:has-text("${batchNumber}")`);
  }

  async openBatch(batchNumber: string): Promise<void> {
    const row = await this.findBatchByNumber(batchNumber);
    await row.click();
  }

  async startTesting(): Promise<void> {
    await this.startTestingButton.click();
    await waitForToast(this.page);
  }

  async fillTestResult(testName: string, result: string, passed: boolean): Promise<void> {
    const testRow = this.page.locator(`[data-testid="test-${testName}"], tr:has-text("${testName}")`);
    const resultInput = testRow.locator('input[type="text"], input[type="number"]');
    await resultInput.fill(result);
    
    if (passed) {
      const passCheckbox = testRow.locator('[data-testid="pass-checkbox"], input[type="checkbox"]');
      if (await passCheckbox.isVisible()) {
        await passCheckbox.check();
      }
    }
  }

  async submitResults(): Promise<void> {
    await this.submitResultsButton.click();
    await waitForToast(this.page);
  }

  async markPassed(): Promise<void> {
    await this.markPassedButton.click();
    await waitForToast(this.page);
  }

  async markFailed(): Promise<void> {
    await this.markFailedButton.click();
    await waitForToast(this.page);
  }

  async attachReport(filePath: string): Promise<void> {
    await this.attachmentInput.setInputFiles(filePath);
  }

  async expectBatchStatus(batchNumber: string, status: string): Promise<void> {
    const row = await this.findBatchByNumber(batchNumber);
    await expect(row).toContainText(status);
  }
}
