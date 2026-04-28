# API Reference

## Overview

The Frisbii Payment Plugin exposes Admin, Store, and Webhook APIs for managing and processing payments. This reference covers all available endpoints, request/response formats, and data types.

## Base URLs

- **Admin API**: `http://localhost:9000/admin`
- **Store API**: `http://localhost:8000/store`
- **Webhooks**: `http://localhost:9000/webhooks`

All Admin endpoints require authentication with an admin token in the `Authorization` header.

---

## Admin API Endpoints

### Configuration Management

#### GET /admin/frisbii/config

Retrieve current Frisbii configuration.

**Authentication**: Required (Admin Token)

**Response:**
```typescript
{
  id: string;
  apiKey: string;
  apiSecret: string;
  webhookSecret: string;
  enabled: boolean;
  testMode: boolean;
  processingCurrency: string;
  createdAt: Date;
  updatedAt: Date;
}
```

**Example**:
```bash
curl -X GET http://localhost:9000/admin/frisbii/config \
  -H "Authorization: Bearer eyJhbGc..."
```

**Response**:
```json
{
  "id": "frisbii-config-1",
  "apiKey": "rp_live_xxx",
  "enabled": true,
  "testMode": false,
  "processingCurrency": "USD",
  "createdAt": "2026-04-02T10:00:00.000Z",
  "updatedAt": "2026-04-02T10:00:00.000Z"
}
```

#### POST /admin/frisbii/config

Create or update Frisbii configuration.

**Authentication**: Required (Admin Token)

**Request Body**:
```typescript
{
  apiKey: string;
  apiSecret: string;
  webhookSecret: string;
  enabled?: boolean;
  testMode?: boolean;
  processingCurrency?: string;
}
```

**Response**: Same as GET, with updated values

**Example**:
```bash
curl -X POST http://localhost:9000/admin/frisbii/config \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "rp_live_new_key",
    "apiSecret": "secret_new",
    "webhookSecret": "webhook_secret",
    "enabled": true
  }'
```

### Connection Verification

#### POST /admin/frisbii/verify-connection

Test if API credentials are valid and can connect to Reepay.

**Authentication**: Required (Admin Token)

**Request Body**:
```typescript
{
  apiKey: string;
  apiSecret: string;
}
```

**Response**:
```typescript
{
  connected: boolean;
  message: string;
  error?: string;
  details?: {
    apiVersion: string;
    accountId: string;
    rateLimit: number;
  };
}
```

**Example**:
```bash
curl -X POST http://localhost:9000/admin/frisbii/verify-connection \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "rp_live_xxx",
    "apiSecret": "secret_xxx"
  }'
```

**Success Response**:
```json
{
  "connected": true,
  "message": "Successfully connected to Reepay API",
  "details": {
    "apiVersion": "v1",
    "accountId": "acc_123456",
    "rateLimit": 1000
  }
}
```

**Error Response**:
```json
{
  "connected": false,
  "message": "Connection failed",
  "error": "Invalid API credentials"
}
```

### Payment Status

#### GET /admin/frisbii/payment-status/:orderId

Get live payment status for an order. The route looks up the `charge_handle` from `frisbii_session`, then fetches live invoice data from the Reepay `/v1/invoice/{handle}` endpoint. Falls back to DB-stored values if the Reepay API is unavailable.

**Authentication**: Required (Admin Token)

**Parameters**:
- `orderId` (path): Medusa Order ID

**Response**:
```typescript
{
  payment_status: {
    id: string | null;
    order_id: string;
    charge_handle: string | null;       // Reepay charge/invoice handle
    status: "pending" | "authorized" | "settled" | "refunded" | "cancelled" | "failed";
    currency: string;                   // ISO code e.g. "EUR"
    authorized_amount: number;          // Minor units (cents)
    settled_amount: number;             // Minor units (cents)
    refunded_amount: number;            // Minor units (cents)
    amount: number;                     // Total order amount in minor units
    card_type: string | null;           // e.g. "visa", "mastercard"
    masked_card: string | null;         // e.g. "411111XXXXXX1111"
    payment_method_type: string | null; // e.g. "card_token"
    surcharge_fee: number | null;
    error: string | null;
    error_state: string | null;
    transactions: Array<{
      id: string;
      type: "authorize" | "settle" | "refund" | "cancel";
      amount: number;                   // Minor units
      currency: string;
      created: string;                  // ISO 8601
      settled: string | null;
      state: string;                    // "completed" | "failed" etc.
      payment_type: string | null;
      card_transaction: {
        card_type?: string;
        masked_card?: string;
      } | null;
    }> | null;
  } | null;
}
```

**Example**:
```bash
curl -X GET http://localhost:9000/admin/frisbii/payment-status/order_abc123 \
  -H "Authorization: Bearer eyJhbGc..."
```

