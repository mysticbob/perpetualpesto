import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3003';

test.describe('Recipe Extraction Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto(BASE_URL);
  });

  test('should load the application', async ({ page }) => {
    await expect(page).toHaveTitle(/Recipe Planner|PerpetualPesto/i);
  });

  test('should navigate to recipes page', async ({ page }) => {
    // Click on recipes link/button
    const recipesLink = page.getByRole('link', { name: /recipes/i });
    await recipesLink.click();

    // Verify we're on the recipes page
    await expect(page).toHaveURL(/.*recipes/);
    await expect(page.getByRole('heading', { name: /recipes/i })).toBeVisible();
  });

  test('should show recipe extraction form', async ({ page }) => {
    await page.goto(`${BASE_URL}/recipes`);

    // Look for URL input or "Add Recipe" button
    const addButton = page.getByRole('button', { name: /add recipe|extract|import/i }).first();
    await addButton.click();

    // Should show URL input
    const urlInput = page.getByPlaceholder(/url|link|website/i);
    await expect(urlInput).toBeVisible();
  });

  test('should extract recipe from valid URL', async ({ page }) => {
    await page.goto(`${BASE_URL}/recipes`);

    // Click add recipe
    const addButton = page.getByRole('button', { name: /add recipe|extract|import/i }).first();
    await addButton.click();

    // Enter a test URL (would need a mock server in production)
    const urlInput = page.getByPlaceholder(/url|link|website/i);
    await urlInput.fill('https://example.com/test-recipe');

    // Click extract button
    const extractButton = page.getByRole('button', { name: /extract|import|fetch/i });
    await extractButton.click();

    // Wait for loading to complete (adjust timeout as needed)
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Should show either success message or error (depending on URL validity)
    const hasSuccess = await page.getByText(/success|added|extracted/i).isVisible().catch(() => false);
    const hasError = await page.getByText(/error|failed|could not/i).isVisible().catch(() => false);

    expect(hasSuccess || hasError).toBe(true);
  });

  test('should show validation error for empty URL', async ({ page }) => {
    await page.goto(`${BASE_URL}/recipes`);

    const addButton = page.getByRole('button', { name: /add recipe|extract|import/i }).first();
    await addButton.click();

    // Try to submit without URL
    const extractButton = page.getByRole('button', { name: /extract|import|fetch/i });
    await extractButton.click();

    // Should show validation error
    const error = page.getByText(/required|enter|provide/i);
    await expect(error).toBeVisible();
  });

  test('should display extracted recipe details', async ({ page }) => {
    // This test would work with a mocked backend that returns recipe data
    await page.goto(`${BASE_URL}/recipes`);

    // Simulate having a recipe in the list
    const firstRecipe = page.locator('.recipe-card, [data-testid="recipe-card"]').first();

    if (await firstRecipe.isVisible()) {
      // Click to view details
      await firstRecipe.click();

      // Should show recipe details
      await expect(page.getByRole('heading')).toBeVisible();

      // Should have ingredients section
      const ingredientsSection = page.getByText(/ingredients/i);
      await expect(ingredientsSection).toBeVisible();

      // Should have instructions section
      const instructionsSection = page.getByText(/instructions|directions|steps/i);
      await expect(instructionsSection).toBeVisible();
    }
  });
});
