# Architecture Guide

## System Overview

The Frisbii Payment Plugin extends Medusa's payment processing system to integrate with Reepay payment service. It follows Medusa's modular architecture with clear separation of concerns.

```
┌─────────────────────────────────────────────────────┐
│          Medusa Backend (Payment System)            │
│  ┌────────────────────────────────────────────────┐ │
│  │   Payment Provider: frisbii-payment            │ │
│  │  - Payment authorization & capture            │ │
│  │  - Refund handling & reconciliation            │ │
│  │  - Payment method management                   │ │
│  └────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────┐ │
│  │   Data Module: frisbii-data                    │ │
│  │  - Configuration storage                       │ │
│  │  - Session tracking                            │ │
│  │  - Transaction history                         │ │
│  └────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────┐ │
│  │   Workflows & Events                           │ │
│  │  - Order lifecycle hooks                       │ │
│  │  - Payment status updates                      │ │
│  │  - Session management                          │ │
│  └────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────┐ │
│  │   Admin & Store APIs                           │ │
│  │  - Configuration endpoints                     │ │
│  │  - Payment status tracking                     │ │
│  │  - Webhook receivers                           │ │
│  └────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
        │                           │
        ▼                           ▼
  ┌──────────────┐          ┌──────────────┐
  │   Database   │          │  Reepay API  │
  │  (4 Tables)  │          │  (REST API)  │
  └──────────────┘          └──────────────┘
```

## Core Components

### 1. Payment Provider (`src/providers/frisbii/`)

**Purpose**: Implements the Medusa payment provider interface for Reepay.

**Key Files**:
- `service.ts` - AbstractPaymentProvider implementation
- `clients/frisbii-api-client.ts` - HTTP client for Reepay API
- `clients/frisbii-checkout-client.ts` - Checkout session management
- `index.ts` - Module provider registration

**Key Methods**:

```typescript
class FrisbiiPaymentService extends AbstractPaymentProvider {
  // Initialize payment session
  initiatePayment(input): Promise<PaymentSessionData>
  
  // Authorize payment (hold funds)
  authorizePayment(input): Promise<PaymentSessionData>
  
  // Capture payment (charge card)
  capturePayment(input): Promise<PaymentSessionData>
  
  // Refund payment
  refundPayment(input): Promise<PaymentSessionData>
  
  // Cancel/void payment
  cancelPayment(input): Promise<PaymentSessionData>
  
  // Get payment status
  getPaymentStatus(input): Promise<string>
  
  // Delete payment session
  deletePayment(input): Promise<void>
}
```

**Payment Flow**:
```
Customer Initiates Payment
        ↓
[initiatePayment] → Create Reepay session
        ↓
[Store frisbii-data] → Save session to DB
        ↓
Customer completes on Reepay UI
        ↓
Reepay Webhook → Verify & process
        ↓
[authorizePayment] → Card authorized
        ↓
[capturePayment] → Funds received
        ↓
Order marked as paid
```

### 2. Data Module (`src/modules/frisbii-data/`)

**Purpose**: Custom Medusa module for storing Frisbii-specific data.

**Database Tables**:

#### frisbii_config
System configuration singleton.

| Field | Type | Purpose |
|-------|------|---------|
| id | UUID (PK) | Unique identifier |
| apiKey | String | Reepay API key |
| apiSecret | String | Reepay API secret |
| webhookSecret | String | Webhook signature secret |
| enabled | Boolean | Enable/disable payments |
| testMode | Boolean | Test vs production mode |
| processingCurrency | String | Default currency |

#### frisbii_session
Payment session tracking.

| Field | Type | Purpose |
|-------|------|---------|
| id | UUID (PK) | Unique identifier |
| cartId | UUID (FK) | Medusa cart reference |
| orderId | UUID (FK) | Medusa order reference |
| sessionId | String | Reepay session ID |
| status | Enum | pending/authorized/completed/failed |
| amount | Integer | Amount in cents |
| currency | String | ISO currency code |
| expiresAt | DateTime | Session expiration |

#### frisbii_customer
Customer-to-Reepay mapping.

| Field | Type | Purpose |
|-------|------|---------|
| id | UUID (PK) | Unique identifier |
| medusaCustomerId | UUID (FK) | Medusa customer |
| reepayCustomerId | String | Reepay customer ID |
| email | String | Customer email |

#### frisbii_payment_status
Transaction history.

