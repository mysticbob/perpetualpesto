# Testing Guide

This guide covers how to write and run tests for the PerpetualPesto application.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Running Tests](#running-tests)
3. [Writing Unit Tests](#writing-unit-tests)
4. [Writing Integration Tests](#writing-integration-tests)
5. [Writing E2E Tests](#writing-e2e-tests)
6. [ML Model Evaluation](#ml-model-evaluation)
7. [Best Practices](#best-practices)
8. [CI/CD](#cicd)

---

## Quick Start

### Install Dependencies

```bash
bun install
```

### Install Playwright Browsers (for E2E tests)

```bash
bun run playwright:install
```

### Run All Tests

```bash
# Unit + Integration + E2E
bun run test:all

# Or run separately
bun run test:unit
bun run test:integration
bun run test:e2e
```

---

## Running Tests

### Unit Tests

```bash
# Run all unit tests
bun run test:unit

# Run in watch mode
bun run test:watch

# Run with UI
bun run test:ui

# Run with coverage
bun run test:coverage
```

### Integration Tests

```bash
# Make sure database is running
bun run db:up

# Run integration tests
bun run test:integration
```

### E2E Tests

```bash
# Run all E2E tests (headless)
bun run test:e2e

# Run with browser UI
bun run test:e2e:ui

# Run with visible browser
bun run test:e2e:headed
```

### ML Model Evaluation

```bash
# Run recipe suggestion evaluation
bun run promptfoo:eval

# Run command intent evaluation
bun run promptfoo:eval:intent

# Run all evaluations
bun run promptfoo:eval:all

# View results in browser
bun run promptfoo:view
```

---

## Writing Unit Tests

Unit tests are located next to the code they test or in `__tests__` directories.

### Example: Testing a Utility Function

```typescript
// src/utils/math.test.ts
import { describe, it, expect } from 'vitest';
import { add, subtract } from './math';

describe('Math utilities', () => {
  describe('add', () => {
    it('should add two positive numbers', () => {
      expect(add(2, 3)).toBe(5);
    });

    it('should handle negative numbers', () => {
      expect(add(-2, 3)).toBe(1);
    });
  });

  describe('subtract', () => {
    it('should subtract two numbers', () => {
      expect(subtract(5, 3)).toBe(2);
    });
  });
});
```

### Example: Testing AI Service with Mocks

```typescript
// src/server/services/ai/__tests__/myService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MyAIService } from '../myService';

// Mock external dependencies
vi.mock('openai', () => ({
  default: vi.fn(() => ({
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  })),
}));

describe('MyAIService', () => {
  let service: MyAIService;

  beforeEach(() => {
    service = new MyAIService();
  });

  it('should process request successfully', async () => {
    const result = await service.process('test input');
    expect(result).toBeDefined();
  });
});
```

### Example: Testing React Component

```typescript
// src/components/__tests__/Button.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../Button';

describe('Button', () => {
  it('should render with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should call onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click me</Button>);

    await userEvent.click(screen.getByText('Click me'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByText('Click me')).toBeDisabled();
  });
});
```

---

## Writing Integration Tests

Integration tests verify that multiple components work together correctly.

### Example: Testing API Routes

```typescript
// tests/integration/recipes.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../server/lib/db';
import axios from 'axios';

const BASE_URL = 'http://localhost:3003';

describe('Recipes API', () => {
  let testUserId: string;

  beforeAll(async () => {
    // Setup test data
    const user = await prisma.user.create({
      data: { email: 'test@example.com', name: 'Test' },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  it('should create a recipe', async () => {
    const response = await axios.post(`${BASE_URL}/api/recipes`, {
      name: 'Test Recipe',
      ingredients: [{ name: 'chicken', amount: '2', unit: 'lbs' }],
    });

    expect(response.status).toBe(201);
    expect(response.data.name).toBe('Test Recipe');
  });
});
```

---

## Writing E2E Tests

E2E tests use Playwright to simulate real user interactions.

### Example: Testing User Flow

```typescript
// tests/e2e/login.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('should login successfully', async ({ page }) => {
    await page.goto('/');

    await page.click('text=Login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('text=Welcome')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'wrongpass');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Invalid')).toBeVisible();
  });
});
```

---

## ML Model Evaluation

### Creating Test Cases

Edit `promptfoo/configs/recipe-suggestions.yaml`:

```yaml
tests:
  - description: 'My test case'
    vars:
      ingredients: 'chicken, rice'
      preferences: 'quick meal'
      maxPrepTime: '30'
    assert:
      - type: contains
        value: 'chicken'
      - type: javascript
        value: 'output.length > 50'
```

### Running Evaluations

```bash
# Run specific config
bun run promptfoo:eval

# View results
bun run promptfoo:view
```

### Comparing Models

Promptfoo automatically runs tests across all configured models:
- GPT-4 Turbo
- GPT-4
- GPT-3.5 Turbo

Results show:
- Which model performs best
- Cost per request
- Response time
- Accuracy metrics

---

## Best Practices

### General

- **Write tests first (TDD)** when possible
- **Keep tests focused** - One test should verify one behavior
- **Use descriptive test names** - `it('should X when Y')`
- **Arrange-Act-Assert** pattern
- **Mock external dependencies** - Don't hit real APIs in tests

### Unit Tests

- Test edge cases and error conditions
- Aim for >80% code coverage
- Mock database and external services
- Test pure functions without mocks when possible

### Integration Tests

- Use test database, not production
- Clean up test data after each test
- Test actual database queries
- Verify data integrity

### E2E Tests

- Test critical user flows only (expensive to run)
- Use data-testid for stable selectors
- Handle async operations properly
- Take screenshots on failure (automatic)

### ML Evaluations

- Create diverse test cases
- Include edge cases and error scenarios
- Track performance over time
- Compare different models
- Version your prompts

---

## CI/CD

### GitHub Actions Workflow

The `.github/workflows/test.yml` file runs:

1. **Unit Tests** - Fast, runs on every push
2. **Integration Tests** - Requires PostgreSQL
3. **E2E Tests** - Requires browser setup
4. **ML Evaluation** - Only on main branch or `[eval]` in commit message

### Quality Gates

PRs are blocked if:
- ❌ Any test fails
- ❌ Coverage drops below 60%
- ❌ TypeScript compilation fails

### Running Tests Locally Before Push

```bash
# Quick check
bun run test:unit

# Full check (what CI runs)
bun run test:all
```

---

## Troubleshooting

### Tests Timing Out

Increase timeout in test file:

```typescript
test('slow test', async () => {
  // ...
}, 30000); // 30 second timeout
```

Or globally in `vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    testTimeout: 20000,
  },
});
```

### Database Connection Errors

```bash
# Make sure DB is running
bun run db:up

# Reset if needed
bun run db:reset
```

### Playwright Browser Issues

```bash
# Reinstall browsers
bun run playwright:install

# Run with debug mode
PWDEBUG=1 bun run test:e2e
```

### OpenAI API Errors in Tests

Set environment variable:

```bash
export OPENAI_API_KEY=your-key-here
bun run test
```

Or add to `.env` file.

---

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [Promptfoo Documentation](https://promptfoo.dev/)

---

**Happy Testing! 🧪**
