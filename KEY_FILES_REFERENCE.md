# Key Files Reference Guide

## Critical Configuration Files

### Build & Runtime Configuration
- `/home/user/perpetualpesto/package.json` - Dependencies, scripts
- `/home/user/perpetualpesto/tsconfig.json` - TypeScript config
- `/home/user/perpetualpesto/vite.config.ts` - Frontend build config (Vite)
- `/home/user/perpetualpesto/vitest.config.ts` - Unit test config
- `/home/user/perpetualpesto/playwright.config.ts` - E2E test config
- `/home/user/perpetualpesto/eslint.config.js` - Linting rules
- `/home/user/perpetualpesto/.prettierrc` - Code formatting

### Environment & Secrets
- `/home/user/perpetualpesto/.env.example` - Example env vars
- `/home/user/perpetualpesto/.env.docker` - Docker dev config
- `/home/user/perpetualpesto/.env.k8s.example` - K8s config example
- `/home/user/perpetualpesto/.env.cloudrun.example` - Cloud Run config
- `/home/user/perpetualpesto/.env.production.example` - Production example
- `/home/user/perpetualpesto/.npmrc` - NPM registry config

### Database Schema
- `/home/user/perpetualpesto/prisma/schema.prisma` - Prisma data models
- `/home/user/perpetualpesto/init.sql` - Initial database schema

### Docker & Deployment
- `/home/user/perpetualpesto/docker-compose.yml` - Local dev database
- `/home/user/perpetualpesto/docker-compose.production.yml` - Production compose
- `/home/user/perpetualpesto/Dockerfile` - Production image
- `/home/user/perpetualpesto/Dockerfile.dev` - Dev image
- `/home/user/perpetualpesto/cloudbuild.yaml` - Cloud Build config
- `/home/user/perpetualpesto/k8s/` - Kubernetes manifests
- `/home/user/perpetualpesto/Makefile` - Build automation

---

## Frontend Code

### Main Entry & App
- `/home/user/perpetualpesto/src/main.tsx` - App entry point
- `/home/user/perpetualpesto/src/App.tsx` - Main app component with routing
- `/home/user/perpetualpesto/src/theme.ts` - Chakra UI theme customization
- `/home/user/perpetualpesto/index.html` - HTML template

### Context (State Management)
- `/home/user/perpetualpesto/src/contexts/AuthContext.tsx` - Firebase auth
- `/home/user/perpetualpesto/src/contexts/PantryContext.tsx` - Pantry state & operations
- `/home/user/perpetualpesto/src/contexts/GroceryContext.tsx` - Grocery list state
- `/home/user/perpetualpesto/src/contexts/AIContext.tsx` - AI features toggle, vision
- `/home/user/perpetualpesto/src/contexts/PreferencesContext.tsx` - User settings
- `/home/user/perpetualpesto/src/contexts/TimerContext.tsx` - Cooking timer

### AI/Vision Components
- `/home/user/perpetualpesto/src/components/ai/CameraCapture.tsx` - Camera modal (MAIN!)
- `/home/user/perpetualpesto/src/components/ai/ChatInterface.tsx` - Chat UI
- `/home/user/perpetualpesto/src/components/ai/VoiceButton.tsx` - Speech synthesis
- `/home/user/perpetualpesto/src/components/ai/AIAnalyticsDashboard.tsx` - Analytics

### Page Components
- `/home/user/perpetualpesto/src/components/PantryPage.tsx` - Pantry inventory
- `/home/user/perpetualpesto/src/components/GroceryList.tsx` - Grocery list
- `/home/user/perpetualpesto/src/components/RecipesPage.tsx` - Recipe browsing
- `/home/user/perpetualpesto/src/components/AddRecipePage.tsx` - Recipe creation
- `/home/user/perpetualpesto/src/components/CalendarView.tsx` - Meal planning
- `/home/user/perpetualpesto/src/components/PreferencesPage.tsx` - Settings
- `/home/user/perpetualpesto/src/components/StoresPage.tsx` - Store management

