# Testing Guide

## Overview

This guide covers testing the Frisbii Payment Plugin locally and in various environments. Testing ensures the plugin integrates correctly with Medusa and processes payments as expected.

## Prerequisites

- Medusa backend running locally
- Plugin installed in your backend
- Reepay sandbox account for testing
- Postman or cURL for API testing
- Node.js v18+

## Unit Testing

The plugin includes unit tests for core functionality.

### Running Tests

```bash
# From plugin root directory
npm run test

# Run with coverage
npm run test:coverage

# Run specific test file
npm run test -- src/providers/frisbii/service.spec.ts

# Watch mode (re-run on file changes)
npm run test -- --watch
```

### Test Structure

```
src/
├── providers/frisbii/
│   ├── service.ts
│   └── __tests__/
│       ├── service.spec.ts
│       └── clients.spec.ts
├── modules/frisbii-data/
│   └── __tests__/
│       ├── service.spec.ts
│       └── loaders.spec.ts
└── api/
    └── admin/
        └── __tests__/
            └── routes.spec.ts
```

### Example Test

```typescript
// src/providers/frisbii/__tests__/service.spec.ts
import { FrisbiiPaymentService } from "../service";

describe("FrisbiiPaymentService", () => {
  let service: FrisbiiPaymentService;

  beforeEach(() => {
    service = new FrisbiiPaymentService({}, {});
  });

  describe("initiatePayment", () => {
    it("should create a Reepay session", async () => {
      const result = await service.initiatePayment({
        amount: 10000,
        currency: "USD",
        cartId: "cart_123",
      });

      expect(result).toHaveProperty("sessionId");
      expect(result).toHaveProperty("redirectUrl");
    });

    it("should throw error if Reepay API fails", async () => {
      // Mock API failure
      jest.spyOn(service.apiClient, "post").mockRejectedValue(
        new Error("API error")
      );

      await expect(
        service.initiatePayment({
          amount: 10000,
          currency: "USD",
          cartId: "cart_123",
        })
      ).rejects.toThrow();
    });
  });

  describe("authorizePayment", () => {
    it("should authorize payment with valid session", async () => {
      const result = await service.authorizePayment({
        sessionId: "session_123",
      });

      expect(result.status).toBe("authorized");
    });
  });
});
```

## Integration Testing

Test plugin integration with Medusa backend.

### Local Testing with npm link

```bash
# Step 1: Link the plugin locally
cd medusa-plugin-frisbii-pay
npm link

# Step 2: Link plugin in your backend
cd ../medusa-backend
npm link @montaekung/medusa-plugin-frisbii-pay

# Step 3: Update backend medusa-config.js
# (plugin is now using local source)

# Step 4: Rebuild backend
npm run build

# Step 5: Start backend
npm run dev

# Test the integration
curl http://localhost:9000/admin/frisbii/config
```

### API Testing with Postman

#### 1. Authentication

Get admin token:
```bash
POST http://localhost:9000/admin/auth/user/emailpass
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "password"
}
```

Copy the `access_token` from response.

#### 2. Test Configuration Endpoint

```bash
POST http://localhost:9000/admin/frisbii/config
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "apiKey": "rp_test_xxx",
  "apiSecret": "secret_test_xxx",
  "webhookSecret": "webhook_secret",
  "enabled": true,
  "testMode": true
}
```

Expected response (200 OK):
```json
{
  "id": "frisbii-config-1",
  "apiKey": "rp_test_xxx",
  "enabled": true,
  "testMode": true
}
```

#### 3. Test Connection Verification

```bash
POST http://localhost:9000/admin/frisbii/verify-connection
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "apiKey": "rp_test_xxx",
  "apiSecret": "secret_test_xxx"
}
```

Expected response (200 OK):
```json
{
  "connected": true,
  "message": "Successfully connected to Reepay API"
}
```

#### 4. Test Store Config (Public)

```bash
GET http://localhost:8000/store/frisbii/config
```