**Response**:
```json
{
  "payment_status": {
    "order_id": "order_abc123",
    "charge_handle": "cart-1775623306319",
    "status": "settled",
    "currency": "EUR",
    "authorized_amount": 2000,
    "settled_amount": 2000,
    "refunded_amount": 0,
    "amount": 2000,
    "card_type": "visa",
    "masked_card": "411111XXXXXX1111",
    "payment_method_type": "card_token",
    "surcharge_fee": null,
    "error": null,
    "error_state": null,
    "transactions": [
      {
        "id": "to_xxx",
        "type": "authorize",
        "amount": 2000,
        "currency": "EUR",
        "created": "2026-04-08T11:39:18.000Z",
        "settled": null,
        "state": "completed",
        "payment_type": null,
        "card_transaction": {
          "card_type": "visa",
          "masked_card": "411111XXXXXX1111"
        }
      },
      {
        "id": "to_yyy",
        "type": "settle",
        "amount": 2000,
        "currency": "EUR",
        "created": "2026-04-08T11:39:20.000Z",
        "settled": "2026-04-08T11:39:20.000Z",
        "state": "completed",
        "payment_type": null,
        "card_transaction": null
      }
    ]
  }
}
```

> **Note**: All monetary amounts are in **minor units** (e.g. 2000 = €20.00). The admin widget divides by 100 for display (except zero-decimal currencies like JPY).

> **See invoice link**: `https://admin.billwerk.plus/#/rp/payments/invoices/invoice/{charge_handle}`

### Payment Link

#### POST /admin/frisbii/payment-link

Generate a payment link for an order (manual payment collection).

**Authentication**: Required (Admin Token)

**Request Body**:
```typescript
{
  orderId: string;
  amount: number;
  currency: string;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}
```

**Response**:
```typescript
{
  status: number; // 501
  message: string;
  link?: string;
  error?: string;
}
```

**Note**: This endpoint returns 501 (Not Implemented) and is reserved for future use.

---

### Debug Log Viewer

#### GET /admin/frisbii/logs

List all Frisbii log files present on disk.

**Authentication**: Required (Admin Token)

**Response**:
```typescript
{
  files: Array<{
    name: string;        // e.g. "frisbii-api-2025-01-15.log"
    source: string;      // e.g. "frisbii-api"
    date: string;        // e.g. "2025-01-15"
    size_bytes: number;
    size_label: string;  // human-readable e.g. "12.4 KB"
    created_at: string;  // ISO timestamp
    modified_at: string; // ISO timestamp — list sorted by this, desc
  }>;
}
```

**Example**:
```bash
curl -X GET http://localhost:9000/admin/frisbii/logs \
  -H "Authorization: Bearer eyJhbGc..."
```

---

#### GET /admin/frisbii/logs/:filename

Read the content of a specific log file with pagination.

**Authentication**: Required (Admin Token)

**Path parameter**:
- `filename` — must match pattern `frisbii-[a-z-]+-YYYY-MM-DD.log` exactly. Any other value returns 400.

**Query parameters**:
| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `page` | integer | `1` | — | 1-based page number |
| `limit` | integer | `100` | `500` | Lines per page |

**Response**:
```typescript
{
  filename: string;
  content: string[];    // array of log lines for the requested page
  lines: number;        // number of lines in this response
  total_lines: number;  // total lines in the file
  total_pages: number;
  page: number;
  limit: number;
}
```

**Example**:
```bash
curl -X GET "http://localhost:9000/admin/frisbii/logs/frisbii-api-2025-01-15.log?page=1&limit=100" \
  -H "Authorization: Bearer eyJhbGc..."
```

**Security notes**:
- Filename is validated against a strict regex whitelist before the file is opened.
- Resolved absolute path must be within the configured log directory (path-traversal prevention).
- Files are read server-side only; they are never served as static assets.

---

## Store API Endpoints

### Configuration

#### GET /store/frisbii/config

Get public Frisbii configuration (payment methods, currencies supported).

**Authentication**: Not required

**Response**:
```typescript
{
  enabled: boolean;
  processingCurrency: string;
  supportedCurrencies: string[];
  paymentMethods: Array<{
    id: string;
    name: string;
    description: string;
  }>;
}
```

**Example**:
```bash
curl -X GET http://localhost:8000/store/frisbii/config
```

**Response**:
```json
{
  "enabled": true,
  "processingCurrency": "USD",
  "supportedCurrencies": ["USD", "EUR", "GBP", "JPY"],
  "paymentMethods": [
    {
      "id": "card",
      "name": "Credit/Debit Card",
      "description": "Visa, Mastercard, American Express"
    },
    {
      "id": "bank_transfer",
      "name": "Bank Transfer",
      "description": "Direct bank transfer"
    }
  ]
}
```

### Saved Cards

#### GET /store/frisbii/saved-cards

Get customer's saved payment cards.

**Authentication**: Required (Customer Token)

**Response**:
```typescript
{
  cards: Array<{
    id: string;
    lastFour: string;
    brand: string;
    expiryMonth: number;
    expiryYear: number;
    isDefault: boolean;
  }>;
}
```

**Example**:
```bash
curl -X GET http://localhost:8000/store/frisbii/saved-cards \
  -H "Authorization: Bearer customer_token"
```

**Response**:
```json
{
  "cards": [
    {
      "id": "card_abc123",
      "lastFour": "4242",
      "brand": "visa",
      "expiryMonth": 12,
      "expiryYear": 2026,
      "isDefault": true
    }
  ]
}
```

