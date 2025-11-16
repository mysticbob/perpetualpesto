# PerpetualPesto Application Architecture Overview

## 1. TECH STACK

### Frontend
- **Framework**: React 18.3 with TypeScript 5.9
- **Build Tool**: Vite 5.4 (dev server on port 3000)
- **State Management**: React Context API (custom contexts for different domains)
- **UI Component Library**: Chakra UI 2.10 with Framer Motion for animations
- **Routing**: React Router 6.30
- **HTTP Client**: Axios 1.13
- **Camera/Webcam**: react-webcam 7.2 (already integrated!)
- **Image Compression**: compressorjs 1.2

### Backend
- **Runtime**: Bun (JavaScript/TypeScript runtime, faster than Node.js)
- **Web Framework**: Hono 4.10 (lightweight, Cloudflare Workers compatible)
- **Server**: @hono/node-server 1.19
- **Language**: TypeScript 5.9

### Database
- **Database**: PostgreSQL (running in Docker on port 5433)
- **ORM**: Prisma 5.22
- **Client**: @prisma/client 5.22

### AI/ML Integration
- **Provider**: OpenAI API (GPT-4 Turbo, GPT-4 Vision)
- **Libraries**:
  - openai 6.9
  - tiktoken 1.0 (token counting)
- **Models configured**:
  - Chat: gpt-4-turbo-preview
  - Vision: gpt-4-vision-preview
  - Embedding: text-embedding-3-small

### Authentication & Secrets
- **Auth**: Firebase Auth 12.6
- **Secrets Management**: Infisical SDK 4.0 (recommended for production, with env var fallback)

### Testing & Quality
- **Unit Tests**: Vitest 3.2.4
- **Component Tests**: @testing-library/react 16.3
- **E2E Tests**: Playwright 1.56
- **API Testing**: supertest 7.1
- **Mocking**: MSW (Mock Service Worker) 2.12
- **Prompt Evaluation**: promptfoo 0.119.6
- **Code Coverage**: @vitest/coverage-v8 3.2.4
- **Linting**: ESLint 9.21 with TypeScript support
- **Formatting**: Prettier 3.4.2

---

## 2. DATA MODELS (Prisma Schema)

### Core Domain Models

#### User Management
```
User
├── email (unique)
├── name, avatar
├── createdAt, updatedAt
└── Relations:
    ├── preferences (UserPreferences - 1:1)
    ├── userRecipes (UserRecipe[])
    ├── recipeRatings (RecipeRating[])
    ├── pantryLocations (PantryLocation[])
    ├── pantryItems (PantryItem[])
    ├── groceryItems (GroceryItem[])
    ├── depletedItems (DepletedItem[])
    ├── mealPlans (MealPlan[])
    └── userStores (UserStore[])

UserPreferences
├── unitSystem (metric/imperial)
├── themeMode (light/dark/system)
├── language, timezone
├── expirationWarningDays
└── user (FK)
```

#### Recipe Management
```
Recipe
├── name, description
├── prepTime, cookTime, totalTime (minutes)
├── servings, difficulty
├── imageUrl, sourceUrl
├── createdBy (User ID), isPublic (boolean)
└── Relations:
    ├── ingredients (Ingredient[])
    ├── instructions (Instruction[])
    ├── userRecipes (UserRecipe[])
    ├── ratings (RecipeRating[])
    ├── mealPlans (MealPlan[])

UserRecipe (junction table)
├── userId, recipeId (unique together)
├── customServings, customNotes
├── isFavorite, timesCooked, lastCookedAt
└── Indexes: userId+addedDate, userId+isFavorite, userId+timesCooked

Ingredient
├── recipeId, name
├── amount, unit
├── order

Instruction
├── recipeId, step, order

RecipeRating
├── userId, recipeId (unique together)
├── rating (1-5), review
└── Indexes: recipeId+rating, userId+rating
```

