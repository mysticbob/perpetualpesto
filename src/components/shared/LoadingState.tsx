import { Center, Spinner, VStack, Text } from '@chakra-ui/react'

interface LoadingStateProps {
  message?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  minHeight?: string
}

export function LoadingState({
  message = 'Loading...',
  size = 'xl',
  minHeight = '200px'
}: LoadingStateProps) {
  return (
    <Center minH={minHeight} py={8}>
      <VStack spacing={4}>
        <Spinner
          size={size}
          thickness="4px"
          speed="0.65s"
          color="brand.primary"
        />
        <Text color="text.secondary" fontSize="sm">
          {message}
        </Text>
      </VStack>
    </Center>
  )
}
