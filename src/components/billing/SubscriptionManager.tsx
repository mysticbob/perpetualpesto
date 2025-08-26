/**
 * SubscriptionManager Component
 * Manages current subscription with upgrade/downgrade/cancel options
 */

import React, { useState } from 'react'
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  Badge,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
  useColorModeValue,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  Divider,
  Skeleton,
  Container,
  Icon,
  Progress,
  Tooltip,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
} from '@chakra-ui/react'
import { format } from 'date-fns'
import { FaCreditCard, FaUsers, FaRocket, FaExclamationTriangle } from 'react-icons/fa'
import { ExternalLinkIcon, WarningIcon } from '@chakra-ui/icons'
import {
  useSubscription,
  useUsageStats,
  useCreatePortalSession,
  useCancelSubscription,
  useUpdateSubscription,
  useCreateCheckout,
} from '../../hooks/useBilling'
import { UsageIndicator } from './UsageIndicator'
import type { PlanTier } from '../../types/billing'

const PLAN_NAMES: Record<PlanTier, string> = {
  free: 'Free',
  small: 'Small Kitchen',
  family: 'Family Feast',
}

const PLAN_COLORS: Record<PlanTier, string> = {
  free: 'gray',
  small: 'blue',
  family: 'purple',
}

export const SubscriptionManager: React.FC = () => {
  const bgColor = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')
  
  const { data: subscription, isLoading: isLoadingSubscription } = useSubscription()
  const { data: usage, isLoading: isLoadingUsage } = useUsageStats()
  const createPortalSession = useCreatePortalSession()
  const cancelSubscription = useCancelSubscription()
  const updateSubscription = useUpdateSubscription()
  const createCheckout = useCreateCheckout()
  
  const { isOpen: isCancelOpen, onOpen: onCancelOpen, onClose: onCancelClose } = useDisclosure()
  const { isOpen: isSeatsOpen, onOpen: onSeatsOpen, onClose: onSeatsClose } = useDisclosure()
  
  const [additionalSeats, setAdditionalSeats] = useState(0)

  const handlePortalAccess = () => {
    createPortalSession.mutate()
  }

  const handleCancelConfirm = () => {
    cancelSubscription.mutate()
    onCancelClose()
  }

  const handleUpdateSeats = () => {
    if (subscription && additionalSeats > 0) {
      updateSubscription.mutate({ seats: subscription.seats + additionalSeats })
      onSeatsClose()
      setAdditionalSeats(0)
    }
  }

  const handleUpgrade = (planTier: PlanTier) => {
    createCheckout.mutate({ planTier })
  }

  if (isLoadingSubscription) {
    return (
      <Container maxW="6xl" py={10}>
        <VStack spacing={6} align="stretch">
          <Skeleton height="200px" />
          <Skeleton height="100px" />
          <Skeleton height="100px" />
        </VStack>
      </Container>
    )
  }

  if (!subscription) {
    return (
      <Container maxW="6xl" py={10}>
        <Alert status="info">
          <AlertIcon />
          <AlertTitle>No Active Subscription</AlertTitle>
          <AlertDescription>
            You're currently on the free plan. Upgrade to unlock more features!
          </AlertDescription>
        </Alert>
      </Container>
    )
  }

  const isFreePlan = subscription.planTier === 'free'
  const isCanceling = subscription.cancelAtPeriodEnd

  return (
    <Container maxW="6xl" py={10}>
      <VStack spacing={8} align="stretch">
        {/* Header */}
        <VStack align="start" spacing={4}>
          <Heading size="xl">Subscription Management</Heading>
          <Text color="gray.500">
            Manage your subscription, usage, and billing preferences
          </Text>
        </VStack>

        {/* Cancellation Warning */}
        {isCanceling && (
          <Alert status="warning">
            <AlertIcon />
            <Box>
              <AlertTitle>Subscription Ending</AlertTitle>
              <AlertDescription>
                Your subscription will end on {format(new Date(subscription.currentPeriodEnd), 'MMMM dd, yyyy')}.
                You can reactivate anytime before this date.
              </AlertDescription>
            </Box>
          </Alert>
        )}

        {/* Current Plan Card */}
        <Box
          bg={bgColor}
          borderWidth="1px"
          borderColor={borderColor}
          borderRadius="lg"
          p={6}
          shadow="md"
        >
          <VStack spacing={6} align="stretch">
            <HStack justify="space-between">
              <VStack align="start" spacing={2}>
                <HStack>
                  <Heading size="md">Current Plan</Heading>
                  <Badge
                    colorScheme={PLAN_COLORS[subscription.planTier]}
                    fontSize="md"
                    px={3}
                    py={1}
                  >
                    {PLAN_NAMES[subscription.planTier]}
                  </Badge>
                </HStack>
                <Text color="gray.500">
                  {isFreePlan ? 'Free forever' : `$${subscription.planTier === 'small' ? '5' : '10'}/month`}
                </Text>
              </VStack>
              
              <VStack align="end" spacing={2}>
                <Badge
                  colorScheme={subscription.status === 'active' ? 'green' : 'orange'}
                  fontSize="sm"
                >
                  {subscription.status.toUpperCase()}
                </Badge>
                {!isFreePlan && (
                  <Button
                    size="sm"
                    leftIcon={<FaCreditCard />}
                    onClick={handlePortalAccess}
                    isLoading={createPortalSession.isPending}
                  >
                    Manage Billing
                  </Button>
                )}
              </VStack>
            </HStack>

            <Divider />

            {/* Billing Details */}
            {!isFreePlan && (
              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                <Stat>
                  <StatLabel>Current Period</StatLabel>
                  <StatNumber fontSize="md">
                    {format(new Date(subscription.currentPeriodStart), 'MMM dd')} - {format(new Date(subscription.currentPeriodEnd), 'MMM dd')}
                  </StatNumber>
                  <StatHelpText>Billing cycle</StatHelpText>
                </Stat>

                <Stat>
                  <StatLabel>Next Payment</StatLabel>
                  <StatNumber fontSize="md">
                    {isCanceling ? 'None' : format(new Date(subscription.currentPeriodEnd), 'MMM dd, yyyy')}
                  </StatNumber>
                  <StatHelpText>
                    {isCanceling ? 'Subscription ending' : 'Auto-renews'}
                  </StatHelpText>
                </Stat>

                {subscription.planTier === 'family' && (
                  <Stat>
                    <StatLabel>Team Seats</StatLabel>
                    <StatNumber fontSize="md">
                      {usage?.seats.used || 0} / {subscription.seats}
                    </StatNumber>
                    <StatHelpText>Active users</StatHelpText>
                  </Stat>
                )}
              </SimpleGrid>
            )}

            {/* Action Buttons */}
            <HStack spacing={4} pt={2}>
              {isFreePlan ? (
                <>
                  <Button
                    colorScheme="blue"
                    leftIcon={<FaRocket />}
                    onClick={() => handleUpgrade('small')}
                    isLoading={createCheckout.isPending}
                  >
                    Upgrade to Small Kitchen
                  </Button>
                  <Button
                    colorScheme="purple"
                    leftIcon={<FaRocket />}
                    onClick={() => handleUpgrade('family')}
                    isLoading={createCheckout.isPending}
                  >
                    Upgrade to Family Feast
                  </Button>
                </>
              ) : (
                <>
                  {subscription.planTier === 'small' && (
                    <Button
                      colorScheme="purple"
                      leftIcon={<FaRocket />}
                      onClick={() => handleUpgrade('family')}
                      isLoading={createCheckout.isPending}
                    >
                      Upgrade to Family
                    </Button>
                  )}
                  {subscription.planTier === 'family' && (
                    <Button
                      leftIcon={<FaUsers />}
                      onClick={onSeatsOpen}
                      variant="outline"
                    >
                      Add Seats
                    </Button>
                  )}
                  <Button
                    rightIcon={<ExternalLinkIcon />}
                    onClick={handlePortalAccess}
                    variant="outline"
                    isLoading={createPortalSession.isPending}
                  >
                    Customer Portal
                  </Button>
                  {!isCanceling && (
                    <Button
                      colorScheme="red"
                      variant="ghost"
                      onClick={onCancelOpen}
                      leftIcon={<WarningIcon />}
                    >
                      Cancel Subscription
                    </Button>
                  )}
                </>
              )}
            </HStack>
          </VStack>
        </Box>

        {/* Usage Statistics */}
        {usage && (
          <Box
            bg={bgColor}
            borderWidth="1px"
            borderColor={borderColor}
            borderRadius="lg"
            p={6}
            shadow="md"
          >
            <VStack spacing={6} align="stretch">
              <Heading size="md">Current Usage</Heading>
              
              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
                <UsageIndicator
                  label="Recipes"
                  used={usage.recipes.used}
                  limit={usage.recipes.limit}
                  icon={FaRocket}
                />
                <UsageIndicator
                  label="Pantry Items"
                  used={usage.pantryItems.used}
                  limit={usage.pantryItems.limit}
                  icon={FaRocket}
                />
                <UsageIndicator
                  label="Meal Plans"
                  used={usage.mealPlans.used}
                  limit={usage.mealPlans.limit}
                  icon={FaRocket}
                />
              </SimpleGrid>

              {subscription.planTier === 'free' && (
                <Alert status="info" borderRadius="md">
                  <AlertIcon />
                  <Box>
                    <AlertTitle fontSize="sm">Approaching Limits?</AlertTitle>
                    <AlertDescription fontSize="xs">
                      Upgrade your plan to unlock more recipes, pantry items, and meal planning features.
                    </AlertDescription>
                  </Box>
                  <Button
                    size="sm"
                    colorScheme="blue"
                    ml="auto"
                    onClick={() => handleUpgrade('small')}
                  >
                    Upgrade Now
                  </Button>
                </Alert>
              )}
            </VStack>
          </Box>
        )}

        {/* Cancel Subscription Modal */}
        <Modal isOpen={isCancelOpen} onClose={onCancelClose}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Cancel Subscription</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={4} align="stretch">
                <Alert status="warning">
                  <AlertIcon />
                  <Box>
                    <AlertTitle fontSize="md">Are you sure?</AlertTitle>
                    <AlertDescription fontSize="sm">
                      Your subscription will remain active until {format(new Date(subscription.currentPeriodEnd), 'MMMM dd, yyyy')}.
                      After that, you'll be downgraded to the free plan.
                    </AlertDescription>
                  </Box>
                </Alert>
                
                <Text fontSize="sm">You will lose access to:</Text>
                <VStack align="start" spacing={2} pl={4}>
                  {subscription.planTier === 'family' && (
                    <>
                      <Text fontSize="sm">• Unlimited recipes and pantry items</Text>
                      <Text fontSize="sm">• Grocery store integration</Text>
                      <Text fontSize="sm">• Family sharing features</Text>
                    </>
                  )}
                  <Text fontSize="sm">• AI-powered meal planning</Text>
                  <Text fontSize="sm">• Priority support</Text>
                </VStack>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={onCancelClose}>
                Keep Subscription
              </Button>
              <Button
                colorScheme="red"
                onClick={handleCancelConfirm}
                isLoading={cancelSubscription.isPending}
              >
                Cancel Subscription
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Add Seats Modal */}
        <Modal isOpen={isSeatsOpen} onClose={onSeatsClose}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Add Team Seats</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={4} align="stretch">
                <Text>
                  Add more seats to your Family plan. Each additional seat is $1/month.
                </Text>
                
                <Box>
                  <Text fontSize="sm" mb={2}>Number of seats to add:</Text>
                  <NumberInput
                    value={additionalSeats}
                    onChange={(_, value) => setAdditionalSeats(value)}
                    min={1}
                    max={10}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </Box>
                
                <Alert status="info">
                  <AlertIcon />
                  <Box>
                    <AlertTitle fontSize="sm">Additional Cost</AlertTitle>
                    <AlertDescription fontSize="sm">
                      ${additionalSeats}/month will be added to your subscription
                    </AlertDescription>
                  </Box>
                </Alert>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={onSeatsClose}>
                Cancel
              </Button>
              <Button
                colorScheme="blue"
                onClick={handleUpdateSeats}
                isLoading={updateSubscription.isPending}
                isDisabled={additionalSeats === 0}
              >
                Add {additionalSeats} Seat{additionalSeats !== 1 ? 's' : ''}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </VStack>
    </Container>
  )
}