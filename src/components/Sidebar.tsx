import {
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  useColorModeValue,
  Tooltip,
  IconButton,
  Divider,
  Badge,
  Progress,
  Button
} from '@chakra-ui/react'
import { 
  CalendarIcon, 
  AddIcon,
  HamburgerIcon,
  RecipeIcon,
  PantryIcon,
  GroceryIcon,
  StoreIcon,
  SettingsIcon,
  TimeIcon,
  DeleteIcon
} from './icons/CustomIcons'
import { useTimers } from '../contexts/TimerContext'
import { useAuth } from '../contexts/AuthContext'

interface SidebarProps {
  currentView: string
  onNavigate: (view: string) => void
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

const navigationItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: HamburgerIcon,
    description: 'Overview and quick stats'
  },
  {
    id: 'meals',
    label: 'Meal Planning',
    icon: CalendarIcon,
    description: 'AI-powered meal planning'
  },
  {
    id: 'pantry-manager',
    label: 'Pantry Manager',
    icon: PantryIcon,
    description: 'Track inventory & expiration'
  },
  {
    id: 'shopping',
    label: 'Shopping List',
    icon: GroceryIcon,
    description: 'Smart shopping lists'
  },
  {
    id: 'list',
    label: 'Recipes',
    icon: RecipeIcon,
    description: 'Browse your recipe collection'
  },
  {
    id: 'stores',
    label: 'Stores',
    icon: StoreIcon,
    description: 'Grocery delivery & pickup services'
  },
  {
    id: 'add',
    label: 'Add Recipe',
    icon: AddIcon,
    description: 'Import or create new recipes'
  },
  {
    id: 'preferences',
    label: 'Preferences',
    icon: SettingsIcon,
    description: 'App settings and preferences'
  }
]

