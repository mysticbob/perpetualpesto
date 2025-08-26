import {
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  VStack,
  HStack,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Badge,
  Image,
  Spinner,
  useToast,
  useColorModeValue,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure
} from '@chakra-ui/react'
import { useState, useEffect } from 'react'
import { CheckIcon, ExternalLinkIcon } from '../icons/CustomIcons'
import axios from 'axios'

interface InstacartConnectProps {
  userId: string
  onStatusChange?: (connected: boolean) => void
}

interface AuthStatus {
  isConnected: boolean
  email?: string
  lastSyncedAt?: string
  needsReauth: boolean
}

export default function InstacartConnect({ userId, onStatusChange }: InstacartConnectProps) {
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const toast = useToast()
  
  const bgColor = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.700')
  const mutedColor = useColorModeValue('gray.600', 'gray.400')
  const brandColor = '#38BDAF'
  const successColor = '#008060'
  const warningColor = '#ffc107'
  const errorColor = '#d72c0d'

  useEffect(() => {
    checkAuthStatus()
    
    // Check for OAuth callback parameters
    const params = new URLSearchParams(window.location.search)
    if (params.get('instacart_connected') === 'true') {
      toast({
        title: 'Success!',
        description: 'Your Instacart account has been connected.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      })
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname)
      checkAuthStatus()
    } else if (params.get('instacart_error')) {
      toast({
        title: 'Connection Failed',
        description: 'Unable to connect your Instacart account. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const checkAuthStatus = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/instacart/auth/status', {
        params: { userId }
      })
      setAuthStatus(response.data)
      onStatusChange?.(response.data.isConnected)
    } catch (error) {
      console.error('Error checking auth status:', error)
      setAuthStatus({ isConnected: false, needsReauth: false })
    } finally {
      setLoading(false)
    }
  }

  const connectAccount = async () => {
    try {
      setConnecting(true)
      const response = await axios.get('/api/instacart/auth/connect', {
        params: { userId }
      })
      
      if (response.data.authUrl) {
        // Redirect to Instacart OAuth
        window.location.href = response.data.authUrl
      }
    } catch (error) {
      console.error('Error starting connection:', error)
      toast({
        title: 'Connection Error',
        description: 'Failed to start Instacart connection. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } finally {
      setConnecting(false)
    }
  }

  const disconnectAccount = async () => {
    try {
      setLoading(true)
      await axios.post('/api/instacart/auth/disconnect', { userId })
      
      setAuthStatus({ isConnected: false, needsReauth: false })
      onStatusChange?.(false)
      onClose()
      
      toast({
        title: 'Disconnected',
        description: 'Your Instacart account has been disconnected.',
        status: 'info',
        duration: 3000,
        isClosable: true,
      })
    } catch (error) {
      console.error('Error disconnecting:', error)
      toast({
        title: 'Disconnection Error',
        description: 'Failed to disconnect your account. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } finally {
      setLoading(false)
    }
  }

  const formatLastSynced = (dateString?: string) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 60) return `${diffMins} minutes ago`
    if (diffHours < 24) return `${diffHours} hours ago`
    return `${diffDays} days ago`
  }

  if (loading && !authStatus) {
    return (
      <Card bg={bgColor} borderColor={borderColor} variant="outline">
        <CardBody>
          <HStack justify="center" py={4}>
            <Spinner size="md" color={brandColor} />
            <Text>Loading Instacart status...</Text>
          </HStack>
        </CardBody>
      </Card>
    )
  }

  return (
    <>
      <Card bg={bgColor} borderColor={borderColor} variant="outline">
        <CardHeader pb={3}>
          <HStack spacing={3}>
            <Image
              src="https://www.instacart.com/assets/beetstrap/brand/2022/instacart-logo-color.svg"
              alt="Instacart"
              h="24px"
            />
            <Heading size="md">Instacart Integration</Heading>
          </HStack>
        </CardHeader>
        
        <CardBody>
          <VStack spacing={4} align="stretch">
            {authStatus?.isConnected ? (
              <>
                {/* Connected State */}
                <Alert status="success" borderRadius="md">
                  <AlertIcon />
                  <Box>
                    <AlertTitle>Connected</AlertTitle>
                    <AlertDescription>
                      {authStatus.email && `Account: ${authStatus.email}`}
                    </AlertDescription>
                  </Box>
                </Alert>

                {authStatus.needsReauth && (
                  <Alert status="warning" borderRadius="md">
                    <AlertIcon />
                    <Box>
                      <AlertTitle>Re-authentication Required</AlertTitle>
                      <AlertDescription>
                        Your connection has expired. Please reconnect your account.
                      </AlertDescription>
                    </Box>
                  </Alert>
                )}

                <VStack spacing={2} align="start">
                  <HStack>
                    <Text fontSize="sm" color={mutedColor}>Status:</Text>
                    <Badge colorScheme="green">Active</Badge>
                  </HStack>
                  <HStack>
                    <Text fontSize="sm" color={mutedColor}>Last synced:</Text>
                    <Text fontSize="sm" fontWeight="medium">
                      {formatLastSynced(authStatus.lastSyncedAt)}
                    </Text>
                  </HStack>
                </VStack>

                <HStack spacing={3} pt={2}>
                  {authStatus.needsReauth ? (
                    <Button
                      size="md"
                      style={{ backgroundColor: brandColor, color: 'white' }}
                      _hover={{ backgroundColor: '#2da89c' }}
                      onClick={connectAccount}
                      isLoading={connecting}
                      loadingText="Reconnecting..."
                    >
                      Reconnect Account
                    </Button>
                  ) : (
                    <Button
                      size="md"
                      variant="outline"
                      onClick={onOpen}
                    >
                      Disconnect
                    </Button>
                  )}
                  <Button
                    size="md"
                    variant="ghost"
                    rightIcon={<ExternalLinkIcon />}
                    as="a"
                    href="https://www.instacart.com/store/account/manage"
                    target="_blank"
                  >
                    Manage on Instacart
                  </Button>
                </HStack>
              </>
            ) : (
              <>
                {/* Disconnected State */}
                <Alert status="info" borderRadius="md">
                  <AlertIcon />
                  <Box>
                    <AlertTitle>Not Connected</AlertTitle>
                    <AlertDescription>
                      Connect your Instacart account to send grocery lists directly to your cart.
                    </AlertDescription>
                  </Box>
                </Alert>

                <VStack spacing={3} align="start">
                  <Text fontSize="sm" color={mutedColor}>
                    Benefits of connecting:
                  </Text>
                  <VStack spacing={2} align="start" pl={4}>
                    <HStack>
                      <CheckIcon color={successColor} boxSize={4} />
                      <Text fontSize="sm">One-click cart creation from grocery lists</Text>
                    </HStack>
                    <HStack>
                      <CheckIcon color={successColor} boxSize={4} />
                      <Text fontSize="sm">Automatic product matching</Text>
                    </HStack>
                    <HStack>
                      <CheckIcon color={successColor} boxSize={4} />
                      <Text fontSize="sm">Real-time price and availability</Text>
                    </HStack>
                    <HStack>
                      <CheckIcon color={successColor} boxSize={4} />
                      <Text fontSize="sm">Order tracking and history</Text>
                    </HStack>
                  </VStack>
                </VStack>

                <Button
                  size="lg"
                  style={{ backgroundColor: brandColor, color: 'white' }}
                  _hover={{ backgroundColor: '#2da89c' }}
                  onClick={connectAccount}
                  isLoading={connecting}
                  loadingText="Connecting..."
                  leftIcon={<Image src="https://www.instacart.com/assets/beetstrap/brand/2022/carrot-logo.svg" h="20px" />}
                >
                  Connect Instacart Account
                </Button>

                <Text fontSize="xs" color={mutedColor} textAlign="center">
                  You'll be redirected to Instacart to authorize the connection.
                  We never store your Instacart password.
                </Text>
              </>
            )}
          </VStack>
        </CardBody>
      </Card>

      {/* Disconnect Confirmation Modal */}
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Disconnect Instacart Account</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>
              Are you sure you want to disconnect your Instacart account? 
              You'll need to reconnect to use Instacart features again.
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="red"
              onClick={disconnectAccount}
              isLoading={loading}
            >
              Disconnect
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}