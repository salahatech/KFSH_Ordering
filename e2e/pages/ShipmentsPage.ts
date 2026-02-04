import { Page, Locator, expect } from '@playwright/test';
import { waitForLoadingComplete, waitForToast } from '../utils/helpers';

export class ShipmentsPage {
  readonly page: Page;
  readonly shipmentsTable: Locator;
  readonly shipmentRows: Locator;
  readonly createShipmentButton: Locator;
  readonly assignDriverButton: Locator;
  readonly driverSelect: Locator;
  readonly confirmAssignButton: Locator;
  readonly markPackedButton: Locator;
  readonly schedulePickupInput: Locator;
  readonly scheduleDeliveryInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.shipmentsTable = page.locator('[data-testid="shipments-table"], table');
    this.shipmentRows = page.locator('[data-testid="shipment-row"], tbody tr');
    this.createShipmentButton = page.locator('[data-testid="create-shipment-btn"], button:has-text("Create Shipment")');
    this.assignDriverButton = page.locator('[data-testid="assign-driver-btn"], button:has-text("Assign Driver")');
    this.driverSelect = page.locator('[data-testid="driver-select"], select[name="driverId"]');
    this.confirmAssignButton = page.locator('[data-testid="confirm-assign-btn"], button:has-text("Confirm"), button:has-text("Assign")');
    this.markPackedButton = page.locator('[data-testid="mark-packed-btn"], button:has-text("Mark Packed")');
    this.schedulePickupInput = page.locator('[data-testid="pickup-time"], input[name="pickupTime"]');
    this.scheduleDeliveryInput = page.locator('[data-testid="delivery-time"], input[name="deliveryTime"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/shipments');
    await waitForLoadingComplete(this.page);
  }

  async findShipmentByNumber(shipmentNumber: string): Promise<Locator> {
    return this.page.locator(`tr:has-text("${shipmentNumber}")`);
  }

  async openShipment(shipmentNumber: string): Promise<void> {
    const row = await this.findShipmentByNumber(shipmentNumber);
    await row.click();
  }

  async createShipment(): Promise<void> {
    await this.createShipmentButton.click();
  }

  async assignDriver(driverName: string): Promise<void> {
    await this.assignDriverButton.click();
    await this.driverSelect.selectOption({ label: driverName });
    await this.confirmAssignButton.click();
    await waitForToast(this.page);
  }

  async markPacked(): Promise<void> {
    await this.markPackedButton.click();
    await waitForToast(this.page);
  }

  async expectShipmentStatus(shipmentNumber: string, status: string): Promise<void> {
    const row = await this.findShipmentByNumber(shipmentNumber);
    await expect(row).toContainText(status);
  }
}
