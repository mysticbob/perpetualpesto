import {
  Box,
  Grid,
  GridItem,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  IconButton,
  Badge,
  useColorModeValue,
  Card,
  CardBody,
  Image,
  Divider,
  SimpleGrid,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton
} from '@chakra-ui/react'
import { useState, useEffect } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, AddIcon, CalendarIcon, EditIcon, DeleteIcon, SettingsIcon } from '@chakra-ui/icons'

interface MealPlan {
  id: string
  date: string
  meals: Array<{
    id: string
    recipeId: string
    name: string
    type: 'breakfast' | 'lunch' | 'dinner'
    imageUrl?: string
    prepTime?: number
    cookTime?: number
    servings?: number
    description?: string
  }>
}

interface Recipe {
  id: string
  name: string
  description?: string
  prepTime?: number
  cookTime?: number
  servings?: number
  imageUrl?: string
}

interface CalendarViewProps {
  onRecipeSelect: (recipeId: string) => void
}

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function CalendarView({ onRecipeSelect }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())
  const [availableRecipes, setAvailableRecipes] = useState<Recipe[]>([])
  const [loadingRecipes, setLoadingRecipes] = useState(false)
  const { isOpen, onOpen, onClose } = useDisclosure()
  
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([
    {
      id: '1',
      date: '2024-03-26',
      meals: [
        {
          id: '1',
          recipeId: 'recipe-1',
          name: "Shepherd's Pie",
          type: 'dinner',
          imageUrl: 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400',
          prepTime: 20,
          cookTime: 45,
          servings: 4,
          description: 'Classic comfort food'
        }
      ]
    },
    {
      id: '2', 
      date: '2024-03-27',
      meals: [
        {
          id: '2',
          recipeId: 'recipe-2',
          name: 'Spaghetti al Pomodoro',
          type: 'breakfast',
          imageUrl: 'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=400',
          servings: 2,
          description: 'Simple Italian pasta'
        },
        {
          id: '3',
          recipeId: 'recipe-3',
          name: 'Veggie Burger',
          type: 'lunch',
          imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400',
          servings: 1,
          description: 'Healthy plant-based burger'
        }
      ]
    },
    {
      id: '3',
      date: '2024-03-28',
      meals: [
        {
          id: '4',
          recipeId: 'recipe-4',
          name: 'Chili sin carne',
          type: 'dinner',
          imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400',
          prepTime: 15,
          cookTime: 60,
          servings: 8,
          description: 'Spicy vegetarian chili'
        }
      ]
    }
  ])

  // Load available recipes for adding to meal plan
  useEffect(() => {
    const fetchRecipes = async () => {
      setLoadingRecipes(true)
      try {
        const response = await fetch('/api/recipes')
        if (response.ok) {
          const recipes = await response.json()
          setAvailableRecipes(recipes)
        }
      } catch (error) {
        console.error('Failed to fetch recipes:', error)
      } finally {
        setLoadingRecipes(false)
      }
    }
    
    fetchRecipes()
  }, [])
  
  const bgColor = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')
  const mutedColor = useColorModeValue('gray.500', 'gray.400')
  const selectedBg = useColorModeValue('red.500', 'red.600')
  const cardBg = useColorModeValue('white', 'gray.700')
  const todayBg = useColorModeValue('blue.50', 'blue.900')
  const todayBorder = useColorModeValue('blue.200', 'blue.600')

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    
    const days = []
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i))
    }
    return days
  }

  const getMealsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    const mealPlan = mealPlans.find(plan => plan.date === dateStr)
    return mealPlan?.meals || []
  }

  const addMealToPlan = (recipeId: string, mealType: 'breakfast' | 'lunch' | 'dinner') => {
    if (!selectedDate) return
    
    const recipe = availableRecipes.find(r => r.id === recipeId)
    if (!recipe) return

    const dateStr = selectedDate.toISOString().split('T')[0]
    const newMeal = {
      id: Date.now().toString(),
      recipeId: recipe.id,
      name: recipe.name,
      type: mealType,
      imageUrl: recipe.imageUrl,
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      servings: recipe.servings,
      description: recipe.description
    }

    setMealPlans(prev => {
      const existingPlan = prev.find(plan => plan.date === dateStr)
      if (existingPlan) {
        return prev.map(plan => 
          plan.date === dateStr 
            ? { ...plan, meals: [...plan.meals, newMeal] }
            : plan
        )
      } else {
        return [...prev, {
          id: Date.now().toString(),
          date: dateStr,
          meals: [newMeal]
        }]
      }
    })
    
    onClose()
  }

  const removeMealFromPlan = (mealId: string) => {
    if (!selectedDate) return
    
    const dateStr = selectedDate.toISOString().split('T')[0]
    setMealPlans(prev => prev.map(plan => 
      plan.date === dateStr 
        ? { ...plan, meals: plan.meals.filter(meal => meal.id !== mealId) }
        : plan
    ))
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const days = getDaysInMonth(currentDate)

  return (
    <Grid templateColumns="300px 1fr" minH="100vh" bg={bgColor}>
      {/* Calendar Sidebar */}
      <GridItem borderRight="1px" borderColor={borderColor} p={4}>
        <VStack spacing={4} align="start">
          <HStack justify="space-between" w="full">
            <IconButton
              aria-label="Previous month"
              icon={<ChevronLeftIcon />}
              size="sm"
              variant="ghost"
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
            />
            <VStack spacing={1}>
              <Heading size="md">Calendar</Heading>
              <Button
                size="xs"
                variant="ghost"
                colorScheme="blue"
                onClick={goToToday}
              >
                Go to Today
              </Button>
            </VStack>
            <IconButton
              aria-label="Next month"
              icon={<ChevronRightIcon />}
              size="sm"
              variant="ghost"
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
            />
          </HStack>

          <Text fontSize="sm" color={mutedColor} w="full" textAlign="center">
            {months[currentDate.getMonth()]} {currentDate.getFullYear()}
          </Text>

          <VStack spacing={3} w="full">
            {days.map((date) => {
              const meals = getMealsForDate(date)
              const isTodayDate = isToday(date)
              
              return (
                <Box 
                  key={date.toISOString()} 
                  w="full"
                  p={3}
                  borderRadius="md"
                  bg={isTodayDate ? todayBg : 'transparent'}
                  border="1px solid"
                  borderColor={isTodayDate ? todayBorder : 'transparent'}
                  transition="all 0.2s"
                  cursor="pointer"
                  onClick={() => setSelectedDate(date)}
                >
                  <HStack justify="space-between" align="center" mb={2}>
                    <VStack align="start" spacing={0}>
                      <Text 
                        fontSize="2xl" 
                        fontWeight="bold"
                        color={selectedDate && selectedDate.toDateString() === date.toDateString() ? selectedBg : isTodayDate ? 'blue.600' : 'inherit'}
                      >
                        {date.getDate().toString().padStart(2, '0')}
                      </Text>
                      <Text 
                        fontSize="xs" 
                        color={isTodayDate ? 'blue.600' : mutedColor} 
                        textTransform="uppercase"
                        fontWeight={isTodayDate ? 'semibold' : 'normal'}
                      >
                        {daysOfWeek[date.getDay()]}
                      </Text>
                      <Text 
                        fontSize="xs" 
                        color={isTodayDate ? 'blue.600' : mutedColor} 
                        textTransform="uppercase"
                        fontWeight={isTodayDate ? 'semibold' : 'normal'}
                      >
                        {months[date.getMonth()].slice(0, 3)}
                      </Text>
                    </VStack>
                    
                    <IconButton
                      aria-label="Add meal"
                      icon={<AddIcon />}
                      size="sm"
                      variant="ghost"
                      colorScheme="red"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedDate(date)
                        onOpen()
                      }}
                    />
                  </HStack>

                  <VStack spacing={2} align="start" w="full">
                    {meals.map((meal) => (
                      <HStack
                        key={meal.id}
                        spacing={2}
                        cursor="pointer"
                        onClick={() => onRecipeSelect(meal.recipeId)}
                        w="full"
                      >
                        <Box
                          w="3"
                          h="3"
                          borderRadius="full"
                          bg={meal.type === 'breakfast' ? 'yellow.400' : 
                              meal.type === 'lunch' ? 'blue.400' : 'red.400'}
                        />
                        <Text fontSize="sm" flex={1}>
                          {meal.name}
                        </Text>
                      </HStack>
                    ))}
                  </VStack>
                </Box>
              )
            })}
          </VStack>
        </VStack>
      </GridItem>

      {/* Meal Planning Panel */}
      <GridItem p={6}>
        {selectedDate ? (
          <VStack spacing={6} align="start" w="full">
            <VStack spacing={2} align="start" w="full">
              <Heading size="lg">
                {selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </Heading>
              <Button 
                size="sm" 
                leftIcon={<AddIcon />} 
                colorScheme="blue"
                onClick={onOpen}
              >
                Add Recipe
              </Button>
            </VStack>

            <Divider />

            {/* Meal Times */}
            {(['breakfast', 'lunch', 'dinner'] as const).map((mealType) => {
              const mealsForType = getMealsForDate(selectedDate).filter(meal => meal.type === mealType)
              const mealColor = mealType === 'breakfast' ? 'yellow' : 
                              mealType === 'lunch' ? 'blue' : 'red'
              
              return (
                <Box key={mealType} w="full">
                  <HStack spacing={3} mb={4}>
                    <Box
                      w="4"
                      h="4"
                      borderRadius="full"
                      bg={`${mealColor}.400`}
                    />
                    <Heading size="md" textTransform="capitalize">
                      {mealType}
                    </Heading>
                    <Badge colorScheme="gray" size="sm">
                      {mealsForType.length} {mealsForType.length === 1 ? 'recipe' : 'recipes'}
                    </Badge>
                  </HStack>

                  {mealsForType.length === 0 ? (
                    <Text color={mutedColor} fontSize="sm" ml={7} mb={4}>
                      No recipes planned
                    </Text>
                  ) : (
                    <VStack spacing={3} align="start" w="full" mb={4}>
                      {mealsForType.map((meal) => (
                        <Card key={meal.id} size="sm" w="full">
                          <CardBody>
                            <HStack spacing={4} align="start">
                              {meal.imageUrl && (
                                <Image
                                  src={meal.imageUrl}
                                  alt={meal.name}
                                  w="60px"
                                  h="60px"
                                  objectFit="cover"
                                  borderRadius="md"
                                />
                              )}
                              
                              <VStack align="start" spacing={1} flex={1}>
                                <Text fontWeight="medium" fontSize="sm">
                                  {meal.name}
                                </Text>
                                {meal.description && (
                                  <Text fontSize="xs" color={mutedColor} noOfLines={2}>
                                    {meal.description}
                                  </Text>
                                )}
                                <HStack spacing={2}>
                                  {meal.prepTime && (
                                    <Badge size="xs" colorScheme="blue">
                                      {meal.prepTime}m prep
                                    </Badge>
                                  )}
                                  {meal.servings && (
                                    <Badge size="xs" colorScheme="green">
                                      Serves {meal.servings}
                                    </Badge>
                                  )}
                                </HStack>
                              </VStack>

                              <VStack spacing={1}>
                                <IconButton
                                  aria-label="Adjust recipe"
                                  icon={<SettingsIcon />}
                                  size="xs"
                                  variant="ghost"
                                  onClick={() => onRecipeSelect(meal.recipeId)}
                                />
                                <IconButton
                                  aria-label="Groceries"
                                  icon={<EditIcon />}
                                  size="xs"
                                  variant="ghost"
                                />
                                <IconButton
                                  aria-label="Remove recipe"
                                  icon={<DeleteIcon />}
                                  size="xs"
                                  variant="ghost"
                                  colorScheme="red"
                                  onClick={() => removeMealFromPlan(meal.id)}
                                />
                              </VStack>
                            </HStack>
                          </CardBody>
                        </Card>
                      ))}
                    </VStack>
                  )}
                </Box>
              )
            })}
          </VStack>
        ) : (
          <VStack spacing={4} align="center" justify="center" h="full">
            <CalendarIcon boxSize={12} color={mutedColor} />
            <Text color={mutedColor} textAlign="center">
              Select a date to plan your meals
            </Text>
          </VStack>
        )}
      </GridItem>

      {/* Add Recipe Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add Recipe to {selectedDate?.toLocaleDateString()}</ModalHeader>
          <ModalCloseButton />
          
          <ModalBody>
            <VStack spacing={4} align="start">
              <Text>Choose a meal time and recipe:</Text>
              
              {(['breakfast', 'lunch', 'dinner'] as const).map((mealType) => (
                <Box key={mealType} w="full">
                  <HStack spacing={3} mb={3}>
                    <Box
                      w="3"
                      h="3"
                      borderRadius="full"
                      bg={mealType === 'breakfast' ? 'yellow.400' : 
                          mealType === 'lunch' ? 'blue.400' : 'red.400'}
                    />
                    <Heading size="sm" textTransform="capitalize">
                      {mealType}
                    </Heading>
                  </HStack>
                  
                  <SimpleGrid columns={1} spacing={2} ml={6}>
                    {loadingRecipes ? (
                      <Text fontSize="sm" color={mutedColor}>Loading recipes...</Text>
                    ) : availableRecipes.length === 0 ? (
                      <Text fontSize="sm" color={mutedColor}>No recipes available</Text>
                    ) : (
                      availableRecipes.slice(0, 3).map((recipe) => (
                        <Button
                          key={recipe.id}
                          variant="ghost"
                          size="sm"
                          justifyContent="start"
                          onClick={() => addMealToPlan(recipe.id, mealType)}
                        >
                          {recipe.name}
                        </Button>
                      ))
                    )}
                  </SimpleGrid>
                </Box>
              ))}
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button onClick={onClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Grid>
  )
}