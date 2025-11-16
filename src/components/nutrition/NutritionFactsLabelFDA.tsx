import React from 'react'
import { Box, Text, Divider, HStack, VStack, Flex } from '@chakra-ui/react'

interface NutritionData {
  calories?: number
  totalFat?: number
  saturatedFat?: number
  transFat?: number
  cholesterol?: number
  sodium?: number
  totalCarbs?: number
  dietaryFiber?: number
  totalSugars?: number
  addedSugars?: number
  protein?: number
  vitaminD?: number
  calcium?: number
  iron?: number
  potassium?: number
}

interface NutritionFactsLabelFDAProps {
  nutrition: NutritionData
  servingSize?: string
  servingsPerContainer?: number
  containerName?: string // e.g., "recipe", "container"
}

/**
 * FDA-Compliant Nutrition Facts Label
 * Follows the official FDA nutrition label format
 */
export const NutritionFactsLabelFDA: React.FC<NutritionFactsLabelFDAProps> = ({
  nutrition,
  servingSize = '1 serving',
  servingsPerContainer,
  containerName = 'recipe',
}) => {
  // Calculate % Daily Values (based on 2000 calorie diet)
  const getDailyValue = (amount: number | undefined, dailyValue: number): string => {
    if (!amount) return '0'
    return Math.round((amount / dailyValue) * 100).toString()
  }

  const dailyValues = {
    totalFat: 78, // g
    saturatedFat: 20, // g
    cholesterol: 300, // mg
    sodium: 2300, // mg
    totalCarbs: 275, // g
    dietaryFiber: 28, // g
    vitaminD: 20, // mcg
    calcium: 1300, // mg
    iron: 18, // mg
    potassium: 4700, // mg
  }

  return (
    <Box
      border="2px solid black"
      borderRadius="md"
      p={4}
      maxW="350px"
      fontFamily="Arial, sans-serif"
      bg="white"
    >
      {/* Title */}
      <Text fontSize="3xl" fontWeight="black" mb={1}>
        Nutrition Facts
      </Text>

      <Divider borderColor="black" borderWidth="8px" mb={2} />

      {/* Servings */}
      {servingsPerContainer && (
        <Text fontSize="sm" mb={1}>
          {servingsPerContainer} servings per {containerName}
        </Text>
      )}
      <Text fontSize="sm" fontWeight="bold" mb={2}>
        Serving size <Text as="span" fontWeight="normal">{servingSize}</Text>
      </Text>

      <Divider borderColor="black" borderWidth="4px" mb={2} />

      {/* Calories */}
      <HStack justify="space-between" align="baseline" mb={1}>
        <Text fontSize="md" fontWeight="bold">
          Amount per serving
        </Text>
      </HStack>
      <HStack justify="space-between" align="baseline">
        <Text fontSize="2xl" fontWeight="black">
          Calories
        </Text>
        <Text fontSize="3xl" fontWeight="black">
          {Math.round(nutrition.calories || 0)}
        </Text>
      </HStack>

      <Divider borderColor="black" borderWidth="4px" my={2} />

      {/* % Daily Value header */}
      <Text fontSize="xs" textAlign="right" fontWeight="bold" mb={2}>
        % Daily Value*
      </Text>

      <Divider borderColor="gray.400" mb={1} />

      {/* Total Fat */}
      <NutrientRow
        label="Total Fat"
        amount={nutrition.totalFat}
        unit="g"
        dailyValue={getDailyValue(nutrition.totalFat, dailyValues.totalFat)}
        isBold
      />
      <NutrientRow
        label="Saturated Fat"
        amount={nutrition.saturatedFat}
        unit="g"
        dailyValue={getDailyValue(nutrition.saturatedFat, dailyValues.saturatedFat)}
        indent
      />
      <NutrientRow
        label="Trans Fat"
        amount={nutrition.transFat}
        unit="g"
        indent
      />

      <Divider borderColor="gray.400" mb={1} />

      {/* Cholesterol */}
      <NutrientRow
        label="Cholesterol"
        amount={nutrition.cholesterol}
        unit="mg"
        dailyValue={getDailyValue(nutrition.cholesterol, dailyValues.cholesterol)}
        isBold
      />

      <Divider borderColor="gray.400" mb={1} />

      {/* Sodium */}
      <NutrientRow
        label="Sodium"
        amount={nutrition.sodium}
        unit="mg"
        dailyValue={getDailyValue(nutrition.sodium, dailyValues.sodium)}
        isBold
      />

      <Divider borderColor="gray.400" mb={1} />

      {/* Total Carbohydrates */}
      <NutrientRow
        label="Total Carbohydrate"
        amount={nutrition.totalCarbs}
        unit="g"
        dailyValue={getDailyValue(nutrition.totalCarbs, dailyValues.totalCarbs)}
        isBold
      />
      <NutrientRow
        label="Dietary Fiber"
        amount={nutrition.dietaryFiber}
        unit="g"
        dailyValue={getDailyValue(nutrition.dietaryFiber, dailyValues.dietaryFiber)}
        indent
      />
      <NutrientRow
        label="Total Sugars"
        amount={nutrition.totalSugars}
        unit="g"
        indent
      />
      {nutrition.addedSugars !== undefined && nutrition.addedSugars > 0 && (
        <NutrientRow
          label="Includes Added Sugars"
          amount={nutrition.addedSugars}
          unit="g"
          indent
          doubleIndent
        />
      )}

      <Divider borderColor="gray.400" mb={1} />

      {/* Protein */}
      <NutrientRow label="Protein" amount={nutrition.protein} unit="g" isBold />

      <Divider borderColor="black" borderWidth="8px" my={2} />

      {/* Vitamins and Minerals */}
      <VStack spacing={1} align="stretch">
        {nutrition.vitaminD !== undefined && nutrition.vitaminD > 0 && (
          <MicronutrientRow
            label="Vitamin D"
            amount={nutrition.vitaminD}
            unit="mcg"
            dailyValue={getDailyValue(nutrition.vitaminD, dailyValues.vitaminD)}
          />
        )}
        {nutrition.calcium !== undefined && nutrition.calcium > 0 && (
          <MicronutrientRow
            label="Calcium"
            amount={nutrition.calcium}
            unit="mg"
            dailyValue={getDailyValue(nutrition.calcium, dailyValues.calcium)}
          />
        )}
        {nutrition.iron !== undefined && nutrition.iron > 0 && (
          <MicronutrientRow
            label="Iron"
            amount={nutrition.iron}
            unit="mg"
            dailyValue={getDailyValue(nutrition.iron, dailyValues.iron)}
          />
        )}
        {nutrition.potassium !== undefined && nutrition.potassium > 0 && (
          <MicronutrientRow
            label="Potassium"
            amount={nutrition.potassium}
            unit="mg"
            dailyValue={getDailyValue(nutrition.potassium, dailyValues.potassium)}
          />
        )}
      </VStack>

      <Divider borderColor="gray.400" mt={2} mb={2} />

      {/* Footer */}
      <Text fontSize="2xs" lineHeight="1.3">
        * The % Daily Value (DV) tells you how much a nutrient in a serving of food
        contributes to a daily diet. 2,000 calories a day is used for general
        nutrition advice.
      </Text>
    </Box>
  )
}

