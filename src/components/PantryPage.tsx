import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Card,
  CardBody,
  CardHeader,
  List,
  ListItem,
  useColorModeValue,
  Badge,
  IconButton,
  Input,
  Select,
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
  SimpleGrid,
  Editable,
  EditableInput,
  EditablePreview,
  useEditableControls,
  ButtonGroup,
  InputGroup,
  InputLeftElement,
  Flex,
  useToast
} from '@chakra-ui/react'
import { useState, useRef, useEffect } from 'react'
import { AddIcon, EditIcon, DeleteIcon, CheckIcon, CloseIcon, GroceryIcon } from './icons/CustomIcons'
import { SearchIcon } from '@chakra-ui/icons'
import { usePreferences } from '../contexts/PreferencesContext'
import { usePantry, PantryItem } from '../contexts/PantryContext'
import { useGrocery } from '../contexts/GroceryContext'
import { formatIngredientAmount } from '../utils/units'
import { calculateExpirationDate, formatExpirationDate, getExpirationStatus } from '../utils/expiration'
import { generateSamplePantryData, generateSampleGroceryData } from '../utils/starterData'

interface PantryPageProps {
  onBack: () => void
}

function EditableControls() {
  const {
    isEditing,
    getSubmitButtonProps,
    getCancelButtonProps,
    getEditButtonProps,
  } = useEditableControls()

  return isEditing ? (
    <ButtonGroup justifyContent="center" size="sm">
      <IconButton aria-label="Save" icon={<CheckIcon />} {...getSubmitButtonProps()} />
      <IconButton aria-label="Cancel" icon={<CloseIcon />} {...getCancelButtonProps()} />
    </ButtonGroup>
  ) : (
    <IconButton
      aria-label="Edit"
      size="sm"
      icon={<EditIcon />}
      {...getEditButtonProps()}
    />
  )
}