export default function Sidebar({ currentView, onNavigate, isCollapsed = false, onToggleCollapse }: SidebarProps) {
  const bgColor = useColorModeValue('white', 'gray.900')
  const borderColor = useColorModeValue('gray.200', 'gray.700')
  const hoverBg = useColorModeValue('gray.50', 'gray.800')
  const activeBg = useColorModeValue('blue.50', 'blue.900')
  const activeColor = useColorModeValue('blue.600', 'blue.300')
  const textColor = useColorModeValue('gray.700', 'gray.300')
  const { timers, pauseTimer, startTimer, removeTimer, clearCompletedTimers } = useTimers()
  const { currentUser, logout } = useAuth()

  const sidebarWidth = isCollapsed ? '80px' : '240px'

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Failed to logout:', error)
    }
  }

  const formatTime = (seconds: number) => {
    const totalMinutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    
    // If greater than 60 minutes, format as "X hours, YY minutes"
    if (totalMinutes >= 60) {
      const hours = Math.floor(totalMinutes / 60)
      const mins = totalMinutes % 60
      
      if (mins === 0) {
        return `${hours} hour${hours !== 1 ? 's' : ''}`
      } else {
        return `${hours} hour${hours !== 1 ? 's' : ''}, ${mins.toString().padStart(2, '0')} min`
      }
    }
    
    // For durations under 60 minutes, use the original format
    return `${totalMinutes}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Box
      w={sidebarWidth}
      h="100vh"
      bg={bgColor}
      borderRight="1px solid"
      borderColor={borderColor}
      transition="width 0.2s"
      position="fixed"
      left={0}
      top={0}
      zIndex={1000}
    >
      <VStack spacing={0} h="full">
        {/* Header */}
        <Box w="full" p={4} borderBottom="1px solid" borderBottomColor={borderColor}>
          <HStack justify="space-between" align="center">
            {!isCollapsed && (
              <Text fontSize="xl" fontWeight="bold" color={activeColor} >
                Eat It App
              </Text>
            )}
            <IconButton
              aria-label="Toggle sidebar"
              icon={<HamburgerIcon />}
              size="sm"
              variant="ghost"
              onClick={onToggleCollapse}
            />
          </HStack>
        </Box>

        {/* Navigation Items */}
        <VStack spacing={1} flex={1} w="full" p={2} align="start">
          {navigationItems.map((item) => {
            const isActive = currentView === item.id
            const IconComponent = item.icon

            return (
              <Tooltip
                key={item.id}
                label={isCollapsed ? item.description : ''}
                placement="right"
                isDisabled={!isCollapsed}
              >
                <Box
                  w="full"
                  p={3}
                  borderRadius="lg"
                  cursor="pointer"
                  bg={isActive ? activeBg : 'transparent'}
                  color={isActive ? activeColor : textColor}
                  _hover={{ bg: isActive ? activeBg : hoverBg }}
                  transition="all 0.2s"
                  onClick={() => onNavigate(item.id)}
                >
                  <HStack spacing={3} justify={isCollapsed ? 'center' : 'start'}>
                    <Box minW="20px" textAlign="center">
                      <Icon as={IconComponent} boxSize={5} />
                    </Box>
                    {!isCollapsed && (
                      <Text fontSize="md" fontWeight={isActive ? 'semibold' : 'medium'}>
                        {item.label}
                      </Text>
                    )}
                  </HStack>
                </Box>
              </Tooltip>
            )
          })}
        </VStack>

        {/* Active Timers */}
        {timers.length > 0 && (
          <Box w="full" borderTop="1px solid" borderTopColor={borderColor}>
            {!isCollapsed && (
              <VStack spacing={2} p={3} align="start">
                <HStack justify="space-between" w="full">
                  <HStack spacing={2}>
                    <TimeIcon boxSize={4} color={activeColor} />
                    <Text fontSize="sm" fontWeight="semibold" color={activeColor}>
                      Timers
                    </Text>
                  </HStack>
                  {timers.some(t => t.isCompleted) && (
                    <Button size="xs" variant="ghost" onClick={clearCompletedTimers}>
                      Clear
                    </Button>
                  )}
                </HStack>
                
                <VStack spacing={1.5} w="full" maxH="320px" overflowY="auto">
                  {timers.map((timer) => (
                    <Box
                      key={timer.id}
                      w="full"
                      p={1.5}
                      borderRadius="md"
                      bg={timer.isCompleted ? useColorModeValue('red.50', 'red.900') : 
                          timer.isRunning ? useColorModeValue('green.50', 'green.900') : 
                          useColorModeValue('gray.50', 'gray.700')}
                      borderLeft="3px solid"
                      borderLeftColor={timer.isCompleted ? 'red.400' : timer.isRunning ? 'green.400' : 'gray.400'}
                    >
                      <VStack spacing={0.5} align="start">
                        <HStack justify="space-between" w="full">
                          <Text fontSize="xs" fontWeight="medium" noOfLines={1} flex={1} color={textColor}>
                            {timer.name}
                          </Text>
                          <IconButton
                            aria-label="Remove timer"
                            icon={<DeleteIcon />}
                            size="xs"
                            variant="ghost"
                            onClick={() => removeTimer(timer.id)}
                          />
                        </HStack>
                        
                        <HStack justify="space-between" w="full">
                          <Text 
                            fontSize="xs" 
                            fontWeight="bold" 
                            color={timer.isCompleted ? useColorModeValue('red.600', 'red.300') : textColor}
                          >
                            {timer.isCompleted ? 'DONE!' : formatTime(timer.remainingSeconds)}
                          </Text>
                          
                          {!timer.isCompleted && (
                            <Button
                              size="xs"
                              colorScheme={timer.isRunning ? 'red' : 'green'}
                              onClick={() => timer.isRunning ? pauseTimer(timer.id) : startTimer(timer.id)}
                            >
                              {timer.isRunning ? 'Pause' : 'Start'}
                            </Button>
                          )}
                        </HStack>
                        
                        {!timer.isCompleted && (
                          <Progress
                            value={((timer.totalSeconds - timer.remainingSeconds) / timer.totalSeconds) * 100}
                            size="sm"
                            w="full"
                            colorScheme={timer.isRunning ? 'green' : 'gray'}
                          />
                        )}
                        
                        {timer.recipeStep && (
                          <Text fontSize="xs" color={useColorModeValue('gray.500', 'gray.400')}>
                            Step {timer.recipeStep} • {timer.recipeName}
                          </Text>
                        )}
                      </VStack>
                    </Box>
                  ))}
                </VStack>
              </VStack>
            )}
            
            {isCollapsed && timers.length > 0 && (
              <Box p={2} textAlign="center">
                <Badge colorScheme="green" fontSize="xs">
                  {timers.length}
                </Badge>
              </Box>
            )}
          </Box>
        )}

        {/* User Info & Footer */}
        <Box w="full" borderTop="1px solid" borderTopColor={borderColor}>
          {!isCollapsed && currentUser && (
            <VStack spacing={3} p={4}>
              <VStack spacing={1} w="full">
                <Text fontSize="sm" fontWeight="semibold" color={textColor} noOfLines={1}>
                  {currentUser.displayName || currentUser.email}
                </Text>
                <Text fontSize="xs" color="gray.500" noOfLines={1}>
                  {currentUser.email}
                </Text>
              </VStack>
              
              <Button
                size="sm"
                variant="ghost"
                w="full"
                onClick={handleLogout}
                color={textColor}
                _hover={{ bg: hoverBg }}
              >
                Sign Out
              </Button>
              
              <Text fontSize="xs" color={textColor} textAlign="center">
                Eat It App v1.0
              </Text>
            </VStack>
          )}

          {isCollapsed && (
            <Box p={2} textAlign="center">
              <Tooltip label="Sign Out" placement="right">
                <IconButton
                  aria-label="Sign out"
                  icon={<Text fontSize="sm">👤</Text>}
                  size="sm"
                  variant="ghost"
                  onClick={handleLogout}
                />
              </Tooltip>
            </Box>
          )}
        </Box>
      </VStack>
    </Box>
  )
}