/**
 * BillingPage Component
 * Main billing page that combines all billing components
 */

import React, { useState } from 'react'
import {
  Box,
  Container,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  VStack,
  Heading,
  Text,
  useColorModeValue,
  Icon,
  HStack,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Button,
} from '@chakra-ui/react'
import {
  FaCreditCard,
  FaChartLine,
  FaHistory,
  FaTags,
  FaShieldAlt,
} from 'react-icons/fa'
import { useAuth } from '../../contexts/AuthContext'
import { useSubscription } from '../../hooks/useBilling'
import { PricingPlans } from './PricingPlans'
import { SubscriptionManager } from './SubscriptionManager'
import { BillingHistory } from './BillingHistory'
import { UsageIndicatorGroup } from './UsageIndicator'
import { useUsageStats } from '../../hooks/useBilling'

export const BillingPage: React.FC = () => {
  const { currentUser } = useAuth()
  const { data: subscription } = useSubscription()
  const { data: usage } = useUsageStats()
  const bgColor = useColorModeValue('gray.50', 'gray.900')
  const tabBg = useColorModeValue('white', 'gray.800')
  
  const [tabIndex, setTabIndex] = useState(0)

  // If user is not logged in
  if (!currentUser) {
    return (
      <Container maxW="6xl" py={10}>
        <Alert status="warning">
          <AlertIcon />
          <Box>
            <AlertTitle>Authentication Required</AlertTitle>
            <AlertDescription>
              Please log in to view and manage your billing information.
            </AlertDescription>
          </Box>
          <Button
            ml="auto"
            colorScheme="blue"
            onClick={() => window.location.href = '/login'}
          >
            Log In
          </Button>
        </Alert>
      </Container>
    )
  }

  return (
    <Box bg={bgColor} minH="100vh">
      <Container maxW="7xl" py={10}>
        <VStack spacing={8} align="stretch">
          {/* Page Header */}
          <VStack align="start" spacing={4}>
            <Heading size="2xl">Billing & Subscription</Heading>
            <Text fontSize="lg" color="gray.500">
              Manage your subscription, view usage, and access billing history
            </Text>
          </VStack>

          {/* Security Notice */}
          <Alert status="info" borderRadius="md">
            <AlertIcon as={FaShieldAlt} />
            <Box>
              <AlertTitle fontSize="sm">Secure Billing</AlertTitle>
              <AlertDescription fontSize="xs">
                All payment information is securely processed through Stripe. 
                We never store your credit card details on our servers.
              </AlertDescription>
            </Box>
          </Alert>

          {/* Tabs */}
          <Tabs
            index={tabIndex}
            onChange={setTabIndex}
            variant="enclosed"
            colorScheme="purple"
          >
            <TabList bg={tabBg} borderRadius="lg" p={2}>
              <Tab>
                <HStack spacing={2}>
                  <Icon as={FaCreditCard} />
                  <Text>Current Plan</Text>
                </HStack>
              </Tab>
              <Tab>
                <HStack spacing={2}>
                  <Icon as={FaTags} />
                  <Text>Pricing Plans</Text>
                </HStack>
              </Tab>
              <Tab>
                <HStack spacing={2}>
                  <Icon as={FaChartLine} />
                  <Text>Usage</Text>
                </HStack>
              </Tab>
              <Tab>
                <HStack spacing={2}>
                  <Icon as={FaHistory} />
                  <Text>Billing History</Text>
                </HStack>
              </Tab>
            </TabList>

            <TabPanels>
              {/* Current Plan Tab */}
              <TabPanel px={0}>
                <SubscriptionManager />
              </TabPanel>

              {/* Pricing Plans Tab */}
              <TabPanel px={0}>
                <PricingPlans />
              </TabPanel>

              {/* Usage Tab */}
              <TabPanel px={0}>
                <Container maxW="6xl">
                  <VStack spacing={6} align="stretch">
                    <VStack align="start" spacing={2}>
                      <Heading size="lg">Resource Usage</Heading>
                      <Text color="gray.500">
                        Monitor your usage across all features and resources
                      </Text>
                    </VStack>
                    
                    {usage && (
                      <UsageIndicatorGroup
                        title="Current Usage"
                        items={[
                          {
                            label: 'Recipes',
                            used: usage.recipes.used,
                            limit: usage.recipes.limit,
                            icon: FaCreditCard,
                          },
                          {
                            label: 'Pantry Items',
                            used: usage.pantryItems.used,
                            limit: usage.pantryItems.limit,
                            icon: FaCreditCard,
                          },
                          {
                            label: 'Meal Plans',
                            used: usage.mealPlans.used,
                            limit: usage.mealPlans.limit,
                            icon: FaCreditCard,
                          },
                          {
                            label: 'Team Seats',
                            used: usage.seats.used,
                            limit: usage.seats.limit,
                            icon: FaCreditCard,
                          },
                        ]}
                      />
                    )}

                    {/* Usage Tips */}
                    <Alert status="info" borderRadius="md">
                      <AlertIcon />
                      <VStack align="start" spacing={2}>
                        <AlertTitle fontSize="sm">Usage Tips</AlertTitle>
                        <AlertDescription fontSize="xs">
                          • Deleted items don't count toward your limits
                        </AlertDescription>
                        <AlertDescription fontSize="xs">
                          • Archived recipes are still counted in your total
                        </AlertDescription>
                        <AlertDescription fontSize="xs">
                          • Usage resets are not available - upgrade for more capacity
                        </AlertDescription>
                      </VStack>
                    </Alert>
                  </VStack>
                </Container>
              </TabPanel>

              {/* Billing History Tab */}
              <TabPanel px={0}>
                <BillingHistory />
              </TabPanel>
            </TabPanels>
          </Tabs>

          {/* Quick Actions */}
          {subscription && subscription.planTier !== 'free' && (
            <HStack spacing={4} pt={4}>
              <Button
                variant="outline"
                onClick={() => window.location.href = 'mailto:support@nochickenleftbehind.com'}
              >
                Contact Support
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open('https://stripe.com/docs/billing/subscriptions/overview', '_blank')}
              >
                Billing FAQ
              </Button>
            </HStack>
          )}
        </VStack>
      </Container>
    </Box>
  )
}