#!/bin/bash

# Setup script for No Chicken Left Behind
set -e

echo "======================================"
echo "No Chicken Left Behind - Setup Script"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "Checking prerequisites..."

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker is not installed${NC}"
    echo "Please install Docker from https://www.docker.com"
    exit 1
else
    echo -e "${GREEN}✓ Docker found${NC}"
fi

# Check Docker Compose
if ! command -v docker compose &> /dev/null; then
    echo -e "${RED}✗ Docker Compose is not installed${NC}"
    echo "Please install Docker Compose"
    exit 1
else
    echo -e "${GREEN}✓ Docker Compose found${NC}"
fi

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}! .env file not found${NC}"
    echo "Creating .env from template..."
    
    # Copy template
    cp .env.docker .env
    
    # Generate secure passwords
    POSTGRES_PASSWORD=$(openssl rand -base64 32)
    REDIS_PASSWORD=$(openssl rand -base64 32)
    SESSION_SECRET=$(openssl rand -base64 32)
    
    # Update .env with generated passwords
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$POSTGRES_PASSWORD/" .env
        sed -i '' "s/REDIS_PASSWORD=.*/REDIS_PASSWORD=$REDIS_PASSWORD/" .env
        sed -i '' "s/SESSION_SECRET=.*/SESSION_SECRET=$SESSION_SECRET/" .env
    else
        # Linux
        sed -i "s/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$POSTGRES_PASSWORD/" .env
        sed -i "s/REDIS_PASSWORD=.*/REDIS_PASSWORD=$REDIS_PASSWORD/" .env
        sed -i "s/SESSION_SECRET=.*/SESSION_SECRET=$SESSION_SECRET/" .env
    fi
    
    echo -e "${GREEN}✓ Generated secure passwords${NC}"
    echo ""
    echo -e "${YELLOW}IMPORTANT: Please edit .env and add your:${NC}"
    echo "  - Firebase configuration"
    echo "  - OpenAI API key"
    echo ""
    read -p "Press enter after updating .env to continue..."
else
    echo -e "${GREEN}✓ .env file found${NC}"
fi

# Check required environment variables
echo ""
echo "Checking configuration..."

source .env

if [ -z "$FIREBASE_API_KEY" ] || [ "$FIREBASE_API_KEY" == "your_firebase_api_key_here" ]; then
    echo -e "${RED}✗ Firebase API key not configured${NC}"
    echo "Please update FIREBASE_API_KEY in .env"
    exit 1
fi

if [ -z "$OPENAI_API_KEY" ] || [ "$OPENAI_API_KEY" == "sk-your_openai_api_key_here" ]; then
    echo -e "${YELLOW}! OpenAI API key not configured${NC}"
    echo "AI features will be disabled. Add OPENAI_API_KEY to enable."
fi

echo -e "${GREEN}✓ Configuration validated${NC}"

# Create necessary directories
echo ""
echo "Creating directories..."
mkdir -p docker/nginx/ssl
mkdir -p backups
mkdir -p uploads
echo -e "${GREEN}✓ Directories created${NC}"

# Build images
echo ""
echo "Building Docker images..."
echo "This may take a few minutes..."

if docker buildx version &> /dev/null; then
    echo "Using Docker Buildx..."
    docker buildx create --use --name nclb-builder 2>/dev/null || true
    docker buildx bake -f docker-bake.hcl --load
else
    echo "Using standard Docker build..."
    docker compose -f docker-compose.secure.yml build
fi

echo -e "${GREEN}✓ Images built successfully${NC}"

# Start services
echo ""
echo "Starting services..."
docker compose -f docker-compose.secure.yml up -d

# Wait for services to be ready
echo ""
echo "Waiting for services to be healthy..."
for i in {1..30}; do
    if docker compose -f docker-compose.secure.yml exec postgres pg_isready -U recipe_user > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Database is ready${NC}"
        break
    fi
    echo -n "."
    sleep 2
done

# Run migrations
echo ""
echo "Running database migrations..."
docker compose -f docker-compose.secure.yml run --rm migrate
echo -e "${GREEN}✓ Migrations completed${NC}"

# Health check
echo ""
echo "Performing health check..."
sleep 5

if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Application is healthy${NC}"
else
    echo -e "${YELLOW}! Application health check failed${NC}"
    echo "Check logs with: docker compose -f docker-compose.secure.yml logs"
fi

# Summary
echo ""
echo "======================================"
echo -e "${GREEN}Setup Complete!${NC}"
echo "======================================"
echo ""
echo "Your application is running at:"
echo "  Web: http://localhost:3000"
echo "  API: http://localhost:3001"
echo ""
echo "Useful commands:"
echo "  View logs:        make logs"
echo "  Stop services:    make down"
echo "  Restart services: make up"
echo "  Open app shell:   make shell"
echo "  Database backup:  make backup"
echo ""
echo "Default test account:"
echo "  Email: test@example.com"
echo "  Password: (create via signup)"
echo ""
echo -e "${YELLOW}Security Notes:${NC}"
echo "- All services except the web interface are on internal networks"
echo "- Database and Redis are not exposed externally"
echo "- Passwords have been auto-generated and saved in .env"
echo "- For production, enable HTTPS in nginx configuration"
echo ""