import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Box, Button, Heading, Text, VStack, Alert, AlertIcon, AlertTitle, AlertDescription } from '@chakra-ui/react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    this.setState({
      error,
      errorInfo
    })
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <>{this.props.fallback}</>
      }

      return (
        <Box p={8} maxW="container.md" mx="auto">
          <Alert
            status="error"
            variant="subtle"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            textAlign="center"
            minH="200px"
            borderRadius="lg"
          >
            <AlertIcon boxSize="40px" mr={0} />
            <AlertTitle mt={4} mb={1} fontSize="lg">
              Something went wrong
            </AlertTitle>
            <AlertDescription maxWidth="sm">
              <VStack spacing={4} mt={4}>
                <Text>
                  An unexpected error occurred. The issue has been logged and we'll look into it.
                </Text>
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <Box
                    as="details"
                    w="full"
                    p={4}
                    bg="red.50"
                    borderRadius="md"
                    fontSize="sm"
                    fontFamily="mono"
                  >
                    <summary style={{ cursor: 'pointer' }}>Error Details</summary>
                    <Text mt={2} color="red.700">
                      {this.state.error.toString()}
                    </Text>
                    {this.state.errorInfo && (
                      <Text mt={2} fontSize="xs" color="red.600" whiteSpace="pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </Text>
                    )}
                  </Box>
                )}
                <Button colorScheme="blue" onClick={this.handleReset}>
                  Try Again
                </Button>
              </VStack>
            </AlertDescription>
          </Alert>
        </Box>
      )
    }

    return this.props.children
  }
}

// Hook for using error boundary in functional components
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null)

  React.useEffect(() => {
    if (error) {
      throw error
    }
  }, [error])

  return setError
}

// HOC for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  )
}