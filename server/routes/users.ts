import { Hono } from 'hono'
import { prisma as db } from '../lib/db'

const app = new Hono()

// Create or update user (upsert)
app.post('/', async (c) => {
  try {
    const { id, email, name, avatar } = await c.req.json()
    
    if (!id || !email) {
      return c.json({ error: 'User ID and email are required' }, 400)
    }

    const user = await db.user.upsert({
      where: { id },
      update: {
        email,
        name: name || null,
        avatar: avatar || null,
        updatedAt: new Date()
      },
      create: {
        id,
        email,
        name: name || null,
        avatar: avatar || null
      }
    })

    return c.json({ user })
  } catch (error) {
    console.error('Error creating/updating user:', error)
    return c.json({ error: 'Failed to create/update user' }, 500)
  }
})

// Get user by ID
app.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    
    const user = await db.user.findUnique({
      where: { id },
      include: {
        preferences: true
      }
    })

    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }

    return c.json({ user })
  } catch (error) {
    console.error('Error fetching user:', error)
    return c.json({ error: 'Failed to fetch user' }, 500)
  }
})

export default app