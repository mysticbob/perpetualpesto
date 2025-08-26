/**
 * PricingPlans Component
 * Displays the three pricing tiers with upgrade options
 */

import React from 'react'
import {
  Box,
  SimpleGrid,
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  Badge,
  List,
  ListItem,
  ListIcon,
  useColorModeValue,
  Container,
  Icon,
  Divider,
  Tooltip,
} from '@chakra-ui/react'
import { CheckIcon, CloseIcon } from '@chakra-ui/icons'
import { FaCrown } from 'react-icons/fa'
import { useSubscription, useCreateCheckout } from '../../hooks/useBilling'
import { useAuth } from '../../contexts/AuthContext'
import type { PricingPlan, PlanTier } from '../../types/billing'

// Define pricing plans
const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    limits: {
      recipes: 10,
      pantryItems: 20,
      mealPlans: 1,
      aiPlanning: false,
      groceryIntegration: false,
      seats: 1,
    },
    features: [
      '10 recipes',
      '20 pantry items',
      '1 meal plan',
      'Basic recipe extraction',
      'Manual meal planning',
      'Shopping list generation',
    ],
  },
  {
    id: 'small',
    name: 'Small Kitchen',
    price: 5,
    limits: {
      recipes: 50,
      pantryItems: 100,
      mealPlans: 4,
      aiPlanning: true,
      groceryIntegration: false,
      seats: 1,
    },
    features: [
      '50 recipes',
      '100 pantry items',
      '4 meal plans',
      'AI-powered meal planning',
      'Smart recipe suggestions',
      'Nutritional analysis',
      'Priority support',
    ],
    popular: true,
  },
  {
    id: 'family',
    name: 'Family Feast',
    price: 10,
    pricePerAdditionalSeat: 1,
    limits: {
      recipes: -1, // Unlimited
      pantryItems: -1, // Unlimited
      mealPlans: -1, // Unlimited
      aiPlanning: true,
      groceryIntegration: true,
      seats: 4,
    },
    features: [
      'Unlimited recipes',
      'Unlimited pantry items',
      'Unlimited meal plans',
      'AI-powered meal planning',
      'Grocery store integration',
      'Family sharing (4 seats included)',
      'Additional seats at $1/month',
      'Advanced analytics',
      'Recipe collaboration',
      'Premium support',
    ],
  },
]

interface PricingCardProps {
  plan: PricingPlan
  currentPlan?: PlanTier
  onUpgrade: (planTier: PlanTier) => void
  isLoading: boolean
}

