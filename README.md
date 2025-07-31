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
