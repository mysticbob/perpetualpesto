import {
  Box,
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  VStack,
  HStack,
  Text,
  Image,
  Badge,
  Divider,
  Alert,
  AlertIcon,
  AlertDescription,
  SimpleGrid,
  Card,
  CardBody,
  Spinner,
  Select,
  IconButton,
  useToast,
  useColorModeValue,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Checkbox,
  Collapse,
  useDisclosure as useCollapseDisclosure
} from '@chakra-ui/react'
import { useState, useEffect } from 'react'
import { DeleteIcon, ExternalLinkIcon } from '../icons/CustomIcons'
import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons'
import axios from 'axios'
import { GroceryItem } from '../../contexts/GroceryContext'

interface InstacartCartReviewProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  groceryItems: GroceryItem[]
  onCartSubmitted?: (orderId: string) => void
}

interface ProductMatch {
  groceryItem: GroceryItem
  matchedProduct?: {
    id: string
    name: string
    brand?: string
    size?: string
    price: number
    imageUrl?: string
    available: boolean
  }
  confidence: number
  alternatives: Array<{
    id: string
    name: string
    brand?: string
    size?: string
    price: number
    imageUrl?: string
    available: boolean
  }>
  requiresUserConfirmation: boolean
}

interface CartSummary {
  subtotal: number
  deliveryFee: number
  serviceFee: number
  tax: number
  total: number
  itemCount: number
}

