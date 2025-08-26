/**
 * PaymentForm Component
 * Handles Stripe checkout and payment collection
 */

import React, { useState, useEffect } from 'react'
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useColorModeValue,
  Container,
  Divider,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  FormControl,
  FormLabel,
  FormHelperText,
  Badge,
  Skeleton,
  useToast,
} from '@chakra-ui/react'
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { useAuth } from '../../contexts/AuthContext'
import { apiClient } from '../../utils/apiClient'
import type { PlanTier } from '../../types/billing'

// Initialize Stripe - you'll need to add your publishable key to environment variables
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '')

interface PaymentFormProps {
  planTier: PlanTier
  seats?: number
  onSuccess?: () => void
  onCancel?: () => void
}

interface PlanDetail {
  name: string
  price: number
  seatPrice?: number
  includedSeats?: number
}

const PLAN_DETAILS: Record<PlanTier, PlanDetail> = {
  free: { name: 'Free', price: 0 },
  small: { name: 'Small Kitchen', price: 5 },
  family: { name: 'Family Feast', price: 10, seatPrice: 1, includedSeats: 4 },
}

const CheckoutForm: React.FC<PaymentFormProps> = ({ planTier, seats = 1, onSuccess, onCancel }) => {
  const stripe = useStripe()
  const elements = useElements()
  const { currentUser } = useAuth()
  const toast = useToast()
  
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [additionalSeats, setAdditionalSeats] = useState(0)
  
  const bgColor = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')
  
  const planDetails = PLAN_DETAILS[planTier]
  const isFamily = planTier === 'family'
  
  // Calculate total price
  const calculateTotalPrice = () => {
    let total = planDetails.price
    if (isFamily && additionalSeats > 0) {
      total += additionalSeats * (planDetails.seatPrice || 0)
    }
    return total
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!stripe || !elements || !currentUser) {
      return
    }

    setIsProcessing(true)
    setPaymentError(null)

    try {
      // Create payment intent on the backend
      const { clientSecret } = await apiClient.request<{ clientSecret: string }>(
        '/api/billing/create-payment-intent',
        {
          method: 'POST',
          body: JSON.stringify({
            planTier,
            seats: isFamily ? (planDetails.includedSeats || 4) + additionalSeats : 1,
          }),
        }
      )

      // Confirm the payment
      const cardElement = elements.getElement(CardElement)
      if (!cardElement) {
        throw new Error('Card element not found')
      }

      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            email: currentUser.email,
          },
        },
      })

      if (error) {
        setPaymentError(error.message || 'Payment failed')
      } else if (paymentIntent?.status === 'succeeded') {
        // Update subscription on the backend
        await apiClient.request('/api/billing/subscription/create', {
          method: 'POST',
          body: JSON.stringify({
            planTier,
            seats: isFamily ? (planDetails.includedSeats || 4) + additionalSeats : 1,
            paymentIntentId: paymentIntent.id,
          }),
        })

        toast({
          title: 'Payment Successful',
          description: `You've been upgraded to ${planDetails.name}!`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        })

        onSuccess?.()
      }
    } catch (error: any) {
      console.error('Payment error:', error)
      setPaymentError(error.message || 'An unexpected error occurred')
    } finally {
      setIsProcessing(false)
    }
  }

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: useColorModeValue('#424770', '#ffffff'),
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
  }

  return (
    <Container maxW="2xl" py={10}>
      <Box
        bg={bgColor}
        borderWidth="1px"
        borderColor={borderColor}
        borderRadius="lg"
        p={8}
        shadow="lg"
      >
        <form onSubmit={handleSubmit}>
          <VStack spacing={6} align="stretch">
            {/* Plan Summary */}
            <VStack align="start" spacing={2}>
              <Heading size="lg">Complete Your Purchase</Heading>
              <HStack>
                <Text fontSize="lg">Plan:</Text>
                <Badge colorScheme="purple" fontSize="md" px={3} py={1}>
                  {planDetails.name}
                </Badge>
              </HStack>
            </VStack>

            <Divider />

            {/* Additional Seats for Family Plan */}
            {isFamily && (
              <FormControl>
                <FormLabel>Additional Seats</FormLabel>
                <NumberInput
                  value={additionalSeats}
                  onChange={(_, value) => setAdditionalSeats(value)}
                  min={0}
                  max={20}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
                <FormHelperText>
                  {planDetails.includedSeats} seats included, ${planDetails.seatPrice}/month per additional seat
                </FormHelperText>
              </FormControl>
            )}

            {/* Price Breakdown */}
            <Box
              bg={useColorModeValue('gray.50', 'gray.700')}
              p={4}
              borderRadius="md"
            >
              <VStack spacing={2} align="stretch">
                <HStack justify="space-between">
                  <Text>Base Plan</Text>
                  <Text fontWeight="bold">${planDetails.price}/mo</Text>
                </HStack>
                {isFamily && additionalSeats > 0 && (
                  <HStack justify="space-between">
                    <Text>{additionalSeats} Additional Seats</Text>
                    <Text fontWeight="bold">
                      ${additionalSeats * (planDetails.seatPrice || 0)}/mo
                    </Text>
                  </HStack>
                )}
                <Divider />
                <HStack justify="space-between">
                  <Text fontSize="lg" fontWeight="bold">Total</Text>
                  <Text fontSize="lg" fontWeight="bold">
                    ${calculateTotalPrice()}/month
                  </Text>
                </HStack>
              </VStack>
            </Box>

            {/* Card Element */}
            <FormControl>
              <FormLabel>Payment Details</FormLabel>
              <Box
                p={3}
                borderWidth="1px"
                borderColor={borderColor}
                borderRadius="md"
              >
                <CardElement options={cardElementOptions} />
              </Box>
              <FormHelperText>
                Your payment information is secure and encrypted
              </FormHelperText>
            </FormControl>

            {/* Error Alert */}
            {paymentError && (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                <AlertTitle>Payment Error</AlertTitle>
                <AlertDescription>{paymentError}</AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <HStack spacing={4} pt={4}>
              <Button
                variant="ghost"
                onClick={onCancel}
                isDisabled={isProcessing}
                flex={1}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                colorScheme="purple"
                isLoading={isProcessing}
                loadingText="Processing..."
                isDisabled={!stripe || !elements}
                flex={2}
              >
                Pay ${calculateTotalPrice()}/month
              </Button>
            </HStack>

            {/* Security Notice */}
            <VStack spacing={2} pt={4}>
              <Text fontSize="xs" color="gray.500" textAlign="center">
                By confirming your subscription, you allow NoChickenLeftBehind to charge your
                card for this payment and future payments in accordance with their terms.
              </Text>
              <HStack spacing={4} fontSize="xs" color="gray.500">
                <Text>🔒 Secure payment</Text>
                <Text>✓ Cancel anytime</Text>
                <Text>📧 Email receipt</Text>
              </HStack>
            </VStack>
          </VStack>
        </form>
      </Box>
    </Container>
  )
}

export const PaymentForm: React.FC<PaymentFormProps> = (props) => {
  if (!stripePromise) {
    return (
      <Container maxW="2xl" py={10}>
        <Alert status="error">
          <AlertIcon />
          <AlertTitle>Configuration Error</AlertTitle>
          <AlertDescription>
            Stripe is not configured. Please add your Stripe publishable key to the environment variables.
          </AlertDescription>
        </Alert>
      </Container>
    )
  }

  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm {...props} />
    </Elements>
  )
}