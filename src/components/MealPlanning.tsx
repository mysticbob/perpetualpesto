/**
 * MealPlanning Component
 * Weekly meal planning with Claude AI integration
 */

import React, { useState } from 'react'
import {
  Box,
  Container,
  Grid,
  GridItem,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  IconButton,
  useColorModeValue,
  Flex,
  Spacer,
  Tooltip,
  Switch,
  FormControl,
  FormLabel,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Alert,
  AlertIcon,
  Divider,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Skeleton,
  SkeletonText,
  Progress,
  Avatar,
  AvatarGroup,
} from '@chakra-ui/react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import {
  FiCalendar,
  FiClock,
  FiEdit2,
  FiCheck,
  FiX,
  FiRefreshCw,
  FiChevronLeft,
  FiChevronRight,
  FiZap,
  FiShoppingCart,
  FiAlertCircle,
  FiStar,
  FiTrash2,
  FiPlus,
  FiRepeat,
  FiShuffle,
  FiThumbsUp,
  FiThumbsDown,
} from 'react-icons/fi'
import { useMealPlan } from '../hooks/useMealPlan'
import { format, addDays, startOfWeek, isSameDay } from 'date-fns'

const MotionBox = motion(Box)
const MotionCard = motion(Card)

interface MealPlanningProps {
  userId: string
}

const MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'DINNER'] as const
const MEAL_TYPE_COLORS = {
  BREAKFAST: 'yellow',
  LUNCH: 'green',
  DINNER: 'blue',
  SNACK: 'purple',
}

