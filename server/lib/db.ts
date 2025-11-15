import { PrismaClient } from '@prisma/client'

// Global variable to store the Prisma client instance
declare global {
  var __prisma: PrismaClient | undefined
}

// Lazy initialization: create client on first access to ensure
// DATABASE_URL from Infisical is available in process.env
let _prisma: PrismaClient | null = null

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  })
}

// Export a Proxy that creates the client on first property access
// This ensures the client is only created after secrets are loaded
export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    // Initialize client on first access
    if (!_prisma) {
      _prisma = globalThis.__prisma || createPrismaClient()

      // In development, store the client on the global object to prevent
      // multiple instances during hot reloads
      if (process.env.NODE_ENV === 'development') {
        globalThis.__prisma = _prisma
      }
    }

    return _prisma[prop as keyof PrismaClient]
  }
})

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect()
})

process.on('SIGINT', async () => {
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await prisma.$disconnect()
  process.exit(0)
})