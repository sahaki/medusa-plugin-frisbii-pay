# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Debug Mode setting** (`debug_enabled`, default: `false`): Controls detailed file-based logging of API requests and responses.
  - When `true`: every HTTP request sent to the Reepay API (method, URL, request body, response body, HTTP status code, duration in ms) is written to `var/log/frisbii/frisbii-api-{YYYY-MM-DD}.log`. Sensitive fields (`api_key`, `webhook_secret`, `card_number`, `cvv`, etc.) are automatically redacted before writing.
  - When `false`: API-level file logging is suppressed. All other log sources (webhook, checkout, capture, order-status) still write unconditionally so production issues remain diagnosable.
  - The setting is configurable in **Admin → Settings → Frisbii Pay → Debug Mode → Enable Debug Logging**.
  - A new **Frisbii Pay Log** menu entry appears in the Admin sidebar (under Settings). The page lists all log files with source, date, and size. Clicking a file opens a paginated line viewer with colour-coded log levels.
  - Log directory: `{project_root}/var/log/frisbii/`. Override via the `FRISBII_LOG_DIR` environment variable.
  - Log files rotate daily by date suffix: `frisbii-{source}-YYYY-MM-DD.log`.
  - New utility: `src/utils/logger.ts` — exports `frisbiiLog()`, `frisbiiApiLog()`, `resolveLogFilePath()`, `LOG_SOURCES`, `LogSource`, `LogLevel`.
  - New API routes: `GET /admin/frisbii/logs` (list files) and `GET /admin/frisbii/logs/:filename` (paginated content). Both require admin authentication and enforce path-traversal prevention via filename whitelisting and path confinement checks.
  - New Admin UI pages: `src/admin/routes/settings/frisbii-logs/page.tsx` (Log Dashboard) and `src/admin/routes/settings/frisbii-logs/[filename]/page.tsx` (Log Detail).
  - New DB column: `frisbii_config.debug_enabled boolean NOT NULL DEFAULT false` — migration `Migration20260428000000`.
- **Send Order Lines setting** (`send_order_lines`, default: `true`): Controls whether itemised order line details are forwarded to Reepay when a payment session is created and when a payment is captured.
  - When `true`: the `order_lines` array is built from Medusa's cart/order tables and sent to Reepay. The Reepay invoice shows individual product rows, shipping, and discounts.
  - When `false`: only the total `amount` is sent. The Reepay invoice shows a single total figure with no line-item breakdown.
  - The setting is configurable in **Admin → Settings → Frisbii Pay → Payment Processing → Send Order Lines**.
  - New utility file `src/utils/order-lines.ts` introduces `buildCartOrderLines()` (for `initiatePayment`) and `buildOrderOrderLines()` (for `capturePayment`), both querying Medusa DB tables via `__pg_connection__`. Both functions fall back to amount-only silently on any DB error so that checkout is never blocked.
  - New helper `calculateTotalFromOrderLines()` for amount-validation use cases.
  - New DB lookup helpers: `getCartIdFromPaymentSessionId()` and `getOrderIdFromPaymentSessionId()`.
- **Config-driven Admin UI locale**: `useAdminTranslation(overrideLocale?)` hook now accepts an optional locale override. Both the Settings page and the Invoice widget derive their display language from the saved `locale` field in Frisbii config instead of relying solely on the browser's `navigator.language`. Without an override the hook still falls back to browser language.
- Initial project setup
- Directory structure created
- Package configuration

### Fixed
- **Invoice widget — balance label casing**: Balance breakdown labels (Remaining Balance, Total Authorized, Total Settled, Total Refunded) were rendered via JS `.toUpperCase()`, so Danish translations were displayed as "RESTERENDE SALDO" instead of "Resterende saldo". Labels are now passed as-is from the translation hook and styled with CSS `uppercase` in `BalanceLine`.
- **Invoice widget — status text translation**: The inline state text below the status badge was rendering the raw `effectiveState` string in English (e.g. `"authorized"` → `"Authorized"`) regardless of locale. It now resolves via the translation key `t.status${PascalCase}` just like the badge does, falling back to formatted English only when no key is found.
- **TypeScript `TranslationKeys` type**: Changed from `typeof en` (inferred literal types) to `{ [K in keyof typeof en]: string }` (mapped type). This allows `da.ts` and future translation files to assign any string value without TypeScript compile errors while still enforcing that all keys from `en.ts` are present.

## [0.1.0-beta.1] - 2026-04-02

### Added
- Initial beta release
- Frisbii payment provider
- Data module for session tracking
- Admin API routes
- Store API routes
- Webhook handler
- Scheduled auto-cancel job
- Admin payment status widget
- Workflows for payment session creation
- Event subscribers for order events

### Features
- Payment authorization and capture
- Refund support
- Auto-cancel expired payments (configurable timeout)
- Saved payment methods
- Custom payment configuration
- Multi-currency support
- Test and live mode switching

[Unreleased]: https://github.com/sahaki/medusa-plugin-frisbii-pay/compare/v0.1.0-beta.1...HEAD
[0.1.0-beta.1]: https://github.com/sahaki/medusa-plugin-frisbii-pay/releases/tag/v0.1.0-beta.1
