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
  Image,
  Badge,
  SimpleGrid,
  useColorModeValue,
  Switch,
  FormControl,
  FormLabel,
  Divider,
  Icon,
  Link
} from '@chakra-ui/react'
import { useState } from 'react'
import { ExternalLinkIcon, CheckIcon } from './icons/CustomIcons'
import { storeData, type Store } from '../data/storesData'

interface StoresPageProps {
  onBack: () => void
}

// Store data has been moved to ../data/storesData.ts for better organization
// This reduces component file size by ~180 lines

/*
const _deprecatedStoreData: Store[] = [
  {
    id: 'amazon-fresh',
    name: 'Amazon Fresh',
    description: 'Fast grocery delivery from Amazon with Prime benefits',
    type: 'delivery',
    logo: 'https://images.unsplash.com/photo-1523474253046-8cd2748b5fd2?w=100&h=100&fit=crop',
    website: 'https://www.amazon.com/fresh',
    features: ['Same-day delivery', 'Prime member discounts', 'Wide selection'],
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
    features: ['Organic products', 'Prime delivery', 'In-store pickup'],
    deliveryTime: '1-2 hours',
    minOrder: '$35',
    deliveryFee: 'Free with Prime',
    enabled: true
  },
  {
    id: 'instacart',
    name: 'Instacart',
    description: 'Shop from multiple local stores with personal shoppers',
    type: 'delivery',
    logo: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=100&h=100&fit=crop',
    website: 'https://www.instacart.com',
    features: ['Multiple stores', 'Personal shoppers', 'Real-time updates'],
    deliveryTime: '1-3 hours',
    minOrder: '$10',
    deliveryFee: '$3.99+',
    enabled: false
  },
  {
    id: 'shipt',
    name: 'Shipt',
    description: 'Target-owned delivery service with personal shoppers',
    type: 'delivery',
    logo: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=100&h=100&fit=crop',
    website: 'https://www.shipt.com',
    features: ['Target partnership', 'Personal shoppers', 'Membership benefits'],
    deliveryTime: '1-2 hours',
    minOrder: '$35',
    deliveryFee: 'Free with membership',
    enabled: false
  },
  {
    id: 'freshdirect',
    name: 'FreshDirect',
    description: 'Fresh groceries delivered from local farms and producers',
    type: 'delivery',
    logo: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100&h=100&fit=crop',
    website: 'https://www.freshdirect.com',
    features: ['Farm-fresh produce', 'Local sourcing', 'Prepared meals'],
    deliveryTime: 'Next day',
    minOrder: '$30',
    deliveryFee: '$5.99',
    enabled: false
  },
  {
    id: 'walmart-plus',
    name: 'Walmart+',
    description: 'Walmart grocery delivery and pickup with membership benefits',
    type: 'delivery',
    logo: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=100&h=100&fit=crop',
    website: 'https://www.walmart.com/plus',
    features: ['Low prices', 'Free delivery', 'Gas discounts'],
    deliveryTime: '2-4 hours',
    minOrder: '$35',
    deliveryFee: 'Free with membership',
    enabled: false
  },
  {
    id: 'peapod',
    name: 'Peapod',
    description: 'Stop & Shop and Giant grocery delivery service',
    type: 'delivery',
    logo: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=100&h=100&fit=crop',
    website: 'https://www.peapod.com',
    features: ['Scheduled delivery', 'Store brands', 'Recurring orders'],
    deliveryTime: 'Same/next day',
    minOrder: '$60',
    deliveryFee: '$9.95',
    enabled: false
  },
  {
    id: 'thrive-market',
    name: 'Thrive Market',
    description: 'Organic and healthy products with membership discounts',
    type: 'specialty',
    logo: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100&h=100&fit=crop',
    website: 'https://thrivemarket.com',
    features: ['Organic focus', 'Member prices', 'Sustainable products'],
    deliveryTime: '2-5 days',
    minOrder: '$49',
    deliveryFee: 'Free shipping',
    enabled: false
  },
  {
    id: 'hellofresh',
    name: 'HelloFresh',
    description: 'Meal kit delivery with pre-portioned ingredients',
    type: 'subscription',
    logo: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=100&h=100&fit=crop',
    website: 'https://www.hellofresh.com',
    features: ['Meal kits', 'Recipe cards', 'Flexible plans'],
    deliveryTime: 'Weekly',
    minOrder: '2 meals',
    deliveryFee: 'Included',
    enabled: false
  },
  {
    id: 'blue-apron',
    name: 'Blue Apron',
    description: 'Chef-designed meal kits with premium ingredients',
    type: 'subscription',
    logo: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=100&h=100&fit=crop',
    website: 'https://www.blueapron.com',
    features: ['Chef recipes', 'Wine pairings', 'Flexible delivery'],
    deliveryTime: 'Weekly',
    minOrder: '2 meals',
    deliveryFee: 'Included',
    enabled: false
  },
  {
    id: 'home-chef',
    name: 'Home Chef',
    description: 'Kroger-owned meal kit service with grocery integration',
    type: 'subscription',
    logo: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=100&h=100&fit=crop',
    website: 'https://www.homechef.com',
    features: ['Kroger integration', 'Oven-ready meals', 'Add-on items'],
    deliveryTime: 'Weekly',
    minOrder: '2 meals',
    deliveryFee: 'Included',
    enabled: false
  },
  {
    id: 'gopuff',
    name: 'Gopuff',
    description: 'On-demand delivery of everyday essentials and snacks',
    type: 'delivery',
    logo: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=100&h=100&fit=crop',
    website: 'https://gopuff.com',
    features: ['Fast delivery', 'Convenience items', 'No minimums'],
    deliveryTime: '15-30 minutes',
    minOrder: 'None',
    deliveryFee: '$1.95',
    enabled: false
  },
  {
    id: 'imperfect-foods',
    name: 'Imperfect Foods',
    description: 'Sustainable grocery delivery with imperfect produce',
    type: 'specialty',
    logo: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100&h=100&fit=crop',
    website: 'https://www.imperfectfoods.com',
    features: ['Sustainable', 'Reduced waste', 'Customizable boxes'],
    deliveryTime: 'Weekly',
    minOrder: '$60',
    deliveryFee: '$4.99',
    enabled: false
  },
  {
    id: 'misfits-market',
    name: 'Misfits Market',
    description: 'Organic produce and groceries at discounted prices',
    type: 'specialty',
    logo: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100&h=100&fit=crop',
    website: 'https://www.misfitsmarket.com',
    features: ['Discounted organic', 'Rescued produce', 'Flexible orders'],
    deliveryTime: 'Weekly',
    minOrder: '$30',
    deliveryFee: 'Free',
    enabled: false
  }
]
*/

