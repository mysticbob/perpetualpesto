# Testing Guide

Comprehensive testing guide for the Perpetual Pesto recipe application.

## Table of Contents

- [Overview](#overview)
- [Test Infrastructure](#test-infrastructure)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Test Coverage](#test-coverage)
- [CI/CD Integration](#cicd-integration)
- [Best Practices](#best-practices)

## Overview

Our testing strategy focuses on:

- **Unit Tests**: Individual functions and components in isolation
- **Integration Tests**: Interactions between components, contexts, and APIs
- **Performance Tests**: Cache efficiency and API response times
- **Coverage Goals**: Minimum 60% coverage across all metrics

### Testing Stack

- **Test Runner**: [Vitest](https://vitest.dev/) - Fast, Vite-native test framework
- **Component Testing**: [@testing-library/react](https://testing-library.com/react)
- **Assertions**: Vitest's built-in assertions + jest-dom matchers
- **Mocking**: Vitest's vi utilities
- **Coverage**: v8 coverage provider

## Test Infrastructure

### Configuration Files

#### `vitest.config.ts`

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 60,
        statements: 60,
      },
    },
  },
})
```

#### `src/test/setup.ts`

Global test setup that:
- Configures @testing-library cleanup
- Mocks browser APIs (IntersectionObserver, ResizeObserver, matchMedia)
- Provides test utilities

#### `src/test/utils.tsx`

Custom render function with all providers:

```typescript
import { render } from '@/test/utils'

// Automatically wraps components with:
// - ChakraProvider (theme)
// - BrowserRouter (routing)
```

## Running Tests

### Local Development

```bash
# Run tests in watch mode
bun run test

# Run tests once
bun run test:run

# Run with UI
bun run test:ui

# Generate coverage report
bun run test:coverage

# Run specific test file
bun run test src/components/shared/LoadingState.test.tsx

# Run tests matching pattern
bun run test -t "should render"
```

### CI/CD

Tests automatically run on:
- Push to `main` or `develop` branches
- Pull requests targeting `main` or `develop`

See `.github/workflows/test.yml` for full CI configuration.

## Writing Tests

### Unit Tests - Pure Functions

Test pure utility functions in isolation:

```typescript
// src/utils/fractionParser.test.ts
import { describe, it, expect } from 'vitest'
import { parseFraction } from './fractionParser'

describe('parseFraction', () => {
  it('should parse simple fractions', () => {
    expect(parseFraction('1/2')).toBe(0.5)
    expect(parseFraction('3/4')).toBe(0.75)
  })

  it('should parse mixed numbers', () => {
    expect(parseFraction('1 1/2')).toBe(1.5)
  })

  it('should handle edge cases', () => {
    expect(parseFraction('')).toBe(0)
    expect(parseFraction('abc')).toBeNaN()
  })
})
```

### Component Tests

Test React components with user interactions:

```typescript
// src/components/shared/EmptyState.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@/test/utils'
import { EmptyState } from './EmptyState'

describe('EmptyState', () => {
  it('should render with title', () => {
    render(<EmptyState title="No recipes found" />)

    expect(screen.getByText('No recipes found')).toBeInTheDocument()
  })

  it('should call action when button clicked', () => {
    const handleClick = vi.fn()

    render(
      <EmptyState
        title="Empty"
        action={{ label: 'Add Recipe', onClick: handleClick }}
      />
    )

    screen.getByRole('button', { name: 'Add Recipe' }).click()

    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

### Service Tests

Test backend services and caching:

```typescript
// server/lib/cache.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getCacheService } from './cache'

describe('CacheService', () => {
  let cache

  beforeEach(() => {
    cache = getCacheService()
  })

  afterEach(async () => {
    await cache.clear()
  })

  it('should set and get a value', async () => {
    await cache.set('test-key', 'test-value')
    const result = await cache.get('test-key')

    expect(result).toBe('test-value')
  })

  it('should compute value when not in cache', async () => {
    const compute = vi.fn(async () => 'computed-value')

    const result = await cache.getOrCompute('key', compute)

    expect(result).toBe('computed-value')
    expect(compute).toHaveBeenCalledTimes(1)
  })
})
```

### Testing Patterns

#### Testing User Interactions

```typescript
import { userEvent } from '@testing-library/user-event'

it('should handle user typing', async () => {
  const user = userEvent.setup()
  const handleChange = vi.fn()

  render(<SearchBar value="" onChange={handleChange} />)

  const input = screen.getByRole('textbox')
  await user.type(input, 'pasta')

  expect(handleChange).toHaveBeenCalled()
})
```

#### Testing Async Operations

```typescript
it('should load data asynchronously', async () => {
  render(<RecipeList />)

  // Initially shows loading state
  expect(screen.getByText('Loading...')).toBeInTheDocument()

  // Wait for data to load
  await waitFor(() => {
    expect(screen.getByText('Recipe 1')).toBeInTheDocument()
  })
})
```

#### Testing Error States

```typescript
it('should display error message', () => {
  const handleRetry = vi.fn()

  render(
    <ErrorState
      title="Failed to load"
      message="Network error"
      onRetry={handleRetry}
    />
  )

  expect(screen.getByText('Failed to load')).toBeInTheDocument()
  expect(screen.getByText('Network error')).toBeInTheDocument()

  screen.getByRole('button', { name: 'Try Again' }).click()
  expect(handleRetry).toHaveBeenCalled()
})
```

#### Testing with Mocks

```typescript
import { vi } from 'vitest'

it('should call API with correct parameters', async () => {
  const mockFetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ recipes: [] })
  })

  global.fetch = mockFetch

  await fetchRecipes('user-123')

  expect(mockFetch).toHaveBeenCalledWith(
    expect.stringContaining('userId=user-123')
  )
})
```

## Test Coverage

### Viewing Coverage

```bash
# Generate coverage report
bun run test:coverage

# Open HTML report in browser
open coverage/index.html
```

### Coverage Thresholds

Minimum thresholds enforced by CI:

- **Lines**: 60%
- **Functions**: 60%
- **Branches**: 60%
- **Statements**: 60%

### Current Coverage

| Category | Files Tested | Coverage |
|----------|-------------|----------|
| **Shared Components** | 5/5 | 100% |
| **Utils** | 4/9 | ~80% |
| **Services** | 1/2 | 50% |
| **Overall** | 10/50 | ~20% |

### Priority Areas for Testing

1. ✅ Shared components (LoadingState, EmptyState, ErrorState, PageHeader, SearchBar)
2. ✅ Cache service (critical for performance)
3. ✅ Core utilities (fractionParser, amountParsing, units, pantryOperations, foodMatching)
4. ⏳ Context providers (Auth, Pantry, Grocery, Preferences)
5. ⏳ API routes (recipes, pantry, grocery, ratings)
6. ⏳ Feature components (RecipeList, RecipeView, PantryPage, etc.)

## CI/CD Integration

### GitHub Actions Workflow

Our CI pipeline includes:

1. **Lint Check**
   - ESLint validation
   - Code formatting check

2. **Unit Tests**
   - Run all unit tests
   - Generate coverage report
   - Upload to Codecov

3. **Integration Tests**
   - Start PostgreSQL + Redis services
   - Run database migrations
   - Test with real services

4. **Build Check**
   - Verify production build succeeds
   - Check bundle size

5. **Type Check**
   - TypeScript compilation check

### Status Badges

Add to your README:

```markdown
![Tests](https://github.com/yourusername/perpetualpesto/actions/workflows/test.yml/badge.svg)
![Coverage](https://codecov.io/gh/yourusername/perpetualpesto/branch/main/graph/badge.svg)
```

## Best Practices

### 1. Test Organization

```typescript
describe('ComponentName', () => {
  describe('Feature/Behavior', () => {
    it('should do something specific', () => {
      // Test implementation
    })
  })
})
```

### 2. Naming Conventions

- Test files: `ComponentName.test.tsx` or `utilityName.test.ts`
- Test descriptions: Use "should" statements
  - ✅ `it('should render with default props')`
  - ❌ `it('renders with default props')`

### 3. Arrange-Act-Assert Pattern

```typescript
it('should update value on change', () => {
  // Arrange
  const handleChange = vi.fn()
  render(<Input onChange={handleChange} />)

  // Act
  const input = screen.getByRole('textbox')
  fireEvent.change(input, { target: { value: 'new value' } })

  // Assert
  expect(handleChange).toHaveBeenCalledWith('new value')
})
```

### 4. Test What Users See

Focus on user-visible behavior, not implementation details:

```typescript
// ✅ Good - tests user-visible behavior
expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument()
screen.getByRole('button', { name: 'Submit' }).click()

// ❌ Bad - tests implementation details
expect(wrapper.find('.submit-button').prop('onClick')).toBeDefined()
```

### 5. Avoid Testing Third-Party Libraries

Don't test Chakra UI, React Router, etc. Test your usage of them:

```typescript
// ✅ Good - tests your component's behavior
it('should navigate to recipe page', () => {
  render(<RecipeCard recipe={mockRecipe} />)
  screen.getByText('View Details').click()
  // Assert navigation happened
})

// ❌ Bad - tests React Router
it('should use Link component', () => {
  expect(wrapper.find(Link)).toExist()
})
```

### 6. Keep Tests Fast

- Mock external dependencies (APIs, databases)
- Use in-memory cache for cache tests
- Avoid unnecessary `waitFor` delays

### 7. Test Edge Cases

```typescript
describe('Edge cases', () => {
  it('should handle empty input', () => {
    expect(parseFraction('')).toBe(0)
  })

  it('should handle null input', () => {
    expect(parseAmount(null)).toEqual({ value: 1, unit: undefined })
  })

  it('should handle very large numbers', () => {
    expect(formatAmount(999999)).toBe('999999')
  })
})
```

### 8. Use Descriptive Test Data

```typescript
// ✅ Good - clear what's being tested
const mockRecipe = {
  id: 'recipe-1',
  title: 'Chocolate Chip Cookies',
  ingredients: ['flour', 'sugar', 'chocolate chips']
}

// ❌ Bad - unclear test data
const mockRecipe = { id: '1', title: 'R1', ingredients: ['a', 'b'] }
```

### 9. Clean Up After Tests

```typescript
import { afterEach } from 'vitest'

afterEach(async () => {
  await cache.clear()
  vi.clearAllMocks()
})
```

### 10. Test Accessibility

```typescript
it('should be keyboard accessible', async () => {
  const user = userEvent.setup()
  render(<SearchBar value="" onChange={vi.fn()} />)

  // Tab to focus
  await user.tab()

  expect(screen.getByRole('textbox')).toHaveFocus()
})

it('should have proper ARIA labels', () => {
  render(<PageHeader title="Recipes" onBack={vi.fn()} />)

  expect(screen.getByLabelText('Go back')).toBeInTheDocument()
})
```

## Debugging Tests

### Run Single Test

```bash
bun run test -t "should render with title"
```

### Use --ui for Visual Debugging

```bash
bun run test:ui
```

### Console Logging in Tests

```typescript
it('should do something', () => {
  const { container } = render(<Component />)

  // Print component HTML
  screen.debug()

  // Print specific element
  screen.debug(screen.getByRole('button'))

  // Console log
  console.log(container.innerHTML)
})
```

### Check Failed Assertions

```typescript
expect(element).toBeInTheDocument()
// If failed, shows:
// Expected element to be in the document
// Received: null
```

## Performance Testing

### Cache Performance Tests

```typescript
it('should be faster than recomputing', async () => {
  const slowCompute = vi.fn(async () => {
    await new Promise(resolve => setTimeout(resolve, 50))
    return 'result'
  })

  const start1 = Date.now()
  await cache.getOrCompute('key', slowCompute)
  const duration1 = Date.now() - start1

  const start2 = Date.now()
  await cache.getOrCompute('key', slowCompute)
  const duration2 = Date.now() - start2

  expect(duration2).toBeLessThan(duration1 / 10)
})
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Accessibility Testing](https://testing-library.com/docs/queries/about#priority)

## Getting Help

- Check existing tests for patterns
- Review this guide
- Ask in team chat
- Open an issue for test infrastructure problems

---

**Last Updated**: 2025-01-05
**Maintained by**: Development Team
