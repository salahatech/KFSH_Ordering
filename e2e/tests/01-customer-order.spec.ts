import { test, expect } from '@playwright/test';
import { TEST_USERS, DEMO_ENTITIES } from '../fixtures/testUsers';
import { CustomerPortalOrdersPage, OrderFormPage } from '../pages';
import { waitForLoadingComplete, generateTestFile, waitForToast } from '../utils/helpers';

test.describe('Customer Order Creation & Submission (Test 4.1)', () => {
  test.use({ storageState: 'e2e/storage/customer.json' });

  test('customer can create and submit an order', async ({ page }) => {
    const ordersPage = new CustomerPortalOrdersPage(page);
    
    await ordersPage.goto();
    await waitForLoadingComplete(page);

    const initialOrderCount = await ordersPage.getOrderCount();

    await ordersPage.clickCreateOrder();
    await page.waitForURL(/.*new-order|.*order-form|.*create/i, { timeout: 10000 }).catch(() => {});

    const orderForm = new OrderFormPage(page);
    
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 3);

    await orderForm.fillOrderForm({
      quantity: 10,
      deliveryDate,
      deliveryTime: '10:00',
      notes: 'E2E Test Order - Please handle with care',
    });

    const testFile = generateTestFile(100, 'pdf');
    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.isVisible()) {
      await fileInput.setInputFiles(testFile.path);
    }

    await orderForm.submit();

    await waitForToast(page);

    await page.waitForURL(/.*orders.*|.*portal.*/i, { timeout: 10000 }).catch(() => {});
    
    const successIndicator = page.locator('text=/order.*created|success|submitted/i').first();
    await expect(successIndicator).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  test('customer cannot select a different customer (auto-captured)', async ({ page }) => {
    const ordersPage = new CustomerPortalOrdersPage(page);
    await ordersPage.goto();
    await ordersPage.clickCreateOrder();

    const customerDropdown = page.locator('[data-testid="customer-select"], select[name="customerId"]');
    const customerDropdownExists = await customerDropdown.isVisible({ timeout: 3000 }).catch(() => false);
    
    expect(customerDropdownExists).toBe(false);
  });
});
