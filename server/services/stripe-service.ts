import Stripe from 'stripe';
import { PrismaClient, SubscriptionPlan, SubscriptionStatus } from '@prisma/client';

const prisma = new PrismaClient();

// Initialize Stripe with your secret key
const stripe = process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== 'sk_test_your_stripe_secret_key'
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia' as any,
    })
  : null as any; // Temporary null for testing without Stripe

// Pricing configuration
export const PRICING = {
  FREE: {
    plan: SubscriptionPlan.FREE,
    price: 0,
    maxRecipes: 10,
    maxPantryItems: 20,
    maxMealPlans: 1,
    hasAiMealPlanning: false,
    hasGroceryIntegration: false,
  },
  SMALL: {
    plan: SubscriptionPlan.SMALL,
    price: 500, // $5 in cents
    stripePriceId: process.env.STRIPE_PRICE_SMALL,
    maxRecipes: 50,
    maxPantryItems: 100,
    maxMealPlans: 4,
    hasAiMealPlanning: true,
    hasGroceryIntegration: false,
  },
  FAMILY: {
    plan: SubscriptionPlan.FAMILY,
    price: 1000, // $10 in cents
    stripePriceId: process.env.STRIPE_PRICE_FAMILY,
    maxRecipes: -1, // unlimited
    maxPantryItems: -1, // unlimited
    maxMealPlans: -1, // unlimited
    hasAiMealPlanning: true,
    hasGroceryIntegration: true,
    includedSeats: 4,
    additionalSeatPrice: 100, // $1 per additional seat
    additionalSeatPriceId: process.env.STRIPE_PRICE_FAMILY_ADDON,
  },
};

export class StripeService {
  /**
   * Create or retrieve a Stripe customer for a user
   */
  async createOrRetrieveCustomer(userId: string, email: string, name?: string) {
    if (!stripe) {
      console.warn('Stripe not initialized - using test mode');
      return 'test_customer_' + userId;
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });

    if (user?.stripeCustomerId) {
      return user.stripeCustomerId;
    }

