import { Hono } from 'hono';
import { stripeService } from '../services/stripe-service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = new Hono();

/**
 * Get current subscription status
 */
app.get('/subscription', async (c) => {
  const userId = c.req.header('x-user-id');
  
  if (!userId) {
    return c.json({ error: 'User ID required' }, 401);
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: {
      plan: true,
      status: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
      additionalSeats: true,
      maxRecipes: true,
      maxPantryItems: true,
      maxMealPlans: true,
      hasAiMealPlanning: true,
      hasGroceryIntegration: true,
    },
  });

  // Return free tier if no subscription
  if (!subscription) {
    return c.json({
      plan: 'FREE',
      status: 'ACTIVE',
      maxRecipes: 10,
      maxPantryItems: 20,
      maxMealPlans: 1,
      hasAiMealPlanning: false,
      hasGroceryIntegration: false,
    });
  }

  return c.json(subscription);
});

/**
 * Create checkout session for subscription
 */
app.post('/checkout', async (c) => {
  const userId = c.req.header('x-user-id');
  const { plan, additionalSeats, successUrl, cancelUrl } = await c.req.json();

  if (!userId) {
    return c.json({ error: 'User ID required' }, 401);
  }

  if (!['SMALL', 'FAMILY'].includes(plan)) {
    return c.json({ error: 'Invalid plan' }, 400);
  }

  try {
    const session = await stripeService.createCheckoutSession(
      userId,
      plan,
      additionalSeats || 0,
      successUrl || `${process.env.APP_URL}/billing/success`,
      cancelUrl || `${process.env.APP_URL}/billing`
    );

    return c.json({ url: session.url });
  } catch (error) {
    console.error('Checkout session creation failed:', error);
    return c.json({ error: 'Failed to create checkout session' }, 500);
  }
});

/**
 * Create customer portal session
 */
app.post('/portal', async (c) => {
  const userId = c.req.header('x-user-id');
  const { returnUrl } = await c.req.json();

  if (!userId) {
    return c.json({ error: 'User ID required' }, 401);
  }

  try {
    const session = await stripeService.createPortalSession(
      userId,
      returnUrl || `${process.env.APP_URL}/billing`
    );

    return c.json({ url: session.url });
  } catch (error) {
    console.error('Portal session creation failed:', error);
    return c.json({ error: 'Failed to create portal session' }, 500);
  }
});

/**
 * Update subscription (upgrade/downgrade)
 */
app.post('/subscription/update', async (c) => {
  const userId = c.req.header('x-user-id');
  const { plan, additionalSeats } = await c.req.json();

  if (!userId) {
    return c.json({ error: 'User ID required' }, 401);
  }

  if (!['SMALL', 'FAMILY'].includes(plan)) {
    return c.json({ error: 'Invalid plan' }, 400);
  }

  try {
    await stripeService.updateSubscription(userId, plan, additionalSeats || 0);
    return c.json({ success: true });
  } catch (error) {
    console.error('Subscription update failed:', error);
    return c.json({ error: 'Failed to update subscription' }, 500);
  }
});

/**
 * Cancel subscription
 */
app.post('/subscription/cancel', async (c) => {
  const userId = c.req.header('x-user-id');
  const { immediately } = await c.req.json();

  if (!userId) {
    return c.json({ error: 'User ID required' }, 401);
  }

  try {
    await stripeService.cancelSubscription(userId, immediately || false);
    return c.json({ success: true });
  } catch (error) {
    console.error('Subscription cancellation failed:', error);
    return c.json({ error: 'Failed to cancel subscription' }, 500);
  }
});

/**
 * Get usage statistics
 */
app.get('/usage', async (c) => {
  const userId = c.req.header('x-user-id');

  if (!userId) {
    return c.json({ error: 'User ID required' }, 401);
  }

  // Get current counts
  const [recipeCount, pantryCount, mealPlanCount] = await Promise.all([
    prisma.recipe.count({ where: { userId } }),
    prisma.pantryItem.count({ where: { userId } }),
    prisma.mealPlan.count({ where: { userId } }),
  ]);

  // Get subscription limits
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: {
      maxRecipes: true,
      maxPantryItems: true,
      maxMealPlans: true,
    },
  });

  const limits = subscription || {
    maxRecipes: 10,
    maxPantryItems: 20,
    maxMealPlans: 1,
  };

  return c.json({
    recipes: {
      used: recipeCount,
      limit: limits.maxRecipes,
      unlimited: limits.maxRecipes === -1,
    },
    pantryItems: {
      used: pantryCount,
      limit: limits.maxPantryItems,
      unlimited: limits.maxPantryItems === -1,
    },
    mealPlans: {
      used: mealPlanCount,
      limit: limits.maxMealPlans,
      unlimited: limits.maxMealPlans === -1,
    },
  });
});

/**
 * Check feature access
 */
app.get('/feature/:feature', async (c) => {
  const userId = c.req.header('x-user-id');
  const feature = c.req.param('feature');

  if (!userId) {
    return c.json({ error: 'User ID required' }, 401);
  }

  const validFeatures = [
    'maxRecipes',
    'maxPantryItems',
    'maxMealPlans',
    'hasAiMealPlanning',
    'hasGroceryIntegration',
  ];

  if (!validFeatures.includes(feature)) {
    return c.json({ error: 'Invalid feature' }, 400);
  }

  const hasAccess = await stripeService.checkFeatureAccess(userId, feature as any);
  
  return c.json({ 
    feature,
    hasAccess,
    value: hasAccess,
  });
});

export default app;