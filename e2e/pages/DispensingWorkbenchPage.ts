import { Page, Locator, expect } from '@playwright/test';
import { waitForLoadingComplete, waitForToast, downloadFile } from '../utils/helpers';

export class DispensingWorkbenchPage {
  readonly page: Page;
  readonly batchesTable: Locator;
  readonly batchRows: Locator;
  readonly createDoseUnitsButton: Locator;
  readonly quantityInput: Locator;
  readonly confirmCreateButton: Locator;
  readonly doseUnitRows: Locator;
  readonly markDispensedButton: Locator;
  readonly printLabelsButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.batchesTable = page.locator('[data-testid="dispensing-batches-table"], table');
    this.batchRows = page.locator('[data-testid="dispensing-batch-row"], tbody tr');
    this.createDoseUnitsButton = page.locator('[data-testid="create-dose-units-btn"], button:has-text("Create Dose"), button:has-text("Dispense")');
    this.quantityInput = page.locator('[data-testid="dose-quantity"], input[name="quantity"]');
    this.confirmCreateButton = page.locator('[data-testid="confirm-create-btn"], button:has-text("Create"), button:has-text("Confirm")');
    this.doseUnitRows = page.locator('[data-testid="dose-unit-row"], tbody tr');
    this.markDispensedButton = page.locator('[data-testid="mark-dispensed-btn"], button:has-text("Mark Dispensed"), button:has-text("Dispense")');
    this.printLabelsButton = page.locator('[data-testid="print-labels-btn"], button:has-text("Print Labels"), button:has-text("Labels")');
  }

  async goto(): Promise<void> {
    await this.page.goto('/dispensing');
    await waitForLoadingComplete(this.page);
  }

  async findBatchByNumber(batchNumber: string): Promise<Locator> {
    return this.page.locator(`tr:has-text("${batchNumber}")`);
  }

  async openBatch(batchNumber: string): Promise<void> {
    const row = await this.findBatchByNumber(batchNumber);
    await row.click();
  }

  async createDoseUnits(quantity: number): Promise<void> {
    await this.createDoseUnitsButton.click();
    await this.quantityInput.fill(quantity.toString());
    await this.confirmCreateButton.click();
    await waitForToast(this.page);
  }

  async markDoseUnitsDispensed(): Promise<void> {
    await this.markDispensedButton.click();
    await waitForToast(this.page);
  }

  async printLabels(): Promise<{ path: string; size: number }> {
    return await downloadFile(this.page, async () => {
      await this.printLabelsButton.click();
    });
  }

  async getDoseUnitCount(): Promise<number> {
    return await this.doseUnitRows.count();
  }

  async expectDoseUnitsCreated(expectedCount: number): Promise<void> {
    const count = await this.getDoseUnitCount();
    expect(count).toBe(expectedCount);
  }
}
