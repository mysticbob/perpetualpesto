# Test Framework Architecture

## Overview

This document outlines the comprehensive test framework for the PerpetualPesto application, covering unit tests, integration tests, E2E tests, and ML model evaluations.

## Test Pyramid

```
                    /\
                   /  \
                  / E2E \
                 /  Tests \
                /__________\
               /            \
              /  Integration \
             /     Tests      \
            /___________________\
           /                     \
          /      Unit Tests       \
         /_________________________\
```

### Distribution Goals
- **Unit Tests**: 70% of tests - Fast, isolated, comprehensive coverage
- **Integration Tests**: 20% of tests - API routes, database operations
- **E2E Tests**: 10% of tests - Critical user flows
- **ML Evaluations**: Continuous - Prompt quality and model performance

---

## 1. Testing Stack

### Core Testing Libraries
- **Vitest**: Main test runner (already installed)
- **@testing-library/react**: React component testing
- **@testing-library/user-event**: User interaction simulation
- **@vitest/coverage-v8**: Code coverage reporting
- **msw**: API mocking for frontend tests
- **Playwright**: E2E browser testing
- **supertest**: API integration testing
- **promptfoo**: ML/LLM evaluation framework

### Supporting Tools
- **tiktoken**: Accurate token counting for OpenAI
- **faker-js**: Test data generation
- **test-containers**: Isolated database for integration tests (optional)
- **zod**: Runtime validation (also helps with test fixtures)

---

## 2. Test Organization

### Directory Structure
```
/home/user/perpetualpesto/
├── src/
│   ├── components/
│   │   └── __tests__/          # Component tests
│   ├── utils/
│   │   └── *.test.ts           # ✅ Already exists
│   ├── contexts/
│   │   └── __tests__/          # Context tests
│   └── hooks/
│       └── __tests__/          # Hook tests
├── server/
│   ├── routes/
│   │   └── __tests__/          # Route integration tests
│   └── lib/
│       └── __tests__/          # Library unit tests
├── src/server/services/ai/
│   └── __tests__/              # AI service unit tests
├── tests/
│   ├── e2e/                    # E2E tests
│   ├── integration/            # Integration tests
│   ├── fixtures/               # Shared test data
│   ├── helpers/                # Test utilities
│   └── setup/                  # Global test setup
├── promptfoo/
│   ├── configs/                # Promptfoo test configs
│   ├── datasets/               # Test datasets
│   ├── prompts/                # Prompt templates
│   └── outputs/                # Evaluation results
└── vitest.config.ts            # ✅ Already exists
```

---

## 3. Unit Tests

### 3.1 AI Services Tests

#### Files to Test
- `src/server/services/ai/openai.service.ts`
- `src/server/services/ai/aiService.ts`
- `src/server/services/ai/commandProcessor.ts`
- `src/server/services/ai/rateLimiter.ts`
- `src/server/services/ai/errorHandler.ts`
- `src/server/services/ai/config.ts`

#### Test Coverage Requirements
- ✅ All public methods
- ✅ Error handling paths
- ✅ Edge cases (empty inputs, malformed data)
- ✅ Rate limiting logic
- ✅ Cache behavior
- ✅ Retry logic

#### Mocking Strategy
- Mock OpenAI API responses using fixtures
- Mock Prisma client for database operations
- Mock rate limiter for isolated tests

### 3.2 Utility Tests

#### Files to Test
- ✅ `src/utils/pantryOperations.test.ts` (existing)
- ✅ `src/utils/units.test.ts` (existing)
- ✅ `src/utils/foodMatching.test.ts` (existing)
- 🆕 `src/utils/amountParsing.test.ts`
- 🆕 `src/utils/expiration.test.ts`
- 🆕 `src/utils/fractionParser.test.ts`

### 3.3 React Component Tests

#### Components to Test (Priority Order)
1. **AI Components** (High Priority)
   - `ChatInterface.tsx`
   - `CameraCapture.tsx`
   - `VoiceButton.tsx`
   - `AIAnalyticsDashboard.tsx`

2. **Core Features**
   - `PantryPage.tsx`
   - `RecipesPage.tsx`
   - `GroceryList.tsx`
   - `CalendarView.tsx`

3. **UI Components**
   - `ProtectedRoute.tsx`
   - Form components
   - Modal components

