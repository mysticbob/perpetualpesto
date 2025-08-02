import {
  Box,
  Grid,
  GridItem,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  List,
  ListItem,
  useColorModeValue,
  IconButton,
  Progress,
  Badge,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  Checkbox,
  useToast,
  Divider
} from '@chakra-ui/react'
import { useState } from 'react'
import { CloseIcon, ChevronLeftIcon, ChevronRightIcon, TimeIcon, CheckIcon } from './icons/CustomIcons'
import { usePreferences } from '../contexts/PreferencesContext'
import { usePantry } from '../contexts/PantryContext'
import { useAuth } from '../contexts/AuthContext'
import { formatIngredientAmount } from '../utils/units'
import IngredientAvailability from './IngredientAvailability'
import ClickableTime from './ClickableTime'
import StarRating, { RatingPrompt } from './StarRating'

interface Recipe {
  id: string
  name: string
  instructions: Array<{
    id: string
    step: string
  }>
  ingredients: Array<{
    id: string
    name: string
    amount?: string
    unit?: string
  }>
}

interface CookModeProps {
  recipe: Recipe
  onClose: () => void
}

export default function CookMode({ recipe, onClose }: CookModeProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set())
  const [selectedIngredientsToRemove, setSelectedIngredientsToRemove] = useState<Set<string>>(new Set())
  const [isFinished, setIsFinished] = useState(false)
  const [showRating, setShowRating] = useState(false)
  const [hasRated, setHasRated] = useState(false)
  const [modalRating, setModalRating] = useState<number>(0)
  const { isOpen, onOpen, onClose: onModalClose } = useDisclosure()
  const { preferences } = usePreferences()
  const { pantryData, setPantryData, addDepletedItem } = usePantry()
  const { currentUser } = useAuth()
  const toast = useToast()
  
  const bgColor = useColorModeValue('white', 'gray.900')
  const sidebarBg = useColorModeValue('gray.50', 'gray.800')
  const mutedColor = useColorModeValue('gray.500', 'gray.400')
  const highlightColor = useColorModeValue('orange.400', 'orange.300')
  const completedColor = useColorModeValue('green.500', 'green.400')
  const brandColor = '#38BDAF'
  const criticalColor = '#d72c0d'

  const toggleIngredient = (ingredientId: string) => {
    const newChecked = new Set(checkedIngredients)
    if (newChecked.has(ingredientId)) {
      newChecked.delete(ingredientId)
    } else {
      newChecked.add(ingredientId)
    }
    setCheckedIngredients(newChecked)
  }

  const nextStep = () => {
    if (currentStep < recipe.instructions.length - 1) {
      setCurrentStep(currentStep + 1)
    } else if (!isFinished) {
      // Last step completed - show ingredient removal modal
      setIsFinished(true)
      // Pre-select all ingredients for removal
      const allIngredientIds = new Set(recipe.ingredients.map(ing => ing.id))
      setSelectedIngredientsToRemove(allIngredientIds)
      onOpen()
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const toggleIngredientForRemoval = (ingredientId: string) => {
    const newSelected = new Set(selectedIngredientsToRemove)
    if (newSelected.has(ingredientId)) {
      newSelected.delete(ingredientId)
    } else {
      newSelected.add(ingredientId)
    }
    setSelectedIngredientsToRemove(newSelected)
  }

  // Handle live rating updates
  const handleLiveRatingChange = async (newRating: number) => {
    setModalRating(newRating)
    
    // Submit rating immediately when changed
    if (currentUser) {
      try {
        await fetch('http://localhost:3001/api/ratings', {
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
        setHasRated(true)
      } catch (error) {
        console.error('Error submitting live rating:', error)
      }
    }
  }

  // Handle "Update Pantry" button
  const handleUpdatePantry = async () => {
    let removedCount = 0
    let updatedCount = 0
    
    recipe.ingredients.forEach(ingredient => {
      if (selectedIngredientsToRemove.has(ingredient.id)) {
        setPantryData(prevData => {
          let itemProcessed = false
          const newData = prevData.map(location => {
            const updatedItems = location.items.map(item => {
              // More flexible matching - check if ingredient name is contained in item name or vice versa
              const ingredientName = ingredient.name.toLowerCase().trim()
              const itemName = item.name.toLowerCase().trim()
              
              if (itemName.includes(ingredientName) || ingredientName.includes(itemName)) {
                if (itemProcessed) return item // Only process the first match
                itemProcessed = true
                
                // Handle 'cans' or 'pieces' units specially
                if (ingredient.unit && (ingredient.unit.toLowerCase().includes('can') || ingredient.unit.toLowerCase().includes('piece'))) {
                  const currentAmount = parseFloat(item.amount) || 0
                  const usedAmount = parseFloat(ingredient.amount || '1') || 1
                  const newAmount = Math.max(0, currentAmount - usedAmount)
                  
                  if (newAmount > 0) {
                    updatedCount++
                    return { ...item, amount: newAmount.toString() }
                  } else {
                    // Track completely depleted item
                    addDepletedItem(item)
                    removedCount++
                    return null // Mark for removal
                  }
                } else {
                  // For weight/volume units, do basic conversion if units don't match
                  const currentAmount = parseFloat(item.amount) || 0
                  let usedAmount = parseFloat(ingredient.amount || '0') || 0
                  
                  // Basic oz to grams conversion if needed
                  if (ingredient.unit?.toLowerCase().includes('oz') && item.unit?.toLowerCase().includes('g')) {
                    usedAmount = usedAmount * 28.35 // Convert oz to grams
                  }
                  // Basic grams to oz conversion if needed  
                  else if (ingredient.unit?.toLowerCase().includes('g') && item.unit?.toLowerCase().includes('oz')) {
                    usedAmount = usedAmount / 28.35 // Convert grams to oz
                  }
                  
                  const newAmount = Math.max(0, currentAmount - usedAmount)
                  
                  if (newAmount > 0) {
                    updatedCount++
                    return { ...item, amount: newAmount.toString() }
                  } else {
                    // Track completely depleted item
                    addDepletedItem(item)
                    removedCount++
                    return null // Mark for removal
                  }
                }
              }
              return item
            }).filter(item => item !== null) // Remove null items
            
            return {
              ...location,
              items: updatedItems
            }
          })
          
          return newData
        })
      }
    })

    toast({
      title: 'Pantry updated!',
      description: `${removedCount} items removed, ${updatedCount} items updated`,
      status: 'success',
      duration: 3000,
    })

    onModalClose()
    onClose() // Return to recipe view
  }

  // Handle "Done" button
  const handleDone = async () => {
    onModalClose()
    onClose() // Return to recipe view
  }

  const removeIngredientsFromPantry = async () => {
    let removedCount = 0
    let updatedCount = 0
    
    recipe.ingredients.forEach(ingredient => {
      if (selectedIngredientsToRemove.has(ingredient.id)) {
        setPantryData(prevData => {
          let itemProcessed = false
          const newData = prevData.map(location => {
            const updatedItems = location.items.map(item => {
              // More flexible matching - check if ingredient name is contained in item name or vice versa
              const ingredientName = ingredient.name.toLowerCase().trim()
              const itemName = item.name.toLowerCase().trim()
              
              if (itemName.includes(ingredientName) || ingredientName.includes(itemName)) {
                if (itemProcessed) return item // Only process the first match
                itemProcessed = true
                
                // Handle 'cans' or 'pieces' units specially
                if (ingredient.unit && (ingredient.unit.toLowerCase().includes('can') || ingredient.unit.toLowerCase().includes('piece'))) {
                  const currentAmount = parseFloat(item.amount) || 0
                  const usedAmount = parseFloat(ingredient.amount || '1') || 1
                  const newAmount = Math.max(0, currentAmount - usedAmount)
                  
                  if (newAmount > 0) {
                    updatedCount++
                    return { ...item, amount: newAmount.toString() }
                  } else {
                    // Track completely depleted item
                    addDepletedItem(item)
                    removedCount++
                    return null // Mark for removal
                  }
                } else {
                  // For weight/volume units, do basic conversion if units don't match
                  const currentAmount = parseFloat(item.amount) || 0
                  let usedAmount = parseFloat(ingredient.amount || '0') || 0
                  
                  // Basic oz to grams conversion if needed
                  if (ingredient.unit?.toLowerCase().includes('oz') && item.unit?.toLowerCase().includes('g')) {
                    usedAmount = usedAmount * 28.35 // Convert oz to grams
                  }
                  // Basic grams to oz conversion if needed  
                  else if (ingredient.unit?.toLowerCase().includes('g') && item.unit?.toLowerCase().includes('oz')) {
                    usedAmount = usedAmount / 28.35 // Convert grams to oz
                  }
                  
                  const newAmount = Math.max(0, currentAmount - usedAmount)
                  
                  if (newAmount > 0) {
                    updatedCount++
                    return { ...item, amount: newAmount.toString() }
                  } else {
                    // Track completely depleted item
                    addDepletedItem(item)
                    removedCount++
                    return null // Mark for removal
                  }
                }
              }
              return item
            }).filter(item => item !== null) // Remove null items
            
            return {
              ...location,
              items: updatedItems
            }
          })
          
          return newData
        })
      }
    })

    const totalChanges = removedCount + updatedCount
    toast({
      title: 'Pantry updated!',
      description: `${removedCount} items removed, ${updatedCount} items updated`,
      status: 'success',
      duration: 3000,
    })

    // Handle rating from modal if provided
    if (modalRating > 0) {
      await handleRatingSubmit(modalRating)
    }

    onModalClose()
    
    // Always go back to recipe main view after completing cooking
    onClose() // Close cook mode and return to recipe view
  }

  const handleRatingSubmit = async (rating: number, review?: string) => {
    if (!currentUser) {
      toast({
        title: 'Error',
        description: 'Please log in to rate recipes.',
        status: 'error',
        duration: 3000,
      })
      return
    }

    try {
      const response = await fetch('http://localhost:3001/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentUser.uid,
          recipeId: recipe.id,
          rating,
          review
        })
      })

      if (response.ok) {
        toast({
          title: 'Rating submitted!',
          description: `Thank you for rating "${recipe.name}"`,
          status: 'success',
          duration: 3000,
        })
        setHasRated(true)
        setShowRating(false)
        onClose() // Close cook mode
      } else {
        throw new Error('Failed to submit rating')
      }
    } catch (error) {
      console.error('Error submitting rating:', error)
      toast({
        title: 'Error',
        description: 'Failed to submit rating. Please try again.',
        status: 'error',
        duration: 3000,
      })
    }
  }

  const skipRating = () => {
    setShowRating(false)
    onClose() // Close cook mode
  }

  const progress = isFinished ? 100 : ((currentStep + 1) / recipe.instructions.length) * 100

  return (
    <Box minH="100vh" bg={bgColor}>
      {/* Header */}
      <Box p={4} borderBottom="1px" borderColor="gray.200">
        <HStack justify="space-between" align="center">
          <HStack spacing={4}>
            <IconButton
              aria-label="Close cook mode"
              icon={<CloseIcon />}
              size="sm"
              variant="ghost"
              onClick={onClose}
            />
            <VStack align="start" spacing={0}>
              <Heading size="md" color={mutedColor}>
                Recipe Progress
              </Heading>
              <HStack spacing={2}>
                <TimeIcon boxSize="4" color={mutedColor} />
                <Text fontSize="sm" color={mutedColor}>
                  Step {currentStep + 1} of {recipe.instructions.length}
                </Text>
              </HStack>
            </VStack>
          </HStack>
          
          <Progress value={progress} w="200px" colorScheme="orange" />
        </HStack>
      </Box>

      <Grid templateColumns="1fr 400px" minH="calc(100vh - 80px)">
        {/* Main Instruction */}
        <GridItem p={8} display="flex" flexDirection="column" justifyContent="center">
          <VStack spacing={8} maxW="2xl" mx="auto">
            <Badge colorScheme="blue" fontSize="sm" px={3} py={1}>
              Step {currentStep + 1}
            </Badge>
            
            <Box fontSize="2xl" lineHeight="1.4" textAlign="center">
              <ClickableTime 
                text={recipe.instructions[currentStep]?.step || ''}
                recipeStep={currentStep + 1}
                recipeName={recipe.name}
              />
            </Box>

            <HStack spacing={4}>
              <Button
                leftIcon={<ChevronLeftIcon />}
                onClick={prevStep}
                isDisabled={currentStep === 0}
                variant="outline"
                size="lg"
              >
                Previous
              </Button>
              
              <Button
                rightIcon={currentStep === recipe.instructions.length - 1 ? <CheckIcon /> : <ChevronRightIcon />}
                onClick={nextStep}
                isDisabled={isFinished}
                style={{ 
                  backgroundColor: currentStep === recipe.instructions.length - 1 ? brandColor : undefined,
                  color: currentStep === recipe.instructions.length - 1 ? 'white' : undefined
                }}
                colorScheme={currentStep === recipe.instructions.length - 1 ? undefined : "orange"}
                size="lg"
              >
                {currentStep === recipe.instructions.length - 1 ? 'Finish Cooking' : 'Next'}
              </Button>
            </HStack>
          </VStack>
        </GridItem>

        {/* Ingredients Sidebar */}
        <GridItem bg={sidebarBg} p={6}>
          <VStack align="start" spacing={6} h="full">
            <Heading size="md">Ingredients</Heading>
            
            <List spacing={4} w="full" flex={1} overflow="auto">
              {recipe.ingredients.map((ingredient) => {
                const isChecked = checkedIngredients.has(ingredient.id)
                const isHighlighted = recipe.instructions[currentStep]?.step
                  .toLowerCase()
                  .includes(ingredient.name.toLowerCase())
                
                return (
                  <ListItem key={ingredient.id}>
                    <HStack
                      spacing={3}
                      cursor="pointer"
                      onClick={() => toggleIngredient(ingredient.id)}
                      p={3}
                      borderRadius="md"
                      bg={isHighlighted && !isChecked ? 'orange.100' : 'transparent'}
                      opacity={isChecked ? 0.6 : 1}
                      transition="all 0.2s"
                      _dark={{
                        bg: isHighlighted && !isChecked ? 'orange.900' : 'transparent'
                      }}
                    >
                      <Box
                        w="5"
                        h="5"
                        borderRadius="sm"
                        bg={isChecked ? completedColor : 'transparent'}
                        border="2px solid"
                        borderColor={isChecked ? completedColor : 'gray.300'}
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                      >
                        {isChecked && (
                          <Box w="2" h="2" bg="white" borderRadius="sm" />
                        )}
                      </Box>
                      
                      <VStack align="start" spacing={0} flex={1}>
                        <HStack spacing={2} align="center">
                          <Text 
                            fontSize="sm" 
                            fontWeight="bold"
                            color={isHighlighted ? highlightColor : 'inherit'}
                          >
                            {formatIngredientAmount(ingredient.amount, ingredient.unit, preferences.unitSystem)}
                          </Text>
                          <IngredientAvailability 
                            ingredientName={ingredient.name}
                            neededAmount={ingredient.amount}
                            neededUnit={ingredient.unit}
                          />
                        </HStack>
                        <Text 
                          fontSize="sm"
                          color={isHighlighted ? highlightColor : mutedColor}
                          textDecoration={isChecked ? 'line-through' : 'none'}
                        >
                          {ingredient.name}
                        </Text>
                      </VStack>
                    </HStack>
                  </ListItem>
                )
              })}
            </List>

            <Box w="full" pt={4} borderTop="1px" borderColor="gray.200">
              <Button w="full" size="sm" variant="outline">
                {recipe.name}
              </Button>
            </Box>
          </VStack>
        </GridItem>
      </Grid>

      {/* Ingredient Removal Modal */}
      <Modal isOpen={isOpen} onClose={onModalClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <VStack align="start" spacing={2}>
              <HStack spacing={3}>
                <CheckIcon color={brandColor} />
                <Text>Recipe Complete!</Text>
              </HStack>
              <Text fontSize="sm" fontWeight="normal" color={mutedColor}>
                Remove used ingredients from your pantry
              </Text>
            </VStack>
          </ModalHeader>
          <ModalCloseButton />
          
          <ModalBody>
            <VStack spacing={4} align="start">
              <Text fontSize="sm" color={mutedColor}>
                Select which ingredients to remove from your pantry inventory:
              </Text>
              
              <List spacing={3} w="full">
                {recipe.ingredients.map((ingredient) => (
                  <ListItem key={ingredient.id}>
                    <HStack spacing={3} p={3} borderRadius="md" border="1px" borderColor="gray.200">
                      <Checkbox
                        isChecked={selectedIngredientsToRemove.has(ingredient.id)}
                        onChange={() => toggleIngredientForRemoval(ingredient.id)}
                        colorScheme="teal"
                      />
                      <VStack align="start" spacing={1} flex={1}>
                        <Text fontWeight="medium" fontSize="sm">
                          {ingredient.name}
                        </Text>
                        <Text fontSize="xs" style={{ color: brandColor }} fontWeight="bold">
                          -{formatIngredientAmount(ingredient.amount, ingredient.unit, preferences.unitSystem)}
                        </Text>
                      </VStack>
                    </HStack>
                  </ListItem>
                ))}
              </List>
              
              <Text fontSize="xs" color={mutedColor} fontStyle="italic">
                💡 Tip: Uncheck items you didn't use completely or want to keep in your pantry
              </Text>

              {/* Rating Section */}
              <Divider />
              <VStack spacing={3} align="center" w="full">
                <Text fontSize="md" fontWeight="medium" color="gray.800">
                  How was "{recipe.name}"?
                </Text>
                <StarRating
                  rating={modalRating}
                  size="lg"
                  onRatingChange={handleLiveRatingChange}
                  colorScheme="yellow"
                />
                {modalRating > 0 && (
                  <Text fontSize="sm" color={mutedColor}>
                    {modalRating === 1 && "Poor"}
                    {modalRating === 2 && "Fair"}
                    {modalRating === 3 && "Good"}
                    {modalRating === 4 && "Very Good"}
                    {modalRating === 5 && "Excellent"}
                  </Text>
                )}
              </VStack>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button 
              variant="outline"
              mr={3}
              onClick={handleUpdatePantry}
              isDisabled={selectedIngredientsToRemove.size === 0}
            >
              Update Pantry ({selectedIngredientsToRemove.size} items)
            </Button>
            <Button 
              style={{ backgroundColor: brandColor, color: 'white' }}
              _hover={{ backgroundColor: '#2da89c' }}
              onClick={handleDone}
            >
              Done
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Rating Modal */}
      <Modal isOpen={showRating} onClose={skipRating} closeOnOverlayClick={false}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <VStack align="start" spacing={2}>
              <HStack spacing={3}>
                <CheckIcon color={brandColor} />
                <Text>Recipe Complete!</Text>
              </HStack>
              <Text fontSize="sm" fontWeight="normal" color={mutedColor}>
                How was "{recipe.name}"?
              </Text>
            </VStack>
          </ModalHeader>
          <ModalCloseButton />
          
          <ModalBody>
            <RatingPrompt
              onSubmit={handleRatingSubmit}
              title="Rate this recipe"
              subtitle="Help others discover great recipes"
            />
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" onClick={skipRating}>
              Skip for now
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  )
}