// Helper component for main nutrients
const NutrientRow: React.FC<{
  label: string
  amount?: number
  unit: string
  dailyValue?: string
  isBold?: boolean
  indent?: boolean
  doubleIndent?: boolean
}> = ({ label, amount, unit, dailyValue, isBold, indent, doubleIndent }) => {
  const displayAmount = amount !== undefined ? amount.toFixed(1) : '0.0'
  const paddingLeft = doubleIndent ? 8 : indent ? 4 : 0

  return (
    <HStack justify="space-between" fontSize="sm" py={0.5} pl={paddingLeft}>
      <HStack spacing={1}>
        <Text fontWeight={isBold ? 'bold' : 'normal'}>
          {label}
        </Text>
        <Text fontWeight="normal">
          {displayAmount}
          {unit}
        </Text>
      </HStack>
      {dailyValue && (
        <Text fontWeight="bold">{dailyValue}%</Text>
      )}
    </HStack>
  )
}

// Helper component for micronutrients (vitamins/minerals)
const MicronutrientRow: React.FC<{
  label: string
  amount: number
  unit: string
  dailyValue: string
}> = ({ label, amount, unit, dailyValue }) => {
  return (
    <HStack justify="space-between" fontSize="sm">
      <Text>
        {label} {amount.toFixed(1)}
        {unit}
      </Text>
      <Text fontWeight="bold">{dailyValue}%</Text>
    </HStack>
  )
}

export default NutritionFactsLabelFDA
