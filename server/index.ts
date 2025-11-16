import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { cors } from 'hono/cors'
import extractRoute from './routes/extract'
import recipesRoute from './routes/recipes'
import ratingsRoute from './routes/ratings'
import pantryRoute from './routes/pantry'
import groceryRoute from './routes/grocery'
import preferencesRoute from './routes/preferences'
import usersRoute from './routes/users'
// import sharingRoute from './routes/sharing'
import aiRoute from '../src/server/routes/ai'
import scanningRoute from '../src/server/routes/scanning'
import { prisma } from './lib/db'
import { getSecrets, type AppSecrets } from './config/secrets'
import { refreshAIConfig } from '../src/server/services/ai/config'

// Main initialization function
async function startServer() {
  // Load secrets before starting the server
  const secrets = await getSecrets()

  // Refresh AI config to pick up Infisical secrets that are now in process.env
  refreshAIConfig()
  console.log('[Server] AI config refreshed with loaded secrets')

  const app = new Hono()

  app.use('*', cors({
    origin: process.env.NODE_ENV === 'production'
      ? '*'  // Allow all origins in production for Cloud Run
      : ['http://localhost:3000'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }))

  app.route('/api/extract', extractRoute)
  app.route('/api/recipes', recipesRoute)
  app.route('/api/ratings', ratingsRoute)
  app.route('/api/pantry', pantryRoute)
  app.route('/api/grocery', groceryRoute)
  app.route('/api/preferences', preferencesRoute)
  app.route('/api/users', usersRoute)
  // app.route('/api/sharing', sharingRoute)
  app.route('/api/ai', aiRoute)
  app.route('/api/scanning', scanningRoute)

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
        database: 'connected',
        secretsSource: secrets ? 'infisical/env' : 'unknown'
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

  const port = secrets.server.port

  console.log(`🚀 Server is running on port ${port}`)
  console.log(`📊 Health check: http://localhost:${port}/health`)
  console.log(`🗄️ Database URL: ${secrets.database.url ? '[SET]' : '[NOT SET]'}`)
  console.log(`🔐 Secrets loaded from: ${process.env.INFISICAL_CLIENT_ID ? 'Infisical' : 'Environment Variables'}`)

  serve({
    fetch: app.fetch,
    port,
  })
}

// Start the server
startServer().catch((error) => {
  console.error('Failed to start server:', error)
  process.exit(1)
})