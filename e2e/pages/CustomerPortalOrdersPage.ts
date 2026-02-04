import { Page, Locator, expect } from '@playwright/test';
import { waitForLoadingComplete } from '../utils/helpers';

export class CustomerPortalOrdersPage {
  readonly page: Page;
  readonly createOrderButton: Locator;
  readonly ordersTable: Locator;
  readonly orderRows: Locator;
  readonly searchInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createOrderButton = page.locator('[data-testid="create-order-btn"], button:has-text("New Order"), button:has-text("Create Order")');
    this.ordersTable = page.locator('[data-testid="orders-table"], table');
    this.orderRows = page.locator('[data-testid="order-row"], tbody tr');
    this.searchInput = page.locator('[data-testid="search-input"], input[placeholder*="Search"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/portal/orders');
    await waitForLoadingComplete(this.page);
  }

  async clickCreateOrder(): Promise<void> {
    await this.createOrderButton.click();
  }

  async getOrderCount(): Promise<number> {
    return await this.orderRows.count();
  }

  async findOrderByNumber(orderNumber: string): Promise<Locator> {
    return this.page.locator(`tr:has-text("${orderNumber}")`);
  }

  async clickOrderByNumber(orderNumber: string): Promise<void> {
    const row = await this.findOrderByNumber(orderNumber);
    await row.click();
  }

  async expectOrderExists(orderNumber: string): Promise<void> {
    const row = await this.findOrderByNumber(orderNumber);
    await expect(row).toBeVisible();
  }

  async expectOrderStatus(orderNumber: string, status: string): Promise<void> {
    const row = await this.findOrderByNumber(orderNumber);
    await expect(row).toContainText(status);
  }
}