#### Pantry Management
```
PantryLocation
├── userId, name, order
└── Relations:
    ├── items (PantryItem[])
    ├── shares (PantryShare[])
    ├── invitations (PantryInvitation[])
    └── activityLogs (PantryActivityLog[])

PantryItem
├── userId, locationId, name
├── amount, unit, category
├── expirationDate, addedDate, updatedAt
└── Indexes: userId+locationId, userId+expirationDate, userId+addedDate

DepletedItem
├── userId, name
├── lastAmount, unit, category
├── depletedDate, timesUsed, isFrequentlyUsed
└── Indexes: userId+depletedDate, userId+timesUsed

PantryShare
├── pantryLocationId, userId, sharedByUserId
├── permission (VIEW, EDIT, MANAGE enum)
├── createdAt, updatedAt, expiresAt
└── Unique: pantryLocationId+userId

PantryInvitation
├── pantryLocationId, invitedEmail, invitedByUserId
├── permission enum
├── invitationToken (unique), status (PENDING, ACCEPTED, DECLINED, EXPIRED)
├── message, createdAt, expiresAt

PantryActivityLog
├── pantryLocationId, userId, action
├── itemName, itemId
├── oldValue, newValue, createdAt
└── Indexes: pantryLocationId+createdAt, userId
```

#### Grocery & Stores
```
GroceryItem
├── userId, name
├── amount, unit, category
├── completed (boolean)
├── addedDate, updatedAt
└── Indexes: userId+completed, userId+addedDate

UserStore
├── userId, name
├── storeType (delivery, pickup, subscription, specialty)
├── website, logoUrl, isEnabled
├── deliveryTime, minOrder, deliveryFee, order
```

#### Meal Planning
```
MealPlan
├── userId, recipeId, date
├── mealType (breakfast, lunch, dinner, snack)
├── servings, notes
└── Indexes: userId+date, userId+mealType
```

### AI Models

```
AIConversation
├── userId, startedAt, endedAt
├── isActive (boolean)
├── metadata (JSON)
└── messages (AIMessage[])

AIMessage
├── conversationId, role (user/assistant/system)
├── content, intent, entities (JSON)
├── confidence, tokens, timestamp, metadata

AICommand
├── userId, messageId (FK, nullable)
├── command, intent, parameters (JSON)
├── result (JSON), success
├── executedAt, executionTime (ms), error
└── Indexes: userId, executedAt, intent

AIImageAnalysis
├── userId, imageUrl
├── analysisType (pantry/grocery/leftovers)
├── detectedItems (JSON), confidence
├── processedAt, metadata
└── Indexes: userId, processedAt

AIRecipeSuggestion
├── userId, recipeId (FK, nullable)
├── suggestedName, reason
├── matchPercentage, missingIngredients (JSON)
├── substituteOptions (JSON), score
├── selected (boolean), feedback (liked/disliked/cooked)
└── Indexes: userId, suggestedAt

AIUserPreference
├── userId, preferenceType
├── value, confidence
├── learnedFrom (JSON)
└── Indexes: userId, preferenceType

AIUsageAnalytics
├── userId, feature (chat/vision/voice/suggestions)
├── action, tokensUsed, cost
├── responseTime (ms), success
├── error, timestamp, metadata
└── Indexes: userId, feature, timestamp

AIContextCache
├── userId, contextType (session/history/preferences)
├── data (JSON), expiresAt
└── Indexes: userId, expiresAt
```

---

## 3. API STRUCTURE

### Routes Organization
```
/api/
├── /extract       → POST recipe extraction from URLs
├── /recipes       → GET/POST/PUT/DELETE recipe management
├── /ratings       → Recipe ratings and reviews
├── /pantry        → Pantry items, locations, sharing
├── /grocery       → Grocery list management
├── /preferences   → User preferences
├── /users         → User profile management
├── /ai            → AI services
│   ├── /chat      → LLM conversations
│   ├── /vision    → Image analysis for pantry items
│   └── /commands  → Natural language command processing
└── /test          → Health checks
```

### Key API Endpoints

#### Pantry Routes (`/api/pantry`)
```typescript
GET  /                    // Get all user pantries (owned + shared)
POST /                    // Save entire pantry data
POST /items               // Add item to pantry (permission checked)
PUT  /items/:itemId       // Update item (permission checked)
DELETE /items/:itemId     // Delete item (permission checked)
GET /activity/:locationId // Activity log for pantry
```

