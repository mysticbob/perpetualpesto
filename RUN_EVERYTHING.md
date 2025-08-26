# 🚀 Running the Complete NoChickenLeftBehind System

## Prerequisites

- Docker running (for PostgreSQL)
- Bun installed
- Environment variables configured (.env file)

## 🎯 Complete System Startup

### Step 1: Database
```bash
# Start PostgreSQL
bun run db:up

# Wait for database to be ready
bun run wait-for-db

# Apply schema
bun run db:push

# Apply optimizations
bun run db:apply-optimizations
```

### Step 2: Backend Server
```bash
# In terminal 1 - Start main API server
bun run dev:server
# Server will run on http://localhost:3001
```

### Step 3: MCP Servers
```bash
# In terminal 2 - Start all MCP servers
bun run mcp:start

# This starts:
# - Pantry MCP Server: http://localhost:4001
# - Recipe MCP Server: http://localhost:4002  
# - Grocery MCP Server: http://localhost:4003
# - Planning MCP Server: http://localhost:4004 (to be built)
# - Shopping MCP Server: http://localhost:4005 (to be built)
```

### Step 4: Frontend
```bash
# In terminal 3 - Start React app
bun run dev:client
# App will open at http://localhost:3000
```

### Step 5: AI Integration (Development Mode)
```bash
# In terminal 4 - Start AI orchestrator
bun run ai:dev
# AI service will connect to all MCP servers
```

## 🔄 Development Workflow

### All-in-One Development Command
```bash
# Start everything with one command
bun run dev
```

This runs concurrently:
- Database container
- Backend server
- MCP servers
- Frontend client

### Hot Reload Development
```bash
# MCP servers with watch mode
bun run mcp:dev

# Backend with watch mode
bun --watch server/index.ts
```

## 🧪 Testing

### Run All Tests
```bash
bun run test
```

### Test Specific Components
```bash
# Test MCP servers
bun test server/mcp/**/*.test.ts

# Test AI integration
bun test server/ai/**/*.test.ts

# Test frontend
bun test src/**/*.test.ts
```

## 📊 Monitoring

### Check System Health
```bash
# Check all services
curl http://localhost:3001/health        # Main API
curl http://localhost:4001/health        # Pantry MCP
curl http://localhost:4002/health        # Recipe MCP
curl http://localhost:4003/health        # Grocery MCP
```

### View Logs
```bash
# Database logs
docker logs nochickenleftbehind_db_1

# Combined logs (if using PM2)
pm2 logs
```

## 🔌 MCP Server Testing with Claude

### Configure Claude Desktop
Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "pantry": {
      "command": "node",
      "args": ["/path/to/project/server/mcp/pantry-server.js"],
      "env": {
        "DATABASE_URL": "postgresql://..."
      }
    },
    "recipes": {
      "command": "node",
      "args": ["/path/to/project/server/mcp/recipe-server.js"],
      "env": {
        "DATABASE_URL": "postgresql://..."
      }
    },
    "grocery": {
      "command": "node",
      "args": ["/path/to/project/server/mcp/grocery-server.js"],
      "env": {
        "DATABASE_URL": "postgresql://..."
      }
    }
  }
}
```

### Test MCP Integration
```bash
# Use the MCP test client
bun run mcp:test

# Or use Claude Desktop directly
# Ask Claude: "Using the pantry MCP server, what items are expiring soon?"
```

## 🎨 Frontend Access Points

### Main Application
- **Dashboard**: http://localhost:3000
- **Recipes**: http://localhost:3000/recipes
- **Pantry**: http://localhost:3000/pantry
- **Meal Planner**: http://localhost:3000/planner
- **Shopping**: http://localhost:3000/shopping

### Development Tools
- **React Query DevTools**: Bottom right corner in dev mode
- **Prisma Studio**: `bun run db:studio` (http://localhost:5555)

## 🤖 AI Features Testing

### Test Meal Planning AI
```javascript
// In browser console or API test
fetch('http://localhost:3001/api/ai/generate-meal-plan', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'test-user',
    weekStartDate: '2024-01-01',
    preferences: {
      mealsPerWeek: 21,
      maxCookTime: 30,
      budget: 150
    }
  })
})
```

### Test Recipe Suggestions
```javascript
fetch('http://localhost:3001/api/ai/suggest-recipes', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'test-user',
    useExpiring: true,
    limit: 5
  })
})
```

## 🛠️ Troubleshooting

### Database Connection Issues
```bash
# Reset database
bun run db:reset

# Check PostgreSQL is running
docker ps

# View database logs
docker logs nochickenleftbehind_db_1
```

### Port Conflicts
```bash
# Check what's using ports
lsof -i :3000  # Frontend
lsof -i :3001  # Backend
lsof -i :4001  # Pantry MCP
lsof -i :4002  # Recipe MCP
lsof -i :4003  # Grocery MCP
lsof -i :5432  # PostgreSQL
```

### MCP Server Issues
```bash
# Restart specific MCP server
bun run mcp:restart pantry

# Check MCP logs
bun run mcp:logs
```

## 📝 Environment Variables

Ensure `.env` file contains:
```env
# Database
DATABASE_URL="postgresql://recipe_user:recipe_password@localhost:5432/recipe_planner"

# AI Services
OPENAI_API_KEY="sk-..."
# OR
ANTHROPIC_API_KEY="sk-ant-..."

# Instacart Integration
INSTACART_CLIENT_ID="..."
INSTACART_CLIENT_SECRET="..."

# Firebase (for auth)
FIREBASE_API_KEY="..."
FIREBASE_AUTH_DOMAIN="..."
FIREBASE_PROJECT_ID="..."

# MCP Server Ports (optional, defaults shown)
MCP_PANTRY_PORT=4001
MCP_RECIPE_PORT=4002
MCP_GROCERY_PORT=4003
MCP_PLANNING_PORT=4004
MCP_SHOPPING_PORT=4005
```

## 🚦 Quick Status Check

Run this to see if everything is working:
```bash
bun run system:status
```

This will check:
- ✅ Database connection
- ✅ API server health
- ✅ All MCP servers
- ✅ Frontend build
- ✅ AI service connection

---

## Production Deployment

For production deployment:
```bash
# Build everything
bun run build

# Start with PM2
pm2 start ecosystem.config.js

# Or use Docker Compose
docker-compose -f docker-compose.production.yml up -d
```