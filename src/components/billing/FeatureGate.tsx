/**
 * FeatureGate Component
 * Conditionally renders content based on subscription features
 */

import React from 'react'
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useColorModeValue,
  Icon,
  Tooltip,
  Badge,
} from '@chakra-ui/react'
import { LockIcon, UnlockIcon } from '@chakra-ui/icons'
import { FaCrown, FaRocket } from 'react-icons/fa'
import { useFeatureAccess, useCreateCheckout } from '../../hooks/useBilling'
import type { UsageStats } from '../../types/billing'

interface FeatureGateProps {
  feature: keyof UsageStats | 'aiPlanning' | 'groceryIntegration'
  children: React.ReactNode
  fallback?: React.ReactNode
  showUpgradePrompt?: boolean
  silent?: boolean // Don't show any UI when feature is locked
}

export const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  children,
  fallback,
  showUpgradePrompt = true,
  silent = false,
}) => {
  const { hasAccess, isLoading, reason, usage } = useFeatureAccess(feature)
  const createCheckout = useCreateCheckout()
  const bgColor = useColorModeValue('gray.50', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')

  // Determine which plan to suggest
  const getSuggestedPlan = () => {
    if (feature === 'groceryIntegration') return 'family'
    if (feature === 'aiPlanning') return 'small'
    if (usage && usage.limit <= 50) return 'small'
    return 'family'
  }

  const handleUpgrade = () => {
    const plan = getSuggestedPlan()
    createCheckout.mutate({ planTier: plan })
  }

  if (isLoading) {
    return null // Or a loading spinner
  }

  if (hasAccess) {
    return <>{children}</>
  }

  if (silent) {
    return null
  }

  if (fallback) {
    return <>{fallback}</>
  }

  // Default upgrade prompt
  return (
    <Box
      bg={bgColor}
      borderWidth="1px"
      borderColor={borderColor}
      borderRadius="lg"
      p={6}
      position="relative"
      opacity={0.9}
    >
      <VStack spacing={4}>
        <Icon as={LockIcon} boxSize={10} color="gray.400" />
        
        <VStack spacing={2}>
          <Text fontSize="lg" fontWeight="semibold">
            Feature Locked
          </Text>
          <Text fontSize="sm" color="gray.500" textAlign="center">
            {reason || 'This feature requires an upgraded plan'}
          </Text>
        </VStack>

        {usage && (
          <HStack>
            <Text fontSize="sm">
              Current: {usage.used}/{usage.limit}
            </Text>
            <Badge colorScheme="orange">Limit Reached</Badge>
          </HStack>
        )}

        {showUpgradePrompt && (
          <Button
            colorScheme="purple"
            leftIcon={<FaRocket />}
            onClick={handleUpgrade}
            isLoading={createCheckout.isPending}
          >
            Upgrade to {getSuggestedPlan() === 'family' ? 'Family' : 'Small Kitchen'}
          </Button>
        )}
      </VStack>
    </Box>
  )
}

interface FeatureBadgeProps {
  feature: keyof UsageStats | 'aiPlanning' | 'groceryIntegration'
  showWhenUnlocked?: boolean
}

export const FeatureBadge: React.FC<FeatureBadgeProps> = ({
  feature,
  showWhenUnlocked = false,
}) => {
  const { hasAccess, isLoading } = useFeatureAccess(feature)

  if (isLoading) return null

  if (hasAccess && !showWhenUnlocked) return null

  if (hasAccess) {
    return (
      <Tooltip label="Feature unlocked">
        <Badge colorScheme="green" variant="subtle">
          <Icon as={UnlockIcon} mr={1} />
          Available
        </Badge>
      </Tooltip>
    )
  }

  const getFeatureName = () => {
    switch (feature) {
      case 'aiPlanning':
        return 'AI Planning'
      case 'groceryIntegration':
        return 'Grocery Integration'
      default:
        return 'Premium'
    }
  }

  return (
    <Tooltip label="Upgrade to unlock this feature">
      <Badge colorScheme="orange" variant="subtle">
        <Icon as={LockIcon} mr={1} />
        {getFeatureName()}
      </Badge>
    </Tooltip>
  )
}

interface FeaturePromptProps {
  feature: keyof UsageStats | 'aiPlanning' | 'groceryIntegration'
  title?: string
  description?: string
  compact?: boolean
}

export const FeaturePrompt: React.FC<FeaturePromptProps> = ({
  feature,
  title,
  description,
  compact = false,
}) => {
  const { hasAccess, isLoading, reason } = useFeatureAccess(feature)
  const createCheckout = useCreateCheckout()

  if (isLoading || hasAccess) return null

  const getDefaultTitle = () => {
    switch (feature) {
      case 'aiPlanning':
        return 'Unlock AI-Powered Meal Planning'
      case 'groceryIntegration':
        return 'Enable Grocery Store Integration'
      default:
        return 'Upgrade for More'
    }
  }

  const getDefaultDescription = () => {
    switch (feature) {
      case 'aiPlanning':
        return 'Let AI suggest meals based on your preferences and pantry items'
      case 'groceryIntegration':
        return 'Connect with your favorite grocery stores for seamless shopping'
      default:
        return reason || 'Unlock this feature with an upgraded plan'
    }
  }

  const getSuggestedPlan = () => {
    if (feature === 'groceryIntegration') return 'family'
    if (feature === 'aiPlanning') return 'small'
    return 'small'
  }

  const handleUpgrade = () => {
    const plan = getSuggestedPlan()
    createCheckout.mutate({ planTier: plan })
  }

  if (compact) {
    return (
      <HStack
        bg={useColorModeValue('purple.50', 'purple.900')}
        p={3}
        borderRadius="md"
        spacing={3}
      >
        <Icon as={FaCrown} color="purple.500" />
        <Text fontSize="sm" flex={1}>
          {title || getDefaultTitle()}
        </Text>
        <Button
          size="sm"
          colorScheme="purple"
          onClick={handleUpgrade}
          isLoading={createCheckout.isPending}
        >
          Upgrade
        </Button>
      </HStack>
    )
  }

  return (
    <Alert
      status="info"
      variant="subtle"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      textAlign="center"
      height="200px"
      borderRadius="lg"
    >
      <AlertIcon boxSize="40px" mr={0} />
      <AlertTitle mt={4} mb={1} fontSize="lg">
        {title || getDefaultTitle()}
      </AlertTitle>
      <AlertDescription maxWidth="sm">
        {description || getDefaultDescription()}
      </AlertDescription>
      <Button
        mt={4}
        colorScheme="purple"
        leftIcon={<FaRocket />}
        onClick={handleUpgrade}
        isLoading={createCheckout.isPending}
      >
        Upgrade to {getSuggestedPlan() === 'family' ? 'Family' : 'Small Kitchen'}
      </Button>
    </Alert>
  )
}