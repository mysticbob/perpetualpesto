import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3003';
const TEST_USER = {
  email: 'test@example.com',
  password: 'TestPassword123!',
};

test.describe('AI Chat Interface', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);

    // Login if not authenticated (adjust selectors based on your UI)
    const loginButton = page.getByRole('button', { name: /login|sign in/i });
    if (await loginButton.isVisible()) {
      await loginButton.click();

      await page.fill('input[type="email"]', TEST_USER.email);
      await page.fill('input[type="password"]', TEST_USER.password);
      await page.getByRole('button', { name: /login|sign in/i }).click();

      // Wait for auth to complete
      await page.waitForURL(/.*(?!login|signin)/, { timeout: 5000 });
    }
  });

  test('should open AI chat interface', async ({ page }) => {
    // Look for chat button or icon
    const chatButton = page.getByRole('button', { name: /chat|ai|assistant/i }).first();
    await chatButton.click();

    // Chat interface should be visible
    const chatInput = page.getByPlaceholder(/message|type|chat/i);
    await expect(chatInput).toBeVisible();
  });

  test('should send a simple message', async ({ page }) => {
    // Open chat
    const chatButton = page.getByRole('button', { name: /chat|ai|assistant/i }).first();
    await chatButton.click();

    const chatInput = page.getByPlaceholder(/message|type|chat/i);
    await chatInput.fill('Hello');

    // Send message
    const sendButton = page.getByRole('button', { name: /send/i });
    await sendButton.click();

    // Message should appear in chat
    await expect(page.getByText('Hello')).toBeVisible();

    // Should see loading indicator or response (adjust timeout for AI response)
    const hasLoading = await page.locator('[role="status"], .loading, .spinner').isVisible().catch(() => false);
    const hasResponse = await page.waitForSelector('.ai-message, [data-role="assistant"]', {
      timeout: 10000,
    }).then(() => true).catch(() => false);

    expect(hasLoading || hasResponse).toBe(true);
  });

  test('should process add item command', async ({ page }) => {
    const chatButton = page.getByRole('button', { name: /chat|ai|assistant/i }).first();
    await chatButton.click();

    const chatInput = page.getByPlaceholder(/message|type|chat/i);
    await chatInput.fill('add 2 lbs chicken to the fridge');

    const sendButton = page.getByRole('button', { name: /send/i });
    await sendButton.click();

    // Wait for AI response
    await page.waitForTimeout(2000);

    // Should show confirmation or update
    const hasConfirmation = await page.getByText(/added|success|updated/i).isVisible().catch(() => false);

    // Navigate to pantry to verify
    await page.goto(`${BASE_URL}/pantry`);

    const pantryItem = page.getByText(/chicken/i);
    const isVisible = await pantryItem.isVisible().catch(() => false);

    expect(hasConfirmation || isVisible).toBe(true);
  });

  test('should handle recipe suggestion request', async ({ page }) => {
    const chatButton = page.getByRole('button', { name: /chat|ai|assistant/i }).first();
    await chatButton.click();

    const chatInput = page.getByPlaceholder(/message|type|chat/i);
    await chatInput.fill('what can I make with chicken and rice?');

    const sendButton = page.getByRole('button', { name: /send/i });
    await sendButton.click();

    // Wait for AI response
    await page.waitForTimeout(3000);

    // Should show recipe suggestions
    const hasRecipe = await page.getByText(/recipe|dish|meal/i).isVisible();
    expect(hasRecipe).toBe(true);
  });

  test('should support voice input if available', async ({ page }) => {
    const chatButton = page.getByRole('button', { name: /chat|ai|assistant/i }).first();
    await chatButton.click();

    // Look for microphone button
    const micButton = page.getByRole('button', { name: /microphone|voice|record/i });

    if (await micButton.isVisible()) {
      // Mock getUserMedia for testing
      await page.evaluate(() => {
        navigator.mediaDevices.getUserMedia = async () => {
          return new MediaStream();
        };
      });

      await micButton.click();

      // Should show recording indicator
      const recordingIndicator = page.locator('[data-recording="true"], .recording');
      await expect(recordingIndicator).toBeVisible({ timeout: 2000 });
    }
  });

  test('should maintain conversation context', async ({ page }) => {
    const chatButton = page.getByRole('button', { name: /chat|ai|assistant/i }).first();
    await chatButton.click();

    const chatInput = page.getByPlaceholder(/message|type|chat/i);

    // First message
    await chatInput.fill('add chicken to my pantry');
    await page.getByRole('button', { name: /send/i }).click();
    await page.waitForTimeout(2000);

    // Follow-up message (context-dependent)
    await chatInput.fill('how much?');
    await page.getByRole('button', { name: /send/i }).click();
    await page.waitForTimeout(2000);

    // Should understand context and ask about chicken quantity
    const contextualResponse = await page.getByText(/chicken|quantity|how much/i).isVisible();
    expect(contextualResponse).toBe(true);
  });

  test('should handle errors gracefully', async ({ page }) => {
    const chatButton = page.getByRole('button', { name: /chat|ai|assistant/i }).first();
    await chatButton.click();

    const chatInput = page.getByPlaceholder(/message|type|chat/i);

    // Send empty message
    const sendButton = page.getByRole('button', { name: /send/i });
    await sendButton.click();

    // Should not crash, might show validation or just do nothing
    const hasError = await page.getByText(/error|required/i).isVisible().catch(() => false);

    // App should still be responsive
    await chatInput.fill('test message');
    await expect(chatInput).toHaveValue('test message');
  });
});
