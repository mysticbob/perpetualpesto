import { Hono } from 'hono'
import { prisma as db } from '../lib/db'
import { PantryPermission, InvitationStatus } from '@prisma/client'

const app = new Hono()

// Get pantries shared with user and pantries user owns
app.get('/', async (c) => {
  try {
    const userId = c.req.query('userId')
    
    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400)
    }

    // Get pantries owned by user
    const ownedPantries = await db.pantryLocation.findMany({
      where: { userId },
      include: {
        shares: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true }
            }
          }
        },
        invitations: {
          where: { status: 'PENDING' },
          select: {
            id: true,
            invitedEmail: true,
            permission: true,
            createdAt: true,
            expiresAt: true
          }
        }
      },
      orderBy: { order: 'asc' }
    })

    // Get pantries shared with user
    const sharedPantries = await db.pantryShare.findMany({
      where: { userId },
      include: {
        pantryLocation: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true }
            }
          }
        },
        sharedByUser: {
          select: { id: true, name: true, email: true, avatar: true }
        }
      }
    })

    // Get pending invitations for user
    const pendingInvitations = await db.pantryInvitation.findMany({
      where: { 
        invitedEmail: c.req.query('userEmail') || '',
        status: 'PENDING',
        expiresAt: { gt: new Date() }
      },
      include: {
        pantryLocation: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true }
            }
          }
        },
        invitedByUser: {
          select: { id: true, name: true, email: true, avatar: true }
        }
      }
    })

    return c.json({
      ownedPantries: ownedPantries.map(pantry => ({
        id: pantry.id,
        name: pantry.name,
        order: pantry.order,
        createdAt: pantry.createdAt.toISOString(),
        sharedWith: pantry.shares.map(share => ({
          id: share.id,
          user: share.user,
          permission: share.permission,
          createdAt: share.createdAt.toISOString(),
          expiresAt: share.expiresAt?.toISOString()
        })),
        pendingInvitations: pantry.invitations
      })),
      sharedWithMe: sharedPantries.map(share => ({
        id: share.id,
        pantryLocation: {
          id: share.pantryLocation.id,
          name: share.pantryLocation.name,
          owner: share.pantryLocation.user
        },
        permission: share.permission,
        sharedBy: share.sharedByUser,
        createdAt: share.createdAt.toISOString(),
        expiresAt: share.expiresAt?.toISOString()
      })),
      pendingInvitations: pendingInvitations.map(inv => ({
        id: inv.id,
        pantryLocation: {
          id: inv.pantryLocation.id,
          name: inv.pantryLocation.name,
          owner: inv.pantryLocation.user
        },
        permission: inv.permission,
        invitedBy: inv.invitedByUser,
        message: inv.message,
        createdAt: inv.createdAt.toISOString(),
        expiresAt: inv.expiresAt.toISOString(),
        token: inv.invitationToken
      }))
    })
  } catch (error) {
    console.error('Error fetching sharing data:', error)
    return c.json({ error: 'Failed to fetch sharing data' }, 500)
  }
})

// Share a pantry with another user
app.post('/invite', async (c) => {
  try {
    const { userId, pantryLocationId, invitedEmail, permission, message } = await c.req.json()
    
    if (!userId || !pantryLocationId || !invitedEmail || !permission) {
      return c.json({ error: 'Missing required fields' }, 400)
    }

    // Verify user owns the pantry
    const pantryLocation = await db.pantryLocation.findFirst({
      where: { id: pantryLocationId, userId }
    })

    if (!pantryLocation) {
      return c.json({ error: 'Pantry not found or access denied' }, 403)
    }

    // Check if user is trying to share with themselves
    const invitedUser = await db.user.findUnique({
      where: { email: invitedEmail }
    })

    if (invitedUser?.id === userId) {
      return c.json({ error: 'Cannot share pantry with yourself' }, 400)
    }

    // Check if already shared or invited
    const existingShare = invitedUser ? await db.pantryShare.findFirst({
      where: { pantryLocationId, userId: invitedUser.id }
    }) : null

    const existingInvitation = await db.pantryInvitation.findFirst({
      where: { 
        pantryLocationId, 
        invitedEmail,
        status: 'PENDING',
        expiresAt: { gt: new Date() }
      }
    })

    if (existingShare) {
      return c.json({ error: 'Pantry is already shared with this user' }, 400)
    }

    if (existingInvitation) {
      return c.json({ error: 'Pending invitation already exists for this user' }, 400)
    }

    // Create invitation
    const invitationToken = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    const invitation = await db.pantryInvitation.create({
      data: {
        pantryLocationId,
        invitedEmail,
        invitedByUserId: userId,
        permission: permission as PantryPermission,
        invitationToken,
        message,
        expiresAt
      },
      include: {
        pantryLocation: true,
        invitedByUser: {
          select: { id: true, name: true, email: true, avatar: true }
        }
      }
    })

    // TODO: Send email notification
    // await sendInvitationEmail(invitation)

    return c.json({
      id: invitation.id,
      invitationToken,
      expiresAt: invitation.expiresAt.toISOString(),
      message: 'Invitation sent successfully'
    })
  } catch (error) {
    console.error('Error creating invitation:', error)
    return c.json({ error: 'Failed to create invitation' }, 500)
  }
})

