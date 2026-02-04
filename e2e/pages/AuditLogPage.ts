import { Page, Locator, expect } from '@playwright/test';
import { waitForLoadingComplete } from '../utils/helpers';

export class AuditLogPage {
  readonly page: Page;
  readonly auditTable: Locator;
  readonly auditRows: Locator;
  readonly entityFilter: Locator;
  readonly actionFilter: Locator;
  readonly actorFilter: Locator;
  readonly dateFromFilter: Locator;
  readonly dateToFilter: Locator;
  readonly applyFiltersButton: Locator;
  readonly clearFiltersButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.auditTable = page.locator('[data-testid="audit-table"], table');
    this.auditRows = page.locator('[data-testid="audit-row"], tbody tr');
    this.entityFilter = page.locator('[data-testid="entity-filter"], input[name="entity"]');
    this.actionFilter = page.locator('[data-testid="action-filter"], select[name="action"]');
    this.actorFilter = page.locator('[data-testid="actor-filter"], input[name="actor"]');
    this.dateFromFilter = page.locator('[data-testid="date-from-filter"], input[name="dateFrom"]');
    this.dateToFilter = page.locator('[data-testid="date-to-filter"], input[name="dateTo"]');
    this.applyFiltersButton = page.locator('[data-testid="apply-filters-btn"], button:has-text("Apply"), button:has-text("Filter")');
    this.clearFiltersButton = page.locator('[data-testid="clear-filters-btn"], button:has-text("Clear")');
  }

  async goto(): Promise<void> {
    await this.page.goto('/audit');
    await waitForLoadingComplete(this.page);
  }

  async filterByEntity(entityId: string): Promise<void> {
    await this.entityFilter.fill(entityId);
    await this.applyFiltersButton.click();
    await waitForLoadingComplete(this.page);
  }

  async filterByAction(action: string): Promise<void> {
    await this.actionFilter.selectOption(action);
    await this.applyFiltersButton.click();
    await waitForLoadingComplete(this.page);
  }

  async getAuditEntryCount(): Promise<number> {
    return await this.auditRows.count();
  }

  async expectAuditEntryExists(entityId: string): Promise<void> {
    const row = this.page.locator(`tr:has-text("${entityId}")`);
    await expect(row.first()).toBeVisible();
  }

  async expectAuditContains(text: string): Promise<void> {
    await expect(this.auditTable).toContainText(text);
  }

  async expectESignatureRecorded(entityId: string): Promise<void> {
    await this.filterByEntity(entityId);
    const signatureRow = this.page.locator('tr:has-text("e-signature"), tr:has-text("E-Sign"), tr:has-text("signed")');
    await expect(signatureRow.first()).toBeVisible();
  }

  async clearFilters(): Promise<void> {
    await this.clearFiltersButton.click();
    await waitForLoadingComplete(this.page);
  }
}