#### Extract Routes (`/api/extract`)
```typescript
POST /  // Extract recipe from URL
        // Extracts via: JSON-LD → Microdata → Heuristic parsing
```

#### Recipes Routes (`/api/recipes`)
```typescript
GET  /              // Get user's recipes with pagination & search
GET  /:id           // Get specific recipe
POST /              // Create recipe
PUT  /:id           // Update recipe
DELETE /:id         // Delete recipe
```

#### AI Routes (`/api/ai`)
```typescript
POST /chat          // Process chat with messages array
POST /vision        // Analyze image (returns detected items)
POST /commands      // Process natural language commands
```

### Permission System
- **Pantry Sharing**: VIEW, EDIT, MANAGE permissions
- **API Checks**: Routes validate user permissions before modifications
- **Activity Logging**: All changes logged with user and timestamp

### Data Validation
- Uses Zod (4.1.12) for runtime validation
- Hono provides built-in request validation
- Prisma provides schema-level constraints

---

## 4. AI/ML INTEGRATIONS

### Vision Analysis (`/api/ai/vision`)
**Purpose**: Detect pantry items from images for the CameraCapture component

**Flow**:
1. User captures image via CameraCapture component
2. Image compressed to 1024x1024, quality 0.8
3. Sent to `/api/ai/vision` endpoint
4. OpenAI Vision API analyzes image
5. Returns detected items with:
   - name (item name)
   - quantity (optional)
   - category (optional)
   - confidence (0-1 score)

**Implementation**:
- `src/server/services/ai/openai.service.ts`: `analyzeImage()` method
- `src/server/routes/ai.ts`: `/vision` endpoint
- `src/contexts/AIContext.tsx`: `analyzeImage()` hook
- `src/components/ai/CameraCapture.tsx`: UI component

### Chat Interface (`/api/ai/chat`)
**Purpose**: Natural language conversation with rate limiting and caching

**Features**:
- Message history context
- System prompts
- Rate limiting (configurable: 100 req/hr default)
- Token counting with tiktoken
- Caching (5 min TTL default)
- Retry with exponential backoff

### Command Processing (`/api/ai/commands`)
**Purpose**: Parse intent from natural language and execute actions

**Flow**:
1. User message sent to `/commands` endpoint
2. `commandProcessor.ts` extracts intent and entities
3. `actionHandlers.ts` executes appropriate action
4. Results saved to database for analytics

### Rate Limiting
```typescript
Config:
- Chat: 100 requests/hour, 50,000 tokens/hour
- Vision: 50 requests/hour, 100,000 tokens/hour
- Configurable via environment variables
```

### Caching
```typescript
- Enabled by default (AI_CACHE_ENABLED=true)
- TTL: 300 seconds (5 minutes)
- Automatic cleanup every 60 seconds
- Cache key: hash of intent + parameters
```

### Error Handling
```typescript
AIError class with:
- Error codes (RATE_LIMIT, INVALID_IMAGE, NETWORK_ERROR, etc.)
- HTTP status codes
- Retryable flag
- Retry-after header
```

---

## 5. TESTING FRAMEWORK SETUP

### Test Stack
```
Vitest 3.2.4         → Unit tests (fast, ESM-native)
Playwright 1.56      → E2E tests (cross-browser)
@testing-library/*   → Component testing
MSW 2.12             → API mocking
supertest 7.1        → API integration testing
promptfoo 0.119.6    → LLM evaluation
```

### Test Organization
```
src/
├── components/
│   └── __tests__/        # Component unit tests
├── contexts/
│   └── __tests__/        # Context tests
├── utils/
│   └── *.test.ts        # Already has unit tests
│       ├── units.test.ts
│       └── pantryOperations.test.ts
└── server/
    └── services/ai/
        └── __tests__/    # AI service tests
            ├── openai.service.test.ts
            ├── rateLimiter.test.ts
            └── commandProcessor.test.ts

tests/
├── e2e/                 # Playwright tests
├── integration/         # API integration tests
│   └── api.test.ts      # Already exists
├── fixtures/            # Test data
└── setup/               # Global setup

promptfoo/
├── configs/             # Test configurations
├── datasets/            # Test datasets
└── outputs/             # Evaluation results
```

