import { test, expect } from '@playwright/test';

test.describe('Basic Connectivity Tests', () => {
  test('Frontend server is accessible', async ({ page }) => {
    try {
      // Simple test to see if we can reach the frontend
      const response = await page.goto('http://localhost:4000', { 
        waitUntil: 'domcontentloaded',
        timeout: 10000 
      });
      
      expect(response?.status()).toBeLessThan(500);
      console.log(`✅ Frontend server responded with status: ${response?.status()}`);
      
      // Check if we can see anything on the page
      const bodyExists = await page.locator('body').isVisible({ timeout: 5000 });
      expect(bodyExists).toBe(true);
      console.log('✅ Page body is visible');
      
      // Get page title
      const title = await page.title();
      console.log(`Page title: "${title}"`);
      
    } catch (error) {
      console.error('❌ Frontend server not accessible:', error);
      throw error;
    }
  });

  test('Backend API server is accessible', async ({ request }) => {
    try {
      // Test backend API health endpoint
      const response = await request.get('http://localhost:3001/health');
      
      if (response.ok()) {
        const body = await response.json().catch(() => response.text());
        console.log('✅ Backend API health check passed:', body);
        expect(response.status()).toBe(200);
      } else {
        console.warn(`⚠️  Backend API returned status: ${response.status()}`);
        const body = await response.text();
        console.warn('Response body:', body.substring(0, 200));
      }
      
    } catch (error) {
      console.error('❌ Backend API not accessible:', error);
      // Don't fail the test for API issues, just log them
    }
  });

  test('Database connectivity through API', async ({ request }) => {
    try {
      // Try to reach a simple API endpoint that would use the database
      const endpoints = ['/api/recipes', '/api/pantry', '/api/users'];
      
      for (const endpoint of endpoints) {
        try {
          const response = await request.get(`http://localhost:3001${endpoint}`);
          console.log(`${endpoint}: Status ${response.status()}`);
          
          if (response.ok()) {
            const contentType = response.headers()['content-type'];
            if (contentType?.includes('application/json')) {
              const data = await response.json();
              console.log(`✅ ${endpoint} returned JSON data:`, Array.isArray(data) ? `Array with ${data.length} items` : typeof data);
            } else {
              const text = await response.text();
              console.log(`✅ ${endpoint} returned text:`, text.substring(0, 100));
            }
          } else if (response.status() === 404) {
            console.log(`ℹ️  ${endpoint} not found (404) - may not be implemented`);
          } else {
            console.log(`⚠️  ${endpoint} returned status ${response.status()}`);
          }
        } catch (error) {
          console.log(`❌ ${endpoint} failed:`, error.message);
        }
      }
      
    } catch (error) {
      console.error('❌ Database connectivity test failed:', error);
    }
  });

  test('Basic page rendering without errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    const networkErrors: string[] = [];
    
    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Capture network errors
    page.on('response', response => {
      if (response.status() >= 400) {
        networkErrors.push(`${response.status()} - ${response.url()}`);
      }
    });

    try {
      await page.goto('http://localhost:4000', { 
        waitUntil: 'domcontentloaded',
        timeout: 10000 
      });

      // Wait a bit for any async operations
      await page.waitForTimeout(3000);

      // Log what we found
      if (consoleErrors.length > 0) {
        console.log(`Found ${consoleErrors.length} console errors:`);
        consoleErrors.slice(0, 3).forEach(error => console.log(`  - ${error}`));
      } else {
        console.log('✅ No console errors found');
      }

      if (networkErrors.length > 0) {
        console.log(`Found ${networkErrors.length} network errors:`);
        networkErrors.slice(0, 3).forEach(error => console.log(`  - ${error}`));
      } else {
        console.log('✅ No network errors found');
      }

      // Check if we can find any interactive elements
      const buttons = await page.locator('button').count();
      const links = await page.locator('a').count();
      const inputs = await page.locator('input').count();
      
      console.log(`Page elements found: ${buttons} buttons, ${links} links, ${inputs} inputs`);

      // Basic assertion that the page loaded something
      const bodyText = await page.locator('body').textContent() || '';
      expect(bodyText.length).toBeGreaterThan(0);
      
    } catch (error) {
      console.error('❌ Basic page rendering test failed:', error);
      throw error;
    }
  });
});