### Layout & Feature Components
- `/home/user/perpetualpesto/src/components/Sidebar.tsx` - Navigation
- `/home/user/perpetualpesto/src/components/ProtectedRoute.tsx` - Auth guard
- `/home/user/perpetualpesto/src/components/RecipeExtractor.tsx` - URL recipe parsing
- `/home/user/perpetualpesto/src/components/RecipeView.tsx` - Recipe detail view
- `/home/user/perpetualpesto/src/components/RecipeList.tsx` - Recipe list display
- `/home/user/perpetualpesto/src/components/IngredientAvailability.tsx` - Ingredient matching
- `/home/user/perpetualpesto/src/components/PantrySharing.tsx` - Share management
- `/home/user/perpetualpesto/src/components/GroceryOptionsDialog.tsx` - Grocery dialog
- `/home/user/perpetualpesto/src/components/PerformanceMonitor.tsx` - Performance tracking

### Utilities & Hooks
- `/home/user/perpetualpesto/src/utils/` - Utility functions
  - `units.ts` - Unit conversion
  - `fractionParser.ts` - Fraction parsing
  - `amountParsing.ts` - Amount/unit extraction
  - `expiration.ts` - Expiration date logic
  - `pantryOperations.ts` - Pantry operations
- `/home/user/perpetualpesto/src/hooks/useSpeechRecognition.ts` - Voice input

---

## Backend Code

### Server Entry & Config
- `/home/user/perpetualpesto/server/index.ts` - Hono server setup, routes mount
- `/home/user/perpetualpesto/server/lib/db.ts` - Prisma client setup
- `/home/user/perpetualpesto/server/config/secrets.ts` - Secrets manager (Infisical)

### API Routes
- `/home/user/perpetualpesto/server/routes/pantry.ts` - Pantry API
- `/home/user/perpetualpesto/server/routes/recipes.ts` - Recipe API
- `/home/user/perpetualpesto/server/routes/grocery.ts` - Grocery API
- `/home/user/perpetualpesto/server/routes/extract.ts` - Recipe extraction API
- `/home/user/perpetualpesto/server/routes/ratings.ts` - Recipe ratings API
- `/home/user/perpetualpesto/server/routes/preferences.ts` - Preferences API
- `/home/user/perpetualpesto/server/routes/users.ts` - User API
- `/home/user/perpetualpesto/server/routes/sharing.ts` - Sharing API (commented out)

### AI Service
- `/home/user/perpetualpesto/src/server/routes/ai.ts` - AI routes (chat, vision, commands)
- `/home/user/perpetualpesto/src/server/routes/aiCommands.ts` - Command processing
- `/home/user/perpetualpesto/src/server/services/ai/`
  - `openai.service.ts` - OpenAI API wrapper
  - `aiService.ts` - AI service with caching/rate limiting
  - `commandProcessor.ts` - Intent extraction & command execution
  - `actionHandlers.ts` - Command action implementations
  - `rateLimiter.ts` - Rate limiting logic
  - `errorHandler.ts` - Error handling & retry logic
  - `config.ts` - AI configuration
  - `conversationContext.ts` - Conversation history
  - `recipeSuggestionEngine.ts` - Recipe suggestions
  - `analyticsService.ts` - Usage analytics
  - `entityExtractor.ts` - Entity extraction from text

---

## Testing Files

### Unit Tests (Already Exist)
- `/home/user/perpetualpesto/src/utils/units.test.ts`
- `/home/user/perpetualpesto/src/utils/pantryOperations.test.ts`
- `/home/user/perpetualpesto/src/server/services/ai/__tests__/`
  - `openai.service.test.ts`
  - `rateLimiter.test.ts`
  - `commandProcessor.test.ts`

### Integration Tests
- `/home/user/perpetualpesto/tests/integration/api.test.ts`

