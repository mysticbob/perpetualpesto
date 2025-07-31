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
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Editable,
  EditableInput,
  EditablePreview,
  useEditableControls,
  ButtonGroup
} from '@chakra-ui/react'
import { useState } from 'react'
import { AddIcon, EditIcon, DeleteIcon, CheckIcon, CloseIcon } from '@chakra-ui/icons'
import { usePreferences } from '../contexts/PreferencesContext'
import { usePantry, PantryItem } from '../contexts/PantryContext'
import { formatIngredientAmount } from '../utils/units'

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
  const { pantryData, setPantryData } = usePantry()
  const [newItem, setNewItem] = useState<Partial<PantryItem>>({})
  const { isOpen, onOpen, onClose } = useDisclosure()
  const { preferences } = usePreferences()
  
  const bgColor = useColorModeValue('gray.50', 'gray.900')
  const cardBg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.700')
  const mutedColor = useColorModeValue('gray.600', 'gray.400')

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
    setPantryData((prev: any) => prev.map((location: any) => 
      location.id === locationId 
        ? { ...location, name: newName }
        : location
    ))
  }

  const addNewItem = () => {
    if (!newItem.name || !newItem.amount || !newItem.unit || !newItem.location) return

    const item: PantryItem = {
      id: Date.now().toString(),
      name: newItem.name,
      amount: newItem.amount,
      unit: newItem.unit,
      location: newItem.location,
      category: newItem.category || 'other'
    }

    setPantryData((prev: any) => prev.map((location: any) => 
      location.id === newItem.location
        ? { ...location, items: [...location.items, item] }
        : location
    ))

    setNewItem({})
    onClose()
  }

  const removeItem = (itemId: string, locationId: string) => {
    setPantryData((prev: any) => prev.map((location: any) => 
      location.id === locationId
        ? { ...location, items: location.items.filter((item: any) => item.id !== itemId) }
        : location
    ))
  }

  const updateItemAmount = (itemId: string, locationId: string, newAmount: string) => {
    setPantryData((prev: any) => prev.map((location: any) => 
      location.id === locationId
        ? { 
            ...location, 
            items: location.items.map((item: any) => 
              item.id === itemId ? { ...item, amount: newAmount } : item
            )
          }
        : location
    ))
  }

  const getTotalItemCount = () => {
    return pantryData.reduce((total, location) => total + location.items.length, 0)
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
            <HStack justify="space-between" w="full">
              <VStack align="start" spacing={2}>
                <Heading size="xl">My Pantry</Heading>
                <Text color={mutedColor} fontSize="lg">
                  Track what you have at home • {getTotalItemCount()} items total
                </Text>
              </VStack>
              <Button colorScheme="blue" leftIcon={<AddIcon />} onClick={onOpen}>
                Add Item
              </Button>
            </HStack>
          </VStack>

          {/* Pantry Locations */}
          <Accordion allowMultiple defaultIndex={[0, 1, 2, 3]} w="full">
            {pantryData.map((location) => (
              <AccordionItem key={location.id} border="none" mb={4}>
                <Card bg={cardBg}>
                  <CardHeader>
                    <HStack justify="space-between" w="full">
                      <HStack spacing={4}>
                        <Editable
                          value={location.name}
                          onSubmit={(value) => updateLocationName(location.id, value)}
                          fontSize="lg"
                          fontWeight="bold"
                        >
                          <HStack>
                            <EditablePreview />
                            <EditableInput />
                            <EditableControls />
                          </HStack>
                        </Editable>
                        <Badge colorScheme="gray" size="sm">
                          {location.items.length} items
                        </Badge>
                      </HStack>
                      <AccordionButton p={2} w="auto">
                        <AccordionIcon />
                      </AccordionButton>
                    </HStack>
                  </CardHeader>
                  
                  <AccordionPanel p={0}>
                    <CardBody pt={0}>
                      {location.items.length === 0 ? (
                        <Text color={mutedColor} textAlign="center" py={8}>
                          No items in {location.name.toLowerCase()}
                        </Text>
                      ) : (
                        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                          {location.items.map((item) => (
                            <Card key={item.id} size="sm" variant="outline">
                              <CardBody>
                                <VStack align="start" spacing={3}>
                                  <HStack justify="space-between" w="full">
                                    <VStack align="start" spacing={1} flex={1}>
                                      <Text fontWeight="medium" fontSize="sm">
                                        {item.name}
                                      </Text>
                                      <Editable
                                        value={item.amount}
                                        onSubmit={(value) => updateItemAmount(item.id, location.id, value)}
                                      >
                                        <HStack spacing={2}>
                                          <Text fontSize="sm" color="blue.500" fontWeight="bold">
                                            <EditablePreview />
                                            <EditableInput w="60px" />
                                          </Text>
                                          <Text fontSize="sm" color="blue.500" fontWeight="bold">
                                            {formatIngredientAmount(item.amount, item.unit, preferences.unitSystem)}
                                          </Text>
                                          <EditableControls />
                                        </HStack>
                                      </Editable>
                                    </VStack>
                                    <IconButton
                                      aria-label="Remove item"
                                      icon={<DeleteIcon />}
                                      size="xs"
                                      variant="ghost"
                                      colorScheme="red"
                                      onClick={() => removeItem(item.id, location.id)}
                                    />
                                  </HStack>
                                  
                                  {item.category && (
                                    <Badge 
                                      colorScheme={categoryColors[item.category] || 'gray'} 
                                      size="sm"
                                    >
                                      {item.category}
                                    </Badge>
                                  )}
                                </VStack>
                              </CardBody>
                            </Card>
                          ))}
                        </SimpleGrid>
                      )}
                    </CardBody>
                  </AccordionPanel>
                </Card>
              </AccordionItem>
            ))}
          </Accordion>
        </VStack>
      </Container>

      {/* Add Item Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
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
                  </Select>
                </FormControl>
              </HStack>

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
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={addNewItem}>
              Add Item
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  )
}