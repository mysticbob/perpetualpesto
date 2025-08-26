/**
 * Database Optimization Script
 * Applies performance optimizations to the database
 */

import { prisma } from '../server/lib/db'

async function applyOptimizations() {
  console.log('🔧 Applying database optimizations...')
  
  const optimizations = [
    // Performance indexes
    {
      name: 'idx_pantry_items_expiring',
      sql: `CREATE INDEX IF NOT EXISTS idx_pantry_items_expiring 
            ON "PantryItem"("userId", "expirationDate") 
            WHERE "expirationDate" IS NOT NULL`
    },
    {
      name: 'idx_user_recipes_favorites',
      sql: `CREATE INDEX IF NOT EXISTS idx_user_recipes_favorites 
            ON "UserRecipe"("userId", "isFavorite", "addedAt" DESC) 
            WHERE "isFavorite" = true`
    },
    {
      name: 'idx_grocery_items_pending',
      sql: `CREATE INDEX IF NOT EXISTS idx_grocery_items_pending 
            ON "GroceryItem"("userId", "addedDate" DESC) 
            WHERE completed = false`
    },
    {
      name: 'idx_recipes_search',
      sql: `CREATE INDEX IF NOT EXISTS idx_recipes_search 
            ON "Recipe" USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')))`
    },
    // Instacart integration indexes
    {
      name: 'idx_instacart_sessions_active',
      sql: `CREATE INDEX IF NOT EXISTS idx_instacart_sessions_active 
            ON "InstacartSession"("userId", "expiresAt") 
            WHERE "expiresAt" > NOW()`
    },
    {
      name: 'idx_instacart_cart_items',
      sql: `CREATE INDEX IF NOT EXISTS idx_instacart_cart_items 
            ON "InstacartCartItem"("groceryItemId") 
            WHERE "groceryItemId" IS NOT NULL`
    },
    // Pantry sharing indexes
    {
      name: 'idx_pantry_shares_user',
      sql: `CREATE INDEX IF NOT EXISTS idx_pantry_shares_user 
            ON "PantryShare"("userId", permission)`
    },
    // AI conversation indexes
    {
      name: 'idx_ai_conversations_active',
      sql: `CREATE INDEX IF NOT EXISTS idx_ai_conversations_active 
            ON "AIConversation"("userId", "startedAt" DESC) 
            WHERE "isActive" = true`
    }
  ]
  
  let successCount = 0
  let failureCount = 0
  
  for (const optimization of optimizations) {
    try {
      console.log(`  Applying: ${optimization.name}`)
      await prisma.$executeRawUnsafe(optimization.sql)
      successCount++
      console.log(`  ✅ Applied: ${optimization.name}`)
    } catch (error: any) {
      failureCount++
      if (error.message.includes('already exists')) {
        console.log(`  ⏭️  Skipped: ${optimization.name} (already exists)`)
      } else if (error.message.includes('does not exist')) {
        console.log(`  ⚠️  Skipped: ${optimization.name} (table does not exist yet)`)
      } else {
        console.error(`  ❌ Failed: ${optimization.name}`)
        console.error(`     Error: ${error.message}`)
      }
    }
  }
  
  // Analyze tables for query optimization
  console.log('\n📊 Analyzing tables for query optimization...')
  try {
    await prisma.$executeRawUnsafe('ANALYZE')
    console.log('✅ Table statistics updated')
  } catch (error) {
    console.error('❌ Failed to analyze tables:', error)
  }
  
  // Check current index usage
  console.log('\n📈 Checking index usage...')
  try {
    const indexUsage = await prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan as index_scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public'
      ORDER BY idx_scan DESC
      LIMIT 10
    `
    console.log('Top used indexes:', indexUsage)
  } catch (error) {
    console.error('Failed to get index usage stats:', error)
  }
  
  console.log(`\n✨ Optimization complete!`)
  console.log(`   Successful: ${successCount}`)
  console.log(`   Failed/Skipped: ${failureCount}`)
}

// Run the optimizations
applyOptimizations()
  .then(() => {
    console.log('🎉 Database optimizations applied successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Failed to apply optimizations:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })