import {
  Button,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Text,
  VStack,
  Code,
  HStack,
  IconButton,
  useDisclosure
} from '@chakra-ui/react'
import { useState } from 'react'
import { ExternalLinkIcon, CopyIcon, CheckIcon } from '@chakra-ui/icons'

interface GroceryItem {
  id: string
  name: string
  amount?: string
  category?: string
  completed: boolean
}

interface ExportToRemindersProps {
  items: GroceryItem[]
  recipeName?: string
}

export default function ExportToReminders({ items, recipeName }: ExportToRemindersProps) {
  const [copied, setCopied] = useState(false)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const toast = useToast()

  const pendingItems = items.filter(item => !item.completed)

  const formatForReminders = () => {
    const title = recipeName ? `${recipeName} - Grocery List` : 'Grocery List'
    const itemsList = pendingItems
      .map(item => `• ${item.amount || ''} ${item.name}`.trim())
      .join('\n')
    
    return `${title}\n\n${itemsList}`
  }

  const copyToClipboard = async () => {
    try {
      const formattedList = formatForReminders()
      await navigator.clipboard.writeText(formattedList)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      
      toast({
        title: 'Copied to clipboard!',
        description: 'Now you can paste this into the Reminders app',
        status: 'success',
        duration: 3000,
      })
    } catch (error) {
      toast({
        title: 'Copy failed',
        description: 'Please try selecting and copying the text manually',
        status: 'error',
        duration: 3000,
      })
    }
  }

  const shareList = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: recipeName ? `${recipeName} - Grocery List` : 'Grocery List',
          text: formatForReminders()
        })
      } catch (error) {
        // User cancelled or share failed, fall back to copy
        copyToClipboard()
      }
    } else {
      // Share API not supported, use copy
      copyToClipboard()
    }
  }

  const openRemindersApp = () => {
    // Try to open Reminders app (iOS/macOS)
    const reminderText = pendingItems
      .map(item => `${item.amount || ''} ${item.name}`.trim())
      .join(', ')
    
    const title = recipeName ? `${recipeName} Groceries` : 'Grocery List'
    
    // iOS Reminders URL scheme
    const iosUrl = `x-apple-reminderkit://REMCDReminder?title=${encodeURIComponent(title)}&notes=${encodeURIComponent(reminderText)}`
    
    // Try to open, fallback to instructions
    try {
      window.open(iosUrl, '_blank')
      setTimeout(() => {
        // If still here after 1 second, probably didn't work
        onOpen()
      }, 1000)
    } catch (error) {
      onOpen()
    }
  }

  if (pendingItems.length === 0) {
    return (
      <Button size="sm" variant="outline" isDisabled>
        No items to export
      </Button>
    )
  }

  return (
    <>
      <HStack spacing={2}>
        <Button
          size="sm"
          variant="outline"
          leftIcon={<ExternalLinkIcon />}
          onClick={shareList}
        >
          Export to Reminders
        </Button>
        
        <IconButton
          aria-label="Copy to clipboard"
          icon={copied ? <CheckIcon /> : <CopyIcon />}
          size="sm"
          variant="ghost"
          colorScheme={copied ? 'green' : 'gray'}
          onClick={copyToClipboard}
        />
      </HStack>

      {/* Instructions Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Export to Reminders</ModalHeader>
          <ModalCloseButton />
          
          <ModalBody>
            <VStack spacing={4} align="start">
              <Text>
                Your grocery list has been copied to the clipboard. Here's how to add it to Reminders:
              </Text>
              
              <VStack spacing={2} align="start" w="full">
                <Text fontWeight="bold">On iPhone/iPad:</Text>
                <Text fontSize="sm">
                  1. Open the Reminders app
                  <br />
                  2. Tap "+" to create a new list or reminder
                  <br />
                  3. Paste the copied text
                  <br />
                  4. Each item will become a separate reminder
                </Text>
              </VStack>

              <VStack spacing={2} align="start" w="full">
                <Text fontWeight="bold">On Mac:</Text>
                <Text fontSize="sm">
                  1. Open Reminders app
                  <br />
                  2. Click "+" to add a new reminder
                  <br />
                  3. Paste the copied text
                  <br />
                  4. Press Enter to create multiple reminders
                </Text>
              </VStack>

              <Text fontSize="sm" color="gray.600">
                Preview of copied text:
              </Text>
              <Code p={3} w="full" fontSize="xs" whiteSpace="pre-wrap">
                {formatForReminders()}
              </Code>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button onClick={onClose}>Got it!</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}