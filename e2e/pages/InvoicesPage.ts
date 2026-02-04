import { Page, Locator, expect } from '@playwright/test';
import { waitForLoadingComplete, waitForToast, downloadFile } from '../utils/helpers';

export class InvoicesPage {
  readonly page: Page;
  readonly invoicesTable: Locator;
  readonly invoiceRows: Locator;
  readonly approveButton: Locator;
  readonly postButton: Locator;
  readonly downloadPdfButton: Locator;
  readonly totalColumn: Locator;
  readonly paidColumn: Locator;
  readonly remainingColumn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.invoicesTable = page.locator('[data-testid="invoices-table"], table');
    this.invoiceRows = page.locator('[data-testid="invoice-row"], tbody tr');
    this.approveButton = page.locator('[data-testid="approve-invoice-btn"], button:has-text("Approve")');
    this.postButton = page.locator('[data-testid="post-invoice-btn"], button:has-text("Post"), button:has-text("Issue")');
    this.downloadPdfButton = page.locator('[data-testid="download-pdf-btn"], button:has-text("Download PDF"), button:has-text("Print")');
    this.totalColumn = page.locator('[data-testid="total-column"]');
    this.paidColumn = page.locator('[data-testid="paid-column"]');
    this.remainingColumn = page.locator('[data-testid="remaining-column"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/invoices');
    await waitForLoadingComplete(this.page);
  }

  async findInvoiceByNumber(invoiceNumber: string): Promise<Locator> {
    return this.page.locator(`tr:has-text("${invoiceNumber}")`);
  }

  async openInvoice(invoiceNumber: string): Promise<void> {
    const row = await this.findInvoiceByNumber(invoiceNumber);
    await row.click();
  }

  async approveInvoice(): Promise<void> {
    await this.approveButton.click();
    await waitForToast(this.page);
  }

  async postInvoice(): Promise<void> {
    await this.postButton.click();
    await waitForToast(this.page);
  }

  async downloadPdf(): Promise<{ path: string; size: number }> {
    return await downloadFile(this.page, async () => {
      await this.downloadPdfButton.click();
    });
  }

  async expectInvoiceStatus(invoiceNumber: string, status: string): Promise<void> {
    const row = await this.findInvoiceByNumber(invoiceNumber);
    await expect(row).toContainText(status);
  }

  async expectInvoiceVisible(invoiceNumber: string): Promise<void> {
    const row = await this.findInvoiceByNumber(invoiceNumber);
    await expect(row).toBeVisible();
  }

  async expectInvoiceNotVisible(invoiceNumber: string): Promise<void> {
    const row = await this.findInvoiceByNumber(invoiceNumber);
    await expect(row).not.toBeVisible();
  }
}
