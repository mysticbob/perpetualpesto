#!/bin/bash

# NoChickenLeftBehind - Complete System Startup Script
# This script starts all components of the system

set -e

echo "🚀 Starting NoChickenLeftBehind Complete System..."

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v bun &> /dev/null; then
    echo -e "${RED}❌ Bun is not installed${NC}"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites satisfied${NC}"

# Start Database
echo -e "\n${YELLOW}Starting PostgreSQL database...${NC}"
bun run db:up

# Wait for database
echo "Waiting for database to be ready..."
bun run wait-for-db

# Apply database schema
echo -e "${YELLOW}Applying database schema...${NC}"
bun run db:push

# Generate Prisma client
echo -e "${YELLOW}Generating Prisma client...${NC}"
bun run db:generate

# Apply optimizations
echo -e "${YELLOW}Applying database optimizations...${NC}"
bun run db:apply-optimizations || echo "Some optimizations skipped (tables may not exist yet)"

# Function to start service in background
start_service() {
    local name=$1
    local command=$2
    local port=$3
    
    echo -e "${YELLOW}Starting $name on port $port...${NC}"
    $command > logs/${name}.log 2>&1 &
    echo $! > pids/${name}.pid
    
    # Wait for service to be ready
    sleep 2
    
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:$port/health | grep -q "200"; then
        echo -e "${GREEN}✅ $name started successfully${NC}"
    else
        echo -e "${YELLOW}⚠️  $name may still be starting up${NC}"
    fi
}

# Create directories for logs and pids
mkdir -p logs pids

# Start Backend API Server
start_service "API-Server" "bun run server/index.ts" 3001

# Start MCP Servers
echo -e "\n${YELLOW}Starting MCP Servers...${NC}"
start_service "Pantry-MCP" "bun run server/mcp/pantry-server.ts" 4001
start_service "Recipe-MCP" "bun run server/mcp/recipe-server.ts" 4002
start_service "Grocery-MCP" "bun run server/mcp/grocery-server.ts" 4003

# Start Frontend (in foreground so we can see output)
echo -e "\n${YELLOW}Starting Frontend Development Server...${NC}"
echo -e "${GREEN}Frontend will be available at http://localhost:3000${NC}"

# Trap to cleanup on exit
trap cleanup EXIT

cleanup() {
    echo -e "\n${YELLOW}Shutting down services...${NC}"
    
    # Kill all services
    for pidfile in pids/*.pid; do
        if [ -f "$pidfile" ]; then
            kill $(cat $pidfile) 2>/dev/null || true
            rm $pidfile
        fi
    done
    
    echo -e "${GREEN}✅ All services stopped${NC}"
}

# Show status
echo -e "\n${GREEN}🎉 System is running!${NC}"
echo "================================"
echo "📊 Service Status:"
echo "  API Server:   http://localhost:3001"
echo "  Pantry MCP:   http://localhost:4001"
echo "  Recipe MCP:   http://localhost:4002"
echo "  Grocery MCP:  http://localhost:4003"
echo "  Frontend:     http://localhost:3000"
echo "  Database:     postgresql://localhost:5432"
echo "================================"
echo "Press Ctrl+C to stop all services"
echo ""

# Start frontend in foreground
bun run dev:client