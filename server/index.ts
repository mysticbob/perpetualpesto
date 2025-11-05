import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { cors } from 'hono/cors'
import { compress } from 'hono/compress'
import extractRoute from './routes/extract'
import recipesRoute from './routes/recipes'
import ratingsRoute from './routes/ratings'
import pantryRoute from './routes/pantry'
import groceryRoute from './routes/grocery'
import preferencesRoute from './routes/preferences'
import usersRoute from './routes/users'
// import sharingRoute from './routes/sharing'
import aiRoute from '../src/server/routes/ai'
import { prisma } from './lib/db'
import { getCacheService } from './lib/cache'

const app = new Hono()

// Enable compression (gzip/brotli)
if (process.env.ENABLE_COMPRESSION !== 'false') {
  app.use('*', compress({
    encoding: 'gzip',
  }))
  console.log('✅ Response compression enabled')
}

// CORS configuration
app.use('*', cors({
  origin: process.env.NODE_ENV === 'production'
    ? '*'  // Allow all origins in production for Cloud Run
    : ['http://localhost:3000'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

// Performance logging middleware
app.use('*', async (c, next) => {
  const start = Date.now()
  await next()
  const duration = Date.now() - start

  // Log slow requests
  if (duration > 100) {
    console.warn(`⚠️ Slow request: ${c.req.method} ${c.req.path} - ${duration}ms`)
  }
})

// Initialize cache on startup
const cache = getCacheService()
const cacheStats = cache.getStats()
console.log('📦 Cache initialized:', {
  memory: cacheStats.memory.enabled ? '✅ enabled' : '❌ disabled',
  redis: cacheStats.redis.connected ? '✅ connected' : '⚠️ disconnected'
})

app.route('/api/extract', extractRoute)
app.route('/api/recipes', recipesRoute)
app.route('/api/ratings', ratingsRoute)
app.route('/api/pantry', pantryRoute)
app.route('/api/grocery', groceryRoute)
app.route('/api/preferences', preferencesRoute)
app.route('/api/users', usersRoute)
// app.route('/api/sharing', sharingRoute)
app.route('/api/ai', aiRoute)

// Test endpoint
app.get('/api/test', async (c) => {
  return c.json({ message: 'API is working' })
})

// Enhanced health check
app.get('/health', async (c) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`

    // Get cache stats
    const stats = cache.getStats()

    return c.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
      cache: {
        memory: {
          enabled: stats.memory.enabled,
          size: stats.memory.size,
          max: stats.memory.max,
        },
        redis: {
          enabled: stats.redis.enabled,
          connected: stats.redis.connected,
        },
      },
      performance: {
        uptime: Math.floor(process.uptime()),
        memory: {
          used: Math.floor(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.floor(process.memoryUsage().heapTotal / 1024 / 1024),
        },
      }
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

// Cache stats endpoint
app.get('/api/cache/stats', async (c) => {
  const stats = cache.getStats()
  return c.json(stats)
})

// Clear cache endpoint (admin only)
app.post('/api/cache/clear', async (c) => {
  try {
    await cache.clear()
    return c.json({ message: 'Cache cleared successfully' })
  } catch (error) {
    return c.json({
      error: error instanceof Error ? error.message : 'Failed to clear cache'
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
console.log(`⚡ Bun runtime: ${typeof Bun !== 'undefined' ? 'YES' : 'NO'}`)

serve({
  fetch: app.fetch,
  port,
})
