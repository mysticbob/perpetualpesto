import {
  Box,
  Button,
  VStack,
  HStack,
  Text,
  Badge,
  Avatar,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  FormControl,
  FormLabel,
  Input,
  Select,
  Textarea,
  IconButton,
  useToast,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  List,
  ListItem,
  Divider,
  useColorModeValue,
  Tooltip,
  Card,
  CardBody,
  SimpleGrid
} from '@chakra-ui/react'
import { useState, useRef } from 'react'
import { AddIcon, DeleteIcon, EditIcon } from '@chakra-ui/icons'
import { ShareIcon } from './icons/CustomIcons'

export interface PantryLocation {
  id: string
  name: string
  owner?: {
    id: string
    name: string
    email: string
    avatar?: string
  }
  permission?: 'VIEW' | 'EDIT' | 'MANAGE'
  isOwner?: boolean
  sharedWith?: SharedUser[]
  pendingInvitations?: PendingInvitation[]
}

export interface SharedUser {
  id: string
  user: {
    id: string
    name: string
    email: string
    avatar?: string
  }
  permission: 'VIEW' | 'EDIT' | 'MANAGE'
  createdAt: string
  expiresAt?: string
}

export interface PendingInvitation {
  id: string
  invitedEmail: string
  permission: 'VIEW' | 'EDIT' | 'MANAGE'
  createdAt: string
  expiresAt: string
}

export interface SharingData {
  ownedPantries: PantryLocation[]
  sharedWithMe: {
    id: string
    pantryLocation: {
      id: string
      name: string
      owner: {
        id: string
        name: string
        email: string
        avatar?: string
      }
    }
    permission: 'VIEW' | 'EDIT' | 'MANAGE'
    sharedBy: {
      id: string
      name: string
      email: string
      avatar?: string
    }
    createdAt: string
    expiresAt?: string
  }[]
  pendingInvitations: {
    id: string
    pantryLocation: {
      id: string
      name: string
      owner: {
        id: string
        name: string
        email: string
        avatar?: string
      }
    }
    permission: 'VIEW' | 'EDIT' | 'MANAGE'
    invitedBy: {
      id: string
      name: string
      email: string
      avatar?: string
    }
    message?: string
    createdAt: string
    expiresAt: string
    token: string
  }[]
}

interface PantrySharingProps {
  pantryLocations: PantryLocation[]
  userId: string
  userEmail: string
  onSharingUpdate?: () => void
}