### Test Setup
- `/home/user/perpetualpesto/src/test/setup.ts` - Vitest setup

### E2E Tests
- `/home/user/perpetualpesto/tests/e2e/` - Playwright tests (directory)

### Test & Evaluation Docs
- `/home/user/perpetualpesto/TESTING_GUIDE.md` - Testing guide
- `/home/user/perpetualpesto/TEST_FRAMEWORK_ARCHITECTURE.md` - Framework docs
- `/home/user/perpetualpesto/TESTING_SUMMARY.md` - Summary
- `/home/user/perpetualpesto/promptfoo/` - LLM evaluation configs

---

## Documentation Files

- `/home/user/perpetualpesto/README.md` - Main project documentation
- `/home/user/perpetualpesto/CODEBASE_ANALYSIS.md` - Known issues & recommendations
- `/home/user/perpetualpesto/SECURITY.md` - Security practices
- `/home/user/perpetualpesto/DEPLOYMENT.md` - Deployment guide
- `/home/user/perpetualpesto/COMPLETE_DEPLOYMENT_GUIDE.md` - Complete guide
- `/home/user/perpetualpesto/CLOUDRUN_DEPLOYMENT.md` - Cloud Run specific
- `/home/user/perpetualpesto/docs/` - Additional documentation

---

## Scripts

### Utility Scripts
- `/home/user/perpetualpesto/scripts/wait-for-db.ts` - Database wait script
- `/home/user/perpetualpesto/scripts/optimize-db.ts` - Database optimization
- `/home/user/perpetualpesto/scripts/performance-test.ts` - Performance testing
- `/home/user/perpetualpesto/generate-security-keys.sh` - Generate security keys
- `/home/user/perpetualpesto/setup-gcp-secrets.sh` - GCP secrets setup
- `/home/user/perpetualpesto/setup-cloudsql.sh` - Cloud SQL setup
- `/home/user/perpetualpesto/deploy-cloudrun.sh` - Cloud Run deployment
- `/home/user/perpetualpesto/check-cloudrun-config.sh` - Config validation
- `/home/user/perpetualpesto/extract-config-data.sh` - Config extraction

---

## Important Data Paths

### Database-Related
- Prisma client generated: `node_modules/.prisma/client/`
- Migrations: (handled via Prisma push, not in file-based migrations)

### Frontend Build
- Source: `/home/user/perpetualpesto/src/`
- Built output: `/home/user/perpetualpesto/dist/`

### Backend Output
- Build output: `/home/user/perpetualpesto/build/`

---

## Quick File Access Cheat Sheet

| Need | File |
|------|------|
| Tech versions | `/home/user/perpetualpesto/package.json` |
| Environment setup | `/home/user/perpetualpesto/.env.example` |
| Database schema | `/home/user/perpetualpesto/prisma/schema.prisma` |
| Start server | `/home/user/perpetualpesto/server/index.ts` |
| Start frontend | `/home/user/perpetualpesto/src/main.tsx` |
| Camera/vision | `/home/user/perpetualpesto/src/components/ai/CameraCapture.tsx` |
| Vision API | `/home/user/perpetualpesto/src/server/routes/ai.ts` |
| Pantry state | `/home/user/perpetualpesto/src/contexts/PantryContext.tsx` |
| Pantry API | `/home/user/perpetualpesto/server/routes/pantry.ts` |
| Recipe extraction | `/home/user/perpetualpesto/server/routes/extract.ts` |
| AI service | `/home/user/perpetualpesto/src/server/services/ai/aiService.ts` |
| Secrets management | `/home/user/perpetualpesto/server/config/secrets.ts` |
| Authentication | `/home/user/perpetualpesto/src/contexts/AuthContext.tsx` |
| Tests config | `/home/user/perpetualpesto/vitest.config.ts` |
| E2E tests | `/home/user/perpetualpesto/playwright.config.ts` |
