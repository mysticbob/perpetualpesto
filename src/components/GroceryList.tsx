import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  List,
  ListItem,
  IconButton,
  Button,
  useColorModeValue,
  Divider,
  Badge
} from '@chakra-ui/react'
import { useState } from 'react'
import { ChevronLeftIcon, AddIcon, DeleteIcon, CheckIcon } from '@chakra-ui/icons'
import ExportToReminders from './ExportToReminders'

interface GroceryItem {
  id: string
  name: string
  amount?: string
  unit?: string
  category?: string
  completed: boolean
}

interface GroceryListProps {
  onBack: () => void
}

// Mock grocery data based on the chili recipe
const mockGroceryItems: GroceryItem[] = [
  { id: '1', name: 'black beans', amount: '500g', category: 'dried', completed: false },
  { id: '2', name: 'beluga lentils', amount: '500g', category: 'dried', completed: false },
  { id: '3', name: 'diced tomatoes', amount: '4 cans', completed: false },
  { id: '4', name: 'corn', amount: '1 can', completed: false },
  { id: '5', name: 'bell peppers', amount: '4', completed: false },
  { id: '6', name: 'onion', amount: '1', completed: false },
  { id: '7', name: 'garlic', amount: '2 cloves', completed: false },
  { id: '8', name: 'chilli peppers', completed: false },
  { id: '9', name: 'tomato paste', amount: '5 tbsp', completed: false },
  { id: '10', name: 'canola oil', amount: '3 tbsp', completed: true },
  { id: '11', name: 'vegetable broth', completed: true },
  { id: '12', name: 'salt', completed: true }
]

export default function GroceryList({ onBack }: GroceryListProps) {
  const [items, setItems] = useState<GroceryItem[]>(mockGroceryItems)
  
  const bgColor = useColorModeValue('white', 'gray.800')
  const mutedColor = useColorModeValue('gray.500', 'gray.400')
  const completedBg = useColorModeValue('red.500', 'red.600')
  const borderColor = useColorModeValue('gray.200', 'gray.600')

  const toggleItem = (itemId: string) => {
    setItems(items.map(item => 
      item.id === itemId 
        ? { ...item, completed: !item.completed }
        : item
    ))
  }

  const clearCompleted = () => {
    setItems(items.filter(item => !item.completed))
  }

  const completedItems = items.filter(item => item.completed)
  const pendingItems = items.filter(item => !item.completed)

  return (
    <Box minH="100vh" bg={bgColor}>
      {/* Header */}
      <Box p={4} borderBottom="1px" borderColor={borderColor}>
        <HStack justify="space-between" align="center">
          <HStack spacing={4}>
            <IconButton
              aria-label="Back"
              icon={<ChevronLeftIcon />}
              size="sm"
              variant="ghost"
              onClick={onBack}
            />
            <Heading size="lg">Groceries</Heading>
          </HStack>
          
          <HStack spacing={2}>
            <IconButton
              aria-label="Add item"
              icon={<AddIcon />}
              size="sm"
              variant="ghost"
            />
            <IconButton
              aria-label="Delete completed"
              icon={<DeleteIcon />}
              size="sm"
              variant="ghost"
            />
            <ExportToReminders 
              items={items}
              recipeName="Recipe Groceries"
            />
            {completedItems.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                colorScheme="red"
                onClick={clearCompleted}
              >
                CLEAR COMPLETED
              </Button>
            )}
          </HStack>
        </HStack>
      </Box>

      {/* Grocery List */}
      <Box p={6} maxW="2xl" mx="auto">
        <VStack spacing={6} align="start" w="full">
          {/* Pending Items */}
          <List spacing={4} w="full">
            {pendingItems.map((item) => (
              <ListItem key={item.id}>
                <HStack
                  spacing={4}
                  cursor="pointer"
                  onClick={() => toggleItem(item.id)}
                  p={4}
                  borderRadius="md"
                  _hover={{ bg: 'gray.50', _dark: { bg: 'gray.700' } }}
                  transition="background 0.2s"
                >
                  <Box
                    w="6"
                    h="6"
                    borderRadius="full"
                    border="2px solid"
                    borderColor="gray.300"
                    bg="transparent"
                    flexShrink={0}
                  />
                  
                  <VStack align="start" spacing={1} flex={1}>
                    <HStack spacing={2}>
                      <Text fontWeight="medium" fontSize="md">
                        {item.name}
                      </Text>
                      {item.category && (
                        <Badge size="sm" colorScheme="gray">
                          {item.category}
                        </Badge>
                      )}
                    </HStack>
                    {item.amount && (
                      <Text fontSize="sm" color="red.500" fontWeight="medium">
                        {item.amount}
                      </Text>
                    )}
                  </VStack>
                </HStack>
                <Divider />
              </ListItem>
            ))}
          </List>

          {/* Completed Items */}
          {completedItems.length > 0 && (
            <>
              <Divider />
              <Text fontSize="sm" color={mutedColor} fontWeight="medium">
                COMPLETED ({completedItems.length})
              </Text>
              
              <List spacing={3} w="full">
                {completedItems.map((item) => (
                  <ListItem key={item.id}>
                    <HStack
                      spacing={4}
                      cursor="pointer"
                      onClick={() => toggleItem(item.id)}
                      p={3}
                      borderRadius="md"
                      opacity={0.6}
                      _hover={{ opacity: 0.8 }}
                      transition="opacity 0.2s"
                    >
                      <Box
                        w="5"
                        h="5"
                        borderRadius="full"
                        bg="green.500"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        flexShrink={0}
                      >
                        <CheckIcon w="3" h="3" color="white" />
                      </Box>
                      
                      <Text
                        fontSize="sm"
                        color={mutedColor}
                        textDecoration="line-through"
                        flex={1}
                      >
                        {item.name}
                      </Text>
                    </HStack>
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </VStack>
      </Box>
    </Box>
  )
}