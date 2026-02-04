import { Page, Locator, expect } from '@playwright/test';
import { waitForToast, fillDateInput } from '../utils/helpers';

export class OrderFormPage {
  readonly page: Page;
  readonly productSelect: Locator;
  readonly quantityInput: Locator;
  readonly deliveryDateInput: Locator;
  readonly deliveryTimeInput: Locator;
  readonly injectionTimeInput: Locator;
  readonly notesInput: Locator;
  readonly attachmentInput: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.productSelect = page.locator('[data-testid="product-select"], select[name="productId"], [data-testid="product-dropdown"]');
    this.quantityInput = page.locator('[data-testid="quantity-input"], input[name="quantity"]');
    this.deliveryDateInput = page.locator('[data-testid="delivery-date"], input[name="deliveryDate"], input[type="date"]').first();
    this.deliveryTimeInput = page.locator('[data-testid="delivery-time"], input[name="deliveryTime"], input[type="time"]').first();
    this.injectionTimeInput = page.locator('[data-testid="injection-time"], input[name="injectionTime"]');
    this.notesInput = page.locator('[data-testid="notes-input"], textarea[name="notes"]');
    this.attachmentInput = page.locator('[data-testid="attachment-input"], input[type="file"]');
    this.submitButton = page.locator('[data-testid="submit-order-btn"], button[type="submit"]:has-text("Submit"), button:has-text("Create Order")');
    this.cancelButton = page.locator('[data-testid="cancel-btn"], button:has-text("Cancel")');
  }

  async fillOrderForm(options: {
    productName?: string;
    quantity: number;
    deliveryDate: Date;
    deliveryTime?: string;
    injectionTime?: string;
    notes?: string;
  }): Promise<void> {
    if (options.productName) {
      await this.productSelect.click();
      await this.page.click(`text=${options.productName}`);
    } else {
      await this.productSelect.click();
      await this.page.locator('option, [role="option"]').first().click().catch(async () => {
        await this.productSelect.selectOption({ index: 1 });
      });
    }

    await this.quantityInput.fill(options.quantity.toString());
    await fillDateInput(this.page, '[data-testid="delivery-date"], input[name="deliveryDate"], input[type="date"]', options.deliveryDate);

    if (options.deliveryTime) {
      await this.deliveryTimeInput.fill(options.deliveryTime);
    }

    if (options.injectionTime) {
      await this.injectionTimeInput.fill(options.injectionTime);
    }

    if (options.notes) {
      await this.notesInput.fill(options.notes);
    }
  }

  async attachFile(filePath: string): Promise<void> {
    await this.attachmentInput.setInputFiles(filePath);
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  async expectSubmitSuccess(): Promise<void> {
    await waitForToast(this.page);
  }
}
