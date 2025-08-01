import { ReactNode } from 'react'
import { Box, Spinner, VStack, Text } from '@chakra-ui/react'
import { useAuth } from '../contexts/AuthContext'
import LoginPage from './LoginPage'

interface ProtectedRouteProps {
  children: ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { currentUser, loading } = useAuth()

  if (loading) {
    return (
      <Box minH="100vh" display="flex" alignItems="center" justifyContent="center">
        <VStack spacing={4}>
          <Box
            w="80px"
            h="80px"
            borderRadius="xl"
            bg="#38BDAF"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Text fontSize="2xl" fontWeight="bold" color="white">
              🍽️
            </Text>
          </Box>
          <Spinner size="lg" color="#38BDAF" />
          <Text color="gray.600">Loading your recipes...</Text>
        </VStack>
      </Box>
    )
  }

  if (!currentUser) {
    return <LoginPage />
  }

  return <>{children}</>
}