#### Testing Approach
- Render with mock contexts
- Test user interactions
- Verify API calls are made correctly
- Test loading/error states
- Test accessibility (a11y)

---

## 4. Integration Tests

### 4.1 API Route Tests

#### Routes to Test
- ✅ `/api/extract` - Recipe extraction
- ✅ `/api/recipes` - Recipe CRUD
- ✅ `/api/pantry` - Pantry management
- ✅ `/api/grocery` - Grocery list
- ✅ `/api/ai/chat` - AI chat
- ✅ `/api/ai/vision` - Image analysis
- ✅ `/api/ai/commands/process-command` - Command processing

#### Test Coverage
- Valid requests return correct status codes
- Invalid requests return proper errors
- Authentication requirements enforced
- Database mutations work correctly
- Rate limiting enforced

#### Setup Requirements
- Test database (separate from dev/prod)
- Mock OpenAI API calls
- Seed test data before each test suite
- Clean up after tests

### 4.2 Database Integration Tests

#### Test Scenarios
- CRUD operations for all models
- Relationship integrity (cascading deletes)
- Unique constraint violations
- Transaction rollbacks
- Index performance

---

## 5. E2E Tests (Playwright)

### Critical User Flows

#### Flow 1: User Onboarding
1. Sign up with email/password
2. Verify email redirect
3. Complete profile setup
4. Navigate to pantry

#### Flow 2: Recipe Extraction
1. Login
2. Navigate to recipes
3. Enter recipe URL
4. Verify recipe extracted correctly
5. Save recipe
6. Verify recipe appears in list

#### Flow 3: AI Chat Interaction
1. Open chat interface
2. Send text command ("add 2 lbs chicken to fridge")
3. Verify AI processes command
4. Verify pantry updated
5. Check confirmation message

#### Flow 4: Vision Analysis
1. Open camera capture
2. Take photo (mock webcam)
3. Verify AI analyzes image
4. Verify items detected
5. Add items to pantry

#### Flow 5: Meal Planning
1. Navigate to calendar
2. Request recipe suggestions
3. Select recipe
4. Add to meal plan
5. Verify appears on calendar

### E2E Test Configuration
- Multiple browsers: Chromium, Firefox, WebKit
- Mobile viewport testing
- Screenshot comparison for visual regression
- Network simulation (slow 3G)
- Accessibility testing

---

## 6. ML Model Evaluation (Promptfoo)

### 6.1 Architecture

Promptfoo allows us to:
- Test prompts across multiple models
- Evaluate response quality with assertions
- Track prompt performance over time
- A/B test prompt variations
- Prevent prompt regression

### 6.2 Test Scenarios

#### Scenario 1: Recipe Suggestion Quality
**Input**: Available ingredients
**Expected Output**: Relevant recipes using those ingredients
**Metrics**:
- Ingredient usage percentage
- Recipe relevance (human eval)
- Response time
- Token count

#### Scenario 2: Command Intent Detection
**Input**: Natural language commands
**Expected Output**: Correct intent and entities
**Test Cases**:
```yaml
- "add 2 lbs chicken to the fridge"
  → intent: ADD_ITEM, entities: [{ingredient: chicken, quantity: 2 lbs, location: fridge}]

- "what can I make with pasta and tomatoes?"
  → intent: FIND_RECIPES, entities: [{ingredient: pasta}, {ingredient: tomatoes}]

- "is my milk expired?"
  → intent: CHECK_EXPIRATION, entities: [{ingredient: milk}]
```

#### Scenario 3: Vision Analysis Accuracy
**Input**: Food images
**Expected Output**: Accurate item identification
**Metrics**:
- Precision (% correct identifications)
- Recall (% items detected)
- False positive rate
- Category accuracy

#### Scenario 4: Conversation Context
**Input**: Multi-turn conversations
**Expected Output**: Contextually appropriate responses
**Test**:
```
User: "Add chicken to my pantry"
AI: "How much chicken would you like to add?"
User: "2 pounds"
AI: "I've added 2 pounds of chicken to your pantry"
```

### 6.3 Model Comparison Matrix

| Scenario | GPT-4 Turbo | GPT-4 | GPT-3.5 Turbo | Claude 3.5 Sonnet |
|----------|-------------|-------|---------------|-------------------|
| Recipe Suggestions | ✅ Test | ✅ Test | ✅ Test | ✅ Test |
| Command Intent | ✅ Test | ✅ Test | ✅ Test | ✅ Test |
| Vision Analysis | ✅ Test | ✅ Test | ❌ N/A | ✅ Test |
| Context Retention | ✅ Test | ✅ Test | ✅ Test | ✅ Test |

