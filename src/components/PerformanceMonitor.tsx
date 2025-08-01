import { useEffect, useState } from 'react'
import {
  Box,
  Text,
  Badge,
  HStack,
  Collapse,
  IconButton,
  VStack
} from '@chakra-ui/react'
import { InfoIcon } from './icons/CustomIcons'

interface PerformanceMetrics {
  apiCalls: Array<{
    url: string
    duration: number
    timestamp: number
    status: number
  }>
  pageLoadTime: number
  renderTime: number
}

export default function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    apiCalls: [],
    pageLoadTime: 0,
    renderTime: 0
  })
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Only show in development
    if (process.env.NODE_ENV !== 'development') return

    // Measure page load time
    const loadTime = performance.now()
    setMetrics(prev => ({ ...prev, pageLoadTime: loadTime }))

    // Intercept fetch calls to monitor API performance
    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      const startTime = performance.now()
      const url = args[0].toString()
      
      try {
        const response = await originalFetch(...args)
        const endTime = performance.now()
        
        setMetrics(prev => ({
          ...prev,
          apiCalls: [...prev.apiCalls.slice(-9), {
            url: url.replace(window.location.origin, ''),
            duration: endTime - startTime,
            timestamp: Date.now(),
            status: response.status
          }]
        }))
        
        return response
      } catch (error) {
        const endTime = performance.now()
        
        setMetrics(prev => ({
          ...prev,
          apiCalls: [...prev.apiCalls.slice(-9), {
            url: url.replace(window.location.origin, ''),
            duration: endTime - startTime,
            timestamp: Date.now(),
            status: 0
          }]
        }))
        
        throw error
      }
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [])

  // Don't render in production
  if (process.env.NODE_ENV !== 'development') return null

  const avgApiTime = metrics.apiCalls.length > 0 
    ? metrics.apiCalls.reduce((sum, call) => sum + call.duration, 0) / metrics.apiCalls.length
    : 0

  return (
    <Box
      position="fixed"
      bottom={4}
      right={4}
      bg="white"
      border="1px solid"
      borderColor="gray.200"
      borderRadius="md"
      shadow="lg"
      zIndex={1000}
      minW="200px"
    >
      <HStack p={2} justify="space-between">
        <Text fontSize="sm" fontWeight="bold">Performance</Text>
        <IconButton
          aria-label="Toggle performance metrics"
          icon={<InfoIcon />}
          size="xs"
          variant="ghost"
          onClick={() => setIsVisible(!isVisible)}
        />
      </HStack>
      
      <Collapse in={isVisible}>
        <VStack align="start" p={3} pt={0} spacing={2}>
          <HStack>
            <Text fontSize="xs">Page Load:</Text>
            <Badge colorScheme={metrics.pageLoadTime < 1000 ? 'green' : 'yellow'} size="sm">
              {metrics.pageLoadTime.toFixed(0)}ms
            </Badge>
          </HStack>
          
          <HStack>
            <Text fontSize="xs">Avg API:</Text>
            <Badge colorScheme={avgApiTime < 200 ? 'green' : avgApiTime < 500 ? 'yellow' : 'red'} size="sm">
              {avgApiTime.toFixed(0)}ms
            </Badge>
          </HStack>
          
          <Box>
            <Text fontSize="xs" mb={1}>Recent API Calls:</Text>
            <VStack align="start" spacing={1} maxH="150px" overflowY="auto">
              {metrics.apiCalls.slice(-5).map((call, index) => (
                <HStack key={index} fontSize="xs">
                  <Badge 
                    colorScheme={call.status === 200 ? 'green' : 'red'} 
                    size="xs"
                  >
                    {call.status}
                  </Badge>
                  <Text noOfLines={1} maxW="100px">{call.url}</Text>
                  <Badge 
                    colorScheme={call.duration < 200 ? 'green' : call.duration < 500 ? 'yellow' : 'red'}
                    size="xs"
                  >
                    {call.duration.toFixed(0)}ms
                  </Badge>
                </HStack>
              ))}
            </VStack>
          </Box>
        </VStack>
      </Collapse>
    </Box>
  )
}