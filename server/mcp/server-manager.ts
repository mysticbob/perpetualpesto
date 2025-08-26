/**
 * MCP Server Manager
 * 
 * Central management system for all MCP servers, handling lifecycle,
 * health monitoring, and coordination between servers.
 */

import { EventEmitter } from 'events'
import { Server } from 'http'
import { WebSocketServer } from 'ws'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio'
import { 
  MCP_SERVERS, 
  McpServerDefinition, 
  TRANSPORT_CONFIG,
  FEATURE_FLAGS,
  validateServerConfig,
  getEnabledServers 
} from './mcp-config'
import { auditLogger } from './security-config'

// Import MCP servers
import { pantryMcpServer } from './pantry-server'
import { recipeMcpServer } from './recipe-server'
import { groceryMcpServer } from './grocery-server'

export interface ServerInstance {
  name: string
  definition: McpServerDefinition
  server: McpServer
  transport: any
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'error'
  startTime?: Date
  lastError?: Error
  metrics: {
    requestCount: number
    errorCount: number
    averageResponseTime: number
    lastHealthCheck?: Date
    healthStatus: 'healthy' | 'unhealthy' | 'unknown'
  }
}

export class McpServerManager extends EventEmitter {
  private servers = new Map<string, ServerInstance>()
  private httpServers = new Map<string, Server>()
  private wsServers = new Map<string, WebSocketServer>()
  private healthCheckInterval?: NodeJS.Timeout
  private isShuttingDown = false

  constructor() {
    super()
    this.setupGracefulShutdown()
  }

  /**
   * Start all enabled MCP servers
   */
  async startAll(): Promise<void> {
    const enabledServers = getEnabledServers()
    
    auditLogger.log({
      userId: 'system',
      action: 'server_manager_start',
      resource: 'mcp_servers',
      details: { serverCount: enabledServers.length, servers: enabledServers.map(s => s.name) }
    })

    console.log(`Starting ${enabledServers.length} MCP servers...`)

    for (const serverDef of enabledServers) {
      try {
        await this.startServer(serverDef.name)
        console.log(`✅ ${serverDef.name} started successfully`)
      } catch (error) {
        console.error(`❌ Failed to start ${serverDef.name}:`, error)
        // Continue starting other servers even if one fails
      }
    }

    // Start health monitoring
    this.startHealthMonitoring()

    console.log('🚀 MCP Server Manager started')
    this.emit('all-servers-started')
  }

  /**
   * Start a specific MCP server
   */
  async startServer(serverName: string): Promise<void> {
    const serverDef = validateServerConfig(serverName)
    
    if (this.servers.has(serverName)) {
      throw new Error(`Server ${serverName} is already running`)
    }

    const serverInstance: ServerInstance = {
      name: serverName,
      definition: serverDef,
      server: this.getServerImplementation(serverName),
      transport: null,
      status: 'starting',
      metrics: {
        requestCount: 0,
        errorCount: 0,
        averageResponseTime: 0,
        healthStatus: 'unknown'
      }
    }

    this.servers.set(serverName, serverInstance)

    try {
      // Create transport based on configuration
      serverInstance.transport = await this.createTransport(serverDef)
      
      // Connect server to transport
      await serverInstance.server.connect(serverInstance.transport)
      
      // Update status
      serverInstance.status = 'running'
      serverInstance.startTime = new Date()
      
      auditLogger.log({
        userId: 'system',
        action: 'server_started',
        resource: 'mcp_server',
        resourceId: serverName,
        details: { transport: serverDef.transports, port: serverDef.port }
      })

      this.emit('server-started', serverName)
      
    } catch (error) {
      serverInstance.status = 'error'
      serverInstance.lastError = error as Error
      
      auditLogger.log({
        userId: 'system',
        action: 'server_start_failed',
        resource: 'mcp_server',
        resourceId: serverName,
        details: { error: (error as Error).message }
      })

      throw error
    }
  }

  /**
   * Stop a specific MCP server
   */
  async stopServer(serverName: string): Promise<void> {
    const serverInstance = this.servers.get(serverName)
    if (!serverInstance) {
      throw new Error(`Server ${serverName} is not running`)
    }

    serverInstance.status = 'stopping'

    try {
      // Close transport connections
      if (serverInstance.transport) {
        await serverInstance.server.close()
      }

      // Close HTTP server if exists
      const httpServer = this.httpServers.get(serverName)
      if (httpServer) {
        await new Promise<void>((resolve) => {
          httpServer.close(() => resolve())
        })
        this.httpServers.delete(serverName)
      }

      // Close WebSocket server if exists
      const wsServer = this.wsServers.get(serverName)
      if (wsServer) {
        wsServer.close()
        this.wsServers.delete(serverName)
      }

      serverInstance.status = 'stopped'
      
      auditLogger.log({
        userId: 'system',
        action: 'server_stopped',
        resource: 'mcp_server',
        resourceId: serverName
      })

      this.emit('server-stopped', serverName)
      
    } catch (error) {
      serverInstance.status = 'error'
      serverInstance.lastError = error as Error
      throw error
    }
  }

