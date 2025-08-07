// Docker Bake configuration for multi-target builds
// This provides a cleaner way to manage multiple build configurations

variable "REGISTRY" {
  default = "local"
}

variable "VERSION" {
  default = "latest"
}

variable "NODE_ENV" {
  default = "production"
}

// Build groups
group "default" {
  targets = ["app"]
}

group "all" {
  targets = ["app", "db-init"]
}

group "dev" {
  targets = ["app-dev"]
}

// Base configuration shared by all targets
target "_base" {
  dockerfile = "Dockerfile"
  context = "."
  labels = {
    "org.opencontainers.image.source" = "https://github.com/yourusername/nochickenleftbehind"
    "org.opencontainers.image.description" = "AI-powered recipe and pantry management"
    "org.opencontainers.image.licenses" = "MIT"
  }
}

// Production app build
target "app" {
  inherits = ["_base"]
  tags = [
    "${REGISTRY}/nochickenleftbehind:${VERSION}",
    "${REGISTRY}/nochickenleftbehind:latest"
  ]
  target = "production"
  args = {
    NODE_ENV = "production"
  }
  platforms = ["linux/amd64", "linux/arm64"]
  cache-from = ["type=registry,ref=${REGISTRY}/nochickenleftbehind:buildcache"]
  cache-to = ["type=registry,ref=${REGISTRY}/nochickenleftbehind:buildcache,mode=max"]
}

// Development build with hot reload
target "app-dev" {
  inherits = ["_base"]
  tags = ["${REGISTRY}/nochickenleftbehind:dev"]
  target = "development"
  args = {
    NODE_ENV = "development"
  }
  // Mount source code for hot reload in development
  contexts = {
    source = {
      context = "."
      dockerfile = "Dockerfile.dev"
    }
  }
}

// Database initialization container
target "db-init" {
  dockerfile = "docker/db-init/Dockerfile"
  context = "."
  tags = ["${REGISTRY}/nochickenleftbehind-db-init:${VERSION}"]
  args = {
    POSTGRES_VERSION = "15-alpine"
  }
}

// Test runner container
target "test" {
  inherits = ["_base"]
  target = "test"
  tags = ["${REGISTRY}/nochickenleftbehind:test"]
  args = {
    NODE_ENV = "test"
  }
  output = ["type=cacheonly"]
}