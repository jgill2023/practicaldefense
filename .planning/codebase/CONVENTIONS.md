# Coding Conventions

**Analysis Date:** 2026-02-20

## Naming Patterns

**Files:**
- Component files: PascalCase (e.g., `CourseCard.tsx`, `EditCourseForm.tsx`, `AllStudentsDirectory.tsx`)
- Utility/service files: camelCase (e.g., `authUtils.ts`, `queryClient.ts`, `customAuth.ts`)
- Hook files: camelCase with `use` prefix (e.g., `useAuth.ts`, `useCommunicationCounts.ts`)
- UI component files: camelCase (e.g., `card.tsx`, `button.tsx`, `dialog.tsx`)
- Route files: camelCase or kebab-case (e.g., `routes.ts`)

**Functions:**
- Regular functions: camelCase (e.g., `getSession()`, `hashPassword()`, `generateToken()`)
- React components: PascalCase (e.g., `function CourseCard()`, `function Layout()`)
- Private/utility functions: camelCase (e.g., `throwIfResNotOk()`, `setTimeOnDate()`)
- Constants: UPPER_SNAKE_CASE (e.g., `SALT_ROUNDS`, `INSTRUCTOR_TIMEZONE`, `SESSION_SECRET`)

**Variables:**
- Local variables: camelCase (e.g., `searchTerm`, `statusFilter`, `sortField`)
- State variables from hooks: camelCase (e.g., `const [isLoading, setIsLoading] = useState()`)
- Query results: camelCase (e.g., `const { data: user, isLoading }`)
- Event handlers: camelCase prefixed with action verb (e.g., `handleSubmit()`, `handleClick()`)

**Types:**
- Interfaces: PascalCase (e.g., `ProtectedRouteProps`, `CourseCardProps`, `LayoutProps`, `EditCourseFormProps`)
- Type aliases: PascalCase (e.g., `type SortField = 'name' | 'email' | 'status'`)
- Imported types: Use `type` keyword (e.g., `import type { CourseWithSchedules, Category }`)
- Schema types: CamelCase from Zod definitions (e.g., `z.object({ title: z.string() })`)

## Code Style

**Formatting:**
- No explicit linter/formatter configuration detected (ESLint/Prettier not configured)
- TypeScript strict mode enabled: `"strict": true` in `tsconfig.json`
- Two-space indentation observed throughout codebase
- Semicolons used consistently at end of statements
- Line length typically under 100 characters

**Linting:**
- No ESLint or Prettier configuration found in repository
- Code should follow TypeScript strict mode: `strict: true` in `tsconfig.json`
- Focus on type safety; avoid `any` types where possible (though some `any` usage exists for historical reasons)

## Import Organization

**Order:**
1. React and third-party libraries (`react`, `@tanstack/react-query`, `express`, `drizzle-orm`)
2. Relative imports from libs and utilities (`@/lib/*`, `@/hooks/*`, `@/utils/*`)
3. Component imports (`@/components/*`)
4. Type imports (use `import type`)
5. Icon imports (e.g., `lucide-react`, `react-icons`)

**Pattern observed in client:**
```typescript
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import type { CourseWithSchedules } from "@shared/schema";
import { Calendar, Users } from "lucide-react";
```

**Pattern observed in server:**
```typescript
import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq, and } from "drizzle-orm";
```

**Path Aliases:**
- `@/*`: Points to `./client/src/*`
- `@shared/*`: Points to `./shared/*`

## Error Handling

**Patterns:**
- Try-catch blocks around async operations (e.g., in route handlers, mutations)
- Zod validation errors checked with `error instanceof z.ZodError`
- HTTP status codes used explicitly (400, 401, 403, 404, 500)
- Error logging via `console.error()` with descriptive messages
- Type casting with `error as any` for error catching

**Example pattern from `server/auth/routes.ts`:**
```typescript
try {
  const { email, password, firstName, lastName } = signupSchema.parse(req.body);
  // ... logic
  res.status(201).json({ message: "...", userId: newUser.id });
} catch (error: any) {
  console.error("Signup error:", error);
  if (error instanceof z.ZodError) {
    return res.status(400).json({ message: error.errors[0].message });
  }
  res.status(500).json({ message: "Failed to create account" });
}
```

## Logging

**Framework:** Console-based logging (no dedicated logger library)

