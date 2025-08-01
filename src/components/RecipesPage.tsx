import {
  Box,
  Grid,
  GridItem,
  Heading,
  Text,
  VStack,
  useColorModeValue,
  Container,
  Divider,
  useToast
} from '@chakra-ui/react'
import { useState, useEffect } from 'react'
import RecipeList from './RecipeList'
import RecipeView from './RecipeView'
import RecipeSummary from './RecipeSummary'
import CookMode from './CookMode'
import { generateSampleRecipes, SampleRecipe } from '../utils/sampleRecipes'
import { useAuth } from '../contexts/AuthContext'

interface Recipe {
  id: string
  name: string
  description?: string
  prepTime?: number
  cookTime?: number
  totalTime?: number
  servings?: number
  imageUrl?: string
  ingredients: Array<{
    id: string
    name: string
    amount?: string
    unit?: string
  }>
  instructions: Array<{
    id: string
    step: string
  }>
}

interface RecipesPageProps {
  onGroceries: () => void
}

export default function RecipesPage({ onGroceries }: RecipesPageProps) {
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null)
  const [currentRecipe, setCurrentRecipe] = useState<Recipe | null>(null)
  const [loadingRecipe, setLoadingRecipe] = useState(false)
  const [view, setView] = useState<'summary' | 'recipe' | 'cook'>('summary')
  const [loadingSampleData, setLoadingSampleData] = useState(false)

  const { currentUser } = useAuth()
  const toast = useToast()
  const bgColor = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')

  // Mock recipe data for fallback
  const mockRecipe = {
    id: '1',
    name: 'Chili sin carne',
    description: 'Spicy, hearty and healthy. A simple chili recipe which substitutes meat with lentils. Can be served with rice or bread.',
    prepTime: 15,
    cookTime: 60,
    totalTime: 75,
    servings: 8,
    imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400',
    ingredients: [
      { id: '1', name: 'black beans (dried)', amount: '500', unit: 'g' },
      { id: '2', name: 'beluga lentils (dried)', amount: '500', unit: 'g' },
      { id: '3', name: 'diced tomatoes', amount: '4', unit: 'cans' },
      { id: '4', name: 'corn', amount: '1', unit: 'can' },
      { id: '5', name: 'bell peppers', amount: '4' },
      { id: '6', name: 'onion', amount: '1' },
      { id: '7', name: 'garlic', amount: '2', unit: 'cloves' },
      { id: '8', name: 'chilli peppers' },
      { id: '9', name: 'tomato paste', amount: '5', unit: 'tbsp' },
      { id: '10', name: 'canola oil', amount: '3', unit: 'tbsp' },
      { id: '11', name: 'vegetable broth' },
      { id: '12', name: 'salt' }
    ],
    instructions: [
      { id: '1', step: 'Put the beans in a large pot and cover them with plenty of water. Soak overnight (or at least 12 hours).' },
      { id: '2', step: 'Drain the soaked beans, fill the pot with fresh water and add the beans. Let it simmer.' },
      { id: '3', step: 'Bring the lentils to a boil in another pot with enough vegetable broth. Make sure the broth covers the lentils, otherwise add water. Let it simmer.' },
      { id: '4', step: 'While the beans and lentils are cooking, chop the bell peppers and onion. Mince the chili peppers and garlic cloves.' },
      { id: '5', step: 'Heat the oil in a large pot over medium heat. Add the onion and cook until softened, about 5 minutes.' },
      { id: '6', step: 'Add the bell peppers, chili peppers, and garlic. Cook for another 3-4 minutes.' },
      { id: '7', step: 'Stir in the tomato paste and cook for 1 minute until fragrant.' },
      { id: '8', step: 'Add the diced tomatoes, corn, cooked beans, and lentils. Season with salt.' },
      { id: '9', step: 'Simmer for 20-30 minutes, stirring occasionally, until the chili has thickened.' }
    ]
  }

  const handleRecipeSelect = async (recipeId: string) => {
    setSelectedRecipeId(recipeId)
    setLoadingRecipe(true)
    setView('summary')
    
    try {
      const response = await fetch(`http://localhost:3001/api/recipes/${recipeId}`)
      if (response.ok) {
        const recipe = await response.json()
        console.log('Loaded recipe from database:', recipe)
        
        // Transform database recipe to match component expectations
        const transformedRecipe = {
          ...recipe,
          ingredients: recipe.ingredients?.map((ing: any, index: number) => ({
            id: ing.id || `ing-${index}`,
            name: ing.name,
            amount: ing.amount,
            unit: ing.unit
          })) || [],
          instructions: recipe.instructions?.map((inst: any, index: number) => ({
            id: inst.id || `inst-${index}`,
            step: inst.step
          })) || []
        }
        
        setCurrentRecipe(transformedRecipe)
      } else {
        console.error('Failed to load recipe, status:', response.status)
        // Fallback to mock recipe if API fails
        setCurrentRecipe(mockRecipe)
      }
    } catch (error) {
      console.error('Error loading recipe:', error)
      // Fallback to mock recipe
      setCurrentRecipe(mockRecipe)
    } finally {
      setLoadingRecipe(false)
    }
  }

  const handleStartCooking = () => {
    setView('cook')
  }

  const handleViewRecipe = () => {
    setView('recipe')
  }

  const handleBackToSummary = () => {
    setView('summary')
  }

  const handleLoadSampleData = async () => {
    if (!currentUser) {
      toast({
        title: 'Error',
        description: 'Please log in to load sample recipes.',
        status: 'error',
        duration: 3000,
      })
      return
    }

    setLoadingSampleData(true)
    const sampleRecipes = generateSampleRecipes()
    let successCount = 0
    let failureCount = 0

    try {
      // Load each sample recipe
      for (const sampleRecipe of sampleRecipes) {
        try {
          const response = await fetch('http://localhost:3001/api/recipes', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: currentUser.uid,
              name: sampleRecipe.name,
              description: sampleRecipe.description,
              prepTime: sampleRecipe.prepTime,
              cookTime: sampleRecipe.cookTime,
              totalTime: sampleRecipe.totalTime,
              servings: sampleRecipe.servings,
              imageUrl: sampleRecipe.imageUrl,
              sourceUrl: sampleRecipe.sourceUrl,
              ingredients: sampleRecipe.ingredients,
              instructions: sampleRecipe.instructions
            })
          })

          if (response.ok) {
            successCount++
          } else {
            failureCount++
            console.error(`Failed to load recipe: ${sampleRecipe.name}`)
          }
        } catch (error) {
          failureCount++
          console.error(`Error loading recipe ${sampleRecipe.name}:`, error)
        }
      }

      if (successCount > 0) {
        toast({
          title: 'Sample Recipes Loaded!',
          description: `Successfully loaded ${successCount} sample recipe${successCount === 1 ? '' : 's'}.${failureCount > 0 ? ` ${failureCount} failed to load.` : ''}`,
          status: 'success',
          duration: 5000,
        })
        
        // The RecipeList will automatically refresh and show the new recipes
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load sample recipes. Please try again.',
          status: 'error',
          duration: 5000,
        })
      }
    } catch (error) {
      console.error('Error loading sample data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load sample recipes. Please try again.',
        status: 'error',
        duration: 5000,
      })
    } finally {
      setLoadingSampleData(false)
    }
  }

  const renderRecipeContent = () => {
    if (!selectedRecipeId || !currentRecipe) {
      return (
        <Container maxW="container.md" py={8}>
          <VStack spacing={6} align="center" justify="center" minH="400px">
            <Text fontSize="xl" color="gray.500" textAlign="center">
              Select a recipe from the list to view its details
            </Text>
            <Text fontSize="md" color="gray.400" textAlign="center">
              Click on any recipe card to see ingredients, instructions, and cooking options
            </Text>
          </VStack>
        </Container>
      )
    }

    if (loadingRecipe) {
      return (
        <Container maxW="container.md" py={8}>
          <VStack spacing={6} align="center" justify="center" minH="400px">
            <Text fontSize="lg">Loading recipe...</Text>
          </VStack>
        </Container>
      )
    }

    switch (view) {
      case 'recipe':
        return (
          <RecipeView 
            recipe={currentRecipe}
            onClose={handleBackToSummary}
            onStartCooking={handleStartCooking}
          />
        )
      case 'cook':
        return (
          <CookMode 
            recipe={currentRecipe}
            onClose={handleBackToSummary}
          />
        )
      case 'summary':
      default:
        return (
          <RecipeSummary 
            recipe={currentRecipe}
            onClose={() => setSelectedRecipeId(null)}
            onStartCooking={handleStartCooking}
            onGroceries={onGroceries}
          />
        )
    }
  }

  return (
    <Box h="100vh" bg={bgColor}>
      <Grid templateColumns="320px 1fr" h="full">
        {/* Recipe List Panel */}
        <GridItem borderRight="1px" borderColor={borderColor} overflow="auto">
          <Box p={4}>
            <VStack spacing={4} align="start">
              <Heading size="lg">My Recipes</Heading>
              <RecipeList 
                onRecipeSelect={handleRecipeSelect} 
                selectedRecipeId={selectedRecipeId}
                onLoadSampleData={handleLoadSampleData}
                loadingSampleData={loadingSampleData}
              />
            </VStack>
          </Box>
        </GridItem>

        {/* Recipe Detail Panel */}
        <GridItem overflow="auto">
          {renderRecipeContent()}
        </GridItem>
      </Grid>
    </Box>
  )
}