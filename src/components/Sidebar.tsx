import {
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  useColorModeValue,
  Tooltip,
  IconButton,
  Divider
} from '@chakra-ui/react'
import { 
  CalendarIcon, 
  AddIcon,
  HamburgerIcon
} from '@chakra-ui/icons'

interface SidebarProps {
  currentView: string
  onNavigate: (view: string) => void
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

const navigationItems = [
  {
    id: 'list',
    label: 'Recipes',
    icon: '📖',
    description: 'Browse your recipe collection'
  },
  {
    id: 'calendar',
    label: 'Calendar',
    icon: CalendarIcon,
    description: 'Plan your meals'
  },
  {
    id: 'pantry',
    label: 'Pantry',
    icon: '🏠',
    description: 'Track what you have at home'
  },
  {
    id: 'grocery',
    label: 'Groceries',
    icon: '🛒',
    description: 'Shopping lists'
  },
  {
    id: 'stores',
    label: 'Stores',
    icon: '🏪',
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
    icon: '⚙️',
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

  const sidebarWidth = isCollapsed ? '80px' : '240px'

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
              <Text fontSize="xl" fontWeight="bold" color={activeColor}>
                Recipe Planner
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
            const IconComponent = typeof item.icon === 'string' ? null : item.icon

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
                    <Box fontSize="20px" minW="20px" textAlign="center">
                      {IconComponent ? (
                        <Icon as={IconComponent} boxSize={5} />
                      ) : (
                        <Text>{typeof item.icon === 'string' ? item.icon : ''}</Text>
                      )}
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

        {/* Footer */}
        <Box w="full" p={4} borderTop="1px solid" borderTopColor={borderColor}>
          {!isCollapsed && (
            <Text fontSize="xs" color={textColor} textAlign="center">
              Recipe Planner v1.0
            </Text>
          )}
        </Box>
      </VStack>
    </Box>
  )
}