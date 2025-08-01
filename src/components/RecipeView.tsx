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
import { CloseIcon, TimeIcon, CalendarIcon, EditIcon } from './icons/CustomIcons'
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
    <Box h="100vh" bg={bgColor} display="flex" flexDirection="column">
      {/* Compact Header */}
      <Box p={4} borderBottom="1px" borderColor={borderColor} flexShrink={0}>
        <VStack align="start" spacing={3}>
          <HStack justify="space-between" w="full">
            <HStack>
              <IconButton
                aria-label="Close recipe"
                icon={<CloseIcon />}
                size="sm"
                variant="ghost"
                onClick={onClose}
              />
              <Heading size="md">{recipe.name}</Heading>
            </HStack>
            
            {recipe.imageUrl && (
              <Image
                src={recipe.imageUrl}
                alt={recipe.name}
                w="80px"
                h="60px"
                objectFit="cover"
                borderRadius="md"
              />
            )}
          </HStack>
          
          {recipe.description && (
            <Text color={mutedColor} fontSize="sm" noOfLines={2}>
              {recipe.description}
            </Text>
          )}

          <HStack spacing={3} wrap="wrap" fontSize="xs">
            <HStack spacing={1}>
              <Text color={mutedColor}>👥 {recipe.servings || 4}</Text>
            </HStack>
            {recipe.prepTime && (
              <Badge colorScheme="blue" size="sm">
                {recipe.prepTime}m PREP
              </Badge>
            )}
            {recipe.cookTime && (
              <Badge colorScheme="orange" size="sm">
                {recipe.cookTime}m COOK
              </Badge>
            )}
            {recipe.totalTime && (
              <Badge colorScheme="green" size="sm">
                {recipe.totalTime}m TOTAL
              </Badge>
            )}
          </HStack>

          <HStack spacing={2}>
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
      </Box>

      {/* Main Content */}
      <Grid templateColumns="1fr 280px" flex={1} minH={0}>
        {/* Instructions */}
        <GridItem overflow="auto">
          <VStack align="start" spacing={4} p={4} h="full">
            <Heading size="sm">Instructions</Heading>
            
            <OrderedList spacing={4} w="full">
              {recipe.instructions.map((instruction, index) => (
                <ListItem
                  key={instruction.id}
                  data-step={index}
                  p={3}
                  borderRadius="md"
                  bg={index === activeStep ? activeStepBg : 'transparent'}
                  border="2px solid"
                  borderColor={index === activeStep ? activeStepBorder : 'transparent'}
                  transition="all 0.2s"
                >
                  <Text fontSize="sm" lineHeight="1.5">
                    {instruction.step}
                  </Text>
                </ListItem>
              ))}
            </OrderedList>
          </VStack>
        </GridItem>

        {/* Ingredients Sidebar */}
        <GridItem borderLeft="1px" borderColor={borderColor} overflow="auto">
          <VStack align="start" spacing={3} p={4} h="full">
            <Heading size="sm">Ingredients</Heading>
            
            <List spacing={2} w="full">
              {recipe.ingredients.map((ingredient) => (
                <ListItem key={ingredient.id}>
                  <HStack
                    spacing={2}
                    cursor="pointer"
                    onClick={() => toggleIngredient(ingredient.id)}
                    opacity={checkedIngredients.has(ingredient.id) ? 0.5 : 1}
                    transition="opacity 0.2s"
                    p={2}
                    borderRadius="sm"
                    _hover={{ bg: useColorModeValue('gray.50', 'gray.700') }}
                  >
                    <Box
                      w="3"
                      h="3"
                      borderRadius="sm"
                      bg={checkedIngredients.has(ingredient.id) ? 'green.500' : 'transparent'}
                      border="2px solid"
                      borderColor={checkedIngredients.has(ingredient.id) ? 'green.500' : 'gray.300'}
                      flexShrink={0}
                    />
                    <VStack align="start" spacing={0} flex={1} minW={0}>
                      <Text fontSize="xs" fontWeight="medium" noOfLines={1}>
                        {formatIngredientAmount(ingredient.amount, ingredient.unit, preferences.unitSystem)}
                      </Text>
                      <Text fontSize="xs" color={mutedColor} noOfLines={1}>
                        {ingredient.name}
                      </Text>
                    </VStack>
                    <Box flexShrink={0}>
                      <IngredientAvailability 
                        ingredientName={ingredient.name}
                        neededAmount={ingredient.amount}
                        neededUnit={ingredient.unit}
                      />
                    </Box>
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