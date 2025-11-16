import React, { useState, useEffect } from 'react'
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  Input,
  VStack,
  HStack,
  Text,
  Box,
  Badge,
  Radio,
  RadioGroup,
  Stack,
  Spinner,
  Alert,
  AlertIcon,
  useToast,
  InputGroup,
  InputLeftElement,
  Divider,
} from '@chakra-ui/react'
import { SearchIcon } from '@chakra-ui/icons'
import axios from 'axios'

interface FoodMatch {
  fdcId: number
  description: string
  confidence: number
  matchType: 'exact' | 'fuzzy' | 'synonym' | 'partial'
  dataType?: string
}

interface USDAFood {
  fdcId: number
  description: string
  dataType: string
  foodCategory?: string
}

interface IngredientNutritionPickerProps {
  isOpen: boolean
  onClose: () => void
  ingredientId: string
  ingredientName: string
  onMapped?: () => void
}

/**
 * Ingredient Nutrition Picker
 * Allows users to search for and select USDA foods to map to ingredients
 */
export const IngredientNutritionPicker: React.FC<IngredientNutritionPickerProps> = ({
  isOpen,
  onClose,
  ingredientId,
  ingredientName,
  onMapped,
}) => {
  const [searchQuery, setSearchQuery] = useState(ingredientName)
  const [suggestions, setSuggestions] = useState<FoodMatch[]>([])
  const [searchResults, setSearchResults] = useState<USDAFood[]>([])
  const [selectedFdcId, setSelectedFdcId] = useState<number | null>(null)
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [isMapping, setIsMapping] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toast = useToast()

  // Load suggestions when modal opens
  useEffect(() => {
    if (isOpen && ingredientId) {
      loadSuggestions()
    }
  }, [isOpen, ingredientId])

  const loadSuggestions = async () => {
    setIsLoadingSuggestions(true)
    setError(null)

    try {
      const response = await axios.get(
        `/api/nutrition/ingredients/${ingredientId}/suggestions`
      )
      setSuggestions(response.data.matches || [])

      // Auto-select first high-confidence match
      if (response.data.matches && response.data.matches.length > 0) {
        const firstMatch = response.data.matches[0]
        if (firstMatch.confidence >= 0.85) {
          setSelectedFdcId(firstMatch.fdcId)
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load suggestions')
    } finally {
      setIsLoadingSuggestions(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      return
    }

    setIsSearching(true)
    setError(null)

    try {
      const response = await axios.get(`/api/nutrition/search`, {
        params: {
          q: searchQuery,
          limit: 15,
        },
      })

      setSearchResults(response.data.foods || [])
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to search foods')
      toast({
        title: 'Search failed',
        description: err.response?.data?.error || 'Please try again',
        status: 'error',
        duration: 3000,
      })
    } finally {
      setIsSearching(false)
    }
  }

  const handleMap = async () => {
    if (!selectedFdcId) {
      toast({
        title: 'No food selected',
        description: 'Please select a food to map',
        status: 'warning',
        duration: 2000,
      })
      return
    }

    setIsMapping(true)

    try {
      await axios.post(`/api/nutrition/ingredients/${ingredientId}/map`, {
        fdcId: selectedFdcId,
        isManual: true,
      })

      toast({
        title: 'Ingredient mapped!',
        description: 'Nutrition data has been linked to this ingredient',
        status: 'success',
        duration: 3000,
      })

      onMapped?.()
      onClose()
    } catch (err: any) {
      toast({
        title: 'Mapping failed',
        description: err.response?.data?.error || 'Please try again',
        status: 'error',
        duration: 3000,
      })
    } finally {
      setIsMapping(false)
    }
  }

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.9) return 'green'
    if (confidence >= 0.7) return 'yellow'
    return 'orange'
  }

  const getDataTypeBadge = (dataType: string): string => {
    const badges: Record<string, string> = {
      Foundation: 'green',
      'SR Legacy': 'blue',
      Branded: 'purple',
      'Survey (FNDDS)': 'cyan',
    }
    return badges[dataType] || 'gray'
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          Map Ingredient: "{ingredientName}"
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          <VStack spacing={4} align="stretch">
            {error && (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                {error}
              </Alert>
            )}

            {/* Suggested Matches */}
            {isLoadingSuggestions ? (
              <HStack justify="center" py={4}>
                <Spinner />
                <Text>Loading suggestions...</Text>
              </HStack>
            ) : suggestions.length > 0 ? (
              <Box>
                <Text fontWeight="bold" mb={2}>
                  Suggested Matches
                </Text>
                <RadioGroup
                  value={selectedFdcId?.toString()}
                  onChange={(val) => setSelectedFdcId(parseInt(val))}
                >
                  <Stack spacing={2}>
                    {suggestions.map((match) => (
                      <Box
                        key={match.fdcId}
                        p={3}
                        border="1px solid"
                        borderColor="gray.200"
                        borderRadius="md"
                        cursor="pointer"
                        _hover={{ borderColor: 'blue.500' }}
                        onClick={() => setSelectedFdcId(match.fdcId)}
                      >
                        <Radio value={match.fdcId.toString()}>
                          <VStack align="start" spacing={1}>
                            <Text fontWeight="medium">{match.description}</Text>
                            <HStack spacing={2}>
                              <Badge colorScheme={getConfidenceColor(match.confidence)}>
                                {Math.round(match.confidence * 100)}% match
                              </Badge>
                              <Badge colorScheme="gray">{match.matchType}</Badge>
                              {match.dataType && (
                                <Badge colorScheme={getDataTypeBadge(match.dataType)}>
                                  {match.dataType}
                                </Badge>
                              )}
                            </HStack>
                          </VStack>
                        </Radio>
                      </Box>
                    ))}
                  </Stack>
                </RadioGroup>
              </Box>
            ) : null}

            {/* Manual Search */}
            <Divider />

            <Box>
              <Text fontWeight="bold" mb={2}>
                Search USDA Database
              </Text>
              <HStack>
                <InputGroup>
                  <InputLeftElement pointerEvents="none">
                    <SearchIcon color="gray.300" />
                  </InputLeftElement>
                  <Input
                    placeholder="Search for food..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSearch()
                      }
                    }}
                  />
                </InputGroup>
                <Button
                  colorScheme="blue"
                  onClick={handleSearch}
                  isLoading={isSearching}
                  loadingText="Searching"
                >
                  Search
                </Button>
              </HStack>
            </Box>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <Box>
                <Text fontWeight="bold" mb={2}>
                  Search Results
                </Text>
                <RadioGroup
                  value={selectedFdcId?.toString()}
                  onChange={(val) => setSelectedFdcId(parseInt(val))}
                >
                  <Stack spacing={2} maxH="300px" overflowY="auto">
                    {searchResults.map((food) => (
                      <Box
                        key={food.fdcId}
                        p={3}
                        border="1px solid"
                        borderColor="gray.200"
                        borderRadius="md"
                        cursor="pointer"
                        _hover={{ borderColor: 'blue.500' }}
                        onClick={() => setSelectedFdcId(food.fdcId)}
                      >
                        <Radio value={food.fdcId.toString()}>
                          <VStack align="start" spacing={1}>
                            <Text fontWeight="medium">{food.description}</Text>
                            <HStack spacing={2}>
                              <Badge colorScheme={getDataTypeBadge(food.dataType)}>
                                {food.dataType}
                              </Badge>
                              {food.foodCategory && (
                                <Badge colorScheme="gray" variant="subtle">
                                  {food.foodCategory}
                                </Badge>
                              )}
                            </HStack>
                          </VStack>
                        </Radio>
                      </Box>
                    ))}
                  </Stack>
                </RadioGroup>
              </Box>
            )}

            {!isLoadingSuggestions && suggestions.length === 0 && searchResults.length === 0 && (
              <Alert status="info" borderRadius="md">
                <AlertIcon />
                Search for a food in the USDA database to map this ingredient
              </Alert>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleMap}
            isLoading={isMapping}
            loadingText="Mapping"
            isDisabled={!selectedFdcId}
          >
            Map Ingredient
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

export default IngredientNutritionPicker
