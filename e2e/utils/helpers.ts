import { Page, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

export async function waitForToast(page: Page, text?: string): Promise<void> {
  const toastLocator = page.locator('[data-testid="toast"], .toast, [role="alert"]');
  await expect(toastLocator.first()).toBeVisible({ timeout: 10000 });
  if (text) {
    await expect(toastLocator.first()).toContainText(text);
  }
}

export async function waitForLoadingComplete(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  const spinners = page.locator('[data-testid="loading"], .spinner, .loading');
  await spinners.first().waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
}

export async function downloadFile(page: Page, downloadTrigger: () => Promise<void>): Promise<{ path: string; name: string; size: number }> {
  const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
  await downloadTrigger();
  const download = await downloadPromise;
  
  const artifactsDir = 'e2e/artifacts/downloads';
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }
  
  const filePath = path.join(artifactsDir, download.suggestedFilename());
  await download.saveAs(filePath);
  
  const stats = fs.statSync(filePath);
  return {
    path: filePath,
    name: download.suggestedFilename(),
    size: stats.size,
  };
}

export async function uploadFile(page: Page, inputSelector: string, fileName: string, content: Buffer | string): Promise<void> {
  const tempDir = 'e2e/artifacts/temp';
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const filePath = path.join(tempDir, fileName);
  fs.writeFileSync(filePath, content);
  
  await page.setInputFiles(inputSelector, filePath);
}

export function generateTestFile(sizeKB: number, extension: string = 'pdf'): { path: string; buffer: Buffer } {
  const buffer = Buffer.alloc(sizeKB * 1024);
  buffer.fill('x');
  
  const tempDir = 'e2e/artifacts/temp';
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const fileName = `test-file-${Date.now()}.${extension}`;
  const filePath = path.join(tempDir, fileName);
  fs.writeFileSync(filePath, buffer);
  
  return { path: filePath, buffer };
}

export async function assertNotificationReceived(page: Page, title: string): Promise<void> {
  const bellButton = page.locator('[data-testid="notification-bell"], button:has(svg)').first();
  await bellButton.click();
  
  const notificationPanel = page.locator('[data-testid="notification-panel"], [data-testid="notification-dropdown"]');
  await expect(notificationPanel).toBeVisible({ timeout: 5000 });
  
  await expect(notificationPanel).toContainText(title, { timeout: 5000 });
  
  await page.keyboard.press('Escape');
}

export async function getNotificationCount(page: Page): Promise<number> {
  const badge = page.locator('[data-testid="notification-count"], .notification-badge');
  const text = await badge.textContent().catch(() => '0');
  return parseInt(text || '0', 10);
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function formatDateTime(date: Date): string {
  return date.toISOString().slice(0, 16);
}

export async function fillDateInput(page: Page, selector: string, date: Date): Promise<void> {
  const dateStr = formatDate(date);
  await page.fill(selector, dateStr);
}

export async function selectDropdownOption(page: Page, dropdownSelector: string, optionText: string): Promise<void> {
  await page.click(dropdownSelector);
  await page.click(`text=${optionText}`);
}