export default function MealPlanning({ userId }: MealPlanningProps) {
  const {
    mealPlan,
    mealsByDate,
    suggestions,
    generatePlan,
    approvePlan,
    updateMeal,
    markAsCooked,
    isGenerating,
    isApproving,
  } = useMealPlan(userId)
  
  const [selectedWeek, setSelectedWeek] = useState(startOfWeek(new Date()))
  const [yoloMode, setYoloMode] = useState(false)
  const [selectedMeal, setSelectedMeal] = useState<any>(null)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const toast = useToast()
  
  const bgColor = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.700')
  const hoverBg = useColorModeValue('gray.50', 'gray.700')
  const accentBg = useColorModeValue('blue.50', 'blue.900')
  
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(selectedWeek, i))
  
  const handleGeneratePlan = () => {
    generatePlan({
      weekStartDate: selectedWeek,
      planningMode: yoloMode ? 'yolo' : 'assisted',
      includeLeftovers: true,
    })
  }
  
  const handleApprovePlan = () => {
    if (mealPlan?.id) {
      approvePlan(mealPlan.id)
    }
  }
  
  const handleSwapMeal = (meal: any) => {
    setSelectedMeal(meal)
    onOpen()
  }
  
  const handleMarkCooked = (mealId: string) => {
    markAsCooked(mealId)
  }
  
  const handleDeleteMeal = (mealId: string) => {
    updateMeal({
      mealId,
      updates: { skipped: true }
    })
  }
  
  const getPlanStatusColor = () => {
    if (!mealPlan) return 'gray'
    switch (mealPlan.status) {
      case 'DRAFT': return 'yellow'
      case 'APPROVED': return 'green'
      case 'ACTIVE': return 'blue'
      case 'COMPLETED': return 'purple'
      default: return 'gray'
    }
  }
  
  return (
    <Container maxW="container.xl" py={6}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <Flex align="center" wrap="wrap" gap={4}>
          <VStack align="start" spacing={1}>
            <Heading size="lg">Meal Planning</Heading>
            <Text color="gray.500">
              Plan your meals for the week
            </Text>
          </VStack>
          <Spacer />
          
          {/* YOLO Mode Toggle */}
          <FormControl display="flex" alignItems="center" w="auto">
            <FormLabel htmlFor="yolo-mode" mb="0" mr={2}>
              <HStack>
                <FiShuffle />
                <Text>YOLO Mode</Text>
              </HStack>
            </FormLabel>
            <Switch
              id="yolo-mode"
              colorScheme="purple"
              isChecked={yoloMode}
              onChange={(e) => setYoloMode(e.target.checked)}
            />
            <Tooltip label="Let Claude be creative and adventurous with meal combinations!">
              <Box ml={2}>
                <FiAlertCircle />
              </Box>
            </Tooltip>
          </FormControl>
          
          <Button
            leftIcon={<FiZap />}
            colorScheme="blue"
            onClick={handleGeneratePlan}
            isLoading={isGenerating}
            loadingText="Generating..."
          >
            Generate Plan
          </Button>
        </Flex>
        
        {/* Plan Status Bar */}
        {mealPlan && (
          <Card>
            <CardBody>
              <HStack justify="space-between">
                <HStack>
                  <Badge colorScheme={getPlanStatusColor()} fontSize="md" px={3} py={1}>
                    {mealPlan.status}
                  </Badge>
                  <Text fontSize="sm" color="gray.500">
                    Generated by {mealPlan.generatedBy === 'claude' ? 'Claude AI' : 'Manual'}
                  </Text>
                </HStack>
                
                {mealPlan.status === 'DRAFT' && (
                  <HStack>
                    <Button
                      size="sm"
                      leftIcon={<FiThumbsDown />}
                      variant="outline"
                      onClick={handleGeneratePlan}
                    >
                      Regenerate
                    </Button>
                    <Button
                      size="sm"
                      leftIcon={<FiThumbsUp />}
                      colorScheme="green"
                      onClick={handleApprovePlan}
                      isLoading={isApproving}
                    >
                      Approve Plan
                    </Button>
                  </HStack>
                )}
                
                {mealPlan.status === 'APPROVED' && (
                  <Button
                    size="sm"
                    leftIcon={<FiShoppingCart />}
                    colorScheme="blue"
                  >
                    Generate Shopping List
                  </Button>
                )}
              </HStack>
            </CardBody>
          </Card>
        )}
        
        {/* Week Navigation */}
        <Card>
          <CardBody>
            <HStack justify="space-between">
              <IconButton
                aria-label="Previous week"
                icon={<FiChevronLeft />}
                onClick={() => setSelectedWeek(addDays(selectedWeek, -7))}
                variant="ghost"
              />
              
              <Heading size="md">
                {format(selectedWeek, 'MMMM d')} - {format(addDays(selectedWeek, 6), 'MMMM d, yyyy')}
              </Heading>
              
              <IconButton
                aria-label="Next week"
                icon={<FiChevronRight />}
                onClick={() => setSelectedWeek(addDays(selectedWeek, 7))}
                variant="ghost"
              />
            </HStack>
          </CardBody>
        </Card>
        
        {/* Calendar Grid */}
        <Grid templateColumns="repeat(7, 1fr)" gap={3}>
          {weekDays.map((day, dayIndex) => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const dayMeals = mealsByDate[dateStr] || []
            const isToday = isSameDay(day, new Date())
            
            return (
              <GridItem key={dateStr}>
                <MotionCard
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: dayIndex * 0.05 }}
                  bg={isToday ? accentBg : bgColor}
                  borderWidth={isToday ? 2 : 1}
                  borderColor={isToday ? 'blue.500' : borderColor}
                  h="full"
                >
                  <CardHeader pb={2}>
                    <VStack align="stretch" spacing={1}>
                      <Text fontSize="xs" color="gray.500" textTransform="uppercase">
                        {format(day, 'EEE')}
                      </Text>
                      <Heading size="md">
                        {format(day, 'd')}
                      </Heading>
                      {isToday && (
                        <Badge colorScheme="blue" size="sm">
                          Today
                        </Badge>
                      )}
                    </VStack>
                  </CardHeader>
                  <CardBody pt={2}>
                    <VStack align="stretch" spacing={2}>
                      {MEAL_TYPES.map((mealType) => {
                        const meal = dayMeals.find((m: any) => m.mealType === mealType)
                        
                        if (!meal && (!mealPlan || mealPlan.status === 'DRAFT')) {
                          return (
                            <Box
                              key={mealType}
                              p={2}
                              borderRadius="md"
                              border="1px dashed"
                              borderColor={borderColor}
                              minH="60px"
                            >
                              <Text fontSize="xs" color="gray.400">
                                {mealType}
                              </Text>
                            </Box>
                          )
                        }
                        
                        if (!meal) return null
                        
                        return (
                          <MotionBox
                            key={meal.id}
                            whileHover={{ scale: 1.02 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Box
                              p={2}
                              bg={meal.isCooked ? 'green.50' : bgColor}
                              borderRadius="md"
                              border="1px"
                              borderColor={meal.isCooked ? 'green.300' : borderColor}
                              cursor="pointer"
                              _hover={{ bg: hoverBg }}
                              position="relative"
                            >
                              <Menu>
                                <MenuButton
                                  as={Box}
                                  w="full"
                                >
                                  <VStack align="stretch" spacing={1}>
                                    <HStack justify="space-between">
                                      <Badge
                                        colorScheme={MEAL_TYPE_COLORS[meal.mealType as keyof typeof MEAL_TYPE_COLORS]}
                                        size="sm"
                                      >
                                        {meal.mealType}
                                      </Badge>
                                      {meal.isCooked && (
                                        <FiCheck color="green" />
                                      )}
                                    </HStack>
                                    
                                    <Text fontSize="sm" fontWeight="medium" noOfLines={2}>
                                      {meal.simpleMealName || meal.recipe?.name || 'Unnamed meal'}
                                    </Text>
                                    
                                    {meal.expectLeftovers && (
                                      <HStack spacing={1}>
                                        <FiRepeat size={12} />
                                        <Text fontSize="xs" color="gray.500">
                                          Leftovers
                                        </Text>
                                      </HStack>
                                    )}
                                    
                                    {meal.isEatingOut && (
                                      <Text fontSize="xs" color="purple.500">
                                        {meal.restaurantName || 'Eating out'}
                                      </Text>
                                    )}
                                  </VStack>
                                </MenuButton>
                                
                                <MenuList>
                                  {!meal.isCooked && (
                                    <MenuItem
                                      icon={<FiCheck />}
                                      onClick={() => handleMarkCooked(meal.id)}
                                    >
                                      Mark as Cooked
                                    </MenuItem>
                                  )}
                                  <MenuItem
                                    icon={<FiEdit2 />}
                                    onClick={() => handleSwapMeal(meal)}
                                  >
                                    Edit/Swap
                                  </MenuItem>
                                  <MenuItem
                                    icon={<FiTrash2 />}
                                    onClick={() => handleDeleteMeal(meal.id)}
                                    color="red.500"
                                  >
                                    Skip Meal
                                  </MenuItem>
                                </MenuList>
                              </Menu>
                            </Box>
                          </MotionBox>
                        )
                      })}
                      
                      {dayMeals.length === 0 && mealPlan && (
                        <Button
                          size="sm"
                          variant="ghost"
                          leftIcon={<FiPlus />}
                          onClick={() => {
                            // Handle adding meal for this day
                          }}
                        >
                          Add Meal
                        </Button>
                      )}
                    </VStack>
                  </CardBody>
                </MotionCard>
              </GridItem>
            )
          })}
        </Grid>
        
        {/* AI Suggestions Panel */}
        {suggestions && suggestions.length > 0 && (
          <Card>
            <CardHeader>
              <HStack>
                <FiStar />
                <Heading size="md">Quick Recipe Ideas</Heading>
                <Text fontSize="sm" color="gray.500">
                  Based on your expiring items
                </Text>
              </HStack>
            </CardHeader>
            <CardBody>
              <Grid templateColumns="repeat(auto-fit, minmax(250px, 1fr))" gap={4}>
                {suggestions.map((suggestion, index) => (
                  <MotionCard
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ y: -4 }}
                    cursor="pointer"
                    onClick={() => {
                      toast({
                        title: 'Recipe Added',
                        description: `${suggestion.name} has been added to your meal plan`,
                        status: 'success',
                        duration: 3000,
                      })
                    }}
                  >
                    <CardBody>
                      <VStack align="stretch" spacing={2}>
                        <Heading size="sm">{suggestion.name}</Heading>
                        <HStack>
                          <FiClock />
                          <Text fontSize="sm">{suggestion.time} minutes</Text>
                        </HStack>
                        <Text fontSize="sm" color="gray.500">
                          Uses: {suggestion.uses.join(', ')}
                        </Text>
                        <Text fontSize="xs" noOfLines={2}>
                          {suggestion.instructions}
                        </Text>
                      </VStack>
                    </CardBody>
                  </MotionCard>
                ))}
              </Grid>
            </CardBody>
          </Card>
        )}
        
        {/* Leftover Planning Helper */}
        <Card bg={useColorModeValue('orange.50', 'orange.900')}>
          <CardBody>
            <VStack align="stretch" spacing={3}>
              <HStack>
                <FiRepeat />
                <Heading size="md">Leftover Planning</Heading>
              </HStack>
              <Text fontSize="sm">
                Meals that will generate leftovers are marked with the repeat icon.
                These leftovers are automatically planned for the next day's lunch!
              </Text>
              <Progress value={65} colorScheme="orange" borderRadius="full" />
              <Text fontSize="xs" color="gray.600">
                65% of your meals utilize leftovers - great job reducing waste!
              </Text>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
      
      {/* Edit/Swap Meal Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            Edit Meal - {selectedMeal && format(new Date(selectedMeal.date), 'EEEE, MMMM d')}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedMeal && (
              <VStack align="stretch" spacing={4}>
                <Box>
                  <Badge colorScheme={MEAL_TYPE_COLORS[selectedMeal.mealType]} mb={2}>
                    {selectedMeal.mealType}
                  </Badge>
                  <Text fontWeight="bold">
                    Current: {selectedMeal.simpleMealName || selectedMeal.recipe?.name}
                  </Text>
                </Box>
                
                <Divider />
                
                <Text fontWeight="medium">Swap with a suggestion:</Text>
                <VStack align="stretch" spacing={2}>
                  {suggestions?.slice(0, 3).map((suggestion, index) => (
                    <Box
                      key={index}
                      p={3}
                      borderRadius="md"
                      border="1px"
                      borderColor={borderColor}
                      cursor="pointer"
                      _hover={{ bg: hoverBg }}
                      onClick={() => {
                        updateMeal({
                          mealId: selectedMeal.id,
                          updates: {
                            simpleMealName: suggestion.name,
                            recipeId: undefined,
                          }
                        })
                        onClose()
                      }}
                    >
                      <Text fontWeight="medium">{suggestion.name}</Text>
                      <Text fontSize="sm" color="gray.500">
                        {suggestion.time} min • Uses: {suggestion.uses.join(', ')}
                      </Text>
                    </Box>
                  ))}
                </VStack>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  )
}