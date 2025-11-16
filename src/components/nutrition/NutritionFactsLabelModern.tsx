import React, { useState } from 'react'
import {
  Box,
  Text,
  VStack,
  HStack,
  Divider,
  Button,
  ButtonGroup,
  Progress,
  Collapse,
  Icon,
  useColorModeValue,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
  Badge,
} from '@chakra-ui/react'
import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons'

interface NutritionData {
  calories?: number
  totalFat?: number
  saturatedFat?: number
  transFat?: number
  polyunsaturatedFat?: number
  monounsaturatedFat?: number
  cholesterol?: number
  sodium?: number
  totalCarbs?: number
  dietaryFiber?: number
  totalSugars?: number
  addedSugars?: number
  protein?: number
  // Vitamins & Minerals
  vitaminD?: number
  vitaminA?: number
  vitaminC?: number
  vitaminE?: number
  calcium?: number
  iron?: number
  potassium?: number
  magnesium?: number
  zinc?: number
}

interface NutritionFactsLabelModernProps {
  nutrition: NutritionData
  servingSize?: string
  servingsPerContainer?: number
  onServingChange?: (multiplier: number) => void
}

/**
 * Modern, Stylized Nutrition Facts Label
 * Clean, visual design with interactive features
 */
export const NutritionFactsLabelModern: React.FC<NutritionFactsLabelModernProps> = ({
  nutrition,
  servingSize = '1 serving',
  servingsPerContainer,
  onServingChange,
}) => {
  const [showDetailed, setShowDetailed] = useState(false)
  const [servingMultiplier, setServingMultiplier] = useState(1)

  const bgColor = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')
  const accentColor = useColorModeValue('blue.500', 'blue.300')

  // Calculate displayed nutrition (with serving multiplier)
  const displayNutrition = Object.entries(nutrition).reduce((acc, [key, value]) => {
    if (value !== undefined && value !== null) {
      acc[key as keyof NutritionData] = value * servingMultiplier
    }
    return acc
  }, {} as NutritionData)

  const handleServingChange = (multiplier: number) => {
    setServingMultiplier(multiplier)
    onServingChange?.(multiplier)
  }

  // Get daily value percentage for progress bars
  const getDailyValuePercent = (amount: number | undefined, dailyValue: number): number => {
    if (!amount) return 0
    return Math.min((amount / dailyValue) * 100, 100) // Cap at 100%
  }

  return (
    <Box
      border="1px solid"
      borderColor={borderColor}
      borderRadius="lg"
      p={5}
      maxW="400px"
      bg={bgColor}
      boxShadow="md"
    >
      {/* Header */}
      <HStack justify="space-between" mb={4}>
        <VStack align="start" spacing={0}>
          <Text fontSize="xs" color="gray.500" textTransform="uppercase">
            Nutrition per serving
          </Text>
          <Text fontSize="2xl" fontWeight="bold">
            {Math.round(displayNutrition.calories || 0)}
          </Text>
          <Text fontSize="xs" color="gray.500">
            calories
          </Text>
        </VStack>

        {/* Serving Size Controls */}
        <VStack align="end" spacing={1}>
          <Text fontSize="xs" color="gray.500">
            Serving
          </Text>
          <ButtonGroup size="xs" isAttached variant="outline">
            <Button
              onClick={() => handleServingChange(0.5)}
              colorScheme={servingMultiplier === 0.5 ? 'blue' : 'gray'}
            >
              0.5x
            </Button>
            <Button
              onClick={() => handleServingChange(1)}
              colorScheme={servingMultiplier === 1 ? 'blue' : 'gray'}
            >
              1x
            </Button>
            <Button
              onClick={() => handleServingChange(2)}
              colorScheme={servingMultiplier === 2 ? 'blue' : 'gray'}
            >
              2x
            </Button>
            {servingsPerContainer && (
              <Button
                onClick={() => handleServingChange(servingsPerContainer)}
                colorScheme={servingMultiplier === servingsPerContainer ? 'blue' : 'gray'}
              >
                Total
              </Button>
            )}
          </ButtonGroup>
          <Text fontSize="2xs" color="gray.500">
            {servingSize}
          </Text>
        </VStack>
      </HStack>

      <Divider mb={4} />

      {/* Macronutrients */}
      <SimpleGrid columns={3} spacing={4} mb={4}>
        <MacroStat
          icon="💪"
          label="Protein"
          value={displayNutrition.protein || 0}
          unit="g"
          color="red.500"
        />
        <MacroStat
          icon="🍞"
          label="Carbs"
          value={displayNutrition.totalCarbs || 0}
          unit="g"
          color="orange.500"
        />
        <MacroStat
          icon="🥑"
          label="Fat"
          value={displayNutrition.totalFat || 0}
          unit="g"
          color="yellow.500"
        />
      </SimpleGrid>

      {/* Key Nutrients with Progress Bars */}
      <VStack spacing={3} mb={4}>
        {displayNutrition.dietaryFiber !== undefined && displayNutrition.dietaryFiber > 0 && (
          <NutrientProgress
            icon="🌾"
            label="Fiber"
            amount={displayNutrition.dietaryFiber}
            unit="g"
            percent={getDailyValuePercent(displayNutrition.dietaryFiber, 28)}
            color="green.500"
          />
        )}
        {displayNutrition.sodium !== undefined && displayNutrition.sodium > 0 && (
          <NutrientProgress
            icon="🧂"
            label="Sodium"
            amount={displayNutrition.sodium}
            unit="mg"
            percent={getDailyValuePercent(displayNutrition.sodium, 2300)}
            color={displayNutrition.sodium > 1500 ? 'red.500' : 'blue.500'}
          />
        )}
        {displayNutrition.totalSugars !== undefined && displayNutrition.totalSugars > 0 && (
          <NutrientProgress
            icon="🍬"
            label="Sugar"
            amount={displayNutrition.totalSugars}
            unit="g"
            percent={getDailyValuePercent(displayNutrition.totalSugars, 50)}
            color="pink.500"
          />
        )}
        {displayNutrition.cholesterol !== undefined && displayNutrition.cholesterol > 0 && (
          <NutrientProgress
            icon="🫀"
            label="Cholesterol"
            amount={displayNutrition.cholesterol}
            unit="mg"
            percent={getDailyValuePercent(displayNutrition.cholesterol, 300)}
            color="purple.500"
          />
        )}
      </VStack>

      {/* Detailed Nutrients Toggle */}
      <Button
        size="sm"
        variant="ghost"
        width="full"
        onClick={() => setShowDetailed(!showDetailed)}
        rightIcon={showDetailed ? <ChevronUpIcon /> : <ChevronDownIcon />}
      >
        {showDetailed ? 'Hide' : 'Show'} detailed nutrients
      </Button>

      <Collapse in={showDetailed} animateOpacity>
        <Box mt={4} pt={4} borderTop="1px solid" borderColor={borderColor}>
          {/* Fat Breakdown */}
          {displayNutrition.saturatedFat !== undefined && (
            <DetailedSection title="Fat Breakdown">
              <DetailRow label="Saturated" value={displayNutrition.saturatedFat} unit="g" />
              {displayNutrition.transFat !== undefined && (
                <DetailRow label="Trans" value={displayNutrition.transFat} unit="g" />
              )}
              {displayNutrition.polyunsaturatedFat !== undefined && (
                <DetailRow label="Polyunsaturated" value={displayNutrition.polyunsaturatedFat} unit="g" />
              )}
              {displayNutrition.monounsaturatedFat !== undefined && (
                <DetailRow label="Monounsaturated" value={displayNutrition.monounsaturatedFat} unit="g" />
              )}
            </DetailedSection>
          )}

          {/* Vitamins */}
          {(displayNutrition.vitaminA || displayNutrition.vitaminC || displayNutrition.vitaminD) && (
            <DetailedSection title="Vitamins">
              {displayNutrition.vitaminA !== undefined && displayNutrition.vitaminA > 0 && (
                <DetailRow label="Vitamin A" value={displayNutrition.vitaminA} unit="mcg" />
              )}
              {displayNutrition.vitaminC !== undefined && displayNutrition.vitaminC > 0 && (
                <DetailRow label="Vitamin C" value={displayNutrition.vitaminC} unit="mg" />
              )}
              {displayNutrition.vitaminD !== undefined && displayNutrition.vitaminD > 0 && (
                <DetailRow label="Vitamin D" value={displayNutrition.vitaminD} unit="mcg" />
              )}
              {displayNutrition.vitaminE !== undefined && displayNutrition.vitaminE > 0 && (
                <DetailRow label="Vitamin E" value={displayNutrition.vitaminE} unit="mg" />
              )}
            </DetailedSection>
          )}

          {/* Minerals */}
          {(displayNutrition.calcium || displayNutrition.iron || displayNutrition.potassium) && (
            <DetailedSection title="Minerals">
              {displayNutrition.calcium !== undefined && displayNutrition.calcium > 0 && (
                <DetailRow label="Calcium" value={displayNutrition.calcium} unit="mg" />
              )}
              {displayNutrition.iron !== undefined && displayNutrition.iron > 0 && (
                <DetailRow label="Iron" value={displayNutrition.iron} unit="mg" />
              )}
              {displayNutrition.potassium !== undefined && displayNutrition.potassium > 0 && (
                <DetailRow label="Potassium" value={displayNutrition.potassium} unit="mg" />
              )}
              {displayNutrition.magnesium !== undefined && displayNutrition.magnesium > 0 && (
                <DetailRow label="Magnesium" value={displayNutrition.magnesium} unit="mg" />
              )}
              {displayNutrition.zinc !== undefined && displayNutrition.zinc > 0 && (
                <DetailRow label="Zinc" value={displayNutrition.zinc} unit="mg" />
              )}
            </DetailedSection>
          )}
        </Box>
      </Collapse>
    </Box>
  )
}

