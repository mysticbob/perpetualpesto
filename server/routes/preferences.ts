import { Hono } from 'hono'
import { prisma as db } from '../lib/db'

const app = new Hono()

// Get user's preferences
app.get('/', async (c) => {
  try {
    const userId = c.req.query('userId')
    
    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400)
    }

    const preferences = await db.userPreferences.findUnique({
      where: { userId }
    })

    if (!preferences) {
      return c.json({ error: 'Preferences not found' }, 404)
    }

    return c.json({
      unitSystem: preferences.unitSystem,
      themeMode: preferences.themeMode,
      language: preferences.language,
      timezone: preferences.timezone,
      expirationWarningDays: preferences.expirationWarningDays
    })
  } catch (error) {
    console.error('Error fetching preferences:', error)
    return c.json({ error: 'Failed to fetch preferences' }, 500)
  }
})

// Save user's preferences
app.post('/', async (c) => {
  try {
    const { userId, unitSystem, themeMode, language, timezone, expirationWarningDays } = await c.req.json()
    
    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400)
    }

    await db.userPreferences.upsert({
      where: { userId },
      update: {
        unitSystem: unitSystem || 'metric',
        themeMode: themeMode || 'system',
        language: language || 'en',
        timezone: timezone || 'UTC',
        expirationWarningDays: expirationWarningDays || 3
      },
      create: {
        userId,
        unitSystem: unitSystem || 'metric',
        themeMode: themeMode || 'system',
        language: language || 'en',
        timezone: timezone || 'UTC',
        expirationWarningDays: expirationWarningDays || 3
      }
    })

    return c.json({ success: true })
  } catch (error) {
    console.error('Error saving preferences:', error)
    return c.json({ error: 'Failed to save preferences' }, 500)
  }
})

export default app