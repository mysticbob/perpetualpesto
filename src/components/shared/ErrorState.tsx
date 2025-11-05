import { VStack, Text, Button, Alert, AlertIcon, AlertTitle, AlertDescription, Box } from '@chakra-ui/react'

interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
  minHeight?: string
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  minHeight = '300px'
}: ErrorStateProps) {
  return (
    <VStack
      spacing={4}
      justify="center"
      align="center"
      minH={minHeight}
      py={8}
      px={6}
    >
      <Alert
        status="error"
        variant="subtle"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        textAlign="center"
        borderRadius="xl"
        maxW="md"
        py={8}
      >
        <AlertIcon boxSize="40px" mr={0} />
        <AlertTitle mt={4} mb={1} fontSize="lg">
          {title}
        </AlertTitle>
        <AlertDescription maxWidth="sm" fontSize="sm">
          {message}
        </AlertDescription>
        {onRetry && (
          <Button
            colorScheme="red"
            size="sm"
            onClick={onRetry}
            mt={4}
          >
            Try Again
          </Button>
        )}
      </Alert>
    </VStack>
  )
}