Expected response (200 OK):
```json
{
  "enabled": true,
  "processingCurrency": "USD",
  "supportedCurrencies": ["USD", "EUR"]
}
```

## End-to-End Payment Testing

Complete payment flow testing.

### Test Scenario 1: Simple Payment

1. **Create Cart**
   ```bash
   POST /store/carts
   Content-Type: application/json
   
   {
     "region_id": "region_123",
     "items": [
       {
         "variant_id": "variant_456",
         "quantity": 1
       }
     ]
   }
   ```

2. **Add Shipping**
   ```bash
   POST /store/carts/{cart_id}/shipping-methods
   Content-Type: application/json
   
   {
     "option_id": "option_789"
   }
   ```

3. **Create Payment Session**
   ```bash
   POST /store/carts/{cart_id}/payment-sessions
   Content-Type: application/json
   
   {
     "provider_id": "frisbii-payment"
   }
   ```

4. **Redirect to Reepay**
   - Get redirect URL from response
   - Open URL in browser (Reepay checkout)
   - Complete payment in Reepay UI

5. **Complete Cart**
   ```bash
   POST /store/carts/{cart_id}/complete
   ```

6. **Verify Payment**
   ```bash
   GET /admin/frisbii/payment-status/{order_id}
   Authorization: Bearer <admin_token>
   ```

### Test Scenario 2: Failed Payment

1. Follow steps 1-3 from Scenario 1
2. In Reepay checkout, use test card: `4111 1111 1111 1111` (fails)
3. Payment should fail and return to checkout
4. Verify in database: `SELECT * FROM frisbii_payment_status WHERE order_id = ?`
5. Status should be "failed"

### Test Scenario 3: Webhook Processing

1. Set up webhook receiver:
   ```bash
   # Expose local server to internet (using ngrok)
   ngrok http 9000
   
   # Update Reepay webhook URL to:
   https://your-ngrok-url/webhooks/frisbii
   ```

2. Complete a payment (Scenario 1)
3. Reepay sends webhook to your local server
4. Check logs for webhook processing
5. Verify database status updated

## Database Testing

Verify data is correctly stored and retrieved.

```sql
-- Check configuration
SELECT * FROM frisbii_config;

-- Check payment sessions
SELECT id, status, amount, currency, expires_at 
FROM frisbii_session 
WHERE created_at > NOW() - INTERVAL 1 HOUR;

-- Check payment status
SELECT order_id, status, amount, last_update 
FROM frisbii_payment_status 
WHERE order_id = 'order_123';

-- Check customer mapping
SELECT medusa_customer_id, reepay_customer_id 
FROM frisbii_customer 
WHERE medusa_customer_id = 'cust_456';

-- Check for expired sessions
SELECT id, status FROM frisbii_session 
WHERE expires_at < NOW() AND status = 'pending';
```

## Performance Testing

### Load Testing Gateway

Test API performance under load:

```bash
# Using Apache Bench
ab -n 1000 -c 10 http://localhost:9000/admin/frisbii/config

# Using wrk
wrk -t4 -c100 -d30s http://localhost:9000/admin/frisbii/config
```

### Expected Performance

| Endpoint | Request/s | Response Time |
|----------|-----------|---------------|
| GET /config | 100+ | <100ms |
| POST /config | 50+ | <200ms |
| POST /verify | 20+ | <500ms (API call) |
| POST /webhooks | 200+ | <50ms |

## Error Scenario Testing

### Scenario 1: Invalid Credentials

```bash
POST http://localhost:9000/admin/frisbii/verify-connection
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "apiKey": "invalid_key",
  "apiSecret": "invalid_secret"
}
```

Expected response (400 Bad Request):
```json
{
  "statusCode": 400,
  "message": "Connection failed",
  "error": "Invalid API credentials"
}
```

### Scenario 2: Webhook Signature Verification

Simulate invalid webhook:

```bash
POST http://localhost:9000/webhooks/frisbii
X-Signature: invalid_signature
Content-Type: application/json

{
  "event": "payment_authorized",
  "id": "evt_12345",
  "data": { ... }
}
```

