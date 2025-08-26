/**
 * MCP Server Launcher
 * Starts all MCP servers for the nochickenleftbehind project
 */

import { ServerManager } from './server-manager'
import { getConfig } from './mcp-config'

async function startMCPServers() {
  console.log('🚀 Starting MCP Servers...')
  
  const config = getConfig()
  const manager = new ServerManager(config)
  
  try {
    // Register all servers
    await manager.registerServer('pantry', () => import('./pantry-server'))
    await manager.registerServer('recipe', () => import('./recipe-server'))
    await manager.registerServer('grocery', () => import('./grocery-server'))
    
    // Start all servers
    await manager.startAll()
    
    console.log('✅ All MCP servers started successfully')
    console.log('📊 Server Status:')
    console.log('  - Pantry Server: http://localhost:4001')
    console.log('  - Recipe Server: http://localhost:4002')
    console.log('  - Grocery Server: http://localhost:4003')
    
    // Health check endpoint
    setInterval(async () => {
      const health = await manager.healthCheck()
      if (!health.healthy) {
        console.warn('⚠️ Some servers are unhealthy:', health.servers)
      }
    }, 30000) // Check every 30 seconds
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('🛑 Shutting down MCP servers...')
      await manager.stopAll()
      process.exit(0)
    })
    
    process.on('SIGINT', async () => {
      console.log('🛑 Shutting down MCP servers...')
      await manager.stopAll()
      process.exit(0)
    })
    
  } catch (error) {
    console.error('❌ Failed to start MCP servers:', error)
    process.exit(1)
  }
}

// Start the servers
startMCPServers().catch(console.error)