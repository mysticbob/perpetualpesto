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
import { ExternalLinkIcon, CopyIcon, CheckIcon } from './icons/CustomIcons'

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
    // Create separate reminder items, one per line
    return pendingItems
      .map(item => `${item.amount || ''} ${item.name}`.trim())
      .join('\n')
  }

  const copyToClipboard = async () => {
    try {
      const formattedList = formatForReminders()
      await navigator.clipboard.writeText(formattedList)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      
      toast({
        title: 'Copied to clipboard!',
        description: `${pendingItems.length} items copied as separate reminders`,
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
    // For multiple separate reminders, we'll use the share API or copy
    shareList()
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
                  2. Tap "+" to create a new reminder
                  <br />
                  3. Paste the copied text
                  <br />
                  4. Each line will become a separate reminder automatically
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
                  4. Each line will create a separate reminder
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