  /**
   * Stop all running servers
   */
  async stopAll(): Promise<void> {
    if (this.isShuttingDown) {
      return
    }

    this.isShuttingDown = true
    console.log('🛑 Stopping all MCP servers...')

    // Stop health monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }

    // Stop all servers
    const stopPromises = Array.from(this.servers.keys()).map(async (serverName) => {
      try {
        await this.stopServer(serverName)
        console.log(`✅ ${serverName} stopped`)
      } catch (error) {
        console.error(`❌ Error stopping ${serverName}:`, error)
      }
    })

    await Promise.all(stopPromises)
    this.servers.clear()

    auditLogger.log({
      userId: 'system',
      action: 'server_manager_shutdown',
      resource: 'mcp_servers'
    })

    console.log('🔴 MCP Server Manager stopped')
    this.emit('all-servers-stopped')
  }

  /**
   * Restart a specific server
   */
  async restartServer(serverName: string): Promise<void> {
    console.log(`🔄 Restarting ${serverName}...`)
    
    if (this.servers.has(serverName)) {
      await this.stopServer(serverName)
    }
    
    await this.startServer(serverName)
    
    console.log(`✅ ${serverName} restarted`)
    this.emit('server-restarted', serverName)
  }

  /**
   * Get server status information
   */
  getServerStatus(serverName?: string): ServerInstance | ServerInstance[] {
    if (serverName) {
      const server = this.servers.get(serverName)
      if (!server) {
        throw new Error(`Server ${serverName} not found`)
      }
      return server
    }
    
    return Array.from(this.servers.values())
  }

