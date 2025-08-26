import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  List,
  ListItem,
  IconButton,
  Button,
  useColorModeValue,
  Container,
  Badge,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  FormControl,
  FormLabel,
  Input,
  Select,
  Checkbox,
  Image,
  Link,
  SimpleGrid,
  Card,
  CardBody
} from '@chakra-ui/react'
import { useState, useEffect } from 'react'
import { ChevronLeftIcon, AddIcon, DeleteIcon, CheckIcon, ExternalLinkIcon } from './icons/CustomIcons'
import ExportToReminders from './ExportToReminders'
import InstacartCartReview from './instacart/InstacartCartReview'
import { usePantry } from '../contexts/PantryContext'
import { useGrocery, GroceryItem } from '../contexts/GroceryContext'
import { parseAmount, formatAmount } from '../utils/amountParsing'
import { calculateExpirationDate } from '../utils/expiration'
import axios from 'axios'

interface Store {
  id: string
  name: string
  description: string
  type: 'delivery' | 'pickup' | 'subscription' | 'specialty'
  logo: string
  website: string
  deliveryTime?: string
  minOrder?: string
  deliveryFee?: string
  enabled: boolean
}

interface GroceryListProps {
  onBack: () => void
}

// Mock active stores (from StoresPage)
const activeStores: Store[] = [
  {
    id: 'amazon-fresh',
    name: 'Amazon Fresh',
    description: 'Fast grocery delivery from Amazon with Prime benefits',
    type: 'delivery',
    logo: 'https://images.unsplash.com/photo-1523474253046-8cd2748b5fd2?w=100&h=100&fit=crop',
    website: 'https://www.amazon.com/fresh',
    deliveryTime: '2-4 hours',
    minOrder: '$35',
    deliveryFee: 'Free with Prime',
    enabled: true
  },
  {
    id: 'whole-foods',
    name: 'Whole Foods Market',
    description: 'Organic and natural foods with Amazon Prime delivery',
    type: 'delivery',
    logo: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100&h=100&fit=crop',
    website: 'https://www.wholefoodsmarket.com',
    deliveryTime: '1-2 hours',
    minOrder: '$35',
    deliveryFee: 'Free with Prime',
    enabled: true
  }
]

