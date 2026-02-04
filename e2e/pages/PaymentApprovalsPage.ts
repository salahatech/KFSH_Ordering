import { Page, Locator, expect } from '@playwright/test';
import { waitForLoadingComplete, waitForToast, downloadFile } from '../utils/helpers';

export class PaymentApprovalsPage {
  readonly page: Page;
  readonly paymentsTable: Locator;
  readonly paymentRows: Locator;
  readonly confirmButton: Locator;
  readonly rejectButton: Locator;
  readonly viewProofButton: Locator;
  readonly downloadReceiptButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.paymentsTable = page.locator('[data-testid="payments-table"], table');
    this.paymentRows = page.locator('[data-testid="payment-row"], tbody tr');
    this.confirmButton = page.locator('[data-testid="confirm-payment-btn"], button:has-text("Confirm"), button:has-text("Approve")');
    this.rejectButton = page.locator('[data-testid="reject-payment-btn"], button:has-text("Reject")');
    this.viewProofButton = page.locator('[data-testid="view-proof-btn"], button:has-text("View Proof")');
    this.downloadReceiptButton = page.locator('[data-testid="download-receipt-btn"], button:has-text("Receipt"), button:has-text("Download Receipt")');
  }

  async goto(): Promise<void> {
    await this.page.goto('/payments');
    await waitForLoadingComplete(this.page);
  }

  async findPaymentByInvoice(invoiceNumber: string): Promise<Locator> {
    return this.page.locator(`tr:has-text("${invoiceNumber}")`);
  }

  async openPayment(invoiceNumber: string): Promise<void> {
    const row = await this.findPaymentByInvoice(invoiceNumber);
    await row.click();
  }

  async confirmPayment(): Promise<void> {
    await this.confirmButton.click();
    await waitForToast(this.page);
  }

  async rejectPayment(): Promise<void> {
    await this.rejectButton.click();
    await waitForToast(this.page);
  }

  async downloadReceipt(): Promise<{ path: string; size: number }> {
    return await downloadFile(this.page, async () => {
      await this.downloadReceiptButton.click();
    });
  }

  async expectPaymentStatus(invoiceNumber: string, status: string): Promise<void> {
    const row = await this.findPaymentByInvoice(invoiceNumber);
    await expect(row).toContainText(status);
  }
}
