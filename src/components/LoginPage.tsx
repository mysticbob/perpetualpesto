import {
  Box,
  Container,
  VStack,
  HStack,
  Heading,
  Text,
  Input,
  Button,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Alert,
  AlertIcon,
  Divider,
  useColorModeValue,
  Image,
  Card,
  CardBody,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel
} from '@chakra-ui/react'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignup, setIsSignup] = useState(false)

  const { login, signup, loginWithGoogle } = useAuth()

  const bgColor = useColorModeValue('gray.50', 'gray.900')
  const cardBg = useColorModeValue('white', 'gray.800')
  const brandColor = '#38BDAF'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isSignup && password !== confirmPassword) {
      return setError('Passwords do not match')
    }

    try {
      setError('')
      setLoading(true)
      
      if (isSignup) {
        await signup(email, password, displayName)
      } else {
        await login(email, password)
      }
    } catch (error: any) {
      setError(error.message)
    }
    
    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    try {
      setError('')
      setLoading(true)
      await loginWithGoogle()
    } catch (error: any) {
      setError(error.message)
    }
    setLoading(false)
  }

  return (
    <Box minH="100vh" bg={bgColor} py={12}>
      <Container maxW="md">
        <VStack spacing={8}>
          {/* Logo/Brand */}
          <VStack spacing={4}>
            <Box
              w="80px"
              h="80px"
              borderRadius="xl"
              bg={brandColor}
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Text fontSize="2xl" fontWeight="bold" color="white">
                🍽️
              </Text>
            </Box>
            <VStack spacing={2}>
              <Heading size="xl" color={brandColor}>
                Eat It App
              </Heading>
              <Text color="gray.600" textAlign="center">
                Your personal recipe and meal planning assistant
              </Text>
            </VStack>
          </VStack>

          {/* Login/Signup Card */}
          <Card w="full" bg={cardBg} shadow="lg">
            <CardBody p={8}>
              <Tabs isFitted variant="enclosed" onChange={(index) => setIsSignup(index === 1)}>
                <TabList mb={6}>
                  <Tab>Sign In</Tab>
                  <Tab>Sign Up</Tab>
                </TabList>

                <TabPanels>
                  {/* Sign In Panel */}
                  <TabPanel p={0}>
                    <VStack spacing={4}>
                      <Text color="gray.600" textAlign="center">
                        Welcome back! Sign in to access your recipes and meal plans.
                      </Text>

                      {error && (
                        <Alert status="error" borderRadius="md">
                          <AlertIcon />
                          {error}
                        </Alert>
                      )}

                      <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                        <VStack spacing={4}>
                          <FormControl isRequired>
                            <FormLabel>Email</FormLabel>
                            <Input
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="Enter your email"
                              focusBorderColor={brandColor}
                            />
                          </FormControl>

                          <FormControl isRequired>
                            <FormLabel>Password</FormLabel>
                            <Input
                              type="password"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="Enter your password"
                              focusBorderColor={brandColor}
                            />
                          </FormControl>

                          <Button
                            type="submit"
                            w="full"
                            size="lg"
                            style={{ backgroundColor: brandColor, color: 'white' }}
                            _hover={{ backgroundColor: '#2da89c' }}
                            isLoading={loading}
                            loadingText="Signing in..."
                          >
                            Sign In
                          </Button>
                        </VStack>
                      </form>

                      <HStack w="full">
                        <Divider />
                        <Text color="gray.500" fontSize="sm" whiteSpace="nowrap">
                          or continue with
                        </Text>
                        <Divider />
                      </HStack>

                      <Button
                        w="full"
                        variant="outline"
                        leftIcon={<Text fontSize="lg">🔍</Text>}
                        onClick={handleGoogleLogin}
                        isLoading={loading}
                        loadingText="Signing in..."
                      >
                        Sign in with Google
                      </Button>
                    </VStack>
                  </TabPanel>

                  {/* Sign Up Panel */}
                  <TabPanel p={0}>
                    <VStack spacing={4}>
                      <Text color="gray.600" textAlign="center">
                        Create your account to start organizing your recipes and planning meals.
                      </Text>

                      {error && (
                        <Alert status="error" borderRadius="md">
                          <AlertIcon />
                          {error}
                        </Alert>
                      )}

                      <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                        <VStack spacing={4}>
                          <FormControl isRequired>
                            <FormLabel>Full Name</FormLabel>
                            <Input
                              type="text"
                              value={displayName}
                              onChange={(e) => setDisplayName(e.target.value)}
                              placeholder="Enter your full name"
                              focusBorderColor={brandColor}
                            />
                          </FormControl>

                          <FormControl isRequired>
                            <FormLabel>Email</FormLabel>
                            <Input
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="Enter your email"
                              focusBorderColor={brandColor}
                            />
                          </FormControl>

                          <FormControl isRequired>
                            <FormLabel>Password</FormLabel>
                            <Input
                              type="password"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="Create a password"
                              focusBorderColor={brandColor}
                            />
                          </FormControl>

                          <FormControl isRequired>
                            <FormLabel>Confirm Password</FormLabel>
                            <Input
                              type="password"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder="Confirm your password"
                              focusBorderColor={brandColor}
                            />
                          </FormControl>

                          <Button
                            type="submit"
                            w="full"
                            size="lg"
                            style={{ backgroundColor: brandColor, color: 'white' }}
                            _hover={{ backgroundColor: '#2da89c' }}
                            isLoading={loading}
                            loadingText="Creating account..."
                          >
                            Create Account
                          </Button>
                        </VStack>
                      </form>

                      <HStack w="full">
                        <Divider />
                        <Text color="gray.500" fontSize="sm" whiteSpace="nowrap">
                          or continue with
                        </Text>
                        <Divider />
                      </HStack>

                      <Button
                        w="full"
                        variant="outline"
                        leftIcon={<Text fontSize="lg">🔍</Text>}
                        onClick={handleGoogleLogin}
                        isLoading={loading}
                        loadingText="Creating account..."
                      >
                        Sign up with Google
                      </Button>
                    </VStack>
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </CardBody>
          </Card>

          {/* Features Preview */}
          <VStack spacing={4} maxW="sm" textAlign="center">
            <Text color="gray.600" fontSize="sm" fontWeight="medium">
              What you'll get with Eat It App:
            </Text>
            <VStack spacing={2}>
              <HStack spacing={3}>
                <Text fontSize="lg">📝</Text>
                <Text fontSize="sm" color="gray.600">
                  Organize and manage your recipe collection
                </Text>
              </HStack>
              <HStack spacing={3}>
                <Text fontSize="lg">📅</Text>
                <Text fontSize="sm" color="gray.600">
                  Plan meals and create weekly menus
                </Text>
              </HStack>
              <HStack spacing={3}>
                <Text fontSize="lg">🏪</Text>
                <Text fontSize="sm" color="gray.600">
                  Track pantry items and expiration dates
                </Text>
              </HStack>
              <HStack spacing={3}>
                <Text fontSize="lg">⏰</Text>
                <Text fontSize="sm" color="gray.600">
                  Built-in cooking timers for perfect meals
                </Text>
              </HStack>
            </VStack>
          </VStack>
        </VStack>
      </Container>
    </Box>
  )
}