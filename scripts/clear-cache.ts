/**
 * Script to clear all caches (Redis + in-memory)
 */

import { getCacheService } from '../server/lib/cache'

async function clearCache() {
  console.log('🧹 Clearing all caches...')

  try {
    const cache = getCacheService()

    // Clear all caches
    await cache.clear()

    // Get stats
    const stats = cache.getStats()

    console.log('✅ Cache cleared successfully!')
    console.log('\nCache Stats:')
    console.log(`  Memory Cache: ${stats.memory.enabled ? 'Enabled' : 'Disabled'} (${stats.memory.size}/${stats.memory.max} items)`)
    console.log(`  Redis Cache: ${stats.redis.enabled ? 'Enabled' : 'Disabled'} (${stats.redis.connected ? 'Connected' : 'Disconnected'})`)

    // Disconnect from Redis
    await cache.disconnect()
    console.log('\n✅ Disconnected from Redis')

    process.exit(0)
  } catch (error) {
    console.error('❌ Failed to clear cache:', error)
    process.exit(1)
  }
}

clearCache()