    // Create new Stripe customer
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        userId,
      },
    });

    // Update user with Stripe customer ID
    await prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customer.id },
    });

    return customer.id;
  }

  /**
   * Create a subscription for a user
   */
  async createSubscription(
    userId: string,
    plan: 'SMALL' | 'FAMILY',
    paymentMethodId: string,
    additionalSeats = 0
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true, stripeCustomerId: true },
    });

    if (!user) throw new Error('User not found');

    // Ensure customer exists in Stripe
    const customerId = await this.createOrRetrieveCustomer(
      userId,
      user.email,
      user.name || undefined
    );

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    // Set as default payment method
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Build subscription items
    const items: Stripe.SubscriptionCreateParams.Item[] = [
      {
        price: PRICING[plan].stripePriceId,
      },
    ];

    // Add additional seats for family plan
    if (plan === 'FAMILY' && additionalSeats > 0) {
      items.push({
        price: PRICING.FAMILY.additionalSeatPriceId,
        quantity: additionalSeats,
      });
    }

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items,
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        userId,
        plan,
        additionalSeats: additionalSeats.toString(),
      },
    });

    // Save subscription to database
    const planConfig = PRICING[plan];
    await prisma.subscription.create({
      data: {
        userId,
        stripeSubscriptionId: subscription.id,
        stripePriceId: planConfig.stripePriceId,
        plan: SubscriptionPlan[plan],
        status: this.mapStripeStatus(subscription.status),
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        additionalSeats,
        maxRecipes: planConfig.maxRecipes,
        maxPantryItems: planConfig.maxPantryItems,
        maxMealPlans: planConfig.maxMealPlans,
        hasAiMealPlanning: planConfig.hasAiMealPlanning,
        hasGroceryIntegration: planConfig.hasGroceryIntegration,
      },
    });

    return subscription;
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(userId: string, immediately = false) {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      select: { stripeSubscriptionId: true },
    });

    if (!subscription?.stripeSubscriptionId) {
      throw new Error('No active subscription found');
    }

    if (immediately) {
      // Cancel immediately
      await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
      
      await prisma.subscription.update({
        where: { userId },
        data: { status: SubscriptionStatus.CANCELED },
      });
    } else {
      // Cancel at period end
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
      
      await prisma.subscription.update({
        where: { userId },
        data: { cancelAtPeriodEnd: true },
      });
    }
  }

  /**
   * Update subscription (upgrade/downgrade plan)
   */
  async updateSubscription(
    userId: string,
    newPlan: 'SMALL' | 'FAMILY',
    additionalSeats = 0
  ) {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      select: { stripeSubscriptionId: true },
    });

    if (!subscription?.stripeSubscriptionId) {
      throw new Error('No active subscription found');
    }

    // Get current subscription from Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(
      subscription.stripeSubscriptionId
    );

    // Update subscription items
    const items: Stripe.SubscriptionUpdateParams.Item[] = [
      {
        id: stripeSubscription.items.data[0].id,
        price: PRICING[newPlan].stripePriceId,
      },
    ];

    // Handle family plan add-ons
    if (newPlan === 'FAMILY') {
      const addonItem = stripeSubscription.items.data.find(
        item => item.price.id === PRICING.FAMILY.additionalSeatPriceId
      );

      if (additionalSeats > 0) {
        if (addonItem) {
          items.push({
            id: addonItem.id,
            quantity: additionalSeats,
          });
        } else {
          items.push({
            price: PRICING.FAMILY.additionalSeatPriceId,
            quantity: additionalSeats,
          });
        }
      } else if (addonItem) {
        // Remove addon if no additional seats
        items.push({
          id: addonItem.id,
          deleted: true,
        });
      }
    }

    // Update Stripe subscription
    const updatedSubscription = await stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      { items }
    );

    // Update database
    const planConfig = PRICING[newPlan];
    await prisma.subscription.update({
      where: { userId },
      data: {
        plan: SubscriptionPlan[newPlan],
        stripePriceId: planConfig.stripePriceId,
        additionalSeats,
        maxRecipes: planConfig.maxRecipes,
        maxPantryItems: planConfig.maxPantryItems,
        maxMealPlans: planConfig.maxMealPlans,
        hasAiMealPlanning: planConfig.hasAiMealPlanning,
        hasGroceryIntegration: planConfig.hasGroceryIntegration,
      },
    });

    return updatedSubscription;
  }

  /**
   * Create a checkout session for subscription
   */
  async createCheckoutSession(
    userId: string,
    plan: 'SMALL' | 'FAMILY',
    additionalSeats = 0,
    successUrl: string,
    cancelUrl: string
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true, stripeCustomerId: true },
    });

    if (!user) throw new Error('User not found');

    const customerId = await this.createOrRetrieveCustomer(
      userId,
      user.email,
      user.name || undefined
    );

    // Build line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price: PRICING[plan].stripePriceId,
        quantity: 1,
      },
    ];

    if (plan === 'FAMILY' && additionalSeats > 0) {
      lineItems.push({
        price: PRICING.FAMILY.additionalSeatPriceId,
        quantity: additionalSeats,
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        plan,
        additionalSeats: additionalSeats.toString(),
      },
    });

    return session;
  }

  /**
   * Create a customer portal session
   */
  async createPortalSession(userId: string, returnUrl: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });

    if (!user?.stripeCustomerId) {
      throw new Error('No Stripe customer found');
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: returnUrl,
    });

    return session;
  }

  /**
   * Map Stripe subscription status to our enum
   */
  private mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
    const statusMap: Record<Stripe.Subscription.Status, SubscriptionStatus> = {
      active: SubscriptionStatus.ACTIVE,
      past_due: SubscriptionStatus.PAST_DUE,
      canceled: SubscriptionStatus.CANCELED,
      incomplete: SubscriptionStatus.INCOMPLETE,
      incomplete_expired: SubscriptionStatus.INCOMPLETE,
      trialing: SubscriptionStatus.TRIALING,
      unpaid: SubscriptionStatus.PAST_DUE,
      paused: SubscriptionStatus.CANCELED,
    };

    return statusMap[status] || SubscriptionStatus.INCOMPLETE;
  }

  /**
   * Check if user has access to a feature
   */
  async checkFeatureAccess(userId: string, feature: keyof typeof PRICING.FREE) {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      select: {
        plan: true,
        status: true,
        [feature]: true,
      },
    });

    // Free tier if no subscription
    if (!subscription || subscription.status !== SubscriptionStatus.ACTIVE) {
      return PRICING.FREE[feature];
    }

    return subscription[feature];
  }
}

export const stripeService = new StripeService();