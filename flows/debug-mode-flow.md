# Debug Mode — Flow, Functions & Related Files

**Plugin:** `@montaekung/medusa-plugin-frisbii-pay`  
**Last updated:** 2026-04-28

---

## 1. Overview

Debug Mode controls whether detailed API request/response logs are written to disk.  
It is stored as `debug_enabled` (boolean) in the `frisbii_config` database table.

| `debug_enabled` | Effect |
|---|---|
| `false` (default) | Only critical events are logged (webhook, checkout, capture, order-status) |
| `true` | All of the above **plus** every HTTP request/response sent to the Reepay API |

> **Design note:** Mirroring the WordPress plugin behaviour — only the raw API HTTP layer (`frisbii-api`) is gated by the debug flag. All other log sources (webhook, checkout, capture, order-status) write unconditionally so that production issues can always be investigated.

---

## 2. Data Flow Diagram

```
Admin toggles "Enable Debug Logging"
            │
            ▼
POST /admin/frisbii/config  { debug_enabled: true/false }
            │
            ▼
frisbii_config (DB) — field: debug_enabled
            │
            ▼  (read on next API call, cache TTL = 30 s)
FrisbiiPaymentProviderService.refreshApiKey()
            │
            ├─▶ apiClient_.setDebugEnabled(debug_enabled)
            └─▶ checkoutClient_.setDebugEnabled(debug_enabled)
                        │
              debug_enabled = true?
                        │
           ┌────────────┴────────────┐
          YES                        NO
           │                          │
           ▼                          ▼
  frisbiiApiLog() called         (skip file log)
  for every HTTP request
  → writes to frisbii-api-{date}.log


Every other event (webhook / checkout / capture / order-status)
  └─▶ frisbiiLog() called unconditionally
      → writes to frisbii-{source}-{date}.log
```

---

## 3. Log Sources

| Source ID | Log file (daily rotation) | Written by | Gated by `debug_enabled`? |
|---|---|---|---|
| `frisbii-api` | `frisbii-api-YYYY-MM-DD.log` | `FrisbiiApiClient` (every HTTP call) | **YES** |
| `frisbii-checkout` | `frisbii-checkout-YYYY-MM-DD.log` | `FrisbiiPaymentProviderService` — `initiatePayment()` | No |
| `frisbii-capture` | `frisbii-capture-YYYY-MM-DD.log` | `FrisbiiPaymentProviderService` — `capturePayment()`, `refundPayment()`, `cancelPayment()` | No |
| `frisbii-webhook` | `frisbii-webhook-YYYY-MM-DD.log` | `POST /webhooks/frisbii` route | No |
| `frisbii-order-status` | `frisbii-order-status-YYYY-MM-DD.log` | `frisbii-payment-authorized` subscriber, `frisbii-payment-captured` subscriber | No |
| `frisbii-card-save` | `frisbii-card-save-YYYY-MM-DD.log` | Reserved for saved-card routes (future) | No |

**Log directory:** `{project_root}/var/log/frisbii/`  
Override via environment variable: `FRISBII_LOG_DIR`

**Filename pattern:** `frisbii-{source}-YYYY-MM-DD.log`  
Each day automatically creates a new file (natural daily rotation).

---

## 4. Log Entry Format

```
[2026-04-28T04:15:30.000Z] [INFO] [frisbii-api] POST https://api.reepay.com/v1/charge/cart-123/settle
{
  "method": "POST",
  "url": "https://api.reepay.com/v1/charge/cart-123/settle",
  "request": { ... },
  "response": { ... },
  "http_code": 200,
  "duration_ms": 342
}
---
```

| Field | Description |
|---|---|
| Timestamp | ISO 8601 UTC |
| Level | `INFO` / `WARN` / `ERROR` / `DEBUG` |
| Source | Log source ID (matches file category) |
| Message | One-line summary |
| JSON block | Structured data (optional, redacted of secrets) |
| `---` | Entry separator |

---

## 5. Security — Redacted Fields

The logger **always** replaces the following field values with `[REDACTED]` before writing to disk, regardless of nesting depth:

```
api_key  /  api_key_test  /  api_key_live  /  private_key
webhook_secret  /  card_number  /  cvv  /  cvc  /  authorization
```

---

## 6. Related Files

### 6.1 Core Logger

| File | Role |
|---|---|
| `src/utils/logger.ts` | All log utility functions |

**Exported symbols:**

| Symbol | Type | Description |
|---|---|---|
| `LOG_SOURCES` | `const string[]` | Whitelist of valid log source IDs |
| `LogSource` | type | Union of all valid source ID strings |
| `LogLevel` | type | `"INFO" \| "WARN" \| "ERROR" \| "DEBUG"` |
| `resolveLogFilePath(source)` | function | Returns absolute log file path, validates path confinement |
| `frisbiiLog(source, level, message, data?)` | function | Writes one log entry; silently fails on error |
| `frisbiiApiLog(params)` | function | Shorthand for API request/response logging |

### 6.2 DB Model

| File | Change |
|---|---|
| `src/modules/frisbii-data/models/frisbii-config.ts` | `debug_enabled: model.boolean().default(false)` |
| `src/modules/frisbii-data/migrations/Migration20260428000000.ts` | `ALTER TABLE frisbii_config ADD COLUMN debug_enabled boolean NOT NULL DEFAULT false` |

### 6.3 Config API

