# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
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
