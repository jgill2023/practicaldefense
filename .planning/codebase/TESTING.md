# Testing Patterns

**Analysis Date:** 2026-02-20

## Test Framework

**Runner:**
- Not configured or implemented
- No `jest.config.ts`, `vitest.config.ts`, or test framework found
- No test dependencies in `package.json` (no jest, vitest, mocha, etc.)

**Assertion Library:**
- Not configured
- No testing library packages detected

**Run Commands:**
- Not applicable - no test scripts in `package.json`

## Test File Organization

**Location:**
- No test files found in repository (no `*.test.ts`, `*.spec.ts` files)
- No `/tests` or `/__tests__` directories

**Naming:**
- Not established

**Structure:**
- Not established

## Test Coverage

**Requirements:**
- No coverage configuration detected
- No coverage tooling in dependencies

**View Coverage:**
- Not applicable

## Test Types

**Unit Tests:**
- Not implemented
- Recommend testing for: utility functions in `client/src/lib/`, `server/` utility services

**Integration Tests:**
- Not implemented
- Would be valuable for: API endpoints, database queries, authentication flows

**E2E Tests:**
- Not implemented
- No E2E test framework (Cypress, Playwright, etc.) found

## Current Testing Approach

**Manual Testing Only:**
- No automated tests configured
- `package.json` contains no test commands
- Development relies on manual testing during dev server run

**Testing Scripts in package.json:**
```json
{
  "scripts": {
    "dev": "NODE_ENV=development tsx server/index.ts",
    "build": "vite build && esbuild server/index.ts ...",
    "start": "NODE_ENV=production node dist/index.js",
    "check": "tsc",
    "db:push": "drizzle-kit push",
    "test-enrollment": "tsx server/create_test_enrollment.ts"
  }
}
```

Only `test-enrollment` is a test utility for creating test data, not automated testing.

## Type Checking

**TypeScript Validation:**
- `"check": "tsc"` command runs TypeScript compiler in no-emit mode
- `"strict": true` in `tsconfig.json` enforces strict type checking
- This provides compile-time type safety but no runtime behavior testing

**Running Type Check:**
```bash
npm run check
```

## Code Areas Needing Testing

**High Priority (Core Business Logic):**
- `server/auth/routes.ts` - Authentication endpoints (signup, login, password reset, email verification)
- `server/appointments/service.ts` - Appointment scheduling and time slot calculations
- `server/appointments/routes.ts` - Appointment API endpoints
- `server/services/calendarService.ts` - Google Calendar integration and availability calculations
- `server/store/routes.ts` - Product management and cart operations (large file: 710+ lines)

**Medium Priority (Data Operations):**
- `client/src/lib/authUtils.ts` - Role/permission checking functions
- `client/src/lib/queryClient.ts` - API request handling and error management
- `server/customAuth.ts` - Password hashing, token generation, session management
- `server/db.ts` - Database connection and pool configuration

**Lower Priority (UI Components):**
- `client/src/components/` - React components (large components like `CommunicationsDashboard.tsx` at 3600+ lines could benefit from unit tests)
- `client/src/hooks/` - Custom React hooks

## Suggested Testing Structure

**If implementing Jest:**
```
project/
├── server/
│   ├── auth/
│   │   ├── routes.ts
│   │   └── routes.test.ts
│   ├── appointments/
│   │   ├── service.ts
│   │   ├── service.test.ts
│   │   ├── routes.ts
│   │   └── routes.test.ts
│   ├── services/
│   │   ├── calendarService.ts
│   │   └── calendarService.test.ts
│   ├── customAuth.ts
│   └── customAuth.test.ts
├── client/
│   └── src/
│       ├── lib/
│       │   ├── authUtils.ts
│       │   └── authUtils.test.ts
│       ├── hooks/
│       │   ├── useAuth.ts
│       │   └── useAuth.test.ts
└── jest.config.js
```

**jest.config.js Template:**
```javascript
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/server', '<rootDir>/client/src'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/client/src/$1',
    '^@shared/(.*)$': '<rootDir>/shared/$1',
  },
  collectCoverageFrom: [
    'server/**/*.ts',
    'client/src/**/*.ts',
    'client/src/**/*.tsx',
    '!**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      lines: 50,
      functions: 50,
      branches: 50,
      statements: 50,
    },
  },
};
```

## Key Testing Considerations

**Database Testing:**
- Current setup uses Neon serverless database
- Tests should use a test database or mock Drizzle ORM queries
- `server/db.ts` handles connection pooling and error handling

**Authentication Testing:**
- Password hashing with bcrypt (`SALT_ROUNDS = 12`)
- Token generation and expiry checking
- Session management with `connect-pg-simple`
- Role-based access control checking

**API Testing:**
- Express routes typically follow pattern:
  1. Validate input with Zod
  2. Query database with Drizzle ORM
  3. Handle errors with try-catch
  4. Return JSON responses with status codes

**Async Operations:**
- Many route handlers use `async/await`
- Google Calendar API integration (`googleapis` library)
- SendGrid email service (`@sendgrid/mail`)
- Stripe payment integration (`stripe` library)

## Manual Testing Practices Observed

**Development Server:**
- Run with `npm run dev` for TypeScript live reloading
- `tsx` is used for runtime TypeScript execution

**Type Checking:**
- Run `npm run check` to validate TypeScript types before testing

**Test Data Creation:**
- `server/create_test_enrollment.ts` script creates test enrollments
- Run with: `npm run test-enrollment`

## Validation Patterns Used

**Zod Schemas (Server):**
```typescript
const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});
```

**React Hook Form (Client):**
```typescript
const courseSchema = z.object({
  title: z.string().min(1, "Course title is required"),
  price: z.string().min(1, "Price is required"),
  maxStudents: z.number().min(1, "Must allow at least 1 student"),
});

const form = useForm({
  resolver: zodResolver(courseSchema),
  defaultValues: initialData,
});
```

**Frontend Input Validation:**
- Form validation with React Hook Form + Zod
- Conditional rendering based on form state
- Error messages displayed inline

## Testing Gaps

**Critical Gaps:**
1. No automated testing of authentication flows
2. No tests for appointment scheduling logic (complex timezone handling)
3. No tests for payment processing (Stripe integration)
4. No tests for email/SMS notifications
5. No tests for Google Calendar synchronization

**Impact:**
- Bugs in critical paths may go undetected until production
- Refactoring is risky without test coverage
- Integration issues between services are hard to catch early

---

*Testing analysis: 2026-02-20*