export default function InstacartCartReview({
  isOpen,
  onClose,
  userId,
  groceryItems,
  onCartSubmitted
}: InstacartCartReviewProps) {
  const [productMatches, setProductMatches] = useState<ProductMatch[]>([])
  const [selectedProducts, setSelectedProducts] = useState<Record<string, string>>({})
  const [cartSummary, setCartSummary] = useState<CartSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [cartId, setCartId] = useState<string | null>(null)
  const [excludedItems, setExcludedItems] = useState<Set<string>>(new Set())
  const { isOpen: detailsOpen, onToggle: toggleDetails } = useCollapseDisclosure()
  
  const toast = useToast()
  const bgColor = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.700')
  const mutedColor = useColorModeValue('gray.600', 'gray.400')
  const brandColor = '#38BDAF'
  const successColor = '#008060'
  const warningColor = '#ffc107'

  useEffect(() => {
    if (isOpen && groceryItems.length > 0) {
      matchProducts()
    }
  }, [isOpen, groceryItems])

  const matchProducts = async () => {
    try {
      setLoading(true)
      const response = await axios.post('/api/instacart/products/match', {
        items: groceryItems
      })
      
      setProductMatches(response.data.matches)
      
      // Initialize selected products with best matches
      const selections: Record<string, string> = {}
      response.data.matches.forEach((match: ProductMatch) => {
        if (match.matchedProduct) {
          selections[match.groceryItem.id] = match.matchedProduct.id
        }
      })
      setSelectedProducts(selections)
      
      // Calculate initial cart summary
      calculateCartSummary(response.data.matches, selections)
    } catch (error) {
      console.error('Error matching products:', error)
      toast({
        title: 'Matching Error',
        description: 'Failed to match products. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } finally {
      setLoading(false)
    }
  }

  const calculateCartSummary = (matches: ProductMatch[], selections: Record<string, string>) => {
    let subtotal = 0
    let itemCount = 0
    
    matches.forEach(match => {
      if (excludedItems.has(match.groceryItem.id)) return
      
      const selectedId = selections[match.groceryItem.id]
      if (selectedId) {
        const product = match.matchedProduct?.id === selectedId 
          ? match.matchedProduct 
          : match.alternatives.find(alt => alt.id === selectedId)
        
        if (product) {
          const quantity = parseFloat(match.groceryItem.amount || '1')
          subtotal += product.price * quantity
          itemCount++
        }
      }
    })
    
    const deliveryFee = subtotal > 3500 ? 0 : 399
    const serviceFee = Math.round(subtotal * 0.05)
    const tax = Math.round(subtotal * 0.0875)
    const total = subtotal + deliveryFee + serviceFee + tax
    
    setCartSummary({
      subtotal,
      deliveryFee,
      serviceFee,
      tax,
      total,
      itemCount
    })
  }

  const handleProductSelection = (groceryItemId: string, productId: string) => {
    const newSelections = { ...selectedProducts, [groceryItemId]: productId }
    setSelectedProducts(newSelections)
    calculateCartSummary(productMatches, newSelections)
  }

  const toggleItemExclusion = (groceryItemId: string) => {
    const newExcluded = new Set(excludedItems)
    if (newExcluded.has(groceryItemId)) {
      newExcluded.delete(groceryItemId)
    } else {
      newExcluded.add(groceryItemId)
    }
    setExcludedItems(newExcluded)
    calculateCartSummary(productMatches, selectedProducts)
  }

  const createAndSubmitCart = async () => {
    try {
      setSubmitting(true)
      
      // Filter out excluded items
      const itemsToSubmit = groceryItems.filter(item => !excludedItems.has(item.id))
      
      // Create cart
      const cartResponse = await axios.post('/api/instacart/cart/create', {
        userId,
        items: itemsToSubmit
      })
      
      const newCartId = cartResponse.data.cart.id
      setCartId(newCartId)
      
      // Submit cart for checkout
      const submitResponse = await axios.post(`/api/instacart/cart/${newCartId}/submit`)
      
      if (submitResponse.data.checkoutUrl) {
        // Open Instacart checkout in new tab
        window.open(submitResponse.data.checkoutUrl, '_blank')
        
        toast({
          title: 'Cart Created!',
          description: 'Your Instacart cart has been created. Complete your order in the new tab.',
          status: 'success',
          duration: 5000,
          isClosable: true,
        })
        
        onCartSubmitted?.(submitResponse.data.orderId)
        onClose()
      }
    } catch (error: any) {
      console.error('Error submitting cart:', error)
      
      if (error.response?.status === 401) {
        toast({
          title: 'Not Connected',
          description: 'Please connect your Instacart account first.',
          status: 'warning',
          duration: 5000,
          isClosable: true,
        })
      } else {
        toast({
          title: 'Submission Error',
          description: 'Failed to create cart. Please try again.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl">
      <ModalOverlay />
      <ModalContent maxW="1200px">
        <ModalHeader>
          <HStack spacing={3}>
            <Image
              src="https://www.instacart.com/assets/beetstrap/brand/2022/carrot-logo.svg"
              alt="Instacart"
              h="24px"
            />
            <Text>Review Your Instacart Cart</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        
        <ModalBody>
          {loading ? (
            <VStack spacing={4} py={8}>
              <Spinner size="xl" color={brandColor} />
              <Text>Matching products...</Text>
            </VStack>
          ) : (
            <HStack spacing={6} align="start">
              {/* Product List */}
              <VStack spacing={4} flex={1} align="stretch">
                <Alert status="info" borderRadius="md">
                  <AlertIcon />
                  <AlertDescription fontSize="sm">
                    Review and confirm product matches. You can select alternatives if needed.
                  </AlertDescription>
                </Alert>
                
                {productMatches.map((match) => {
                  const isExcluded = excludedItems.has(match.groceryItem.id)
                  const selectedId = selectedProducts[match.groceryItem.id]
                  const selectedProduct = match.matchedProduct?.id === selectedId
                    ? match.matchedProduct
                    : match.alternatives.find(alt => alt.id === selectedId)
                  
                  return (
                    <Card
                      key={match.groceryItem.id}
                      variant="outline"
                      opacity={isExcluded ? 0.5 : 1}
                    >
                      <CardBody>
                        <HStack spacing={4} align="start">
                          <Checkbox
                            isChecked={!isExcluded}
                            onChange={() => toggleItemExclusion(match.groceryItem.id)}
                          />
                          
                          {selectedProduct?.imageUrl && (
                            <Image
                              src={selectedProduct.imageUrl}
                              alt={selectedProduct.name}
                              boxSize="60px"
                              objectFit="cover"
                              borderRadius="md"
                            />
                          )}
                          
                          <VStack align="start" spacing={2} flex={1}>
                            <HStack>
                              <Text fontWeight="bold">{match.groceryItem.name}</Text>
                              {match.groceryItem.amount && (
                                <Badge colorScheme="gray">{match.groceryItem.amount}</Badge>
                              )}
                            </HStack>
                            
                            {match.confidence < 0.8 && (
                              <Badge colorScheme="yellow" size="sm">
                                Low confidence match
                              </Badge>
                            )}
                            
                            {selectedProduct ? (
                              <HStack spacing={2}>
                                <Text fontSize="sm">{selectedProduct.name}</Text>
                                {selectedProduct.brand && (
                                  <Text fontSize="sm" color={mutedColor}>
                                    {selectedProduct.brand}
                                  </Text>
                                )}
                                {selectedProduct.size && (
                                  <Badge size="sm">{selectedProduct.size}</Badge>
                                )}
                                <Text fontSize="sm" fontWeight="bold" color={brandColor}>
                                  {formatPrice(selectedProduct.price)}
                                </Text>
                              </HStack>
                            ) : (
                              <Text fontSize="sm" color="red.500">No match found</Text>
                            )}
                            
                            {match.alternatives.length > 0 && (
                              <Select
                                size="sm"
                                value={selectedId}
                                onChange={(e) => handleProductSelection(match.groceryItem.id, e.target.value)}
                                isDisabled={isExcluded}
                              >
                                {match.matchedProduct && (
                                  <option value={match.matchedProduct.id}>
                                    {match.matchedProduct.name} - {formatPrice(match.matchedProduct.price)}
                                  </option>
                                )}
                                {match.alternatives.map(alt => (
                                  <option key={alt.id} value={alt.id}>
                                    {alt.name} - {formatPrice(alt.price)}
                                  </option>
                                ))}
                              </Select>
                            )}
                          </VStack>
                        </HStack>
                      </CardBody>
                    </Card>
                  )
                })}
              </VStack>
              
              {/* Cart Summary */}
              <Box w="350px">
                <Card bg={bgColor} position="sticky" top={0}>
                  <CardBody>
                    <VStack spacing={4} align="stretch">
                      <Text fontSize="lg" fontWeight="bold">Order Summary</Text>
                      
                      <Divider />
                      
                      {cartSummary && (
                        <>
                          <VStack spacing={2} align="stretch">
                            <HStack justify="space-between">
                              <Text>Items ({cartSummary.itemCount})</Text>
                              <Text fontWeight="bold">{formatPrice(cartSummary.subtotal)}</Text>
                            </HStack>
                            
                            <Button
                              size="sm"
                              variant="ghost"
                              rightIcon={detailsOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
                              onClick={toggleDetails}
                            >
                              {detailsOpen ? 'Hide' : 'Show'} fees & taxes
                            </Button>
                            
                            <Collapse in={detailsOpen}>
                              <VStack spacing={2} align="stretch" pt={2}>
                                <HStack justify="space-between">
                                  <Text fontSize="sm" color={mutedColor}>Delivery fee</Text>
                                  <Text fontSize="sm">
                                    {cartSummary.deliveryFee === 0 ? 'FREE' : formatPrice(cartSummary.deliveryFee)}
                                  </Text>
                                </HStack>
                                <HStack justify="space-between">
                                  <Text fontSize="sm" color={mutedColor}>Service fee</Text>
                                  <Text fontSize="sm">{formatPrice(cartSummary.serviceFee)}</Text>
                                </HStack>
                                <HStack justify="space-between">
                                  <Text fontSize="sm" color={mutedColor}>Est. tax</Text>
                                  <Text fontSize="sm">{formatPrice(cartSummary.tax)}</Text>
                                </HStack>
                              </VStack>
                            </Collapse>
                          </VStack>
                          
                          <Divider />
                          
                          <HStack justify="space-between">
                            <Text fontSize="lg" fontWeight="bold">Total</Text>
                            <Text fontSize="xl" fontWeight="bold" color={brandColor}>
                              {formatPrice(cartSummary.total)}
                            </Text>
                          </HStack>
                          
                          {cartSummary.subtotal < 3500 && (
                            <Alert status="info" size="sm">
                              <AlertIcon />
                              <Text fontSize="xs">
                                Add ${formatPrice(3500 - cartSummary.subtotal)} more for free delivery
                              </Text>
                            </Alert>
                          )}
                        </>
                      )}
                      
                      <Button
                        size="lg"
                        style={{ backgroundColor: brandColor, color: 'white' }}
                        _hover={{ backgroundColor: '#2da89c' }}
                        onClick={createAndSubmitCart}
                        isLoading={submitting}
                        loadingText="Creating cart..."
                        isDisabled={!cartSummary || cartSummary.itemCount === 0}
                        rightIcon={<ExternalLinkIcon />}
                      >
                        Continue to Instacart
                      </Button>
                      
                      <Text fontSize="xs" color={mutedColor} textAlign="center">
                        You'll complete your order on Instacart's website
                      </Text>
                    </VStack>
                  </CardBody>
                </Card>
              </Box>
            </HStack>
          )}
        </ModalBody>
        
        <ModalFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}