| Field | Type | Purpose |
|-------|------|---------|
| id | UUID (PK) | Unique identifier |
| orderId | UUID (FK) | Order reference |
| status | Enum | pending/authorized/captured/failed |
| amount | Integer | Amount in cents |
| transactions | JSON | Array of transaction objects |
| lastUpdate | DateTime | Last status change |

**Service Interface**:

```typescript
class FrisbiiDataService extends TransactionBaseService {
  // Configuration
  getConfig(): Promise<FrisbiiConfig>
  setConfig(config): Promise<FrisbiiConfig>
  
  // Sessions
  createSession(data): Promise<FrisbiiSession>
  getSession(sessionId): Promise<FrisbiiSession>
  updateSessionStatus(sessionId, status): Promise<FrisbiiSession>
  expireSessions(): Promise<number> // Auto-cleanup
  
  // Payment Status
  createPaymentStatus(orderId, data): Promise<FrisbiiPaymentStatus>
  getPaymentStatus(orderId): Promise<FrisbiiPaymentStatus>
  recordTransaction(orderId, transaction): Promise<FrisbiiPaymentStatus>
  
  // Customer Mapping
  mapCustomer(medusaId, reepayId): Promise<FrisbiiCustomer>
  getCustomerMapping(medusaId): Promise<FrisbiiCustomer>
}
```

### 3. Workflows (`src/workflows/`)

**Purpose**: Orchestrate multi-step payment operations using Medusa's workflow engine.

**Main Workflow: Create Frisbii Session**

```typescript
createFrisbiiSessionWorkflow()
  .addStep("validateCart", validateCartStep)
  .addStep("createSession", createFrisbiiSessionStep)
  .addStep("storeSession", storeFrisbiiSessionStep)
  .addCompensation("storeFrisbiiSessionStep", compensateSessionCreation)
```

**Workflow Steps**:

1. **createFrisbiiSessionStep**
   - Input: Cart data, currency, amount
   - Action: Call Reepay API to create session
   - Output: Session ID, redirect URL
   - Error: Reepay unreachable, invalid credentials

2. **createFrisbiiPaymentStatusStep**
   - Input: Order ID, amount
   - Action: Create payment status record
   - Output: Payment status with transaction history
   - Compensation: Delete status on failure

3. **storeFrisbiiSessionStep**
   - Input: Session ID, cart/order ID
   - Action: Store session in database
   - Output: Stored session record
   - Compensation: Delete session record on failure

**Compensation Logic**:
If payment authorization fails, workflows automatically:
- Delete created sessions
- Revert payment status
- Return cart to "pending payment" state

### 4. Event Subscribers (`src/subscribers/`)

**Purpose**: React to Medusa events during order lifecycle.

**Subscribers**:

1. **frisbii-order-placed**
   - Event: order.placed
   - Action: Create frisbii_payment_status record
   - Tracks initial payment attempt

2. **frisbii-payment-authorized**
   - Event: payment.authorized
   - Action: Update payment status
   - Record authorization transaction

3. **frisbii-payment-captured**
   - Event: payment.captured
   - Action: Update payment status
   - Record capture transaction
   - Mark order as paid

### 5. Admin API (`src/api/admin/frisbii/`)

**Routes**:

| Route | Method | Purpose |
|-------|--------|---------|
| /config | GET | Retrieve configuration |
| /config | POST | Update configuration |
| /verify-connection | POST | Test API credentials |
| /payment-status/:orderId | GET | Get payment details |
| /payment-link | POST | Generate payment link (future) |
| /webhook | POST | Test webhook receiver |

**Route Middleware**:
- Authentication: Validates admin token
- Validation: Validates request body
- Error handling: Structured error responses

### 6. Store API (`src/api/store/frisbii/`)

**Routes**:

| Route | Method | Purpose |
|-------|--------|---------|
| /config | GET | Public configuration |
| /saved-cards | GET | Customer's saved cards |
| /verify-accept | POST | Verify payment completion |

**Authentication**: Customer token (except /config)

### 7. Webhooks (`src/api/webhooks/frisbii/`)

**Purpose**: Receive and process Reepay webhook events.

**Webhook Flow**:

