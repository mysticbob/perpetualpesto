#!/usr/bin/env bun

/**
 * System Health Check Script
 * Verifies all components are running correctly
 */

import chalk from 'chalk'

interface ServiceCheck {
  name: string
  url: string
  required: boolean
}

const services: ServiceCheck[] = [
  { name: 'PostgreSQL Database', url: 'http://localhost:3001/health', required: true },
  { name: 'API Server', url: 'http://localhost:3001/health', required: true },
  { name: 'Pantry MCP Server', url: 'http://localhost:4001/health', required: false },
  { name: 'Recipe MCP Server', url: 'http://localhost:4002/health', required: false },
  { name: 'Grocery MCP Server', url: 'http://localhost:4003/health', required: false },
  { name: 'Frontend Dev Server', url: 'http://localhost:3000', required: false },
]

async function checkService(service: ServiceCheck): Promise<boolean> {
  try {
    const response = await fetch(service.url, { 
      signal: AbortSignal.timeout(2000) 
    })
    return response.ok
  } catch (error) {
    return false
  }
}

async function checkDatabase(): Promise<boolean> {
  try {
    const { prisma } = await import('../server/lib/db')
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    return false
  }
}

async function main() {
  console.log(chalk.bold.blue('\n🔍 NoChickenLeftBehind System Health Check\n'))
  console.log('=' .repeat(50))
  
  let allHealthy = true
  let requiredHealthy = true
  
  // Check database first
  const dbHealthy = await checkDatabase()
  const dbStatus = dbHealthy ? chalk.green('✅ Connected') : chalk.red('❌ Disconnected')
  console.log(`${chalk.cyan('Database')}: ${dbStatus}`)
  
  if (!dbHealthy) {
    requiredHealthy = false
    console.log(chalk.yellow('  → Run: bun run db:up'))
  }
  
  // Check all services
  for (const service of services) {
    const isHealthy = await checkService(service)
    const status = isHealthy ? chalk.green('✅ Running') : chalk.red('❌ Not Running')
    
    console.log(`${chalk.cyan(service.name)}: ${status}`)
    
    if (!isHealthy) {
      allHealthy = false
      if (service.required) {
        requiredHealthy = false
      }
      
      // Suggest how to start the service
      if (service.name.includes('API')) {
        console.log(chalk.yellow('  → Run: bun run dev:server'))
      } else if (service.name.includes('MCP')) {
        console.log(chalk.yellow('  → Run: bun run mcp:start'))
      } else if (service.name.includes('Frontend')) {
        console.log(chalk.yellow('  → Run: bun run dev:client'))
      }
    }
  }
  
  console.log('=' .repeat(50))
  
  // Summary
  if (allHealthy) {
    console.log(chalk.bold.green('\n✨ All systems operational!'))
    console.log(chalk.gray('You can access the app at http://localhost:3000'))
  } else if (requiredHealthy) {
    console.log(chalk.bold.yellow('\n⚠️  Some optional services are not running'))
    console.log(chalk.gray('Core functionality is available'))
  } else {
    console.log(chalk.bold.red('\n❌ Required services are not running'))
    console.log(chalk.gray('Run: bun run dev to start all services'))
  }
  
  // Check for common issues
  console.log(chalk.bold.blue('\n📋 Quick Checks:'))
  
  // Check if .env exists
  const envExists = await Bun.file('.env').exists()
  console.log(`Environment file: ${envExists ? chalk.green('✅ Found') : chalk.red('❌ Missing')}`)
  if (!envExists) {
    console.log(chalk.yellow('  → Run: cp .env.example .env'))
  }
  
  // Check if node_modules exists
  const nodeModulesExists = await Bun.file('node_modules').exists()
  console.log(`Dependencies: ${nodeModulesExists ? chalk.green('✅ Installed') : chalk.red('❌ Not installed')}`)
  if (!nodeModulesExists) {
    console.log(chalk.yellow('  → Run: bun install'))
  }
  
  console.log()
}

main().catch(console.error)