### Payment Verification

#### POST /store/frisbii/verify-accept

Verify and accept a payment session completion.

**Authentication**: Required (Customer Token)

**Request Body**:
```typescript
{
  sessionId: string;
  paymentMethodId?: string;
  metadata?: Record<string, any>;
}
```

**Response**:
```typescript
{
  success: boolean;
  sessionId: string;
  status: "completed" | "failed" | "pending";
  message: string;
  orderId?: string;
}
```

**Example**:
```bash
curl -X POST http://localhost:8000/store/frisbii/verify-accept \
  -H "Authorization: Bearer customer_token" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session_xyz789",
    "paymentMethodId": "card_abc123"
  }'
```

**Response**:
```json
{
  "success": true,
  "sessionId": "session_xyz789",
  "status": "completed",
  "message": "Payment processed successfully",
  "orderId": "order_abc123"
}
```

---

## Webhook Endpoints

### POST /webhooks/frisbii

Receive and process Reepay webhook events.

**Authentication**: Signature verification (X-Signature header)

**Webhook Events**:

| Event | Description | Payload |
|-------|-------------|---------|
| `payment_authorized` | Payment authorized on card | `{ orderId, amount, transactionId }` |
| `payment_captured` | Payment captured (funds received) | `{ orderId, amount, transactionId }` |
| `payment_failed` | Payment failed | `{ orderId, reason, transactionId }` |
| `refund_created` | Refund issued | `{ orderId, amount, refundId }` |

**Request Headers**:
```
X-Signature: hmac_sha256_signature_of_body
Content-Type: application/json
```

**Request Body Example (payment_authorized)**:
```json
{
  "event": "payment_authorized",
  "id": "evt_12345",
  "timestamp": "2026-04-02T10:00:00.000Z",
  "data": {
    "orderId": "order_abc123",
    "amount": 10000,
    "currency": "USD",
    "transactionId": "txn_123",
    "status": "authorized"
  }
}
```

**Processing**:
1. Webhook signature is verified using `FRISBII_WEBHOOK_SECRET`
2. Event is validated and processed
3. Order and payment status are updated
4. Response: `{ statusCode: 200, message: "Webhook processed" }`

---

## Data Types

### FrisbiiConfig

Configuration object stored in database.

```typescript
interface FrisbiiConfig {
  id: string;
  apiKey: string;
  apiSecret: string;
  webhookSecret: string;
  enabled: boolean;
  testMode: boolean;
  processingCurrency: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### FrisbiiSession

Payment session tracking.

```typescript
interface FrisbiiSession {
  id: string;
  cartId?: string;
  orderId?: string;
  customerId: string;
  sessionId: string;
  status: "pending" | "authorized" | "completed" | "failed" | "expired";
  amount: number;
  currency: string;
  metadata?: Record<string, any>;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### FrisbiiPaymentStatus

Payment transaction history.

```typescript
interface FrisbiiPaymentStatus {
  id: string;
  orderId: string;
  status: "pending" | "authorized" | "captured" | "failed" | "refunded";
  amount: number;
  currency: string;
  transactions: Array<{
    id: string;
    type: "authorization" | "capture" | "refund";
    amount: number;
    status: "success" | "failed";
    errorMessage?: string;
    createdAt: Date;
  }>;
  lastUpdate: Date;
}
```

### FrisbiiCustomer

Customer to Reepay customer mapping.

```typescript
interface FrisbiiCustomer {
  id: string;
  medusaCustomerId: string;
  reepayCustomerId: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Error Responses

All endpoints return standard error responses:

```typescript
{
  statusCode: number;
  message: string;
  error?: string;
  details?: Record<string, any>;
}
```

### Common HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| `200` | Success | Payment processed |
| `400` | Bad Request | Invalid parameters |
| `401` | Unauthorized | Missing/invalid token |
| `403` | Forbidden | Insufficient permissions |
| `404` | Not Found | Order/resource not found |
| `500` | Server Error | Internal server error |
| `503` | Service Unavailable | Reepay API unreachable |

### Error Response Example

```json
{
  "statusCode": 400,
  "message": "Invalid request",
  "error": "Missing required field: apiKey",
  "details": {
    "field": "apiKey",
    "type": "required"
  }
}
```

---

## Rate Limiting

The plugin respects Reepay's rate limits:
- **Requests per minute**: 1000
- **Burst limit**: 100 requests/second

If rate limited, the API returns:
```json
{
  "statusCode": 429,
  "message": "Too many requests",
  "retryAfter": 60
}
```

---

## Authentication

All Admin endpoints require:
```
Authorization: Bearer <admin_token>
```

Where `<admin_token>` is obtained from Medusa's admin login endpoint:
```bash
POST /admin/auth/user/emailpass

{
  "email": "admin@example.com",
  "password": "password"
}
```

---

## Pagination

List endpoints support pagination:

```bash
GET /admin/endpoint?limit=20&offset=0
```

Response includes:
```json
{
  "data": [...],
  "count": 100,
  "limit": 20,
  "offset": 0
}
```

For detailed usage examples, see [Architecture Guide](./ARCHITECTURE.md).
