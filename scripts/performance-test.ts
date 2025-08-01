#!/usr/bin/env bun

interface TestResult {
  endpoint: string
  method: string
  avgTime: number
  minTime: number
  maxTime: number
  successRate: number
  requests: number
}

async function performanceTest() {
  const baseUrl = 'http://localhost:3001'
  const endpoints = [
    { path: '/api/recipes', method: 'GET', name: 'List Recipes' },
    { path: '/api/recipes?page=1&limit=12', method: 'GET', name: 'Paginated Recipes' },
    { path: '/api/recipes?search=chicken', method: 'GET', name: 'Search Recipes' },
    { path: '/api/recipes/stats', method: 'GET', name: 'Recipe Stats' },
    { path: '/health', method: 'GET', name: 'Health Check' }
  ]
  
  const results: TestResult[] = []
  
  console.log('🚀 Starting performance tests...\n')
  
  for (const endpoint of endpoints) {
    console.log(`Testing ${endpoint.name}...`)
    
    const times: number[] = []
    let successCount = 0
    const requestCount = 10
    
    for (let i = 0; i < requestCount; i++) {
      const startTime = performance.now()
      
      try {
        const response = await fetch(`${baseUrl}${endpoint.path}`, {
          method: endpoint.method
        })
        
        const endTime = performance.now()
        const duration = endTime - startTime
        
        if (response.ok) {
          successCount++
          times.push(duration)
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (error) {
        console.error(`Request failed:`, error)
      }
    }
    
    if (times.length > 0) {
      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length
      const minTime = Math.min(...times)
      const maxTime = Math.max(...times)
      const successRate = (successCount / requestCount) * 100
      
      results.push({
        endpoint: endpoint.name,
        method: endpoint.method,
        avgTime: Math.round(avgTime),
        minTime: Math.round(minTime),
        maxTime: Math.round(maxTime),
        successRate,
        requests: requestCount
      })
      
      console.log(`  ✅ Avg: ${Math.round(avgTime)}ms, Min: ${Math.round(minTime)}ms, Max: ${Math.round(maxTime)}ms`)
    } else {
      console.log(`  ❌ All requests failed`)
    }
    
    console.log('')
  }
  
  // Display results table
  console.log('📊 Performance Test Results:')
  console.log('=' .repeat(80))
  console.table(results)
  
  // Performance recommendations
  console.log('\n💡 Performance Recommendations:')
  
  const slowEndpoints = results.filter(r => r.avgTime > 500)
  if (slowEndpoints.length > 0) {
    console.log('⚠️  Slow endpoints (>500ms):')
    slowEndpoints.forEach(endpoint => {
      console.log(`   - ${endpoint.endpoint}: ${endpoint.avgTime}ms`)
    })
  }
  
  const failedEndpoints = results.filter(r => r.successRate < 100)
  if (failedEndpoints.length > 0) {
    console.log('❌ Endpoints with failures:')
    failedEndpoints.forEach(endpoint => {
      console.log(`   - ${endpoint.endpoint}: ${endpoint.successRate}% success rate`)
    })
  }
  
  if (slowEndpoints.length === 0 && failedEndpoints.length === 0) {
    console.log('✅ All endpoints performing well!')
  }
  
  // Overall performance score
  const avgResponseTime = results.reduce((sum, r) => sum + r.avgTime, 0) / results.length
  const avgSuccessRate = results.reduce((sum, r) => sum + r.successRate, 0) / results.length
  
  console.log(`\n🎯 Overall Performance Score:`)
  console.log(`   Average Response Time: ${Math.round(avgResponseTime)}ms`)
  console.log(`   Average Success Rate: ${avgSuccessRate.toFixed(1)}%`)
  
  if (avgResponseTime < 200 && avgSuccessRate > 95) {
    console.log(`   Grade: A+ 🌟`)
  } else if (avgResponseTime < 500 && avgSuccessRate > 90) {
    console.log(`   Grade: A 👍`)
  } else if (avgResponseTime < 1000 && avgSuccessRate > 80) {
    console.log(`   Grade: B 👌`)
  } else {
    console.log(`   Grade: C ⚠️  (Needs optimization)`)
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch('http://localhost:3001/health')
    if (!response.ok) {
      throw new Error('Server not healthy')
    }
    return true
  } catch (error) {
    console.error('❌ Server is not running or not healthy.')
    console.log('Please start the server with: bun run dev:server')
    return false
  }
}

// Main execution
async function main() {
  const serverRunning = await checkServer()
  if (serverRunning) {
    await performanceTest()
  }
}

main().catch(console.error)