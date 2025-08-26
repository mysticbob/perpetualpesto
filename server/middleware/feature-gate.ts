import { Context, Next } from 'hono';
import { PrismaClient, SubscriptionStatus } from '@prisma/client';

const prisma = new PrismaClient();

interface FeatureLimits {
  maxRecipes: number;
  maxPantryItems: number;
  maxMealPlans: number;
  hasAiMealPlanning: boolean;
  hasGroceryIntegration: boolean;
}

const FREE_TIER_LIMITS: FeatureLimits = {
  maxRecipes: 10,
  maxPantryItems: 20,
  maxMealPlans: 1,
  hasAiMealPlanning: false,
  hasGroceryIntegration: false,
};

/**
 * Middleware to check if user has access to a specific feature
 */
export function requireFeature(feature: keyof FeatureLimits) {
  return async (c: Context, next: Next) => {
    const userId = c.req.header('x-user-id');
    
    if (!userId) {
      return c.json({ error: 'Authentication required' }, 401);
    }

    const hasAccess = await checkFeatureAccess(userId, feature);
    
    if (!hasAccess) {
      return c.json({ 
        error: 'Feature not available in your plan',
        feature,
        upgradeRequired: true,
      }, 403);
    }

    await next();
  };
}

/**
 * Middleware to check resource limits (recipes, pantry items, meal plans)
 */
export function checkResourceLimit(resource: 'recipes' | 'pantryItems' | 'mealPlans') {
  return async (c: Context, next: Next) => {
    const userId = c.req.header('x-user-id');
    
    if (!userId) {
      return c.json({ error: 'Authentication required' }, 401);
    }

    const limitKey = `max${resource.charAt(0).toUpperCase() + resource.slice(1)}` as keyof FeatureLimits;
    const limits = await getUserLimits(userId);
    const limit = limits[limitKey] as number;

    // Unlimited (-1) means no restriction
    if (limit === -1) {
      await next();
      return;
    }

    // Count current resources
    let currentCount = 0;
    switch (resource) {
      case 'recipes':
        currentCount = await prisma.recipe.count({ where: { userId } });
        break;
      case 'pantryItems':
        currentCount = await prisma.pantryItem.count({ where: { userId } });
        break;
      case 'mealPlans':
        currentCount = await prisma.mealPlan.count({ where: { userId } });
        break;
    }

    if (currentCount >= limit) {
      return c.json({
        error: `You have reached the limit for ${resource}`,
        limit,
        current: currentCount,
        upgradeRequired: true,
      }, 403);
    }

    // Add remaining quota to context for use in handlers
    c.set('remainingQuota', limit - currentCount);
    
    await next();
  };
}

/**
 * Middleware for AI meal planning feature
 */
export function requireAiMealPlanning() {
  return requireFeature('hasAiMealPlanning');
}

/**
 * Middleware for grocery integration feature
 */
export function requireGroceryIntegration() {
  return requireFeature('hasGroceryIntegration');
}

/**
 * Get user's subscription limits
 */
async function getUserLimits(userId: string): Promise<FeatureLimits> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: {
      status: true,
      maxRecipes: true,
      maxPantryItems: true,
      maxMealPlans: true,
      hasAiMealPlanning: true,
      hasGroceryIntegration: true,
    },
  });

  // Return free tier if no subscription or inactive
  if (!subscription || subscription.status !== SubscriptionStatus.ACTIVE) {
    return FREE_TIER_LIMITS;
  }

  return {
    maxRecipes: subscription.maxRecipes,
    maxPantryItems: subscription.maxPantryItems,
    maxMealPlans: subscription.maxMealPlans,
    hasAiMealPlanning: subscription.hasAiMealPlanning,
    hasGroceryIntegration: subscription.hasGroceryIntegration,
  };
}

/**
 * Check if user has access to a specific feature
 */
async function checkFeatureAccess(userId: string, feature: keyof FeatureLimits): Promise<boolean> {
  const limits = await getUserLimits(userId);
  const value = limits[feature];
  
  // For boolean features
  if (typeof value === 'boolean') {
    return value;
  }
  
  // For numeric limits, -1 means unlimited, positive means has access
  return value === -1 || value > 0;
}

/**
 * Decorator to add subscription info to response headers
 */
export async function addSubscriptionHeaders(c: Context, next: Next) {
  const userId = c.req.header('x-user-id');
  
  if (userId) {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      select: {
        plan: true,
        status: true,
      },
    });

    if (subscription) {
      c.header('X-Subscription-Plan', subscription.plan);
      c.header('X-Subscription-Status', subscription.status);
    } else {
      c.header('X-Subscription-Plan', 'FREE');
      c.header('X-Subscription-Status', 'ACTIVE');
    }
  }

  await next();
}