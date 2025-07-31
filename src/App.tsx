import { Box, Container, Heading, VStack, Button } from '@chakra-ui/react'
import { useState } from 'react'
import RecipeList from './components/RecipeList'
import RecipeExtractor from './components/RecipeExtractor'
import RecipeView from './components/RecipeView'
import RecipeSummary from './components/RecipeSummary'
import CookMode from './components/CookMode'
import CalendarView from './components/CalendarView'
import GroceryList from './components/GroceryList'
import Sidebar from './components/Sidebar'
import AddRecipePage from './components/AddRecipePage'
import PreferencesPage from './components/PreferencesPage'
import PantryPage from './components/PantryPage'
import StoresPage from './components/StoresPage'
import { PreferencesProvider } from './contexts/PreferencesContext'
import { PantryProvider } from './contexts/PantryContext'

type ViewType = 'list' | 'extract' | 'recipe' | 'summary' | 'cook' | 'calendar' | 'grocery' | 'add' | 'preferences' | 'pantry' | 'stores'

// Mock recipe data
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

function App() {
  const [view, setView] = useState<ViewType>('list')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null)
  const [currentRecipe, setCurrentRecipe] = useState<any>(null)
  const [loadingRecipe, setLoadingRecipe] = useState(false)

  const handleRecipeSelect = async (recipeId: string) => {
    setSelectedRecipeId(recipeId)
    setLoadingRecipe(true)
    
    try {
      const response = await fetch(`/api/recipes/${recipeId}`)
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
        setView('summary')
      } else {
        console.error('Failed to load recipe, status:', response.status)
        // Fallback to mock recipe if API fails
        setCurrentRecipe(mockRecipe)
        setView('summary')
      }
    } catch (error) {
      console.error('Error loading recipe:', error)
      // Fallback to mock recipe
      setCurrentRecipe(mockRecipe)
      setView('summary')
    } finally {
      setLoadingRecipe(false)
    }
  }

  const handleGroceries = () => {
    setView('grocery')
  }

  const handleStartCooking = () => {
    setView('cook')
  }

  const handleBackToHome = () => {
    setView('list')
    setSelectedRecipeId(null)
    setCurrentRecipe(null)
  }

  const handleNavigate = (newView: string) => {
    setView(newView as ViewType)
  }

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed)
  }

  // Map current view to sidebar navigation item
  const getCurrentSidebarView = () => {
    switch (view) {
      case 'summary':
      case 'recipe':
      case 'cook':
        return 'list' // Recipe-related views map to "Recipes"
      case 'extract':
        return 'add' // Extract maps to "Add Recipe"
      default:
        return view
    }
  }

  const sidebarWidth = sidebarCollapsed ? '80px' : '240px'

  const renderCurrentView = () => {
    switch (view) {
      case 'summary':
        if (loadingRecipe) {
          return (
            <Container maxW="container.xl" py={8}>
              <VStack spacing={8}>
                <Text>Loading recipe...</Text>
              </VStack>
            </Container>
          )
        }
        return (
          <RecipeSummary 
            recipe={currentRecipe || mockRecipe}
            onClose={handleBackToHome}
            onStartCooking={handleStartCooking}
            onGroceries={handleGroceries}
          />
        )
      case 'recipe':
        return (
          <RecipeView 
            recipe={currentRecipe || mockRecipe}
            onClose={() => setView('summary')}
            onStartCooking={handleStartCooking}
          />
        )
      case 'cook':
        return (
          <CookMode 
            recipe={currentRecipe || mockRecipe}
            onClose={() => setView('summary')}
          />
        )
      case 'calendar':
        return (
          <CalendarView 
            onRecipeSelect={handleRecipeSelect}
          />
        )
      case 'grocery':
        return (
          <GroceryList 
            onBack={handleBackToHome}
          />
        )
      case 'add':
        return (
          <AddRecipePage 
            onBack={handleBackToHome}
          />
        )
      case 'pantry':
        return (
          <PantryPage 
            onBack={handleBackToHome}
          />
        )
      case 'stores':
        return (
          <StoresPage 
            onBack={handleBackToHome}
          />
        )
      case 'preferences':
        return (
          <PreferencesPage 
            onBack={handleBackToHome}
          />
        )
      case 'extract':
        return (
          <Container maxW="container.xl" py={8}>
            <VStack spacing={8}>
              <Heading size="xl">Extract Recipe</Heading>
              <RecipeExtractor />
            </VStack>
          </Container>
        )
      case 'list':
      default:
        return (
          <Container maxW="container.xl" py={8}>
            <VStack spacing={8}>
              <Heading size="xl">My Recipes</Heading>
              <RecipeList onRecipeSelect={handleRecipeSelect} />
            </VStack>
          </Container>
        )
    }
  }

  return (
    <PreferencesProvider>
      <PantryProvider>
        <Box display="flex" h="100vh">
          <Sidebar 
            currentView={getCurrentSidebarView()}
            onNavigate={handleNavigate}
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={toggleSidebar}
          />
          
          <Box 
            flex={1} 
            ml={sidebarWidth} 
            transition="margin-left 0.2s"
            overflow="auto"
          >
            {renderCurrentView()}
          </Box>
        </Box>
      </PantryProvider>
    </PreferencesProvider>
  )
}

export default App