**Patterns:**
- `console.log()` for debug/informational messages
- `console.error()` for error tracking and debugging
- Descriptive prefixes included: `console.log("Signup error:", error)`
- Debug logs include context: `console.log('Fetching slots from URL:', url.toString())`
- Conditional logging for feature flags and debugging

**Observed in code:**
```typescript
console.log("Updating course with data:", courseData);
console.error("Course update error:", error);
console.log('Fetching month slots with params:', { instructorIdParam, typeIdParam, startDate, endDate, durationHours });
```

## Comments

**When to Comment:**
- Explaining non-obvious logic (e.g., timezone conversions, state management)
- Documenting assumptions (e.g., `// Assuming sorted by most recent`)
- Marking incomplete features (e.g., `// For this example, let's define a placeholder`)
- Explaining business rules (e.g., allowed paths for pending users)

**JSDoc/TSDoc:**
- Not used extensively; comments are inline explanations
- Interface documentation via inline comments where needed

**Example:**
```typescript
// Redirect pending users to approval page except for allowed routes
if (isAuthenticated && user?.userStatus === 'pending') {
  const allowedPaths = ['/pending-approval', '/contact', '/about', ...];
  if (!allowedPaths.includes(location) && location !== '/') {
    window.location.href = '/pending-approval';
  }
}
```

## Function Design

**Size:**
- Functions typically 20-80 lines for complex components
- Complex features like `CommunicationsDashboard` can reach 3000+ lines (needs refactoring)
- Average utility functions: 5-20 lines

**Parameters:**
- Prefer object parameters for components: `{ course, onRegister }`
- React props use interface definitions: `EditCourseFormProps`, `LayoutProps`
- Optional parameters with defaults: `function getTokenExpiry(hours: number = 24)`
- Destructuring used in function parameters

**Return Values:**
- React components return JSX
- Utilities return typed values with explicit types
- Async functions return Promises
- Error handlers return early with response or null

**Example function pattern:**
```typescript
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<any> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);

  if (res.status === 204) {
    return null;
  }

  return await res.json();
}
```

## Module Design

**Exports:**
- Named exports for functions, hooks, and utilities
- Default exports for React components (sometimes)
- Type exports using `export type` or `import type`
- Barrel files not widely used

**Examples:**
```typescript
// Named exports
export function isInstructorOrHigher(user: any): boolean {}
export const authRouter = Router();
export const db = drizzle({ client: pool, schema });

// Class exports
export class CronService { }
export class CalendarService { }

// Component exports
export function CourseCard({ course, onRegister }: CourseCardProps) {}
```

**Barrel Files:**
- Limited use; mostly single-file exports
- Some component groups in `components/ui/` directory

## TypeScript Specifics

**Strict Mode:** Enabled (`"strict": true`)

**Type Definitions:**
- Interfaces preferred for component props: `interface CourseCardProps { course: CourseWithSchedules; }`
- Types used for unions and aliases: `type SortDirection = 'asc' | 'desc' | null`
- Imported types from schema: `import type { CourseWithSchedules } from "@shared/schema"`
- Zod for runtime validation and type inference: `type CourseFormData = z.infer<typeof courseSchema>`

**Nullish Coalescing & Optional Chaining:**
- Optional chaining used: `user?.role`, `nextSchedule?.enrollments`
- Nullish checks: `const enrollmentCount = nextSchedule?.enrollments?.filter(...) || 0`

## API Request Patterns

**Client-Side:**
- Centralized `apiRequest()` function for all HTTP calls
- Zod validation for form data before submission
- React Query for data fetching and caching
- Error handling through try-catch in mutations

**Server-Side:**
- Express Router for route organization
- Zod validation schemas for request bodies
- Status codes and JSON responses
- Middleware for authentication checks

**Example mutation pattern:**
```typescript
const updateMutation = useMutation({
  mutationFn: async (courseData: CourseFormData) => {
    console.log("Updating course with data:", courseData);
    const result = await apiRequest("PUT", `/api/courses/${courseId}`, courseData);
    console.log("Course update successful:", result);
    return result;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
  },
  onError: (error) => {
    console.error("Course update error:", error);
    toast({ variant: "destructive", title: "Update failed" });
  },
});
```

---

*Convention analysis: 2026-02-20*
