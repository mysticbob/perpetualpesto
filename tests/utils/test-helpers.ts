import { Page, expect } from '@playwright/test';
import { TEST_USER_ID } from '../fixtures/test-data';

export class TestHelpers {
  constructor(private page: Page) {}

  /**
   * Wait for the application to be fully loaded
   */
  async waitForAppLoad() {
    try {
      // Wait for React to be loaded (with shorter timeout)
      await this.page.waitForFunction(() => window.React !== undefined, { timeout: 5000 }).catch(() => {
        console.log('React not detected, continuing anyway...');
      });
      
      // Wait for main app container or body
      await this.page.waitForSelector('body, main, [data-testid="app-container"], .chakra-ui-light, .chakra-ui-dark', { timeout: 10000 });
      
      // Wait for navigation to be stable (shorter timeout)
      await this.page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      // Give a small delay for any final rendering
      await this.page.waitForTimeout(1000);
    } catch (error) {
      console.warn('App load timeout, continuing with test...');
      // Don't fail, just log and continue
    }
  }

  /**
   * Navigate to a specific page and wait for it to load
   */
  async navigateToPage(path: string) {
    await this.page.goto(path);
    await this.waitForAppLoad();
  }

  /**
   * Check if toast notification appears
   */
  async waitForToast(message?: string, timeout = 10000) {
    const toastSelector = '[role="alert"], .chakra-toast, [data-testid="toast"]';
    await this.page.waitForSelector(toastSelector, { timeout });
    
    if (message) {
      await expect(this.page.locator(toastSelector)).toContainText(message);
    }
    
    return this.page.locator(toastSelector);
  }

  /**
   * Wait for loading states to disappear
   */
  async waitForLoadingToComplete() {
    // Wait for common loading indicators to disappear
    await this.page.waitForFunction(() => {
      const spinners = document.querySelectorAll('.chakra-spinner, [data-testid="loading"], .loading');
      return spinners.length === 0;
    }, { timeout: 15000 });
  }

  /**
   * Check if element is visible and enabled
   */
  async isElementReady(selector: string) {
    const element = this.page.locator(selector);
    await expect(element).toBeVisible();
    await expect(element).toBeEnabled();
    return element;
  }

  /**
   * Simulate typing with realistic delays
   */
  async typeWithDelay(selector: string, text: string, delay = 100) {
    const element = await this.isElementReady(selector);
    await element.clear();
    await element.type(text, { delay });
  }

  /**
   * Click element and wait for navigation/loading
   */
  async clickAndWait(selector: string, waitForNavigation = false) {
    const element = await this.isElementReady(selector);
    
    if (waitForNavigation) {
      await Promise.all([
        this.page.waitForLoadState('networkidle'),
        element.click()
      ]);
    } else {
      await element.click();
    }
  }

  /**
   * Check for console errors (excluding expected ones)
   */
  async checkForConsoleErrors() {
    const logs = this.page.context().logs || [];
    const errors = logs.filter(log => 
      log.type === 'error' && 
      !log.text.includes('favicon') &&
      !log.text.includes('Extension')
    );
    
    if (errors.length > 0) {
      console.warn('Console errors found:', errors.map(e => e.text));
    }
  }

  /**
   * Take screenshot with timestamp
   */
  async takeScreenshot(name: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await this.page.screenshot({
      path: `test-results/screenshots/${name}-${timestamp}.png`,
      fullPage: true
    });
  }

  /**
   * Mock API response
   */
  async mockApiResponse(endpoint: string, response: any, status = 200) {
    await this.page.route(`**/api${endpoint}`, route => {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
  }

  /**
   * Wait for API call to complete
   */
  async waitForApiCall(endpoint: string, timeout = 10000) {
    return await this.page.waitForResponse(
      response => response.url().includes(endpoint) && response.status() < 400,
      { timeout }
    );
  }

  /**
   * Simulate mobile viewport
   */
  async setMobileViewport() {
    await this.page.setViewportSize({ width: 375, height: 667 });
  }

  /**
   * Simulate desktop viewport
   */
  async setDesktopViewport() {
    await this.page.setViewportSize({ width: 1920, height: 1080 });
  }
}

/**
 * Global test utilities
 */
export const getTestUserId = () => TEST_USER_ID;

export const createMockApiData = (overrides: any = {}) => ({
  userId: TEST_USER_ID,
  timestamp: new Date().toISOString(),
  ...overrides
});

export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));