export default function GroceryList({ onBack }: GroceryListProps) {
  const { groceryItems, addGroceryItem, removeGroceryItem, toggleGroceryItem, clearCompleted, updateGroceryItem, consolidateItems } = useGrocery()
  const [newItem, setNewItem] = useState<Partial<GroceryItem>>({})
  const [selectedItemsForPurchase, setSelectedItemsForPurchase] = useState<Set<string>>(new Set())
  const [selectedStore, setSelectedStore] = useState<Store | null>(null)
  const [instacartConnected, setInstacartConnected] = useState(false)
  const [userId, setUserId] = useState<string>('user_1') // TODO: Get from auth context
  const { isOpen: isAddOpen, onOpen: onAddOpen, onClose: onAddClose } = useDisclosure()
  const { isOpen: isFulfillOpen, onOpen: onFulfillOpen, onClose: onFulfillClose } = useDisclosure()
  const { isOpen: isInstacartOpen, onOpen: onInstacartOpen, onClose: onInstacartClose } = useDisclosure()
  const { pantryData, setPantryData } = usePantry()
  
  const bgColor = useColorModeValue('#ffffff', 'gray.900')
  const mutedColor = useColorModeValue('gray.600', 'gray.400')
  const borderColor = useColorModeValue('gray.200', 'gray.700')
  const brandColor = '#38BDAF'
  const successColor = '#008060'
  const criticalColor = '#d72c0d'

  const categoryColors: Record<string, string> = {
    vegetables: 'green',
    dairy: 'blue',
    meat: 'red',
    grains: 'orange',
    legumes: 'purple',
    oils: 'yellow',
    canned: 'gray',
    spices: 'pink',
    desserts: 'cyan',
    aromatics: 'pink',
    other: 'gray'
  }

  // Define category order for logical shopping flow
  const categoryOrder = [
    'vegetables',
    'aromatics', 
    'meat',
    'dairy',
    'grains',
    'legumes',
    'oils',
    'spices',
    'canned',
    'desserts',
    'other'
  ]

  // Group items by category
  const groupItemsByCategory = (items: GroceryItem[]) => {
    const grouped: Record<string, GroceryItem[]> = {}
    
    items.forEach(item => {
      const category = item.category || 'other'
      if (!grouped[category]) {
        grouped[category] = []
      }
      grouped[category].push(item)
    })
    
    // Sort items within each category by name
    Object.keys(grouped).forEach(category => {
      grouped[category].sort((a, b) => a.name.localeCompare(b.name))
    })
    
    return grouped
  }

  // Get category display name
  const getCategoryDisplayName = (category: string) => {
    const displayNames: Record<string, string> = {
      vegetables: 'Vegetables & Produce',
      aromatics: 'Aromatics & Herbs',
      meat: 'Meat & Seafood',
      dairy: 'Dairy & Eggs',
      grains: 'Grains & Bread',
      legumes: 'Legumes & Beans',
      oils: 'Oils & Condiments',
      spices: 'Spices & Seasonings',
      canned: 'Canned & Packaged',
      desserts: 'Desserts & Treats',
      other: 'Other Items'
    }
    return displayNames[category] || category.charAt(0).toUpperCase() + category.slice(1)
  }

  const toggleItem = (itemId: string, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }
    
    const item = groceryItems.find(i => i.id === itemId)
    if (!item) return

    const isBeingCompleted = !item.completed
    toggleGroceryItem(itemId)

    // When marking an item as completed, add it to the pantry
    if (isBeingCompleted && item) {
      addItemToPantry(item)
    }
  }

  // Helper function to simplify ingredient names
  const simplifyIngredientName = (name: string): string => {
    // Remove common descriptive phrases and parenthetical information
    let simplified = name
      // Remove parenthetical descriptions
      .replace(/\([^)]*\)/g, '')
      // Remove common descriptive phrases
      .replace(/\b(small|medium|large|extra large|jumbo)\b/gi, '')
      .replace(/\b(fresh|dried|frozen|canned|organic|raw)\b/gi, '')
      .replace(/\b(cut into.*|chopped.*|sliced.*|diced.*|minced.*|crushed.*|ground.*)\b/gi, '')
      .replace(/\b(about.*|approximately.*|roughly.*)\b/gi, '')
      .replace(/\b(plus more.*|or more.*|to taste.*)\b/gi, '')
      .replace(/\b(tender leaves and stems|leaves and stems|stems removed)\b/gi, '')
      .replace(/\b(coarsely chopped|finely chopped|roughly chopped)\b/gi, '')
      // Clean up extra spaces and commas
      .replace(/,\s*,/g, ',')
      .replace(/,\s*$/g, '')
      .replace(/\s+/g, ' ')
      .trim()

    // Capitalize first letter of each word for consistency
    return simplified
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }


  const addItemToPantry = (groceryItem: GroceryItem) => {
    const now = new Date().toISOString()
    
    // Simplify the ingredient name
    const simplifiedName = simplifyIngredientName(groceryItem.name)
    
    // First, check if this item already exists anywhere in the pantry
    let existingLocation: string | null = null
    let existingItemIndex: number = -1
    
    setPantryData(prev => {
      // Find if the item exists anywhere
      for (const location of prev) {
        const itemIndex = location.items.findIndex(item => 
          item.name.toLowerCase().trim() === simplifiedName.toLowerCase().trim()
        )
        if (itemIndex !== -1) {
          existingLocation = location.id
          existingItemIndex = itemIndex
          break
        }
      }
      
      // If item exists, consolidate in its current location
      if (existingLocation && existingItemIndex !== -1) {
        return prev.map(location => {
          if (location.id !== existingLocation) return location
          
          const existingItem = location.items[existingItemIndex]
          const existingParsed = parseAmount(existingItem.amount)
          const newParsed = parseAmount(groceryItem.amount)
          const totalAmount = existingParsed.value + newParsed.value
          
          // Calculate expiration date for the existing location
          const expirationDate = calculateExpirationDate(simplifiedName, existingItem.category, location.id).toISOString()
          
          // Update the existing item with consolidated amount
          const updatedItems = [...location.items]
          updatedItems[existingItemIndex] = {
            ...existingItem,
            amount: formatAmount(totalAmount),
            unit: groceryItem.unit || existingItem.unit || 'pieces',
            addedDate: now, // Update the added date
            expirationDate // Update expiration date
          }
          
          return { ...location, items: updatedItems }
        })
      }
      
      // Item doesn't exist anywhere, add to category-appropriate location
      const getLocationForCategory = (category?: string) => {
        switch (category) {
          case 'dairy':
          case 'meat':
            return 'refrigerator'
          case 'vegetables':
            return 'refrigerator' // Fresh produce goes to fridge
          case 'grains':
          case 'legumes':
          case 'oils':
          case 'canned':
          case 'spices':
          case 'aromatics':
            return 'pantry'
          case 'desserts':
            return 'freezer' // Ice cream and frozen desserts
          default:
            return 'refrigerator' // Default to refrigerator for fresh items
        }
      }
      
      const targetLocationId = getLocationForCategory(groceryItem.category)
      const expirationDate = calculateExpirationDate(simplifiedName, groceryItem.category, targetLocationId).toISOString()
      
      return prev.map(location => {
        if (location.id !== targetLocationId) return location
        
        // Add as new item
        const newPantryItem = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name: simplifiedName,
          amount: groceryItem.amount || '1',
          unit: groceryItem.unit || 'pieces',
          location: targetLocationId,
          category: groceryItem.category || 'other',
          addedDate: now,
          expirationDate
        }
        
        return { ...location, items: [...location.items, newPantryItem] }
      })
    })
  }

  const addNewItem = () => {
    if (!newItem.name) return

    addGroceryItem({
      name: newItem.name,
      amount: newItem.amount,
      unit: newItem.unit,
      category: newItem.category
    })

    setNewItem({})
    onAddClose()
  }

  const openFulfillment = () => {
    // Pre-select all pending items
    const pendingItemIds = new Set<string>(pendingItems.map(item => item.id))
    setSelectedItemsForPurchase(pendingItemIds)
    onFulfillOpen()
  }

  const toggleItemForPurchase = (itemId: string) => {
    const newSelected = new Set(selectedItemsForPurchase)
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId)
    } else {
      newSelected.add(itemId)
    }
    setSelectedItemsForPurchase(newSelected)
  }

  const generateShoppingList = () => {
    const selectedItems = groceryItems.filter(item => selectedItemsForPurchase.has(item.id))
    return selectedItems.map(item => {
      if (item.amount && item.unit) {
        return `${item.amount} ${item.unit} ${item.name}`
      } else if (item.amount) {
        return `${item.amount} ${item.name}`
      }
      return item.name
    }).join('\n')
  }

  const handlePurchaseFromStore = (store: Store) => {
    const shoppingList = generateShoppingList()
    const encodedList = encodeURIComponent(shoppingList)
    
    // Generate search URL for the selected store
    let searchUrl = store.website
    
    if (store.id === 'amazon-fresh') {
      searchUrl = `https://www.amazon.com/s?k=${encodedList}&i=amazonfresh`
    } else if (store.id === 'whole-foods') {
      searchUrl = `https://www.amazon.com/s?k=${encodedList}&i=wholefoods`
    } else {
      // For other stores, just open their main website
      searchUrl = store.website
    }
    
    window.open(searchUrl, '_blank')
    onFulfillClose()
  }

  // Check Instacart connection status on mount
  useEffect(() => {
    checkInstacartStatus()
  }, [])

  const checkInstacartStatus = async () => {
    try {
      const response = await axios.get('/api/instacart/auth/status', {
        params: { userId }
      })
      setInstacartConnected(response.data.isConnected)
    } catch (error) {
      console.error('Error checking Instacart status:', error)
    }
  }

  const handleInstacartSubmit = () => {
    // Get selected items for Instacart
    const itemsForInstacart = pendingItems.filter(item => 
      selectedItemsForPurchase.size === 0 || selectedItemsForPurchase.has(item.id)
    )
    onInstacartOpen()
  }

  // Removed auto-consolidation to prevent random resets
  // Users can manually consolidate using the Consolidate button

  const completedItems = groceryItems.filter(item => item.completed)
  const pendingItems = groceryItems.filter(item => !item.completed)
  
  // Group pending items by category
  const groupedPendingItems = groupItemsByCategory(pendingItems)
  const groupedCompletedItems = groupItemsByCategory(completedItems)

  return (
    <Box minH="100vh" bg={bgColor}>
      <Container maxW="6xl" py={8}>
        <VStack spacing={8} align="start">
          {/* Header */}
          <VStack spacing={4} align="start" w="full">
            <Button variant="ghost" onClick={onBack} size="sm">
              ← Back
            </Button>
            <HStack justify="space-between" w="full">
              <Heading size="xl">Groceries</Heading>
              <HStack spacing={2}>
                <IconButton
                  aria-label="Add item"
                  icon={<AddIcon />}
                  size="md"
                  variant="ghost"
                  style={{ color: brandColor }}
                  _hover={{ backgroundColor: `${brandColor}20` }}
                  onClick={onAddOpen}
                />
                <Button
                  size="md"
                  variant="ghost"
                  style={{ color: brandColor }}
                  _hover={{ backgroundColor: `${brandColor}20` }}
                  onClick={consolidateItems}
                >
                  Consolidate
                </Button>
                {pendingItems.length > 0 && (
                  <>
                    {instacartConnected ? (
                      <Button
                        size="md"
                        style={{ backgroundColor: '#43B02A', color: 'white' }}
                        _hover={{ backgroundColor: '#3a9924' }}
                        onClick={handleInstacartSubmit}
                        leftIcon={
                          <Image 
                            src="https://www.instacart.com/assets/beetstrap/brand/2022/carrot-logo.svg" 
                            h="16px" 
                          />
                        }
                      >
                        Send to Instacart
                      </Button>
                    ) : (
                      activeStores.length > 0 && (
                        <Button
                          size="md"
                          style={{ backgroundColor: brandColor, color: 'white' }}
                          _hover={{ backgroundColor: '#2da89c' }}
                          onClick={openFulfillment}
                        >
                          🛒 Buy Groceries
                        </Button>
                      )
                    )}
                  </>
                )}
                <ExportToReminders 
                  items={groceryItems}
                  recipeName="Recipe Groceries"
                />
                {completedItems.length > 0 && (
                  <Button
                    size="md"
                    variant="ghost"
                    style={{ color: criticalColor }}
                    _hover={{ backgroundColor: `${criticalColor}20` }}
                    onClick={() => clearCompleted()}
                  >
                    CLEAR COMPLETED
                  </Button>
                )}
              </HStack>
            </HStack>
          </VStack>

          {/* Pending Items - Grouped by Category */}
          <VStack spacing={6} w="full">
            {pendingItems.length === 0 ? (
              <Box textAlign="center" py={8}>
                <Text color={mutedColor} fontSize="lg">
                  No pending grocery items
                </Text>
              </Box>
            ) : (
              categoryOrder
                .filter(category => groupedPendingItems[category] && groupedPendingItems[category].length > 0)
                .map(category => (
                  <Box key={category} w="full">
                    {/* Category Header */}
                    <HStack justify="space-between" mb={4} pb={2} borderBottom="2px" borderColor={borderColor}>
                      <HStack spacing={3}>
                        <Text fontSize="lg" fontWeight="bold" color={useColorModeValue('gray.700', 'gray.300')}>
                          {getCategoryDisplayName(category)}
                        </Text>
                        <Badge 
                          colorScheme={categoryColors[category] || 'gray'} 
                          variant="outline"
                          size="sm"
                        >
                          {groupedPendingItems[category].length} ITEMS
                        </Badge>
                      </HStack>
                    </HStack>

                    {/* Category Items */}
                    <List spacing={0}>
                      {groupedPendingItems[category].map((item, index) => (
                        <ListItem key={item.id}>
                          <HStack
                            justify="space-between"
                            py={4}
                            px={4}
                            borderBottom={index < groupedPendingItems[category].length - 1 ? "1px" : "none"}
                            borderColor={borderColor}
                            _hover={{ bg: useColorModeValue('gray.100', 'gray.800') }}
                            bg={useColorModeValue('white', 'gray.900')}
                            borderRadius={index === 0 ? "md md 0 0" : index === groupedPendingItems[category].length - 1 ? "0 0 md md" : "none"}
                          >
                            <HStack spacing={4} flex={1}>
                              <IconButton
                                aria-label="Mark as completed"
                                icon={<CheckIcon />}
                                size="md"
                                variant="outline"
                                borderRadius="full"
                                style={{ borderColor: successColor, color: successColor }}
                                _hover={{ backgroundColor: `${successColor}20` }}
                                onClick={(e) => toggleItem(item.id, e)}
                              />
                              <VStack align="start" spacing={1} flex={1}>
                                <Text fontWeight="medium" fontSize="md">
                                  {item.name}
                                </Text>
                                <HStack spacing={2}>
                                  {(item.amount || item.unit) && (
                                    <Text fontSize="sm" style={{ color: brandColor }} fontWeight="bold">
                                      {item.amount && item.unit 
                                        ? `${item.amount} ${item.unit}`
                                        : item.amount || item.unit || ''
                                      }
                                    </Text>
                                  )}
                                </HStack>
                              </VStack>
                            </HStack>
                          </HStack>
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                ))
            )}
          </VStack>

          {/* Completed Items - Grouped by Category */}
          {completedItems.length > 0 && (
            <VStack spacing={4} w="full">
              <Text fontSize="lg" color={mutedColor} fontWeight="bold" mb={2} pb={2} borderBottom="2px" borderColor={borderColor} w="full">
                COMPLETED ({completedItems.length})
              </Text>
              
              {categoryOrder
                .filter(category => groupedCompletedItems[category] && groupedCompletedItems[category].length > 0)
                .map(category => (
                  <Box key={`completed-${category}`} w="full" opacity={0.6}>
                    {/* Category Header */}
                    <HStack justify="space-between" mb={3} pb={1} borderBottom="1px" borderColor={borderColor}>
                      <HStack spacing={2}>
                        <Text fontSize="md" fontWeight="semibold" color={mutedColor}>
                          {getCategoryDisplayName(category)}
                        </Text>
                        <Badge 
                          colorScheme={categoryColors[category] || 'gray'} 
                          variant="outline"
                          size="xs"
                          opacity={0.7}
                        >
                          {groupedCompletedItems[category].length}
                        </Badge>
                      </HStack>
                    </HStack>

                    {/* Category Items */}
                    <List spacing={0}>
                      {groupedCompletedItems[category].map((item, index) => (
                        <ListItem key={item.id}>
                          <HStack
                            justify="space-between"
                            py={3}
                            px={4}
                            borderBottom={index < groupedCompletedItems[category].length - 1 ? "1px" : "none"}
                            borderColor={borderColor}
                            _hover={{ bg: useColorModeValue('gray.100', 'gray.800') }}
                          >
                            <HStack spacing={4} flex={1}>
                              <IconButton
                                aria-label="Mark as incomplete"
                                icon={<CheckIcon />}
                                size="md"
                                variant="solid"
                                borderRadius="full"
                                style={{ backgroundColor: successColor, color: 'white' }}
                                _hover={{ backgroundColor: '#006b4f' }}
                                onClick={(e) => toggleItem(item.id, e)}
                              />
                              <VStack align="start" spacing={1} flex={1}>
                                <Text
                                  fontSize="md"
                                  color={mutedColor}
                                  textDecoration="line-through"
                                >
                                  {item.name}
                                </Text>
                                {(item.amount || item.unit) && (
                                  <Text fontSize="sm" color={mutedColor} textDecoration="line-through">
                                    {item.amount && item.unit 
                                      ? `${item.amount} ${item.unit}`
                                      : item.amount || item.unit || ''
                                    }
                                  </Text>
                                )}
                              </VStack>
                            </HStack>
                          </HStack>
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                ))
              }
            </VStack>
          )}
        </VStack>
      </Container>

      {/* Add Item Modal */}
      <Modal isOpen={isAddOpen} onClose={onAddClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add Grocery Item</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Item Name</FormLabel>
                <Input
                  placeholder="e.g., milk, bread, apples"
                  value={newItem.name || ''}
                  onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                />
              </FormControl>

              <HStack spacing={4} w="full">
                <FormControl>
                  <FormLabel>Amount (Optional)</FormLabel>
                  <Input
                    placeholder="e.g., 2, 500g, 1 bag"
                    value={newItem.amount || ''}
                    onChange={(e) => setNewItem(prev => ({ ...prev, amount: e.target.value }))}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Category (Optional)</FormLabel>
                  <Select
                    placeholder="Select category"
                    value={newItem.category || ''}
                    onChange={(e) => setNewItem(prev => ({ ...prev, category: e.target.value }))}
                  >
                    <option value="vegetables">Vegetables</option>
                    <option value="dairy">Dairy</option>
                    <option value="meat">Meat</option>
                    <option value="grains">Grains</option>
                    <option value="legumes">Legumes</option>
                    <option value="oils">Oils</option>
                    <option value="canned">Canned Goods</option>
                    <option value="spices">Spices</option>
                    <option value="aromatics">Aromatics</option>
                    <option value="desserts">Desserts</option>
                    <option value="other">Other</option>
                  </Select>
                </FormControl>
              </HStack>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onAddClose}>
              Cancel
            </Button>
            <Button 
              style={{ backgroundColor: brandColor, color: 'white' }}
              _hover={{ backgroundColor: '#2da89c' }}
              onClick={addNewItem}
            >
              Add Item
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Grocery Fulfillment Modal */}
      <Modal isOpen={isFulfillOpen} onClose={onFulfillClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <VStack spacing={2} align="start">
              <HStack spacing={3}>
                <Text fontSize="lg">🛒 Buy Groceries</Text>
              </HStack>
              <Text fontSize="sm" fontWeight="normal" color={mutedColor}>
                Select items to purchase and choose your preferred store
              </Text>
            </VStack>
          </ModalHeader>
          <ModalCloseButton />
          
          <ModalBody>
            <VStack spacing={6} align="start">
              {/* Item Selection */}
              <Box w="full">
                <Text fontSize="md" fontWeight="semibold" mb={3}>
                  Items to Purchase ({selectedItemsForPurchase.size} selected)
                </Text>
                
                <VStack spacing={4} align="start">
                  {categoryOrder
                    .filter(category => groupedPendingItems[category] && groupedPendingItems[category].length > 0)
                    .map(category => (
                      <Box key={`modal-${category}`} w="full">
                        {/* Category Header in Modal */}
                        <HStack spacing={2} mb={2}>
                          <Text fontSize="sm" fontWeight="bold" color={useColorModeValue('gray.600', 'gray.400')}>
                            {getCategoryDisplayName(category)}
                          </Text>
                          <Badge 
                            colorScheme={categoryColors[category] || 'gray'} 
                            size="xs"
                            variant="outline"
                          >
                            {groupedPendingItems[category].length}
                          </Badge>
                        </HStack>
                        
                        {/* Category Items in Modal */}
                        <VStack spacing={2} align="start" w="full">
                          {groupedPendingItems[category].map((item) => (
                            <HStack key={item.id} spacing={3} w="full" p={3} borderRadius="md" border="1px" borderColor={borderColor}>
                              <Checkbox
                                isChecked={selectedItemsForPurchase.has(item.id)}
                                onChange={() => toggleItemForPurchase(item.id)}
                                colorScheme="teal"
                              />
                              <VStack align="start" spacing={1} flex={1}>
                                <Text fontWeight="medium" fontSize="sm">
                                  {item.name}
                                </Text>
                                <HStack spacing={2}>
                                  {(item.amount || item.unit) && (
                                    <Text fontSize="xs" style={{ color: brandColor }} fontWeight="bold">
                                      {item.amount && item.unit 
                                        ? `${item.amount} ${item.unit}`
                                        : item.amount || item.unit || ''
                                      }
                                    </Text>
                                  )}
                                </HStack>
                              </VStack>
                            </HStack>
                          ))}
                        </VStack>
                      </Box>
                    ))
                  }
                </VStack>
              </Box>

              {/* Store Selection */}
              {selectedItemsForPurchase.size > 0 && (
                <Box w="full">
                  <Text fontSize="md" fontWeight="semibold" mb={3}>
                    Choose Your Store
                  </Text>
                  
                  <SimpleGrid columns={1} spacing={3}>
                    {activeStores.map((store) => (
                      <Card key={store.id} variant="outline" cursor="pointer" _hover={{ borderColor: brandColor, shadow: 'md' }}>
                        <CardBody p={4}>
                          <HStack spacing={4} align="start">
                            <Image
                              src={store.logo}
                              alt={store.name}
                              w="60px"
                              h="60px"
                              objectFit="cover"
                              borderRadius="md"
                            />
                            <VStack align="start" spacing={2} flex={1}>
                              <VStack align="start" spacing={1}>
                                <Text fontWeight="bold" fontSize="md">
                                  {store.name}
                                </Text>
                                <Text fontSize="sm" color={mutedColor} noOfLines={2}>
                                  {store.description}
                                </Text>
                              </VStack>
                              
                              <HStack spacing={4} wrap="wrap">
                                <Text fontSize="xs" color={mutedColor}>
                                  <strong>Delivery:</strong> {store.deliveryTime}
                                </Text>
                                <Text fontSize="xs" color={mutedColor}>
                                  <strong>Min:</strong> {store.minOrder}
                                </Text>
                                <Text fontSize="xs" color={mutedColor}>
                                  <strong>Fee:</strong> {store.deliveryFee}
                                </Text>
                              </HStack>
                              
                              <Button
                                size="sm"
                                style={{ backgroundColor: brandColor, color: 'white' }}
                                _hover={{ backgroundColor: '#2da89c' }}
                                rightIcon={<ExternalLinkIcon />}
                                onClick={() => handlePurchaseFromStore(store)}
                              >
                                Shop at {store.name}
                              </Button>
                            </VStack>
                          </HStack>
                        </CardBody>
                      </Card>
                    ))}
                  </SimpleGrid>
                </Box>
              )}
              
              {selectedItemsForPurchase.size === 0 && (
                <Box w="full" textAlign="center" py={8}>
                  <Text color={mutedColor} fontSize="sm">
                    Select items above to see store options
                  </Text>
                </Box>
              )}
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" onClick={onFulfillClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Instacart Cart Review Modal */}
      <InstacartCartReview
        isOpen={isInstacartOpen}
        onClose={onInstacartClose}
        userId={userId}
        groceryItems={pendingItems}
        onCartSubmitted={(orderId) => {
          console.log('Instacart order created:', orderId)
        }}
      />
    </Box>
  )
}