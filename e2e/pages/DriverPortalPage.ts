import { Page, Locator, expect } from '@playwright/test';
import { waitForLoadingComplete, waitForToast } from '../utils/helpers';

export class DriverPortalPage {
  readonly page: Page;
  readonly shipmentsTable: Locator;
  readonly shipmentRows: Locator;
  readonly acceptButton: Locator;
  readonly pickupButton: Locator;
  readonly arrivedButton: Locator;
  readonly deliverButton: Locator;
  readonly receiverNameInput: Locator;
  readonly signatureCanvas: Locator;
  readonly signatureUpload: Locator;
  readonly podPhotoUpload: Locator;
  readonly latitudeInput: Locator;
  readonly longitudeInput: Locator;
  readonly submitDeliveryButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.shipmentsTable = page.locator('[data-testid="driver-shipments-table"], table');
    this.shipmentRows = page.locator('[data-testid="driver-shipment-row"], tbody tr');
    this.acceptButton = page.locator('[data-testid="accept-shipment-btn"], button:has-text("Accept")');
    this.pickupButton = page.locator('[data-testid="pickup-btn"], button:has-text("Pickup"), button:has-text("Picked Up")');
    this.arrivedButton = page.locator('[data-testid="arrived-btn"], button:has-text("Arrived")');
    this.deliverButton = page.locator('[data-testid="deliver-btn"], button:has-text("Deliver"), button:has-text("Complete Delivery")');
    this.receiverNameInput = page.locator('[data-testid="receiver-name"], input[name="receiverName"]');
    this.signatureCanvas = page.locator('[data-testid="signature-canvas"], canvas');
    this.signatureUpload = page.locator('[data-testid="signature-upload"], input[type="file"][name="signature"]');
    this.podPhotoUpload = page.locator('[data-testid="pod-photo-upload"], input[type="file"][name="podPhoto"]');
    this.latitudeInput = page.locator('[data-testid="latitude-input"], input[name="latitude"]');
    this.longitudeInput = page.locator('[data-testid="longitude-input"], input[name="longitude"]');
    this.submitDeliveryButton = page.locator('[data-testid="submit-delivery-btn"], button:has-text("Submit"), button:has-text("Complete")');
  }

  async goto(): Promise<void> {
    await this.page.goto('/driver/shipments');
    await waitForLoadingComplete(this.page);
  }

  async findShipmentByNumber(shipmentNumber: string): Promise<Locator> {
    return this.page.locator(`tr:has-text("${shipmentNumber}"), [data-testid="shipment-card"]:has-text("${shipmentNumber}")`);
  }

  async openShipment(shipmentNumber: string): Promise<void> {
    const row = await this.findShipmentByNumber(shipmentNumber);
    await row.click();
  }

  async acceptShipment(): Promise<void> {
    await this.acceptButton.click();
    await waitForToast(this.page);
  }

  async confirmPickup(): Promise<void> {
    await this.pickupButton.click();
    await waitForToast(this.page);
  }

  async markArrived(): Promise<void> {
    await this.arrivedButton.click();
    await waitForToast(this.page);
  }

  async completeDelivery(options: {
    receiverName: string;
    signatureImagePath?: string;
    podPhotoPath?: string;
    latitude?: number;
    longitude?: number;
  }): Promise<void> {
    await this.receiverNameInput.fill(options.receiverName);

    if (options.signatureImagePath) {
      await this.signatureUpload.setInputFiles(options.signatureImagePath);
    } else if (await this.signatureCanvas.isVisible()) {
      const box = await this.signatureCanvas.boundingBox();
      if (box) {
        await this.page.mouse.move(box.x + 50, box.y + 30);
        await this.page.mouse.down();
        await this.page.mouse.move(box.x + 150, box.y + 50);
        await this.page.mouse.move(box.x + 100, box.y + 70);
        await this.page.mouse.up();
      }
    }

    if (options.podPhotoPath) {
      await this.podPhotoUpload.setInputFiles(options.podPhotoPath);
    }

    if (options.latitude && options.longitude) {
      await this.latitudeInput.fill(options.latitude.toString());
      await this.longitudeInput.fill(options.longitude.toString());
    }

    await this.submitDeliveryButton.click();
    await waitForToast(this.page);
  }

  async expectShipmentStatus(shipmentNumber: string, status: string): Promise<void> {
    const row = await this.findShipmentByNumber(shipmentNumber);
    await expect(row).toContainText(status);
  }
}
