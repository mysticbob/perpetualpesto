import { Box, Container, Heading, VStack, Button, Text } from '@chakra-ui/react'
import { useState } from 'react'
import RecipeExtractor from './components/RecipeExtractor'
import CalendarView from './components/CalendarView'
import GroceryList from './components/GroceryList'
import Sidebar from './components/Sidebar'
import AddRecipePage from './components/AddRecipePage'
import PreferencesPage from './components/PreferencesPage'
import PantryPage from './components/PantryPage'
import StoresPage from './components/StoresPage'
import RecipesPage from './components/RecipesPage'
import PerformanceMonitor from './components/PerformanceMonitor'
import { PreferencesProvider } from './contexts/PreferencesContext'
import { PantryProvider } from './contexts/PantryContext'
import { TimerProvider } from './contexts/TimerContext'
import { AuthProvider } from './contexts/AuthContext'
import { GroceryProvider } from './contexts/GroceryContext'
import ProtectedRoute from './components/ProtectedRoute'

type ViewType = 'list' | 'extract' | 'calendar' | 'grocery' | 'add' | 'preferences' | 'pantry' | 'stores'



function App() {
  const [view, setView] = useState<ViewType>('list')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const handleGroceries = () => {
    setView('grocery')
  }

  const handleBackToHome = () => {
    setView('list')
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
      case 'extract':
        return 'add' // Extract maps to "Add Recipe"
      default:
        return view
    }
  }

  const sidebarWidth = sidebarCollapsed ? '80px' : '240px'

  const renderCurrentView = () => {
    switch (view) {
      case 'calendar':
        return (
          <CalendarView 
            onRecipeSelect={() => {}} // Calendar will need to be updated to work with new split view
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
          <RecipesPage 
            onGroceries={handleGroceries}
          />
        )
    }
  }

  return (
    <AuthProvider>
      <ProtectedRoute>
        <PreferencesProvider>
          <PantryProvider>
            <GroceryProvider>
              <TimerProvider>
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
                  
                  <PerformanceMonitor />
                </Box>
              </TimerProvider>
            </GroceryProvider>
          </PantryProvider>
        </PreferencesProvider>
      </ProtectedRoute>
    </AuthProvider>
  )
}

export default App