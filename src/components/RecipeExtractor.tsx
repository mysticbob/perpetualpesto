import {
  Box,
  Button,
  Input,
  VStack,
  Text,
  useToast,
  Card,
  CardBody,
  Heading,
  List,
  ListItem,
  OrderedList,
  Image,
  Badge,
  HStack,
  Divider
} from '@chakra-ui/react'
import { useState } from 'react'
import { usePreferences } from '../contexts/PreferencesContext'
import { useAuth } from '../contexts/AuthContext'
import { formatIngredientAmount } from '../utils/units'
import { apiClient } from '../utils/apiClient'

interface ExtractedRecipe {
  name: string
  description?: string
  prepTime?: number
  cookTime?: number
  totalTime?: number
  servings?: number
  imageUrl?: string
  ingredients: Array<{
    name: string
    amount?: string
    unit?: string
  }>
  instructions: Array<{
    step: string
  }>
}

export default function RecipeExtractor() {
  const [url, setUrl] = useState('https://www.eatingwell.com/ranch-roasted-chickpeas-11759228')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [recipe, setRecipe] = useState<ExtractedRecipe | null>(null)
  const toast = useToast()
  const { preferences } = usePreferences()
  const { currentUser } = useAuth()

  const extractRecipe = async () => {
    if (!url.trim()) {
      toast({
        title: 'URL Required',
        description: 'Please enter a recipe URL',
        status: 'warning',
        duration: 3000,
      })
      return
    }

    setLoading(true)
    try {
      const extractedRecipe = await apiClient.extractRecipe(url.trim())
      setRecipe(extractedRecipe)
      
      toast({
        title: 'Recipe Extracted!',
        description: `Successfully extracted "${extractedRecipe.name}"`,
        status: 'success',
        duration: 3000,
      })
    } catch (error) {
      toast({
        title: 'Extraction Failed',
        description: 'Could not extract recipe from this URL',
        status: 'error',
        duration: 5000,
      })
    } finally {
      setLoading(false)
    }
  }

  const saveRecipe = async () => {
    if (!recipe || !currentUser) return

    setSaving(true)
    try {
      const savedRecipe = await apiClient.createRecipe({
        userId: currentUser.uid,
        name: recipe.name,
        description: recipe.description,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        totalTime: recipe.totalTime,
        servings: recipe.servings,
        imageUrl: recipe.imageUrl,
        sourceUrl: url,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions
      })
      
      toast({
        title: 'Recipe Saved!',
        description: `"${savedRecipe.name}" has been added to your recipes`,
        status: 'success',
        duration: 3000,
      })

      // Clear the form
      setRecipe(null)
      setUrl('')
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: 'Could not save recipe to database',
        status: 'error',
        duration: 5000,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <VStack spacing={6} w="full" maxW="4xl">
      <Box w="full">
        <VStack spacing={4}>
          <Input
            placeholder="Enter recipe URL..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            size="lg"
          />
          <Button
            colorScheme="blue"
            onClick={extractRecipe}
            isLoading={loading}
            loadingText="Extracting..."
            size="lg"
          >
            Extract Recipe
          </Button>
        </VStack>
      </Box>

      {recipe && (
        <Card w="full">
          <CardBody>
            <VStack spacing={6} align="start">
              <Box>
                <Heading size="lg" mb={2}>{recipe.name}</Heading>
                {recipe.description && (
                  <Text color="gray.600" fontSize="md">{recipe.description}</Text>
                )}
              </Box>

              {recipe.imageUrl && (
                <Image
                  src={recipe.imageUrl}
                  alt={recipe.name}
                  maxH="300px"
                  objectFit="cover"
                  borderRadius="md"
                />
              )}

              <HStack spacing={4} wrap="wrap">
                {recipe.prepTime && (
                  <Badge colorScheme="blue" p={2}>
                    Prep: {recipe.prepTime}m
                  </Badge>
                )}
                {recipe.cookTime && (
                  <Badge colorScheme="orange" p={2}>
                    Cook: {recipe.cookTime}m
                  </Badge>
                )}
                {recipe.totalTime && (
                  <Badge colorScheme="green" p={2}>
                    Total: {recipe.totalTime}m
                  </Badge>
                )}
                {recipe.servings && (
                  <Badge colorScheme="purple" p={2}>
                    Serves: {recipe.servings}
                  </Badge>
                )}
              </HStack>

              <Divider />

              <Box w="full">
                <Heading size="md" mb={4}>Ingredients</Heading>
                <List spacing={2}>
                  {recipe.ingredients.map((ingredient, index) => (
                    <ListItem key={index} fontSize="md">
                      {formatIngredientAmount(ingredient.amount, ingredient.unit, preferences.unitSystem)} {ingredient.name}
                    </ListItem>
                  ))}
                </List>
              </Box>

              <Divider />

              <Box w="full">
                <Heading size="md" mb={4}>Instructions</Heading>
                <OrderedList spacing={3}>
                  {recipe.instructions.map((instruction, index) => (
                    <ListItem key={index} fontSize="md">
                      {instruction.step}
                    </ListItem>
                  ))}
                </OrderedList>
              </Box>

              <Button 
                colorScheme="green" 
                size="lg" 
                w="full"
                onClick={saveRecipe}
                isLoading={saving}
                loadingText="Saving..."
                isDisabled={!currentUser}
              >
                {currentUser ? 'Save Recipe' : 'Please log in to save recipes'}
              </Button>
            </VStack>
          </CardBody>
        </Card>
      )}
    </VStack>
  )
}