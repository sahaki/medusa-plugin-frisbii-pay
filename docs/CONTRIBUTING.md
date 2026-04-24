# Contributing Guide

## Overview

We welcome contributions to the Frisbii Payment Plugin! This guide explains how to set up your development environment, make changes, and submit pull requests.

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Help others learn and grow
- Focus on the issue, not the person

## Getting Started

### 1. Fork and Clone

```bash
# Fork the repository on GitHub
# (Click "Fork" button on repository page)

# Clone your fork
git clone https://github.com/YOUR_USERNAME/medusa-plugin-frisbii-pay.git
cd medusa-plugin-frisbii-pay

# Add upstream remote
git remote add upstream https://github.com/sahaki/medusa-plugin-frisbii-pay.git
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create Feature Branch

```bash
# Update main branch
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name

# Or bug fix branch
git checkout -b fix/bug-description
```

## Development Workflow

### 1. Make Changes

```bash
# Edit files
# - Follow code style (see Code Style section)
# - Add tests for new features
# - Update documentation
```

### 2. Run Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test -- --watch

# Run specific test file
npm run test -- src/feature.spec.ts

# Generate coverage report
npm run test:coverage
```

### 3. Type Check

```bash
# Verify no TypeScript errors
npx tsc --noEmit

# Or check during development
npm run build
```

### 4. Format Code

```bash
# Format code with Prettier
npm run format

# Format and check
npm run lint
```

### 5. Build

```bash
# Build the plugin
npm run build

# Verify build output
npx tsc --noEmit
```

## Adding or Updating Translations

Any user-visible string added to the Admin UI must go through the i18n system. Hardcoded English strings in JSX are not allowed.

### Adding a new string

1. Add the key and English text to `src/admin/locale/translations/en.ts`:
   ```ts
   export const en = {
     // ... existing keys ...
     myNewLabel: "My New Label",  // ✅ add here
   } as const
   ```

2. Add the Danish translation to `src/admin/locale/translations/da.ts` **at the same time**:
   ```ts
   export const da: TranslationKeys = {
     // ... existing keys ...
     myNewLabel: "Mit nye label",  // ✅ must be added simultaneously
   }
   ```

3. Use `t.myNewLabel` in your component via the `useAdminTranslation` hook:
   ```tsx
   const { t } = useAdminTranslation(config?.locale)
   return <Label>{t.myNewLabel}</Label>
   ```

4. TypeScript will report a compile error if `da.ts` is missing any key from `en.ts` — this is intentional.

### Adding a new language

1. Create `src/admin/locale/translations/<lang>.ts` that implements `TranslationKeys`:
   ```ts
   import type { TranslationKeys } from "./en"
   export const sv: TranslationKeys = {
     apiConnection: "API och anslutning",
     // ... all other keys ...
   }
   ```

2. Register the new locale in `src/admin/locale/index.ts`:
   ```ts
   import { sv } from "./translations/sv"
   const TRANSLATIONS = { en, da, sv }

   function resolveLocaleKey(locale: string): "en" | "da" | "sv" {
     if (locale.startsWith("sv")) return "sv"
     if (locale.startsWith("da")) return "da"
     return "en"
   }
   ```

3. Add the locale option to the `LOCALES` array in `src/admin/routes/settings/frisbii/page.tsx`:
   ```ts
   { value: "sv_SE", enabled: true }  // change enabled: false → true
   ```

4. Update the `localeComingSoon` badge logic in the settings page to no longer show "Coming soon" for the new locale.

5. Update `docs/CONFIGURATION.md` locale table to mark the new language as supported.

---

## Code Style

### TypeScript Guidelines

1. **Strict Type Safety**
   ```typescript
   // ✅ Good
   function processPayment(amount: number): Promise<PaymentResult> {
     return apiClient.post<PaymentResult>("/payment", { amount });
   }

   // ❌ Avoid
   function processPayment(amount: any): any {
     return apiClient.post("/payment", { amount });
   }
   ```

2. **Use Interfaces for Contracts**
   ```typescript
   // ✅ Good
   interface PaymentConfig {
     apiKey: string;
     apiSecret: string;
     enabled: boolean;
   }

   // ❌ Avoid
   type PaymentConfig = {
     apiKey?: string;
     apiSecret?: string;
     enabled?: any;
   };
   ```

