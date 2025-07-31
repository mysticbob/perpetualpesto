import {
  Box,
  Grid,
  GridItem,
  Heading,
  Text,
  Image,
  Badge,
  HStack,
  VStack,
  Button,
  List,
  ListItem,
  OrderedList,
  useColorModeValue,
  IconButton,
  Divider,
  useDisclosure
} from '@chakra-ui/react'
import { useState, useEffect, useRef } from 'react'
import { CloseIcon, TimeIcon, CalendarIcon, EditIcon } from '@chakra-ui/icons'
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
    completed?: boolean
  }>
  instructions: Array<{
    id: string
    step: string
    active?: boolean
  }>
}

interface RecipeViewProps {
  recipe: Recipe
  onClose: () => void
  onStartCooking: () => void
}

export default function RecipeView({ recipe, onClose, onStartCooking }: RecipeViewProps) {
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set())
  const [activeStep, setActiveStep] = useState<number>(0)
  const instructionsRef = useRef<HTMLDivElement>(null)
  const { 
    isOpen: isGroceryDialogOpen, 
    onOpen: onOpenGroceryDialog, 
    onClose: onCloseGroceryDialog 
  } = useDisclosure()
  const { preferences } = usePreferences()
  
  const bgColor = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')
  const mutedColor = useColorModeValue('gray.500', 'gray.400')
  const activeStepBg = useColorModeValue('blue.50', 'blue.900')
  const activeStepBorder = useColorModeValue('blue.200', 'blue.600')

  const toggleIngredient = (ingredientId: string) => {
    const newChecked = new Set(checkedIngredients)
    if (newChecked.has(ingredientId)) {
      newChecked.delete(ingredientId)
    } else {
      newChecked.add(ingredientId)
    }
    setCheckedIngredients(newChecked)
  }

  // Handle scroll to highlight active step
  useEffect(() => {
    const handleScroll = () => {
      if (!instructionsRef.current) return
      
      const steps = instructionsRef.current.querySelectorAll('[data-step]')
      const scrollTop = instructionsRef.current.scrollTop
      const containerHeight = instructionsRef.current.clientHeight
      
      let newActiveStep = 0
      steps.forEach((step, index) => {
        const stepElement = step as HTMLElement
        const stepTop = stepElement.offsetTop - instructionsRef.current!.offsetTop
        const stepHeight = stepElement.offsetHeight
        
        if (scrollTop >= stepTop - containerHeight / 3 && 
            scrollTop < stepTop + stepHeight - containerHeight / 3) {
          newActiveStep = index
        }
      })
      
      setActiveStep(newActiveStep)
    }

    const container = instructionsRef.current
    if (container) {
      container.addEventListener('scroll', handleScroll)
      return () => container.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return (
    <Box minH="100vh" bg={bgColor}>
      {/* Header */}
      <Box p={6} borderBottom="1px" borderColor={borderColor}>
        <HStack justify="space-between" align="start">
          <VStack align="start" spacing={2} flex={1}>
            <HStack>
              <IconButton
                aria-label="Close recipe"
                icon={<CloseIcon />}
                size="sm"
                variant="ghost"
                onClick={onClose}
              />
              <Heading size="lg">{recipe.name}</Heading>
            </HStack>
            
            {recipe.description && (
              <Text color={mutedColor} fontSize="md" maxW="2xl">
                {recipe.description}
              </Text>
            )}

            <HStack spacing={4} wrap="wrap">
              <HStack spacing={1}>
                <TimeIcon color={mutedColor} />
                <Text fontSize="sm" color={mutedColor}>vera.cooking</Text>
              </HStack>
              <HStack spacing={1}>
                <Text fontSize="sm" color={mutedColor}>👥 {recipe.servings || 4}</Text>
              </HStack>
              {recipe.prepTime && (
                <Badge colorScheme="blue" px={2} py={1}>
                  {recipe.prepTime}min PREP
                </Badge>
              )}
              {recipe.cookTime && (
                <Badge colorScheme="orange" px={2} py={1}>
                  {recipe.cookTime}min COOK
                </Badge>
              )}
              {recipe.totalTime && (
                <Badge colorScheme="green" px={2} py={1}>
                  {recipe.totalTime}min TOTAL
                </Badge>
              )}
            </HStack>

            <HStack spacing={2} mt={2}>
              <Button colorScheme="red" size="sm" leftIcon={<TimeIcon />} onClick={onStartCooking}>
                Cook
              </Button>
              <Button 
                size="sm" 
                leftIcon={<EditIcon />} 
                variant="outline"
                onClick={onOpenGroceryDialog}
              >
                Groceries
              </Button>
              <Button size="sm" leftIcon={<CalendarIcon />} variant="outline">
                Adjust
              </Button>
            </HStack>
          </VStack>

          {recipe.imageUrl && (
            <Image
              src={recipe.imageUrl}
              alt={recipe.name}
              w="200px"
              h="150px"
              objectFit="cover"
              borderRadius="md"
            />
          )}
        </HStack>
      </Box>

      {/* Main Content */}
      <Grid templateColumns="1fr 300px" minH="calc(100vh - 200px)">
        {/* Instructions */}
        <GridItem>
          <VStack align="start" spacing={6} p={6} h="full" overflow="auto" ref={instructionsRef}>
            <Heading size="md">Instructions</Heading>
            
            <OrderedList spacing={6} w="full">
              {recipe.instructions.map((instruction, index) => (
                <ListItem
                  key={instruction.id}
                  data-step={index}
                  p={4}
                  borderRadius="md"
                  bg={index === activeStep ? activeStepBg : 'transparent'}
                  border="2px solid"
                  borderColor={index === activeStep ? activeStepBorder : 'transparent'}
                  transition="all 0.2s"
                >
                  <Text fontSize="md" lineHeight="1.6">
                    {instruction.step}
                  </Text>
                </ListItem>
              ))}
            </OrderedList>
          </VStack>
        </GridItem>

        {/* Ingredients Sidebar */}
        <GridItem borderLeft="1px" borderColor={borderColor}>
          <VStack align="start" spacing={4} p={6} h="full" overflow="auto">
            <Heading size="md">Ingredients</Heading>
            
            <List spacing={3} w="full">
              {recipe.ingredients.map((ingredient) => (
                <ListItem key={ingredient.id}>
                  <HStack
                    spacing={3}
                    cursor="pointer"
                    onClick={() => toggleIngredient(ingredient.id)}
                    opacity={checkedIngredients.has(ingredient.id) ? 0.5 : 1}
                    transition="opacity 0.2s"
                  >
                    <Box
                      w="4"
                      h="4"
                      borderRadius="sm"
                      bg={checkedIngredients.has(ingredient.id) ? 'green.500' : 'transparent'}
                      border="2px solid"
                      borderColor={checkedIngredients.has(ingredient.id) ? 'green.500' : 'gray.300'}
                    />
                    <VStack align="start" spacing={0} flex={1}>
                      <Text fontSize="sm" fontWeight="medium">
                        {formatIngredientAmount(ingredient.amount, ingredient.unit, preferences.unitSystem)}
                      </Text>
                      <Text fontSize="sm" color={mutedColor}>
                        {ingredient.name}
                      </Text>
                    </VStack>
                    <IngredientAvailability 
                      ingredientName={ingredient.name}
                      neededAmount={ingredient.amount}
                      neededUnit={ingredient.unit}
                    />
                  </HStack>
                </ListItem>
              ))}
            </List>
          </VStack>
        </GridItem>
      </Grid>

      {/* Grocery Options Dialog */}
      <GroceryOptionsDialog
        isOpen={isGroceryDialogOpen}
        onClose={onCloseGroceryDialog}
        recipe={recipe}
        onCreateGroceryList={(option) => {
          console.log('Creating grocery list with option:', option)
          // Here you would implement the actual grocery list creation logic
        }}
      />
    </Box>
  )
}