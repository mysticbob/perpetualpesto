import {
  Box,
  Heading,
  Text,
  Image,
  HStack,
  VStack,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Flex,
  Spinner,
  Center,
  Button,
  ButtonGroup,
  IconButton,
  useColorModeValue,
  useToast,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure
} from '@chakra-ui/react'
import { SearchIcon, ChevronLeftIcon, ChevronRightIcon, DeleteIcon } from './icons/CustomIcons'
import { useState, useEffect, useCallback, useRef } from 'react'
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
  createdAt: string
  _count?: {
    ingredients: number
    instructions: number
  }
}

interface PaginatedResponse {
  recipes: Recipe[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

interface RecipeListProps {
  onRecipeSelect?: (recipeId: string) => void
  selectedRecipeId?: string | null
  onLoadSampleData?: () => void
  loadingSampleData?: boolean
}

export default function RecipeList({ onRecipeSelect, selectedRecipeId, onLoadSampleData, loadingSampleData }: RecipeListProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [maxTime, setMaxTime] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const { currentUser } = useAuth()
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    pages: 0
  })
  const [recipeToDelete, setRecipeToDelete] = useState<Recipe | null>(null)
  const [deleting, setDeleting] = useState(false)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const cancelRef = useRef<HTMLButtonElement>(null)
  const toast = useToast()

  // Debounced search function
  const fetchRecipes = useCallback(async (page = 1, search = '', timeFilter = '') => {
    if (!currentUser) return
    
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12',
        userId: currentUser.uid
      })
      
      if (search.trim()) {
        params.append('search', search.trim())
      }
      
      if (timeFilter) {
        params.append('maxTime', timeFilter)
      }