```
Reepay Event
    ↓
POST /webhooks/frisbii (with X-Signature header)
    ↓
Verify HMAC signature
    ↓
Validate event type
    ↓
Process event handler
    ├─ payment_authorized → Update order status
    ├─ payment_captured → Mark paid
    ├─ payment_failed → Retry/cancel
    └─ refund_created → Update transaction
    ↓
Update frisbii_payment_status
    ↓
Emit Medusa events (order.paid, etc.)
    ↓
Respond 200 OK
```

**Event Processing**:
- Webhook signature validation (HMAC-SHA256)
- Idempotent: Same event processed multiple times is safe
- Async: Events processed asynchronously via job queue

### 8. Admin Widget (`src/admin/widgets/`)

**frisbii-order-payment.tsx**:
React component for Medusa admin dashboard.

- Displays order payment status
- Shows transaction history
- Allows manual payment actions (future)
- Uses Medusa admin SDK

## Data Flow Examples

### Example 1: Complete Payment Flow

```
1. Customer initiates checkout
   └─ POST /checkout/cart → Create cart

2. Customer selects Frisbii payment
   └─ POST /store/payment-sessions
     └─ initiatePayment() called
       └─ Create Reepay session via API
       └─ Store session in frisbii_session table
       └─ Return redirect URL

3. Customer completes payment on Reepay
   └─ Reepay processes card
   └─ Webhook: payment_authorized
     └─ Create frisbii_payment_status
     └─ Update order status
     └─ Emit order.paid event

4. Capture funds (auto or manual)
   └─ capturePayment() called
   └─ Reepay captures transaction
   └─ Webhook: payment_captured
     └─ Update transaction record
     └─ Mark order as "captured"
     └─ Trigger fulfillment workflow

5. Order completion
   └─ Order marked as paid
   └─ Fulfillment begins
   └─ Admin can view payment details
```

### Example 2: Refund Flow

```
1. Admin initiates refund
   └─ App calls refundPayment()

2. Plugin creates refund in Reepay
   └─ API call to Reepay refund endpoint
   └─ Returns refund ID

3. Reepay processes refund
   └─ Webhook: refund_created
     └─ Update frisbii_payment_status
     └─ Add refund transaction record
     └─ Update order status

4. Refund appears in customer account
   └─ Customer sees credit (2-5 business days)
   └─ Admin sees refund in order history
```

## Error Handling

**Graceful Degradation**:

```typescript
// If Reepay unreachable
initiatePayment()
  .catch(error => {
    // Log error
    // Update frisbii_payment_status to "failed"
    // Emit payment.failed event
    // Allow retry
  })

// If webhook signature invalid
verifyWebhook()
  .catch(error => {
    // Reject webhook (403 Forbidden)
    // Log security event
    // Alert admin
  })
```

**Retry Logic**:
- Failed API calls: Retry up to 3 times with exponential backoff
- Webhook processing: Reepay retries 5 times over 48 hours
- Database operations: Transaction rollback on failure

## Module Registration

The plugin registers with Medusa using the module system:

```typescript
// src/providers/frisbii/index.ts
export default {
  resolve: "@montaekung/medusa-plugin-frisbii-pay",
  id: "frisbii-payment",
  service: FrisbiiPaymentService,
}

// src/modules/frisbii-data/index.ts
export default {
  resolve: "@montaekung/medusa-plugin-frisbii-pay/modules/frisbii-data",
  id: "frisbiiData",
  service: FrisbiiDataService,
}
```

## Security Considerations

1. **API Credentials**: Stored in .env, never exposed in frontend
2. **Webhook Verification**: HMAC-SHA256 signature validation
3. **Sensitive Data**: PII not stored (only customer IDs)
4. **HTTPS Only**: All API calls use HTTPS
5. **Token Validation**: Admin and customer tokens required
6. **Rate Limiting**: Respect Reepay rate limits (1000 req/min)

## Performance Optimization

1. **Caching**: Config cached for 5 minutes
2. **Batch Operations**: Multiple sessions stored in one transaction
3. **Async Processing**: Webhooks processed asynchronously
4. **Database Indexes**: Session IDs, order IDs indexed
5. **Connection Pooling**: Database connection reuse

## Scaling Considerations

- **Horizontal Scaling**: Stateless design allows multiple instances
- **Queue-Based**: Async job processing for webhooks
- **Database Connection Pooling**: Configured in Medusa
- **Rate Limiting**: Managed at plugin level
- **Caching**: Redis for config caching (optional)

For implementation details, see [API Reference](./API_REFERENCE.md) and [Testing Guide](./TESTING.md).
