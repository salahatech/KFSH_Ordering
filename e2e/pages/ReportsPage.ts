import { Page, Locator, expect } from '@playwright/test';
import { waitForLoadingComplete, downloadFile } from '../utils/helpers';

export class ReportsPage {
  readonly page: Page;
  readonly reportsList: Locator;
  readonly reportCards: Locator;
  readonly runReportButton: Locator;
  readonly exportExcelButton: Locator;
  readonly exportPdfButton: Locator;
  readonly dateFromInput: Locator;
  readonly dateToInput: Locator;
  readonly applyFiltersButton: Locator;
  readonly resultsTable: Locator;

  constructor(page: Page) {
    this.page = page;
    this.reportsList = page.locator('[data-testid="reports-list"]');
    this.reportCards = page.locator('[data-testid="report-card"]');
    this.runReportButton = page.locator('[data-testid="run-report-btn"], button:has-text("Run"), button:has-text("Generate")');
    this.exportExcelButton = page.locator('[data-testid="export-excel-btn"], button:has-text("Excel"), button:has-text("Export Excel")');
    this.exportPdfButton = page.locator('[data-testid="export-pdf-btn"], button:has-text("PDF"), button:has-text("Export PDF")');
    this.dateFromInput = page.locator('[data-testid="date-from"], input[name="dateFrom"]');
    this.dateToInput = page.locator('[data-testid="date-to"], input[name="dateTo"]');
    this.applyFiltersButton = page.locator('[data-testid="apply-filters-btn"], button:has-text("Apply")');
    this.resultsTable = page.locator('[data-testid="report-results"], table');
  }

  async goto(): Promise<void> {
    await this.page.goto('/enterprise-reports');
    await waitForLoadingComplete(this.page);
  }

  async selectReport(reportName: string): Promise<void> {
    await this.page.click(`text=${reportName}`);
  }

  async runReport(): Promise<void> {
    await this.runReportButton.click();
    await waitForLoadingComplete(this.page);
  }

  async setDateRange(from: Date, to: Date): Promise<void> {
    await this.dateFromInput.fill(from.toISOString().split('T')[0]);
    await this.dateToInput.fill(to.toISOString().split('T')[0]);
  }

  async applyFilters(): Promise<void> {
    await this.applyFiltersButton.click();
    await waitForLoadingComplete(this.page);
  }

  async exportToExcel(): Promise<{ path: string; size: number }> {
    return await downloadFile(this.page, async () => {
      await this.exportExcelButton.click();
    });
  }

  async exportToPdf(): Promise<{ path: string; size: number }> {
    return await downloadFile(this.page, async () => {
      await this.exportPdfButton.click();
    });
  }

  async expectResultsVisible(): Promise<void> {
    await expect(this.resultsTable).toBeVisible();
  }
}
