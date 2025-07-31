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
  Badge
} from '@chakra-ui/react'
import { useState } from 'react'
import { CloseIcon, ChevronLeftIcon, ChevronRightIcon, TimeIcon } from '@chakra-ui/icons'
import { usePreferences } from '../contexts/PreferencesContext'
import { formatIngredientAmount } from '../utils/units'
import IngredientAvailability from './IngredientAvailability'

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
  const { preferences } = usePreferences()
  
  const bgColor = useColorModeValue('white', 'gray.900')
  const sidebarBg = useColorModeValue('gray.50', 'gray.800')
  const mutedColor = useColorModeValue('gray.500', 'gray.400')
  const highlightColor = useColorModeValue('orange.400', 'orange.300')
  const completedColor = useColorModeValue('green.500', 'green.400')

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
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const progress = ((currentStep + 1) / recipe.instructions.length) * 100

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
                Cooking the chili
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
            
            <Text fontSize="2xl" lineHeight="1.4" textAlign="center">
              {recipe.instructions[currentStep]?.step}
            </Text>

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
                rightIcon={<ChevronRightIcon />}
                onClick={nextStep}
                isDisabled={currentStep === recipe.instructions.length - 1}
                colorScheme="orange"
                size="lg"
              >
                {currentStep === recipe.instructions.length - 1 ? 'Finish' : 'Next'}
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
    </Box>
  )
}