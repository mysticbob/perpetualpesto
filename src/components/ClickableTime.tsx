import { Text, Box } from '@chakra-ui/react'
import { useTimers } from '../contexts/TimerContext'

interface ClickableTimeProps {
  text: string
  recipeStep?: number
  recipeName?: string
}

export default function ClickableTime({ text, recipeStep, recipeName }: ClickableTimeProps) {
  const { addTimer, startTimer } = useTimers()

  // Regex to match time patterns like "15 minutes", "2 hours", "30 mins", "1 hr", etc.
  const timePattern = /(\d+(?:\.\d+)?)\s*(minute[s]?|min[s]?|hour[s]?|hr[s]?)/gi

  const handleTimeClick = (timeText: string, minutes: number) => {
    const timerName = `${timeText}${recipeStep ? ` (Step ${recipeStep})` : ''}`
    const timerId = addTimer(timerName, minutes, recipeStep, recipeName)
    startTimer(timerId)
  }

  const parseTimeToMinutes = (value: number, unit: string): number => {
    const normalizedUnit = unit.toLowerCase()
    if (normalizedUnit.startsWith('hour') || normalizedUnit.startsWith('hr')) {
      return value * 60
    }
    return value // minutes
  }

  const renderTextWithClickableTimes = () => {
    const parts = []
    let lastIndex = 0
    let match

    // Create a new regex instance for each use
    const regex = new RegExp(timePattern.source, timePattern.flags)

    while ((match = regex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {text.slice(lastIndex, match.index)}
          </span>
        )
      }

      // Add the clickable time
      const fullMatch = match[0]
      const value = parseFloat(match[1])
      const unit = match[2]
      const minutes = parseTimeToMinutes(value, unit)

      parts.push(
        <Box
          key={`time-${match.index}`}
          as="span"
          color="#38BDAF"
          fontWeight="semibold"
          cursor="pointer"
          textDecoration="underline"
          _hover={{ 
            color: '#2da89c',
            textDecoration: 'underline'
          }}
          onClick={() => handleTimeClick(fullMatch, minutes)}
          title={`Click to start a ${minutes} minute timer`}
        >
          {fullMatch}
        </Box>
      )

      lastIndex = regex.lastIndex
    }

    // Add remaining text after the last match
    if (lastIndex < text.length) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {text.slice(lastIndex)}
        </span>
      )
    }

    return parts.length > 0 ? parts : text
  }

  return (
    <Text as="span">
      {renderTextWithClickableTimes()}
    </Text>
  )
}