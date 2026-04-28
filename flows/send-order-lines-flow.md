# Send Order Lines — Feature Flow & File Reference

> **Purpose**: This document maps the full end-to-end execution path of the
> `send_order_lines` setting so that any developer can quickly understand,
> trace, and debug the feature without reading every source file.

---

## 1. What the Feature Does

| `send_order_lines` | Behaviour |
|--------------------|-----------|
| `true` (default)   | Builds an `order_lines[]` array from Medusa's DB and sends it to the Reepay API. The Reepay/Billwerk+ invoice shows each product, shipping method, and discount as a separate line item. |
| `false`            | Only sends the total `amount` (in minor currency units). The Reepay invoice shows one aggregate amount with no line-item breakdown. |

The setting is applied at **two payment lifecycle points**:

- **Session creation** (`initiatePayment`) — uses cart data
- **Capture / settle** (`capturePayment`) — uses order data

---

## 2. Related Files at a Glance

```
src/
├── modules/frisbii-data/
│   ├── models/frisbii-config.ts          # DB model — send_order_lines column
│   └── service.ts                        # CRUD for frisbii_config table
│
├── api/admin/frisbii/
│   ├── config/
│   │   ├── route.ts                      # GET /admin/frisbii/config
│   │   │                                   POST /admin/frisbii/config
│   │   └── validators.ts                 # Zod schema — includes send_order_lines
│   └── ...
│
├── providers/frisbii/
│   └── service.ts                        # Payment provider — reads config,
│                                           calls order-lines helpers, builds payload
│
├── utils/
│   └── order-lines.ts                    # Core utility — all DB queries and
│                                           ReepayOrderLine builders
│
└── admin/
    └── routes/settings/frisbii/
        └── page.tsx                      # Admin UI — "Send Order Lines" toggle
```

---

## 3. Data Model

**File**: `src/modules/frisbii-data/models/frisbii-config.ts`

```typescript
send_order_lines: model.boolean().default(true)
```

- Stored in the `frisbii_config` PostgreSQL table (row id = `"default"`).
- Default value: `true`.
- No migration is needed to add this column — it was included in an existing
  migration (`Migration20260330075346.ts`).

---

## 4. Admin UI — Saving the Setting

**File**: `src/admin/routes/settings/frisbii/page.tsx`

1. The page loads on mount via `GET /admin/frisbii/config`.
2. The **Payment Processing** section renders a `<Switch>` bound to
   `config.send_order_lines`.
3. On **Save Configuration**, the page calls `POST /admin/frisbii/config` with
   the full config object (including `send_order_lines`).

**API route files**:

| File | Responsibility |
|------|----------------|
| `src/api/admin/frisbii/config/route.ts` | `GET` reads/creates the `default` config row via `frisbiiData` module. `POST` calls `updateFrisbiiConfigs()` with the validated body. |
| `src/api/admin/frisbii/config/validators.ts` | Zod schema validates `send_order_lines` as an optional boolean. |

---

## 5. Config Cache in the Payment Provider

**File**: `src/providers/frisbii/service.ts`

```typescript
const CONFIG_CACHE_TTL_MS = 30_000  // 30 seconds

private async getConfig(): Promise<FrisbiiDbConfig> {
  // Returns cached value if < 30 s old.
  // Otherwise reads frisbii_config WHERE id = 'default'.
  // Falls back to env-var options if DB fails
  //   (fallback also defaults send_order_lines: true).
}
```

> **Debug tip**: If a config change in the Admin UI is not reflected immediately,
> wait 30 seconds for the cache to expire, or restart the Medusa server.

---

## 6. Flow A — initiatePayment (Session Creation)

Triggered when the customer reaches the payment step in the storefront.

