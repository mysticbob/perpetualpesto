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
import { useState, useEffect } from 'react'
import { CloseIcon, TimeIcon, EditIcon } from './icons/CustomIcons'
import { usePreferences } from '../contexts/PreferencesContext'
import { useGrocery } from '../contexts/GroceryContext'
import { usePantry } from '../contexts/PantryContext'
import { useAuth } from '../contexts/AuthContext'
import { formatIngredientAmount } from '../utils/units'
import IngredientAvailability from './IngredientAvailability'
import GroceryOptionsDialog from './GroceryOptionsDialog'
import { CompactStarRating } from './StarRating'

interface Recipe {
  id: string
  name: string
  description?: string
  prepTime?: number
  cookTime?: number
  totalTime?: number
  servings?: number
  imageUrl?: string
  sourceUrl?: string
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
  const [ratingStats, setRatingStats] = useState<{averageRating: number, totalRatings: number} | null>(null)
  const [userRating, setUserRating] = useState<number>(0)
  const { isOpen, onOpen, onClose: closeModal } = useDisclosure()
  const { 
    isOpen: isGroceryDialogOpen, 
    onOpen: onOpenGroceryDialog, 
    onClose: onCloseGroceryDialog 
  } = useDisclosure()
  const { preferences } = usePreferences()
  const { addGroceryItem } = useGrocery()
  const { getItemAvailability } = usePantry()
  const { currentUser } = useAuth()
  
  const bgColor = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')
  const mutedColor = useColorModeValue('gray.500', 'gray.400')
  const cardBg = useColorModeValue('gray.50', 'gray.700')

  // Fetch recipe rating statistics
  useEffect(() => {
    const fetchRatingStats = async () => {
      try {
        const response = await fetch(`http://localhost:3001/api/ratings/recipe/${recipe.id}/stats`)
        if (response.ok) {
          const stats = await response.json()
          setRatingStats(stats)
        }
      } catch (error) {
        console.error('Error fetching rating stats:', error)
      }
    }

    fetchRatingStats()
  }, [recipe.id])

  // Fetch user's current rating for this recipe
  useEffect(() => {
    const fetchUserRating = async () => {
      if (!currentUser) return
      
      try {
        const response = await fetch(`http://localhost:3001/api/ratings/user/${currentUser.uid}/recipe/${recipe.id}`)
        if (response.ok) {
          const userRatingData = await response.json()
          if (userRatingData) {
            setUserRating(userRatingData.rating)
          }
        }
      } catch (error) {
        console.error('Error fetching user rating:', error)
      }
    }

    fetchUserRating()
  }, [recipe.id, currentUser])

  // Handle rating change
  const handleRatingChange = async (newRating: number) => {
    if (!currentUser) return

    try {
      const response = await fetch('http://localhost:3001/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentUser.uid,
          recipeId: recipe.id,
          rating: newRating
        })
      })

      if (response.ok) {
        setUserRating(newRating)
        // Refresh rating stats
        const statsResponse = await fetch(`http://localhost:3001/api/ratings/recipe/${recipe.id}/stats`)
        if (statsResponse.ok) {
          const stats = await statsResponse.json()
          setRatingStats(stats)
        }
      }
    } catch (error) {
      console.error('Error submitting rating:', error)
    }
  }

  // Calculate scaling factor for ingredients
  const scalingFactor = servings / (recipe.servings || 4)

  // Check for freezer ingredients
  const freezerIngredients = recipe.ingredients.filter(ingredient => {
    const availability = getItemAvailability(ingredient.name, ingredient.amount, ingredient.unit)
    return availability.available && availability.item?.location === 'freezer'
  })

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
            
            {/* Rating Display */}
            <Box>
              <CompactStarRating 
                rating={userRating || ratingStats?.averageRating || 0} 
                size="md"
                isInteractive={true}
                onRatingChange={handleRatingChange}
              />
            </Box>
            
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
              {recipe.sourceUrl && (
                <Button 
                  size="md" 
                  colorScheme="blue"
                  variant="outline"
                  onClick={() => window.open(recipe.sourceUrl, '_blank')}
                  px={6}
                >
                  Original
                </Button>
              )}
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
              <VStack spacing={4} align="start">
                <Box bg={cardBg} p={6} borderRadius="md" borderLeft="4px solid" borderLeftColor="blue.400">
                  <Text color={mutedColor} lineHeight="1.6">
                    Put the beans in a large pot and cover them with plenty of water. Soak overnight (or at least 12 hours).
                  </Text>
                </Box>
                
                {/* Freezer thawing reminder */}
                {freezerIngredients.length > 0 && (
                  <Box bg={cardBg} p={6} borderRadius="md" borderLeft="4px solid" borderLeftColor="purple.400">
                    <VStack spacing={3} align="start">
                      <HStack spacing={2}>
                        <Text fontSize="sm" fontWeight="bold" color="purple.600">
                          ❄️ Freezer Items Reminder
                        </Text>
                      </HStack>
                      <Text color={mutedColor} lineHeight="1.6">
                        Remove these items from the freezer to allow them to thaw before cooking:
                      </Text>
                      <VStack spacing={1} align="start" pl={4}>
                        {freezerIngredients.map((ingredient, index) => {
                          const scaledAmount = scaleAmount(ingredient.amount)
                          return (
                            <Text key={index} fontSize="sm" color={mutedColor}>
                              • {scaledAmount} {ingredient.unit} {ingredient.name}
                            </Text>
                          )
                        })}
                      </VStack>
                    </VStack>
                  </Box>
                )}
              </VStack>
            </Box>

            {/* Cooking instructions */}
            <Box w="full">
              <Heading size="md" mb={6}>Recipe Progress</Heading>
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
            
            <List spacing={0} w="full">
              {recipe.ingredients.map((ingredient, index) => {
                const scaledAmount = scaleAmount(ingredient.amount)
                const formattedAmount = formatIngredientAmount(scaledAmount, ingredient.unit, preferences.unitSystem)
                const isEven = index % 2 === 0
                
                return (
                  <ListItem key={ingredient.id}>
                    <Box
                      bg={isEven ? 'transparent' : useColorModeValue('gray.50', 'gray.750')}
                      p={3}
                      borderRadius="md"
                    >
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
                    </Box>
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
          
          // Get ingredient analysis
          const ingredientsToAdd = recipe.ingredients.filter(ingredient => {
            const availability = getItemAvailability(ingredient.name, ingredient.amount, ingredient.unit)
            
            switch (option) {
              case 'exclude-pantry':
                // Smart list - only add items we don't have
                return !availability.available
              case 'include-all':
                // Complete list - add all items
                return true
              case 'replace-pantry':
                // Fresh ingredients - add all items (ignoring pantry)
                return true
              default:
                return false
            }
          })
          
          // Add each ingredient to grocery list
          ingredientsToAdd.forEach(ingredient => {
            const scaledAmount = scaleAmount(ingredient.amount)
            addGroceryItem({
              name: ingredient.name,
              amount: scaledAmount,
              unit: ingredient.unit,
              category: ingredient.name.includes('oil') ? 'oils' : 
                       ingredient.name.includes('pepper') || ingredient.name.includes('salt') ? 'spices' :
                       ingredient.name.includes('tomato') || ingredient.name.includes('can') ? 'canned' :
                       ingredient.name.includes('bean') || ingredient.name.includes('lentil') ? 'legumes' :
                       'general'
            })
          })
          
          console.log(`Added ${ingredientsToAdd.length} items to grocery list`)
          onGroceries() // Navigate to grocery list page
        }}
      />
    </Box>
  )
}