const PricingCard: React.FC<PricingCardProps> = ({ plan, currentPlan, onUpgrade, isLoading }) => {
  const bgColor = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')
  const popularBg = useColorModeValue('purple.500', 'purple.400')
  const isCurrentPlan = currentPlan === plan.id
  const isDowngrade = currentPlan === 'family' && plan.id !== 'family' || 
                      currentPlan === 'small' && plan.id === 'free'

  return (
    <Box
      position="relative"
      bg={bgColor}
      borderWidth="1px"
      borderColor={isCurrentPlan ? 'purple.500' : borderColor}
      borderRadius="xl"
      p={8}
      shadow={plan.popular ? 'xl' : 'md'}
      transform={plan.popular ? 'scale(1.05)' : 'scale(1)'}
      transition="all 0.3s"
      _hover={{ shadow: 'xl' }}
    >
      {plan.popular && (
        <Badge
          position="absolute"
          top="-12px"
          left="50%"
          transform="translateX(-50%)"
          bg={popularBg}
          color="white"
          px={4}
          py={1}
          borderRadius="full"
          fontSize="sm"
          fontWeight="bold"
        >
          MOST POPULAR
        </Badge>
      )}

      {isCurrentPlan && (
        <Badge
          position="absolute"
          top={plan.popular ? "20px" : "-12px"}
          right="20px"
          colorScheme="green"
          px={3}
          py={1}
          borderRadius="full"
          fontSize="sm"
        >
          CURRENT PLAN
        </Badge>
      )}

      <VStack spacing={6} align="stretch">
        <VStack spacing={2}>
          <HStack>
            <Heading size="lg">{plan.name}</Heading>
            {plan.id === 'family' && (
              <Icon as={FaCrown} color="gold" boxSize={6} />
            )}
          </HStack>
          <HStack alignItems="baseline">
            <Text fontSize="4xl" fontWeight="bold">
              ${plan.price}
            </Text>
            <Text fontSize="lg" color="gray.500">
              /month
            </Text>
          </HStack>
          {plan.pricePerAdditionalSeat && (
            <Text fontSize="sm" color="gray.500">
              +${plan.pricePerAdditionalSeat} per additional user
            </Text>
          )}
        </VStack>

        <Divider />

        <List spacing={3}>
          {plan.features.map((feature, index) => (
            <ListItem key={index} display="flex" alignItems="center">
              <ListIcon as={CheckIcon} color="green.500" />
              <Text fontSize="sm">{feature}</Text>
            </ListItem>
          ))}
        </List>

        <Button
          colorScheme={isCurrentPlan ? 'gray' : isDowngrade ? 'orange' : 'purple'}
          size="lg"
          width="full"
          isDisabled={isCurrentPlan}
          isLoading={isLoading}
          onClick={() => onUpgrade(plan.id)}
        >
          {isCurrentPlan ? 'Current Plan' : isDowngrade ? 'Downgrade' : 'Upgrade'}
        </Button>

        {/* Feature comparison for clarity */}
        <VStack spacing={2} pt={4} borderTopWidth="1px" borderColor={borderColor}>
          <HStack justify="space-between" width="full">
            <Text fontSize="xs" color="gray.500">AI Planning</Text>
            <Icon 
              as={plan.limits.aiPlanning ? CheckIcon : CloseIcon} 
              color={plan.limits.aiPlanning ? 'green.500' : 'red.500'} 
              boxSize={3}
            />
          </HStack>
          <HStack justify="space-between" width="full">
            <Text fontSize="xs" color="gray.500">Grocery Integration</Text>
            <Icon 
              as={plan.limits.groceryIntegration ? CheckIcon : CloseIcon} 
              color={plan.limits.groceryIntegration ? 'green.500' : 'red.500'} 
              boxSize={3}
            />
          </HStack>
        </VStack>
      </VStack>
    </Box>
  )
}

export const PricingPlans: React.FC = () => {
  const { currentUser } = useAuth()
  const { data: subscription, isLoading: isLoadingSubscription } = useSubscription()
  const createCheckout = useCreateCheckout()

  const handleUpgrade = (planTier: PlanTier) => {
    if (!currentUser) {
      // Redirect to login
      window.location.href = '/login'
      return
    }

    if (planTier === 'free') {
      // Handle downgrade to free - this should go through customer portal
      return
    }

    // For family plan, we might want to ask for number of seats
    const seats = planTier === 'family' ? 4 : undefined
    createCheckout.mutate({ planTier, seats })
  }

  return (
    <Container maxW="7xl" py={10}>
      <VStack spacing={10}>
        <VStack spacing={4} textAlign="center">
          <Heading size="2xl">Choose Your Plan</Heading>
          <Text fontSize="lg" color="gray.500" maxW="2xl">
            Start with our free plan and upgrade anytime as your cooking needs grow.
            All plans include our core features with different limits.
          </Text>
        </VStack>

        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={8} width="full">
          {PRICING_PLANS.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              currentPlan={subscription?.planTier}
              onUpgrade={handleUpgrade}
              isLoading={createCheckout.isPending}
            />
          ))}
        </SimpleGrid>

        <VStack spacing={4} pt={6}>
          <Text fontSize="sm" color="gray.500" textAlign="center">
            All plans include automatic recipe extraction, shopping list generation, and basic meal planning.
          </Text>
          <Text fontSize="sm" color="gray.500" textAlign="center">
            Cancel or change your plan anytime. No hidden fees.
          </Text>
        </VStack>
      </VStack>
    </Container>
  )
}