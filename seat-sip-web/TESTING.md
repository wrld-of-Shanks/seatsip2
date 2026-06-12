# Testing Documentation

## Installation

```bash
cd apps/web
npm install
```

## Test Structure

```
apps/web/
├── __tests__/
│   ├── unit/           # Unit tests for utilities, hooks, services
│   ├── components/     # Component tests with React Testing Library
│   ├── integration/    # Integration tests with MSW
│   ├── accessibility/   # Accessibility tests with jest-axe
│   ├── hooks/          # Hook tests
│   └── services/       # Service/API tests
├── e2e/                # E2E tests with Playwright
├── setup/              # Test setup and configuration
│   ├── msw-handlers.ts # MSW API mocks
│   └── test-utils.tsx  # Custom render utilities
├── jest.config.js      # Jest configuration
├── jest.setup.js       # Jest setup file
└── playwright.config.ts # Playwright configuration
```

## Running Tests

### All Tests
```bash
npm test
```

### Unit Tests
```bash
npm run test:unit
```

### Component Tests
```bash
npm run test:component
```

### Integration Tests
```bash
npm run test:integration
```

### Accessibility Tests
```bash
npm run test:a11y
```

### E2E Tests
```bash
npm run test:e2e
```

### E2E Tests with UI
```bash
npm run test:e2e:ui
```

### Coverage Report
```bash
npm run test:coverage
```

## Coverage Requirements

- **Minimum Coverage**: 70%
- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70

## CI/CD Pipeline

The GitHub Actions workflow runs on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

Pipeline stages:
1. Unit Tests
2. Component Tests
3. Integration Tests
4. E2E Tests
5. Accessibility Tests
6. Lint
7. Build
8. Performance Tests

## Writing Tests

### Unit Tests
```typescript
import { exportToCSV } from '@/utils/export'

describe('exportToCSV', () => {
  it('should export data to CSV', () => {
    const data = [{ id: 1, name: 'Test' }]
    exportToCSV(data, 'test')
    // assertions
  })
})
```

### Component Tests
```typescript
import { render, screen } from '@/setup/test-utils'
import { DataTable } from '@/components/ui/Table'

describe('DataTable', () => {
  it('should render table', () => {
    render(<DataTable data={data} columns={columns} />)
    expect(screen.getByText('Name')).toBeInTheDocument()
  })
})
```

### Integration Tests
```typescript
import { setupServer } from 'msw/node'
import { handlers } from '@/setup/msw-handlers'

const server = setupServer(...handlers)
beforeAll(() => server.listen())
afterAll(() => server.close())
```

### E2E Tests
```typescript
import { test, expect } from '@playwright/test'

test('should login', async ({ page }) => {
  await page.goto('/login')
  await page.fill('input[type="email"]', 'admin@seatsip.com')
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL('/dashboard')
})
```

## Mocking

### MSW Handlers
API endpoints are mocked in `setup/msw-handlers.ts`. Add new endpoints there for integration tests.

### Component Mocks
Mock external dependencies in `jest.setup.js`:
- `next/navigation`
- `next/image`
- Browser APIs

## Accessibility

Accessibility tests use `jest-axe` to ensure WCAG 2.1 AA compliance.

## Performance

Performance tests measure:
- Page load time (< 3s)
- Core Web Vitals
- Table rendering speed
- Filter operation speed
- Modal open speed

## Visual Regression

Visual regression tests use Playwright screenshots to detect UI changes.
