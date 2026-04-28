---
description: "Use when writing, editing, or reviewing any code in the medusa-plugin-frisbii-pay project. Covers architecture conventions, module structure, API route patterns, workflow/step patterns, payment provider implementation, TypeScript standards, Reepay integration rules, admin UI i18n translation rules, and mandatory code security requirements (OWASP Top 10, HMAC verification, secrets management, input validation, XSS prevention)."
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
    order-lines.ts             # Builds Reepay order_lines arrays from Medusa DB (cart + order tables)
    currency.ts                # toMinorUnits, ZERO_DECIMAL_CURRENCIES
  admin/
    widgets/                   # React admin widgets (order detail page)
      frisbii-order-payment.tsx  # Invoice widget, zone: order.details.side.after
    assets/
      card-logos.ts            # Auto-generated base64 card logo data URIs (CARD_LOGOS map)
      *.png                    # Source PNG files for card logos (not in npm output)
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
- **Send Order Lines**: Controlled by `config.send_order_lines` (boolean, default `true`).
  - When `true`, `initiatePayment()` calls `buildCartOrderLines()` from `src/utils/order-lines.ts` and `capturePayment()` calls `buildOrderOrderLines()`. The resulting array is forwarded to Reepay in the `order_lines` field.
  - When `false` (or on any DB error), only the total `amount` in minor units is sent — checkout is never blocked by a failed order-line build.
  - `buildCartOrderLines` / `buildOrderOrderLines` query Medusa's cart/order tables via `__pg_connection__` directly (not via cross-module service calls).
  - Both helpers return `null` on failure, which the provider treats as a signal to fall back to amount-only.
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
- **Charge handle**: Reepay charge ID — assigned after customer completes payment. Stored in `frisbii_session.charge_handle`.
- **Test mode**: Uses API key prefixed with `priv_test_`. Live mode uses `priv_`.
- **Webhook events** to handle: `invoice_authorized`, `invoice_settled`, `invoice_cancelled`, `customer_payment_method_added`.
- Always verify webhook signatures using HMAC-SHA256 with `webhook_secret` from config.
- Reepay API base URL: `https://api.reepay.com/v1/`
- Reepay Checkout API base URL: `https://checkout-api.reepay.com/v1/`
- **Invoice endpoint vs Charge endpoint**: Use `/v1/invoice/{handle}` (not `/v1/charge/{handle}`) when you need `authorized_amount`, `settled_amount`, and `refunded_amount` — the charge endpoint does not return these breakdown fields.
- **Reepay admin dashboard URL**: `https://admin.billwerk.plus/#/rp/payments/invoices/invoice/{handle}`

---

## Admin UI (`src/admin/`)

### Widgets (`src/admin/widgets/`)
- Written as React functional components using hooks.
- Uses `@medusajs/ui`, `@medusajs/icons`, `@medusajs/admin-sdk` packages (all peerDependencies).
- Widget file exports a `config` object via `defineWidgetConfig()` and a default React component.
- The **Invoice widget** (`frisbii-order-payment.tsx`) is registered in zone `"order.details.side.after"` so it appears in the right sidebar **after the Customer card**.

#### Invoice Widget (`frisbii-order-payment.tsx`)
The widget fetches live payment data from `GET /admin/frisbii/payment-status/:orderId` on mount and displays an **Invoice card** matching the Reepay/WooCommerce layout:

- **Invoice handle** — Reepay charge handle (e.g. `cart-1775623306319`)
- **State** — colour-coded status label (Settled = green, Authorized = orange, Cancelled/Failed = red)
- **Payment method** — card logo image + masked PAN (`XXXX XXXX XXXX 1111`)
- **Balance breakdown** — Remaining Balance, Total Authorized, Total Settled, Total Refunded
- **See invoice** button — links to `https://admin.billwerk.plus/#/rp/payments/invoices/invoice/{handle}`

The widget returns `null` (renders nothing) when no Frisbii payment data exists for the order.

#### Card Logo Assets (`src/admin/assets/`)
- `card-logos.ts` — auto-generated file exporting `CARD_LOGOS: Record<string, string>` with base64 PNG data URIs for all supported card types.
- `CARD_TYPE_LOGO_MAP` in the widget maps Reepay `card_type` values (e.g. `"visa"`, `"mastercard"`, `"amex"`) to keys in `CARD_LOGOS`.
- **Do not hand-edit `card-logos.ts`** — regenerate it from PNGs using the helper script when logos change.

### Settings Page (`src/admin/routes/settings/frisbii/page.tsx`)
- Exports `config` via `defineRouteConfig({ label, icon })` — this registers the menu item in the Admin sidebar under Settings.
- Exports a default React component as the page.
- Fetches/saves config via `/admin/frisbii/config` API route.
- Must be placed at `src/admin/routes/settings/<slug>/page.tsx` for Medusa to discover it.

### Admin UI Internationalisation (i18n) Rules

All user-visible strings in the Admin UI (settings page and widgets) are translated via the `useAdminTranslation()` hook from `src/admin/locale/index.ts`.

#### File locations

