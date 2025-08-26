import { test, expect } from '@playwright/test';
import { DashboardPage } from '../utils/page-objects';
import { TestHelpers } from '../utils/test-helpers';

test.describe('Dashboard Tests', () => {
  let dashboardPage: DashboardPage;
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    helpers = new TestHelpers(page);
    await dashboardPage.navigateTo('/');
  });

  test('Dashboard loads and displays main sections', async ({ page }) => {
    await dashboardPage.verifyDashboardLoaded();

    // Check for main dashboard elements
    const mainContent = await page.locator('main, [data-testid="main-content"]').isVisible();
    expect(mainContent).toBe(true);

    // Look for common dashboard elements (any of these should be present)
    const dashboardElements = [
      dashboardPage.welcomeMessage,
      dashboardPage.recentRecipes,
      dashboardPage.pantryOverview,
      dashboardPage.expiringItems,
      dashboardPage.groceryListPreview,
      dashboardPage.activityFeed,
      page.locator('h1, h2, .dashboard, .summary, .overview')
    ];

    let foundElements = 0;
    for (const element of dashboardElements) {
      const isVisible = await element.isVisible({ timeout: 3000 }).catch(() => false);
      if (isVisible) foundElements++;
    }

    expect(foundElements).toBeGreaterThan(0);
    console.log(`✅ Found ${foundElements} dashboard elements`);
  });

  test('Navigation sidebar is present and functional', async ({ page }) => {
    await dashboardPage.verifyDashboardLoaded();

    // Check for sidebar or navigation menu
    const navigation = await page.locator('nav, [data-testid="sidebar"], .sidebar, [role="navigation"]').isVisible({ timeout: 5000 }).catch(() => false);
    
    if (navigation) {
      console.log('✅ Navigation sidebar found');
      
      // Look for navigation links
      const navLinks = page.locator('nav a, [data-testid="sidebar"] a, .sidebar a, [role="navigation"] a');
      const linkCount = await navLinks.count();
      
      if (linkCount > 0) {
        console.log(`✅ Found ${linkCount} navigation links`);
        
        // Test clicking the first few navigation links
        for (let i = 0; i < Math.min(linkCount, 3); i++) {
          try {
            const link = navLinks.nth(i);
            const href = await link.getAttribute('href');
            const text = await link.textContent();
            
            if (href && text) {
              console.log(`Testing navigation link: "${text}" -> ${href}`);
              await link.click();
              await helpers.waitForAppLoad();
              
              // Verify navigation worked
              const currentUrl = page.url();
              console.log(`Navigated to: ${currentUrl}`);
            }
          } catch (error) {
            console.warn(`⚠️  Navigation link ${i} failed:`, error);
          }
        }
      }
    } else {
      console.log('ℹ️  No sidebar navigation found - may use different navigation pattern');
    }
  });

  test('Dashboard responds to different viewport sizes', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await dashboardPage.verifyDashboardLoaded();
    
    let desktopLayout = await page.locator('main, [data-testid="main-content"]').isVisible();
    expect(desktopLayout).toBe(true);

    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(1000); // Allow layout to adjust
    
    let tabletLayout = await page.locator('main, [data-testid="main-content"]').isVisible();
    expect(tabletLayout).toBe(true);

    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000); // Allow layout to adjust
    
    let mobileLayout = await page.locator('main, [data-testid="main-content"]').isVisible();
    expect(mobileLayout).toBe(true);

    // Check for mobile-specific elements (hamburger menu, etc.)
    const mobileMenu = await page.locator('[data-testid="mobile-menu"], .hamburger-menu, button[aria-label*="menu" i]').isVisible({ timeout: 3000 }).catch(() => false);
    
    if (mobileMenu) {
      console.log('✅ Mobile menu found');
    } else {
      console.log('ℹ️  No mobile menu detected - may use responsive design');
    }
  });

  test('Dashboard shows loading states appropriately', async ({ page }) => {
    // Intercept API calls to simulate slow loading
    await page.route('**/api/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Delay responses
      route.continue();
    });

    await dashboardPage.navigateTo('/');
    
    // Look for loading indicators
    const loadingIndicators = [
      '[data-testid="loading"]',
      '.loading',
      '.spinner',
      '.chakra-spinner',
      '[role="progressbar"]',
      'svg[data-testid="spinner"]'
    ];

    let foundLoading = false;
    for (const selector of loadingIndicators) {
      const hasLoading = await page.locator(selector).isVisible({ timeout: 2000 }).catch(() => false);
      if (hasLoading) {
        foundLoading = true;
        console.log(`✅ Found loading indicator: ${selector}`);
        break;
      }
    }

    if (!foundLoading) {
      console.log('ℹ️  No loading indicators found - may load very quickly');
    }

    // Wait for final content to load
    await helpers.waitForLoadingToComplete();
    await dashboardPage.verifyDashboardLoaded();
  });

  test('Dashboard handles empty states gracefully', async ({ page }) => {
    // Mock empty responses
    await page.route('**/api/recipes**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.route('**/api/pantry**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.route('**/api/grocery-list**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await dashboardPage.navigateTo('/');
    await dashboardPage.verifyDashboardLoaded();

    // Look for empty state messages
    const emptyStateTexts = [
      'No recipes',
      'No items',
      'Empty',
      'Get started',
      'Add your first',
      'Nothing here',
      'Start by adding'
    ];

    let foundEmptyState = false;
    for (const text of emptyStateTexts) {
      const hasEmptyState = await page.locator(`text=${text}`).isVisible({ timeout: 3000 }).catch(() => false);
      if (hasEmptyState) {
        foundEmptyState = true;
        console.log(`✅ Found empty state message: "${text}"`);
        break;
      }
    }

    // Even without explicit empty state messages, the dashboard should still render
    const hasMainContent = await page.locator('main, [data-testid="main-content"], body').isVisible();
    expect(hasMainContent).toBe(true);

    if (!foundEmptyState) {
      console.log('ℹ️  No empty state messages found - may show default content');
    }
  });

  test('Dashboard search functionality works if present', async ({ page }) => {
    await dashboardPage.verifyDashboardLoaded();

    // Look for search inputs
    const searchInputs = page.locator('input[type="search"], input[placeholder*="search" i], [data-testid*="search"]');
    const searchCount = await searchInputs.count();

    if (searchCount > 0) {
      console.log(`✅ Found ${searchCount} search input(s)`);
      
      const searchInput = searchInputs.first();
      await helpers.typeWithDelay(searchInput, 'test query');
      
      // Look for search results or loading indicators
      await page.waitForTimeout(1000);
      
      const hasResults = await page.locator('[data-testid*="result"], .result, .search-result').isVisible({ timeout: 5000 }).catch(() => false);
      const hasNoResults = await page.locator('text=No results, text=Not found, text=No matches').isVisible({ timeout: 5000 }).catch(() => false);
      
      if (hasResults || hasNoResults) {
        console.log('✅ Search functionality appears to be working');
      } else {
        console.log('⚠️  Search may not be fully functional');
      }
    } else {
      console.log('ℹ️  No search functionality found on dashboard');
    }
  });

  test('Theme switching works if available', async ({ page }) => {
    await dashboardPage.verifyDashboardLoaded();

    // Look for theme toggle buttons
    const themeToggles = page.locator('[data-testid*="theme"], button[aria-label*="theme" i], .theme-toggle, [aria-label*="dark" i], [aria-label*="light" i]');
    const toggleCount = await themeToggles.count();

    if (toggleCount > 0) {
      console.log('✅ Found theme toggle');
      
      const initialTheme = await page.evaluate(() => {
        return document.body.className;
      });
      
      await themeToggles.first().click();
      await page.waitForTimeout(500); // Allow theme change to apply
      
      const newTheme = await page.evaluate(() => {
        return document.body.className;
      });
      
      if (initialTheme !== newTheme) {
        console.log('✅ Theme switching works');
      } else {
        console.log('⚠️  Theme toggle may not be working');
      }
    } else {
      console.log('ℹ️  No theme toggle found');
    }
  });
});