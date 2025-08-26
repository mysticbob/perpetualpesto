/**
 * PantryManager Component
 * Visual inventory management with drag-and-drop and expiration tracking
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
  Input,
  InputGroup,
  InputLeftElement,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Select,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Progress,
  Alert,
  AlertIcon,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Divider,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
} from '@chakra-ui/react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import {
  FiPackage,
  FiSearch,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiClock,
  FiAlertTriangle,
  FiThermometer,
  FiHome,
  FiDroplet,
  FiBarChart2,
  FiCamera,
  FiRefreshCw,
  FiMove,
  FiCalendar,
  FiDollarSign,
  FiInfo,
} from 'react-icons/fi'
import { usePantry } from '../hooks/usePantry'
import { useExpiring } from '../hooks/useExpiring'
import { format, differenceInDays } from 'date-fns'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'

const MotionBox = motion(Box)
const MotionCard = motion(Card)

interface PantryManagerProps {
  userId: string
}

const LOCATION_CONFIG = {
  FRIDGE: {
    icon: FiThermometer,
    color: 'blue',
    label: 'Fridge',
    bgColor: 'blue.50',
  },
  FREEZER: {
    icon: FiDroplet,
    color: 'cyan',
    label: 'Freezer',
    bgColor: 'cyan.50',
  },
  PANTRY: {
    icon: FiHome,
    color: 'orange',
    label: 'Pantry',
    bgColor: 'orange.50',
  },
  COUNTER: {
    icon: FiPackage,
    color: 'yellow',
    label: 'Counter',
    bgColor: 'yellow.50',
  },
  SPICE_RACK: {
    icon: FiDroplet,
    color: 'purple',
    label: 'Spice Rack',
    bgColor: 'purple.50',
  },
}

export default function PantryManager({ userId }: PantryManagerProps) {
  const {
    pantryItems,
    itemsByLocation,
    stats,
    addItem,
    updateItem,
    deleteItem,
    moveItem,
    isAdding,
  } = usePantry(userId)
  
  const { timeline, urgentItems } = useExpiring(userId, 7)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid')
  
  const { isOpen, onOpen, onClose } = useDisclosure()
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure()
  
  const bgColor = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.700')
  
  const [newItem, setNewItem] = useState({
    customName: '',
    amount: 1,
    unit: '',
    location: 'PANTRY' as const,
    expirationDate: '',
    isLeftover: false,
    container: '',
    purchasePrice: undefined as number | undefined,
  })
  
  const filteredItems = pantryItems.filter(item =>
    item.customName.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (!selectedLocation || item.location === selectedLocation)
  )
  
  const handleAddItem = () => {
    if (newItem.customName && newItem.amount) {
      addItem({
        ...newItem,
        amount: Number(newItem.amount),
        purchasePrice: newItem.purchasePrice ? Number(newItem.purchasePrice) : undefined,
      })
      onClose()
      setNewItem({
        customName: '',
        amount: 1,
        unit: '',
        location: 'PANTRY',
        expirationDate: '',
        isLeftover: false,
        container: '',
        purchasePrice: undefined,
      })
    }
  }
  
  const handleEditItem = () => {
    if (selectedItem) {
      updateItem({
        id: selectedItem.id,
        customName: selectedItem.customName,
        amount: Number(selectedItem.amount),
        unit: selectedItem.unit,
        location: selectedItem.location,
        expirationDate: selectedItem.expirationDate,
      })
      onEditClose()
      setSelectedItem(null)
    }
  }
  
  const handleDragEnd = (result: any) => {
    if (!result.destination) return
    
    const sourceLocation = result.source.droppableId
    const destLocation = result.destination.droppableId
    
    if (sourceLocation !== destLocation) {
      const itemId = result.draggableId
      moveItem({ itemId, newLocation: destLocation })
    }
  }
  
  const getExpirationStatus = (expirationDate?: string) => {
    if (!expirationDate) return { color: 'gray', label: 'No expiry', urgency: 0 }
    
    const days = differenceInDays(new Date(expirationDate), new Date())
    
    if (days < 0) return { color: 'red', label: 'Expired', urgency: 5 }
    if (days === 0) return { color: 'orange', label: 'Today', urgency: 4 }
    if (days <= 3) return { color: 'yellow', label: `${days} days`, urgency: 3 }
    if (days <= 7) return { color: 'blue', label: `${days} days`, urgency: 2 }
    return { color: 'green', label: `${days} days`, urgency: 1 }
  }
  
  return (
    <Container maxW="container.xl" py={6}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <Flex align="center" wrap="wrap" gap={4}>
          <VStack align="start" spacing={1}>
            <Heading size="lg">Pantry Manager</Heading>
            <Text color="gray.500">
              Track and organize your food inventory
            </Text>
          </VStack>
          <Spacer />
          
          <HStack>
            <Button
              leftIcon={<FiCamera />}
              variant="outline"
              onClick={() => {
                // Handle barcode scan simulation
              }}
            >
              Scan Barcode
            </Button>
            <Button
              leftIcon={<FiPlus />}
              colorScheme="blue"
              onClick={onOpen}
            >
              Add Item
            </Button>
          </HStack>
        </Flex>
        
        {/* Stats Overview */}
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
          <Stat>
            <StatLabel>Total Items</StatLabel>
            <StatNumber>{stats.totalItems}</StatNumber>
            <StatHelpText>
              {stats.leftoverCount} leftovers
            </StatHelpText>
          </Stat>
          <Stat>
            <StatLabel>Expiring Soon</StatLabel>
            <StatNumber color="orange.500">{stats.expiringCount}</StatNumber>
            <StatHelpText>Next 3 days</StatHelpText>
          </Stat>
          <Stat>
            <StatLabel>Expired</StatLabel>
            <StatNumber color="red.500">{stats.expiredCount}</StatNumber>
            <StatHelpText>Remove ASAP</StatHelpText>
          </Stat>
          <Stat>
            <StatLabel>Est. Value</StatLabel>
            <StatNumber>${(stats.totalItems * 5).toFixed(0)}</StatNumber>
            <StatHelpText>Inventory value</StatHelpText>
          </Stat>
        </SimpleGrid>
        
        {/* Urgent Alert */}
        {urgentItems.length > 0 && (
          <Alert status="warning" borderRadius="lg">
            <AlertIcon />
            <Box>
              <Text fontWeight="bold">Action Required!</Text>
              <Text fontSize="sm">
                {urgentItems.length} items need immediate attention - use them today or freeze them!
              </Text>
            </Box>
          </Alert>
        )}
        
        {/* Search and View Controls */}
        <HStack>
          <InputGroup maxW="300px">
            <InputLeftElement pointerEvents="none">
              <FiSearch />
            </InputLeftElement>
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </InputGroup>
          
          <Tabs
            variant="soft-rounded"
            colorScheme="blue"
            index={viewMode === 'grid' ? 0 : 1}
            onChange={(index) => setViewMode(index === 0 ? 'grid' : 'timeline')}
          >
            <TabList>
              <Tab>Location View</Tab>
              <Tab>Timeline View</Tab>
            </TabList>
          </Tabs>
        </HStack>
        
        {/* Main Content */}
        {viewMode === 'grid' ? (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap={4}>
              {Object.entries(LOCATION_CONFIG).map(([location, config]) => {
                const items = itemsByLocation[location] || []
                const Icon = config.icon
                
                return (
                  <GridItem key={location}>
                    <Card h="full">
                      <CardHeader>
                        <HStack>
                          <Icon />
                          <Heading size="md">{config.label}</Heading>
                          <Badge colorScheme={config.color}>{items.length}</Badge>
                        </HStack>
                      </CardHeader>
                      <CardBody>
                        <Droppable droppableId={location}>
                          {(provided, snapshot) => (
                            <VStack
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              align="stretch"
                              spacing={2}
                              minH="200px"
                              bg={snapshot.isDraggingOver ? config.bgColor : 'transparent'}
                              borderRadius="md"
                              p={2}
                              transition="background 0.2s"
                            >
                              {items.map((item, index) => {
                                const expStatus = getExpirationStatus(item.expirationDate)
                                
                                return (
                                  <Draggable key={item.id} draggableId={item.id} index={index}>
                                    {(provided, snapshot) => (
                                      <MotionBox
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        whileHover={{ scale: 1.02 }}
                                      >
                                        <Box
                                          p={3}
                                          bg={bgColor}
                                          borderRadius="md"
                                          border="2px"
                                          borderColor={expStatus.color + '.300'}
                                          cursor="move"
                                          opacity={snapshot.isDragging ? 0.5 : 1}
                                          position="relative"
                                        >
                                          <Menu>
                                            <MenuButton
                                              as={Box}
                                              w="full"
                                            >
                                              <VStack align="stretch" spacing={1}>
                                                <HStack justify="space-between">
                                                  <Text fontWeight="bold" fontSize="sm" noOfLines={1}>
                                                    {item.customName}
                                                  </Text>
                                                  {item.isLeftover && (
                                                    <Badge colorScheme="purple" size="sm">
                                                      Leftover
                                                    </Badge>
                                                  )}
                                                </HStack>
                                                
                                                <HStack justify="space-between">
                                                  <Text fontSize="xs" color="gray.500">
                                                    {item.amount} {item.unit}
                                                  </Text>
                                                  <Badge colorScheme={expStatus.color} size="sm">
                                                    {expStatus.label}
                                                  </Badge>
                                                </HStack>
                                                
                                                {item.container && (
                                                  <Text fontSize="xs" color="gray.400">
                                                    📦 {item.container}
                                                  </Text>
                                                )}
                                              </VStack>
                                            </MenuButton>
                                            
                                            <MenuList>
                                              <MenuItem
                                                icon={<FiEdit2 />}
                                                onClick={() => {
                                                  setSelectedItem(item)
                                                  onEditOpen()
                                                }}
                                              >
                                                Edit
                                              </MenuItem>
                                              <MenuItem
                                                icon={<FiMove />}
                                                isDisabled
                                              >
                                                Move (drag instead)
                                              </MenuItem>
                                              <MenuItem
                                                icon={<FiTrash2 />}
                                                color="red.500"
                                                onClick={() => deleteItem(item.id)}
                                              >
                                                Delete
                                              </MenuItem>
                                            </MenuList>
                                          </Menu>
                                        </Box>
                                      </MotionBox>
                                    )}
                                  </Draggable>
                                )
                              })}
                              {provided.placeholder}
                              
                              {items.length === 0 && (
                                <Flex
                                  justify="center"
                                  align="center"
                                  h="100px"
                                  border="2px dashed"
                                  borderColor={borderColor}
                                  borderRadius="md"
                                >
                                  <Text color="gray.400" fontSize="sm">
                                    Drop items here
                                  </Text>
                                </Flex>
                              )}
                            </VStack>
                          )}
                        </Droppable>
                      </CardBody>
                    </Card>
                  </GridItem>
                )
              })}
            </Grid>
          </DragDropContext>
        ) : (
          /* Timeline View */
          <Card>
            <CardHeader>
              <HStack>
                <FiCalendar />
                <Heading size="md">Expiration Timeline</Heading>
              </HStack>
            </CardHeader>
            <CardBody>
              <VStack align="stretch" spacing={4}>
                {timeline.map((day, index) => (
                  <MotionBox
                    key={day.dateStr}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <HStack align="start" spacing={4}>
                      <VStack align="center" spacing={0}>
                        <Text fontSize="xs" color="gray.500">
                          {day.dayName}
                        </Text>
                        <Text fontWeight="bold" fontSize="lg">
                          {format(day.date, 'd')}
                        </Text>
                      </VStack>
                      
                      <Box flex={1}>
                        {day.items.length > 0 ? (
                          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={2}>
                            {day.items.map((item) => {
                              const expStatus = getExpirationStatus(item.expirationDate)
                              
                              return (
                                <Box
                                  key={item.id}
                                  p={2}
                                  bg={bgColor}
                                  borderRadius="md"
                                  border="1px"
                                  borderColor={expStatus.color + '.300'}
                                >
                                  <Text fontWeight="medium" fontSize="sm">
                                    {item.customName}
                                  </Text>
                                  <HStack justify="space-between">
                                    <Text fontSize="xs" color="gray.500">
                                      {item.amount} {item.unit}
                                    </Text>
                                    <Badge size="sm" colorScheme={LOCATION_CONFIG[item.location].color}>
                                      {LOCATION_CONFIG[item.location].label}
                                    </Badge>
                                  </HStack>
                                </Box>
                              )
                            })}
                          </SimpleGrid>
                        ) : (
                          <Text fontSize="sm" color="gray.400">
                            No items expiring
                          </Text>
                        )}
                      </Box>
                    </HStack>
                    
                    {index < timeline.length - 1 && <Divider mt={3} />}
                  </MotionBox>
                ))}
              </VStack>
            </CardBody>
          </Card>
        )}
        
        {/* Leftover Section */}
        <Card>
          <CardHeader>
            <HStack>
              <FiRefreshCw />
              <Heading size="md">Leftovers Tracking</Heading>
              <Badge colorScheme="purple">{stats.leftoverCount}</Badge>
            </HStack>
          </CardHeader>
          <CardBody>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={3}>
              {pantryItems
                .filter(item => item.isLeftover)
                .map((item) => {
                  const daysSinceCreated = item.leftoverDate
                    ? differenceInDays(new Date(), new Date(item.leftoverDate))
                    : 0
                  
                  return (
                    <Box
                      key={item.id}
                      p={3}
                      bg={daysSinceCreated > 3 ? 'red.50' : bgColor}
                      borderRadius="md"
                      border="1px"
                      borderColor={daysSinceCreated > 3 ? 'red.300' : borderColor}
                    >
                      <VStack align="stretch" spacing={1}>
                        <Text fontWeight="bold" fontSize="sm">
                          {item.customName}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          {daysSinceCreated} day{daysSinceCreated !== 1 ? 's' : ''} old
                        </Text>
                        <Badge size="sm" colorScheme={LOCATION_CONFIG[item.location].color}>
                          {LOCATION_CONFIG[item.location].label}
                        </Badge>
                      </VStack>
                    </Box>
                  )
                })}
            </SimpleGrid>
            
            {stats.leftoverCount === 0 && (
              <Text color="gray.500" textAlign="center" py={4}>
                No leftovers tracked
              </Text>
            )}
          </CardBody>
        </Card>
      </VStack>
      
      {/* Add Item Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add Pantry Item</ModalHeader>
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
                  {Object.entries(LOCATION_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl>
                <FormLabel>Container</FormLabel>
                <Input
                  placeholder="e.g., Tupperware, Ziploc bag"
                  value={newItem.container}
                  onChange={(e) => setNewItem({ ...newItem, container: e.target.value })}
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>Expiration Date</FormLabel>
                <Input
                  type="date"
                  value={newItem.expirationDate}
                  onChange={(e) => setNewItem({ ...newItem, expirationDate: e.target.value })}
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>Purchase Price (optional)</FormLabel>
                <NumberInput
                  min={0}
                  precision={2}
                  value={newItem.purchasePrice}
                  onChange={(_, value) => setNewItem({ ...newItem, purchasePrice: value })}
                >
                  <NumberInputField />
                </NumberInput>
              </FormControl>
              
              <FormControl display="flex" alignItems="center">
                <FormLabel mb="0">Is this a leftover?</FormLabel>
                <input
                  type="checkbox"
                  checked={newItem.isLeftover}
                  onChange={(e) => setNewItem({ ...newItem, isLeftover: e.target.checked })}
                />
              </FormControl>
              
              <Button
                colorScheme="blue"
                onClick={handleAddItem}
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
      
      {/* Edit Item Modal */}
      <Modal isOpen={isEditOpen} onClose={onEditClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Item</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {selectedItem && (
              <VStack spacing={4}>
                <FormControl>
                  <FormLabel>Item Name</FormLabel>
                  <Input
                    value={selectedItem.customName}
                    onChange={(e) => setSelectedItem({ ...selectedItem, customName: e.target.value })}
                  />
                </FormControl>
                
                <HStack w="full">
                  <FormControl>
                    <FormLabel>Amount</FormLabel>
                    <NumberInput
                      min={0.1}
                      value={selectedItem.amount}
                      onChange={(_, value) => setSelectedItem({ ...selectedItem, amount: value })}
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
                      value={selectedItem.unit}
                      onChange={(e) => setSelectedItem({ ...selectedItem, unit: e.target.value })}
                    />
                  </FormControl>
                </HStack>
                
                <FormControl>
                  <FormLabel>Location</FormLabel>
                  <Select
                    value={selectedItem.location}
                    onChange={(e) => setSelectedItem({ ...selectedItem, location: e.target.value })}
                  >
                    {Object.entries(LOCATION_CONFIG).map(([key, config]) => (
                      <option key={key} value={key}>{config.label}</option>
                    ))}
                  </Select>
                </FormControl>
                
                <FormControl>
                  <FormLabel>Expiration Date</FormLabel>
                  <Input
                    type="date"
                    value={selectedItem.expirationDate?.split('T')[0] || ''}
                    onChange={(e) => setSelectedItem({ ...selectedItem, expirationDate: e.target.value })}
                  />
                </FormControl>
                
                <Button
                  colorScheme="blue"
                  onClick={handleEditItem}
                  w="full"
                >
                  Save Changes
                </Button>
              </VStack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Container>
  )
}