```
Storefront checkout
        │
        ▼
Medusa Core: PaymentService.initiatePayment()
        │
        ▼
FrisbiiPaymentProviderService.initiatePayment(input)
  │
  ├─ await getConfig()                        ← reads config (cached 30 s)
  │
  ├─ config.send_order_lines?
  │       │
  │     YES ──────────────────────────────────────────────────────────────┐
  │       │                                                               │
  │       ├─ input.data.session_id present?                               │
  │       │       │                                                       │
  │       │     YES                                                       │
  │       │       │                                                       │
  │       │       ├─ getCartIdFromPaymentSessionId(pgConn, session_id)    │
  │       │       │   SQL: payment_session → cart_payment_collection      │
  │       │       │                                                       │
  │       │       ├─ cartId found?                                        │
  │       │       │       │                                               │
  │       │       │     YES                                               │
  │       │       │       │                                               │
  │       │       │       └─ buildCartOrderLines(pgConn, cartId, currency)│
  │       │       │               │                                       │
  │       │       │               ├─ Query cart_line_item                 │
  │       │       │               ├─ Query cart_line_item_tax_line        │
  │       │       │               ├─ Query cart_line_item_adjustment      │
  │       │       │               ├─ Query cart_shipping_method           │
  │       │       │               └─ Query cart_shipping_method_tax_line  │
  │       │       │                       │                               │
  │       │       │                  Returns ReepayOrderLine[]            │
  │       │       │                       │                               │
  │       │       │       validateTotal: calculateTotalFromOrderLines()   │
  │       │       │           ± 2-cent tolerance vs input.amount          │
  │       │       │                       │                               │
  │       │       │              PASS → orderData.order_lines = lines     │
  │       │       │              FAIL → orderData.amount = totalMinor     │
  │       │       │                                               ◄───────┘
  │       │     NO (no cartId / no session_id / DB error)
  │       │       │
  │       │       └─ orderData.amount = toMinorUnits(input.amount, currency)
  │       │
  │     NO (send_order_lines = false)
  │       │
  │       └─ orderData.amount = toMinorUnits(input.amount, currency)
  │
  ├─ POST checkout-api.reepay.com/v1/session/charge
  │       body.order = { handle, currency, order_lines? OR amount? }
  │
  └─ Insert frisbii_session row
         { session_handle, charge_handle, cart_id, payment_session_id }
```

**Key fallback rule**: Any exception inside the `send_order_lines` branch sets
`orderData.amount` and continues — checkout is **never blocked**.

---

## 7. Flow B — capturePayment (Settle / Capture)

Triggered when a Medusa admin clicks **Capture** on an order, or when
`auto_capture = true` fires automatically.

```
Medusa Admin: Capture payment
        │
        ▼
FrisbiiPaymentProviderService.capturePayment(input)
  │
  ├─ await getConfig()
  │
  ├─ config.send_order_lines?
  │       │
  │     YES ──────────────────────────────────────────────────────────────┐
  │       │                                                               │
  │       ├─ Query frisbii_session WHERE charge_handle = input.charge_handle
  │       │   → get payment_session_id                                    │
  │       │                                                               │
  │       ├─ getOrderIdFromPaymentSessionId(pgConn, payment_session_id)  │
  │       │   SQL: payment_session → order_payment_collection             │
  │       │                                                               │
  │       └─ buildOrderOrderLines(pgConn, orderId, currency)             │
  │               │                                                       │
  │               ├─ Query order_item (latest version)                   │
  │               ├─ Query order_line_item (JOIN)                        │
  │               ├─ Query order_line_item_tax_line                      │
  │               ├─ Query order_line_item_adjustment                    │
  │               ├─ Query order_shipping + order_shipping_method        │
  │               └─ Query order_shipping_method_tax_line                │
  │                       │                                               │
  │                  Returns ReepayOrderLine[]                            │
  │                       │                                               │
  │                  settleBody = { order_lines: lines }   ◄─────────────┘
  │
  │     NO (send_order_lines = false, or any DB error)
  │       │
  │       └─ settleBody = {}   (Reepay settles full authorized amount)
  │
  └─ POST api.reepay.com/v1/charge/{chargeHandle}/settle
         body = settleBody
```

---

## 8. ReepayOrderLine Shape

**File**: `src/utils/order-lines.ts`

```typescript
interface ReepayOrderLine {
  ordertext: string        // Product title or shipping name (max 256 chars)
  quantity: number         // Item quantity; 1 for shipping
  amount: number           // Unit price in minor units (e.g. cents). Negative = discount.
  vat: number              // Tax rate as decimal (e.g. 0.25 = 25%). 0 if no tax.
  amount_incl_vat: boolean // true = amount already includes VAT
}
```

**Text sanitisation rule**: Non-alphanumeric characters (except `- ( ) . , :`) are
stripped; result truncated to 256 characters. Empty strings become `"Item"`.

---

## 9. Database Queries Summary

### Flow A: Cart (initiatePayment)

