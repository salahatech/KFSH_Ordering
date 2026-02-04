import { test, expect } from '@playwright/test';
import { ShipmentsPage, DriverPortalPage } from '../pages';
import { waitForLoadingComplete, waitForToast, generateTestFile } from '../utils/helpers';

test.describe('Shipment & Driver Delivery (Tests 4.8 & 4.9)', () => {
  test.describe('Logistics creates shipment', () => {
    test.use({ storageState: 'e2e/storage/logistics.json' });

    test('can create shipment and assign driver', async ({ page }) => {
      const shipmentsPage = new ShipmentsPage(page);
      await shipmentsPage.goto();

      const createButton = page.locator('[data-testid="create-shipment-btn"], button:has-text("Create Shipment")');
      if (await createButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await createButton.click();

        const orderSelect = page.locator('select[name="orderId"], [data-testid="order-select"]');
        if (await orderSelect.isVisible()) {
          await orderSelect.selectOption({ index: 1 });
        }

        const submitButton = page.locator('button[type="submit"], button:has-text("Create")');
        await submitButton.click();
        await waitForToast(page);
      }

      const shipmentRow = page.locator('tr:has-text("PACKED"), tr:has-text("PENDING")').first();
      if (await shipmentRow.isVisible({ timeout: 5000 }).catch(() => false)) {
        await shipmentRow.click();
        await waitForLoadingComplete(page);

        const assignButton = page.locator('[data-testid="assign-driver-btn"], button:has-text("Assign Driver")');
        if (await assignButton.isVisible()) {
          await assignButton.click();

          const driverSelect = page.locator('select[name="driverId"], [data-testid="driver-select"]');
          if (await driverSelect.isVisible()) {
            await driverSelect.selectOption({ index: 1 });
          }

          const confirmButton = page.locator('button:has-text("Assign"), button:has-text("Confirm")');
          await confirmButton.click();
          await waitForToast(page);
        }
      }
    });
  });

  test.describe('Driver completes delivery', () => {
    test.use({ storageState: 'e2e/storage/driver.json' });

    test('driver can accept, pickup, and deliver shipment with POD', async ({ page }) => {
      const driverPage = new DriverPortalPage(page);
      await driverPage.goto();

      const shipmentCard = page.locator('[data-testid="shipment-card"], tr:has-text("ASSIGNED")').first();
      const hasShipments = await shipmentCard.isVisible({ timeout: 5000 }).catch(() => false);

      if (!hasShipments) {
        test.skip();
        return;
      }

      await shipmentCard.click();
      await waitForLoadingComplete(page);

      const acceptButton = page.locator('[data-testid="accept-btn"], button:has-text("Accept")');
      if (await acceptButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await acceptButton.click();
        await waitForToast(page);
      }

      const pickupButton = page.locator('[data-testid="pickup-btn"], button:has-text("Pickup"), button:has-text("Picked Up")');
      if (await pickupButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await pickupButton.click();
        await waitForToast(page);
      }

      const arrivedButton = page.locator('[data-testid="arrived-btn"], button:has-text("Arrived")');
      if (await arrivedButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await arrivedButton.click();
        await waitForToast(page);
      }

      const deliverButton = page.locator('[data-testid="deliver-btn"], button:has-text("Deliver"), button:has-text("Complete")');
      if (await deliverButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await deliverButton.click();

        const receiverInput = page.locator('input[name="receiverName"], [data-testid="receiver-name"]');
        if (await receiverInput.isVisible()) {
          await receiverInput.fill('Dr. Ahmed');
        }

        const signatureCanvas = page.locator('canvas, [data-testid="signature-canvas"]');
        if (await signatureCanvas.isVisible()) {
          const box = await signatureCanvas.boundingBox();
          if (box) {
            await page.mouse.move(box.x + 50, box.y + 30);
            await page.mouse.down();
            await page.mouse.move(box.x + 150, box.y + 50);
            await page.mouse.up();
          }
        }

        const testFile = generateTestFile(20, 'jpg');
        const fileInput = page.locator('input[type="file"]').first();
        if (await fileInput.isVisible()) {
          await fileInput.setInputFiles(testFile.path);
        }

        const submitButton = page.locator('button[type="submit"], button:has-text("Complete"), button:has-text("Submit")');
        await submitButton.click();
        await waitForToast(page);
      }
    });
  });
});
