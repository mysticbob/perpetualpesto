import { Page, Locator, expect } from '@playwright/test';
import { TestHelpers } from './test-helpers';

export class BasePage {
  protected helpers: TestHelpers;

  constructor(protected page: Page) {
    this.helpers = new TestHelpers(page);
  }

  // Common navigation elements
  get sidebar() { return this.page.locator('[data-testid="sidebar"], .sidebar, nav'); }
  get header() { return this.page.locator('[data-testid="header"], header'); }
  get mainContent() { return this.page.locator('[data-testid="main-content"], main'); }
  
  async navigateTo(path: string) {
    await this.helpers.navigateToPage(path);
  }
}

export class DashboardPage extends BasePage {
  // Dashboard specific elements
  get welcomeMessage() { return this.page.locator('[data-testid="welcome-message"], .welcome'); }
  get recentRecipes() { return this.page.locator('[data-testid="recent-recipes"]'); }
  get pantryOverview() { return this.page.locator('[data-testid="pantry-overview"]'); }
  get expiringItems() { return this.page.locator('[data-testid="expiring-items"]'); }
  get groceryListPreview() { return this.page.locator('[data-testid="grocery-list-preview"]'); }
  get activityFeed() { return this.page.locator('[data-testid="activity-feed"]'); }

  async verifyDashboardLoaded() {
    await this.helpers.waitForAppLoad();
    await expect(this.mainContent).toBeVisible();
    // Either welcome message or dashboard content should be visible
    await expect(
      this.welcomeMessage.or(this.recentRecipes).or(this.pantryOverview)
    ).toBeVisible();
  }

  async navigateToRecipes() {
    await this.clickNavItem('recipes', '/recipes');
  }

  async navigateToPantry() {
    await this.clickNavItem('pantry', '/pantry');
  }

  async navigateToGroceryList() {
    await this.clickNavItem('grocery', '/grocery');
  }

  private async clickNavItem(itemName: string, expectedPath: string) {
    const navItem = this.page.locator(`[data-testid="nav-${itemName}"], a[href*="${expectedPath}"], button:has-text("${itemName}")`, 
      { hasText: new RegExp(itemName, 'i') });
    await navItem.click();
    await this.helpers.waitForAppLoad();
  }
}

export class RecipesPage extends BasePage {
  // Recipe page elements
  get recipeList() { return this.page.locator('[data-testid="recipe-list"]'); }
  get addRecipeButton() { return this.page.locator('[data-testid="add-recipe"], button:has-text("Add Recipe")'); }
  get searchInput() { return this.page.locator('[data-testid="recipe-search"], input[placeholder*="search" i]'); }
  get filterButtons() { return this.page.locator('[data-testid="recipe-filters"], .filter-buttons'); }
  get recipeCards() { return this.page.locator('[data-testid="recipe-card"], .recipe-card'); }

  async verifyRecipesPageLoaded() {
    await this.helpers.waitForAppLoad();
    await expect(this.recipeList.or(this.addRecipeButton)).toBeVisible();
  }

  async searchForRecipe(query: string) {
    await this.helpers.typeWithDelay(this.searchInput, query);
    await this.helpers.waitForLoadingToComplete();
  }

  async clickAddRecipe() {
    await this.helpers.clickAndWait(this.addRecipeButton, true);
  }

  async getRecipeCount() {
    await this.helpers.waitForLoadingToComplete();
    return await this.recipeCards.count();
  }

  async clickFirstRecipe() {
    const firstRecipe = this.recipeCards.first();
    await firstRecipe.click();
    await this.helpers.waitForAppLoad();
  }
}

export class PantryPage extends BasePage {
  // Pantry page elements
  get pantryItems() { return this.page.locator('[data-testid="pantry-items"]'); }
  get addItemButton() { return this.page.locator('[data-testid="add-pantry-item"], button:has-text("Add Item")'); }
  get itemCards() { return this.page.locator('[data-testid="pantry-item"], .pantry-item'); }
  get expiringSection() { return this.page.locator('[data-testid="expiring-items"]'); }
  get categoriesFilter() { return this.page.locator('[data-testid="category-filter"]'); }

