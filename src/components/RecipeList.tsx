import {
  Box,
  SimpleGrid,
  Card,
  CardBody,
  Heading,
  Text,
  Image,
  Badge,
  HStack,
  Button,
  VStack
} from '@chakra-ui/react'
import { useState, useEffect } from 'react'

// We'll fetch recipes from the database
interface Recipe {
  id: string
  name: string
  description?: string
  prepTime?: number
  cookTime?: number
  servings?: number
  imageUrl?: string
}

interface RecipeListProps {
  onRecipeSelect?: (recipeId: string) => void
}

export default function RecipeList({ onRecipeSelect }: RecipeListProps) {
  const [selectedRecipe, setSelectedRecipe] = useState<string | null>(null)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch recipes from database
  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        const response = await fetch('/api/recipes')
        if (response.ok) {
          const data = await response.json()
          setRecipes(data)
        }
      } catch (error) {
        console.error('Failed to fetch recipes:', error)
        // Fallback to mock data if API fails
        setRecipes([
          {
            id: '1',
            name: 'Ranch Roasted Chickpeas',
            description: 'Crispy, flavorful chickpeas with ranch seasoning',
            prepTime: 10,
            cookTime: 25,
            servings: 4,
            imageUrl: 'https://images.unsplash.com/photo-1587735243615-c03f25aaff15?w=400',
          },
          {
            id: '2', 
            name: 'Mediterranean Pasta Salad',
            description: 'Fresh pasta salad with olives, tomatoes, and feta',
            prepTime: 15,
            cookTime: 10,
            servings: 6,
            imageUrl: 'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=400',
          }
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchRecipes()
  }, [])

  return (
    <Box w="full" maxW="6xl">
      <VStack spacing={6}>
        <Heading size="lg">My Recipes</Heading>
        
        {loading ? (
          <Text>Loading recipes...</Text>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6} w="full">
            {recipes.map((recipe) => (
            <Card 
              key={recipe.id} 
              cursor="pointer"
              _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }}
              transition="all 0.2s"
              onClick={() => setSelectedRecipe(recipe.id)}
            >
              <CardBody>
                <VStack spacing={4} align="start">
                  <Image
                    src={recipe.imageUrl}
                    alt={recipe.name}
                    borderRadius="md"
                    h="200px"
                    w="full"
                    objectFit="cover"
                  />
                  
                  <Box>
                    <Heading size="md" mb={2}>{recipe.name}</Heading>
                    <Text color="gray.600" fontSize="sm" noOfLines={2}>
                      {recipe.description}
                    </Text>
                  </Box>

                  <HStack spacing={2} wrap="wrap">
                    <Badge colorScheme="blue" size="sm">
                      {(recipe.prepTime || 0) + (recipe.cookTime || 0)}m
                    </Badge>
                    <Badge colorScheme="green" size="sm">
                      Serves {recipe.servings}
                    </Badge>
                  </HStack>

                  <Button 
                    colorScheme="blue" 
                    size="sm" 
                    w="full"
                    onClick={() => onRecipeSelect?.(recipe.id)}
                  >
                    View Recipe
                  </Button>
                </VStack>
              </CardBody>
            </Card>
          ))}
          </SimpleGrid>
        )}

        {!loading && recipes.length === 0 && (
          <Text color="gray.500" fontSize="lg">
            No recipes yet. Extract your first recipe to get started!
          </Text>
        )}
      </VStack>
    </Box>
  )
}