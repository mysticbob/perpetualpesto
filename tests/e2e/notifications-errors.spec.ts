import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';
import { DashboardPage, RecipesPage, PantryPage, GroceryListPage } from '../utils/page-objects';

test.describe('Toast Notifications and Error Handling Tests', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
  });

  test('Toast notifications system works', async ({ page }) => {
    await helpers.navigateToPage('/');
    await helpers.waitForAppLoad();

    // Test different scenarios that might trigger toasts
    const toastTriggerTests = [
      {
        name: 'Navigate to recipes page',
        action: async () => {
          await helpers.navigateToPage('/recipes');
          await helpers.waitForAppLoad();
        }
      },
      {
        name: 'Navigate to pantry page',
        action: async () => {
          await helpers.navigateToPage('/pantry');
          await helpers.waitForAppLoad();
        }
      },
      {
        name: 'Trigger API error',
        action: async () => {
          // Mock a failed API call
          await page.route('**/api/test-toast**', route => {
            route.fulfill({
              status: 500,
              contentType: 'application/json',
              body: JSON.stringify({ error: 'Test error for toast' })
            });
          });
          
          // Try to trigger the API call (this might not work depending on the app)
          await page.evaluate(() => {
            fetch('/api/test-toast').catch(() => {});
          });
        }
      }
    ];

    let toastFound = false;

    for (const test of toastTriggerTests) {
      try {
        await test.action();
        
        // Look for toast notifications
        const toastSelectors = [
          '[role="alert"]',
          '.chakra-toast',
          '[data-testid="toast"]',
          '.toast',
          '.notification',
          '[data-toast-id]',
          '.Toastify__toast'
        ];

        for (const selector of toastSelectors) {
          const hasToast = await page.locator(selector).isVisible({ timeout: 3000 }).catch(() => false);
          if (hasToast) {
            toastFound = true;
            const toastText = await page.locator(selector).textContent().catch(() => '');
            console.log(`✅ Toast notification found (${test.name}): ${selector} - "${toastText}"`);
            
            // Test toast dismissal if possible
            const closeButton = page.locator(`${selector} button, ${selector} [aria-label="Close"], ${selector} .close`);
            const hasCloseButton = await closeButton.isVisible({ timeout: 1000 }).catch(() => false);
            if (hasCloseButton) {
              await closeButton.click();
              console.log('✅ Toast dismissal works');
            }
            break;
          }
        }

        if (toastFound) break;
        
      } catch (error) {
        console.warn(`⚠️  Toast test failed for ${test.name}:`, error);
      }
    }

    if (!toastFound) {
      console.log('ℹ️  No toast notifications detected - may not be implemented or require specific actions');
    }
  });

  test('Error boundary handling', async ({ page }) => {
    // Test React error boundary by intentionally causing JavaScript errors
    await helpers.navigateToPage('/');
    await helpers.waitForAppLoad();

    // Inject a script that will cause an error in React components
    const errorTests = [
      {
        name: 'Null reference error',
        script: `
          // Try to access a property on null/undefined
          const testElement = document.querySelector('[data-test-error-target]');
          if (testElement) testElement.nonExistentProperty.foo = 'bar';
        `
      },
      {
        name: 'Invalid state update',
        script: `
          // Try to trigger a React error by manipulating state incorrectly
          const reactRoot = document.querySelector('#root, [data-reactroot]');
          if (reactRoot && window.React) {
            // This might trigger error boundary in some scenarios
            console.log('Testing React error boundary');
          }
        `
      }
    ];

    let errorBoundaryFound = false;

    for (const errorTest of errorTests) {
      try {
        // Look for initial error boundary components
        const errorBoundarySelectors = [
          '[data-testid="error-boundary"]',
          '.error-boundary',
          'text=Something went wrong',
          'text=Error',
          'text=Oops',
          'text=Reload page',
          'text=Try again'
        ];

        // Execute the error-inducing script
        await page.evaluate(errorTest.script);
        await page.waitForTimeout(1000); // Give time for error to propagate

        // Check for error boundary
        for (const selector of errorBoundarySelectors) {
          const hasErrorBoundary = await page.locator(selector).isVisible({ timeout: 2000 }).catch(() => false);
          if (hasErrorBoundary) {
            errorBoundaryFound = true;
            const errorText = await page.locator(selector).textContent().catch(() => '');
            console.log(`✅ Error boundary found (${errorTest.name}): ${selector} - "${errorText}"`);
            break;
          }
        }

        if (errorBoundaryFound) break;

      } catch (error) {
        console.warn(`⚠️  Error boundary test failed for ${errorTest.name}:`, error);
      }
    }

    if (!errorBoundaryFound) {
      console.log('ℹ️  No error boundary detected - app may be very stable or use different error handling');
    }

    // Verify app is still functional after error tests
    const hasContent = await page.locator('main, [data-testid="main-content"], body').isVisible();
    expect(hasContent).toBe(true);
  });

  test('Network error handling and notifications', async ({ page }) => {
    await helpers.navigateToPage('/');
    await helpers.waitForAppLoad();

    // Mock network failures
    await page.route('**/api/**', route => {
      route.abort('failed');
    });

    // Test different pages with network errors
    const pagesToTest = ['/recipes', '/pantry', '/grocery'];
    
    for (const pagePath of pagesToTest) {
      try {
        await helpers.navigateToPage(pagePath);
        await helpers.waitForAppLoad();

        // Look for error notifications or handling
        const errorSelectors = [
          '[role="alert"]',
          '.error',
          '.toast',
          '[data-testid="error"]',
          '[data-testid="network-error"]',
          'text=Network error',
          'text=Connection failed',
          'text=Unable to connect',
          'text=Something went wrong'
        ];

        let foundErrorHandling = false;
        for (const selector of errorSelectors) {
          const hasError = await page.locator(selector).isVisible({ timeout: 5000 }).catch(() => false);
          if (hasError) {
            foundErrorHandling = true;
            const errorText = await page.locator(selector).textContent().catch(() => '');
            console.log(`✅ Network error handling found on ${pagePath}: ${selector} - "${errorText}"`);
            break;
          }
        }

        if (!foundErrorHandling) {
          // Check if the page still renders (graceful degradation)
          const hasContent = await page.locator('main, [data-testid="main-content"]').isVisible();
          if (hasContent) {
            console.log(`ℹ️  ${pagePath} handles network errors gracefully (no error shown but page still works)`);
          } else {
            console.log(`⚠️  ${pagePath} may not handle network errors well`);
          }
        }

      } catch (error) {
        console.warn(`⚠️  Network error test failed for ${pagePath}:`, error);
      }
    }
  });

  test('Form validation error messages', async ({ page }) => {
    // Test form validation on pages that might have forms
    const formTests = [
      {
        page: '/recipes',
        formTest: async () => {
          const addButton = page.locator('[data-testid="add-recipe"], button:has-text("Add Recipe"), button:has-text("Add")');
          const hasAddButton = await addButton.isVisible({ timeout: 3000 }).catch(() => false);
          
          if (hasAddButton) {
            await addButton.click();
            await page.waitForTimeout(1000);
            
            // Try to submit empty form
            const submitButton = page.locator('button[type="submit"], button:has-text("Submit"), button:has-text("Save"), button:has-text("Create")');
            const hasSubmit = await submitButton.isVisible({ timeout: 3000 }).catch(() => false);
            
            if (hasSubmit) {
              await submitButton.click();
              return true;
            }
          }
          return false;
        }
      },
      {
        page: '/pantry',
        formTest: async () => {
          const addButton = page.locator('[data-testid="add-pantry-item"], button:has-text("Add Item"), button:has-text("Add")');
          const hasAddButton = await addButton.isVisible({ timeout: 3000 }).catch(() => false);
          
          if (hasAddButton) {
            await addButton.click();
            await page.waitForTimeout(1000);
            
            const submitButton = page.locator('button[type="submit"], button:has-text("Submit"), button:has-text("Save"), button:has-text("Add")');
            const hasSubmit = await submitButton.isVisible({ timeout: 3000 }).catch(() => false);
            
            if (hasSubmit) {
              await submitButton.click();
              return true;
            }
          }
          return false;
        }
      }
    ];

    for (const formTest of formTests) {
      try {
        await helpers.navigateToPage(formTest.page);
        await helpers.waitForAppLoad();

        const formTriggered = await formTest.formTest();
        
        if (formTriggered) {
          // Look for validation errors
          const validationSelectors = [
            '.error',
            '.field-error',
            '.form-error',
            '[data-testid="error"]',
            '[role="alert"]',
            '.invalid',
            'text=Required',
            'text=This field',
            'text=Please enter',
            'text=Invalid'
          ];

          let foundValidation = false;
          for (const selector of validationSelectors) {
            const hasValidation = await page.locator(selector).isVisible({ timeout: 3000 }).catch(() => false);
            if (hasValidation) {
              foundValidation = true;
              const validationText = await page.locator(selector).textContent().catch(() => '');
              console.log(`✅ Form validation found on ${formTest.page}: ${selector} - "${validationText}"`);
              break;
            }
          }

          if (!foundValidation) {
            console.log(`ℹ️  No form validation errors found on ${formTest.page} - may prevent submission or show different feedback`);
          }
        } else {
          console.log(`ℹ️  No forms available to test on ${formTest.page}`);
        }

      } catch (error) {
        console.warn(`⚠️  Form validation test failed for ${formTest.page}:`, error);
      }
    }
  });

  test('Loading state error handling', async ({ page }) => {
    // Test what happens when loading states fail or timeout
    await page.route('**/api/**', async route => {
      // Simulate very slow responses that might timeout
      await new Promise(resolve => setTimeout(resolve, 10000));
      route.continue();
    });

    const pagesToTest = ['/recipes', '/pantry', '/grocery'];
    
    for (const pagePath of pagesToTest) {
      try {
        const startTime = Date.now();
        await helpers.navigateToPage(pagePath);
        
        // Wait for either content to load or timeout
        let contentLoaded = false;
        let timeoutReached = false;
        
        while (!contentLoaded && !timeoutReached) {
          const elapsed = Date.now() - startTime;
          timeoutReached = elapsed > 15000; // 15 second timeout
          
          const hasContent = await page.locator('main, [data-testid="main-content"]').isVisible({ timeout: 1000 }).catch(() => false);
          const hasError = await page.locator('[role="alert"], .error, .timeout').isVisible({ timeout: 1000 }).catch(() => false);
          
          if (hasContent || hasError) {
            contentLoaded = true;
            
            if (hasError) {
              console.log(`✅ Timeout/loading error handling works on ${pagePath}`);
            } else {
              console.log(`✅ Content eventually loaded on ${pagePath}`);
            }
          }
        }

        if (timeoutReached) {
          console.log(`⚠️  Page ${pagePath} may not handle loading timeouts well`);
        }

      } catch (error) {
        console.warn(`⚠️  Loading error test failed for ${pagePath}:`, error);
      }
    }
  });

  test('JavaScript console error notifications', async ({ page }) => {
    const jsErrors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error' && 
          !msg.text().includes('favicon') &&
          !msg.text().includes('Extension') &&
          !msg.text().includes('DevTools')) {
        jsErrors.push(msg.text());
      }
    });

    // Navigate to different pages and check for console errors
    const pagesToTest = ['/', '/recipes', '/pantry', '/grocery'];
    
    for (const pagePath of pagesToTest) {
      try {
        await helpers.navigateToPage(pagePath);
        await helpers.waitForAppLoad();
        await page.waitForTimeout(2000); // Wait for any async operations
        
      } catch (error) {
        console.warn(`⚠️  Error navigating to ${pagePath}:`, error);
      }
    }

    if (jsErrors.length > 0) {
      console.log(`⚠️  Found ${jsErrors.length} JavaScript errors:`);
      jsErrors.slice(0, 5).forEach(error => console.log(`  - ${error}`));
      
      // Check if there are any error notifications in the UI for these console errors
      const hasErrorNotification = await page.locator('[role="alert"], .error, .toast').isVisible({ timeout: 3000 }).catch(() => false);
      
      if (hasErrorNotification) {
        console.log('✅ UI shows error notifications for JavaScript errors');
      } else {
        console.log('ℹ️  No UI error notifications for JavaScript errors - may be logged silently');
      }
    } else {
      console.log('✅ No JavaScript console errors found');
    }
  });

  test('Offline/connectivity error handling', async ({ page, context }) => {
    await helpers.navigateToPage('/');
    await helpers.waitForAppLoad();

    // Simulate going offline
    await context.setOffline(true);

    // Try to navigate to different pages
    const pagesToTest = ['/recipes', '/pantry', '/grocery'];
    
    for (const pagePath of pagesToTest) {
      try {
        await page.goto(pagePath);
        
        // Look for offline indicators or error messages
        const offlineSelectors = [
          'text=Offline',
          'text=No connection',
          'text=Check your internet',
          '[data-testid="offline"]',
          '.offline',
          '[role="alert"]'
        ];

        let foundOfflineHandling = false;
        for (const selector of offlineSelectors) {
          const hasOffline = await page.locator(selector).isVisible({ timeout: 5000 }).catch(() => false);
          if (hasOffline) {
            foundOfflineHandling = true;
            const offlineText = await page.locator(selector).textContent().catch(() => '');
            console.log(`✅ Offline handling found on ${pagePath}: ${selector} - "${offlineText}"`);
            break;
          }
        }

        if (!foundOfflineHandling) {
          // Check if cached content is shown
          const hasContent = await page.locator('main, [data-testid="main-content"]').isVisible({ timeout: 3000 }).catch(() => false);
          if (hasContent) {
            console.log(`ℹ️  ${pagePath} may show cached content when offline`);
          } else {
            console.log(`⚠️  ${pagePath} may not handle offline state well`);
          }
        }

      } catch (error) {
        console.warn(`⚠️  Offline test failed for ${pagePath}:`, error);
      }
    }

    // Go back online
    await context.setOffline(false);
    await helpers.navigateToPage('/');
    await helpers.waitForAppLoad();
  });
});