# Testing Guide

This project uses a comprehensive testing setup with Vitest, React Testing Library, and MSW for reliable test coverage.

## 🧪 Testing Stack

- **Vitest**: Fast unit test runner built on Vite
- **React Testing Library**: Component testing utilities
- **MSW (Mock Service Worker)**: API mocking for isolated tests
- **@testing-library/jest-dom**: Custom matchers for DOM elements
- **@testing-library/user-event**: Realistic user interaction testing

## 📁 Test Organization

```
src/
├── api/__tests__/          # API function unit tests
│   ├── tasks.test.ts
│   ├── recommendations.test.ts
│   ├── projects.test.ts
│   └── goals.test.ts
├── components/__tests__/   # Component tests
│   ├── TaskForm.test.tsx
│   └── SuggestWeekModal.test.tsx
└── test/                   # Test configuration
    ├── setup.ts           # Test setup and MSW integration
    ├── utils.tsx          # Custom render with providers
    └── mocks/
        ├── handlers.ts    # MSW request handlers
        └── server.ts      # MSW server setup
```

## 🚀 Running Tests

```bash
# Run tests in watch mode (development)
npm test

# Run tests once (CI/production)
npm run test:run

# Run tests with coverage report
npm run test:coverage

# Run tests with UI interface
npm run test:ui
```

## 📊 Coverage Requirements

The project maintains high test coverage with the following thresholds:
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

## 🎯 Test Categories

### Unit Tests (API)
- Test all API functions in isolation
- Mock HTTP requests with MSW
- Verify request parameters and response handling
- Test error scenarios and edge cases

### Component Tests
- Test component rendering and user interactions
- Mock external dependencies
- Verify accessibility and form validation
- Test state management and side effects

### Integration Tests
- End-to-end user workflows
- API integration testing
- Cross-component interactions

## 🔧 Writing Tests

### API Tests Example
```typescript
import { describe, it, expect } from 'vitest'
import { listTasks } from '../tasks'

describe('Tasks API', () => {
  it('fetches tasks with correct parameters', async () => {
    const tasks = await listTasks(['backlog'])
    
    expect(Array.isArray(tasks)).toBe(true)
    expect(tasks[0]).toHaveProperty('id')
    expect(tasks[0]).toHaveProperty('title')
  })
})
```

### Component Tests Example
```typescript
import React from 'react'
import { render, screen } from '../../test/utils'
import userEvent from '@testing-library/user-event'
import TaskForm from '../TaskForm'

describe('TaskForm', () => {
  it('submits form with correct data', async () => {
    const mockSubmit = vi.fn()
    const user = userEvent.setup()
    
    render(<TaskForm onSubmit={mockSubmit} />)
    
    await user.type(screen.getByLabelText(/title/i), 'Test Task')
    await user.click(screen.getByRole('button', { name: /add/i }))
    
    expect(mockSubmit).toHaveBeenCalledWith({
      title: 'Test Task',
      tags: '',
      project_id: null,
      goal_id: null,
      hard_due_at: null,
      soft_due_at: null,
    })
  })
})
```

## 🤖 CI/CD Integration

Tests run automatically on:
- Every push to `main` and `develop` branches
- All pull requests
- Multiple Node.js versions (18, 20)

### Workflow Features
- ✅ Comprehensive test suite execution
- ✅ Coverage reporting and enforcement
- ✅ Security audits
- ✅ Build verification
- ✅ Codecov integration for coverage tracking

## 📈 Coverage Reports

Coverage reports are generated in multiple formats:
- **Terminal**: Immediate feedback during development
- **HTML**: Detailed interactive reports in `coverage/` directory
- **LCOV**: Machine-readable format for CI integration
- **JSON**: Programmatic access to coverage data

## 🛠️ Mock Service Worker (MSW)

### API Mocking Strategy
- All API endpoints are mocked in `src/test/mocks/handlers.ts`
- Handlers return realistic data matching backend schemas
- Test-specific overrides using `server.use()` for edge cases
- Automatic cleanup between tests

### Adding New API Mocks
```typescript
export const handlers = [
  http.get(`${API_BASE}/api/v1/new-endpoint`, () => {
    return HttpResponse.json({
      data: 'mock response'
    })
  })
]
```

## 🔍 Best Practices

1. **Test Behavior, Not Implementation**: Focus on user interactions and outcomes
2. **Use Descriptive Test Names**: Clearly describe what is being tested
3. **Mock External Dependencies**: Keep tests isolated and fast
4. **Test Edge Cases**: Include error states and boundary conditions
5. **Keep Tests DRY**: Extract common test utilities and fixtures
6. **Use Accessibility Queries**: Prefer `getByRole`, `getByLabelText`, etc.

## 🐛 Debugging Tests

```bash
# Run specific test file
npm test TaskForm.test.tsx

# Run tests matching pattern
npm test -- --grep "submits form"

# Debug with browser tools
npm run test:ui
```

## 📚 Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro)
- [MSW Documentation](https://mswjs.io/docs/)
- [Jest DOM Matchers](https://github.com/testing-library/jest-dom)