3. **Error Handling**
   ```typescript
   // ✅ Good
   try {
     const result = await apiClient.post("/payment", data);
     return result;
   } catch (error) {
     if (error instanceof ApiError) {
       throw new PaymentError(`API failed: ${error.message}`);
     }
     throw error;
   }

   // ❌ Avoid
   const result = await apiClient.post("/payment", data);
   return result;
   ```

4. **Comments and Documentation**
   ```typescript
   /**
    * Process payment authorization with Reepay API
    * @param input - Payment input data
    * @returns Authorization result with transaction ID
    * @throws {ApiError} If API call fails
    */
   async authorizePayment(input: PaymentInput): Promise<AuthResult> {
     // Implementation
   }
   ```

### File Organization

```
src/
├── providers/     # Payment provider implementation
├── modules/       # Custom data modules
├── api/          # Routes and endpoints
├── workflows/    # Workflow definitions
├── subscribers/  # Event handlers
├── jobs/         # Scheduled tasks
├── utils/        # Utility functions
└── types/        # Type definitions
```

### Naming Conventions

- **Functions**: camelCase - `createPaymentSession()`
- **Classes**: PascalCase - `FrisbiiPaymentService`
- **Constants**: UPPER_SNAKE_CASE - `DEFAULT_TIMEOUT`
- **Files**: kebab-case - `frisbii-api-client.ts`
- **Interfaces**: PascalCase with I prefix - `IPaymentProvider`
- **Types**: PascalCase - `PaymentInput`, `PaymentResult`

### Imports/Exports

```typescript
// ✅ Good - Grouped and organized
import { Logger } from "@medusajs/types";
import { FrisbiiPaymentService } from "./service";
import { validateInput } from "../utils/validation";

export interface IPaymentConfig {
  // ...
}

export class MyClass {
  // ...
}

// ❌ Avoid - Random order, mixed with implementation
import validateInput from "../utils";
import { FrisbiiPaymentService as Service } from "./";
const PaymentConfig = require("../types");
```

## Creating New Features

### Adding a New API Endpoint

1. **Create route file** - `src/api/admin/frisbii/new-feature/route.ts`

```typescript
import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { IFrisbiiService } from "../../types";

export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const frisbiiService: IFrisbiiService = req.scope.resolve("frisbiiService");

  try {
    const result = await frisbiiService.getNewFeature();
    res.json({ data: result });
  } catch (error) {
    res.status(500).json({
      statusCode: 500,
      message: "Failed to get feature",
      error: error.message,
    });
  }
};
```

2. **Add tests** - `src/api/admin/frisbii/__tests__/new-feature.spec.ts`

```typescript
import request from "supertest";
import { createApp } from "@medusajs/medusa";

describe("GET /admin/frisbii/new-feature", () => {
  let app;

  beforeAll(async () => {
    app = await createApp();
  });

  it("should return feature data", async () => {
    const response = await request(app)
      .get("/admin/frisbii/new-feature")
      .set("Authorization", "Bearer test_token");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("data");
  });
});
```

3. **Update documentation** - `docs/API_REFERENCE.md`

```markdown
#### GET /admin/frisbii/new-feature

Retrieve new feature data.

**Response**: { data: ... }
```

### Adding a New Workflow Step

1. **Create step file** - `src/workflows/steps/my-step.ts`

```typescript
import { createStep, StepResponse } from "@medusajs/workflows-sdk";

export const myStepId = "my-step";

export const myStep = createStep(myStepId, async (input, { container }) => {
  // Implementation
  return new StepResponse({
    result: "success",
  });
});
```

2. **Add to workflow** - `src/workflows/main-workflow.ts`

```typescript
import { myStep } from "./steps/my-step";

const mainWorkflow = createWorkflow("main", (input) => {
  return myStep(input);
});
```

3. **Add compensation** (if step modifies state)

```typescript
export const compensateMyStep = async (
  input: StepResponse,
  { container }
) => {
  // Reverse the step's changes
  // Called if workflow fails after this step
};

mainWorkflow.addCompensation(myStepId, compensateMyStep);
```

## Testing Requirements

All new features must include tests.

### Unit Tests

