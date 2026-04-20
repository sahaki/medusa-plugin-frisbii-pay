---
description: "Use when writing, editing, or reviewing any code in the medusa-plugin-frisbii-pay project. Covers architecture conventions, module structure, API route patterns, workflow/step patterns, payment provider implementation, TypeScript standards, Reepay integration rules, and mandatory code security requirements (OWASP Top 10, HMAC verification, secrets management, input validation, XSS prevention)."
applyTo: "src/**"
---

# Frisbii Pay Plugin — Project Instructions

## Project Overview

`@montaekung/medusa-plugin-frisbii-pay` is a **Medusa v2 payment provider plugin** that integrates [Reepay](https://reepay.com) as a payment gateway. It is distributed as an npm plugin and registered in two places in `medusa-config.js`: once as a plugin (routes, data module, jobs) and once as a payment provider inside the `@medusajs/medusa/payment` module.

---

## Architecture Principles

- Follow **Medusa v2 modular architecture**: payment provider, data module, API routes, workflows, subscribers, and jobs are separate concerns, each in their own folder.
- **Modules are isolated**: they cannot resolve each other's services. Access cross-module data via `query.graph()` in subscribers/routes, or via direct `__pg_connection__` in the payment provider for config lookup.
- Configuration is stored in the **`frisbii_config` database table** (singleton with `id: "default"`). Environment variables (`FRISBII_API_KEY_TEST`, `FRISBII_API_KEY_LIVE`, `FRISBII_API_MODE`) serve as fallback only.
- The data module identifier constant `FRISBII_DATA_MODULE = "frisbiiData"` is used in all routes that resolve the module.

---

## Directory Structure Conventions

```
src/
  index.ts                     # Re-exports types and workflows + metadata
  providers/frisbii/           # Payment provider (AbstractPaymentProvider)
    service.ts                 # Main provider class
    index.ts                   # Provider registration export
    clients/
      frisbii-api-client.ts    # Base HTTP client (Basic Auth, HMAC)
      frisbii-checkout-client.ts
      index.ts
  modules/frisbii-data/        # Data module (MedusaService)
    service.ts
    index.ts
    models/                    # MikroORM entities (kebab-case filenames)
    migrations/                # Timestamped migration files
    loaders/
    types/
  api/
    admin/frisbii/             # Admin-only routes (authenticated)
    store/frisbii/             # Store routes (public or customer auth)
    webhooks/frisbii/          # Reepay webhook receiver
  workflows/
    workflows/                 # createWorkflow() definitions
    steps/                     # createStep() definitions
    index.ts                   # Re-exports all workflows
  subscribers/                 # Event-driven logic (frisbii-*.ts)
  jobs/                        # Scheduled jobs (frisbii-*.ts)
  types/                       # Shared TypeScript types
  utils/                       # Pure utility functions
  admin/
    widgets/                   # React admin widgets (order detail page)
    routes/
      settings/
        frisbii/
          page.tsx             # Admin settings page (/settings/frisbii)
```

---

## Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Source files | `kebab-case.ts` | `frisbii-api-client.ts` |
| React components | `kebab-case.tsx` | `frisbii-order-payment.tsx` |
| Workflow IDs | `kebab-case` string | `"create-frisbii-session"` |
| Step IDs | `kebab-case` string | `"store-frisbii-session-step"` |
| DB table/model files | `kebab-case.ts` | `frisbii-config.ts` |
| Subscriber files | `frisbii-<event>.ts` | `frisbii-order-placed.ts` |
| Job files | `frisbii-<purpose>.ts` | `frisbii-auto-cancel.ts` |
| Module constant | `FRISBII_DATA_MODULE = "frisbiiData"` | used in route handlers |

---

## TypeScript Standards

- Use **strict TypeScript** — no implicit `any` where avoidable; prefer explicit interface/type definitions.
- Define `Options`, `InjectedDependencies`, and input/output types for every service and workflow step.
- Import Medusa types from `@medusajs/types` and utilities from `@medusajs/framework/utils`.
- Workflow inputs and step inputs must be typed with explicit `type` aliases (not inline).
- Use `BigNumber` from `@medusajs/framework/utils` when handling monetary values that go through Medusa's payment layer.

---

## Payment Provider Rules (`src/providers/frisbii/service.ts`)

- Extend `AbstractPaymentProvider` from `@medusajs/framework/utils`.
- Inject `logger` and `__pg_connection__` via `InjectedDependencies`.
- **Currency conversion**: Medusa v2 stores amounts in **major units** (e.g., `13.09` = €13.09). Reepay expects **minor units** (cents). Always use `toMinorUnits(amount, currencyCode)`.
- Zero-decimal currencies (JPY, KRW, etc.) must NOT be multiplied by 100. Maintain the `ZERO_DECIMAL_CURRENCIES` set.
- Config is loaded from the DB with a **30-second cache** (`CONFIG_CACHE_TTL_MS = 30_000`). Do not reload per-request unless the cache is expired.
- All provider methods must catch errors and return a meaningful `error` field in the output rather than throwing, following Medusa's provider contract.
- HMAC webhook verification must always be performed before processing webhook payloads.

---

## API Route Conventions (`src/api/`)

- Route files export named handler functions: `GET`, `POST`, `PUT`, `DELETE`.
- Use `AuthenticatedMedusaRequest` for admin routes; use `MedusaRequest` for store/webhook routes.
- Resolve modules via `req.scope.resolve(FRISBII_DATA_MODULE)`.
- Admin routes that accept a body must have a corresponding `validators.ts` using Medusa's `z`-based validation and a `middlewares.ts` that applies it.
- Respond with `res.json({ ... })` — use consistent response keys (e.g., `{ config }`, `{ session }`, `{ status }`).

### Route Structure Example
```
api/admin/frisbii/<resource>/
  route.ts        # GET/POST handlers
  validators.ts   # Zod schema + type export
  middlewares.ts  # Apply validateBody middleware
```

---

## Workflow & Step Patterns (`src/workflows/`)

- Define steps with `createStep()` from `@medusajs/framework/workflows-sdk`.
- Every step that writes data **must have a compensation function** to support rollback.
- Define workflows with `createWorkflow()` and return results via `new WorkflowResponse(...)`.
- Keep workflows thin — logic belongs in steps or service methods, not in the workflow function body.
- Export all workflows and steps from `src/workflows/index.ts`.

```typescript
// Step pattern
export const myStep = createStep(
  "my-step-id",
  async (input: MyInput, { container }) => {
    // ... do work
    return new StepResponse(result, compensationData)
  },
  async (compensationData, { container }) => {
    // ... undo work
  }
)
```

---

## Data Module Rules (`src/modules/frisbii-data/`)

- Extend `MedusaService` from `@medusajs/framework/utils`.
- Models are MikroORM entities. Use snake_case for all DB column names.
- The config singleton always uses `id: "default"`.
- Use `listFrisbiiConfigs`, `createFrisbiiConfigs`, `updateFrisbiiConfigs` naming (pluralized service methods from `MedusaService`).
- Migration filenames follow the pattern: `Migration<YYYYMMDDHHMMSS>.ts`.
- Create a new migration file for every schema change; never modify existing migration files.

---

## Subscribers (`src/subscribers/`)

- Subscribe to Medusa lifecycle events (e.g., `order.placed`, `payment.authorized`, `payment.captured`).
- Use `query.graph()` to traverse cross-module relationships (order → payment_collections → payments).
- Resolve `frisbiiData` module service via `container` for DB updates.
- Keep subscriber logic simple — delegate complex logic to service methods.

---

## Scheduled Jobs (`src/jobs/`)

- Export a `config` object with `name` (unique slug) and `schedule` (cron expression).
- Export a default async handler function receiving `{ container }`.
- Log meaningful metrics (records processed, errors) using the injected `logger`.

```typescript
export const config = { name: "frisbii-job-name", schedule: "*/5 * * * *" }
export default async function handler({ container }) { ... }
```

---

## Reepay Integration Concepts

- **Session handle**: Reepay checkout session ID — created when payment is initiated.
- **Charge handle**: Reepay charge ID — assigned after customer completes payment.
- **Test mode**: Uses API key prefixed with `priv_test_`. Live mode uses `priv_`.
- **Webhook events** to handle: `invoice_authorized`, `invoice_settled`, `invoice_cancelled`, `customer_payment_method_added`.
- Always verify webhook signatures using HMAC-SHA256 with `webhook_secret` from config.
- Reepay API base URL: `https://api.reepay.com/v1/`
- Reepay Checkout API base URL: `https://checkout-api.reepay.com/v1/`

---

## Admin UI (`src/admin/`)

### Widgets (`src/admin/widgets/`)
- Written as React functional components using hooks.
- Uses `@medusajs/ui`, `@medusajs/icons`, `@medusajs/admin-sdk` packages (all peerDependencies).
- Widget file exports a `config` object via `defineWidgetConfig()` and a default React component.
- Should display payment status on the order detail page.

### Settings Page (`src/admin/routes/settings/frisbii/page.tsx`)
- Exports `config` via `defineRouteConfig({ label, icon })` — this registers the menu item in the Admin sidebar under Settings.
- Exports a default React component as the page.
- Fetches/saves config via `/admin/frisbii/config` API route.
- Must be placed at `src/admin/routes/settings/<slug>/page.tsx` for Medusa to discover it.

---

## Code Security

This plugin handles **payment data and API secrets**. Security is non-negotiable. Every contributor must treat the following rules with the same weight as functional correctness.

### Secrets & Credentials Management

- **Never hardcode** API keys, webhook secrets, or tokens in source code — not even test credentials.
- Store all secrets in the `frisbii_config` DB table or environment variables. Environment variables are fallback only.
- Never log API keys, card data, or secrets — not even a partial key. Use `logger.debug("Config loaded")` not `logger.debug(config.apiKey)`.
- When reading config from the DB, redact sensitive fields before including them in any log or API response:
  ```typescript
  const { api_key_live, api_key_test, webhook_secret, ...safeConfig } = config
  res.json({ config: safeConfig })
  ```

### Input Validation & Sanitization (OWASP A03 — Injection)

- **All** external input (request bodies, query params, webhook payloads) must be validated with Zod schemas before use. Never trust raw `req.body` or `req.query` without schema validation.
- Admin routes that mutate state require a `validators.ts` with a strict Zod schema and a `middlewares.ts` that applies it. No exceptions.
- Numeric fields (amounts, limits) must have explicit `.min()` / `.max()` constraints in the Zod schema.
- String fields must have `.max(length)` constraints to prevent excessively large payloads.
- Do not use raw string interpolation to build SQL queries. All DB access goes through MikroORM entities or parameterized queries via `__pg_connection__`. Never concatenate user input into SQL.

### Webhook Security (HMAC Verification)

- Every inbound webhook from Reepay **must** be verified with HMAC-SHA256 before any processing.
- Use a **timing-safe comparison** (`crypto.timingSafeEqual`) when comparing the computed HMAC with the header value to prevent timing attacks:
  ```typescript
  import { timingSafeEqual, createHmac } from "crypto"

  const expected = createHmac("sha256", webhookSecret).update(rawBody).digest()
  const received = Buffer.from(signatureHeader, "hex")
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return res.status(401).json({ error: "Invalid webhook signature" })
  }
  ```
- Reject webhooks with a `401` immediately if the signature is missing or invalid — do not process the payload at all.
- Access the raw `Buffer` body (before JSON parsing) for HMAC computation. Do not compute HMAC over a re-serialized JSON string.

### Authentication & Authorization (OWASP A01 — Broken Access Control)

- Admin routes must use `AuthenticatedMedusaRequest` to enforce Medusa's built-in admin authentication. Never expose admin endpoints without auth middleware.
- Store/public routes must not expose internal config, API keys, or sensitive payment data — only session tokens and public-facing status.
- Webhook routes are authenticated via HMAC signature only — do not add API-key-based auth on top; the HMAC check is sufficient.
- When resolving module services from `req.scope`, do not expose the resolved service object directly in responses.

### Error Handling & Information Disclosure (OWASP A09 — Logging Failures)

- **Never** expose raw exception messages, stack traces, or internal DB errors to API callers. Catch errors and return a sanitized message:
  ```typescript
  try {
    // ...
  } catch (err) {
    logger.error("Operation failed", { error: err })
    return res.status(500).json({ error: "An unexpected error occurred" })
  }
  ```
- Payment provider methods must return `{ error: string }` on failure following Medusa's provider contract — not throw — so that stack traces stay server-side.
- Do not include Reepay API error bodies verbatim in responses to the storefront. Log them server-side and return a generic error message.

### Dependency Security (OWASP A06 — Vulnerable Components)

- Run `npm audit` before every release and fix all `critical` and `high` severity vulnerabilities.
- Pin major versions of third-party dependencies in `package.json`. Avoid using `*` or unbounded ranges.
- Do not add new runtime dependencies without reviewing the package's maintenance status and security history.
- Admin UI packages (`@medusajs/ui`, `@medusajs/icons`, `@medusajs/admin-sdk`, `react`) must remain `peerDependencies` — never promote them to `dependencies`.

### Admin UI Security (XSS Prevention — OWASP A03)

- Never use `dangerouslySetInnerHTML` in any React component under `src/admin/`.
- Do not render user-supplied strings (e.g., order metadata, customer notes) as HTML.
- API responses rendered in the Admin UI must be treated as plain text — escape or use React's default safe rendering.
- Do not store sensitive values (API keys, secrets) in React component state, `localStorage`, or `sessionStorage`. They belong in the backend DB only.

### Outbound HTTP Security (SSRF Prevention — OWASP A10)

- All outbound HTTP calls must go through `FrisbiiApiClient` or `FrisbiiCheckoutClient`. Never make ad-hoc `fetch`/`axios` calls to external URLs.
- The base URLs for Reepay are hardcoded constants inside the clients. Do not accept base URLs from config or user input.
- Validate any URL constructed from user input before making an outbound request.

### Logging Security

- Log security-relevant events at `logger.warn` or `logger.error`: failed webhook verifications, auth failures, exceeded retry limits.
- Do not log full request bodies for payment-related routes — they may contain card tokens or PII.
- Do not log Reepay session handles or charge handles at `logger.info` in production-level paths; use `logger.debug` which can be disabled.

### Cryptographic Practices

- Use `crypto` from Node.js core — do not use third-party crypto libraries unless required.
- Always use HMAC-SHA256 for webhook signature verification (do not downgrade to MD5/SHA1).
- Do not implement custom encryption for stored data — rely on DB-level encryption and environment-level secrets management.

---

## What NOT to Do

- Do **not** directly call the Reepay API from routes, subscribers, or jobs — route all Reepay calls through `FrisbiiApiClient` or `FrisbiiCheckoutClient`.
- Do **not** store API keys in source code — use the `frisbii_config` table or environment variables.
- Do **not** bypass HMAC webhook verification.
- Do **not** use `require()` — use ES module `import/export` throughout.
- Do **not** mutate existing migration files — always create a new one.
- Do **not** add new peerDependencies without updating both `peerDependencies` and `devDependencies` in `package.json`.
- Do **not** put admin UI packages (`@medusajs/admin-sdk`, `@medusajs/ui`, `@medusajs/icons`, `react`) in `dependencies` — they must be `peerDependencies` only.

---

## `package.json` exports — Required Entries

The `exports` field **must** include entries for every path that Medusa resolves at runtime. Missing entries cause `Package subpath '...' is not defined by "exports"` errors on startup.

Required exports:
```json
"exports": {
  "./package.json": "./package.json",
  "./admin": {
    "import": "./.medusa/server/src/admin/index.mjs",
    "require": "./.medusa/server/src/admin/index.js",
    "default": "./.medusa/server/src/admin/index.js"
  },
  "./providers/*": "./.medusa/server/src/providers/*/index.js",
  "./modules/*": "./.medusa/server/src/modules/*/index.js",
  "./.medusa/server/src/modules/*": "./.medusa/server/src/modules/*/index.js",
  "./workflows": "./.medusa/server/src/workflows/index.js",
  ".": "./.medusa/server/index.js"
}
```

**Critical rules**:
- `"./admin"` **must** use the conditional `import`/`require`/`default` object format — a plain string causes a `"default" is not exported` Rollup error during the host app's frontend build.
- The `"./admin"` entry is required for Medusa to discover and bundle the admin settings page and widgets into the host app's Admin UI. Without it, the plugin's settings page will not appear in the sidebar.
- When adding a new module under `src/modules/`, no extra entry needed — the wildcard patterns cover it.

## Admin UI Build & Deployment Notes

- The admin UI (settings page, widgets) is **not** served from the plugin directly. It is compiled into the **host application's** admin bundle.
- After modifying any file under `src/admin/` in the plugin:
  1. Run `npm run build` in the plugin directory.
  2. Run `npx medusa build` in the host app (e.g. `medusa-store`) to recompile the admin bundle.
  3. Restart the host app dev server (`npm run dev`).
- The `npx medusa develop` command does NOT rebuild the admin bundle on the fly. Changes to admin UI always require a full `npx medusa build`.
- **Migration command**: Use `npx medusa db:migrate` (not `npx medusa migrations run` which is a Medusa v1 command).