```
src/admin/locale/
  index.ts               # useAdminTranslation(overrideLocale?) hook
  translations/
    en.ts                # Source of truth — all keys in English
    da.ts                # Danish translations — must mirror en.ts keys exactly
    index.ts             # Re-exports both translation objects
```

#### Mandatory rule — always add new strings to locale files

> **Any user-visible string added to any admin component (settings page, widgets) MUST be added to the locale translation files at the same time.** Do not hardcode English strings directly in JSX.

Steps when introducing a new translatable string:
1. Choose a descriptive camelCase key (e.g. `saveConfiguration`).
2. Add the English string to `src/admin/locale/translations/en.ts`.
3. Add the Danish translation to `src/admin/locale/translations/da.ts`.
4. Use `t.<key>` via the `useAdminTranslation(overrideLocale?)` hook in the component.

```ts
// src/admin/locale/translations/en.ts — add new key here
export const en = {
  saveConfiguration: "Save Configuration",
  // ✅ new key
  connectionFailed: "Connection failed. Check your API key.",
} as const

// TranslationKeys uses a mapped type — translation files may assign any string
export type TranslationKeys = { [K in keyof typeof en]: string }

// src/admin/locale/translations/da.ts — add Danish equivalent here
export const da: TranslationKeys = {
  saveConfiguration: "Gem konfiguration",
  // ✅ Danish translation must be added at the same time
  connectionFailed: "Forbindelse mislykkedes. Kontroller din API-nøgle.",
}
```

```tsx
// Settings page — pass config.locale to drive language from saved config
const { t } = useAdminTranslation(config?.locale)
return <Button>{t.saveConfiguration}</Button>  // ✅ translated

// Widget — fetch config locale on mount then pass to hook
const [configLocale, setConfigLocale] = useState<string | undefined>(undefined)
const { t } = useAdminTranslation(configLocale)

// return <Button>Save Configuration</Button>   // ❌ hardcoded — not allowed
```

#### What counts as a translatable string

The following must always go through i18n:
- Button labels (e.g. `"Save Configuration"`, `"Test Connection"`)
- Form field labels and placeholders shown to the admin user
- Section headings rendered in the settings page
- Status messages, toast notifications, error text shown in the UI
- Table headers and column labels in admin widgets
- Badge/chip text (e.g. `"Coming soon"`)
- Tooltip text visible to users

The following are **exempt** from i18n:
- Internal `console.error` / `console.warn` messages
- `data-testid` attribute values
- CSS class names and `className` strings
- TypeScript type/interface identifiers
- Log messages written to the Medusa server logger

#### Keeping `en.ts` and `da.ts` in sync

- Both files must always have **identical sets of keys**.
- If a key exists in `en.ts` but not in `da.ts` (or vice versa), that is a bug — fix it immediately.
- When removing a key, remove it from both files at the same time.
- Key naming follows camelCase: describe the UI element purpose (e.g. `comingSoon`, `apiKeyTest`, `statusSettled`).

#### `useAdminTranslation` hook signature

```ts
useAdminTranslation(overrideLocale?: string): { t: TranslationKeys; locale: "en" | "da" }
```

- When `overrideLocale` is provided (e.g. `"da_DK"` or `"en_GB"` from the saved config), it takes precedence over the browser's `navigator.language`.
- Both underscore (`da_DK`) and hyphen (`da-DK`) formats are accepted.
- The Settings page and every admin widget **must** pass `config?.locale` (or a fetched locale) as `overrideLocale`. Do not call the hook without an override unless there is no config context.
- Do **not** apply `.toUpperCase()` to translated strings in JSX. Use CSS `uppercase` (via `className` or `style`) so the underlying string remains translatable.
- Status labels in the Invoice widget are resolved via `t[\`status${PascalCase}\`]` — follow that pattern for any new status badge or chip.

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

## Test Server Environment

The plugin is tested against two local servers, both started with `npm run dev`.

| Role | URL | Directory |
|------|-----|-----------|
| **Backend** (Medusa) | `http://localhost:9000/app/` | `D:\my_cource\medusa\002\medusa-store` |
| **Frontend** (Storefront) | `http://localhost:8000/` | `D:\my_cource\medusa\002\medusa-store-storefront` |

**Admin login**: `http://localhost:9000/app` — user `boyd@radarsofthouse.dk` / `Test#1234`

> **IMPORTANT**: Never attempt to start, stop, or restart either server autonomously.
> Always ask the user to perform any server Start/Restart action.

---

## Admin UI Build & Deployment Notes

- The admin UI (settings page, widgets) is **not** served from the plugin directly. It is compiled into the **host application's** admin bundle.
- After modifying any file under `src/admin/` in the plugin:
  1. Run `npm run build` in the plugin directory.
  2. Run `npx medusa build` in the host app (e.g. `medusa-store`) to recompile the admin bundle.
  3. Restart the host app dev server (`npm run dev`).
- The `npx medusa develop` command does NOT rebuild the admin bundle on the fly. Changes to admin UI always require a full `npx medusa build`.
- **Migration command**: Use `npx medusa db:migrate` (not `npx medusa migrations run` which is a Medusa v1 command).