export default function StoresPage({ onBack }: StoresPageProps) {
  const [stores, setStores] = useState<Store[]>(storeData) // Now imported from data file
  
  const bgColor = useColorModeValue('gray.50', 'gray.900')
  const cardBg = useColorModeValue('white', 'gray.800')
  const mutedColor = useColorModeValue('gray.600', 'gray.400')

  const toggleStore = (storeId: string) => {
    setStores(prev => prev.map(store => 
      store.id === storeId 
        ? { ...store, enabled: !store.enabled }
        : store
    ))
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'delivery': return 'blue'
      case 'pickup': return 'green'
      case 'subscription': return 'purple'
      case 'specialty': return 'orange'
      default: return 'gray'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'delivery': return 'Delivery'
      case 'pickup': return 'Pickup'
      case 'subscription': return 'Meal Kits'
      case 'specialty': return 'Specialty'
      default: return type
    }
  }

  const enabledStores = stores.filter(store => store.enabled)
  const deliveryStores = stores.filter(store => store.type === 'delivery')
  const subscriptionStores = stores.filter(store => store.type === 'subscription')
  const specialtyStores = stores.filter(store => store.type === 'specialty')

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
                <Heading size="xl">Grocery Stores & Delivery</Heading>
                <Text color={mutedColor} fontSize="lg">
                  Connect your favorite grocery services • {enabledStores.length} enabled
                </Text>
              </VStack>
            </HStack>
          </VStack>

          {/* Enabled Stores Summary */}
          {enabledStores.length > 0 && (
            <Card bg={cardBg} w="full">
              <CardBody>
                <VStack spacing={4} align="start">
                  <Heading size="md">Active Services</Heading>
                  <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4} w="full">
                    {enabledStores.map((store) => (
                      <HStack key={store.id} spacing={3}>
                        <Image
                          src={store.logo}
                          alt={store.name}
                          w="8"
                          h="8"
                          borderRadius="md"
                          objectFit="cover"
                        />
                        <VStack align="start" spacing={0}>
                          <Text fontWeight="medium" fontSize="sm">{store.name}</Text>
                          <Badge size="xs" colorScheme={getTypeColor(store.type)}>
                            {getTypeLabel(store.type)}
                          </Badge>
                        </VStack>
                        <CheckIcon color="green.500" boxSize={4} />
                      </HStack>
                    ))}
                  </SimpleGrid>
                </VStack>
              </CardBody>
            </Card>
          )}

          {/* Delivery Services */}
          <Box w="full">
            <Heading size="lg" mb={6}>Grocery Delivery Services</Heading>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
              {deliveryStores.map((store) => (
                <Card key={store.id} bg={cardBg}>
                  <CardBody>
                    <VStack spacing={4} align="start">
                      <HStack justify="space-between" w="full">
                        <HStack spacing={3}>
                          <Image
                            src={store.logo}
                            alt={store.name}
                            w="12"
                            h="12"
                            borderRadius="lg"
                            objectFit="cover"
                          />
                          <VStack align="start" spacing={1}>
                            <Heading size="sm">{store.name}</Heading>
                            <Badge colorScheme={getTypeColor(store.type)} size="sm">
                              {getTypeLabel(store.type)}
                            </Badge>
                          </VStack>
                        </HStack>
                        <FormControl display="flex" alignItems="center" w="auto">
                          <Switch
                            isChecked={store.enabled}
                            onChange={() => toggleStore(store.id)}
                            colorScheme="green"
                          />
                        </FormControl>
                      </HStack>

                      <Text fontSize="sm" color={mutedColor}>
                        {store.description}
                      </Text>

                      <VStack spacing={2} align="start" w="full">
                        <HStack spacing={4} wrap="wrap">
                          <Text fontSize="xs" color={mutedColor}>
                            <strong>Delivery:</strong> {store.deliveryTime}
                          </Text>
                          <Text fontSize="xs" color={mutedColor}>
                            <strong>Min Order:</strong> {store.minOrder}
                          </Text>
                          <Text fontSize="xs" color={mutedColor}>
                            <strong>Fee:</strong> {store.deliveryFee}
                          </Text>
                        </HStack>
                        
                        <HStack spacing={2} wrap="wrap">
                          {store.features.map((feature, index) => (
                            <Badge key={index} size="xs" variant="outline">
                              {feature}
                            </Badge>
                          ))}
                        </HStack>
                      </VStack>

                      <HStack spacing={2} w="full">
                        <Link href={store.website} isExternal>
                          <Button size="sm" variant="outline" rightIcon={<ExternalLinkIcon />}>
                            Visit Site
                          </Button>
                        </Link>
                      </HStack>
                    </VStack>
                  </CardBody>
                </Card>
              ))}
            </SimpleGrid>
          </Box>

          <Divider />

          {/* Meal Kit Services */}
          <Box w="full">
            <Heading size="lg" mb={6}>Meal Kit Services</Heading>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
              {subscriptionStores.map((store) => (
                <Card key={store.id} bg={cardBg} size="sm">
                  <CardBody>
                    <VStack spacing={3} align="start">
                      <HStack justify="space-between" w="full">
                        <HStack spacing={2}>
                          <Image
                            src={store.logo}
                            alt={store.name}
                            w="8"
                            h="8"
                            borderRadius="md"
                            objectFit="cover"
                          />
                          <VStack align="start" spacing={0}>
                            <Text fontWeight="medium" fontSize="sm">{store.name}</Text>
                            <Badge colorScheme={getTypeColor(store.type)} size="xs">
                              {getTypeLabel(store.type)}
                            </Badge>
                          </VStack>
                        </HStack>
                        <Switch
                          size="sm"
                          isChecked={store.enabled}
                          onChange={() => toggleStore(store.id)}
                          colorScheme="green"
                        />
                      </HStack>

                      <Text fontSize="xs" color={mutedColor} noOfLines={2}>
                        {store.description}
                      </Text>

                      <Link href={store.website} isExternal>
                        <Button size="xs" variant="outline" rightIcon={<ExternalLinkIcon />}>
                          Learn More
                        </Button>
                      </Link>
                    </VStack>
                  </CardBody>
                </Card>
              ))}
            </SimpleGrid>
          </Box>

          <Divider />

          {/* Specialty Services */}
          <Box w="full">
            <Heading size="lg" mb={6}>Specialty & Sustainable</Heading>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
              {specialtyStores.map((store) => (
                <Card key={store.id} bg={cardBg} size="sm">
                  <CardBody>
                    <VStack spacing={3} align="start">
                      <HStack justify="space-between" w="full">
                        <HStack spacing={2}>
                          <Image
                            src={store.logo}
                            alt={store.name}
                            w="8"
                            h="8"
                            borderRadius="md"
                            objectFit="cover"
                          />
                          <VStack align="start" spacing={0}>
                            <Text fontWeight="medium" fontSize="sm">{store.name}</Text>
                            <Badge colorScheme={getTypeColor(store.type)} size="xs">
                              {getTypeLabel(store.type)}
                            </Badge>
                          </VStack>
                        </HStack>
                        <Switch
                          size="sm"
                          isChecked={store.enabled}
                          onChange={() => toggleStore(store.id)}
                          colorScheme="green"
                        />
                      </HStack>

                      <Text fontSize="xs" color={mutedColor} noOfLines={2}>
                        {store.description}
                      </Text>

                      <Link href={store.website} isExternal>
                        <Button size="xs" variant="outline" rightIcon={<ExternalLinkIcon />}>
                          Learn More
                        </Button>
                      </Link>
                    </VStack>
                  </CardBody>
                </Card>
              ))}
            </SimpleGrid>
          </Box>
        </VStack>
      </Container>
    </Box>
  )
}