### 6.4 Prompt Versioning

Track prompt changes and their impact:
```
v1: Initial prompt
v2: Added JSON schema requirement → +15% accuracy
v3: Added few-shot examples → +8% accuracy
v4: Optimized for token efficiency → -20% cost, -2% accuracy
```

---

## 7. Test Data Management

### 7.1 Fixtures

Create reusable test data:
```typescript
// tests/fixtures/users.ts
export const testUser = {
  id: 'test-user-1',
  email: 'test@example.com',
  name: 'Test User'
}

// tests/fixtures/recipes.ts
export const testRecipe = {
  name: 'Chicken Pasta',
  ingredients: [...],
  instructions: [...]
}

// tests/fixtures/openai-responses.ts
export const mockChatResponse = {
  choices: [{
    message: { content: 'Mocked response' }
  }]
}
```

### 7.2 Database Seeding

Create database seed scripts:
```typescript
// tests/helpers/seed.ts
export async function seedTestDatabase() {
  await prisma.user.createMany({ data: testUsers })
  await prisma.recipe.createMany({ data: testRecipes })
  await prisma.pantryItem.createMany({ data: testPantryItems })
}

export async function cleanDatabase() {
  await prisma.pantryItem.deleteMany()
  await prisma.recipe.deleteMany()
  await prisma.user.deleteMany()
}
```

---

## 8. Coverage Goals

### Overall Coverage Targets
- **Statements**: >80%
- **Branches**: >75%
- **Functions**: >80%
- **Lines**: >80%

### Critical Path Coverage
- **AI Services**: >90%
- **Authentication**: >95%
- **Data mutations**: >90%
- **Payment/billing**: >95% (if applicable)

### Coverage Exclusions
- Type definitions
- Configuration files
- Build scripts
- Migration files

---

## 9. CI/CD Integration

### GitHub Actions Workflow

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun test:run
      - run: bun test:coverage

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run db:push
      - run: bun test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bunx playwright install
      - run: bun test:e2e

  ml-evaluation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run promptfoo:eval
```

### Quality Gates
- ❌ Block PR if coverage drops below 80%
- ❌ Block PR if any E2E test fails
- ⚠️ Warn if ML evaluation score drops >5%
- ❌ Block PR if linting fails

---

## 10. Performance Testing

### Load Testing
- Test recipe extraction under load
- Test AI endpoint concurrency limits
- Database query performance
- Cache hit rates

### Tools
- `autocannon`: HTTP load testing
- Lighthouse: Frontend performance
- Prisma query logging: Database optimization

---

## 11. Security Testing

### Automated Security Checks
- `npm audit`: Dependency vulnerabilities
- SQL injection testing (via integration tests)
- XSS prevention verification
- CSRF token validation
- Rate limit bypass attempts

---

## 12. Test Execution Strategy

### Local Development
```bash
# Run all unit tests in watch mode
bun test

# Run specific test file
bun test src/utils/units.test.ts

# Run with coverage
bun test:coverage

# Run integration tests
bun test:integration

# Run E2E tests
bun test:e2e

# Run promptfoo evaluations
bun run promptfoo:eval
```

### Pre-commit Hooks
- Run unit tests for changed files
- Run linter
- Type check

### Pre-push Hooks
- Run full test suite
- Check coverage threshold

---

## 13. Maintenance

### Weekly
- Review test flakiness reports
- Update snapshots if intentional changes made
- Review coverage reports

### Monthly
- Update test dependencies
- Review and update E2E scenarios
- Re-evaluate promptfoo baselines
- Clean up outdated mocks

### Quarterly
- Comprehensive test suite audit
- Performance testing review
- Security testing review
- Update testing documentation

---

## Next Steps

1. ✅ Install all testing dependencies
2. ✅ Set up promptfoo configuration
3. ✅ Create test directory structure
4. ✅ Implement critical bug fixes
5. ✅ Write unit tests for AI services
6. ✅ Write integration tests for API routes
7. ✅ Set up E2E tests with Playwright
8. ✅ Configure ML evaluations
9. ✅ Set up CI/CD pipeline
10. ✅ Document testing best practices

---

**End of Test Framework Architecture**
