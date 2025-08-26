#!/bin/bash

# Build script that bypasses TypeScript checking for quick testing

echo "Building without TypeScript checking..."

# Build frontend with Vite (it will skip TS errors in build mode)
npx vite build --mode development

echo "Build complete! You can now test locally."
echo ""
echo "To start the application:"
echo "  1. Start the database: npm run dev:db"
echo "  2. Start the server: npm run dev:server"
echo "  3. Start the client: npm run dev:client"