// Helper Components

const MacroStat: React.FC<{
  icon: string
  label: string
  value: number
  unit: string
  color: string
}> = ({ icon, label, value, unit, color }) => {
  return (
    <Stat textAlign="center">
      <Text fontSize="2xl" mb={1}>
        {icon}
      </Text>
      <StatNumber fontSize="xl" color={color}>
        {value.toFixed(0)}
        <Text as="span" fontSize="xs" color="gray.500">
          {unit}
        </Text>
      </StatNumber>
      <StatLabel fontSize="xs" color="gray.500">
        {label}
      </StatLabel>
    </Stat>
  )
}

const NutrientProgress: React.FC<{
  icon: string
  label: string
  amount: number
  unit: string
  percent: number
  color: string
}> = ({ icon, label, amount, unit, percent, color }) => {
  return (
    <Box width="full">
      <HStack justify="space-between" mb={1}>
        <HStack spacing={2}>
          <Text>{icon}</Text>
          <Text fontSize="sm" fontWeight="medium">
            {label}
          </Text>
        </HStack>
        <Text fontSize="sm" fontWeight="bold">
          {amount.toFixed(1)}
          {unit}
        </Text>
      </HStack>
      <Progress value={percent} size="sm" colorScheme={color.split('.')[0] as any} borderRadius="full" />
      <Text fontSize="xs" color="gray.500" mt={1}>
        {Math.round(percent)}% of daily value
      </Text>
    </Box>
  )
}

const DetailedSection: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => {
  return (
    <Box mb={4}>
      <Text fontSize="sm" fontWeight="bold" mb={2} color="gray.600">
        {title}
      </Text>
      <VStack spacing={1} align="stretch">
        {children}
      </VStack>
    </Box>
  )
}

const DetailRow: React.FC<{
  label: string
  value: number
  unit: string
}> = ({ label, value, unit }) => {
  return (
    <HStack justify="space-between" fontSize="sm">
      <Text color="gray.600">{label}</Text>
      <Text fontWeight="medium">
        {value.toFixed(1)} {unit}
      </Text>
    </HStack>
  )
}

export default NutritionFactsLabelModern
