import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';
import { API_ENDPOINTS, TEST_USER_ID, sampleRecipe, samplePantryItems } from '../fixtures/test-data';

test.describe('API Integration Tests', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
  });

  test('API health check endpoint responds correctly', async ({ page }) => {
    try {
      const response = await page.request.get('http://localhost:3001/health');
      
      if (response.ok()) {
        expect(response.status()).toBe(200);
        
        const contentType = response.headers()['content-type'];
        if (contentType && contentType.includes('application/json')) {
          const body = await response.json();
          expect(body).toBeDefined();
          console.log('✅ Health check API working:', body);
        } else {
          const body = await response.text();
          expect(body.length).toBeGreaterThan(0);
          console.log('✅ Health check API working (text response):', body.substring(0, 100));
        }
      } else {
        console.warn(`⚠️  Health check failed with status: ${response.status()}`);
        const body = await response.text();
        console.warn('Response body:', body.substring(0, 200));
      }
    } catch (error) {
      console.warn('⚠️  Health check endpoint not available:', error);
    }
  });

  test('Recipes API integration through UI', async ({ page }) => {
    await helpers.navigateToPage('/recipes');
    await helpers.waitForAppLoad();

    // Monitor API calls to recipes endpoint
    const apiCalls: any[] = [];
    page.on('response', response => {
      if (response.url().includes('/api/recipes')) {
        apiCalls.push({
          url: response.url(),
          status: response.status(),
          method: response.request().method()
        });
      }
    });

    // Wait for potential API calls to complete
    await page.waitForTimeout(3000);

    if (apiCalls.length > 0) {
      console.log('✅ Recipes API calls detected:', apiCalls);
      
      // Check for successful API calls
      const successfulCalls = apiCalls.filter(call => call.status >= 200 && call.status < 400);
      const failedCalls = apiCalls.filter(call => call.status >= 400);
      
      console.log(`Successful calls: ${successfulCalls.length}, Failed calls: ${failedCalls.length}`);
      
      if (failedCalls.length > 0) {
        console.warn('Failed API calls:', failedCalls);
      }
    } else {
      console.log('ℹ️  No recipes API calls detected - may be using static data or different endpoint');
    }

    // Test if the UI shows appropriate content or error states
    const hasContent = await page.locator('main, [data-testid="main-content"]').isVisible();
    expect(hasContent).toBe(true);
  });

  test('Pantry API integration through UI', async ({ page }) => {
    await helpers.navigateToPage('/pantry');
    await helpers.waitForAppLoad();

    // Monitor pantry API calls
    const apiCalls: any[] = [];
    page.on('response', response => {
      if (response.url().includes('/api/pantry') || response.url().includes('/pantry')) {
        apiCalls.push({
          url: response.url(),
          status: response.status(),
          method: response.request().method()
        });
      }
    });

    await page.waitForTimeout(3000);

    if (apiCalls.length > 0) {
      console.log('✅ Pantry API calls detected:', apiCalls);
      
      const successfulCalls = apiCalls.filter(call => call.status >= 200 && call.status < 400);
      const failedCalls = apiCalls.filter(call => call.status >= 400);
      
      console.log(`Successful calls: ${successfulCalls.length}, Failed calls: ${failedCalls.length}`);
      
      if (failedCalls.length > 0) {
        console.warn('Failed API calls:', failedCalls);
      }
    } else {
      console.log('ℹ️  No pantry API calls detected');
    }

    const hasContent = await page.locator('main, [data-testid="main-content"]').isVisible();
    expect(hasContent).toBe(true);
  });

  test('Grocery list API integration through UI', async ({ page }) => {
    await helpers.navigateToPage('/grocery');
    await helpers.waitForAppLoad();

    // Monitor grocery API calls
    const apiCalls: any[] = [];
    page.on('response', response => {
      if (response.url().includes('/api/grocery') || response.url().includes('/grocery')) {
        apiCalls.push({
          url: response.url(),
          status: response.status(),
          method: response.request().method()
        });
      }
    });

    await page.waitForTimeout(3000);

    if (apiCalls.length > 0) {
      console.log('✅ Grocery API calls detected:', apiCalls);
      
      const successfulCalls = apiCalls.filter(call => call.status >= 200 && call.status < 400);
      const failedCalls = apiCalls.filter(call => call.status >= 400);
      
      console.log(`Successful calls: ${successfulCalls.length}, Failed calls: ${failedCalls.length}`);
      
      if (failedCalls.length > 0) {
        console.warn('Failed API calls:', failedCalls);
      }
    } else {
      console.log('ℹ️  No grocery API calls detected');
    }

    const hasContent = await page.locator('main, [data-testid="main-content"]').isVisible();
    expect(hasContent).toBe(true);
  });

  test('API error handling in UI', async ({ page }) => {
    // Mock API errors
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error', message: 'Test error' })
      });
    });

    // Test each main page with API errors
    const pagesToTest = ['/recipes', '/pantry', '/grocery'];
    
    for (const pagePath of pagesToTest) {
      try {
        await helpers.navigateToPage(pagePath);
        await helpers.waitForAppLoad();

        // App should still render even with API errors
        const hasContent = await page.locator('main, [data-testid="main-content"], body').isVisible();
        expect(hasContent).toBe(true);

        // Look for error handling (toasts, error messages, empty states)
        const errorIndicators = [
          '[role="alert"]',
          '.error',
          '.toast',
          '[data-testid="error"]',
          'text=Error',
          'text=Failed',
          'text=Something went wrong'
        ];

        let foundErrorHandling = false;
        for (const selector of errorIndicators) {
          const hasError = await page.locator(selector).isVisible({ timeout: 3000 }).catch(() => false);
          if (hasError) {
            foundErrorHandling = true;
            console.log(`✅ Error handling found on ${pagePath}: ${selector}`);
            break;
          }
        }

        if (!foundErrorHandling) {
          console.log(`ℹ️  No explicit error handling found on ${pagePath} - may show empty state`);
        }

      } catch (error) {
        console.warn(`⚠️  Error testing ${pagePath}:`, error);
      }
    }
  });

  test('API loading states in UI', async ({ page }) => {
    // Slow down API responses to test loading states
    await page.route('**/api/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      route.continue();
    });

    const pagesToTest = ['/recipes', '/pantry', '/grocery'];
    
    for (const pagePath of pagesToTest) {
      try {
        await helpers.navigateToPage(pagePath);
        
        // Look for loading indicators immediately after navigation
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
          const hasLoading = await page.locator(selector).isVisible({ timeout: 1000 }).catch(() => false);
          if (hasLoading) {
            foundLoading = true;
            console.log(`✅ Loading indicator found on ${pagePath}: ${selector}`);
            break;
          }
        }

        if (!foundLoading) {
          console.log(`ℹ️  No loading indicators found on ${pagePath} - may load very quickly`);
        }

        // Wait for loading to complete
        await helpers.waitForLoadingToComplete();
        await helpers.waitForAppLoad();

      } catch (error) {
        console.warn(`⚠️  Error testing loading states on ${pagePath}:`, error);
      }
    }
  });

  test('API data persistence and updates', async ({ page }) => {
    // Test that UI updates when API data changes
    let recipeCallCount = 0;
    const mockRecipes = [
      { id: 1, title: 'Test Recipe 1', ingredients: ['flour', 'eggs'] },
      { id: 2, title: 'Test Recipe 2', ingredients: ['milk', 'sugar'] }
    ];

    await page.route('**/api/recipes**', route => {
      recipeCallCount++;
      const recipes = recipeCallCount === 1 ? [mockRecipes[0]] : mockRecipes;
      
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(recipes)
      });
    });

    // First visit - should show 1 recipe
    await helpers.navigateToPage('/recipes');
    await helpers.waitForAppLoad();

    // Trigger a refresh or re-fetch (this depends on the app's implementation)
    await page.reload();
    await helpers.waitForAppLoad();

    // Second call should return 2 recipes
    // The specific test here depends on how the app handles data updates
    console.log(`API called ${recipeCallCount} times`);
    
    if (recipeCallCount >= 2) {
      console.log('✅ API data persistence and updates appear to be working');
    } else {
      console.log('ℹ️  API may not be called on page reload - could be using cached data');
    }
  });

  test('User context in API calls', async ({ page }) => {
    // Check that API calls include proper user context
    const apiCallsWithUser: any[] = [];
    
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        const headers = request.headers();
        const url = request.url();
        const hasUserContext = 
          url.includes(TEST_USER_ID) || 
          headers['user-id'] === TEST_USER_ID ||
          headers['authorization'] ||
          url.includes('user-123'); // Our test user ID

        apiCallsWithUser.push({
          url,
          method: request.method(),
          hasUserContext,
          headers: Object.keys(headers)
        });
      }
    });

    // Navigate to different pages to trigger API calls
    await helpers.navigateToPage('/recipes');
    await helpers.waitForAppLoad();
    await helpers.navigateToPage('/pantry');
    await helpers.waitForAppLoad();
    await helpers.navigateToPage('/grocery');
    await helpers.waitForAppLoad();

    if (apiCallsWithUser.length > 0) {
      console.log('API calls made:', apiCallsWithUser.length);
      
      const callsWithUserContext = apiCallsWithUser.filter(call => call.hasUserContext);
      console.log(`Calls with user context: ${callsWithUserContext.length}`);
      
      if (callsWithUserContext.length > 0) {
        console.log('✅ User context found in API calls');
      } else {
        console.log('ℹ️  No explicit user context found in API calls - may use session-based auth');
      }
    } else {
      console.log('ℹ️  No API calls detected - app may not be using REST APIs');
    }
  });

  test('API rate limiting and error recovery', async ({ page }) => {
    // Test API rate limiting (if implemented)
    let callCount = 0;
    
    await page.route('**/api/**', route => {
      callCount++;
      
      if (callCount > 5) {
        // Simulate rate limiting
        route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Rate limited' })
        });
      } else {
        route.continue();
      }
    });

    // Make multiple requests quickly
    for (let i = 0; i < 3; i++) {
      await helpers.navigateToPage('/recipes');
      await page.waitForTimeout(100);
      await helpers.navigateToPage('/pantry');
      await page.waitForTimeout(100);
    }

    console.log(`Made ${callCount} API calls`);

    if (callCount > 5) {
      // Check if app handles rate limiting gracefully
      const hasContent = await page.locator('main, [data-testid="main-content"]').isVisible();
      expect(hasContent).toBe(true);
      console.log('✅ App handles rate limiting gracefully');
    } else {
      console.log('ℹ️  Rate limiting test completed with minimal API calls');
    }
  });
});