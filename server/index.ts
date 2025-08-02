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
import { prisma } from './lib/db'

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

const port = Number(process.env.PORT) || 3001

// Check for required environment variables
const requiredEnvVars = ['DATABASE_URL']
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar])

if (missingEnvVars.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingEnvVars.join(', ')}`)
  console.error('Available environment variables:')
  Object.keys(process.env).forEach(key => {
    if (key.includes('DATABASE') || key.includes('FIREBASE') || key.includes('PORT')) {
      console.error(`  ${key}=${process.env[key] ? '[SET]' : '[NOT SET]'}`)
    }
  })
  process.exit(1)
}

console.log(`🚀 Server is running on port ${port}`)
console.log(`📊 Health check: http://localhost:${port}/health`)
console.log(`🗄️ Database URL: ${process.env.DATABASE_URL ? '[SET]' : '[NOT SET]'}`)

serve({
  fetch: app.fetch,
  port,
})