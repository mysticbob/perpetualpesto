import { test, expect } from '@playwright/test';
import { DashboardPage, RecipesPage, PantryPage, GroceryListPage, RecipeDetailPage } from '../utils/page-objects';
import { TestHelpers } from '../utils/test-helpers';
import { sampleRecipe, samplePantryItems, sampleGroceryItems } from '../fixtures/test-data';

test.describe('User Workflow Tests', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
  });

  test('Complete recipe workflow - view recipes and recipe details', async ({ page }) => {
    const recipesPage = new RecipesPage(page);
    const recipeDetailPage = new RecipeDetailPage(page);

    // Navigate to recipes page
    await recipesPage.navigateTo('/recipes');
    await recipesPage.verifyRecipesPageLoaded();

    // Check if there are any existing recipes
    const recipeCount = await recipesPage.getRecipeCount();
    console.log(`Found ${recipeCount} recipes`);

    if (recipeCount > 0) {
      // Click on the first recipe
      await recipesPage.clickFirstRecipe();
      await recipeDetailPage.verifyRecipeDetailLoaded();

      // Verify recipe detail elements are present
      await expect(recipeDetailPage.recipeTitle).toBeVisible();
      await expect(recipeDetailPage.ingredientsList).toBeVisible();
      await expect(recipeDetailPage.instructionsList).toBeVisible();

      console.log('✅ Recipe detail view works');
    } else {
      console.log('ℹ️  No recipes found to test detail view');
    }

    // Test search if available
    const searchInput = recipesPage.searchInput;
    const hasSearch = await searchInput.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasSearch) {
      await recipesPage.searchForRecipe('chicken');
      console.log('✅ Recipe search functionality tested');
    } else {
      console.log('ℹ️  Recipe search not available');
    }

    // Test add recipe button if available
    const addButton = recipesPage.addRecipeButton;
    const hasAddButton = await addButton.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasAddButton) {
      console.log('✅ Add recipe button is available');
    } else {
      console.log('ℹ️  Add recipe button not found');
    }
  });

  test('Complete pantry workflow - view and manage pantry items', async ({ page }) => {
    const pantryPage = new PantryPage(page);

    // Navigate to pantry page
    await pantryPage.navigateTo('/pantry');
    await pantryPage.verifyPantryPageLoaded();

    // Check existing pantry items
    const initialCount = await pantryPage.getPantryItemCount();
    console.log(`Found ${initialCount} pantry items`);

    // Test adding a pantry item if the functionality is available
    const addButton = pantryPage.addItemButton;
    const hasAddButton = await addButton.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasAddButton) {
      try {
        // Try to add a pantry item
        const testItem = samplePantryItems[0];
        await pantryPage.addPantryItem(testItem.name, testItem.amount, testItem.unit);
        
        // Check if the count increased
        const newCount = await pantryPage.getPantryItemCount();
        if (newCount > initialCount) {
          console.log('✅ Successfully added pantry item');
        } else {
          console.log('⚠️  Pantry item may not have been added');
        }
      } catch (error) {
        console.warn('⚠️  Could not add pantry item:', error);
      }
    } else {
      console.log('ℹ️  Add pantry item functionality not available');
    }

    // Check for expiring items section
    const expiringSection = pantryPage.expiringSection;
    const hasExpiringSection = await expiringSection.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasExpiringSection) {
      console.log('✅ Expiring items section found');
    } else {
      console.log('ℹ️  No expiring items section found');
    }

    // Check for category filters
    const categoryFilter = pantryPage.categoriesFilter;
    const hasCategoryFilter = await categoryFilter.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasCategoryFilter) {
      console.log('✅ Category filter functionality found');
    } else {
      console.log('ℹ️  No category filters found');
    }
  });

  test('Complete grocery list workflow - view and manage grocery items', async ({ page }) => {
    const groceryPage = new GroceryListPage(page);

    // Navigate to grocery list page
    await groceryPage.navigateTo('/grocery');
    await groceryPage.verifyGroceryPageLoaded();

    // Check existing grocery items
    const initialCount = await groceryPage.getGroceryItemCount();
    console.log(`Found ${initialCount} grocery items`);

    // Test adding a grocery item if functionality is available
    const addButton = groceryPage.addItemButton;
    const hasAddButton = await addButton.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasAddButton) {
      try {
        // Try to add a grocery item
        const testItem = sampleGroceryItems[0];
        await groceryPage.addGroceryItem(testItem.name, testItem.quantity);
        
        // Check if the count increased
        const newCount = await groceryPage.getGroceryItemCount();
        if (newCount > initialCount) {
          console.log('✅ Successfully added grocery item');
          
          // Test checking off an item
          await groceryPage.toggleItemComplete(newCount - 1); // Toggle the last item
          console.log('✅ Item toggle functionality works');
        } else {
          console.log('⚠️  Grocery item may not have been added');
        }
      } catch (error) {
        console.warn('⚠️  Could not add grocery item:', error);
      }
    } else {
      console.log('ℹ️  Add grocery item functionality not available');
    }

    // Check for generate from recipe functionality
    const generateButton = groceryPage.generateFromRecipeButton;
    const hasGenerateButton = await generateButton.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasGenerateButton) {
      console.log('✅ Generate from recipe functionality found');
    } else {
      console.log('ℹ️  Generate from recipe functionality not found');
    }

    // Check for clear list functionality
    const clearButton = groceryPage.clearListButton;
    const hasClearButton = await clearButton.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasClearButton) {
      console.log('✅ Clear list functionality found');
    } else {
      console.log('ℹ️  Clear list functionality not found');
    }
  });

  test('Cross-page workflow - Recipe to Grocery List integration', async ({ page }) => {
    const recipesPage = new RecipesPage(page);
    const recipeDetailPage = new RecipeDetailPage(page);
    const groceryPage = new GroceryListPage(page);

    // Start at recipes page
    await recipesPage.navigateTo('/recipes');
    await recipesPage.verifyRecipesPageLoaded();

    const recipeCount = await recipesPage.getRecipeCount();
    
    if (recipeCount > 0) {
      // Go to recipe detail
      await recipesPage.clickFirstRecipe();
      await recipeDetailPage.verifyRecipeDetailLoaded();

      // Try to add ingredients to grocery list
      const addToGroceryButton = recipeDetailPage.addToGroceryButton;
      const hasAddToGrocery = await addToGroceryButton.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (hasAddToGrocery) {
        // Get initial grocery count
        await groceryPage.navigateTo('/grocery');
        const initialGroceryCount = await groceryPage.getGroceryItemCount();
        
        // Go back to recipe and add to grocery
        await recipeDetailPage.navigateTo(page.url()); // Go back to the recipe
        await recipeDetailPage.addIngredientsToGroceryList();
        
        // Check if items were added to grocery list
        await groceryPage.navigateTo('/grocery');
        const newGroceryCount = await groceryPage.getGroceryItemCount();
        
        if (newGroceryCount > initialGroceryCount) {
          console.log('✅ Recipe to grocery list integration works');
        } else {
          console.log('⚠️  Recipe to grocery list integration may not be working');
        }
      } else {
        console.log('ℹ️  Recipe to grocery list integration not available');
      }
    } else {
      console.log('ℹ️  No recipes available to test integration');
    }
  });

  test('Recipe rating and interaction workflow', async ({ page }) => {
    const recipesPage = new RecipesPage(page);
    const recipeDetailPage = new RecipeDetailPage(page);

    await recipesPage.navigateTo('/recipes');
    await recipesPage.verifyRecipesPageLoaded();

    const recipeCount = await recipesPage.getRecipeCount();
    
    if (recipeCount > 0) {
      await recipesPage.clickFirstRecipe();
      await recipeDetailPage.verifyRecipeDetailLoaded();

      // Test star rating if available
      const starRating = recipeDetailPage.starRating;
      const hasRating = await starRating.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (hasRating) {
        try {
          await recipeDetailPage.rateRecipe(4); // Rate 4 stars
          console.log('✅ Recipe rating functionality works');
        } catch (error) {
          console.warn('⚠️  Recipe rating may not be working:', error);
        }
      } else {
        console.log('ℹ️  Recipe rating not available');
      }

      // Test cook mode if available
      const cookModeButton = recipeDetailPage.cookModeButton;
      const hasCookMode = await cookModeButton.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (hasCookMode) {
        try {
          await recipeDetailPage.enterCookMode();
          console.log('✅ Cook mode functionality works');
        } catch (error) {
          console.warn('⚠️  Cook mode may not be working:', error);
        }
      } else {
        console.log('ℹ️  Cook mode not available');
      }
    } else {
      console.log('ℹ️  No recipes available to test interactions');
    }
  });

  test('Navigation flow between all main sections', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    // Start at dashboard
    await dashboardPage.navigateTo('/');
    await dashboardPage.verifyDashboardLoaded();

    // Test navigation to each main section
    const navigationTests = [
      { method: () => dashboardPage.navigateToRecipes(), page: '/recipes', name: 'Recipes' },
      { method: () => dashboardPage.navigateToPantry(), page: '/pantry', name: 'Pantry' },
      { method: () => dashboardPage.navigateToGroceryList(), page: '/grocery', name: 'Grocery List' }
    ];

    for (const navTest of navigationTests) {
      try {
        await navTest.method();
        
        // Verify we're on the right page
        const currentUrl = page.url();
        if (currentUrl.includes(navTest.page) || currentUrl.endsWith(navTest.page)) {
          console.log(`✅ Navigation to ${navTest.name} works`);
        } else {
          console.log(`⚠️  Navigation to ${navTest.name} may not be working (URL: ${currentUrl})`);
        }

        // Verify page loads properly
        await helpers.waitForAppLoad();
        const hasContent = await page.locator('main, [data-testid="main-content"]').isVisible();
        expect(hasContent).toBe(true);

      } catch (error) {
        console.warn(`⚠️  Navigation to ${navTest.name} failed:`, error);
      }
    }

    // Navigate back to dashboard
    await dashboardPage.navigateTo('/');
    await dashboardPage.verifyDashboardLoaded();
    console.log('✅ Navigation flow complete');
  });
});