import { test, expect } from '@playwright/test';

test('Debug: Check console errors', async ({ page }) => {
  const errors: string[] = [];
  
  // Capture console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  // Capture page errors
  page.on('pageerror', err => {
    errors.push(err.message);
  });
  
  // Navigate to app
  await page.goto('http://localhost:4000');
  
  // Wait a bit for errors to appear
  await page.waitForTimeout(2000);
  
  // Log all errors
  if (errors.length > 0) {
    console.log('\n🔴 Console Errors Found:');
    errors.forEach((err, i) => {
      console.log(`  ${i + 1}. ${err}`);
    });
  } else {
    console.log('\n✅ No console errors');
  }
  
  // Check if React is loaded
  const hasReact = await page.evaluate(() => {
    return typeof (window as any).React !== 'undefined';
  });
  
  console.log(`\n📦 React loaded: ${hasReact}`);
  
  // Check page content
  const bodyText = await page.locator('body').textContent();
  console.log(`\n📄 Page content: ${bodyText?.substring(0, 100) || 'EMPTY'}`);
  
  // Take screenshot for debugging
  await page.screenshot({ path: 'debug-screenshot.png' });
  console.log('\n📸 Screenshot saved to debug-screenshot.png');
});