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
  ModalCloseButton,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  List,
  ListItem,
  useToast,
  Spinner,
  Center
} from '@chakra-ui/react'
import { useState, useEffect } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, AddIcon, CalendarIcon, EditIcon, DeleteIcon, SettingsIcon, SearchIcon, BreakfastIcon, LunchIcon, DinnerIcon } from './icons/CustomIcons'

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

// API response interface for recipes
interface PaginatedResponse {
  recipes: Recipe[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export default function CalendarView({ onRecipeSelect }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())
  const [availableRecipes, setAvailableRecipes] = useState<Recipe[]>([])
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner' | ''>('')
  const [loadingRecipes, setLoadingRecipes] = useState(true)
  const [draggedMeal, setDraggedMeal] = useState<string | null>(null)
  const [dragOverSection, setDragOverSection] = useState<string | null>(null)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const toast = useToast()
  
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
        },
        {
          id: '5',
          recipeId: 'recipe-6',
          name: 'Greek Salad',
          imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400',
          prepTime: 15,
          servings: 4,
          description: 'Fresh Mediterranean salad'
        }
      ]
    }
  ])

  // Fetch user's actual recipes from API
  useEffect(() => {
    const fetchRecipes = async () => {
      setLoadingRecipes(true)
      try {
        const response = await fetch('/api/recipes?limit=100')
        if (response.ok) {
          const data: PaginatedResponse = await response.json()
          setAvailableRecipes(data.recipes || [])
          console.log(`Loaded ${data.recipes?.length || 0} recipes from API`)
        } else {
          console.error('Failed to fetch recipes:', response.status, response.statusText)
          // Keep recipes as empty array but show error message
        }
      } catch (error) {
        console.error('Failed to fetch recipes:', error)
        // Network error - keep recipes as empty array
      } finally {
        setLoadingRecipes(false)
      }
    }
    
    fetchRecipes()
  }, [])

  // Filter recipes based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredRecipes(availableRecipes)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = availableRecipes.filter(recipe => 
        recipe.name.toLowerCase().includes(query) ||
        recipe.description?.toLowerCase().includes(query)
      )
      setFilteredRecipes(filtered)
    }
  }, [searchQuery, availableRecipes])
  
  const bgColor = useColorModeValue('#ffffff', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')
  const mutedColor = useColorModeValue('gray.500', 'gray.400')
  const selectedBg = '#38BDAF' // Ovie brand teal
  const cardBg = useColorModeValue('white', 'gray.700')
  const todayBg = useColorModeValue('#38BDAF10', '#38BDAF20') // Light teal background
  const todayBorder = '#38BDAF'

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

  const selectRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe)
  }

  const addMealToPlan = () => {
    if (!selectedDate || !selectedRecipe) return

    const dateStr = selectedDate.toISOString().split('T')[0]
    const newMeal = {
      id: Date.now().toString(),
      recipeId: selectedRecipe.id,
      name: selectedRecipe.name,
      type: selectedMealType as 'breakfast' | 'lunch' | 'dinner',
      imageUrl: selectedRecipe.imageUrl,
      prepTime: selectedRecipe.prepTime,
      cookTime: selectedRecipe.cookTime,
      servings: selectedRecipe.servings,
      description: selectedRecipe.description
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
    
    toast({
      title: 'Recipe added!',
      description: `${selectedRecipe.name} added to ${selectedMealType || 'your day'}`,
      status: 'success',
      duration: 3000,
    })
    
    // Reset and close
    setSelectedRecipe(null)
    setSelectedMealType('')
    setSearchQuery('')
    onClose()
  }

  const handleModalClose = () => {
    setSelectedRecipe(null)
    setSelectedMealType('')
    setSearchQuery('')
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

  const handleDragStart = (e: React.DragEvent, mealId: string) => {
    setDraggedMeal(mealId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnd = () => {
    setDraggedMeal(null)
    setDragOverSection(null)
  }

  const handleDragOver = (e: React.DragEvent, sectionType: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverSection(sectionType)
  }

  const handleDragLeave = () => {
    setDragOverSection(null)
  }

  const handleDrop = (e: React.DragEvent, targetMealType: 'breakfast' | 'lunch' | 'dinner' | 'today') => {
    e.preventDefault()
    if (!draggedMeal || !selectedDate) return

    const dateStr = selectedDate.toISOString().split('T')[0]
    
    setMealPlans(prev => prev.map(plan => {
      if (plan.date === dateStr) {
        return {
          ...plan,
          meals: plan.meals.map(meal => {
            if (meal.id === draggedMeal) {
              return {
                ...meal,
                type: targetMealType === 'today' ? undefined : targetMealType
              } as any
            }
            return meal
          })
        }
      }
      return plan
    }))

    toast({
      title: 'Recipe moved!',
      description: `Recipe moved to ${targetMealType === 'today' ? 'Today' : targetMealType}`,
      status: 'success',
      duration: 2000,
    })

    setDraggedMeal(null)
    setDragOverSection(null)
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const goToToday = () => {
    const today = new Date()
    setCurrentDate(today)
    setSelectedDate(today)
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
              size="md"
              variant="ghost"
              colorScheme="teal"
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
            />
            <VStack spacing={1}>
              <Heading size="md">Calendar</Heading>
              <Button
                size="sm"
                variant="ghost"
                style={{ color: selectedBg }}
                onClick={goToToday}
              >
                Go to Today
              </Button>
            </VStack>
            <IconButton
              aria-label="Next month"
              icon={<ChevronRightIcon />}
              size="md"
              variant="ghost"
              colorScheme="teal"
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
                    <HStack spacing={2}>
                      <Text 
                        fontSize="2xl" 
                        fontWeight="bold"
                        color={selectedDate && selectedDate.toDateString() === date.toDateString() ? selectedBg : isTodayDate ? selectedBg : 'inherit'}
                      >
                        {date.getDate().toString().padStart(2, '0')}
                      </Text>
                      <VStack align="start" spacing={0}>
                        <Text 
                          fontSize="xs" 
                          color={isTodayDate ? selectedBg : mutedColor} 
                          textTransform="uppercase"
                          fontWeight={isTodayDate ? 'semibold' : 'normal'}
                          lineHeight="1"
                        >
                          {daysOfWeek[date.getDay()].slice(0, 3)}
                        </Text>
                        <Text 
                          fontSize="xs" 
                          color={isTodayDate ? selectedBg : mutedColor} 
                          textTransform="uppercase"
                          fontWeight={isTodayDate ? 'semibold' : 'normal'}
                          lineHeight="1"
                        >
                          {months[date.getMonth()].slice(0, 3)}
                        </Text>
                      </VStack>
                    </HStack>
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
                        {meal.type === 'breakfast' ? (
                          <BreakfastIcon w="3" h="3" />
                        ) : meal.type === 'lunch' ? (
                          <LunchIcon w="3" h="3" />
                        ) : (
                          <DinnerIcon w="3" h="3" />
                        )}
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
                size="md" 
                leftIcon={<AddIcon />} 
                style={{ backgroundColor: selectedBg, color: 'white' }}
                _hover={{ backgroundColor: '#2da89c' }}
                onClick={onOpen}
              >
                Add Recipe
              </Button>
            </VStack>

            <Divider />

            {/* Meal Times + Today Section */}
            {(() => {
              const allMeals = getMealsForDate(selectedDate)
              const mealsWithoutType = allMeals.filter(meal => !meal.type)
              const sections = [
                ...(['breakfast', 'lunch', 'dinner'] as const).map(mealType => ({
                  type: mealType,
                  name: mealType,
                  meals: allMeals.filter(meal => meal.type === mealType),
                  color: mealType === 'breakfast' ? '#ffb503' : 
                         mealType === 'lunch' ? selectedBg : '#d72c0d'
                })),
                ...(mealsWithoutType.length > 0 ? [{
                  type: 'today' as const,
                  name: 'today',
                  meals: mealsWithoutType,
                  color: '#38BDAF'
                }] : [])
              ]

              return sections.map((section) => (
                <Box 
                  key={section.type} 
                  w="full"
                  onDragOver={(e) => handleDragOver(e, section.type)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, section.type as any)}
                  bg={dragOverSection === section.type ? `${section.color}15` : 'transparent'}
                  borderRadius="md"
                  p={dragOverSection === section.type ? 2 : 0}
                  border={dragOverSection === section.type ? '2px dashed' : '2px solid transparent'}
                  borderColor={dragOverSection === section.type ? section.color : 'transparent'}
                  transition="all 0.2s"
                >
                  <HStack spacing={3} mb={4}>
                    {section.type === 'breakfast' ? (
                      <BreakfastIcon w="5" h="5" />
                    ) : section.type === 'lunch' ? (
                      <LunchIcon w="5" h="5" />
                    ) : section.type === 'dinner' ? (
                      <DinnerIcon w="5" h="5" />
                    ) : (
                      <CalendarIcon w="5" h="5" />
                    )}
                    <Heading size="md" textTransform="capitalize">
                      {section.name}
                    </Heading>
                    <Badge colorScheme="gray" size="sm">
                      {section.meals.length} {section.meals.length === 1 ? 'recipe' : 'recipes'}
                    </Badge>
                  </HStack>

                  {section.meals.length === 0 ? (
                    <Text color={mutedColor} fontSize="sm" ml={7} mb={4}>
                      No recipes planned
                    </Text>
                  ) : (
                    <VStack spacing={3} align="start" w="full" mb={4}>
                      {section.meals.map((meal) => (
                        <Card 
                          key={meal.id} 
                          size="sm" 
                          w="full"
                          draggable
                          onDragStart={(e) => handleDragStart(e, meal.id)}
                          onDragEnd={handleDragEnd}
                          cursor="grab"
                          _active={{ cursor: 'grabbing' }}
                          opacity={draggedMeal === meal.id ? 0.5 : 1}
                          transform={draggedMeal === meal.id ? 'rotate(5deg)' : 'none'}
                          transition="all 0.2s"
                          _hover={{ 
                            shadow: 'md',
                            transform: draggedMeal === meal.id ? 'rotate(5deg)' : 'translateY(-2px)'
                          }}
                        >
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
                                  size="sm"
                                  variant="ghost"
                                  colorScheme="teal"
                                  onClick={() => onRecipeSelect(meal.recipeId)}
                                />
                                <IconButton
                                  aria-label="Groceries"
                                  icon={<EditIcon />}
                                  size="sm"
                                  variant="ghost"
                                  colorScheme="teal"
                                />
                                <IconButton
                                  aria-label="Remove recipe"
                                  icon={<DeleteIcon />}
                                  size="sm"
                                  variant="ghost"
                                  style={{ color: '#d72c0d' }}
                                  _hover={{ backgroundColor: '#d72c0d20' }}
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
              ))
            })()}
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
            {!selectedRecipe ? (
              <VStack spacing={4} align="start">
                <Text>Search and select a recipe to add:</Text>
                
                {/* Search Box */}
                <InputGroup>
                  <InputLeftElement pointerEvents="none">
                    <SearchIcon color={mutedColor} />
                  </InputLeftElement>
                  <Input
                    placeholder="Search recipes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    focusBorderColor={selectedBg}
                  />
                </InputGroup>
                
                {/* Recipe List */}
                <Box maxH="400px" overflowY="auto" w="full">
                  {loadingRecipes ? (
                    <Center py={8}>
                      <VStack spacing={2}>
                        <Spinner color={selectedBg} />
                        <Text color={mutedColor} fontSize="sm">Loading your recipes...</Text>
                      </VStack>
                    </Center>
                  ) : filteredRecipes.length === 0 ? (
                    <VStack spacing={3} py={8}>
                      <Text color={mutedColor} textAlign="center">
                        {searchQuery ? `No recipes found for "${searchQuery}"` : 'No recipes found'}
                      </Text>
                      {!searchQuery && (
                        <Text fontSize="sm" color={mutedColor} textAlign="center">
                          Add recipes by going to "Add Recipe" in the sidebar, then come back here to plan your meals!
                        </Text>
                      )}
                    </VStack>
                  ) : (
                    <List spacing={3}>
                      {filteredRecipes.map((recipe) => (
                        <ListItem key={recipe.id}>
                          <Card 
                            variant="outline" 
                            cursor="pointer"
                            onClick={() => selectRecipe(recipe)}
                            _hover={{ borderColor: selectedBg, shadow: 'md' }}
                            transition="all 0.2s"
                          >
                            <CardBody p={4}>
                              <HStack spacing={4}>
                                {recipe.imageUrl && (
                                  <Image
                                    src={recipe.imageUrl}
                                    alt={recipe.name}
                                    w="60px"
                                    h="60px"
                                    objectFit="cover"
                                    borderRadius="md"
                                  />
                                )}
                                <VStack align="start" spacing={1} flex={1}>
                                  <Text fontWeight="bold" fontSize="md">
                                    {recipe.name}
                                  </Text>
                                  {recipe.description && (
                                    <Text fontSize="sm" color={mutedColor} noOfLines={2}>
                                      {recipe.description}
                                    </Text>
                                  )}
                                  <HStack spacing={2}>
                                    {recipe.prepTime && (
                                      <Badge size="sm" colorScheme="blue">
                                        {recipe.prepTime}m prep
                                      </Badge>
                                    )}
                                    {recipe.servings && (
                                      <Badge size="sm" colorScheme="green">
                                        Serves {recipe.servings}
                                      </Badge>
                                    )}
                                  </HStack>
                                </VStack>
                              </HStack>
                            </CardBody>
                          </Card>
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Box>
              </VStack>
            ) : (
              <VStack spacing={4} align="start">
                <Text>Selected Recipe:</Text>
                
                {/* Selected Recipe Preview */}
                <Card variant="outline" w="full">
                  <CardBody>
                    <HStack spacing={4}>
                      {selectedRecipe.imageUrl && (
                        <Image
                          src={selectedRecipe.imageUrl}
                          alt={selectedRecipe.name}
                          w="80px"
                          h="80px"
                          objectFit="cover"
                          borderRadius="md"
                        />
                      )}
                      <VStack align="start" spacing={1} flex={1}>
                        <Text fontWeight="bold" fontSize="lg">
                          {selectedRecipe.name}
                        </Text>
                        {selectedRecipe.description && (
                          <Text fontSize="sm" color={mutedColor}>
                            {selectedRecipe.description}
                          </Text>
                        )}
                      </VStack>
                    </HStack>
                  </CardBody>
                </Card>
                
                {/* Meal Type Selection */}
                <VStack align="start" spacing={2} w="full">
                  <Text fontWeight="medium">Choose meal type (optional):</Text>
                  <Select
                    placeholder="Select meal type or leave blank for 'Today'"
                    value={selectedMealType}
                    onChange={(e) => setSelectedMealType(e.target.value as any)}
                    focusBorderColor={selectedBg}
                  >
                    <option value="breakfast">☕ Breakfast</option>
                    <option value="lunch">🍽️ Lunch</option>
                    <option value="dinner">🍴 Dinner</option>
                  </Select>
                  <Text fontSize="xs" color={mutedColor}>
                    💡 Leave blank to add to a general "Today" section
                  </Text>
                </VStack>
              </VStack>
            )}
          </ModalBody>

          <ModalFooter>
            {selectedRecipe ? (
              <>
                <Button variant="ghost" mr={3} onClick={() => setSelectedRecipe(null)}>
                  Back
                </Button>
                <Button 
                  style={{ backgroundColor: selectedBg, color: 'white' }}
                  _hover={{ backgroundColor: '#2da89c' }}
                  onClick={addMealToPlan}
                >
                  Add Recipe
                </Button>
              </>
            ) : (
              <Button onClick={handleModalClose}>Close</Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Grid>
  )
}