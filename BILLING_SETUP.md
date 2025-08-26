# Billing & Subscription Setup Guide

## Overview
NoChickenLeftBehind uses Stripe for subscription billing with three tiers:
- **Free**: Basic features (10 recipes, 20 pantry items, 1 meal plan)
- **Small Kitchen ($5/mo)**: Enhanced features (50 recipes, 100 pantry items, 4 meal plans, AI planning)
- **Family Feast ($10/mo)**: Unlimited everything + grocery integration + 4 included seats

## Setup Instructions

### 1. Stripe Account Setup
1. Create a Stripe account at https://stripe.com
2. Get your API keys from the Dashboard:
   - Secret Key: `sk_test_...`
   - Publishable Key: `pk_test_...`

### 2. Create Products & Prices in Stripe
1. Go to Stripe Dashboard > Products
2. Create three products:
   
   **Small Kitchen Plan**
   - Name: Small Kitchen
   - Price: $5.00 / month
   - Price ID: Copy this for `STRIPE_PRICE_SMALL`
   
   **Family Feast Plan**
   - Name: Family Feast
   - Price: $10.00 / month
   - Price ID: Copy this for `STRIPE_PRICE_FAMILY`
   
   **Family Add-on Seat**
   - Name: Additional Family Member
   - Price: $1.00 / month
   - Price ID: Copy this for `STRIPE_PRICE_FAMILY_ADDON`

### 3. Configure Webhook
1. Go to Stripe Dashboard > Webhooks
2. Add endpoint:
   - URL: `https://yourdomain.com/stripe/webhook`
   - Events to listen for:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
3. Copy the signing secret for `STRIPE_WEBHOOK_SECRET`

### 4. Environment Variables
Add to your `.env` file:
```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Stripe Price IDs (from Step 2)
STRIPE_PRICE_SMALL=price_xxxxx
STRIPE_PRICE_FAMILY=price_xxxxx
STRIPE_PRICE_FAMILY_ADDON=price_xxxxx

# App URL
APP_URL=http://localhost:3000
```

### 5. Database Migration
Run the migration to add billing tables:
```bash
npx prisma db push
```

## Features Implemented

### Backend Services
- **Stripe Service** (`server/services/stripe-service.ts`)
  - Customer creation/retrieval
  - Subscription management
  - Checkout session creation
  - Customer portal access
  - Feature access checking

- **Webhook Handler** (`server/routes/stripe-webhooks.ts`)
  - Secure webhook signature verification
  - Subscription lifecycle management
  - Payment event handling
  - Billing event logging

- **Billing API Routes** (`server/routes/billing.ts`)
  - GET `/api/billing/subscription` - Get current subscription
  - POST `/api/billing/checkout` - Create checkout session
  - POST `/api/billing/portal` - Access customer portal
  - POST `/api/billing/subscription/update` - Change plans
  - POST `/api/billing/subscription/cancel` - Cancel subscription
  - GET `/api/billing/usage` - View usage vs limits
  - GET `/api/billing/feature/:feature` - Check feature access

- **Feature Gating Middleware** (`server/middleware/feature-gate.ts`)
  - `requireFeature()` - Block access to premium features
  - `checkResourceLimit()` - Enforce plan limits
  - `requireAiMealPlanning()` - AI feature gate
  - `requireGroceryIntegration()` - Integration gate

### Frontend Components
All components in `src/components/billing/`:

- **PricingPlans.tsx** - Display pricing tiers with comparison
- **SubscriptionManager.tsx** - Manage current subscription
- **PaymentForm.tsx** - Secure Stripe checkout
- **UsageIndicator.tsx** - Visual usage vs limits
- **BillingHistory.tsx** - Past payments & invoices
- **BillingPage.tsx** - Main billing dashboard
- **FeatureGate.tsx** - Conditional feature rendering

### Database Schema
New models added to `prisma/schema.prisma`:
- `Subscription` - User subscription details
- `PaymentMethod` - Stored payment methods
- `BillingEvent` - Webhook event log

## Usage Examples

### Backend: Check Feature Access
```typescript
import { requireAiMealPlanning } from './middleware/feature-gate';

// Protect AI routes
app.post('/api/meal-plans/generate', 
  requireAiMealPlanning(), 
  async (c) => {
    // Only accessible with Small or Family plan
  }
);
```

### Frontend: Feature Gating
```tsx
import { FeatureGate } from './components/billing';

// Conditionally show features
<FeatureGate feature="aiPlanning">
  <AIMealPlanner />
</FeatureGate>

// Show upgrade prompt for locked features
<FeatureGate feature="groceryIntegration" showPrompt>
  <InstacartIntegration />
</FeatureGate>
```

### Check Usage Limits
```tsx
import { useBilling } from './hooks/useBilling';

const { data: usage } = useBilling.useUsage();

if (usage.recipes.used >= usage.recipes.limit) {
  // Show upgrade prompt
}
```

## Testing

### Test Card Numbers
Use these Stripe test cards:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Requires auth: `4000 0025 0000 3155`

### Test Webhook Locally
Use Stripe CLI:
```bash
stripe listen --forward-to localhost:3001/stripe/webhook
```

### Manual Testing Flow
1. Create a user account
2. Navigate to `/billing`
3. Choose a plan and click "Upgrade"
4. Enter test card details
5. Verify subscription is active
6. Test feature access
7. Cancel subscription from portal

## Deployment Checklist

- [ ] Set production Stripe keys in environment
- [ ] Configure production webhook URL
- [ ] Enable HTTPS for secure payments
- [ ] Test webhook signature verification
- [ ] Set up monitoring for failed payments
- [ ] Configure email notifications
- [ ] Test subscription lifecycle
- [ ] Verify feature gating works
- [ ] Test customer portal access
- [ ] Monitor billing events

## Support

For billing issues:
1. Check Stripe Dashboard for payment status
2. Review webhook logs in database
3. Verify environment variables are set
4. Check feature limits in subscription table
5. Test with Stripe CLI for local development