| Step | Table(s) | Purpose |
|------|----------|---------|
| Resolve cart | `payment_session` → `cart_payment_collection` | Get cart_id from session id |
| Product lines | `cart_line_item` | title, quantity, unit_price, is_tax_inclusive |
| Product VAT | `cart_line_item_tax_line` | SUM(rate) per item |
| Discounts | `cart_line_item_adjustment` | SUM(amount) per item |
| Shipping | `cart_shipping_method` | name, amount, is_tax_inclusive |
| Shipping VAT | `cart_shipping_method_tax_line` | SUM(rate) per shipping method |

### Flow B: Order (capturePayment)

| Step | Table(s) | Purpose |
|------|----------|---------|
| Resolve session | `frisbii_session` | Get payment_session_id from charge_handle |
| Resolve order | `payment_session` → `order_payment_collection` | Get order_id |
| Product lines | `order_item` JOIN `order_line_item` | `order_item`: quantity (latest version per item); `order_line_item`: **unit_price**, title, is_tax_inclusive — ⚠️ `order_item.unit_price` is NULL for normal orders; always use `order_line_item.unit_price` |
| Product VAT | `order_line_item_tax_line` | SUM(rate) per item |
| Discounts | `order_line_item_adjustment` | SUM(amount) per item |
| Shipping | `order_shipping` JOIN `order_shipping_method` | name, amount, is_tax_inclusive |
| Shipping VAT | `order_shipping_method_tax_line` | SUM(rate) per shipping method |

---

## 10. Amount Validation (Flow A only)

After building cart order lines, the provider validates that the sum of the lines
matches Medusa's `input.amount`:

```
linesTotal = calculateTotalFromOrderLines(lines)  // minor units
expectedTotal = toMinorUnits(input.amount, currency)

if |linesTotal - expectedTotal| <= 2 cents
    → use order_lines
else
    → fall back to amount-only and log a warning
```

This tolerance of ±2 minor units accommodates floating-point rounding.

> **Debug tip**: If you see the warning  
> `"Frisbii initiatePayment: order lines total (X) != expected (Y) for cart Z — using amount-only"`  
> it means a rounding or discount calculation mismatch. Check discount
> adjustments in `cart_line_item_adjustment` and VAT rates in
> `cart_line_item_tax_line`.

---

## 11. Fallback Chain Summary

```
Any step fails with an exception
        │
        ▼
Log warning via this.logger_.warn(...)
        │
        ▼
initiatePayment → orderData.amount = total (amount-only)
capturePayment  → settleBody = {} (Reepay settles full authorized amount)
        │
        ▼
Continue normally — checkout / capture succeeds
```

---

## 12. Debugging Checklist

| Symptom | Where to look |
|---------|--------------|
| Order lines not appearing on Reepay invoice | Check Medusa server logs for `"Frisbii initiatePayment:"` or `"Frisbii capturePayment:"` warnings |
| Lines total mismatch warning | Check `cart_line_item_adjustment` and `cart_line_item_tax_line` for the cart in question |
| Setting change not taking effect within 30 s | Config cache TTL; restart server or wait 30 s |
| `send_order_lines` ignored (always false) | Verify the `default` row exists in `frisbii_config`; check that the Admin POST saved the value |
| DB query errors | Confirm `__pg_connection__` is injected into the provider; check DB connectivity |
| Reepay rejects the payload | Verify `ordertext` is ≤ 256 chars and `amount` values are positive integers (minor units) |
| Shipping line missing | Check that `cart_shipping_method` / `order_shipping_method` rows have `amount > 0` and `deleted_at IS NULL` |
| VAT rate is 0 unexpectedly | Check `cart_line_item_tax_line` rows exist for the cart; confirm region tax rates are configured in Medusa |

---

## 13. Quick Reference: Key Function Signatures

```typescript
// src/utils/order-lines.ts

getCartIdFromPaymentSessionId(pgConn, paymentSessionId): Promise<string | null>
getOrderIdFromPaymentSessionId(pgConn, paymentSessionId): Promise<string | null>
buildCartOrderLines(pgConn, cartId, currencyCode): Promise<ReepayOrderLine[]>
buildOrderOrderLines(pgConn, orderId, currencyCode): Promise<ReepayOrderLine[]>
calculateTotalFromOrderLines(lines: ReepayOrderLine[]): number
```

```typescript
// src/providers/frisbii/service.ts  (private)

getConfig(): Promise<FrisbiiDbConfig>   // cached 30 s; field: send_order_lines
```