      const response = await fetch(`http://localhost:3001/api/recipes?${params}`)
      if (response.ok) {
        const data: PaginatedResponse = await response.json()
        setRecipes(data.recipes)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Failed to fetch recipes:', error)
    } finally {
      setLoading(false)
    }
  }, [currentUser])

  // Initial load
  useEffect(() => {
    fetchRecipes(1, searchTerm, maxTime)
  }, [fetchRecipes])

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCurrentPage(1)
      fetchRecipes(1, searchTerm, maxTime)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchTerm, maxTime, fetchRecipes])

  // Page change handler
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    fetchRecipes(newPage, searchTerm, maxTime)
  }

  // Delete recipe handlers
  const handleDeleteClick = (e: React.MouseEvent, recipe: Recipe) => {
    e.stopPropagation() // Prevent recipe selection
    setRecipeToDelete(recipe)
    onOpen()
  }

  const handleDeleteConfirm = async () => {
    if (!recipeToDelete) return

    setDeleting(true)
    try {
      const response = await fetch(`http://localhost:3001/api/recipes/${recipeToDelete.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Remove from local state
        setRecipes(prev => prev.filter(r => r.id !== recipeToDelete.id))
        
        toast({
          title: 'Recipe deleted',
          description: `"${recipeToDelete.name}" has been removed`,
          status: 'success',
          duration: 3000,
        })

        // If we deleted the currently selected recipe, clear selection
        if (selectedRecipeId === recipeToDelete.id) {
          onRecipeSelect?.(recipes.find(r => r.id !== recipeToDelete.id)?.id || '')
        }

        // Refresh the list to update pagination
        fetchRecipes(currentPage, searchTerm, maxTime)
      } else {
        throw new Error('Failed to delete recipe')
      }
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: 'Could not delete the recipe. Please try again.',
        status: 'error',
        duration: 5000,
      })
    } finally {
      setDeleting(false)
      setRecipeToDelete(null)
      onClose()
    }
  }

  const bgColor = useColorModeValue('white', 'gray.800')
  const hoverBg = useColorModeValue('gray.50', 'gray.700')
  const selectedBg = useColorModeValue('blue.50', 'blue.900')
  const borderColor = useColorModeValue('gray.200', 'gray.600')

  return (
    <Box w="full">
      <VStack spacing={4} align="stretch">
        {/* Search and Filter Controls */}
        <VStack spacing={3} align="stretch">
          <InputGroup size="sm">
            <InputLeftElement pointerEvents="none">
              <SearchIcon color="gray.300" />
            </InputLeftElement>
            <Input
              placeholder="Search recipes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
          
          <Select
            placeholder="Max cooking time"
            value={maxTime}
            onChange={(e) => setMaxTime(e.target.value)}
            size="sm"
            aria-label="Filter by maximum cooking time"
          >
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
            <option value="60">1 hour</option>
            <option value="120">2 hours</option>
          </Select>
        </VStack>
        
        {loading ? (
          <Center py={10}>
            <Spinner size="md" />
          </Center>
        ) : (
          <>
            {/* Simple Recipe List */}
            <VStack spacing={1} align="stretch">
              {recipes.map((recipe) => (
                <Box
                  key={recipe.id}
                  p={3}
                  cursor="pointer"
                  borderRadius="md"
                  bg={selectedRecipeId === recipe.id ? selectedBg : 'transparent'}
                  _hover={{ bg: selectedRecipeId === recipe.id ? selectedBg : hoverBg }}
                  transition="background-color 0.2s"
                  onClick={() => onRecipeSelect?.(recipe.id)}
                  border="1px solid transparent"
                  _focus={{ borderColor: 'blue.500', outline: 'none' }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Select recipe: ${recipe.name}`}
                >
                  <HStack spacing={3} align="center">
                    {/* Small Recipe Image */}
                    <Box flexShrink={0}>
                      {recipe.imageUrl ? (
                        <Image
                          src={recipe.imageUrl}
                          alt={recipe.name}
                          w="50px"
                          h="50px"
                          objectFit="cover"
                          borderRadius="md"
                          fallback={
                            <Box
                              w="50px"
                              h="50px"
                              bg="gray.100"
                              borderRadius="md"
                              display="flex"
                              alignItems="center"
                              justifyContent="center"
                            >
                              <Text fontSize="xs" color="gray.500">📷</Text>
                            </Box>
                          }
                        />
                      ) : (
                        <Box
                          w="50px"
                          h="50px"
                          bg="gray.100"
                          borderRadius="md"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                        >
                          <Text fontSize="xs" color="gray.500">📷</Text>
                        </Box>
                      )}
                    </Box>
                    
                    {/* Recipe Name and Basic Info */}
                    <VStack align="start" spacing={0} flex={1} minW={0}>
                      <Text 
                        fontWeight="medium" 
                        fontSize="sm" 
                        noOfLines={1}
                        w="full"
                      >
                        {recipe.name}
                      </Text>
                      <HStack spacing={2} fontSize="xs" color="gray.500">
                        {recipe.totalTime && (
                          <Text>{recipe.totalTime}m</Text>
                        )}
                        {recipe.servings && (
                          <Text>• Serves {recipe.servings}</Text>
                        )}
                      </HStack>
                    </VStack>

                    {/* Delete Button */}
                    <IconButton
                      aria-label={`Delete ${recipe.name}`}
                      icon={<DeleteIcon />}
                      size="sm"
                      variant="ghost"
                      colorScheme="red"
                      opacity={0.7}
                      _hover={{ opacity: 1, bg: 'red.50' }}
                      _dark={{
                        _hover: { bg: 'red.900' }
                      }}
                      onClick={(e) => handleDeleteClick(e, recipe)}
                    />
                  </HStack>
                </Box>
              ))}
            </VStack>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <Flex justify="center" align="center" gap={2} mt={4}>
                <IconButton
                  aria-label="Previous page"
                  icon={<ChevronLeftIcon />}
                  size="sm"
                  isDisabled={currentPage === 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                />
                
                <ButtonGroup size="sm" variant="outline">
                  {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(
                      pagination.pages - 4,
                      currentPage - 2
                    )) + i
                    
                    if (pageNum > pagination.pages) return null
                    
                    return (
                      <Button
                        key={pageNum}
                        colorScheme={pageNum === currentPage ? "blue" : "gray"}
                        onClick={() => handlePageChange(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </ButtonGroup>
                
                <IconButton
                  aria-label="Next page"
                  icon={<ChevronRightIcon />}
                  size="sm"
                  isDisabled={currentPage === pagination.pages}
                  onClick={() => handlePageChange(currentPage + 1)}
                />
              </Flex>
            )}
          </>
        )}

        {!loading && recipes.length === 0 && (
          <VStack spacing={4} py={8}>
            <Text color="gray.500" fontSize="sm" textAlign="center">
              {searchTerm || maxTime ? 
                'No recipes match your search criteria.' : 
                'No recipes yet. Extract your first recipe to get started!'
              }
            </Text>
            {!searchTerm && !maxTime && (
              <Button
                size="sm"
                colorScheme="teal"
                variant="outline"
                onClick={onLoadSampleData}
                isLoading={loadingSampleData}
                loadingText="Loading..."
              >
                Load Sample Recipes
              </Button>
            )}
          </VStack>
        )}
      </VStack>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Recipe
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete "{recipeToDelete?.name}"? This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>
                Cancel
              </Button>
              <Button 
                colorScheme="red" 
                onClick={handleDeleteConfirm}
                ml={3}
                isLoading={deleting}
                loadingText="Deleting..."
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  )
}