### Running Tests
```bash
bun run test              # Vitest watch mode
bun run test:run          # Single run
bun run test:unit         # Unit tests only
bun run test:integration  # Integration tests
bun run test:e2e          # Playwright tests
bun run test:coverage     # Coverage report
```

### Test Configuration
- **Vitest Config**: `vitest.config.ts` with jsdom environment
- **Playwright Config**: `playwright.config.ts` with multiple browsers (Chromium, Firefox, WebKit, Mobile)
- **Test Timeout**: 10 seconds (for AI tests)
- **Coverage Threshold**: 60% lines/functions/branches/statements

---

## 6. FRONTEND COMPONENT STRUCTURE & PATTERNS

### Global Context Providers
Located in `src/contexts/`:
```
AuthContext        → User authentication state
PantryContext      → Pantry items, locations, operations
GroceryContext     → Grocery list management
AIContext          → AI features toggle, processing state
PreferencesContext → User settings
TimerContext       → Cooking timer functionality
```

### Component Organization
```
src/components/
├── ai/                          # AI-specific components
│   ├── CameraCapture.tsx        # Camera/image upload modal
│   ├── ChatInterface.tsx        # Chat UI
│   ├── VoiceButton.tsx          # Speech synthesis
│   └── AIAnalyticsDashboard.tsx # Analytics dashboard
│
├── page components
│   ├── PantryPage.tsx           # Pantry inventory UI
│   ├── RecipesPage.tsx          # Recipe listing
│   ├── GroceryList.tsx          # Grocery management
│   ├── CalendarView.tsx         # Meal planning calendar
│   ├── AddRecipePage.tsx        # Recipe creation/extraction
│   ├── StoresPage.tsx           # Store management
│   └── PreferencesPage.tsx      # Settings
│
├── feature components
│   ├── RecipeExtractor.tsx      # URL recipe extraction
│   ├── RecipeList.tsx
│   ├── RecipeView.tsx
│   ├── IngredientAvailability.tsx
│   ├── PantrySharing.tsx
│   ├── GroceryOptionsDialog.tsx
│   ├── PerformanceMonitor.tsx
│   │
├── layout
│   ├── Sidebar.tsx              # Navigation sidebar
│   └── ProtectedRoute.tsx       # Auth guard
│
└── icons/
    └── CustomIcons.tsx          # Custom SVG icons
```

### Design System (Chakra UI)
- **Theme**: Custom theme in `src/theme.ts`
- **Components Used**:
  - Layout: Box, Container, VStack, HStack, Grid
  - Form: Input, Button, Modal, Checkbox
  - Data Display: Table, Badge, Progress
  - Feedback: Toast, Alert, Spinner
- **Color Mode**: Light/Dark mode support via useColorModeValue()
- **Responsive**: Mobile-first design with breakpoint system

### State Management Patterns
```typescript
// Example: PantryContext uses
export interface PantryContextType {
  pantryData: PantryLocation[]
  setPantryData: (data | callback) => void
  addDepletedItem: (item) => void
  findItemInPantry: (itemName) => PantryItem | null
  getItemAvailability: (itemName, amount?, unit?) => availability
}

// Components consume via:
const { pantryData, addDepletedItem } = usePantry()
```

