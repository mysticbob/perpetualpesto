import { Hono } from 'hono';
import Stripe from 'stripe';
import { PrismaClient, SubscriptionStatus } from '@prisma/client';

const stripe = process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== 'sk_test_your_stripe_secret_key'
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia' as any,
    })
  : null as any;

const prisma = new PrismaClient();
const app = new Hono();

// Webhook endpoint
app.post('/webhook', async (c) => {
  if (!stripe) {
    return c.json({ error: 'Stripe not configured' }, 503);
  }
  const signature = c.req.header('stripe-signature');
  const body = await c.req.text();

  if (!signature) {
    return c.json({ error: 'Missing signature' }, 400);
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return c.json({ error: 'Invalid signature' }, 400);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Log billing event
    await prisma.billingEvent.create({
      data: {
        userId: await getUserIdFromEvent(event),
        type: event.type,
        stripeEventId: event.id,
        status: 'succeeded',
        metadata: event.data.object as any,
      },
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    
    // Log failed event
    await prisma.billingEvent.create({
      data: {
        userId: await getUserIdFromEvent(event),
        type: event.type,
        stripeEventId: event.id,
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        metadata: event.data.object as any,
      },
    });

    return c.json({ error: 'Webhook processing failed' }, 500);
  }

  return c.json({ received: true });
});

/**
 * Handle successful checkout session
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const { userId, plan, additionalSeats } = session.metadata || {};
  
  if (!userId || !plan) {
    console.error('Missing metadata in checkout session');
    return;
  }

  // Get subscription details
  const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
  
  // Create or update subscription in database
  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items.data[0].price.id,
      plan: plan as any,
      status: mapStripeStatus(subscription.status),
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      additionalSeats: parseInt(additionalSeats || '0'),
      maxRecipes: getFeatureLimits(plan).maxRecipes,
      maxPantryItems: getFeatureLimits(plan).maxPantryItems,
      maxMealPlans: getFeatureLimits(plan).maxMealPlans,
      hasAiMealPlanning: getFeatureLimits(plan).hasAiMealPlanning,
      hasGroceryIntegration: getFeatureLimits(plan).hasGroceryIntegration,
    },
    update: {
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items.data[0].price.id,
      plan: plan as any,
      status: mapStripeStatus(subscription.status),
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      additionalSeats: parseInt(additionalSeats || '0'),
    },
  });
}

/**
 * Handle subscription updates
 */
async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  
  if (!userId) {
    console.error('Missing userId in subscription metadata');
    return;
  }

  // Update subscription in database
  await prisma.subscription.update({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status: mapStripeStatus(subscription.status),
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });
}

/**
 * Handle subscription deletion
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  
  if (!userId) {
    console.error('Missing userId in subscription metadata');
    return;
  }

  // Update subscription status to canceled
  await prisma.subscription.update({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status: SubscriptionStatus.CANCELED,
    },
  });

  // Optionally, downgrade user to free tier
  // This depends on your business logic
}

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscription = invoice.subscription;
  
  if (!subscription) return;

  // Update subscription status if needed
  await prisma.subscription.update({
    where: { stripeSubscriptionId: subscription as string },
    data: {
      status: SubscriptionStatus.ACTIVE,
    },
  });
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscription = invoice.subscription;
  
  if (!subscription) return;

  // Update subscription status
  await prisma.subscription.update({
    where: { stripeSubscriptionId: subscription as string },
    data: {
      status: SubscriptionStatus.PAST_DUE,
    },
  });

  // TODO: Send email notification to user about failed payment
}

/**
 * Extract user ID from Stripe event
 */
async function getUserIdFromEvent(event: Stripe.Event): Promise<string> {
  const obj = event.data.object as any;
  
  // Try to get from metadata
  if (obj.metadata?.userId) {
    return obj.metadata.userId;
  }
  
  // Try to get from customer
  if (obj.customer) {
    const user = await prisma.user.findFirst({
      where: { stripeCustomerId: obj.customer },
      select: { id: true },
    });
    if (user) return user.id;
  }
  
  // Try to get from subscription
  if (obj.subscription) {
    const sub = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: obj.subscription },
      select: { userId: true },
    });
    if (sub) return sub.userId;
  }
  
  return 'unknown';
}

/**
 * Map Stripe status to our enum
 */
function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
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
 * Get feature limits for a plan
 */
function getFeatureLimits(plan: string) {
  const limits = {
    FREE: {
      maxRecipes: 10,
      maxPantryItems: 20,
      maxMealPlans: 1,
      hasAiMealPlanning: false,
      hasGroceryIntegration: false,
    },
    SMALL: {
      maxRecipes: 50,
      maxPantryItems: 100,
      maxMealPlans: 4,
      hasAiMealPlanning: true,
      hasGroceryIntegration: false,
    },
    FAMILY: {
      maxRecipes: -1,
      maxPantryItems: -1,
      maxMealPlans: -1,
      hasAiMealPlanning: true,
      hasGroceryIntegration: true,
    },
  };

  return limits[plan as keyof typeof limits] || limits.FREE;
}

export default app;