export default function PantryPage({ onBack }: PantryPageProps) {
  const { pantryData, setPantryData, getRecentlyDepleted, getFrequentlyUsed } = usePantry()
  const { addGroceryItem } = useGrocery()
  const toast = useToast()
  const [newItem, setNewItem] = useState<Partial<PantryItem>>({})
  const [editItem, setEditItem] = useState<PantryItem | null>(null)
  const [inlineEditItem, setInlineEditItem] = useState<PantryItem | null>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const { isOpen: isAddOpen, onOpen: onAddOpen, onClose: onAddClose } = useDisclosure()
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure()
  const { preferences } = usePreferences()
  
  const recentlyDepleted = getRecentlyDepleted()
  const frequentlyUsed = getFrequentlyUsed()
  
  // Get recently added items (last 7 days)
  const getRecentlyAdded = () => {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const recentItems: PantryItem[] = []
    pantryData.forEach(location => {
      location.items.forEach(item => {
        if (item.addedDate && new Date(item.addedDate) > sevenDaysAgo) {
          recentItems.push(item)
        }
      })
    })
    
    // Sort by most recently added first
    return recentItems.sort((a, b) => {
      const dateA = a.addedDate ? new Date(a.addedDate).getTime() : 0
      const dateB = b.addedDate ? new Date(b.addedDate).getTime() : 0
      return dateB - dateA
    })
  }
  
  const recentlyAdded = getRecentlyAdded()
  
  const bgColor = useColorModeValue('#ffffff', 'gray.900')
  const cardBg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.700')
  const mutedColor = useColorModeValue('gray.600', 'gray.400')
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
    desserts: 'cyan'
  }

  const updateLocationName = (locationId: string, newName: string) => {
    console.log('updateLocationName called:', locationId, newName)
    setPantryData(prev => {
      const updated = prev.map(location => 
        location.id === locationId 
          ? { ...location, name: newName }
          : location
      )
      console.log('Updated pantry data:', updated)
      return updated
    })
  }

  const addNewItem = () => {
    if (!newItem.name || !newItem.amount || !newItem.unit || !newItem.location) return

    const now = new Date().toISOString()
    const expirationDate = newItem.expirationDate || 
      calculateExpirationDate(newItem.name, newItem.category, newItem.location).toISOString()

    const item: PantryItem = {
      id: Date.now().toString(),
      name: newItem.name,
      amount: newItem.amount,
      unit: newItem.unit,
      location: newItem.location,
      category: newItem.category || 'other',
      addedDate: now,
      expirationDate
    }

    setPantryData(prev => prev.map(location => 
      location.id === newItem.location
        ? { ...location, items: [...location.items, item] }
        : location
    ))

    setNewItem({})
    onAddClose()
  }

  const removeItem = (itemId: string, locationId: string) => {
    setPantryData(prev => prev.map(location => 
      location.id === locationId
        ? { ...location, items: location.items.filter(item => item.id !== itemId) }
        : location
    ))
  }

  const updateItem = (itemId: string, locationId: string, updates: Partial<PantryItem>) => {
    setPantryData(prev => prev.map(location => 
      location.id === locationId
        ? { 
            ...location, 
            items: location.items.map(item => 
              item.id === itemId ? { ...item, ...updates } : item
            )
          }
        : location
    ))
  }

  const openEditItem = (item: PantryItem) => {
    setEditItem(item)
    onEditOpen()
  }

  const saveEditItem = () => {
    if (!editItem) return
    updateItem(editItem.id, editItem.location, editItem)
    setEditItem(null)
    onEditClose()
  }

  const handleDoubleClick = (item: PantryItem) => {
    setInlineEditItem({ ...item })
  }

  // Focus the input when inline edit item changes
  useEffect(() => {
    if (inlineEditItem && nameInputRef.current) {
      // Use a timeout to ensure the component has rendered
      setTimeout(() => {
        nameInputRef.current?.focus()
        nameInputRef.current?.select()
      }, 100)
    }
  }, [inlineEditItem])

  const saveInlineEdit = () => {
    if (!inlineEditItem) return
    updateItem(inlineEditItem.id, inlineEditItem.location, inlineEditItem)
    setInlineEditItem(null)
  }

  const cancelInlineEdit = () => {
    setInlineEditItem(null)
  }

  const updateInlineEditItem = (field: keyof PantryItem, value: string) => {
    if (!inlineEditItem) return
    setInlineEditItem(prev => {
      if (!prev) return null
      return { ...prev, [field]: value }
    })
  }

  const getTotalItemCount = () => {
    return pantryData.reduce((total, location) => total + location.items.length, 0)
  }

  const filterItems = (items: PantryItem[]) => {
    if (!searchQuery.trim()) return items
    
    const query = searchQuery.toLowerCase()
    return items.filter(item => 
      item.name.toLowerCase().includes(query) ||
      item.category?.toLowerCase().includes(query) ||
      item.amount.toLowerCase().includes(query) ||
      item.unit.toLowerCase().includes(query)
    )
  }

  const getFilteredTotalCount = () => {
    return pantryData.reduce((total, location) => {
      const filteredItems = filterItems(location.items)
      return total + filteredItems.length
    }, 0)
  }

  const addToGroceryList = (item: PantryItem) => {
    addGroceryItem({
      name: item.name,
      amount: item.amount,
      unit: item.unit,
      category: item.category
    })

    toast({
      title: 'Added to grocery list',
      description: `"${item.name}" has been added to your grocery list`,
      status: 'success',
      duration: 3000,
    })
  }

  const addAllRecentlyUsedUpToGrocery = () => {
    const recentlyDepleted = getRecentlyDepleted()
    let addedCount = 0

    recentlyDepleted.forEach(item => {
      addGroceryItem({
        name: item.name,
        amount: item.lastAmount,
        unit: item.unit,
        category: item.category
      })
      addedCount++
    })

    toast({
      title: 'Added to grocery list',
      description: `${addedCount} recently used up items added to your grocery list`,
      status: 'success',
      duration: 3000,
    })
  }

  const populateStarterData = () => {
    // Generate and set sample pantry data
    const samplePantryData = generateSamplePantryData()
    setPantryData(samplePantryData)

    // Generate and add sample grocery items
    const sampleGroceryData = generateSampleGroceryData()
    sampleGroceryData.forEach(item => {
      addGroceryItem({
        name: item.name,
        amount: item.amount,
        unit: item.unit,
        category: item.category
      })
    })

    toast({
      title: 'Sample data loaded!',
      description: 'Your pantry and grocery list have been populated with sample items to help you get started.',
      status: 'success',
      duration: 5000,
    })
  }

  return (
    <Box minH="100vh" bg={bgColor}>
      <Container maxW="6xl" py={8}>
        <VStack spacing={8} align="start">
          {/* Header */}
          <VStack spacing={4} align="start" w="full">
            <Button variant="ghost" onClick={onBack} size="sm">
              ← Back
            </Button>
            <VStack spacing={4} w="full">
              <HStack justify="space-between" w="full">
                <VStack align="start" spacing={2}>
                  <Heading size="xl">My Pantry</Heading>
                  <Text color={mutedColor} fontSize="lg">
                    Track what you have at home • {searchQuery ? getFilteredTotalCount() : getTotalItemCount()} items {searchQuery ? 'found' : 'total'}
                  </Text>
                </VStack>
                <HStack spacing={3}>
                  <Button 
                    size="sm"
                    variant="outline"
                    style={{ borderColor: brandColor, color: brandColor }}
                    _hover={{ backgroundColor: `${brandColor}20` }}
                    onClick={populateStarterData}
                  >
                    Load Sample Data
                  </Button>
                  <Button 
                    style={{ backgroundColor: brandColor, color: 'white' }}
                    _hover={{ backgroundColor: '#2da89c' }}
                    leftIcon={<AddIcon />} 
                    onClick={onAddOpen}
                  >
                    Add Item
                  </Button>
                </HStack>
              </HStack>
              
              {/* Search Box */}
              <InputGroup size="lg" maxW="400px">
                <InputLeftElement pointerEvents="none">
                  <SearchIcon color={mutedColor} />
                </InputLeftElement>
                <Input
                  placeholder="Search pantry items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  borderColor={borderColor}
                  focusBorderColor={brandColor}
                  _hover={{ borderColor: brandColor }}
                  bg={cardBg}
                />
              </InputGroup>
            </VStack>
          </VStack>

          {/* Recently Used & Recently Added Sections */}
          {(recentlyDepleted.length > 0 || recentlyAdded.length > 0) && (
            <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6} w="full">
              {/* Recently Used Section */}
              {recentlyDepleted.length > 0 && (
                <Box w="full">
                  <HStack justify="space-between" mb={4} pb={2} borderBottom="2px" borderColor={borderColor}>
                    <HStack spacing={3}>
                      <Text fontSize="lg" fontWeight="bold">Recently Used</Text>
                      <Badge colorScheme="orange" variant="outline">
                        {recentlyDepleted.length} ITEMS
                      </Badge>
                    </HStack>
                    <Button
                      size="sm"
                      style={{ backgroundColor: brandColor, color: 'white' }}
                      _hover={{ backgroundColor: '#2da89c' }}
                      leftIcon={<GroceryIcon />}
                      onClick={addAllRecentlyUsedUpToGrocery}
                    >
                      Add All
                    </Button>
                  </HStack>
                  
                  <List spacing={0}>
                    {recentlyDepleted.slice(0, 5).map((item, index) => (
                      <ListItem key={item.id}>
                        <HStack
                          justify="space-between"
                          py={3}
                          px={4}
                          borderBottom={index < Math.min(recentlyDepleted.length, 5) - 1 ? "1px" : "none"}
                          borderColor={borderColor}
                          _hover={{ bg: useColorModeValue('gray.100', 'gray.800') }}
                          opacity={0.7}
                        >
                          <HStack spacing={4} flex={1}>
                            <VStack align="start" spacing={1} flex={1}>
                              <HStack spacing={2}>
                                <Text fontWeight="medium" fontSize="md">
                                  {item.name}
                                </Text>
                                {item.isFrequentlyUsed && (
                                  <Badge size="sm" colorScheme="purple" textTransform="uppercase">
                                    Frequent
                                  </Badge>
                                )}
                              </HStack>
                              <HStack spacing={2}>
                                <Text fontSize="sm" color={mutedColor}>
                                  Last had: {item.lastAmount} {item.unit}
                                </Text>
                                <Text fontSize="xs" color={mutedColor}>
                                  • Used up {new Date(item.depletedDate).toLocaleDateString()}
                                </Text>
                              </HStack>
                            </VStack>
                          </HStack>
                          <IconButton
                            aria-label={`Add ${item.name} to grocery list`}
                            icon={<GroceryIcon />}
                            size="sm"
                            variant="ghost"
                            style={{ color: brandColor }}
                            _hover={{ backgroundColor: `${brandColor}20` }}
                            onClick={() => addToGroceryList({
                              id: item.id,
                              name: item.name,
                              amount: item.lastAmount,
                              unit: item.unit,
                              location: 'pantry',
                              category: item.category,
                              addedDate: new Date().toISOString(),
                              expirationDate: new Date().toISOString()
                            })}
                          />
                        </HStack>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {/* Recently Added Section */}
              {recentlyAdded.length > 0 && (
                <Box w="full">
                  <HStack justify="space-between" mb={4} pb={2} borderBottom="2px" borderColor={borderColor}>
                    <HStack spacing={3}>
                      <Text fontSize="lg" fontWeight="bold">Recently Added</Text>
                      <Badge colorScheme="green" variant="outline">
                        {recentlyAdded.length} ITEMS
                      </Badge>
                    </HStack>
                    <Button
                      size="sm"
                      style={{ backgroundColor: brandColor, color: 'white' }}
                      _hover={{ backgroundColor: '#2da89c' }}
                      leftIcon={<AddIcon />}
                      onClick={onAddOpen}
                    >
                      Add Item
                    </Button>
                  </HStack>
                  
                  <List spacing={0}>
                    {recentlyAdded.slice(0, 5).map((item, index) => (
                      <ListItem key={item.id}>
                        <HStack
                          justify="space-between"
                          py={3}
                          px={4}
                          borderBottom={index < Math.min(recentlyAdded.length, 5) - 1 ? "1px" : "none"}
                          borderColor={borderColor}
                          _hover={{ bg: useColorModeValue('gray.100', 'gray.800') }}
                          cursor="pointer"
                          onClick={() => handleDoubleClick(item)}
                          title="Click to edit"
                        >
                          <HStack spacing={4} flex={1}>
                            <VStack align="start" spacing={1} flex={1}>
                              <HStack spacing={2}>
                                <Text fontWeight="medium" fontSize="md">
                                  {item.name}
                                </Text>
                                <Badge 
                                  colorScheme={categoryColors[item.category || 'other'] || 'gray'} 
                                  size="sm"
                                  textTransform="uppercase"
                                >
                                  {item.category}
                                </Badge>
                              </HStack>
                              <HStack spacing={2}>
                                <Text fontSize="sm" style={{ color: brandColor }} fontWeight="bold">
                                  {formatIngredientAmount(item.amount, item.unit, preferences.unitSystem)}
                                </Text>
                                <Text fontSize="xs" color={mutedColor}>
                                  • Added {item.addedDate ? new Date(item.addedDate).toLocaleDateString() : 'Unknown'}
                                </Text>
                                <Text fontSize="xs" color={mutedColor}>
                                  • In {pantryData.find(loc => loc.id === item.location)?.name || 'Unknown'}
                                </Text>
                              </HStack>
                            </VStack>
                          </HStack>
                          <HStack spacing={2}>
                            <IconButton
                              aria-label="Quick edit item"
                              icon={<EditIcon />}
                              size="sm"
                              variant="ghost"
                              style={{ color: brandColor }}
                              _hover={{ backgroundColor: `${brandColor}20` }}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDoubleClick(item)
                              }}
                            />
                            <IconButton
                              aria-label={`Add ${item.name} to grocery list`}
                              icon={<GroceryIcon />}
                              size="sm"
                              variant="ghost"
                              style={{ color: brandColor }}
                              _hover={{ backgroundColor: `${brandColor}20` }}
                              onClick={(e) => {
                                e.stopPropagation()
                                addToGroceryList(item)
                              }}
                            />
                          </HStack>
                        </HStack>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </SimpleGrid>
          )}

          {/* Pantry Locations */}
          <VStack spacing={6} w="full">
            {pantryData.map((location) => (
              <Box key={location.id} w="full">
                {/* Location Header */}
                <HStack justify="space-between" mb={4} pb={2} borderBottom="2px" borderColor={borderColor}>
                  <HStack spacing={3}>
                    <Editable
                      value={location.name}
                      onSubmit={(value) => {
                        console.log('Location edit submitted:', value)
                        updateLocationName(location.id, value)
                      }}
                      fontSize="xl"
                      fontWeight="bold"
                      isPreviewFocusable={true}
                      selectAllOnFocus={true}
                      display="flex"
                      alignItems="center"
                      onEdit={() => console.log('Location edit started:', location.name)}
                      onCancel={() => console.log('Location edit cancelled')}
                    >
                      <HStack spacing={2} alignItems="center">
                        <EditablePreview />
                        <EditableInput 
                          onFocus={() => console.log('Location input focused')}
                          onKeyDown={(e) => console.log('Key pressed in location input:', e.key)}
                        />
                        <EditableControls />
                      </HStack>
                    </Editable>
                    <Badge colorScheme="gray" variant="outline">
                      {(() => {
                        const filteredCount = filterItems(location.items).length
                        const totalCount = location.items.length
                        return searchQuery && filteredCount !== totalCount 
                          ? `${filteredCount}/${totalCount} ITEMS`
                          : `${totalCount} ITEMS`
                      })()}
                    </Badge>
                  </HStack>
                </HStack>

                {/* Items List */}
                {(() => {
                  const filteredItems = filterItems(location.items)
                  
                  if (filteredItems.length === 0) {
                    return (
                      <Text color={mutedColor} textAlign="center" py={8} fontStyle="italic">
                        {searchQuery ? `No items match "${searchQuery}" in ${location.name.toLowerCase()}` : `No items in ${location.name.toLowerCase()}`}
                      </Text>
                    )
                  }
                  
                  return (
                    <List spacing={0}>
                      {filteredItems.map((item, index) => (
                      <ListItem key={item.id}>
                        {inlineEditItem && inlineEditItem.id === item.id ? (
                          // Inline Edit Mode
                          <Box
                            py={4} 
                            px={4}
                            borderBottom={index < location.items.length - 1 ? "1px" : "none"}
                            bg="blue.50"
                            border="2px solid"
                            borderColor="blue.200"
                            borderRadius="md"
                          >
                            <VStack spacing={3}>
                              <HStack spacing={3} w="full">
                                <Input
                                  ref={nameInputRef}
                                  value={inlineEditItem.name || ''}
                                  onChange={(e) => {
                                    console.log('Name input onChange:', e.target.value)
                                    updateInlineEditItem('name', e.target.value)
                                  }}
                                  placeholder="Item name"
                                  size="sm"
                                  flex={2}
                                  isReadOnly={false}
                                  isDisabled={false}
                                  tabIndex={0}
                                  onFocus={(e) => {
                                    console.log('Name input focused')
                                    e.target.select()
                                  }}
                                  onKeyDown={(e) => console.log('Key pressed in name input:', e.key)}
                                />
                                <Input
                                  value={inlineEditItem.amount || ''}
                                  onChange={(e) => updateInlineEditItem('amount', e.target.value)}
                                  placeholder="Amount"
                                  size="sm"
                                  flex={1}
                                  isReadOnly={false}
                                  isDisabled={false}
                                  tabIndex={1}
                                />
                                <Select
                                  value={inlineEditItem.unit || ''}
                                  onChange={(e) => updateInlineEditItem('unit', e.target.value)}
                                  size="sm"
                                  flex={1}
                                >
                                <option value="g">grams (g)</option>
                                <option value="kg">kilograms (kg)</option>
                                <option value="lb">pounds (lb)</option>
                                <option value="oz">ounces (oz)</option>
                                <option value="ml">milliliters (ml)</option>
                                <option value="l">liters (l)</option>
                                <option value="cups">cups</option>
                                <option value="pieces">pieces</option>
                                <option value="cans">cans</option>
                                <option value="bottles">bottles</option>
                                <option value="bulb">bulb</option>
                              </Select>
                              </HStack>
                              
                              <HStack spacing={3} w="full">
                                <Select
                                  value={inlineEditItem.category || ''}
                                  onChange={(e) => updateInlineEditItem('category', e.target.value)}
                                  placeholder="Category"
                                  size="sm"
                                  flex={1}
                                >
                                <option value="vegetables">Vegetables</option>
                                <option value="dairy">Dairy</option>
                                <option value="meat">Meat</option>
                                <option value="grains">Grains</option>
                                <option value="legumes">Legumes</option>
                                <option value="oils">Oils</option>
                                <option value="canned">Canned Goods</option>
                                <option value="spices">Spices</option>
                                <option value="desserts">Desserts</option>
                                <option value="other">Other</option>
                              </Select>
                              
                                <Input
                                  type="date"
                                  value={inlineEditItem.expirationDate ? new Date(inlineEditItem.expirationDate).toISOString().split('T')[0] : ''}
                                  onChange={(e) => {
                                    const dateValue = e.target.value ? new Date(e.target.value + 'T00:00:00').toISOString() : ''
                                    updateInlineEditItem('expirationDate', dateValue)
                                  }}
                                  size="sm"
                                  flex={1}
                                />
                              </HStack>
                              
                              <HStack justify="center" spacing={3}>
                              <Button
                                size="sm"
                                style={{ backgroundColor: brandColor, color: 'white' }}
                                _hover={{ backgroundColor: '#2da89c' }}
                                leftIcon={<CheckIcon />}
                                onClick={saveInlineEdit}
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                leftIcon={<CloseIcon />}
                                onClick={cancelInlineEdit}
                              >
                                Cancel
                              </Button>
                              </HStack>
                            </VStack>
                          </Box>
                        ) : (
                          // Normal Display Mode
                          <HStack 
                            justify="space-between" 
                            py={3} 
                            px={4}
                            borderBottom={index < location.items.length - 1 ? "1px" : "none"}
                            borderColor={borderColor}
                            _hover={{ bg: useColorModeValue('gray.50', 'gray.800'), cursor: 'pointer' }}
                            bg={(() => {
                              if (item.expirationDate) {
                                const expiration = getExpirationStatus(new Date(item.expirationDate))
                                if (expiration.status === 'expired') return '#d72c0d10' // Light red background
                                if (expiration.status === 'expiring') return '#ffb50310' // Light yellow background
                              }
                              return 'transparent'
                            })()}
                            onDoubleClick={() => handleDoubleClick(item)}
                            title="Double-click to edit"
                          >
                            <HStack spacing={4} flex={1}>
                              <VStack align="start" spacing={1} flex={1}>
                                <HStack spacing={2} align="center" justify="space-between" w="full">
                                  <HStack spacing={2} align="center">
                                    <Text fontWeight="medium" fontSize="md">
                                      {item.name}
                                    </Text>
                                    {(() => {
                                      let dotColor = '#008060' // Default green
                                      
                                      if (item.expirationDate) {
                                        const expiration = getExpirationStatus(new Date(item.expirationDate))
                                        
                                        if (expiration.status === 'expired') {
                                          dotColor = '#d72c0d' // Red
                                        } else if (expiration.status === 'expiring') {
                                          dotColor = '#ffb503' // Yellow
                                        }
                                      }
                                      
                                      return (
                                        <Box
                                          w="10px"
                                          h="10px"
                                          borderRadius="full"
                                          bg={dotColor}
                                          flexShrink={0}
                                          ml={2}
                                        />
                                      )
                                    })()}
                                  </HStack>
                                  {item.expirationDate && (
                                    <Text 
                                      fontSize="xs" 
                                      color={(() => {
                                        const expiration = getExpirationStatus(new Date(item.expirationDate))
                                        return expiration.color
                                      })()}
                                      fontWeight="medium"
                                      flexShrink={0}
                                    >
                                      {formatExpirationDate(new Date(item.expirationDate))}
                                    </Text>
                                  )}
                                </HStack>
                                <VStack align="start" spacing={1}>
                                  <HStack spacing={2}>
                                    <Text fontSize="sm" style={{ color: brandColor }} fontWeight="bold">
                                      {formatIngredientAmount(item.amount, item.unit, preferences.unitSystem)}
                                    </Text>
                                    {item.category && (
                                      <Badge 
                                        colorScheme={categoryColors[item.category] || 'gray'} 
                                        size="sm"
                                        textTransform="uppercase"
                                      >
                                        {item.category}
                                      </Badge>
                                    )}
                                  </HStack>
                                </VStack>
                              </VStack>
                            </HStack>
                            
                            <HStack spacing={2}>
                              <IconButton
                                aria-label={`Add ${item.name} to grocery list`}
                                icon={<GroceryIcon />}
                                size="md"
                                variant="ghost"
                                style={{ color: brandColor }}
                                _hover={{ backgroundColor: `${brandColor}20` }}
                                onClick={() => addToGroceryList(item)}
                              />
                              <IconButton
                                aria-label="Edit item"
                                icon={<EditIcon />}
                                size="md"
                                variant="ghost"
                                style={{ color: brandColor }}
                                _hover={{ backgroundColor: `${brandColor}20` }}
                                onClick={() => openEditItem(item)}
                              />
                              <IconButton
                                aria-label="Remove item"
                                icon={<DeleteIcon />}
                                size="md"
                                variant="ghost"
                                style={{ color: criticalColor }}
                                _hover={{ backgroundColor: `${criticalColor}20` }}
                                onClick={() => removeItem(item.id, location.id)}
                              />
                            </HStack>
                          </HStack>
                        )}
                      </ListItem>
                      ))}
                    </List>
                  )
                })()}
              </Box>
            ))}
          </VStack>
        </VStack>
      </Container>

      {/* Add Item Modal */}
      <Modal isOpen={isAddOpen} onClose={onAddClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add Pantry Item</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Item Name</FormLabel>
                <Input
                  placeholder="e.g., carrots, milk, rice"
                  value={newItem.name || ''}
                  onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                />
              </FormControl>

              <HStack spacing={4} w="full">
                <FormControl>
                  <FormLabel>Amount</FormLabel>
                  <Input
                    placeholder="e.g., 3, 500, 1.5"
                    value={newItem.amount || ''}
                    onChange={(e) => setNewItem(prev => ({ ...prev, amount: e.target.value }))}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Unit</FormLabel>
                  <Select
                    placeholder="Select unit"
                    value={newItem.unit || ''}
                    onChange={(e) => setNewItem(prev => ({ ...prev, unit: e.target.value }))}
                  >
                    <option value="g">grams (g)</option>
                    <option value="kg">kilograms (kg)</option>
                    <option value="lb">pounds (lb)</option>
                    <option value="oz">ounces (oz)</option>
                    <option value="ml">milliliters (ml)</option>
                    <option value="l">liters (l)</option>
                    <option value="cups">cups</option>
                    <option value="pieces">pieces</option>
                    <option value="cans">cans</option>
                    <option value="bottles">bottles</option>
                    <option value="bulb">bulb</option>
                  </Select>
                </FormControl>
              </HStack>
              
              <FormControl>
                <FormLabel>Expiration Date</FormLabel>
                <Input
                  type="date"
                  value={newItem.expirationDate ? new Date(newItem.expirationDate).toISOString().split('T')[0] : 
                    (newItem.name && newItem.location ? 
                      calculateExpirationDate(newItem.name, newItem.category, newItem.location).toISOString().split('T')[0] : 
                      '')}
                  onChange={(e) => {
                    const dateValue = e.target.value ? new Date(e.target.value + 'T00:00:00').toISOString() : ''
                    setNewItem(prev => ({ ...prev, expirationDate: dateValue }))
                  }}
                />
                <Text fontSize="xs" color={mutedColor} mt={1}>
                  💡 Auto-calculated based on item type and location. You can adjust as needed.
                </Text>
              </FormControl>

              <FormControl>
                <FormLabel>Location</FormLabel>
                <Select
                  placeholder="Select location"
                  value={newItem.location || ''}
                  onChange={(e) => setNewItem(prev => ({ ...prev, location: e.target.value }))}
                >
                  {pantryData.map(location => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </Select>
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
                  <option value="desserts">Desserts</option>
                  <option value="other">Other</option>
                </Select>
              </FormControl>
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

      {/* Edit Item Modal */}
      <Modal isOpen={isEditOpen} onClose={onEditClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Pantry Item</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {editItem && (
              <VStack spacing={4}>
                <FormControl>
                  <FormLabel>Item Name</FormLabel>
                  <Input
                    value={editItem.name || ''}
                    onChange={(e) => setEditItem(prev => prev ? { ...prev, name: e.target.value } : null)}
                  />
                </FormControl>

                <HStack spacing={4} w="full">
                  <FormControl>
                    <FormLabel>Amount</FormLabel>
                    <Input
                      value={editItem.amount || ''}
                      onChange={(e) => setEditItem(prev => prev ? { ...prev, amount: e.target.value } : null)}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Unit</FormLabel>
                    <Select
                      value={editItem.unit || ''}
                      onChange={(e) => setEditItem(prev => prev ? { ...prev, unit: e.target.value } : null)}
                    >
                      <option value="g">grams (g)</option>
                      <option value="kg">kilograms (kg)</option>
                      <option value="lb">pounds (lb)</option>
                      <option value="oz">ounces (oz)</option>
                      <option value="ml">milliliters (ml)</option>
                      <option value="l">liters (l)</option>
                      <option value="cups">cups</option>
                      <option value="pieces">pieces</option>
                      <option value="cans">cans</option>
                      <option value="bottles">bottles</option>
                      <option value="bulb">bulb</option>
                    </Select>
                  </FormControl>
                </HStack>

                <FormControl>
                  <FormLabel>Expiration Date</FormLabel>
                  <Input
                    type="date"
                    value={editItem.expirationDate ? new Date(editItem.expirationDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => {
                      const dateValue = e.target.value ? new Date(e.target.value + 'T00:00:00').toISOString() : ''
                      setEditItem(prev => prev ? { ...prev, expirationDate: dateValue } : null)
                    }}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Location</FormLabel>
                  <Select
                    value={editItem.location || ''}
                    onChange={(e) => setEditItem(prev => prev ? { ...prev, location: e.target.value } : null)}
                  >
                    {pantryData.map(location => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>Category</FormLabel>
                  <Select
                    value={editItem.category || ''}
                    onChange={(e) => setEditItem(prev => prev ? { ...prev, category: e.target.value } : null)}
                  >
                    <option value="vegetables">Vegetables</option>
                    <option value="dairy">Dairy</option>
                    <option value="meat">Meat</option>
                    <option value="grains">Grains</option>
                    <option value="legumes">Legumes</option>
                    <option value="oils">Oils</option>
                    <option value="canned">Canned Goods</option>
                    <option value="spices">Spices</option>
                    <option value="desserts">Desserts</option>
                    <option value="other">Other</option>
                  </Select>
                </FormControl>
              </VStack>
            )}
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onEditClose}>
              Cancel
            </Button>
            <Button 
              style={{ backgroundColor: brandColor, color: 'white' }}
              _hover={{ backgroundColor: '#2da89c' }}
              onClick={saveEditItem}
            >
              Save Changes
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  )
}