export default function PantrySharing({ 
  pantryLocations, 
  userId, 
  userEmail,
  onSharingUpdate 
}: PantrySharingProps) {
  const [sharingData, setSharingData] = useState<SharingData | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedPantry, setSelectedPantry] = useState<string>('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [invitePermission, setInvitePermission] = useState<'VIEW' | 'EDIT' | 'MANAGE'>('VIEW')
  const [inviteMessage, setInviteMessage] = useState('')
  const [deleteShareId, setDeleteShareId] = useState<string>('')
  const [deleteInvitationId, setDeleteInvitationId] = useState<string>('')
  
  const toast = useToast()
  const cancelRef = useRef<HTMLButtonElement>(null)
  
  const { isOpen: isShareOpen, onOpen: onShareOpen, onClose: onShareClose } = useDisclosure()
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure()
  const { isOpen: isDeleteInviteOpen, onOpen: onDeleteInviteOpen, onClose: onDeleteInviteClose } = useDisclosure()
  const { isOpen: isViewOpen, onOpen: onViewOpen, onClose: onViewClose } = useDisclosure()

  const brandColor = '#38BDAF'
  const cardBg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.700')
  const mutedColor = useColorModeValue('gray.600', 'gray.400')

  const fetchSharingData = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/sharing?userId=${userId}&userEmail=${userEmail}`)
      if (response.ok) {
        const data = await response.json()
        setSharingData(data)
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load sharing data',
          status: 'error',
          duration: 3000,
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load sharing data',
        status: 'error',
        duration: 3000,
      })
    } finally {
      setLoading(false)
    }
  }

  const sendInvitation = async () => {
    if (!selectedPantry || !inviteEmail || !invitePermission) return

    setLoading(true)
    try {
      const response = await fetch('/api/sharing/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          pantryLocationId: selectedPantry,
          invitedEmail: inviteEmail,
          permission: invitePermission,
          message: inviteMessage
        })
      })

      if (response.ok) {
        toast({
          title: 'Invitation sent!',
          description: `Sharing invitation sent to ${inviteEmail}`,
          status: 'success',
          duration: 3000,
        })
        setInviteEmail('')
        setInviteMessage('')
        setInvitePermission('VIEW')
        setSelectedPantry('')
        onShareClose()
        fetchSharingData()
        onSharingUpdate?.()
      } else {
        const error = await response.json()
        toast({
          title: 'Error',
          description: error.error || 'Failed to send invitation',
          status: 'error',
          duration: 3000,
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send invitation',
        status: 'error',
        duration: 3000,
      })
    } finally {
      setLoading(false)
    }
  }

  const updatePermissions = async (shareId: string, newPermission: 'VIEW' | 'EDIT' | 'MANAGE') => {
    setLoading(true)
    try {
      const response = await fetch('/api/sharing/permissions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          shareId,
          permission: newPermission
        })
      })

      if (response.ok) {
        toast({
          title: 'Permissions updated',
          description: 'User permissions have been updated',
          status: 'success',
          duration: 3000,
        })
        fetchSharingData()
        onSharingUpdate?.()
      } else {
        const error = await response.json()
        toast({
          title: 'Error',
          description: error.error || 'Failed to update permissions',
          status: 'error',
          duration: 3000,
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update permissions',
        status: 'error',
        duration: 3000,
      })
    } finally {
      setLoading(false)
    }
  }

  const removeAccess = async () => {
    if (!deleteShareId) return

    setLoading(true)
    try {
      const response = await fetch(`/api/sharing/share/${deleteShareId}?userId=${userId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          title: 'Access removed',
          description: 'User access has been removed',
          status: 'success',
          duration: 3000,
        })
        fetchSharingData()
        onSharingUpdate?.()
      } else {
        const error = await response.json()
        toast({
          title: 'Error',
          description: error.error || 'Failed to remove access',
          status: 'error',
          duration: 3000,
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove access',
        status: 'error',
        duration: 3000,
      })
    } finally {
      setLoading(false)
      setDeleteShareId('')
      onDeleteClose()
    }
  }

  const cancelInvitation = async () => {
    if (!deleteInvitationId) return

    setLoading(true)
    try {
      const response = await fetch(`/api/sharing/invitation/${deleteInvitationId}?userId=${userId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          title: 'Invitation cancelled',
          description: 'Invitation has been cancelled',
          status: 'success',
          duration: 3000,
        })
        fetchSharingData()
        onSharingUpdate?.()
      } else {
        const error = await response.json()
        toast({
          title: 'Error',
          description: error.error || 'Failed to cancel invitation',
          status: 'error',
          duration: 3000,
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to cancel invitation',
        status: 'error',
        duration: 3000,
      })
    } finally {
      setLoading(false)
      setDeleteInvitationId('')
      onDeleteInviteClose()
    }
  }

  const respondToInvitation = async (invitationToken: string, response: 'accept' | 'decline') => {
    setLoading(true)
    try {
      const res = await fetch('/api/sharing/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          invitationToken,
          response
        })
      })

      if (res.ok) {
        toast({
          title: response === 'accept' ? 'Invitation accepted!' : 'Invitation declined',
          description: response === 'accept' ? 'You now have access to this pantry' : 'Invitation has been declined',
          status: 'success',
          duration: 3000,
        })
        fetchSharingData()
        onSharingUpdate?.()
      } else {
        const error = await res.json()
        toast({
          title: 'Error',
          description: error.error || 'Failed to respond to invitation',
          status: 'error',
          duration: 3000,
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to respond to invitation',
        status: 'error',
        duration: 3000,
      })
    } finally {
      setLoading(false)
    }
  }

  const getPermissionColor = (permission: string) => {
    switch (permission) {
      case 'MANAGE': return 'red'
      case 'EDIT': return 'orange'
      case 'VIEW': return 'blue'
      default: return 'gray'
    }
  }

  const getPermissionLabel = (permission: string) => {
    switch (permission) {
      case 'MANAGE': return 'Full Access'
      case 'EDIT': return 'Can Edit'
      case 'VIEW': return 'View Only'
      default: return 'Unknown'
    }
  }

  // Load sharing data when component mounts or when button is clicked
  const handleViewSharing = () => {
    fetchSharingData()
    onViewOpen()
  }

  return (
    <>
      <Button
        leftIcon={<ShareIcon />}
        style={{ backgroundColor: brandColor, color: 'white' }}
        _hover={{ backgroundColor: '#2da89c' }}
        onClick={handleViewSharing}
        isLoading={loading}
      >
        Manage Sharing
      </Button>

      {/* Sharing Management Modal */}
      <Modal isOpen={isViewOpen} onClose={onViewClose} size="4xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Pantry Sharing</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={6} align="stretch">
              {/* Share New Pantry Section */}
              <Box>
                <HStack justify="space-between" mb={4}>
                  <Text fontSize="lg" fontWeight="bold">Share a Pantry</Text>
                  <Button
                    leftIcon={<AddIcon />}
                    style={{ backgroundColor: brandColor, color: 'white' }}
                    _hover={{ backgroundColor: '#2da89c' }}
                    size="sm"
                    onClick={onShareOpen}
                  >
                    Share Pantry
                  </Button>
                </HStack>
              </Box>

              <Divider />

              {/* Owned Pantries Section */}
              {sharingData?.ownedPantries && sharingData.ownedPantries.length > 0 && (
                <Box>
                  <Text fontSize="lg" fontWeight="bold" mb={4}>My Pantries</Text>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    {sharingData.ownedPantries.map((pantry) => (
                      <Card key={pantry.id} bg={cardBg} borderColor={borderColor}>
                        <CardBody>
                          <VStack align="start" spacing={3}>
                            <HStack justify="space-between" w="full">
                              <Text fontWeight="bold">{pantry.name}</Text>
                              <Badge colorScheme="green" variant="outline">Owner</Badge>
                            </HStack>
                            
                            {pantry.sharedWith && pantry.sharedWith.length > 0 && (
                              <Box w="full">
                                <Text fontSize="sm" color={mutedColor} mb={2}>
                                  Shared with {pantry.sharedWith.length} user(s):
                                </Text>
                                <VStack spacing={2} align="start">
                                  {pantry.sharedWith.map((share) => (
                                    <HStack key={share.id} justify="space-between" w="full">
                                      <HStack spacing={2}>
                                        <Avatar size="xs" name={share.user.name} src={share.user.avatar} />
                                        <Text fontSize="sm">{share.user.name || share.user.email}</Text>
                                        <Badge colorScheme={getPermissionColor(share.permission)} size="sm">
                                          {getPermissionLabel(share.permission)}
                                        </Badge>
                                      </HStack>
                                      <HStack spacing={1}>
                                        <Select
                                          size="xs"
                                          value={share.permission}
                                          onChange={(e) => updatePermissions(share.id, e.target.value as any)}
                                          width="auto"
                                        >
                                          <option value="VIEW">View</option>
                                          <option value="EDIT">Edit</option>
                                          <option value="MANAGE">Manage</option>
                                        </Select>
                                        <IconButton
                                          aria-label="Remove access"
                                          icon={<DeleteIcon />}
                                          size="xs"
                                          variant="ghost"
                                          colorScheme="red"
                                          onClick={() => {
                                            setDeleteShareId(share.id)
                                            onDeleteOpen()
                                          }}
                                        />
                                      </HStack>
                                    </HStack>
                                  ))}
                                </VStack>
                              </Box>
                            )}

                            {pantry.pendingInvitations && pantry.pendingInvitations.length > 0 && (
                              <Box w="full">
                                <Text fontSize="sm" color={mutedColor} mb={2}>
                                  Pending invitations:
                                </Text>
                                <VStack spacing={2} align="start">
                                  {pantry.pendingInvitations.map((invitation) => (
                                    <HStack key={invitation.id} justify="space-between" w="full">
                                      <HStack spacing={2}>
                                        <Text fontSize="sm">{invitation.invitedEmail}</Text>
                                        <Badge colorScheme={getPermissionColor(invitation.permission)} size="sm">
                                          {getPermissionLabel(invitation.permission)}
                                        </Badge>
                                        <Text fontSize="xs" color={mutedColor}>
                                          Expires {new Date(invitation.expiresAt).toLocaleDateString()}
                                        </Text>
                                      </HStack>
                                      <IconButton
                                        aria-label="Cancel invitation"
                                        icon={<DeleteIcon />}
                                        size="xs"
                                        variant="ghost"
                                        colorScheme="red"
                                        onClick={() => {
                                          setDeleteInvitationId(invitation.id)
                                          onDeleteInviteOpen()
                                        }}
                                      />
                                    </HStack>
                                  ))}
                                </VStack>
                              </Box>
                            )}

                            {(!pantry.sharedWith || pantry.sharedWith.length === 0) && 
                             (!pantry.pendingInvitations || pantry.pendingInvitations.length === 0) && (
                              <Text fontSize="sm" color={mutedColor} fontStyle="italic">
                                Not shared with anyone yet
                              </Text>
                            )}
                          </VStack>
                        </CardBody>
                      </Card>
                    ))}
                  </SimpleGrid>
                </Box>
              )}

              {/* Shared With Me Section */}
              {sharingData?.sharedWithMe && sharingData.sharedWithMe.length > 0 && (
                <>
                  <Divider />
                  <Box>
                    <Text fontSize="lg" fontWeight="bold" mb={4}>Shared With Me</Text>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      {sharingData.sharedWithMe.map((share) => (
                        <Card key={share.id} bg={cardBg} borderColor={borderColor}>
                          <CardBody>
                            <VStack align="start" spacing={3}>
                              <HStack justify="space-between" w="full">
                                <Text fontWeight="bold">{share.pantryLocation.name}</Text>
                                <Badge colorScheme={getPermissionColor(share.permission)}>
                                  {getPermissionLabel(share.permission)}
                                </Badge>
                              </HStack>
                              <HStack spacing={2}>
                                <Avatar size="xs" name={share.pantryLocation.owner.name} src={share.pantryLocation.owner.avatar} />
                                <Text fontSize="sm" color={mutedColor}>
                                  Owned by {share.pantryLocation.owner.name || share.pantryLocation.owner.email}
                                </Text>
                              </HStack>
                              <Text fontSize="xs" color={mutedColor}>
                                Shared {new Date(share.createdAt).toLocaleDateString()}
                              </Text>
                            </VStack>
                          </CardBody>
                        </Card>
                      ))}
                    </SimpleGrid>
                  </Box>
                </>
              )}

              {/* Pending Invitations Section */}
              {sharingData?.pendingInvitations && sharingData.pendingInvitations.length > 0 && (
                <>
                  <Divider />
                  <Box>
                    <Text fontSize="lg" fontWeight="bold" mb={4}>Pending Invitations</Text>
                    <VStack spacing={4} align="stretch">
                      {sharingData.pendingInvitations.map((invitation) => (
                        <Card key={invitation.id} bg={cardBg} borderColor={borderColor}>
                          <CardBody>
                            <VStack align="start" spacing={3}>
                              <HStack justify="space-between" w="full">
                                <Text fontWeight="bold">{invitation.pantryLocation.name}</Text>
                                <Badge colorScheme={getPermissionColor(invitation.permission)}>
                                  {getPermissionLabel(invitation.permission)}
                                </Badge>
                              </HStack>
                              <HStack spacing={2}>
                                <Avatar size="xs" name={invitation.invitedBy.name} src={invitation.invitedBy.avatar} />
                                <Text fontSize="sm" color={mutedColor}>
                                  Invited by {invitation.invitedBy.name || invitation.invitedBy.email}
                                </Text>
                              </HStack>
                              {invitation.message && (
                                <Text fontSize="sm" color={mutedColor} fontStyle="italic">
                                  "{invitation.message}"
                                </Text>
                              )}
                              <Text fontSize="xs" color={mutedColor}>
                                Expires {new Date(invitation.expiresAt).toLocaleDateString()}
                              </Text>
                              <HStack spacing={2}>
                                <Button
                                  size="sm"
                                  style={{ backgroundColor: brandColor, color: 'white' }}
                                  _hover={{ backgroundColor: '#2da89c' }}
                                  onClick={() => respondToInvitation(invitation.token, 'accept')}
                                  isLoading={loading}
                                >
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => respondToInvitation(invitation.token, 'decline')}
                                  isLoading={loading}
                                >
                                  Decline
                                </Button>
                              </HStack>
                            </VStack>
                          </CardBody>
                        </Card>
                      ))}
                    </VStack>
                  </Box>
                </>
              )}

              {!sharingData && (
                <Box textAlign="center" py={8}>
                  <Text color={mutedColor}>Loading sharing information...</Text>
                </Box>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button onClick={onViewClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Share Pantry Modal */}
      <Modal isOpen={isShareOpen} onClose={onShareClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Share Pantry</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Select Pantry</FormLabel>
                <Select
                  placeholder="Choose a pantry to share"
                  value={selectedPantry}
                  onChange={(e) => setSelectedPantry(e.target.value)}
                >
                  {pantryLocations.filter(p => p.isOwner).map(pantry => (
                    <option key={pantry.id} value={pantry.id}>
                      {pantry.name}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Email Address</FormLabel>
                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Permission Level</FormLabel>
                <Select
                  value={invitePermission}
                  onChange={(e) => setInvitePermission(e.target.value as any)}
                >
                  <option value="VIEW">View Only - Can see items but not modify</option>
                  <option value="EDIT">Can Edit - Can add, edit, and remove items</option>
                  <option value="MANAGE">Full Access - Can manage sharing and settings</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Message (Optional)</FormLabel>
                <Textarea
                  placeholder="Add a personal message to the invitation"
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  rows={3}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onShareClose}>
              Cancel
            </Button>
            <Button
              style={{ backgroundColor: brandColor, color: 'white' }}
              _hover={{ backgroundColor: '#2da89c' }}
              onClick={sendInvitation}
              isLoading={loading}
              isDisabled={!selectedPantry || !inviteEmail}
            >
              Send Invitation
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Share Confirmation */}
      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Remove Access
            </AlertDialogHeader>
            <AlertDialogBody>
              Are you sure you want to remove this user's access? They will no longer be able to view or modify this pantry.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteClose}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={removeAccess} ml={3} isLoading={loading}>
                Remove Access
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* Cancel Invitation Confirmation */}
      <AlertDialog
        isOpen={isDeleteInviteOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteInviteClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Cancel Invitation
            </AlertDialogHeader>
            <AlertDialogBody>
              Are you sure you want to cancel this invitation? The recipient will no longer be able to accept it.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteInviteClose}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={cancelInvitation} ml={3} isLoading={loading}>
                Cancel Invitation
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  )
}