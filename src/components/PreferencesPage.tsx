import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Switch,
  Select,
  Card,
  CardBody,
  Button,
  useColorModeValue,
  Badge,
  Divider,
  FormControl,
  FormLabel,
  useColorMode
} from '@chakra-ui/react'
import { useEffect } from 'react'
import { usePreferences } from '../contexts/PreferencesContext'
import { formatIngredientAmount } from '../utils/units'

interface PreferencesPageProps {
  onBack: () => void
}

export default function PreferencesPage({ onBack }: PreferencesPageProps) {
  const { preferences, setUnitSystem, setThemeMode } = usePreferences()
  const { colorMode, setColorMode } = useColorMode()
  const bgColor = useColorModeValue('gray.50', 'gray.900')
  const cardBg = useColorModeValue('white', 'gray.800')
  const mutedColor = useColorModeValue('gray.600', 'gray.400')

  // Sync Chakra UI color mode with preferences
  useEffect(() => {
    if (preferences.themeMode === 'light') {
      setColorMode('light')
    } else if (preferences.themeMode === 'dark') {
      setColorMode('dark')
    } else {
      // For automatic, let Chakra UI handle system preference
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setColorMode(systemPrefersDark ? 'dark' : 'light')
    }
  }, [preferences.themeMode, setColorMode])

  const exampleIngredients = [
    { amount: '500', unit: 'g', name: 'flour' },
    { amount: '2', unit: 'cups', name: 'milk' },
    { amount: '1', unit: 'lb', name: 'chicken' },
    { amount: '250', unit: 'ml', name: 'water' },
    { amount: '180', unit: 'c', name: 'oven temperature' }
  ]

  return (
    <Box minH="100vh" bg={bgColor}>
      <Container maxW="4xl" py={8}>
        <VStack spacing={8} align="start">
          {/* Header */}
          <VStack spacing={4} align="start" w="full">
            <Button variant="ghost" onClick={onBack} size="sm">
              ← Back
            </Button>
            <Heading size="xl">Preferences</Heading>
            <Text color={mutedColor} fontSize="lg">
              Customize your recipe experience
            </Text>
          </VStack>

          {/* Unit System */}
          <Card bg={cardBg} w="full">
            <CardBody>
              <VStack spacing={6} align="start">
                <VStack spacing={2} align="start">
                  <Heading size="md">Unit System</Heading>
                  <Text color={mutedColor}>
                    Choose how measurements are displayed in recipes
                  </Text>
                </VStack>

                <FormControl>
                  <FormLabel>Measurement System</FormLabel>
                  <HStack spacing={4}>
                    <Button
                      variant={preferences.unitSystem === 'metric' ? 'solid' : 'outline'}
                      colorScheme={preferences.unitSystem === 'metric' ? 'blue' : 'gray'}
                      onClick={() => setUnitSystem('metric')}
                      size="md"
                    >
                      Metric
                    </Button>
                    <Button
                      variant={preferences.unitSystem === 'imperial' ? 'solid' : 'outline'}
                      colorScheme={preferences.unitSystem === 'imperial' ? 'blue' : 'gray'}
                      onClick={() => setUnitSystem('imperial')}
                      size="md"
                    >
                      Imperial
                    </Button>
                  </HStack>
                </FormControl>

                <Divider />

                <VStack spacing={3} align="start" w="full">
                  <Text fontWeight="medium">Preview:</Text>
                  <VStack spacing={2} align="start" w="full">
                    {exampleIngredients.map((ingredient, index) => (
                      <HStack key={index} spacing={4} w="full">
                        <Text fontSize="sm" color={mutedColor} minW="120px">
                          Original:
                        </Text>
                        <Text fontSize="sm">
                          {ingredient.amount} {ingredient.unit} {ingredient.name}
                        </Text>
                        <Text fontSize="sm" color={mutedColor}>
                          →
                        </Text>
                        <Text fontSize="sm" fontWeight="medium">
                          {formatIngredientAmount(ingredient.amount, ingredient.unit, preferences.unitSystem)} {ingredient.name}
                        </Text>
                      </HStack>
                    ))}
                  </VStack>
                </VStack>
              </VStack>
            </CardBody>
          </Card>

          {/* Theme */}
          <Card bg={cardBg} w="full">
            <CardBody>
              <VStack spacing={6} align="start">
                <VStack spacing={2} align="start">
                  <Heading size="md">Appearance</Heading>
                  <Text color={mutedColor}>
                    Choose your preferred theme
                  </Text>
                </VStack>

                <FormControl>
                  <FormLabel>Theme Mode</FormLabel>
                  <HStack spacing={4}>
                    <Button
                      variant={preferences.themeMode === 'automatic' ? 'solid' : 'outline'}
                      colorScheme={preferences.themeMode === 'automatic' ? 'blue' : 'gray'}
                      onClick={() => setThemeMode('automatic')}
                      size="md"
                    >
                      Automatic
                    </Button>
                    <Button
                      variant={preferences.themeMode === 'light' ? 'solid' : 'outline'}
                      colorScheme={preferences.themeMode === 'light' ? 'blue' : 'gray'}
                      onClick={() => setThemeMode('light')}
                      size="md"
                    >
                      Light
                    </Button>
                    <Button
                      variant={preferences.themeMode === 'dark' ? 'solid' : 'outline'}
                      colorScheme={preferences.themeMode === 'dark' ? 'blue' : 'gray'}
                      onClick={() => setThemeMode('dark')}
                      size="md"
                    >
                      Dark
                    </Button>
                  </HStack>
                </FormControl>

                <VStack spacing={2} align="start">
                  <HStack spacing={2}>
                    <Text fontSize="sm" color={mutedColor}>
                      Current theme:
                    </Text>
                    <Badge colorScheme="blue" size="sm">
                      {colorMode === 'light' ? 'Light' : 'Dark'}
                    </Badge>
                  </HStack>
                  <Text fontSize="sm" color={mutedColor}>
                    {preferences.themeMode === 'automatic' 
                      ? 'Follows your system preference' 
                      : `Always uses ${preferences.themeMode} mode`
                    }
                  </Text>
                </VStack>
              </VStack>
            </CardBody>
          </Card>

          {/* Current Settings Summary */}
          <Card bg={cardBg} w="full">
            <CardBody>
              <VStack spacing={4} align="start">
                <Heading size="md">Current Settings</Heading>
                <VStack spacing={2} align="start" w="full">
                  <HStack justify="space-between" w="full">
                    <Text>Unit System:</Text>
                    <Badge colorScheme="green">
                      {preferences.unitSystem === 'metric' ? 'Metric (g, ml, °C)' : 'Imperial (oz, cups, °F)'}
                    </Badge>
                  </HStack>
                  <HStack justify="space-between" w="full">
                    <Text>Theme Mode:</Text>
                    <Badge colorScheme="blue">
                      {preferences.themeMode.charAt(0).toUpperCase() + preferences.themeMode.slice(1)}
                    </Badge>
                  </HStack>
                </VStack>
              </VStack>
            </CardBody>
          </Card>
        </VStack>
      </Container>
    </Box>
  )
}