```typescript
import { MyService } from "../my-service";

describe("MyService", () => {
  let service: MyService;

  beforeEach(() => {
    service = new MyService();
  });

  describe("myMethod", () => {
    it("should do something", async () => {
      const result = await service.myMethod({ input: "test" });
      expect(result).toBe("expected");
    });

    it("should handle errors", async () => {
      await expect(service.myMethod({ invalid: true })).rejects.toThrow();
    });
  });
});
```

### Integration Tests

```typescript
describe("API Integration", () => {
  it("should create resource via API", async () => {
    const response = await request(app)
      .post("/admin/frisbii/resource")
      .set("Authorization", "Bearer token")
      .send({ name: "test" });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("id");
  });
});
```

## Documentation Requirements

Update documentation when you:

1. Add a new API endpoint → Update `docs/API_REFERENCE.md`
2. Change configuration → Update `docs/CONFIGURATION.md`
3. Modify architecture → Update `docs/ARCHITECTURE.md`
4. Create new feature → Add tests + document usage
5. Fix a bug → Add regression test

## Commit Messages

Follow conventional commits format:

```
type(scope): description

body (optional)
footer (optional)
```

### Types

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `test:` - Tests
- `refactor:` - Code refactoring
- `perf:` - Performance improvement
- `chore:` - Maintenance

### Examples

```bash
# Good
git commit -m "feat(payment): add webhook signature verification"
git commit -m "fix(api): validate payment amount before submission"
git commit -m "docs: update installation guide"

# Avoid
git commit -m "fixed stuff"
git commit -m "WIP: payment changes"
git commit -m "update files"
```

## Pull Request Process

### 1. Push Changes

```bash
# Keep commits small and logical
git add .
git commit -m "feat(feature): description"

# Push to your fork
git push origin feature/your-feature-name
```

### 2. Create Pull Request

1. Go to GitHub repository
2. Click "New Pull Request"
3. Select `main` as base branch
4. Fill in PR template:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation

## Testing
How was this tested?
- [ ] Unit tests
- [ ] Integration tests
- [ ] Manual testing

## Checklist
- [ ] Follows code style
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes
```

### 3. Address Review Comments

```bash
# Make requested changes
git add .
git commit -m "refactor: address review comments"
git push origin feature/your-feature-name
```

## Review Checklist

When reviewing PRs, check:

- [ ] Code follows style guidelines
- [ ] Tests added or updated
- [ ] Documentation accurate
- [ ] No console.log or debug code
- [ ] No security issues
- [ ] TypeScript types correct
- [ ] No breaking changes
- [ ] Commit messages follow format

## Merging

Once approved:

1. Ensure all tests pass
2. Rebase and merge (keep history clean)
3. Delete feature branch
4. Close associated issues

## Issues and Feature Requests

### Reporting Bugs

```markdown
**Describe the bug**
Clear description of what's wrong

**To Reproduce**
Steps to reproduce behavior:
1. ...
2. ...
3. ...

**Expected behavior**
What should happen

**Environment**
- Node version: X.X.X
- Plugin version: X.X.X
- Medusa version: X.X.X

**Logs**
Error messages or logs
```

### Feature Requests

```markdown
**Description**
Why do we need this feature?

**Use Case**
How would you use it?

**Proposed Solution**
How should it work?

**Alternatives Considered**
Other approaches?
```

## Development Setup for Debugging

### Debug in VS Code

1. Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Jest Debug",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

2. Set breakpoints in code
3. Press F5 to start debugging

### Debug Plugin in Backend

```bash
# In terminal 1: Run plugin in watch mode
npm run dev

# In terminal 2: Run backend
cd ../medusa-backend
npm run dev -- --inspect
```

Then use Chrome DevTools at `chrome://inspect` to debug.

## Release Process

(Maintainers only)

```bash
# 1. Update version in package.json
npm version minor

# 2. Update CHANGELOG.md
# Add new features, fixes, breaking changes

# 3. Create git tag
git tag v1.2.0

# 4. Push changes
git push origin main --tags

# 5. Publish to npm
npm publish --access public
```

## Questions?

- Check existing issues/PRs
- Ask in discussions
- Email maintainers
- Read documentation

## License

By contributing, you agree your code is licensed under the MIT License.

Thank you for contributing! 🎉
