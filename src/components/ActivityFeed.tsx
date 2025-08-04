import {
  Box,
  VStack,
  HStack,
  Text,
  Avatar,
  Badge,
  List,
  ListItem,
  useColorModeValue,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Divider
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'

interface ActivityItem {
  id: string
  action: string
  itemName?: string
  oldValue?: string
  newValue?: string
  user: {
    id: string
    name: string
    email: string
    avatar?: string
  }
  createdAt: string
}

interface ActivityFeedProps {
  pantryLocationId: string
  userId: string
  isVisible?: boolean
}

export default function ActivityFeed({ pantryLocationId, userId, isVisible = false }: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(false)

  const cardBg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.700')
  const mutedColor = useColorModeValue('gray.600', 'gray.400')

  const fetchActivities = async () => {
    if (!isVisible) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/pantry/activity/${pantryLocationId}?userId=${userId}`)
      if (response.ok) {
        const data = await response.json()
        setActivities(data.activities)
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchActivities()
  }, [pantryLocationId, userId, isVisible])

  const getActionText = (activity: ActivityItem) => {
    switch (activity.action) {
      case 'ITEM_ADDED':
        return `added ${activity.itemName}`
      case 'ITEM_UPDATED':
        return `updated ${activity.itemName}`
      case 'ITEM_DELETED':
        return `removed ${activity.itemName}`
      default:
        return activity.action.toLowerCase().replace('_', ' ')
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'ITEM_ADDED': return 'green'
      case 'ITEM_UPDATED': return 'blue'
      case 'ITEM_DELETED': return 'red'
      default: return 'gray'
    }
  }

  if (!isVisible || loading) {
    return null
  }

  if (activities.length === 0) {
    return (
      <Card bg={cardBg} borderColor={borderColor} size="sm">
        <CardHeader pb={2}>
          <Heading size="sm">Recent Activity</Heading>
        </CardHeader>
        <CardBody pt={0}>
          <Text fontSize="sm" color={mutedColor} fontStyle="italic">
            No recent activity
          </Text>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card bg={cardBg} borderColor={borderColor} size="sm">
      <CardHeader pb={2}>
        <HStack justify="space-between">
          <Heading size="sm">Recent Activity</Heading>
          <Badge variant="outline" colorScheme="gray">
            {activities.length} items
          </Badge>
        </HStack>
      </CardHeader>
      <Divider />
      <CardBody pt={3}>
        <List spacing={3}>
          {activities.slice(0, 10).map((activity, index) => (
            <ListItem key={activity.id}>
              <HStack spacing={3} align="start">
                <Avatar 
                  size="xs" 
                  name={activity.user.name || activity.user.email} 
                  src={activity.user.avatar}
                />
                <VStack align="start" spacing={1} flex={1}>
                  <HStack spacing={2} align="center">
                    <Text fontSize="sm" fontWeight="medium">
                      {activity.user.name || activity.user.email}
                    </Text>
                    <Badge 
                      size="xs" 
                      colorScheme={getActionColor(activity.action)}
                      textTransform="lowercase"
                    >
                      {activity.action.replace('ITEM_', '').toLowerCase()}
                    </Badge>
                  </HStack>
                  <Text fontSize="sm" color={mutedColor}>
                    {getActionText(activity)}
                    {activity.newValue && activity.oldValue !== activity.newValue && (
                      <>
                        {activity.oldValue && (
                          <Text as="span" textDecoration="line-through" opacity={0.6}>
                            {' '}({activity.oldValue})
                          </Text>
                        )}
                        <Text as="span" fontWeight="medium">
                          {' '}({activity.newValue})
                        </Text>
                      </>
                    )}
                  </Text>
                  <Text fontSize="xs" color={mutedColor}>
                    {new Date(activity.createdAt).toLocaleString()}
                  </Text>
                </VStack>
              </HStack>
              {index < Math.min(activities.length, 10) - 1 && <Divider mt={3} />}
            </ListItem>
          ))}
        </List>
      </CardBody>
    </Card>
  )
}