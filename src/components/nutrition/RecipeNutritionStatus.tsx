import React, { useState, useEffect } from 'react'
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Progress,
  Badge,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  List,
  ListItem,
  ListIcon,
  useToast,
  Collapse,
  IconButton,
  Spinner,
} from '@chakra-ui/react'
import { CheckCircleIcon, WarningIcon, ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons'
import axios from 'axios'
import { IngredientNutritionPicker } from './IngredientNutritionPicker'

interface RecipeNutritionStatusProps {
  recipeId: string
  onNutritionCalculated?: () => void
}

interface MappingStats {
  total: number
  mapped: number
  unmapped: number
  manual: number
  auto: number
  percentMapped: number
}

interface UnmappedIngredient {
  id: string
  name: string
  amount?: string
  unit?: string
}

/**
 * Recipe Nutrition Status Component
 * Shows ingredient mapping status and provides actions to map/calculate
 */
export const RecipeNutritionStatus: React.FC<RecipeNutritionStatusProps> = ({
  recipeId,
  onNutritionCalculated,
}) => {
  const [stats, setStats] = useState<MappingStats | null>(null)
  const [unmappedIngredients, setUnmappedIngredients] = useState<UnmappedIngredient[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isAutoMapping, setIsAutoMapping] = useState(false)
  const [isCalculating, setIsCalculating] = useState(false)
  const [showUnmapped, setShowUnmapped] = useState(true)
  const [selectedIngredient, setSelectedIngredient] = useState<UnmappedIngredient | null>(null)
  const [isPickerOpen, setIsPickerOpen] = useState(false)

  const toast = useToast()

  useEffect(() => {
    loadStats()
  }, [recipeId])

  const loadStats = async () => {
    setIsLoading(true)

    try {
      const [statsResponse, unmappedResponse] = await Promise.all([
        axios.get(`/api/nutrition/recipes/${recipeId}/stats`),
        axios.get(`/api/nutrition/recipes/${recipeId}/unmapped`),
      ])

      setStats(statsResponse.data.stats)
      setUnmappedIngredients(unmappedResponse.data.unmapped || [])
    } catch (error: any) {
      toast({
        title: 'Failed to load nutrition status',
        description: error.response?.data?.error || 'Please try again',
        status: 'error',
        duration: 3000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAutoMap = async () => {
    setIsAutoMapping(true)

    try {
      const response = await axios.post(`/api/nutrition/recipes/${recipeId}/auto-map`)

      toast({
        title: 'Auto-mapping complete!',
        description: `Mapped ${response.data.mappedCount} ingredients`,
        status: 'success',
        duration: 3000,
      })

      // Reload stats
      await loadStats()
    } catch (error: any) {
      toast({
        title: 'Auto-mapping failed',
        description: error.response?.data?.error || 'Please try again',
        status: 'error',
        duration: 3000,
      })
    } finally {
      setIsAutoMapping(false)
    }
  }

  const handleCalculate = async () => {
    setIsCalculating(true)

    try {
      await axios.post(`/api/nutrition/recipes/${recipeId}/calculate`)

      toast({
        title: 'Nutrition calculated!',
        description: 'Recipe nutrition has been updated',
        status: 'success',
        duration: 3000,
      })

      onNutritionCalculated?.()
    } catch (error: any) {
      toast({
        title: 'Calculation failed',
        description: error.response?.data?.error || 'Please try again',
        status: 'error',
        duration: 3000,
      })
    } finally {
      setIsCalculating(false)
    }
  }

  const handleManualMap = (ingredient: UnmappedIngredient) => {
    setSelectedIngredient(ingredient)
    setIsPickerOpen(true)
  }

  const handlePickerClose = () => {
    setIsPickerOpen(false)
    setSelectedIngredient(null)
  }

  const handleIngredientMapped = async () => {
    // Reload stats after mapping
    await loadStats()
  }

  if (isLoading) {
    return (
      <Box p={4} textAlign="center">
        <Spinner />
        <Text mt={2} fontSize="sm" color="gray.500">
          Loading nutrition status...
        </Text>
      </Box>
    )
  }

  if (!stats) {
    return null
  }

  const getStatusColor = () => {
    if (stats.percentMapped === 100) return 'green'
    if (stats.percentMapped >= 80) return 'blue'
    if (stats.percentMapped >= 50) return 'yellow'
    return 'red'
  }

  const getStatusIcon = () => {
    if (stats.percentMapped === 100) return <CheckCircleIcon color="green.500" />
    return <WarningIcon color="orange.500" />
  }

  return (
    <Box
      border="1px solid"
      borderColor="gray.200"
      borderRadius="lg"
      p={4}
      bg="white"
    >
      <VStack spacing={4} align="stretch">
        {/* Header */}
        <HStack justify="space-between">
          <HStack>
            {getStatusIcon()}
            <Text fontWeight="bold" fontSize="lg">
              Nutrition Status
            </Text>
          </HStack>
          <Badge colorScheme={getStatusColor()} fontSize="md" px={2} py={1}>
            {stats.percentMapped}% Complete
          </Badge>
        </HStack>

        {/* Progress Bar */}
        <Box>
          <Progress
            value={stats.percentMapped}
            size="sm"
            colorScheme={getStatusColor()}
            borderRadius="full"
          />
          <HStack justify="space-between" mt={2} fontSize="sm" color="gray.600">
            <Text>
              {stats.mapped} of {stats.total} ingredients mapped
            </Text>
            <Text>
              {stats.auto} auto | {stats.manual} manual
            </Text>
          </HStack>
        </Box>

        {/* Status Message */}
        {stats.percentMapped === 100 ? (
          <Alert status="success" borderRadius="md">
            <AlertIcon />
            <Box flex="1">
              <AlertTitle>Ready to calculate!</AlertTitle>
              <AlertDescription>
                All ingredients are mapped. Click below to calculate nutrition.
              </AlertDescription>
            </Box>
          </Alert>
        ) : (
          <Alert status="warning" borderRadius="md">
            <AlertIcon />
            <Box flex="1">
              <AlertTitle>{stats.unmapped} ingredients need mapping</AlertTitle>
              <AlertDescription>
                Map ingredients to calculate accurate nutrition data.
              </AlertDescription>
            </Box>
          </Alert>
        )}

        {/* Unmapped Ingredients List */}
        {unmappedIngredients.length > 0 && (
          <Box>
            <HStack justify="space-between" mb={2}>
              <Text fontWeight="semibold" fontSize="sm" color="gray.700">
                Unmapped Ingredients
              </Text>
              <IconButton
                aria-label="Toggle unmapped list"
                icon={showUnmapped ? <ChevronUpIcon /> : <ChevronDownIcon />}
                size="sm"
                variant="ghost"
                onClick={() => setShowUnmapped(!showUnmapped)}
              />
            </HStack>

            <Collapse in={showUnmapped} animateOpacity>
              <List spacing={2}>
                {unmappedIngredients.map((ingredient) => (
                  <ListItem
                    key={ingredient.id}
                    p={2}
                    bg="gray.50"
                    borderRadius="md"
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <HStack flex="1">
                      <ListIcon as={WarningIcon} color="orange.500" />
                      <Text fontSize="sm">{ingredient.name}</Text>
                    </HStack>
                    <Button
                      size="xs"
                      colorScheme="blue"
                      variant="outline"
                      onClick={() => handleManualMap(ingredient)}
                    >
                      Map
                    </Button>
                  </ListItem>
                ))}
              </List>
            </Collapse>
          </Box>
        )}

        {/* Actions */}
        <HStack spacing={2}>
          <Button
            colorScheme="blue"
            variant="outline"
            size="sm"
            onClick={handleAutoMap}
            isLoading={isAutoMapping}
            loadingText="Auto-mapping"
            isDisabled={stats.unmapped === 0}
          >
            Auto-Map Ingredients
          </Button>
          <Button
            colorScheme="green"
            size="sm"
            onClick={handleCalculate}
            isLoading={isCalculating}
            loadingText="Calculating"
            flex="1"
          >
            Calculate Nutrition
          </Button>
        </HStack>

        {stats.percentMapped < 100 && (
          <Text fontSize="xs" color="gray.500" textAlign="center">
            Tip: Auto-map will attempt to match unmapped ingredients automatically.
            For best results, manually map any ingredients it misses.
          </Text>
        )}
      </VStack>

      {/* Ingredient Nutrition Picker Modal */}
      {selectedIngredient && (
        <IngredientNutritionPicker
          isOpen={isPickerOpen}
          onClose={handlePickerClose}
          ingredientId={selectedIngredient.id}
          ingredientName={selectedIngredient.name}
          onMapped={handleIngredientMapped}
        />
      )}
    </Box>
  )
}

export default RecipeNutritionStatus
