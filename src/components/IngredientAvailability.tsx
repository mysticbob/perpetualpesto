import React from 'react'
import {
  Box,
  Tooltip,
  Text,
  VStack,
  HStack,
  Badge
} from '@chakra-ui/react'
import { CheckIcon, SnowflakeIcon, CloseIcon } from './icons/CustomIcons'
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
  
  console.log(`🎯 Availability check for "${ingredientName}":`, availability)
  
  // Show red X for items not in pantry
  if (!availability.available) {
    return (
      <HStack spacing={1}>
        <Tooltip
          label={`"${ingredientName}" is not in your pantry`}
          placement="top"
          hasArrow
          bg="red.800"
          color="white"
          fontSize="sm"
          borderRadius="md"
        >
          <Box
            w="20px"
            h="20px"
            bg="red.500"
            borderRadius="full"
            display="flex"
            alignItems="center"
            justifyContent="center"
            cursor="help"
            _hover={{ bg: 'red.600' }}
            transition="background-color 0.2s"
          >
            <CloseIcon w="10px" h="10px" color="white" />
          </Box>
        </Tooltip>
      </HStack>
    )
  }

  const tooltipContent = (
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
  )

  const isFrozen = availability.item?.location === 'freezer'

  return (
    <HStack spacing={1}>
      <Tooltip
        label={tooltipContent}
        placement="top"
        hasArrow
        bg="gray.800"
        color="white"
        fontSize="sm"
        borderRadius="md"
        p={0}
      >
        <Box
          w="20px"
          h="20px"
          bg="green.500"
          borderRadius="full"
          display="flex"
          alignItems="center"
          justifyContent="center"
          cursor="help"
          _hover={{ bg: 'green.600' }}
          transition="background-color 0.2s"
        >
          <CheckIcon w="12px" h="12px" color="white" />
        </Box>
      </Tooltip>
      
      {isFrozen && (
        <Tooltip
          label="This item is in your freezer"
          placement="top"
          hasArrow
          bg="blue.800"
          color="white"
          fontSize="sm"
        >
          <Box
            w="20px"
            h="20px"
            bg="blue.500"
            borderRadius="full"
            display="flex"
            alignItems="center"
            justifyContent="center"
            cursor="help"
            _hover={{ bg: 'blue.600' }}
            transition="background-color 0.2s"
          >
            <SnowflakeIcon w="12px" h="12px" color="white" />
          </Box>
        </Tooltip>
      )}
    </HStack>
  )
}