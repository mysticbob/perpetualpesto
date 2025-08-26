/**
 * SmartShoppingList Component
 * Intelligent shopping list organized by store sections with price tracking
 */

import React, { useState } from 'react'
import {
  Box,
  Container,
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
  Checkbox,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Progress,
  Divider,
  Collapse,
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
  Alert,
  AlertIcon,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Tooltip,
} from '@chakra-ui/react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiShoppingCart,
  FiPlus,
  FiTrash2,
  FiDollarSign,
  FiCheck,
  FiChevronDown,
  FiChevronUp,
  FiRefreshCw,
  FiPrinter,
  FiShare2,
  FiMapPin,
  FiClock,
  FiTrendingUp,
  FiPackage,
  FiStar,
  FiEdit2,
} from 'react-icons/fi'
import { useShopping } from '../hooks/useShopping'
import { format } from 'date-fns'

const MotionBox = motion(Box)
const MotionCard = motion(Card)

interface SmartShoppingListProps {
  userId: string
}

const STORE_SECTIONS = [
  { name: 'Produce', emoji: '🥬', color: 'green' },
  { name: 'Dairy', emoji: '🥛', color: 'blue' },
  { name: 'Meat & Seafood', emoji: '🥩', color: 'red' },
  { name: 'Bakery', emoji: '🍞', color: 'orange' },
  { name: 'Frozen', emoji: '❄️', color: 'cyan' },
  { name: 'Canned & Packaged', emoji: '🥫', color: 'purple' },
  { name: 'Snacks', emoji: '🍿', color: 'yellow' },
  { name: 'Beverages', emoji: '🥤', color: 'teal' },
  { name: 'Other', emoji: '📦', color: 'gray' },
]