Expected response (403 Forbidden):
```json
{
  "statusCode": 403,
  "message": "Invalid webhook signature"
}
```

### Scenario 3: Network Timeout

Simulate slow API:

```bash
# In development, configure timeout
export FRISBII_API_TIMEOUT=1000  # 1 second

# Then make request that takes longer
# Plugin should timeout and return error
```

Expected response (503 Service Unavailable):
```json
{
  "statusCode": 503,
  "message": "Payment service temporarily unavailable",
  "error": "Request timeout"
}
```

## Sandbox vs Production Testing

### Sandbox (Testing)

**Use Reepay Sandbox/Test Mode:**

```bash
# .env for sandbox testing
FRISBII_API_KEY_TEST=priv_test_xxxxxxxxxxxxxxxx
FRISBII_API_KEY_LIVE=priv_xxxxxxxxxxxxxxxx
FRISBII_API_MODE=test
```

**Test Cards** (Reepay Sandbox):
- Valid card: `4111 1111 1111 1111` - Success
- Declined card: `5555 5555 5555 4444` - Failure
- 3D Secure: `4000 0027 2000 3010` - Requires auth

### Production (Live)

**Use Reepay Production Mode:**

```bash
# .env for production
FRISBII_API_KEY_TEST=priv_test_xxxxxxxxxxxxxxxx
FRISBII_API_KEY_LIVE=priv_xxxxxxxxxxxxxxxx
FRISBII_API_MODE=live
```

⚠️ **Warning**: Test thoroughly in sandbox before going live.

## Debugging

### Enable Debug Logging

```javascript
// In medusa-config.js, add debug option to provider
modules: [
  {
    resolve: "@medusajs/medusa/payment",
    options: {
      providers: [
        {
          resolve: "@montaekung/medusa-plugin-frisbii-pay/providers/frisbii",
          id: "frisbii-payment",
          options: {
            apiKeyTest: process.env.FRISBII_API_KEY_TEST,
            apiKeyLive: process.env.FRISBII_API_KEY_LIVE,
            apiMode: process.env.FRISBII_API_MODE || "test",
          },
        },
      ],
    },
  },
];
```

### View Logs

```bash
# Plugin logs appear in console
npm run dev 2>&1 | grep -i frisbii

# Or search logs in file
tail -f logs/medusa.log | grep frisbii
```

### Common Log Messages

```
[frisbii-payment] Creating session...
[frisbii-payment] API call: POST /sessions
[frisbii-payment] Session created: session_123
[frisbii-payment] Storing session in database...
[frisbii-payment] Session stored successfully
[frisbii-payment] Webhook received: payment_authorized
[frisbii-payment] Processing webhook...
```

### Debugging Tools

1. **Browser DevTools**: Inspect network calls to checkout
2. **Postman**: Test API endpoints with detailed request/response
3. **Database Tool**: Query frisbii_* tables directly
4. **Network Throttling**: Simulate slow connections in DevTools

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: password
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: 18
      - run: npm install
      - run: npm run test
      - run: npm run build
```

## Testing Checklist

Before publishing, verify:

- [ ] Unit tests pass: `npm run test`
- [ ] Build successful: `npm run build`
- [ ] No TypeScript errors: `npx tsc --noEmit`
- [ ] Admin endpoints work
- [ ] Store endpoints work
- [ ] Webhooks process correctly
- [ ] Payment flow completes end-to-end
- [ ] Database tables created with migrations
- [ ] Error handling works (invalid credentials, timeouts, etc.)
- [ ] Sandbox testing successful
- [ ] Frontend integration works
- [ ] Performance acceptable (<500ms per request)
- [ ] Documentation accurate

## Next Steps

- [Architecture Guide](./ARCHITECTURE.md) - Understand how plugin works
- [API Reference](./API_REFERENCE.md) - Complete endpoint documentation
- [Troubleshooting Guide](./TROUBLESHOOTING.md) - Fix common issues
