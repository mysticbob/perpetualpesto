import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function waitForDatabase() {
  const maxRetries = 30
  let retries = 0
  
  while (retries < maxRetries) {
    try {
      await prisma.$queryRaw`SELECT 1`
      console.log('✅ Database is ready!')
      await prisma.$disconnect()
      process.exit(0)
    } catch (error) {
      retries++
      console.log(`⏳ Waiting for database... (${retries}/${maxRetries})`)
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }
  
  console.error('❌ Database connection failed after maximum retries')
  await prisma.$disconnect()
  process.exit(1)
}

waitForDatabase()