#!/usr/bin/env bun

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function optimizeDatabase() {
  console.log('🔧 Optimizing database performance...')
  
  try {
    // Analyze tables to update statistics for query planner
    console.log('📊 Analyzing tables...')
    await prisma.$executeRaw`ANALYZE;`
    
    // Vacuum to reclaim space and update statistics
    console.log('🧹 Vacuuming database...')
    await prisma.$executeRaw`VACUUM ANALYZE;`
    
    // Create additional performance indexes if they don't exist
    console.log('📈 Creating performance indexes...')
    
    // Full-text search index for recipe names
    await prisma.$executeRaw`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recipes_name_gin 
      ON recipes USING gin(to_tsvector('english', name));
    `
    
    // Composite index for ingredient searches
    await prisma.$executeRaw`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ingredients_name_recipe 
      ON ingredients(name, "recipeId");
    `
    
    // Index for recipe filtering by time and servings
    await prisma.$executeRaw`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recipes_filters 
      ON recipes("totalTime", servings, "createdAt");
    `
    
    console.log('✅ Database optimization completed!')
    
    // Show some performance statistics
    console.log('\n📈 Database Statistics:')
    
    const recipeCount = await prisma.recipe.count()
    const ingredientCount = await prisma.ingredient.count()
    const instructionCount = await prisma.instruction.count()
    
    console.log(`   Recipes: ${recipeCount}`)
    console.log(`   Ingredients: ${ingredientCount}`)
    console.log(`   Instructions: ${instructionCount}`)
    
    // Check index usage
    const indexStats = await prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_tup_read,
        idx_tup_fetch
      FROM pg_stat_user_indexes 
      WHERE schemaname = 'public'
      ORDER BY idx_tup_read DESC
      LIMIT 10;
    `
    
    console.log('\n🔍 Top Index Usage:')
    console.table(indexStats)
    
  } catch (error) {
    console.error('❌ Error optimizing database:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run optimization
optimizeDatabase()