### Data Flow
1. **User Action**: Click button, submit form
2. **Component Event**: Handled by useCallback
3. **Context Update**: setPantryData(), addDepletedItem(), etc.
4. **API Call** (if needed): axios POST/PUT/DELETE to /api/*
5. **Database Persist**: Server saves to PostgreSQL
6. **UI Re-render**: Context subscribers update

---

## 7. AUTHENTICATION & API KEY MANAGEMENT

### Authentication Method
- **Provider**: Firebase Auth
- **Usage**: User email/password or social login
- **Frontend Flow**:
  - AuthContext manages auth state
  - ProtectedRoute guards authenticated pages
  - User ID passed to API calls

### Secrets Management

#### Environment Variables Structure
```env
# Database
DATABASE_URL="postgresql://..."

# Server
PORT=3003

# Firebase
FIREBASE_API_KEY
FIREBASE_AUTH_DOMAIN
FIREBASE_PROJECT_ID

# OpenAI
OPENAI_API_KEY
OPENAI_ORG_ID (optional)

# AI Models
AI_MODEL_CHAT=gpt-4-turbo-preview
AI_MODEL_VISION=gpt-4-vision-preview
AI_MODEL_EMBEDDING=text-embedding-3-small

# Rate Limits
AI_CHAT_RATE_LIMIT=100
AI_VISION_RATE_LIMIT=50
AI_CHAT_TOKEN_LIMIT=50000
AI_VISION_TOKEN_LIMIT=100000

# AI Features
AI_FEATURES_ENABLED=true
AI_CACHE_ENABLED=true
AI_CACHE_TTL=300
AI_RETRY_ENABLED=true
AI_LOGGING_ENABLED=true
```

#### Infisical Integration (Production)
```typescript
// Location: server/config/secrets.ts
class SecretsManager {
  // Singleton pattern
  
  // Check for Infisical credentials
  useInfisical = !!process.env.INFISICAL_CLIENT_ID
  
  // If Infisical configured:
  // 1. Authenticate with CLIENT_ID + CLIENT_SECRET
  // 2. Fetch from PROJECT_ID, ENVIRONMENT, SECRETS_PATH
  // 3. Attach to process.env automatically
  
  // Fallback: Load from .env if Infisical unavailable
  fetchFromEnvironment()
}

// Usage: await getSecrets()
```

**Benefits**:
- Centralized secrets across environments
- Team collaboration & access control
- Audit logging & version history
- Automatic secret rotation

### API Security
- **CORS**: Configured in server/index.ts
  - Production: `*` (for Cloud Run)
  - Development: `http://localhost:3000`
- **Headers**: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection
- **Rate Limiting**: Per-user, per-feature
- **Token Validation**: Firebase JWT on protected routes

---

## 8. DEPLOYMENT & INFRASTRUCTURE

### Local Development
```bash
bun run dev              # Start all services
bun run dev:client      # Frontend only (port 3000)
bun run dev:server      # Backend only (port 3001)
bun run dev:db          # Database only (Docker)
```

### Production Deployments
- **Cloud Run** (Google Cloud Platform)
- **Kubernetes** (K8s manifests in `/k8s`)
- **Docker Compose** (with PostgreSQL)

### Environment Configurations
- `.env.docker` - Docker local development
- `.env.k8s.example` - Kubernetes deployment
- `.env.cloudrun.example` - Cloud Run deployment
- `.env.production.example` - Production example

---

## SUMMARY TABLE

| Aspect | Technology | Version |
|--------|-----------|---------|
| **Frontend Framework** | React | 18.3.1 |
| **Backend Framework** | Hono | 4.10.6 |
| **Database** | PostgreSQL | 5.22 (Prisma) |
| **Build Tool** | Vite | 5.4 |
| **Runtime** | Bun | Latest |
| **UI Library** | Chakra UI | 2.10.9 |
| **AI Provider** | OpenAI | 6.9.0 |
| **Testing (Unit)** | Vitest | 3.2.4 |
| **Testing (E2E)** | Playwright | 1.56.1 |
| **Auth** | Firebase | 12.6.0 |
| **Secrets** | Infisical | 4.0.6 |
| **Camera** | react-webcam | 7.2.0 |
| **HTTP Client** | Axios | 1.13.2 |

---

## READY FOR CAMERA/VIDEO COMPONENT

The application already has:
- ✅ CameraCapture component with Webcam integration
- ✅ Vision API endpoint at `/api/ai/vision`
- ✅ Image compression and optimization
- ✅ Detected items UI with confidence scores
- ✅ Integration with PantryContext for adding items
- ✅ Multiple capture modes (pantry/grocery/leftovers)
- ✅ File upload fallback for users without camera access

Your camera/video scanning component can leverage this existing infrastructure!