| File | Role |
|---|---|
| `src/api/admin/frisbii/config/validators.ts` | Adds `debug_enabled: z.boolean().optional()` to Zod schema |
| `src/api/admin/frisbii/config/route.ts` | `GET` reads + `POST` writes the full config including `debug_enabled` |
| `src/api/admin/frisbii/config/middlewares.ts` | Applies Zod validator for `POST /admin/frisbii/config` |

### 6.4 Payment Provider

| File | Function | Log source | Gated? |
|---|---|---|---|
| `src/providers/frisbii/clients/frisbii-api-client.ts` | `request()` (private) | `frisbii-api` | **YES** — calls `frisbiiApiLog()` only when `debugEnabled = true` |
| `src/providers/frisbii/clients/frisbii-api-client.ts` | `setDebugEnabled(v)` | — | Sets the internal flag |
| `src/providers/frisbii/service.ts` | `refreshApiKey()` | — | Propagates `debug_enabled` to both clients |
| `src/providers/frisbii/service.ts` | `initiatePayment()` | `frisbii-checkout` | No |
| `src/providers/frisbii/service.ts` | `capturePayment()` | `frisbii-capture` | No |
| `src/providers/frisbii/service.ts` | `refundPayment()` | `frisbii-capture` | No |
| `src/providers/frisbii/service.ts` | `cancelPayment()` | `frisbii-capture` | No |

### 6.5 Webhook

| File | Function | Log source | Gated? |
|---|---|---|---|
| `src/api/webhooks/frisbii/route.ts` | `POST` handler | `frisbii-webhook` | No |

Logged events: webhook received → signature failure → event processed (updated/created order status).

### 6.6 Subscribers

| File | Event | Log source | Gated? |
|---|---|---|---|
| `src/subscribers/frisbii-payment-authorized.ts` | `payment.authorized` | `frisbii-order-status` | No |
| `src/subscribers/frisbii-payment-captured.ts` | `payment.captured` | `frisbii-order-status` | No |

### 6.7 Log Viewer API

| File | Endpoint | Auth | Description |
|---|---|---|---|
| `src/api/admin/frisbii/logs/route.ts` | `GET /admin/frisbii/logs` | Admin | Returns array of log file metadata, sorted by `modified_at` desc |
| `src/api/admin/frisbii/logs/[filename]/route.ts` | `GET /admin/frisbii/logs/:filename?page=1&limit=100` | Admin | Returns paginated lines from one log file |

**Security checks in log API routes:**
1. Filename must match pattern `^frisbii-[a-z-]+-\d{4}-\d{2}-\d{2}\.log$` (whitelist)
2. `path.resolve(logDir, filename)` must start with `path.resolve(logDir)` (path confinement)
3. Both routes require `AuthenticatedMedusaRequest` (admin session required)

### 6.8 Admin UI

| File | Role |
|---|---|
| `src/admin/routes/settings/frisbii/page.tsx` | Settings page — "Debug Mode" section with toggle + active warning |
| `src/admin/routes/settings/frisbii-logs/page.tsx` | Log Dashboard — lists log files in a table with View action |
| `src/admin/routes/settings/frisbii-logs/[filename]/page.tsx` | Log Detail — paginated line viewer with level colour-coding |
| `src/admin/locale/translations/en.ts` | Translation keys: `debugMode`, `debugModeEnabled`, `debugModeHint`, `debugModeWarning`, `logViewerTitle`, `logSource`, `logDateCreated`, `logDateModified`, `logFileSize`, `logViewAction`, `logRefresh`, `logBackToList`, `logViewingFile`, `logNoFiles`, `logDebugDisabled`, `logGoToSettings`, `logPage`, `logOf`, `logPrevPage`, `logNextPage`, `logLineNumber` |
| `src/admin/locale/translations/da.ts` | Danish equivalents of all keys above |

---

## 7. Config Cache Behaviour

The provider caches the full `frisbii_config` row for **30 seconds** (`CONFIG_CACHE_TTL_MS = 30_000`).

```
Admin saves debug_enabled = true
          │
          ▼
DB updated immediately
          │
          ▼  up to 30 s delay
Provider cache expires → next refreshApiKey() reads new value
          │
          ▼
apiClient_.setDebugEnabled(true)
checkoutClient_.setDebugEnabled(true)
→ API logs start appearing in frisbii-api-{date}.log
```

> If you need logs to appear immediately after enabling, wait up to 30 seconds or restart the Medusa backend.

---

## 8. Admin UI Navigation

```
Settings sidebar
  ├── Frisbii Pay          → /settings/frisbii         (CreditCard icon)
  └── Frisbii Pay Log      → /settings/frisbii-logs    (DocumentText icon)
                                    │
                          Click [View] on a row
                                    │
                                    ▼
                         /settings/frisbii-logs/:filename
                         (paginated line viewer)
```

The "Frisbii Pay Log" menu entry is **always visible** in the sidebar.  
When `debug_enabled = false`, the Log Dashboard page shows a "Debug mode is disabled" message with a link to Settings instead of the file table.

---

## 9. Deployment Checklist

After modifying any file in this feature, run the following:

```bash
# 1. Build the plugin
npm run build                         # in medusa-plugin-frisbii-pay/

# 2. Run DB migration (if model changed)
npx medusa db:migrate                 # in medusa-store/

# 3. Rebuild the admin bundle
npx medusa build                      # in medusa-store/

# 4. Restart the dev server (ask the user to do this)
```

---

## 10. Environment Variables

| Variable | Default | Description |
|---|---|---|
| `FRISBII_LOG_DIR` | `{cwd}/var/log/frisbii` | Absolute path to the log directory |
