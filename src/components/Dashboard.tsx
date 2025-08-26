/**
 * Dashboard Component
 * Main dashboard showing expiring items, today's meals, and quick stats
 */

import React from 'react'
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
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Progress,
  IconButton,
  useColorModeValue,
  Flex,
  Avatar,
  Spacer,
  Tooltip,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Skeleton,
  SkeletonText,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Select,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
} from '@chakra-ui/react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiAlertTriangle,
  FiClock,
  FiShoppingCart,
  FiPlus,
  FiChevronRight,
  FiCalendar,
  FiPackage,
  FiTrendingUp,
  FiAlertCircle,
  FiCheckCircle,
  FiStar,
} from 'react-icons/fi'
import { useExpiring } from '../hooks/useExpiring'
import { useMealPlan } from '../hooks/useMealPlan'
import { usePantry } from '../hooks/usePantry'
import { format, isToday } from 'date-fns'

const MotionBox = motion(Box)
const MotionCard = motion(Card)

interface DashboardProps {
  userId: string
  onNavigate: (view: string) => void
}

export default function Dashboard({ userId, onNavigate }: DashboardProps) {
  const { items: expiringItems, stats: expirationStats, urgentItems, recommendations } = useExpiring(userId, 3)
  const { mealPlan, suggestions, stats: mealStats } = useMealPlan(userId)
  const { stats: pantryStats, addItem, isAdding } = usePantry(userId)
  
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [newItem, setNewItem] = React.useState({
    customName: '',
    amount: 1,
    unit: '',
    location: 'PANTRY' as const,
    expirationDate: '',
  })
  
  const bgColor = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.700')
  const urgentBg = useColorModeValue('red.50', 'red.900')
  const warningBg = useColorModeValue('orange.50', 'orange.900')
  const successBg = useColorModeValue('green.50', 'green.900')
  
  // Get today's meals
  const todaysMeals = mealPlan?.meals?.filter((meal: any) => {
    const mealDate = new Date(meal.date)
    return isToday(mealDate)
  }) || []
  
  const handleQuickAdd = () => {
    if (newItem.customName && newItem.amount) {
      addItem({
        ...newItem,
        amount: Number(newItem.amount),
      })
      onClose()
      setNewItem({
        customName: '',
        amount: 1,
        unit: '',
        location: 'PANTRY',
        expirationDate: '',
      })
    }
  }
  
  return (
    <Container maxW="container.xl" py={6}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <Flex align="center">
          <VStack align="start" spacing={1}>
            <Heading size="lg">Welcome back! 👋</Heading>
            <Text color="gray.500">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </Text>
          </VStack>
          <Spacer />
          <Button
            leftIcon={<FiPlus />}
            colorScheme="blue"
            onClick={onOpen}
            size="md"
          >
            Quick Add Item
          </Button>
        </Flex>
        
        {/* Urgent Alerts */}
        {urgentItems.length > 0 && (
          <AnimatePresence>
            <MotionBox
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Alert status="warning" borderRadius="lg">
                <AlertIcon />
                <Box>
                  <AlertTitle>Items Expiring Soon!</AlertTitle>
                  <AlertDescription>
                    You have {urgentItems.length} item{urgentItems.length > 1 ? 's' : ''} expiring in the next 24 hours.
                    Consider using them in tonight's dinner!
                  </AlertDescription>
                </Box>
                <Spacer />
                <Button
                  size="sm"
                  colorScheme="orange"
                  onClick={() => onNavigate('pantry')}
                >
                  View Items
                </Button>
              </Alert>
            </MotionBox>
          </AnimatePresence>
        )}
        
        {/* Quick Stats */}
        <Grid templateColumns="repeat(auto-fit, minmax(250px, 1fr))" gap={4}>
          <MotionCard
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <CardBody>
              <Stat>
                <StatLabel>Pantry Items</StatLabel>
                <StatNumber>{pantryStats.totalItems}</StatNumber>
                <StatHelpText>
                  <StatArrow type="increase" />
                  {pantryStats.leftoverCount} leftovers
                </StatHelpText>
              </Stat>
              <Progress
                value={((pantryStats.totalItems - pantryStats.expiredCount) / pantryStats.totalItems) * 100}
                colorScheme="green"
                size="sm"
                mt={2}
                borderRadius="full"
              />
            </CardBody>
          </MotionCard>
          
          <MotionCard
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <CardBody>
              <Stat>
                <StatLabel>Expiring Soon</StatLabel>
                <StatNumber color="orange.500">{expirationStats.expiringSoon}</StatNumber>
                <StatHelpText>
                  Next 3 days
                </StatHelpText>
              </Stat>
              <Progress
                value={(expirationStats.expiringSoon / pantryStats.totalItems) * 100}
                colorScheme="orange"
                size="sm"
                mt={2}
                borderRadius="full"
              />
            </CardBody>
          </MotionCard>
          
          <MotionCard
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <CardBody>
              <Stat>
                <StatLabel>Meals Planned</StatLabel>
                <StatNumber>{mealStats.totalMeals}</StatNumber>
                <StatHelpText>
                  {mealStats.cookedMeals} completed
                </StatHelpText>
              </Stat>
              <Progress
                value={(mealStats.cookedMeals / mealStats.totalMeals) * 100}
                colorScheme="blue"
                size="sm"
                mt={2}
                borderRadius="full"
              />
            </CardBody>
          </MotionCard>
          
          <MotionCard
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <CardBody>
              <Stat>
                <StatLabel>Food Saved</StatLabel>
                <StatNumber color="green.500">
                  ${(expirationStats.totalValue * 0.7).toFixed(0)}
                </StatNumber>
                <StatHelpText>
                  This month
                </StatHelpText>
              </Stat>
              <Progress
                value={70}
                colorScheme="green"
                size="sm"
                mt={2}
                borderRadius="full"
              />
            </CardBody>
          </MotionCard>
        </Grid>
        
        <Grid templateColumns={{ base: '1fr', lg: '2fr 1fr' }} gap={6}>
          {/* Today's Meals */}
          <Card>
            <CardHeader>
              <HStack>
                <FiCalendar />
                <Heading size="md">Today's Meals</Heading>
                <Spacer />
                <Button
                  size="sm"
                  variant="ghost"
                  rightIcon={<FiChevronRight />}
                  onClick={() => onNavigate('meals')}
                >
                  View All
                </Button>
              </HStack>
            </CardHeader>
            <CardBody>
              <VStack spacing={3} align="stretch">
                {todaysMeals.length > 0 ? (
                  todaysMeals.map((meal: any, index: number) => (
                    <MotionBox
                      key={meal.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <HStack
                        p={3}
                        bg={bgColor}
                        borderRadius="md"
                        border="1px"
                        borderColor={borderColor}
                        _hover={{ shadow: 'md' }}
                      >
                        <Badge colorScheme={getMealTypeColor(meal.mealType)}>
                          {meal.mealType}
                        </Badge>
                        <Text flex={1} fontWeight="medium">
                          {meal.simpleMealName || meal.recipe?.name}
                        </Text>
                        {meal.isCooked ? (
                          <FiCheckCircle color="green" />
                        ) : (
                          <FiClock color="gray" />
                        )}
                      </HStack>
                    </MotionBox>
                  ))
                ) : (
                  <Text color="gray.500" textAlign="center" py={4}>
                    No meals planned for today
                  </Text>
                )}
              </VStack>
            </CardBody>
          </Card>
          
          {/* Claude AI Suggestions */}
          <Card>
            <CardHeader>
              <HStack>
                <FiStar />
                <Heading size="md">AI Suggestions</Heading>
              </HStack>
            </CardHeader>
            <CardBody>
              <VStack spacing={3} align="stretch">
                {suggestions?.slice(0, 3).map((suggestion, index) => (
                  <MotionBox
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Box
                      p={3}
                      bg={bgColor}
                      borderRadius="md"
                      border="1px"
                      borderColor={borderColor}
                      cursor="pointer"
                      _hover={{ shadow: 'md', transform: 'translateX(4px)' }}
                      transition="all 0.2s"
                    >
                      <Text fontWeight="bold" fontSize="sm">
                        {suggestion.name}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        Uses: {suggestion.uses.join(', ')}
                      </Text>
                      <HStack mt={1}>
                        <Badge size="sm" colorScheme="green">
                          {suggestion.time} min
                        </Badge>
                      </HStack>
                    </Box>
                  </MotionBox>
                ))}
                
                {(!suggestions || suggestions.length === 0) && (
                  <Text color="gray.500" textAlign="center" py={4} fontSize="sm">
                    No suggestions available
                  </Text>
                )}
              </VStack>
            </CardBody>
          </Card>
        </Grid>
        
        {/* Expiring Items Timeline */}
        <Card>
          <CardHeader>
            <HStack>
              <FiAlertTriangle />
              <Heading size="md">Expiring Soon</Heading>
              <Spacer />
              <Button
                size="sm"
                variant="ghost"
                rightIcon={<FiChevronRight />}
                onClick={() => onNavigate('pantry')}
              >
                Manage Pantry
              </Button>
            </HStack>
          </CardHeader>
          <CardBody>
            <Grid templateColumns="repeat(auto-fill, minmax(150px, 1fr))" gap={3}>
              {expiringItems.slice(0, 6).map((item, index) => (
                <MotionBox
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <Box
                    p={3}
                    bg={item.status === 'expired' ? urgentBg : item.status === 'expiring-today' ? warningBg : bgColor}
                    borderRadius="lg"
                    border="2px"
                    borderColor={item.color}
                    position="relative"
                    overflow="hidden"
                  >
                    <Badge
                      position="absolute"
                      top={1}
                      right={1}
                      colorScheme={getStatusColor(item.status)}
                      fontSize="xs"
                    >
                      {item.daysUntilExpiry < 0 ? 'Expired' : 
                       item.daysUntilExpiry === 0 ? 'Today' :
                       `${item.daysUntilExpiry} day${item.daysUntilExpiry > 1 ? 's' : ''}`}
                    </Badge>
                    
                    <VStack align="start" spacing={1} mt={4}>
                      <Text fontWeight="bold" fontSize="sm" noOfLines={1}>
                        {item.customName}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {item.amount} {item.unit}
                      </Text>
                      <Badge size="sm" colorScheme="purple">
                        {item.location}
                      </Badge>
                    </VStack>
                  </Box>
                </MotionBox>
              ))}
            </Grid>
            
            {expiringItems.length === 0 && (
              <Flex justify="center" align="center" h="100px">
                <VStack>
                  <FiCheckCircle size={32} color="green" />
                  <Text color="gray.500">No items expiring soon!</Text>
                </VStack>
              </Flex>
            )}
          </CardBody>
        </Card>
        
        {/* Smart Recommendations */}
        {recommendations.length > 0 && (
          <Card bg={successBg}>
            <CardBody>
              <VStack align="start" spacing={2}>
                <HStack>
                  <FiTrendingUp />
                  <Text fontWeight="bold">Smart Recommendations</Text>
                </HStack>
                {recommendations.map((rec, index) => (
                  <Text key={index} fontSize="sm">
                    • {rec}
                  </Text>
                ))}
              </VStack>
            </CardBody>
          </Card>
        )}
      </VStack>
      
      {/* Quick Add Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Quick Add Pantry Item</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Item Name</FormLabel>
                <Input
                  placeholder="e.g., Milk, Chicken Breast"
                  value={newItem.customName}
                  onChange={(e) => setNewItem({ ...newItem, customName: e.target.value })}
                />
              </FormControl>
              
              <HStack w="full">
                <FormControl isRequired>
                  <FormLabel>Amount</FormLabel>
                  <NumberInput
                    min={0.1}
                    value={newItem.amount}
                    onChange={(_, value) => setNewItem({ ...newItem, amount: value })}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </FormControl>
                
                <FormControl>
                  <FormLabel>Unit</FormLabel>
                  <Input
                    placeholder="e.g., oz, lbs, cups"
                    value={newItem.unit}
                    onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                  />
                </FormControl>
              </HStack>
              
              <FormControl isRequired>
                <FormLabel>Location</FormLabel>
                <Select
                  value={newItem.location}
                  onChange={(e) => setNewItem({ ...newItem, location: e.target.value as any })}
                >
                  <option value="FRIDGE">Fridge</option>
                  <option value="FREEZER">Freezer</option>
                  <option value="PANTRY">Pantry</option>
                  <option value="COUNTER">Counter</option>
                  <option value="SPICE_RACK">Spice Rack</option>
                </Select>
              </FormControl>
              
              <FormControl>
                <FormLabel>Expiration Date</FormLabel>
                <Input
                  type="date"
                  value={newItem.expirationDate}
                  onChange={(e) => setNewItem({ ...newItem, expirationDate: e.target.value })}
                />
              </FormControl>
              
              <Button
                colorScheme="blue"
                onClick={handleQuickAdd}
                isLoading={isAdding}
                loadingText="Adding..."
                w="full"
              >
                Add Item
              </Button>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Container>
  )
}

function getMealTypeColor(mealType: string): string {
  switch (mealType) {
    case 'BREAKFAST': return 'yellow'
    case 'LUNCH': return 'green'
    case 'DINNER': return 'blue'
    case 'SNACK': return 'purple'
    default: return 'gray'
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'expired': return 'red'
    case 'expiring-today': return 'orange'
    case 'expiring-soon': return 'yellow'
    case 'fresh': return 'green'
    default: return 'gray'
  }
}