.PHONY: help build up down logs clean test deploy migrate backup restore

# Default target
help:
	@echo "No Chicken Left Behind - Docker Management"
	@echo "==========================================="
	@echo ""
	@echo "Development:"
	@echo "  make dev          - Start development environment"
	@echo "  make dev-logs     - Show development logs"
	@echo "  make dev-stop     - Stop development environment"
	@echo ""
	@echo "Production:"
	@echo "  make build        - Build production images with Docker Bake"
	@echo "  make up           - Start production environment"
	@echo "  make down         - Stop production environment"
	@echo "  make logs         - Show production logs"
	@echo ""
	@echo "Database:"
	@echo "  make migrate      - Run database migrations"
	@echo "  make backup       - Backup database"
	@echo "  make restore      - Restore database from backup"
	@echo ""
	@echo "Utilities:"
	@echo "  make clean        - Clean up containers and volumes"
	@echo "  make test         - Run tests"
	@echo "  make shell        - Open shell in app container"
	@echo "  make db-shell     - Open PostgreSQL shell"
	@echo ""

# Check if .env exists
check-env:
	@if [ ! -f .env ]; then \
		echo "ERROR: .env file not found!"; \
		echo "Copy .env.docker to .env and configure it:"; \
		echo "  cp .env.docker .env"; \
		exit 1; \
	fi

# Development targets
dev: check-env
	docker compose -f docker-compose.yml up -d
	@echo "Development environment started!"
	@echo "App: http://localhost:3000"
	@echo "API: http://localhost:3001"

dev-logs:
	docker compose -f docker-compose.yml logs -f

dev-stop:
	docker compose -f docker-compose.yml down

# Production targets with Docker Bake
build: check-env
	@echo "Building production images with Docker Bake..."
	docker buildx bake -f docker-bake.hcl --load

build-all: check-env
	@echo "Building all images..."
	docker buildx bake -f docker-bake.hcl all --load

# Production deployment
up: check-env build
	@echo "Starting production environment..."
	docker compose -f docker-compose.secure.yml up -d
	@echo ""
	@echo "Production environment started!"
	@echo "App is available at: http://localhost:${PORT:-3000}"
	@echo ""
	@echo "Wait for health checks to pass:"
	@make health-check

down:
	docker compose -f docker-compose.secure.yml down

logs:
	docker compose -f docker-compose.secure.yml logs -f

logs-app:
	docker compose -f docker-compose.secure.yml logs -f app

logs-db:
	docker compose -f docker-compose.secure.yml logs -f postgres

# Database operations
migrate: check-env
	@echo "Running database migrations..."
	docker compose -f docker-compose.secure.yml run --rm migrate

backup:
	@echo "Backing up database..."
	@mkdir -p backups
	@docker compose -f docker-compose.secure.yml exec postgres pg_dump -U recipe_user recipe_planner | gzip > backups/backup-$$(date +%Y%m%d-%H%M%S).sql.gz
	@echo "Backup saved to backups/"

restore:
	@if [ -z "$(FILE)" ]; then \
		echo "Usage: make restore FILE=backups/backup-YYYYMMDD-HHMMSS.sql.gz"; \
		exit 1; \
	fi
	@echo "Restoring database from $(FILE)..."
	@gunzip -c $(FILE) | docker compose -f docker-compose.secure.yml exec -T postgres psql -U recipe_user recipe_planner

# Health check
health-check:
	@echo "Checking service health..."
	@for i in 1 2 3 4 5; do \
		if curl -f http://localhost:3001/health > /dev/null 2>&1; then \
			echo "✓ Services are healthy!"; \
			break; \
		else \
			echo "Waiting for services to be ready... ($$i/5)"; \
			sleep 5; \
		fi; \
	done

# Utility targets
clean:
	@echo "Cleaning up containers and volumes..."
	docker compose -f docker-compose.secure.yml down -v
	docker compose -f docker-compose.yml down -v
	docker system prune -f

clean-all:
	@echo "Removing all containers, volumes, and images..."
	docker compose -f docker-compose.secure.yml down -v --rmi all
	docker compose -f docker-compose.yml down -v --rmi all
	docker system prune -af

test: check-env
	@echo "Running tests..."
	docker buildx bake -f docker-bake.hcl test

shell:
	docker compose -f docker-compose.secure.yml exec app sh

db-shell:
	docker compose -f docker-compose.secure.yml exec postgres psql -U recipe_user recipe_planner

redis-shell:
	docker compose -f docker-compose.secure.yml exec redis redis-cli

# Monitoring
stats:
	@echo "Container Statistics:"
	@docker stats --no-stream $$(docker compose -f docker-compose.secure.yml ps -q)

# Security scan
security-scan:
	@echo "Scanning images for vulnerabilities..."
	@docker scout cves local://nochickenleftbehind:latest

# Development with hot reload
dev-watch: check-env
	docker compose -f docker-compose.yml up --build

# Production with nginx
prod-with-nginx: check-env build
	docker compose -f docker-compose.secure.yml --profile production up -d

# Generate secrets
generate-secrets:
	@echo "Generating secure passwords..."
	@echo ""
	@echo "POSTGRES_PASSWORD=$$(openssl rand -base64 32)"
	@echo "REDIS_PASSWORD=$$(openssl rand -base64 32)"
	@echo "SESSION_SECRET=$$(openssl rand -base64 32)"
	@echo ""
	@echo "Add these to your .env file"