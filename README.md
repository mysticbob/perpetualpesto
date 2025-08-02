# Recipe Planner 🍳

A modern recipe extraction and meal planning app built with Bun, Vite, React, Chakra UI, Hono, and PostgreSQL.

## Features

- 🔍 **Recipe Extraction**: Extract recipes from URLs using smart parsing
- 📖 **Recipe Viewing**: Clean layout with scrollable instructions and ingredient sidebar
- 👨‍🍳 **Cook Mode**: Full-screen cooking interface with step-by-step guidance
- 📅 **Meal Planning**: Calendar view for planning meals
- 🛒 **Grocery Lists**: Generate shopping lists from recipes
- 🌙 **Dark/Light Mode**: Automatic theme switching
- 📱 **Responsive Design**: Works on all screen sizes

## Tech Stack

- **Frontend**: Vite + React + TypeScript + Chakra UI
- **Backend**: Hono + Bun
- **Database**: PostgreSQL (Docker)
- **ORM**: Prisma
- **Authentication**: Firebase Auth (planned)

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) installed
- [Docker](https://docker.com) installed and running

### Setup

1. **Clone and install dependencies**:
   ```bash
   git clone <repo-url>
   cd recipe-planner
   bun run setup
   ```

2. **Start development servers**:
   ```bash
   bun run dev
   ```

This will start:
- 🐘 PostgreSQL database (Docker container on port 5432)
- 🚀 Backend server (port 3001)
- ⚡ Frontend dev server (port 3000)

### Manual Setup (if needed)

```bash
# Install dependencies
bun install

# Start database
bun run db:up

# Wait for database to be ready
bun run wait-for-db

# Push database schema
bun run db:push

# Generate Prisma client
bun run db:generate

# Start all services
bun run dev
```

## Cold Start Instructions

If you're setting up this project from scratch on a new machine, follow these step-by-step instructions:

### 1. Install Prerequisites

**Install Bun** (JavaScript runtime):
```bash
curl -fsSL https://bun.sh/install | bash
# Restart your terminal or run:
source ~/.bashrc  # or ~/.zshrc
```

**Install Docker** (for PostgreSQL database):
- Download from [docker.com](https://docker.com)
- Start Docker Desktop and ensure it's running

### 2. Clone and Setup Project

```bash
# Clone the repository
git clone git@github.com:mysticbob/perpetualpesto.git
cd perpetualpesto

# Install all dependencies
bun install
```

### 3. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your settings (optional for local development)
# The defaults should work for local development
```

### 4. Database Setup

```bash
# Start PostgreSQL in Docker container
bun run db:up

# Wait for database to be ready (this may take 30-60 seconds)
bun run wait-for-db

# Create database schema
bun run db:push

# Generate Prisma client
bun run db:generate
```

### 5. Start Development

```bash
# Start all services (database, backend, frontend)
bun run dev
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Database**: localhost:5432

### 6. Verify Everything Works

1. Open http://localhost:3000 in your browser
2. Try extracting a recipe from: `https://www.eatingwell.com/ranch-roasted-chickpeas-11759228`
3. Check that the recipe appears in your recipe list

### Troubleshooting Cold Start

**Docker not starting?**
```bash
# Check if Docker is running
docker ps

# If not running, start Docker Desktop
# Then try again: bun run db:up
```

**Database connection issues?**
```bash
# Reset the database completely
bun run db:down
bun run db:up
bun run wait-for-db
bun run db:push
```

**Port conflicts?**
```bash
# Check what's using the ports
lsof -i :3000  # Frontend
lsof -i :3001  # Backend
lsof -i :5432  # Database

# Kill processes if needed, then restart
```

**Bun installation issues?**
```bash
# Verify Bun is installed correctly
bun --version

# If not found, reinstall:
curl -fsSL https://bun.sh/install | bash
```

## Available Scripts

### Development
- `bun run dev` - Start all services (database, backend, frontend)
- `bun run dev:client` - Start frontend only
- `bun run dev:server` - Start backend only
- `bun run dev:db` - Start database only

### Database
- `bun run db:up` - Start database container
- `bun run db:down` - Stop database container
- `bun run db:reset` - Reset database (removes all data)
- `bun run db:push` - Push schema changes to database
- `bun run db:generate` - Generate Prisma client
- `bun run db:studio` - Open Prisma Studio

### Build
- `bun run build` - Build for production
- `bun run preview` - Preview production build

## Project Structure

```
recipe-planner/
├── src/                    # Frontend source
│   ├── components/         # React components
│   ├── App.tsx            # Main app component
│   └── main.tsx           # App entry point
├── server/                # Backend source
│   ├── routes/            # API routes
│   ├── lib/               # Utilities
│   └── index.ts           # Server entry point
├── prisma/                # Database schema
├── scripts/               # Utility scripts
├── docker-compose.yml     # Database container
└── package.json           # Dependencies & scripts
```

## API Endpoints

### Recipes
- `GET /api/recipes` - Get all recipes
- `GET /api/recipes/:id` - Get single recipe
- `POST /api/recipes` - Create new recipe
- `PUT /api/recipes/:id` - Update recipe
- `DELETE /api/recipes/:id` - Delete recipe

### Extraction
- `POST /api/extract` - Extract recipe from URL

### Health
- `GET /health` - Server health check

## Environment Variables

Copy `.env.example` to `.env`:

```bash
DATABASE_URL="postgresql://recipe_user:recipe_password@localhost:5432/recipe_planner"
FIREBASE_API_KEY="your_firebase_api_key"
FIREBASE_AUTH_DOMAIN="your_project.firebaseapp.com"
FIREBASE_PROJECT_ID="your_project_id"
```

## Recipe Extraction

The app supports extracting recipes from most recipe websites using:

1. **JSON-LD structured data** (preferred)
2. **Microdata/Schema.org markup**
3. **Heuristic parsing** (fallback)

Test with: `https://www.eatingwell.com/ranch-roasted-chickpeas-11759228`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details
