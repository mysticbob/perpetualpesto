/**
 * UsageIndicator Component
 * Shows resource usage with visual progress bars
 */

import React from 'react'
import {
  Box,
  VStack,
  HStack,
  Text,
  Progress,
  Badge,
  Tooltip,
  Icon,
  useColorModeValue,
  Button,
  Collapse,
  useDisclosure,
} from '@chakra-ui/react'
import { WarningIcon, InfoIcon, CheckCircleIcon } from '@chakra-ui/icons'
import { IconType } from 'react-icons'
import { useCreateCheckout } from '../../hooks/useBilling'

interface UsageIndicatorProps {
  label: string
  used: number
  limit: number
  icon?: IconType
  showUpgradePrompt?: boolean
  compact?: boolean
}

export const UsageIndicator: React.FC<UsageIndicatorProps> = ({
  label,
  used,
  limit,
  icon,
  showUpgradePrompt = true,
  compact = false,
}) => {
  const bgColor = useColorModeValue('gray.50', 'gray.700')
  const borderColor = useColorModeValue('gray.200', 'gray.600')
  const { isOpen, onToggle } = useDisclosure()
  const createCheckout = useCreateCheckout()
  
  // Calculate percentage
  const isUnlimited = limit === -1
  const percentage = isUnlimited ? 0 : Math.min((used / limit) * 100, 100)
  const remaining = isUnlimited ? Infinity : Math.max(limit - used, 0)
  
  // Determine status
  const getStatus = () => {
    if (isUnlimited) return 'unlimited'
    if (percentage >= 100) return 'exceeded'
    if (percentage >= 90) return 'critical'
    if (percentage >= 75) return 'warning'
    return 'normal'
  }
  
  const status = getStatus()
  
  // Color schemes based on status
  const colorSchemes = {
    normal: 'green',
    warning: 'yellow',
    critical: 'orange',
    exceeded: 'red',
    unlimited: 'purple',
  }
  
  const progressColors = {
    normal: 'green',
    warning: 'yellow',
    critical: 'orange',
    exceeded: 'red',
    unlimited: 'purple',
  }
  
  const statusIcons = {
    normal: CheckCircleIcon,
    warning: InfoIcon,
    critical: WarningIcon,
    exceeded: WarningIcon,
    unlimited: CheckCircleIcon,
  }
  
  const statusMessages = {
    normal: `${remaining} ${label.toLowerCase()} remaining`,
    warning: `Only ${remaining} ${label.toLowerCase()} left`,
    critical: `Almost at limit! ${remaining} left`,
    exceeded: 'Limit reached - upgrade required',
    unlimited: 'Unlimited usage',
  }

  const handleUpgrade = () => {
    // Determine which plan to suggest based on current usage
    const suggestedPlan = limit <= 50 ? 'small' : 'family'
    createCheckout.mutate({ planTier: suggestedPlan })
  }

  if (compact) {
    return (
      <Tooltip
        label={
          <VStack align="start" spacing={1}>
            <Text fontWeight="bold">{label}</Text>
            <Text>{isUnlimited ? 'Unlimited' : `${used} / ${limit} used`}</Text>
            <Text fontSize="xs">{statusMessages[status]}</Text>
          </VStack>
        }
        placement="top"
        hasArrow
      >
        <HStack spacing={2}>
          {icon && <Icon as={icon} boxSize={4} />}
          <Text fontSize="sm" fontWeight="medium">{label}</Text>
          <Badge colorScheme={colorSchemes[status]} fontSize="xs">
            {isUnlimited ? '∞' : `${used}/${limit}`}
          </Badge>
        </HStack>
      </Tooltip>
    )
  }

  return (
    <Box
      bg={bgColor}
      p={4}
      borderRadius="md"
      borderWidth="1px"
      borderColor={borderColor}
      transition="all 0.2s"
      _hover={{ shadow: 'md' }}
    >
      <VStack spacing={3} align="stretch">
        {/* Header */}
        <HStack justify="space-between">
          <HStack spacing={2}>
            {icon && <Icon as={icon} boxSize={5} />}
            <Text fontWeight="semibold">{label}</Text>
          </HStack>
          <HStack spacing={2}>
            <Badge colorScheme={colorSchemes[status]} fontSize="sm">
              {isUnlimited ? 'Unlimited' : `${used} / ${limit}`}
            </Badge>
            <Icon
              as={statusIcons[status]}
              color={`${colorSchemes[status]}.500`}
              boxSize={4}
            />
          </HStack>
        </HStack>

        {/* Progress Bar */}
        {!isUnlimited && (
          <Progress
            value={percentage}
            size="sm"
            colorScheme={progressColors[status]}
            borderRadius="full"
            hasStripe={status === 'exceeded'}
            isAnimated={status === 'exceeded'}
          />
        )}

        {/* Status Message */}
        <HStack justify="space-between" align="center">
          <Text fontSize="sm" color="gray.500">
            {statusMessages[status]}
          </Text>
          {!isUnlimited && percentage > 0 && (
            <Text fontSize="xs" color="gray.400">
              {percentage.toFixed(0)}% used
            </Text>
          )}
        </HStack>

        {/* Upgrade Prompt */}
        {showUpgradePrompt && status === 'exceeded' && (
          <Box
            bg={useColorModeValue('red.50', 'red.900')}
            p={3}
            borderRadius="md"
            borderWidth="1px"
            borderColor={useColorModeValue('red.200', 'red.700')}
          >
            <VStack spacing={2} align="stretch">
              <Text fontSize="sm" fontWeight="medium">
                You've reached your {label.toLowerCase()} limit
              </Text>
              <Text fontSize="xs" color="gray.600">
                Upgrade your plan to add more {label.toLowerCase()} and unlock additional features.
              </Text>
              <Button
                size="sm"
                colorScheme="red"
                onClick={handleUpgrade}
                isLoading={createCheckout.isPending}
              >
                Upgrade Now
              </Button>
            </VStack>
          </Box>
        )}

        {/* Warning for high usage */}
        {showUpgradePrompt && (status === 'warning' || status === 'critical') && (
          <Collapse in={isOpen} animateOpacity>
            <Box
              bg={useColorModeValue('yellow.50', 'yellow.900')}
              p={3}
              borderRadius="md"
              borderWidth="1px"
              borderColor={useColorModeValue('yellow.200', 'yellow.700')}
            >
              <VStack spacing={2} align="stretch">
                <Text fontSize="sm" fontWeight="medium">
                  Running low on {label.toLowerCase()}
                </Text>
                <Text fontSize="xs" color="gray.600">
                  Consider upgrading to avoid interruptions when you reach the limit.
                </Text>
                <Button
                  size="sm"
                  colorScheme="yellow"
                  variant="outline"
                  onClick={handleUpgrade}
                  isLoading={createCheckout.isPending}
                >
                  View Upgrade Options
                </Button>
              </VStack>
            </Box>
          </Collapse>
        )}

        {/* Toggle for warnings */}
        {showUpgradePrompt && (status === 'warning' || status === 'critical') && (
          <Button
            size="xs"
            variant="ghost"
            onClick={onToggle}
            alignSelf="center"
          >
            {isOpen ? 'Hide' : 'Show'} upgrade options
          </Button>
        )}
      </VStack>
    </Box>
  )
}

interface UsageIndicatorGroupProps {
  items: Array<{
    label: string
    used: number
    limit: number
    icon?: IconType
  }>
  title?: string
  compact?: boolean
}

export const UsageIndicatorGroup: React.FC<UsageIndicatorGroupProps> = ({
  items,
  title,
  compact = false,
}) => {
  const bgColor = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')

  return (
    <Box
      bg={bgColor}
      borderWidth="1px"
      borderColor={borderColor}
      borderRadius="lg"
      p={6}
      shadow="sm"
    >
      <VStack spacing={4} align="stretch">
        {title && (
          <Text fontSize="lg" fontWeight="semibold">
            {title}
          </Text>
        )}
        
        {compact ? (
          <HStack spacing={6} wrap="wrap">
            {items.map((item) => (
              <UsageIndicator
                key={item.label}
                {...item}
                compact={true}
                showUpgradePrompt={false}
              />
            ))}
          </HStack>
        ) : (
          <VStack spacing={4} align="stretch">
            {items.map((item) => (
              <UsageIndicator
                key={item.label}
                {...item}
                showUpgradePrompt={true}
              />
            ))}
          </VStack>
        )}
      </VStack>
    </Box>
  )
}