  async verifyPantryPageLoaded() {
    await this.helpers.waitForAppLoad();
    await expect(this.pantryItems.or(this.addItemButton)).toBeVisible();
  }

  async addPantryItem(name: string, amount: string, unit: string) {
    await this.addItemButton.click();
    
    // Fill the add item form
    await this.helpers.typeWithDelay('[data-testid="item-name"], input[placeholder*="name" i]', name);
    await this.helpers.typeWithDelay('[data-testid="item-amount"], input[placeholder*="amount" i]', amount);
    await this.helpers.typeWithDelay('[data-testid="item-unit"], input[placeholder*="unit" i]', unit);
    
    // Submit the form
    const submitButton = this.page.locator('[data-testid="submit-item"], button[type="submit"], button:has-text("Add")');
    await submitButton.click();
    
    await this.helpers.waitForLoadingToComplete();
  }

  async getPantryItemCount() {
    await this.helpers.waitForLoadingToComplete();
    return await this.itemCards.count();
  }
}

export class GroceryListPage extends BasePage {
  // Grocery list page elements
  get groceryList() { return this.page.locator('[data-testid="grocery-list"]'); }
  get addItemButton() { return this.page.locator('[data-testid="add-grocery-item"], button:has-text("Add Item")'); }
  get groceryItems() { return this.page.locator('[data-testid="grocery-item"], .grocery-item'); }
  get clearListButton() { return this.page.locator('[data-testid="clear-list"], button:has-text("Clear")'); }
  get generateFromRecipeButton() { return this.page.locator('[data-testid="generate-from-recipe"], button:has-text("Generate")'); }

  async verifyGroceryPageLoaded() {
    await this.helpers.waitForAppLoad();
    await expect(this.groceryList.or(this.addItemButton)).toBeVisible();
  }

  async addGroceryItem(name: string, quantity: string) {
    await this.addItemButton.click();
    
    await this.helpers.typeWithDelay('[data-testid="grocery-name"], input[placeholder*="name" i]', name);
    await this.helpers.typeWithDelay('[data-testid="grocery-quantity"], input[placeholder*="quantity" i]', quantity);
    
    const submitButton = this.page.locator('[data-testid="submit-grocery"], button[type="submit"], button:has-text("Add")');
    await submitButton.click();
    
    await this.helpers.waitForLoadingToComplete();
  }

  async getGroceryItemCount() {
    await this.helpers.waitForLoadingToComplete();
    return await this.groceryItems.count();
  }

  async toggleItemComplete(itemIndex: number = 0) {
    const item = this.groceryItems.nth(itemIndex);
    const checkbox = item.locator('input[type="checkbox"], [role="checkbox"]');
    await checkbox.click();
  }
}

export class RecipeDetailPage extends BasePage {
  // Recipe detail elements
  get recipeTitle() { return this.page.locator('[data-testid="recipe-title"], .recipe-title, h1'); }
  get ingredientsList() { return this.page.locator('[data-testid="ingredients-list"], .ingredients'); }
  get instructionsList() { return this.page.locator('[data-testid="instructions-list"], .instructions'); }
  get cookModeButton() { return this.page.locator('[data-testid="cook-mode"], button:has-text("Cook Mode")'); }
  get addToGroceryButton() { return this.page.locator('[data-testid="add-to-grocery"], button:has-text("Add to Grocery")'); }
  get starRating() { return this.page.locator('[data-testid="star-rating"], .star-rating'); }

  async verifyRecipeDetailLoaded() {
    await this.helpers.waitForAppLoad();
    await expect(this.recipeTitle).toBeVisible();
    await expect(this.ingredientsList).toBeVisible();
    await expect(this.instructionsList).toBeVisible();
  }

  async rateRecipe(stars: number) {
    const ratingStars = this.starRating.locator('button, .star').nth(stars - 1);
    await ratingStars.click();
    await this.helpers.waitForLoadingToComplete();
  }

  async addIngredientsToGroceryList() {
    await this.addToGroceryButton.click();
    await this.helpers.waitForToast('Added to grocery list');
  }

  async enterCookMode() {
    await this.cookModeButton.click();
    await this.helpers.waitForAppLoad();
  }
}