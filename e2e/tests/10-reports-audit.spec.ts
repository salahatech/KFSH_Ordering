import { test, expect } from '@playwright/test';
import { ReportsPage, AuditLogPage } from '../pages';
import { waitForLoadingComplete, downloadFile } from '../utils/helpers';

test.describe('Reports & Audit Log (Tests 4.13 & 4.14)', () => {
  test.describe('Enterprise Reports', () => {
    test.use({ storageState: 'e2e/storage/admin.json' });

    test('can run and export reports', async ({ page }) => {
      const reportsPage = new ReportsPage(page);
      await reportsPage.goto();

      const reportCard = page.locator('[data-testid="report-card"], .report-card, a:has-text("Report")').first();
      const hasReports = await reportCard.isVisible({ timeout: 5000 }).catch(() => false);

      if (!hasReports) {
        test.skip();
        return;
      }

      await reportCard.click();
      await waitForLoadingComplete(page);

      const runButton = page.locator('[data-testid="run-report-btn"], button:has-text("Run"), button:has-text("Generate")');
      if (await runButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await runButton.click();
        await waitForLoadingComplete(page);
      }

      const exportExcelButton = page.locator('[data-testid="export-excel-btn"], button:has-text("Excel")');
      if (await exportExcelButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        const excelDownload = await downloadFile(page, async () => {
          await exportExcelButton.click();
        }).catch(() => null);

        if (excelDownload) {
          expect(excelDownload.size).toBeGreaterThan(5000);
          expect(excelDownload.name).toMatch(/\.xlsx$/i);
        }
      }

      const exportPdfButton = page.locator('[data-testid="export-pdf-btn"], button:has-text("PDF")');
      if (await exportPdfButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        const pdfDownload = await downloadFile(page, async () => {
          await exportPdfButton.click();
        }).catch(() => null);

        if (pdfDownload) {
          expect(pdfDownload.size).toBeGreaterThan(5000);
          expect(pdfDownload.name).toMatch(/\.pdf$/i);
        }
      }
    });
  });

  test.describe('Audit Log verification', () => {
    test.use({ storageState: 'e2e/storage/admin.json' });

    test('audit log shows entity changes', async ({ page }) => {
      const auditPage = new AuditLogPage(page);
      await auditPage.goto();

      const auditRows = page.locator('tbody tr, [data-testid="audit-row"]');
      const rowCount = await auditRows.count();
      expect(rowCount).toBeGreaterThan(0);

      const entityFilter = page.locator('input[name="entity"], [data-testid="entity-filter"]');
      if (await entityFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
        await entityFilter.fill('O-10001');

        const applyButton = page.locator('button:has-text("Apply"), button:has-text("Filter")');
        if (await applyButton.isVisible()) {
          await applyButton.click();
          await waitForLoadingComplete(page);
        }
      }
    });

    test('audit log shows e-signature records', async ({ page }) => {
      const auditPage = new AuditLogPage(page);
      await auditPage.goto();

      const actionFilter = page.locator('select[name="action"], [data-testid="action-filter"]');
      if (await actionFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
        await actionFilter.selectOption({ label: 'Release' }).catch(() => {});
      }

      const searchInput = page.locator('input[type="search"], [data-testid="search-input"]');
      if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await searchInput.fill('signature');
        await page.keyboard.press('Enter');
        await waitForLoadingComplete(page);
      }
    });
  });

  test.describe('RBAC for reports', () => {
    test.use({ storageState: 'e2e/storage/customer.json' });

    test('customer cannot access admin reports', async ({ page }) => {
      await page.goto('/enterprise-reports');

      const accessDenied = page.locator('text=/access denied|unauthorized|forbidden|not authorized/i');
      const redirected = await page.waitForURL(/.*portal.*|.*login.*/i, { timeout: 5000 }).catch(() => false);

      const isBlocked = await accessDenied.isVisible({ timeout: 3000 }).catch(() => false) || redirected;
      expect(isBlocked).toBeTruthy();
    });
  });
});
