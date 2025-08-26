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
import Dashboard from './components/Dashboard'
import MealPlanning from './components/MealPlanning'
import PantryManager from './components/PantryManager'
import SmartShoppingList from './components/SmartShoppingList'
// import PerformanceMonitor from './components/PerformanceMonitor' // Disabled for now
import ChatInterface from './components/ai/ChatInterface'
import { PreferencesProvider } from './contexts/PreferencesContext'
import { PantryProvider } from './contexts/PantryContext'
import { TimerProvider } from './contexts/TimerContext'
import { AuthProvider } from './contexts/AuthContext'
import { GroceryProvider } from './contexts/GroceryContext'
import { AIProvider } from './contexts/AIContext'
import ProtectedRoute from './components/ProtectedRoute'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ReactQueryProvider } from './lib/react-query'

type ViewType = 'dashboard' | 'list' | 'extract' | 'calendar' | 'grocery' | 'add' | 'preferences' | 'pantry' | 'stores' | 'meals' | 'pantry-manager' | 'shopping'



function App() {
  const [view, setView] = useState<ViewType>('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  
  // Mock user ID - in production this would come from auth context
  const userId = 'user-123'

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
      case 'dashboard':
        return (
          <Dashboard 
            userId={userId}
            onNavigate={handleNavigate}
          />
        )
      case 'meals':
        return (
          <MealPlanning 
            userId={userId}
          />
        )
      case 'pantry-manager':
        return (
          <PantryManager 
            userId={userId}
          />
        )
      case 'shopping':
        return (
          <SmartShoppingList 
            userId={userId}
          />
        )
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
    <ErrorBoundary>
      <ReactQueryProvider>
        <AuthProvider>
          <ProtectedRoute>
            <PreferencesProvider>
              <PantryProvider>
                <GroceryProvider>
                  <AIProvider>
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
                        <ErrorBoundary>
                          {renderCurrentView()}
                        </ErrorBoundary>
                      </Box>
                      
                      <ChatInterface 
                        position="bottom-right"
                        onCommand={(cmd) => console.log('Command:', cmd)}
                      />
                      
                      {/* <PerformanceMonitor /> */} {/* Disabled for now */}
                    </Box>
                    </TimerProvider>
                  </AIProvider>
                </GroceryProvider>
              </PantryProvider>
            </PreferencesProvider>
          </ProtectedRoute>
        </AuthProvider>
      </ReactQueryProvider>
    </ErrorBoundary>
  )
}

export default App