  /**
   * Get overall system health
   */
  getSystemHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy'
    serverCount: number
    healthyServers: number
    unhealthyServers: number
    uptime: number
    servers: { name: string; status: string; health: string }[]
  } {
    const servers = Array.from(this.servers.values())
    const healthyServers = servers.filter(s => s.status === 'running' && s.metrics.healthStatus === 'healthy').length
    const unhealthyServers = servers.filter(s => s.status === 'error' || s.metrics.healthStatus === 'unhealthy').length
    
    let systemStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    if (unhealthyServers > 0) {
      systemStatus = servers.length > 0 && healthyServers > 0 ? 'degraded' : 'unhealthy'
    }

    const startTime = Math.min(...servers.filter(s => s.startTime).map(s => s.startTime!.getTime()))
    const uptime = startTime ? Date.now() - startTime : 0

    return {
      status: systemStatus,
      serverCount: servers.length,
      healthyServers,
      unhealthyServers,
      uptime,
      servers: servers.map(s => ({
        name: s.name,
        status: s.status,
        health: s.metrics.healthStatus
      }))
    }
  }

  /**
   * Get aggregated metrics
   */
  getMetrics(): {
    totalRequests: number
    totalErrors: number
    averageResponseTime: number
    errorRate: number
    uptime: number
    serverMetrics: { [serverName: string]: ServerInstance['metrics'] }
  } {
    const servers = Array.from(this.servers.values())
    const totalRequests = servers.reduce((sum, s) => sum + s.metrics.requestCount, 0)
    const totalErrors = servers.reduce((sum, s) => sum + s.metrics.errorCount, 0)
    const avgResponseTime = servers.length > 0 
      ? servers.reduce((sum, s) => sum + s.metrics.averageResponseTime, 0) / servers.length 
      : 0

    const startTime = Math.min(...servers.filter(s => s.startTime).map(s => s.startTime!.getTime()))
    const uptime = startTime ? Date.now() - startTime : 0

    return {
      totalRequests,
      totalErrors,
      averageResponseTime: Math.round(avgResponseTime),
      errorRate: totalRequests > 0 ? totalErrors / totalRequests : 0,
      uptime,
      serverMetrics: Object.fromEntries(servers.map(s => [s.name, s.metrics]))
    }
  }

  /**
   * Update server metrics
   */
  updateServerMetrics(serverName: string, metrics: Partial<ServerInstance['metrics']>): void {
    const server = this.servers.get(serverName)
    if (server) {
      Object.assign(server.metrics, metrics)
    }
  }

  /**
   * Broadcast event to all servers
   */
  broadcastEvent(event: string, data: any): void {
    for (const [serverName, server] of this.servers) {
      if (server.status === 'running' && FEATURE_FLAGS.realTimeUpdates) {
        try {
          // Emit event through server's event system
          server.server.emit(event, data)
        } catch (error) {
          console.error(`Failed to broadcast event to ${serverName}:`, error)
        }
      }
    }
  }

  /**
   * Get server implementation by name
   */
  private getServerImplementation(serverName: string): McpServer {
    const serverMap: { [key: string]: McpServer } = {
      'pantry-server': pantryMcpServer,
      'recipe-server': recipeMcpServer,
      'grocery-server': groceryMcpServer,
      // Add other servers as they're implemented
      // 'meal-planning-server': mealPlanningMcpServer,
      // 'instacart-server': instacartMcpServer
    }

    const server = serverMap[serverName]
    if (!server) {
      throw new Error(`Server implementation not found: ${serverName}`)
    }

    return server
  }

  /**
   * Create transport for server
   */
  private async createTransport(serverDef: McpServerDefinition): Promise<any> {
    const primaryTransport = serverDef.transports[0]

    switch (primaryTransport) {
      case 'stdio':
        return new StdioServerTransport()
      
      case 'http':
        // HTTP transport implementation would go here
        // For now, fall back to stdio
        console.warn(`HTTP transport not yet implemented for ${serverDef.name}, using stdio`)
        return new StdioServerTransport()
      
      case 'websocket':
        // WebSocket transport implementation would go here
        // For now, fall back to stdio
        console.warn(`WebSocket transport not yet implemented for ${serverDef.name}, using stdio`)
        return new StdioServerTransport()
      
      default:
        throw new Error(`Unsupported transport: ${primaryTransport}`)
    }
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    if (!this.healthCheckInterval) {
      this.healthCheckInterval = setInterval(() => {
        this.performHealthChecks()
      }, 30000) // Check every 30 seconds
    }
  }

  /**
   * Perform health checks on all servers
   */
  private async performHealthChecks(): Promise<void> {
    for (const [serverName, server] of this.servers) {
      if (server.status === 'running') {
        try {
          // Basic health check - could be enhanced with specific server health endpoints
          const healthStatus = await this.checkServerHealth(server)
          server.metrics.healthStatus = healthStatus
          server.metrics.lastHealthCheck = new Date()
          
          if (healthStatus === 'unhealthy') {
            console.warn(`⚠️ Server ${serverName} health check failed`)
            this.emit('server-unhealthy', serverName)
          }
          
        } catch (error) {
          server.metrics.healthStatus = 'unhealthy'
          server.lastError = error as Error
          console.error(`❌ Health check failed for ${serverName}:`, error)
        }
      }
    }
  }

  /**
   * Check individual server health
   */
  private async checkServerHealth(server: ServerInstance): Promise<'healthy' | 'unhealthy'> {
    try {
      // Basic checks
      if (server.status !== 'running') {
        return 'unhealthy'
      }

      // Check if transport is still connected
      if (!server.transport) {
        return 'unhealthy'
      }

      // Check error rate
      const errorRate = server.metrics.requestCount > 0 
        ? server.metrics.errorCount / server.metrics.requestCount 
        : 0
      
      if (errorRate > 0.1) { // More than 10% error rate
        return 'unhealthy'
      }

      // Check response time
      if (server.metrics.averageResponseTime > 5000) { // More than 5 seconds
        return 'unhealthy'
      }

      return 'healthy'
      
    } catch (error) {
      return 'unhealthy'
    }
  }

  /**
   * Setup graceful shutdown handlers
   */
  private setupGracefulShutdown(): void {
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n📡 Received ${signal}, shutting down gracefully...`)
      
      try {
        await this.stopAll()
        process.exit(0)
      } catch (error) {
        console.error('Error during shutdown:', error)
        process.exit(1)
      }
    }

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
    process.on('SIGINT', () => gracefulShutdown('SIGINT'))
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error)
      auditLogger.log({
        userId: 'system',
        action: 'uncaught_exception',
        resource: 'server_manager',
        details: { error: error.message, stack: error.stack }
      })
      gracefulShutdown('UNCAUGHT_EXCEPTION')
    })

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason)
      auditLogger.log({
        userId: 'system',
        action: 'unhandled_rejection',
        resource: 'server_manager',
        details: { reason: String(reason) }
      })
    })
  }
}

// Create singleton instance
export const mcpServerManager = new McpServerManager()

// Export for CLI usage
export default mcpServerManager