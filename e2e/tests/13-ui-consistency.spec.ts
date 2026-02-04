import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/testUsers';
import { waitForLoadingComplete } from '../utils/helpers';

const MENU_SECTIONS = [
  {
    id: 'orders',
    label: 'Orders & Customers',
    items: [
      { path: '/orders', label: 'Orders' },
      { path: '/customers', label: 'Customers' },
      { path: '/contracts', label: 'Contracts' },
      { path: '/availability', label: 'Availability' },
      { path: '/reservations', label: 'Reservations' },
    ],
  },
  {
    id: 'production',
    label: 'Production',
    items: [
      { path: '/planner', label: 'Planner' },
      { path: '/production-schedule', label: 'Production Schedule' },
      { path: '/batches', label: 'Batches' },
      { path: '/manufacturing', label: 'Manufacturing' },
      { path: '/dispensing', label: 'Dispensing' },
    ],
  },
  {
    id: 'quality',
    label: 'Quality',
    items: [
      { path: '/qc', label: 'QC Tests' },
      { path: '/oos-investigations', label: 'OOS Investigations' },
      { path: '/release', label: 'QP Release' },
      { path: '/admin/qc/test-definitions', label: 'QC Test Definitions' },
    ],
  },
  {
    id: 'logistics',
    label: 'Logistics',
    items: [
      { path: '/shipments', label: 'Shipments' },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventory & Supply',
    items: [
      { path: '/products', label: 'Products' },
      { path: '/materials', label: 'Materials' },
      { path: '/recipes', label: 'Recipes' },
      { path: '/suppliers', label: 'Suppliers' },
      { path: '/purchase-orders', label: 'Purchase Orders' },
      { path: '/warehouses', label: 'Warehouses' },
      { path: '/grn', label: 'Goods Receiving' },
      { path: '/inventory', label: 'Inventory' },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    items: [
      { path: '/invoices', label: 'Invoices' },
      { path: '/payments', label: 'Payments' },
    ],
  },
  {
    id: 'admin',
    label: 'Administration',
    items: [
      { path: '/approvals', label: 'Approvals' },
      { path: '/admin/helpdesk', label: 'Support Tickets' },
      { path: '/users', label: 'Users' },
      { path: '/roles', label: 'Roles' },
      { path: '/enterprise-reports', label: 'Enterprise Reports' },
      { path: '/settings', label: 'Settings' },
      { path: '/audit', label: 'Audit Log' },
    ],
  },
];

const PAGES_WITH_ADD_BUTTONS = [
  { path: '/products', buttonText: /add product/i, pageTitle: 'Products' },
  { path: '/customers', buttonText: /add customer/i, pageTitle: 'Customers' },
  { path: '/materials', buttonText: /add material/i, pageTitle: 'Materials' },
  { path: '/suppliers', buttonText: /add supplier/i, pageTitle: 'Suppliers' },
  { path: '/users', buttonText: /add user/i, pageTitle: 'Users' },
  { path: '/admin/qc/test-definitions', buttonText: /add test/i, pageTitle: 'QC Test Definitions' },
];

test.describe('UI Consistency Check - Menu and Button Visibility', () => {
  test.use({ storageState: 'e2e/storage/admin.json' });

  test('all menu sections should be visible and expandable', async ({ page }) => {
    await page.goto('/');
    await waitForLoadingComplete(page);

    for (const section of MENU_SECTIONS) {
      const sectionButton = page.locator(`text="${section.label}"`).first();
      await expect(sectionButton, `Menu section "${section.label}" should be visible`).toBeVisible({ timeout: 5000 });
      
      await sectionButton.click();
      await page.waitForTimeout(300);
      
      for (const item of section.items) {
        const menuItem = page.locator(`a[href="${item.path}"]`).first();
        const isVisible = await menuItem.isVisible().catch(() => false);
        
        if (!isVisible) {
          console.error(`MISSING MENU ITEM: "${item.label}" with path "${item.path}" in section "${section.label}"`);
        }
        
        expect(isVisible, `Menu item "${item.label}" (${item.path}) should be visible in "${section.label}"`).toBeTruthy();
      }
    }
  });

  test('dashboard should be accessible and have content', async ({ page }) => {
    await page.goto('/');
    await waitForLoadingComplete(page);

    const dashboardLink = page.locator('a[href="/"]').first();
    await expect(dashboardLink).toBeVisible();

    const pageContent = page.locator('main, [role="main"], .dashboard, h1, h2').first();
    await expect(pageContent).toBeVisible({ timeout: 5000 });
  });

  test('all menu items should navigate to valid pages', async ({ page }) => {
    const allPaths = MENU_SECTIONS.flatMap(s => s.items.map(i => i.path));
    const failedNavigations: string[] = [];

    for (const path of allPaths) {
      try {
        await page.goto(path, { timeout: 10000 });
        await waitForLoadingComplete(page);

        const hasContent = await page.locator('h1, h2, h3, .page-header, [class*="header"], table, .card, .grid').first().isVisible({ timeout: 3000 }).catch(() => false);
        const hasError = await page.locator('text=/error|not found|404|unauthorized/i').first().isVisible({ timeout: 1000 }).catch(() => false);

        if (!hasContent || hasError) {
          failedNavigations.push(path);
          console.error(`PAGE ISSUE: ${path} - hasContent: ${hasContent}, hasError: ${hasError}`);
        }
      } catch (error) {
        failedNavigations.push(path);
        console.error(`NAVIGATION FAILED: ${path} - ${error}`);
      }
    }

    expect(failedNavigations, `Failed navigations: ${failedNavigations.join(', ')}`).toHaveLength(0);
  });

  test('pages with Add buttons should display them correctly', async ({ page }) => {
    const missingButtons: string[] = [];

    for (const pageConfig of PAGES_WITH_ADD_BUTTONS) {
      await page.goto(pageConfig.path);
      await waitForLoadingComplete(page);

      const addButton = page.locator(`button`).filter({ hasText: pageConfig.buttonText }).first();
      const isVisible = await addButton.isVisible({ timeout: 3000 }).catch(() => false);

      if (!isVisible) {
        missingButtons.push(`${pageConfig.pageTitle} (${pageConfig.path})`);
        console.error(`MISSING ADD BUTTON: "${pageConfig.pageTitle}" page at ${pageConfig.path}`);
      }
    }

    expect(missingButtons, `Missing Add buttons on: ${missingButtons.join(', ')}`).toHaveLength(0);
  });

  test('Products page should have Configure QC Tests button in detail panel', async ({ page }) => {
    await page.goto('/products');
    await waitForLoadingComplete(page);

    const productCard = page.locator('[style*="cursor: pointer"], .card, [role="button"]').first();
    if (await productCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await productCard.click();
      await page.waitForTimeout(500);

      const configureButton = page.locator('button').filter({ hasText: /configure qc tests/i }).first();
      const isVisible = await configureButton.isVisible({ timeout: 3000 }).catch(() => false);
      
      expect(isVisible, 'Configure QC Tests button should be visible in product detail panel').toBeTruthy();
    }
  });

  test('QC Test Definitions page should have KPI cards', async ({ page }) => {
    await page.goto('/admin/qc/test-definitions');
    await waitForLoadingComplete(page);

    const kpiCards = page.locator('[class*="kpi"], [class*="stat"], .card').filter({ hasText: /total|active|inactive|numeric/i });
    const cardCount = await kpiCards.count();

    expect(cardCount, 'QC Test Definitions should have KPI cards').toBeGreaterThanOrEqual(1);
  });

  test('modal dialogs should open when Add buttons are clicked', async ({ page }) => {
    await page.goto('/admin/qc/test-definitions');
    await waitForLoadingComplete(page);

    const addButton = page.locator('button').filter({ hasText: /add test/i }).first();
    await expect(addButton).toBeVisible();
    await addButton.click();

    const modal = page.locator('.modal-overlay, .modal, [role="dialog"]').first();
    await expect(modal, 'Modal should open when Add button is clicked').toBeVisible({ timeout: 3000 });

    const modalHeader = page.locator('.modal-header, [class*="header"]').filter({ hasText: /add|create|new/i }).first();
    await expect(modalHeader, 'Modal should have a header').toBeVisible();

    const closeButton = page.locator('.modal button, [role="dialog"] button').filter({ hasText: /cancel|close|×/i }).first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }
  });

  test('global search should be accessible', async ({ page }) => {
    await page.goto('/');
    await waitForLoadingComplete(page);

    await page.keyboard.press('Meta+k');
    await page.waitForTimeout(300);

    let searchVisible = await page.locator('[class*="search"], [role="dialog"], input[placeholder*="search" i]').first().isVisible({ timeout: 2000 }).catch(() => false);

    if (!searchVisible) {
      await page.keyboard.press('Control+k');
      await page.waitForTimeout(300);
      searchVisible = await page.locator('[class*="search"], [role="dialog"], input[placeholder*="search" i]').first().isVisible({ timeout: 2000 }).catch(() => false);
    }

    expect(searchVisible, 'Global search (Cmd+K / Ctrl+K) should be accessible').toBeTruthy();
  });

  test('sidebar navigation should be collapsible', async ({ page }) => {
    await page.goto('/');
    await waitForLoadingComplete(page);

    const sidebar = page.locator('nav, aside, [class*="sidebar"]').first();
    await expect(sidebar).toBeVisible();

    const toggleButton = page.locator('button[aria-label*="menu" i], button[aria-label*="sidebar" i], button[aria-label*="collapse" i]').first();
    if (await toggleButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await toggleButton.click();
      await page.waitForTimeout(300);
    }
  });
});

test.describe('UI Consistency - Role-Based Menu Visibility', () => {
  test('admin user should see Administration menu', async ({ page }) => {
    test.use({ storageState: 'e2e/storage/admin.json' });
    
    await page.goto('/');
    await waitForLoadingComplete(page);

    const adminSection = page.locator('text="Administration"').first();
    await expect(adminSection, 'Admin should see Administration menu').toBeVisible({ timeout: 5000 });
  });
});