// Accept or decline an invitation
app.post('/respond', async (c) => {
  try {
    const { userId, invitationToken, response } = await c.req.json()
    
    if (!userId || !invitationToken || !response || !['accept', 'decline'].includes(response)) {
      return c.json({ error: 'Invalid request parameters' }, 400)
    }

    const invitation = await db.pantryInvitation.findFirst({
      where: { 
        invitationToken,
        status: 'PENDING',
        expiresAt: { gt: new Date() }
      },
      include: {
        pantryLocation: true
      }
    })

    if (!invitation) {
      return c.json({ error: 'Invalid or expired invitation' }, 404)
    }

    // Verify the user accepting matches the invited email
    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user || user.email !== invitation.invitedEmail) {
      return c.json({ error: 'Unauthorized to respond to this invitation' }, 403)
    }

    await db.$transaction(async (tx) => {
      // Update invitation status
      await tx.pantryInvitation.update({
        where: { id: invitation.id },
        data: { status: response === 'accept' ? 'ACCEPTED' : 'DECLINED' }
      })

      // If accepted, create the share
      if (response === 'accept') {
        await tx.pantryShare.create({
          data: {
            pantryLocationId: invitation.pantryLocationId,
            userId,
            sharedByUserId: invitation.invitedByUserId,
            permission: invitation.permission
          }
        })
      }
    })

    return c.json({ 
      message: response === 'accept' ? 'Invitation accepted' : 'Invitation declined' 
    })
  } catch (error) {
    console.error('Error responding to invitation:', error)
    return c.json({ error: 'Failed to respond to invitation' }, 500)
  }
})

// Update sharing permissions
app.put('/permissions', async (c) => {
  try {
    const { userId, shareId, permission } = await c.req.json()
    
    if (!userId || !shareId || !permission) {
      return c.json({ error: 'Missing required fields' }, 400)
    }

    // Verify user owns the pantry being shared
    const share = await db.pantryShare.findFirst({
      where: { id: shareId },
      include: { pantryLocation: true }
    })

    if (!share || share.pantryLocation.userId !== userId) {
      return c.json({ error: 'Share not found or access denied' }, 403)
    }

    const updatedShare = await db.pantryShare.update({
      where: { id: shareId },
      data: { permission: permission as PantryPermission },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true }
        }
      }
    })

    return c.json({
      id: updatedShare.id,
      user: updatedShare.user,
      permission: updatedShare.permission,
      createdAt: updatedShare.createdAt.toISOString(),
      expiresAt: updatedShare.expiresAt?.toISOString()
    })
  } catch (error) {
    console.error('Error updating permissions:', error)
    return c.json({ error: 'Failed to update permissions' }, 500)
  }
})

// Remove sharing access
app.delete('/share/:shareId', async (c) => {
  try {
    const userId = c.req.query('userId')
    const shareId = c.req.param('shareId')
    
    if (!userId || !shareId) {
      return c.json({ error: 'Missing required parameters' }, 400)
    }

    // Verify user owns the pantry being shared
    const share = await db.pantryShare.findFirst({
      where: { id: shareId },
      include: { pantryLocation: true }
    })

    if (!share || share.pantryLocation.userId !== userId) {
      return c.json({ error: 'Share not found or access denied' }, 403)
    }

    await db.pantryShare.delete({
      where: { id: shareId }
    })

    return c.json({ message: 'Access removed successfully' })
  } catch (error) {
    console.error('Error removing share:', error)
    return c.json({ error: 'Failed to remove access' }, 500)
  }
})

// Cancel pending invitation
app.delete('/invitation/:invitationId', async (c) => {
  try {
    const userId = c.req.query('userId')
    const invitationId = c.req.param('invitationId')
    
    if (!userId || !invitationId) {
      return c.json({ error: 'Missing required parameters' }, 400)
    }

    // Verify user sent the invitation
    const invitation = await db.pantryInvitation.findFirst({
      where: { id: invitationId, invitedByUserId: userId }
    })

    if (!invitation) {
      return c.json({ error: 'Invitation not found or access denied' }, 403)
    }

    await db.pantryInvitation.update({
      where: { id: invitationId },
      data: { status: 'EXPIRED' }
    })

    return c.json({ message: 'Invitation cancelled successfully' })
  } catch (error) {
    console.error('Error cancelling invitation:', error)
    return c.json({ error: 'Failed to cancel invitation' }, 500)
  }
})

// Check user's permission for a specific pantry
app.get('/permission/:pantryLocationId', async (c) => {
  try {
    const userId = c.req.query('userId')
    const pantryLocationId = c.req.param('pantryLocationId')
    
    if (!userId || !pantryLocationId) {
      return c.json({ error: 'Missing required parameters' }, 400)
    }

    // Check if user owns the pantry
    const ownerPantry = await db.pantryLocation.findFirst({
      where: { id: pantryLocationId, userId }
    })

    if (ownerPantry) {
      return c.json({ permission: 'MANAGE', isOwner: true })
    }

    // Check if pantry is shared with user
    const share = await db.pantryShare.findFirst({
      where: { pantryLocationId, userId }
    })

    if (share) {
      return c.json({ permission: share.permission, isOwner: false })
    }

    return c.json({ permission: null, isOwner: false })
  } catch (error) {
    console.error('Error checking permission:', error)
    return c.json({ error: 'Failed to check permission' }, 500)
  }
})

export default app