import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  VStack,
  HStack,
  Text,
  Radio,
  RadioGroup,
  List,
  ListItem,
  Badge,
  Box,
  Divider,
  useColorModeValue,
  SimpleGrid,
  Image,
  useToast
} from '@chakra-ui/react'
import { useState } from 'react'
import { CheckIcon, ExternalLinkIcon } from '@chakra-ui/icons'
import { usePantry } from '../contexts/PantryContext'
import { usePreferences } from '../contexts/PreferencesContext'
import { formatIngredientAmount } from '../utils/units'

interface Recipe {
  id: string
  name: string
  ingredients: Array<{
    id: string
    name: string
    amount?: string
    unit?: string
  }>
}

interface Store {
  id: string
  name: string
  logo: string
  website: string
  enabled: boolean
}

interface GroceryOptionsDialogProps {
  isOpen: boolean
  onClose: () => void
  recipe: Recipe
  onCreateGroceryList: (option: 'exclude-pantry' | 'include-all' | 'replace-pantry' | 'add-to-cart') => void
}

export default function GroceryOptionsDialog({
  isOpen,
  onClose,
  recipe,
  onCreateGroceryList
}: GroceryOptionsDialogProps) {
  const [selectedOption, setSelectedOption] = useState<'exclude-pantry' | 'include-all' | 'replace-pantry' | 'add-to-cart'>('exclude-pantry')
  const { getItemAvailability } = usePantry()
  const { preferences } = usePreferences()
  const toast = useToast()
  
  const cardBg = useColorModeValue('gray.50', 'gray.700')
  const mutedColor = useColorModeValue('gray.600', 'gray.400')

  // Mock enabled stores - in a real app, this would come from user settings
  const enabledStores: Store[] = [
    {
      id: 'amazon-fresh',
      name: 'Amazon Fresh',
      logo: 'https://images.unsplash.com/photo-1523474253046-8cd2748b5fd2?w=100&h=100&fit=crop',
      website: 'https://www.amazon.com/fresh',
      enabled: true
    },
    {
      id: 'whole-foods',
      name: 'Whole Foods',
      logo: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100&h=100&fit=crop',
      website: 'https://www.wholefoodsmarket.com',
      enabled: true
    }
  ]

  // Analyze recipe ingredients
  const ingredientAnalysis = recipe.ingredients.map(ingredient => {
    const availability = getItemAvailability(ingredient.name, ingredient.amount, ingredient.unit)
    return {
      ...ingredient,
      inPantry: availability.available,
      pantryLocation: availability.location,
      pantryAmount: availability.currentAmount
    }
  })

  const pantryItems = ingredientAnalysis.filter(item => item.inPantry)
  const missingItems = ingredientAnalysis.filter(item => !item.inPantry)

  const handleCreateList = () => {
    onCreateGroceryList(selectedOption)
    onClose()
  }

  const handleAddToCart = (store: Store) => {
    // In a real app, this would integrate with the store's API
    toast({
      title: `Added to ${store.name}`,
      description: `${missingItems.length} ingredients added to your cart`,
      status: 'success',
      duration: 3000,
    })
    
    // Open the store's website in a new tab
    window.open(store.website, '_blank')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Create Grocery List</ModalHeader>
        <ModalCloseButton />
        
        <ModalBody>
          <VStack spacing={6} align="start">
            <Text>
              I found <strong>{pantryItems.length}</strong> ingredients you already have and{' '}
              <strong>{missingItems.length}</strong> you need to buy for "{recipe.name}".
            </Text>

            {/* Pantry Items Summary */}
            {pantryItems.length > 0 && (
              <Box w="full">
                <Text fontWeight="medium" mb={3} color="green.600">
                  ✅ You have these ingredients:
                </Text>
                <Box bg={cardBg} p={4} borderRadius="md" maxH="150px" overflowY="auto">
                  <List spacing={2}>
                    {pantryItems.map((item) => (
                      <ListItem key={item.id}>
                        <HStack justify="space-between">
                          <Text fontSize="sm">
                            {formatIngredientAmount(item.amount, item.unit, preferences.unitSystem)} {item.name}
                          </Text>
                          <Badge size="sm" colorScheme="blue">
                            {item.pantryLocation}
                          </Badge>
                        </HStack>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              </Box>
            )}

            {/* Missing Items Summary */}
            {missingItems.length > 0 && (
              <Box w="full">
                <Text fontWeight="medium" mb={3} color="orange.600">
                  🛒 You need to buy:
                </Text>
                <Box bg={cardBg} p={4} borderRadius="md" maxH="150px" overflowY="auto">
                  <List spacing={2}>
                    {missingItems.map((item) => (
                      <ListItem key={item.id}>
                        <Text fontSize="sm">
                          {formatIngredientAmount(item.amount, item.unit, preferences.unitSystem)} {item.name}
                        </Text>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              </Box>
            )}

            <Divider />

            {/* Options */}
            <Box w="full">
              <Text fontWeight="medium" mb={4}>
                How would you like to create your grocery list?
              </Text>
              
              <RadioGroup value={selectedOption} onChange={(value) => setSelectedOption(value as any)}>
                <VStack spacing={4} align="start">
                  <Radio value="exclude-pantry">
                    <VStack align="start" spacing={1} ml={2}>
                      <Text fontWeight="medium">Smart List (Recommended)</Text>
                      <Text fontSize="sm" color={mutedColor}>
                        Only add items you don't have. Use what's in your pantry.
                      </Text>
                      <Text fontSize="xs" color="green.600">
                        → {missingItems.length} items to buy
                      </Text>
                    </VStack>
                  </Radio>

                  <Radio value="include-all">
                    <VStack align="start" spacing={1} ml={2}>
                      <Text fontWeight="medium">Complete List</Text>
                      <Text fontSize="sm" color={mutedColor}>
                        Add all recipe ingredients, even ones you have.
                      </Text>
                      <Text fontSize="xs" color="blue.600">
                        → {recipe.ingredients.length} items total
                      </Text>
                    </VStack>
                  </Radio>

                  {pantryItems.length > 0 && (
                    <Radio value="replace-pantry">
                      <VStack align="start" spacing={1} ml={2}>
                        <Text fontWeight="medium">Fresh Ingredients</Text>
                        <Text fontSize="sm" color={mutedColor}>
                          Buy fresh versions of everything, don't use pantry items.
                        </Text>
                        <Text fontSize="xs" color="orange.600">
                          → {recipe.ingredients.length} items to buy (replace pantry items)
                        </Text>
                      </VStack>
                    </Radio>
                  )}

                  <Radio value="add-to-cart">
                    <VStack align="start" spacing={1} ml={2}>
                      <Text fontWeight="medium">Add to Store Cart</Text>
                      <Text fontSize="sm" color={mutedColor}>
                        Add ingredients directly to your preferred grocery service.
                      </Text>
                      <Text fontSize="xs" color="purple.600">
                        → Quick checkout with delivery/pickup
                      </Text>
                    </VStack>
                  </Radio>
                </VStack>
              </RadioGroup>

              {selectedOption === 'add-to-cart' && (
                <Box mt={4} p={4} bg="purple.50" borderRadius="md" _dark={{ bg: 'purple.900' }}>
                  <VStack spacing={3} align="start">
                    <Text fontWeight="medium" fontSize="sm">Choose your store:</Text>
                    <SimpleGrid columns={2} spacing={3} w="full">
                      {enabledStores.map((store) => (
                        <Button
                          key={store.id}
                          size="sm"
                          variant="outline"
                          leftIcon={
                            <Image
                              src={store.logo}
                              alt={store.name}
                              w="4"
                              h="4"
                              borderRadius="sm"
                            />
                          }
                          onClick={() => handleAddToCart(store)}
                        >
                          {store.name}
                        </Button>
                      ))}
                    </SimpleGrid>
                    {enabledStores.length === 0 && (
                      <Text fontSize="sm" color={mutedColor}>
                        No stores enabled. Visit the Stores page to connect your grocery services.
                      </Text>
                    )}
                  </VStack>
                </Box>
              )}
            </Box>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          {selectedOption === 'add-to-cart' ? (
            <Text fontSize="sm" color={mutedColor}>
              Select a store above to add items to cart
            </Text>
          ) : (
            <Button colorScheme="blue" onClick={handleCreateList}>
              Create Grocery List
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}