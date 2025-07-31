import {
  Box,
  Heading,
  Text,
  Image,
  Badge,
  HStack,
  VStack,
  Button,
  List,
  ListItem,
  useColorModeValue,
  IconButton,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Grid,
  GridItem
} from '@chakra-ui/react'
import { useState } from 'react'
import { CloseIcon, TimeIcon, EditIcon } from '@chakra-ui/icons'
import { usePreferences } from '../contexts/PreferencesContext'
import { formatIngredientAmount } from '../utils/units'
import IngredientAvailability from './IngredientAvailability'
import GroceryOptionsDialog from './GroceryOptionsDialog'

interface Recipe {
  id: string
  name: string
  description?: string
  prepTime?: number
  cookTime?: number
  totalTime?: number
  servings?: number
  imageUrl?: string
  ingredients: Array<{
    id: string
    name: string
    amount?: string
    unit?: string
  }>
  instructions: Array<{
    id: string
    step: string
  }>
}

interface RecipeSummaryProps {
  recipe: Recipe
  onClose: () => void
  onStartCooking: () => void
  onGroceries: () => void
}

export default function RecipeSummary({ recipe, onClose, onStartCooking, onGroceries }: RecipeSummaryProps) {
  const [servings, setServings] = useState(recipe.servings || 4)
  const { isOpen, onOpen, onClose: closeModal } = useDisclosure()
  const { 
    isOpen: isGroceryDialogOpen, 
    onOpen: onOpenGroceryDialog, 
    onClose: onCloseGroceryDialog 
  } = useDisclosure()
  const { preferences } = usePreferences()
  
  const bgColor = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')
  const mutedColor = useColorModeValue('gray.500', 'gray.400')
  const cardBg = useColorModeValue('gray.50', 'gray.700')

  // Calculate scaling factor for ingredients
  const scalingFactor = servings / (recipe.servings || 4)

  const scaleAmount = (amount?: string): string => {
    if (!amount) return ''
    
    // Try to extract number from amount string
    const match = amount.match(/^([\d\s\/\-\.]+)(.*)/)
    if (match) {
      const numPart = match[1].trim()
      const textPart = match[2].trim()
      
      // Handle fractions and decimals
      let num = 0
      if (numPart.includes('/')) {
        const [numerator, denominator] = numPart.split('/').map(n => parseFloat(n.trim()))
        num = numerator / denominator
      } else {
        num = parseFloat(numPart)
      }
      
      if (!isNaN(num)) {
        const scaled = num * scalingFactor
        // Format nicely - use fractions for common values
        if (scaled === 0.25) return `1/4 ${textPart}`.trim()
        if (scaled === 0.33) return `1/3 ${textPart}`.trim()
        if (scaled === 0.5) return `1/2 ${textPart}`.trim()
        if (scaled === 0.67) return `2/3 ${textPart}`.trim()
        if (scaled === 0.75) return `3/4 ${textPart}`.trim()
        if (scaled % 1 === 0) return `${Math.round(scaled)} ${textPart}`.trim()
        return `${scaled.toFixed(1)} ${textPart}`.trim()
      }
    }
    
    return amount
  }

  return (
    <Box minH="100vh" bg={bgColor}>
      {/* Header */}
      <Box p={6} borderBottom="1px" borderColor={borderColor}>
        <HStack justify="space-between" align="start">
          <VStack align="start" spacing={4} flex={1}>
            <HStack>
              <IconButton
                aria-label="Close recipe"
                icon={<CloseIcon />}
                size="sm"
                variant="ghost"
                onClick={onClose}
              />
              <Heading size="xl">{recipe.name}</Heading>
            </HStack>
            
            <HStack spacing={4} wrap="wrap">
              <HStack spacing={1}>
                <EditIcon color={mutedColor} />
                <Text fontSize="sm" color={mutedColor}>vera.cooking</Text>
              </HStack>
              <HStack spacing={1}>
                <Text fontSize="sm" color={mutedColor}>👥 {servings}</Text>
              </HStack>
              {recipe.prepTime && (
                <Badge colorScheme="blue" px={3} py={1} fontSize="sm">
                  {recipe.prepTime}min PREP
                </Badge>
              )}
              {recipe.cookTime && (
                <Badge colorScheme="orange" px={3} py={1} fontSize="sm">
                  {recipe.cookTime}min COOK
                </Badge>
              )}
              {recipe.totalTime && (
                <Badge colorScheme="green" px={3} py={1} fontSize="sm">
                  {recipe.totalTime}min TOTAL
                </Badge>
              )}
            </HStack>

            <HStack spacing={3}>
              <Button 
                colorScheme="red" 
                size="md" 
                leftIcon={<TimeIcon />} 
                onClick={onStartCooking}
                px={6}
              >
                Cook
              </Button>
              <Button 
                size="md" 
                leftIcon={<EditIcon />} 
                variant="outline"
                onClick={onOpenGroceryDialog}
                px={6}
              >
                Groceries
              </Button>
              <Button 
                size="md" 
                leftIcon={<EditIcon />} 
                variant="outline"
                onClick={onOpen}
                px={6}
              >
                Adjust
              </Button>
            </HStack>

            {recipe.description && (
              <Text color={mutedColor} fontSize="md" maxW="3xl" lineHeight="1.6">
                {recipe.description}
              </Text>
            )}
          </VStack>

          {recipe.imageUrl && (
            <Image
              src={recipe.imageUrl}
              alt={recipe.name}
              w="300px"
              h="200px"
              objectFit="cover"
              borderRadius="lg"
              shadow="lg"
            />
          )}
        </HStack>
      </Box>

      {/* Main Content */}
      <Grid templateColumns="1fr 350px" minH="calc(100vh - 250px)" gap={0}>
        {/* Instructions */}
        <GridItem p={8} overflow="auto">
          <VStack align="start" spacing={8} maxW="4xl">
            {/* The night before section */}
            <Box w="full">
              <Heading size="md" mb={4}>The night before</Heading>
              <Box bg={cardBg} p={6} borderRadius="md" borderLeft="4px solid" borderLeftColor="blue.400">
                <Text color={mutedColor} lineHeight="1.6">
                  Put the beans in a large pot and cover them with plenty of water. Soak overnight (or at least 12 hours).
                </Text>
              </Box>
            </Box>

            {/* Cooking instructions */}
            <Box w="full">
              <Heading size="md" mb={6}>Cooking the chili</Heading>
              <VStack align="start" spacing={6} w="full">
                {recipe.instructions.map((instruction, index) => (
                  <HStack key={instruction.id} align="start" spacing={4} w="full">
                    <Box
                      w="32px"
                      h="32px"
                      minW="32px"
                      bg="blue.500"
                      color="white"
                      borderRadius="full"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      fontSize="14px"
                      fontWeight="bold"
                      lineHeight="1"
                      flexShrink={0}
                    >
                      {index + 1}
                    </Box>
                    <Text fontSize="md" lineHeight="1.6" flex={1}>
                      {instruction.step}
                    </Text>
                  </HStack>
                ))}
              </VStack>
            </Box>
          </VStack>
        </GridItem>

        {/* Ingredients Sidebar */}
        <GridItem borderLeft="1px" borderColor={borderColor} p={6} overflow="auto">
          <VStack align="start" spacing={6} h="full">
            <Heading size="md">Ingredients</Heading>
            
            <List spacing={4} w="full">
              {recipe.ingredients.map((ingredient) => {
                const scaledAmount = scaleAmount(ingredient.amount)
                const formattedAmount = formatIngredientAmount(scaledAmount, ingredient.unit, preferences.unitSystem)
                
                return (
                  <ListItem key={ingredient.id}>
                    <HStack spacing={3} w="full" align="start">
                      <VStack align="start" spacing={1} flex={1}>
                        <Text fontSize="md" fontWeight="bold" color="orange.500">
                          {formattedAmount}
                        </Text>
                        <Text fontSize="sm" color={mutedColor}>
                          {ingredient.name}
                        </Text>
                      </VStack>
                      <IngredientAvailability 
                        ingredientName={ingredient.name}
                        neededAmount={scaledAmount}
                        neededUnit={ingredient.unit}
                      />
                    </HStack>
                  </ListItem>
                )
              })}
            </List>
          </VStack>
        </GridItem>
      </Grid>

      {/* Adjust Servings Modal */}
      <Modal isOpen={isOpen} onClose={closeModal}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Adjust Recipe</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4} align="start">
              <Text>Adjust the number of servings and all ingredients will scale automatically:</Text>
              
              <HStack spacing={4} align="center">
                <Text fontWeight="medium">Servings:</Text>
                <NumberInput
                  value={servings}
                  onChange={(_, value) => setServings(value || 1)}
                  min={1}
                  max={20}
                  w="100px"
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
                <Text color={mutedColor} fontSize="sm">
                  (Original: {recipe.servings || 4})
                </Text>
              </HStack>

              <Text fontSize="sm" color={mutedColor}>
                Scaling factor: {scalingFactor.toFixed(2)}x
              </Text>

              <HStack spacing={3} w="full" justify="end" pt={4}>
                <Button variant="ghost" onClick={closeModal}>
                  Cancel
                </Button>
                <Button colorScheme="blue" onClick={closeModal}>
                  Apply Changes
                </Button>
              </HStack>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Grocery Options Dialog */}
      <GroceryOptionsDialog
        isOpen={isGroceryDialogOpen}
        onClose={onCloseGroceryDialog}
        recipe={recipe}
        onCreateGroceryList={(option) => {
          console.log('Creating grocery list with option:', option)
          // Here you would implement the actual grocery list creation logic
          onGroceries() // Navigate to grocery list page
        }}
      />
    </Box>
  )
}