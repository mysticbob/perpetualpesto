import { VStack, Text, Button, Icon, Box } from '@chakra-ui/react'
import { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  minHeight?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  minHeight = '300px'
}: EmptyStateProps) {
  return (
    <VStack
      spacing={4}
      justify="center"
      align="center"
      minH={minHeight}
      py={12}
      px={6}
      textAlign="center"
    >
      {icon && (
        <Box fontSize="5xl" opacity={0.5} color="text.muted">
          {icon}
        </Box>
      )}
      <VStack spacing={2}>
        <Text fontSize="xl" fontWeight="semibold" color="text.primary">
          {title}
        </Text>
        {description && (
          <Text fontSize="sm" color="text.secondary" maxW="md">
            {description}
          </Text>
        )}
      </VStack>
      {action && (
        <Button
          colorScheme="brand"
          size="md"
          onClick={action.onClick}
          mt={2}
        >
          {action.label}
        </Button>
      )}
    </VStack>
  )
}