export default function SmartShoppingList({ userId }: SmartShoppingListProps) {
  const {
    shoppingList,
    itemsBySection,
    stats,
    addItem,
    togglePurchased,
    deleteItem,
    startShopping,
    completeShopping,
    reorderStaples,
    generateFromMealPlan,
    isGenerating,
    isStarting,
    isCompleting,
  } = useShopping(userId)
  
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [newItem, setNewItem] = useState({
    name: '',
    amount: 1,
    unit: '',
    category: 'Other',
    isStaple: false,
  })
  
  const { isOpen, onOpen, onClose } = useDisclosure()
  const bgColor = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.700')
  const sectionBg = useColorModeValue('gray.50', 'gray.700')
  
  const toggleSection = (sectionName: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionName)) {
      newExpanded.delete(sectionName)
    } else {
      newExpanded.add(sectionName)
    }
    setExpandedSections(newExpanded)
  }
  
  const handleAddItem = () => {
    if (newItem.name) {
      addItem({
        ...newItem,
        amount: Number(newItem.amount),
      })
      onClose()
      setNewItem({
        name: '',
        amount: 1,
        unit: '',
        category: 'Other',
        isStaple: false,
      })
    }
  }
  
  const getSectionConfig = (sectionName: string) => {
    return STORE_SECTIONS.find(s => s.name === sectionName) || STORE_SECTIONS[STORE_SECTIONS.length - 1]
  }
  
  const isShoppingActive = shoppingList?.status === 'SHOPPING'
  const canComplete = isShoppingActive && stats.purchasedItems === stats.totalItems
  
  return (
    <Container maxW="container.xl" py={6}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <Flex align="center" wrap="wrap" gap={4}>
          <VStack align="start" spacing={1}>
            <Heading size="lg">Smart Shopping List</Heading>
            <Text color="gray.500">
              {shoppingList?.scheduledFor 
                ? `Shopping planned for ${format(new Date(shoppingList.scheduledFor), 'EEEE, MMMM d')}`
                : 'Organized by store sections'}
            </Text>
          </VStack>
          <Spacer />
          
          <HStack>
            <Menu>
              <MenuButton as={Button} variant="outline" rightIcon={<FiChevronDown />}>
                Actions
              </MenuButton>
              <MenuList>
                <MenuItem icon={<FiRefreshCw />} onClick={() => generateFromMealPlan('current')}>
                  Generate from Meal Plan
                </MenuItem>
                <MenuItem icon={<FiStar />} onClick={reorderStaples}>
                  Reorder Staples
                </MenuItem>
                <MenuItem icon={<FiPrinter />}>
                  Print List
                </MenuItem>
                <MenuItem icon={<FiShare2 />}>
                  Share List
                </MenuItem>
              </MenuList>
            </Menu>
            
            {!isShoppingActive ? (
              <Button
                leftIcon={<FiShoppingCart />}
                colorScheme="green"
                onClick={startShopping}
                isLoading={isStarting}
              >
                Start Shopping
              </Button>
            ) : (
              <Button
                leftIcon={<FiCheck />}
                colorScheme="blue"
                onClick={completeShopping}
                isLoading={isCompleting}
                isDisabled={!canComplete}
              >
                Complete Shopping
              </Button>
            )}
            
            <Button
              leftIcon={<FiPlus />}
              colorScheme="blue"
              onClick={onOpen}
            >
              Add Item
            </Button>
          </HStack>
        </Flex>
        
        {/* Shopping Status */}
        {isShoppingActive && (
          <Alert status="info" borderRadius="lg">
            <AlertIcon />
            <Box flex={1}>
              <Text fontWeight="bold">Shopping in Progress</Text>
              <Progress
                value={stats.progress}
                colorScheme="blue"
                size="sm"
                mt={2}
                borderRadius="full"
              />
            </Box>
            <Text fontWeight="bold" ml={4}>
              {stats.purchasedItems} / {stats.totalItems} items
            </Text>
          </Alert>
        )}
        
        {/* Stats Cards */}
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
          <Stat>
            <StatLabel>Total Items</StatLabel>
            <StatNumber>{stats.totalItems}</StatNumber>
            <StatHelpText>
              {stats.remainingItems} remaining
            </StatHelpText>
          </Stat>
          <Stat>
            <StatLabel>Est. Cost</StatLabel>
            <StatNumber>${stats.estimatedCost.toFixed(2)}</StatNumber>
            <StatHelpText>
              <FiTrendingUp /> Based on avg prices
            </StatHelpText>
          </Stat>
          <Stat>
            <StatLabel>Progress</StatLabel>
            <StatNumber>{stats.progress.toFixed(0)}%</StatNumber>
            <Progress
              value={stats.progress}
              colorScheme="green"
              size="sm"
              mt={2}
              borderRadius="full"
            />
          </Stat>
          <Stat>
            <StatLabel>Sections</StatLabel>
            <StatNumber>{itemsBySection.length}</StatNumber>
            <StatHelpText>
              Store areas to visit
            </StatHelpText>
          </Stat>
        </SimpleGrid>
        
        {/* Shopping List by Section */}
        <VStack align="stretch" spacing={3}>
          {itemsBySection.map((section, sectionIndex) => {
            const config = getSectionConfig(section.name)
            const isExpanded = expandedSections.has(section.name) || isShoppingActive
            const sectionProgress = (section.items.filter(i => i.purchased).length / section.items.length) * 100
            
            return (
              <MotionCard
                key={section.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: sectionIndex * 0.05 }}
              >
                <CardHeader
                  cursor="pointer"
                  onClick={() => toggleSection(section.name)}
                  bg={sectionBg}
                  _hover={{ bg: useColorModeValue('gray.100', 'gray.600') }}
                >
                  <HStack>
                    <Text fontSize="xl">{config.emoji}</Text>
                    <Heading size="md">{section.name}</Heading>
                    <Badge colorScheme={config.color}>
                      {section.items.filter(i => !i.purchased).length} items
                    </Badge>
                    <Spacer />
                    {sectionProgress > 0 && sectionProgress < 100 && (
                      <Box w="100px">
                        <Progress
                          value={sectionProgress}
                          colorScheme={config.color}
                          size="sm"
                          borderRadius="full"
                        />
                      </Box>
                    )}
                    {sectionProgress === 100 && (
                      <Badge colorScheme="green">Complete</Badge>
                    )}
                    <IconButton
                      aria-label="Expand section"
                      icon={isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                      size="sm"
                      variant="ghost"
                    />
                  </HStack>
                </CardHeader>
                
                <Collapse in={isExpanded} animateOpacity>
                  <CardBody>
                    <VStack align="stretch" spacing={2}>
                      {section.items.map((item, itemIndex) => (
                        <MotionBox
                          key={item.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: itemIndex * 0.03 }}
                        >
                          <HStack
                            p={3}
                            bg={item.purchased ? 'green.50' : bgColor}
                            borderRadius="md"
                            border="1px"
                            borderColor={item.purchased ? 'green.300' : borderColor}
                            opacity={item.purchased ? 0.7 : 1}
                          >
                            <Checkbox
                              isChecked={item.purchased}
                              onChange={() => togglePurchased(item.id)}
                              colorScheme="green"
                            />
                            
                            <VStack align="start" flex={1} spacing={0}>
                              <Text
                                fontWeight="medium"
                                textDecoration={item.purchased ? 'line-through' : 'none'}
                              >
                                {item.name}
                              </Text>
                              {(item.amount || item.unit) && (
                                <Text fontSize="sm" color="gray.500">
                                  {item.amount} {item.unit}
                                </Text>
                              )}
                            </VStack>
                            
                            {item.isStaple && (
                              <Tooltip label="Staple item - will be reordered automatically">
                                <Badge colorScheme="purple">
                                  <FiStar />
                                </Badge>
                              </Tooltip>
                            )}
                            
                            {item.price && (
                              <Text fontWeight="medium" color="green.600">
                                ${item.price.toFixed(2)}
                              </Text>
                            )}
                            
                            <Menu>
                              <MenuButton
                                as={IconButton}
                                icon={<FiEdit2 />}
                                size="sm"
                                variant="ghost"
                              />
                              <MenuList>
                                <MenuItem icon={<FiDollarSign />}>
                                  Set Price
                                </MenuItem>
                                <MenuItem
                                  icon={<FiStar />}
                                  onClick={() => {
                                    // Mark as staple
                                  }}
                                >
                                  {item.isStaple ? 'Remove from Staples' : 'Mark as Staple'}
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
                          </HStack>
                        </MotionBox>
                      ))}
                    </VStack>
                  </CardBody>
                </Collapse>
              </MotionCard>
            )
          })}
          
          {itemsBySection.length === 0 && (
            <Card>
              <CardBody>
                <VStack py={8}>
                  <FiShoppingCart size={48} color="gray" />
                  <Text color="gray.500" textAlign="center">
                    Your shopping list is empty
                  </Text>
                  <Button
                    colorScheme="blue"
                    onClick={() => generateFromMealPlan('current')}
                    isLoading={isGenerating}
                  >
                    Generate from Meal Plan
                  </Button>
                </VStack>
              </CardBody>
            </Card>
          )}
        </VStack>
        
        {/* Quick Add Section */}
        <Card>
          <CardBody>
            <HStack>
              <InputGroup>
                <InputLeftElement pointerEvents="none">
                  <FiPlus />
                </InputLeftElement>
                <Input
                  placeholder="Quick add item (press Enter)"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value) {
                      addItem({ name: e.currentTarget.value })
                      e.currentTarget.value = ''
                    }
                  }}
                />
                <InputRightElement width="4.5rem">
                  <Button h="1.75rem" size="sm" onClick={onOpen}>
                    Details
                  </Button>
                </InputRightElement>
              </InputGroup>
            </HStack>
          </CardBody>
        </Card>
        
        {/* Price Summary */}
        {stats.estimatedCost > 0 && (
          <Card bg={useColorModeValue('green.50', 'green.900')}>
            <CardBody>
              <HStack justify="space-between">
                <VStack align="start" spacing={1}>
                  <Text fontWeight="bold">Estimated Total</Text>
                  <Text fontSize="sm" color="gray.600">
                    Based on average prices
                  </Text>
                </VStack>
                <VStack align="end" spacing={1}>
                  <Heading size="lg" color="green.600">
                    ${stats.estimatedCost.toFixed(2)}
                  </Heading>
                  <Text fontSize="sm" color="gray.600">
                    + tax
                  </Text>
                </VStack>
              </HStack>
            </CardBody>
          </Card>
        )}
      </VStack>
      
      {/* Add Item Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add Shopping Item</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Item Name</FormLabel>
                <Input
                  placeholder="e.g., Milk, Bread, Apples"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                />
              </FormControl>
              
              <HStack w="full">
                <FormControl>
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
                    placeholder="e.g., lbs, oz, dozen"
                    value={newItem.unit}
                    onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                  />
                </FormControl>
              </HStack>
              
              <FormControl>
                <FormLabel>Category</FormLabel>
                <Select
                  value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                >
                  {STORE_SECTIONS.map(section => (
                    <option key={section.name} value={section.name}>
                      {section.emoji} {section.name}
                    </option>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl display="flex" alignItems="center">
                <FormLabel mb="0">Mark as staple item?</FormLabel>
                <input
                  type="checkbox"
                  checked={newItem.isStaple}
                  onChange={(e) => setNewItem({ ...newItem, isStaple: e.target.checked })}
                />
              </FormControl>
              
              <Button
                colorScheme="blue"
                onClick={handleAddItem}
                w="full"
              >
                Add to List
              </Button>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Container>
  )
}