import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { cors } from 'hono/cors'
import extractRoute from './routes/extract'
import recipesRoute from './routes/recipes'
import pantryRoute from './routes/pantry'
import groceryRoute from './routes/grocery'
import preferencesRoute from './routes/preferences'
import usersRoute from './routes/users'
import { prisma } from './lib/db'

const app = new Hono()

app.use('*', cors({
  origin: ['http://localhost:3000'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

app.route('/api/extract', extractRoute)
app.route('/api/recipes', recipesRoute)
app.route('/api/pantry', pantryRoute)
app.route('/api/grocery', groceryRoute)
app.route('/api/preferences', preferencesRoute)
app.route('/api/users', usersRoute)

// Test endpoint
app.get('/api/test', async (c) => {
  return c.json({ message: 'API is working' })
})

app.get('/health', async (c) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`
    return c.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      database: 'connected'
    })
  } catch (error) {
    return c.json({ 
      status: 'error', 
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

const port = 3001
console.log(`🚀 Server is running on port ${port}`)
console.log(`📊 Health check: http://localhost:${port}/health`)

serve({
  fetch: app.fetch,
  port,
})