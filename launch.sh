#!/bin/bash

# Simple launch script for NoChickenLeftBehind
# Run this to start everything locally

echo "🚀 Launching NoChickenLeftBehind..."

# Kill any existing processes
echo "Cleaning up existing processes..."
pkill -f "bun run server" 2>/dev/null
pkill -f "npm run dev" 2>/dev/null
pkill -f "vite" 2>/dev/null
sleep 2

# Start PostgreSQL if not running
echo "Checking database..."
if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo "Starting PostgreSQL..."
    brew services start postgresql@14
    sleep 3
fi

# Start backend server
echo "Starting backend server on port 3001..."
npm run dev:server &
BACKEND_PID=$!

# Wait for backend to start
sleep 5

# Start frontend
echo "Starting frontend on port 4000..."
npm run dev:client &
FRONTEND_PID=$!

# Wait for frontend to start
sleep 5

echo ""
echo "========================================="
echo "✅ NoChickenLeftBehind is running!"
echo "========================================="
echo "🌐 Frontend:  http://localhost:4000"
echo "🔧 Backend:   http://localhost:3001"
echo "📊 Database:  PostgreSQL on port 5432"
echo "========================================="
echo "👤 Login:     bobkuehne@gmail.com"
echo "========================================="
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Stopping services..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    pkill -f "bun run server" 2>/dev/null
    pkill -f "vite" 2>/dev/null
    echo "✅ All services stopped"
}

# Set up trap to cleanup on exit
trap cleanup EXIT

# Keep script running
wait