import React, { useState } from 'react'
import {
  Box,
  HStack,
  Icon,
  Text,
  VStack,
  useColorModeValue,
  Tooltip
} from '@chakra-ui/react'
import { StarIcon } from '@chakra-ui/icons'

interface StarRatingProps {
  rating?: number
  maxRating?: number
  size?: 'sm' | 'md' | 'lg'
  isReadOnly?: boolean
  showValue?: boolean
  showCount?: boolean
  ratingCount?: number
  onRatingChange?: (rating: number) => void
  colorScheme?: 'yellow' | 'orange' | 'blue'
}

export default function StarRating({
  rating = 0,
  maxRating = 5,
  size = 'md',
  isReadOnly = false,
  showValue = false,
  showCount = false,
  ratingCount = 0,
  onRatingChange,
  colorScheme = 'yellow'
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [isHovering, setIsHovering] = useState(false)

  const displayRating = isHovering ? hoverRating : rating

  const sizes = {
    sm: { icon: 19.2, text: 'sm' },  // 50% larger from current (12.8 * 1.5 = 19.2)
    md: { icon: 24, text: 'md' },    // 50% larger from current (16 * 1.5 = 24)
    lg: { icon: 28.8, text: 'lg' }   // 50% larger from current (19.2 * 1.5 = 28.8)
  }

  const colors = {
    yellow: {
      filled: '#38BDAF',
      empty: useColorModeValue('#E2E8F0', '#4A5568'),
      hover: '#2da89c'
    },
    orange: {
      filled: '#38BDAF',
      empty: useColorModeValue('#E2E8F0', '#4A5568'),
      hover: '#2da89c'
    },
    blue: {
      filled: '#38BDAF',
      empty: useColorModeValue('#E2E8F0', '#4A5568'),
      hover: '#2da89c'
    }
  }

  const handleClick = (starIndex: number) => {
    if (isReadOnly || !onRatingChange) return
    const newRating = starIndex + 1
    onRatingChange(newRating)
  }

  const handleMouseEnter = (starIndex: number) => {
    if (isReadOnly) return
    setHoverRating(starIndex + 1)
    setIsHovering(true)
  }

  const handleMouseLeave = () => {
    if (isReadOnly) return
    setIsHovering(false)
    setHoverRating(0)
  }

  const renderStars = () => {
    return Array.from({ length: maxRating }, (_, index) => {
      const isFilled = index < displayRating
      const isHalfFilled = !Number.isInteger(displayRating) && index === Math.floor(displayRating)
      
      return (
        <Box
          key={index}
          cursor={isReadOnly ? 'default' : 'pointer'}
          onClick={() => handleClick(index)}
          onMouseEnter={() => handleMouseEnter(index)}
          onMouseLeave={handleMouseLeave}
          transition="transform 0.1s ease"
          _hover={!isReadOnly ? { transform: 'scale(1.1)' } : {}}
        >
          <Icon
            as={StarIcon}
            w={sizes[size].icon}
            h={sizes[size].icon}
            color={
              isFilled
                ? isHovering && !isReadOnly
                  ? colors[colorScheme].hover
                  : colors[colorScheme].filled
                : colors[colorScheme].empty
            }
            transition="color 0.2s ease"
          />
        </Box>
      )
    })
  }

  const formatRating = (value: number) => {
    return Number.isInteger(value) ? value.toString() : value.toFixed(1)
  }

  return (
    <HStack spacing={2} align="center">
      <HStack spacing={1} onMouseLeave={handleMouseLeave}>
        {renderStars()}
      </HStack>
      
      {(showValue || showCount) && (
        <VStack spacing={0} align="start">
          {showValue && (
            <Text fontSize={sizes[size].text} fontWeight="medium" color="gray.600">
              {displayRating > 0 ? formatRating(displayRating) : 'Not rated'}
            </Text>
          )}
          {showCount && ratingCount > 0 && (
            <Text fontSize="xs" color="gray.500">
              {ratingCount} {ratingCount === 1 ? 'rating' : 'ratings'}
            </Text>
          )}
        </VStack>
      )}
    </HStack>
  )
}

// Compact version for inline display
export function CompactStarRating({
  rating = 0,
  ratingCount = 0,
  size = 'sm',
  isInteractive = false,
  onRatingChange
}: {
  rating?: number
  ratingCount?: number
  size?: 'sm' | 'md'
  isInteractive?: boolean
  onRatingChange?: (rating: number) => void
}) {
  const iconSize = size === 'sm' ? 16.8 : 19.2  // 50% larger from current (11.2 * 1.5 = 16.8, 12.8 * 1.5 = 19.2)
  const textSize = size === 'sm' ? 'xs' : 'sm'
  const maxRating = 5
  
  const handleStarClick = (starIndex: number) => {
    if (isInteractive && onRatingChange) {
      onRatingChange(starIndex + 1)
    }
  }
  
  const renderStars = () => {
    return Array.from({ length: maxRating }, (_, index) => {
      const isFilled = index < Math.floor(rating)
      const isPartiallyFilled = index === Math.floor(rating) && rating % 1 !== 0
      
      return (
        <Box
          key={index}
          cursor={isInteractive ? 'pointer' : 'default'}
          onClick={() => handleStarClick(index)}
          transition="transform 0.1s ease"
          _hover={isInteractive ? { transform: 'scale(1.1)' } : {}}
        >
          <Icon
            as={StarIcon}
            w={iconSize}
            h={iconSize}
            color={isFilled || isPartiallyFilled ? '#38BDAF' : useColorModeValue('#E2E8F0', '#4A5568')}
          />
        </Box>
      )
    })
  }
  
  return (
    <HStack spacing={0.5}>
      {renderStars()}
    </HStack>
  )
}

// Interactive rating component for prompting user ratings
export function RatingPrompt({
  onSubmit,
  initialRating = 0,
  title = "Rate this recipe",
  subtitle = "How did you like it?"
}: {
  onSubmit: (rating: number, review?: string) => void
  initialRating?: number
  title?: string
  subtitle?: string
}) {
  const [rating, setRating] = useState(initialRating)
  const [review, setReview] = useState('')

  const ratingLabels = {
    1: 'Poor',
    2: 'Fair', 
    3: 'Good',
    4: 'Very Good',
    5: 'Excellent'
  }

  const handleSubmit = () => {
    if (rating > 0) {
      onSubmit(rating, review.trim() || undefined)
    }
  }

  return (
    <VStack spacing={4} align="center" p={4} bg="gray.50" borderRadius="md">
      <VStack spacing={2} align="center">
        <Text fontSize="lg" fontWeight="bold" color="gray.800">
          {title}
        </Text>
        <Text fontSize="sm" color="gray.600">
          {subtitle}
        </Text>
      </VStack>

      <VStack spacing={2} align="center">
        <StarRating
          rating={rating}
          size="lg"
          onRatingChange={setRating}
          colorScheme="yellow"
        />
        {rating > 0 && (
          <Text fontSize="sm" color="gray.600" fontWeight="medium">
            {ratingLabels[rating as keyof typeof ratingLabels]}
          </Text>
        )}
      </VStack>

      {rating > 0 && (
        <Box w="full">
          <textarea
            placeholder="Add a review (optional)..."
            value={review}
            onChange={(e) => setReview(e.target.value)}
            style={{
              width: '100%',
              minHeight: '60px',
              padding: '8px',
              border: '1px solid #E2E8F0',
              borderRadius: '6px',
              fontSize: '14px',
              resize: 'vertical'
            }}
          />
        </Box>
      )}

      <Box>
        <button
          onClick={handleSubmit}
          disabled={rating === 0}
          style={{
            padding: '8px 16px',
            backgroundColor: rating > 0 ? '#38BDAF' : '#E2E8F0',
            color: rating > 0 ? 'white' : '#A0AEC0',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: rating > 0 ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s ease'
          }}
        >
          Submit Rating
        </button>
      </Box>
    </VStack>
  )
}