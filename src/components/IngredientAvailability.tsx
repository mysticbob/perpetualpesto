import React from 'react'
import {
  Box,
  Tooltip,
  Text,
  VStack,
  HStack,
  Badge
} from '@chakra-ui/react'
import { CheckIcon, SnowflakeIcon, CloseIcon, HazardIcon } from './icons/CustomIcons'
import { usePantry } from '../contexts/PantryContext'
import { usePreferences } from '../contexts/PreferencesContext'
import { formatIngredientAmount } from '../utils/units'

interface IngredientAvailabilityProps {
  ingredientName: string
  neededAmount?: string
  neededUnit?: string
}

export default function IngredientAvailability({ 
  ingredientName, 
  neededAmount, 
  neededUnit 
}: IngredientAvailabilityProps) {
  const { getItemAvailability, pantryData } = usePantry()
  const { preferences } = usePreferences()
  
  // Re-calculate availability whenever pantry data changes
  const availability = React.useMemo(() => {
    return getItemAvailability(ingredientName, neededAmount, neededUnit)
  }, [getItemAvailability, ingredientName, neededAmount, neededUnit, pantryData])
  
  // Determine the status of the ingredient (priority order: not available > substitution > expired > expiring > fresh)
  const ingredientStatus = React.useMemo(() => {
    if (!availability.available) {
      // Check if there's a substitution available
      if (availability.substitution?.available) {
        return { 
          type: 'substitution' as const, 
          color: 'purple.500', 
          icon: CheckIcon, 
          tooltip: `Could substitute "${availability.substitution.originalName}" with "${availability.substitution.suggestedName}"` 
        }
      }
      return { type: 'unavailable' as const, color: 'red.500', icon: CloseIcon, tooltip: `"${ingredientName}" is not in your pantry` }
    }
    
    if (!availability.item?.expirationDate) {
      // No expiration date - assume fresh
      const isFrozen = availability.item?.location === 'freezer'
      return { 
        type: 'fresh' as const, 
        color: isFrozen ? 'blue.500' : 'green.500', 
        icon: isFrozen ? SnowflakeIcon : CheckIcon, 
        tooltip: isFrozen ? 'This item is in your freezer' : 'Available in your pantry'
      }
    }
    
    const today = new Date()
    const expirationDate = new Date(availability.item.expirationDate)
    const warningZoneStart = new Date(today.getTime() + (preferences.expirationWarningDays * 24 * 60 * 60 * 1000))
    
    // Check if expired (past expiration date)
    if (expirationDate < today) {
      return { type: 'expired' as const, color: 'red.500', icon: HazardIcon, tooltip: 'This ingredient has expired' }
    }
    
    // Check if in warning zone (expires within warning period)
    if (expirationDate <= warningZoneStart) {
      return { type: 'expiring' as const, color: 'yellow.500', icon: HazardIcon, tooltip: `This ingredient expires within ${preferences.expirationWarningDays} days` }
    }
    
    // Fresh and good
    const isFrozen = availability.item?.location === 'freezer'
    return { 
      type: 'fresh' as const, 
      color: isFrozen ? 'blue.500' : 'green.500', 
      icon: isFrozen ? SnowflakeIcon : CheckIcon, 
      tooltip: isFrozen ? 'This item is in your freezer' : 'Available in your pantry'
    }
  }, [availability, preferences.expirationWarningDays, ingredientName])
  
  console.log(`🎯 Availability check for "${ingredientName}":`, availability, 'Status:', ingredientStatus)
  console.log(`📦 Item category: ${availability.item?.category || 'no category'}`)

  // Create tooltip content based on availability
  const tooltipContent = availability.available ? (
    <VStack spacing={2} align="start" p={2}>
      <HStack spacing={2}>
        <Text fontSize="sm" fontWeight="bold">
          📍 {availability.location}
        </Text>
      </HStack>
      
      <VStack spacing={1} align="start">
        <HStack spacing={2}>
          <Text fontSize="xs" color="gray.300">
            You have:
          </Text>
          <Text fontSize="xs" fontWeight="bold">
            {formatIngredientAmount(
              availability.item?.amount, 
              availability.item?.unit, 
              preferences.unitSystem
            )}
          </Text>
        </HStack>
        
        {neededAmount && neededUnit && (
          <>
            <HStack spacing={2}>
              <Text fontSize="xs" color="gray.300">
                Recipe needs:
              </Text>
              <Text fontSize="xs" fontWeight="bold">
                {formatIngredientAmount(neededAmount, neededUnit, preferences.unitSystem)}
              </Text>
            </HStack>
            
            {availability.remainingAmount && (
              <HStack spacing={2}>
                <Text fontSize="xs" color="gray.300">
                  After cooking:
                </Text>
                <Text fontSize="xs" fontWeight="bold" color="green.300">
                  {availability.remainingAmount !== 'Check amounts' 
                    ? formatIngredientAmount(
                        availability.remainingAmount.split(' ')[0], 
                        availability.remainingAmount.split(' ')[1], 
                        preferences.unitSystem
                      )
                    : availability.remainingAmount
                  }
                </Text>
              </HStack>
            )}
          </>
        )}
      </VStack>
      
      {availability.item?.category && (
        <Badge size="xs" colorScheme="blue" mt={1}>
          {availability.item.category}
        </Badge>
      )}
    </VStack>
  ) : availability.substitution?.available ? (
    <VStack spacing={2} align="start" p={2}>
      <Text fontSize="sm" fontWeight="bold" color="purple.300">
        🔄 Substitution Available
      </Text>
      
      <VStack spacing={1} align="start">
        <HStack spacing={2}>
          <Text fontSize="xs" color="gray.300">
            Recipe calls for:
          </Text>
          <Text fontSize="xs" fontWeight="bold">
            {availability.substitution.originalName}
          </Text>
        </HStack>
        
        <HStack spacing={2}>
          <Text fontSize="xs" color="gray.300">
            You have:
          </Text>
          <Text fontSize="xs" fontWeight="bold" color="purple.300">
            {availability.substitution.suggestedName}
          </Text>
        </HStack>
        
        <HStack spacing={2}>
          <Text fontSize="xs" color="gray.300">
            Location:
          </Text>
          <Text fontSize="xs" fontWeight="bold">
            📍 {pantryData.find(loc => loc.id === availability.substitution?.item.location)?.name || availability.substitution?.item.location}
          </Text>
        </HStack>
      </VStack>
      
      {availability.substitution.item.category && (
        <Badge size="xs" colorScheme="purple" mt={1}>
          {availability.substitution.item.category}
        </Badge>
      )}
    </VStack>
  ) : ingredientStatus.tooltip

  const IconComponent = ingredientStatus.icon

  return (
    <HStack spacing={1}>
      <Tooltip
        label={tooltipContent}
        placement="top"
        hasArrow
        bg={ingredientStatus.type === 'unavailable' ? 'red.800' : 
            ingredientStatus.type === 'expired' ? 'red.800' :
            ingredientStatus.type === 'expiring' ? 'yellow.800' : 'gray.800'}
        color="white"
        fontSize="sm"
        borderRadius="md"
        p={0}
      >
        <Box
          w="20px"
          h="20px"
          bg={ingredientStatus.color}
          borderRadius="full"
          display="flex"
          alignItems="center"
          justifyContent="center"
          cursor="help"
          _hover={{ 
            bg: ingredientStatus.color === 'red.500' ? 'red.600' :
                ingredientStatus.color === 'yellow.500' ? 'yellow.600' :
                ingredientStatus.color === 'blue.500' ? 'blue.600' : 'green.600'
          }}
          transition="background-color 0.2s"
        >
          <IconComponent w="12px" h="12px" color="white" />
        </Box>
      </Tooltip>
    </HStack>
  )
}