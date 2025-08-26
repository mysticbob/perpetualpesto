/**
 * Recipe List Component using React Query
 * Demonstrates proper data fetching with loading, error, and caching
 */

import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Card,
  CardBody,
  Image,
  Badge,
  Spinner,
  Alert,
  AlertIcon,
  IconButton,
  useToast,
  Skeleton,
  SkeletonText,
} from '@chakra-ui/react'
import { DeleteIcon, EditIcon, ExternalLinkIcon } from '@chakra-ui/icons'
import { useRecipes, useDeleteRecipe } from '../hooks/useRecipes'
import { useState } from 'react'

interface Recipe {
  id: string
  name: string
  description?: string
  imageUrl?: string
  prepTime?: number
  cookTime?: number
  totalTime?: number
  servings?: number
  sourceUrl?: string
  createdAt: string
}

export default function RecipeListWithQuery() {
  const { data, isLoading, isError, error, refetch } = useRecipes()
  const deleteRecipeMutation = useDeleteRecipe()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await deleteRecipeMutation.mutateAsync(id)
    } finally {
      setDeletingId(null)
    }
  }

  // Loading skeleton
  if (isLoading) {
    return (
      <VStack spacing={4} w="full">
        {[1, 2, 3].map((i) => (
          <Card key={i} w="full">
            <CardBody>
              <HStack spacing={4}>
                <Skeleton height="100px" width="150px" />
                <VStack align="start" flex={1} spacing={2}>
                  <Skeleton height="20px" width="200px" />
                  <SkeletonText noOfLines={2} spacing={2} />
                  <HStack>
                    <Skeleton height="20px" width="60px" />
                    <Skeleton height="20px" width="60px" />
                    <Skeleton height="20px" width="60px" />
                  </HStack>
                </VStack>
              </HStack>
            </CardBody>
          </Card>
        ))}
      </VStack>
    )
  }

  // Error state
  if (isError) {
    return (
      <Alert status="error" borderRadius="md">
        <AlertIcon />
        <Box>
          <Text fontWeight="bold">Failed to load recipes</Text>
          <Text fontSize="sm">{error?.message}</Text>
          <Button size="sm" mt={2} onClick={() => refetch()}>
            Try Again
          </Button>
        </Box>
      </Alert>
    )
  }

  const recipes = data?.recipes || []

  // Empty state
  if (recipes.length === 0) {
    return (
      <Box textAlign="center" py={10}>
        <Text fontSize="lg" color="gray.500">
          No recipes yet
        </Text>
        <Text fontSize="sm" color="gray.400" mt={2}>
          Add your first recipe to get started
        </Text>
      </Box>
    )
  }

  return (
    <VStack spacing={4} w="full">
      {recipes.map((recipe: Recipe) => (
        <Card
          key={recipe.id}
          w="full"
          opacity={deletingId === recipe.id ? 0.5 : 1}
          transition="opacity 0.2s"
        >
          <CardBody>
            <HStack spacing={4} align="start">
              {recipe.imageUrl && (
                <Image
                  src={recipe.imageUrl}
                  alt={recipe.name}
                  boxSize="100px"
                  objectFit="cover"
                  borderRadius="md"
                  fallback={<Box bg="gray.200" boxSize="100px" borderRadius="md" />}
                />
              )}
              
              <VStack align="start" flex={1} spacing={2}>
                <Text fontSize="lg" fontWeight="bold">
                  {recipe.name}
                </Text>
                
                {recipe.description && (
                  <Text fontSize="sm" color="gray.600" noOfLines={2}>
                    {recipe.description}
                  </Text>
                )}
                
                <HStack spacing={3} flexWrap="wrap">
                  {recipe.prepTime && (
                    <Badge colorScheme="blue">
                      Prep: {recipe.prepTime} min
                    </Badge>
                  )}
                  {recipe.cookTime && (
                    <Badge colorScheme="orange">
                      Cook: {recipe.cookTime} min
                    </Badge>
                  )}
                  {recipe.servings && (
                    <Badge colorScheme="green">
                      Serves: {recipe.servings}
                    </Badge>
                  )}
                </HStack>
              </VStack>
              
              <HStack>
                {recipe.sourceUrl && (
                  <IconButton
                    aria-label="View source"
                    icon={<ExternalLinkIcon />}
                    size="sm"
                    as="a"
                    href={recipe.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                )}
                <IconButton
                  aria-label="Edit recipe"
                  icon={<EditIcon />}
                  size="sm"
                  isDisabled={deletingId === recipe.id}
                />
                <IconButton
                  aria-label="Delete recipe"
                  icon={<DeleteIcon />}
                  size="sm"
                  colorScheme="red"
                  variant="ghost"
                  onClick={() => handleDelete(recipe.id)}
                  isLoading={deletingId === recipe.id}
                  isDisabled={deletingId !== null && deletingId !== recipe.id}
                />
              </HStack>
            </HStack>
          </CardBody>
        </Card>
      ))}
    </VStack>
  )
}