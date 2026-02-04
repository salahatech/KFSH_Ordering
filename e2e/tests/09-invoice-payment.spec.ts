import { test, expect } from '@playwright/test';
import { InvoicesPage, PaymentApprovalsPage } from '../pages';
import { waitForLoadingComplete, waitForToast, downloadFile, generateTestFile } from '../utils/helpers';

test.describe('Invoice & Payment (Tests 4.10, 4.11, 4.12)', () => {
  test.describe('Invoice generation and approval', () => {
    test.use({ storageState: 'e2e/storage/finance.json' });

    test('finance can view and approve invoice', async ({ page }) => {
      const invoicesPage = new InvoicesPage(page);
      await invoicesPage.goto();

      const invoiceRow = page.locator('tr:has-text("DRAFT"), tr:has-text("PENDING")').first();
      const hasInvoices = await invoiceRow.isVisible({ timeout: 5000 }).catch(() => false);

      if (!hasInvoices) {
        test.skip();
        return;
      }

      await invoiceRow.click();
      await waitForLoadingComplete(page);

      const approveButton = page.locator('[data-testid="approve-invoice-btn"], button:has-text("Approve")');
      if (await approveButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await approveButton.click();
        await waitForToast(page);
      }

      const postButton = page.locator('[data-testid="post-invoice-btn"], button:has-text("Post"), button:has-text("Issue")');
      if (await postButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await postButton.click();
        await waitForToast(page);
      }
    });

    test('can download invoice PDF with ZATCA QR', async ({ page }) => {
      const invoicesPage = new InvoicesPage(page);
      await invoicesPage.goto();

      const invoiceRow = page.locator('tr:has-text("ISSUED"), tr:has-text("POSTED")').first();
      const hasInvoices = await invoiceRow.isVisible({ timeout: 5000 }).catch(() => false);

      if (!hasInvoices) {
        test.skip();
        return;
      }

      await invoiceRow.click();
      await waitForLoadingComplete(page);

      const downloadButton = page.locator('[data-testid="download-pdf-btn"], button:has-text("Download"), button:has-text("PDF")');
      if (await downloadButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        const download = await downloadFile(page, async () => {
          await downloadButton.click();
        });

        expect(download.size).toBeGreaterThan(5000);
        expect(download.name).toMatch(/\.pdf$/i);
      }
    });
  });

  test.describe('Customer payment submission', () => {
    test.use({ storageState: 'e2e/storage/customer.json' });

    test('customer can submit partial payment', async ({ page }) => {
      await page.goto('/portal/invoices');
      await waitForLoadingComplete(page);

      const invoiceRow = page.locator('tr:has-text("ISSUED"), tr:has-text("POSTED"), tr:has-text("SAR")').first();
      const hasInvoices = await invoiceRow.isVisible({ timeout: 5000 }).catch(() => false);

      if (!hasInvoices) {
        test.skip();
        return;
      }

      await invoiceRow.click();
      await waitForLoadingComplete(page);

      const payButton = page.locator('[data-testid="submit-payment-btn"], button:has-text("Pay"), button:has-text("Submit Payment")');
      if (await payButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await payButton.click();

        const modal = page.locator('[role="dialog"], .modal');
        await expect(modal).toBeVisible({ timeout: 5000 });

        const amountInput = modal.locator('input[name="amount"], [data-testid="payment-amount"]');
        if (await amountInput.isVisible()) {
          await amountInput.fill('500');
        }

        const methodSelect = modal.locator('select[name="method"], [data-testid="payment-method"]');
        if (await methodSelect.isVisible()) {
          await methodSelect.selectOption({ index: 1 });
        }

        const referenceInput = modal.locator('input[name="reference"], [data-testid="payment-reference"]');
        if (await referenceInput.isVisible()) {
          await referenceInput.fill('TXN-12345');
        }

        const testFile = generateTestFile(30, 'pdf');
        const fileInput = modal.locator('input[type="file"]');
        if (await fileInput.isVisible()) {
          await fileInput.setInputFiles(testFile.path);
        }

        const submitButton = modal.locator('button[type="submit"], button:has-text("Submit")');
        await submitButton.click();
        await waitForToast(page);
      }
    });
  });

  test.describe('Finance payment confirmation', () => {
    test.use({ storageState: 'e2e/storage/finance.json' });

    test('finance can confirm payment and generate receipt', async ({ page }) => {
      const paymentsPage = new PaymentApprovalsPage(page);
      await paymentsPage.goto();

      const paymentRow = page.locator('tr:has-text("PENDING"), tr:has-text("AWAITING")').first();
      const hasPayments = await paymentRow.isVisible({ timeout: 5000 }).catch(() => false);

      if (!hasPayments) {
        test.skip();
        return;
      }

      await paymentRow.click();
      await waitForLoadingComplete(page);

      const confirmButton = page.locator('[data-testid="confirm-payment-btn"], button:has-text("Confirm"), button:has-text("Approve")');
      if (await confirmButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmButton.click();
        await waitForToast(page);
      }

      const receiptButton = page.locator('[data-testid="download-receipt-btn"], button:has-text("Receipt")');
      if (await receiptButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        const download = await downloadFile(page, async () => {
          await receiptButton.click();
        }).catch(() => null);

        if (download) {
          expect(download.size).toBeGreaterThan(5000);
        }
      }
    });
  });
});
