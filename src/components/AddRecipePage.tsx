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
  Icon,
  useColorModeValue,
  Divider
} from '@chakra-ui/react'
import { ExternalLinkIcon, LinkIcon, EditIcon, DownloadIcon } from '@chakra-ui/icons'
import RecipeExtractor from './RecipeExtractor'

interface AddRecipePageProps {
  onBack: () => void
}

const recipePartners = [
  {
    name: 'AllRecipes',
    description: 'Millions of recipes from home cooks',
    url: 'https://www.allrecipes.com',
    logo: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=100&h=100&fit=crop',
    category: 'Community'
  },
  {
    name: 'Food Network',
    description: 'Chef-tested recipes and cooking tips',
    url: 'https://www.foodnetwork.com/recipes',
    logo: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=100&h=100&fit=crop',
    category: 'Professional'
  },
  {
    name: 'Bon Appétit',
    description: 'Modern recipes for food lovers',
    url: 'https://www.bonappetit.com/recipes',
    logo: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=100&h=100&fit=crop',
    category: 'Magazine'
  },
  {
    name: 'Serious Eats',
    description: 'Science-based cooking techniques',
    url: 'https://www.seriouseats.com/recipes',
    logo: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=100&h=100&fit=crop',
    category: 'Educational'
  },
  {
    name: 'NYT Cooking',
    description: 'Curated recipes from food writers',
    url: 'https://cooking.nytimes.com',
    logo: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=100&h=100&fit=crop',
    category: 'Premium'
  },
  {
    name: 'EatingWell',
    description: 'Healthy recipes and nutrition tips',
    url: 'https://www.eatingwell.com/recipes',
    logo: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=100&h=100&fit=crop',
    category: 'Health'
  }
]

const importMethods = [
  {
    title: 'Import from URL',
    description: 'Extract recipes from any recipe website',
    icon: LinkIcon,
    action: 'extract',
    color: 'blue'
  },
  {
    title: 'Manual Entry',
    description: 'Create recipes from scratch',
    icon: EditIcon,
    action: 'manual',
    color: 'green'
  },
  {
    title: 'Import File',
    description: 'Upload recipe files (JSON, PDF, etc.)',
    icon: DownloadIcon,
    action: 'file',
    color: 'purple'
  }
]

export default function AddRecipePage({ onBack }: AddRecipePageProps) {
  const bgColor = useColorModeValue('gray.50', 'gray.900')
  const cardBg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.700')
  const mutedColor = useColorModeValue('gray.600', 'gray.400')

  return (
    <Box minH="100vh" bg={bgColor}>
      <Container maxW="6xl" py={8}>
        <VStack spacing={8} align="start">
          {/* Header */}
          <VStack spacing={4} align="start" w="full">
            <Button variant="ghost" onClick={onBack} size="sm">
              ← Back to Recipes
            </Button>
            <Heading size="xl">Add New Recipe</Heading>
            <Text color={mutedColor} fontSize="lg">
              Import recipes from your favorite sites or create them from scratch
            </Text>
          </VStack>

          {/* Import Methods */}
          <Box w="full">
            <Heading size="lg" mb={6}>Import Methods</Heading>
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
              {importMethods.map((method) => (
                <Card key={method.action} bg={cardBg} cursor="pointer" _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }} transition="all 0.2s">
                  <CardBody>
                    <VStack spacing={4} align="center" textAlign="center">
                      <Box
                        w="16"
                        h="16"
                        bg={`${method.color}.100`}
                        borderRadius="full"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        _dark={{ bg: `${method.color}.900` }}
                      >
                        <Icon as={method.icon} boxSize={8} color={`${method.color}.500`} />
                      </Box>
                      <VStack spacing={2}>
                        <Heading size="md">{method.title}</Heading>
                        <Text color={mutedColor} fontSize="sm">
                          {method.description}
                        </Text>
                      </VStack>
                      <Button colorScheme={method.color} size="sm" w="full">
                        Get Started
                      </Button>
                    </VStack>
                  </CardBody>
                </Card>
              ))}
            </SimpleGrid>
          </Box>

          <Divider />

          {/* Recipe Extractor */}
          <Box w="full">
            <Heading size="lg" mb={6}>Extract from URL</Heading>
            <Card bg={cardBg}>
              <CardBody>
                <RecipeExtractor />
              </CardBody>
            </Card>
          </Box>

          <Divider />

          {/* Recipe Partners */}
          <Box w="full">
            <VStack spacing={6} align="start">
              <VStack spacing={2} align="start">
                <Heading size="lg">Recipe Partners</Heading>
                <Text color={mutedColor}>
                  Discover recipes from our trusted partners. Click any site to browse their collection.
                </Text>
              </VStack>

              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6} w="full">
                {recipePartners.map((partner) => (
                  <Card 
                    key={partner.name} 
                    bg={cardBg}
                    cursor="pointer"
                    _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }}
                    transition="all 0.2s"
                    onClick={() => window.open(partner.url, '_blank')}
                  >
                    <CardBody>
                      <HStack spacing={4} align="start">
                        <Image
                          src={partner.logo}
                          alt={partner.name}
                          w="12"
                          h="12"
                          borderRadius="lg"
                          objectFit="cover"
                        />
                        <VStack align="start" spacing={2} flex={1}>
                          <HStack justify="space-between" w="full">
                            <Heading size="sm">{partner.name}</Heading>
                            <Badge colorScheme="blue" size="sm">
                              {partner.category}
                            </Badge>
                          </HStack>
                          <Text fontSize="sm" color={mutedColor} noOfLines={2}>
                            {partner.description}
                          </Text>
                          <HStack spacing={1} color="blue.500" fontSize="sm">
                            <Text>Visit site</Text>
                            <ExternalLinkIcon boxSize={3} />
                          </HStack>
                        </VStack>
                      </HStack>
                    </CardBody>
                  </Card>
                ))}
              </SimpleGrid>
            </VStack>
          </Box>

          {/* Tips */}
          <Card bg={cardBg} w="full">
            <CardBody>
              <VStack spacing={4} align="start">
                <Heading size="md">💡 Import Tips</Heading>
                <VStack spacing={2} align="start" color={mutedColor}>
                  <Text>• Most recipe websites work great with URL import</Text>
                  <Text>• Look for sites with structured recipe data (schema.org)</Text>
                  <Text>• Popular sites like AllRecipes, Food Network, and EatingWell work perfectly</Text>
                  <Text>• If a recipe doesn't import correctly, try manual entry</Text>
                  <Text>• You can always edit imported recipes after saving</Text>
                </VStack>
              </VStack>
            </CardBody>
          </Card>
        </VStack>
      </Container>
    </Box>
  )
}