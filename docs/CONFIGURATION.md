# Configuration Guide

## Overview

The Frisbii Payment Plugin is highly configurable. This guide covers all available configuration options, environment variables, and how to set them up for your Medusa backend.

## Understanding Plugin vs Provider

In **Medusa v2**, payment integrations use a two-part registration:

1. **Plugin** (`plugins` array): Registers data module, API routes, workflows, jobs
2. **Provider** (`modules` array): Registers payment provider for actual payment processing

This separation follows Medusa v2 best practices and is identical to official plugins like Stripe, PayPal, and Adyen.

> **📘 For detailed explanation and examples**, see [MEDUSA_CONFIG_EXAMPLE.md](./MEDUSA_CONFIG_EXAMPLE.md)

## medusa-config.js Plugin Options

### Basic Configuration

```javascript
// In medusa-config.js

// 1. Register plugin (for data module, API routes, workflows)
const plugins = [
  {
    resolve: "@montaekung/medusa-plugin-frisbii-pay",
    options: {},
  },
];

// 2. Register payment provider in modules
const modules = [
  {
    resolve: "@medusajs/medusa/payment",
    options: {
      providers: [
        {
          resolve: "@montaekung/medusa-plugin-frisbii-pay/providers/frisbii",
          id: "frisbii-payment",
          options: {
            // Reepay API keys
            apiKeyTest: process.env.FRISBII_API_KEY_TEST,
            apiKeyLive: process.env.FRISBII_API_KEY_LIVE,
            
            // API mode (test or live)
            apiMode: process.env.FRISBII_API_MODE || "test",
          },
        },
      ],
    },
  },
];

module.exports = {
  projectConfig: { plugins },
  modules,
};
```

## Environment Variables

Create a `.env` file in your Medusa backend root with these variables:

### Required Variables

```bash
# Reepay API Keys
# Get these from your Reepay dashboard
FRISBII_API_KEY_TEST=priv_test_xxxxxxxxxxxxxxxx
FRISBII_API_KEY_LIVE=priv_xxxxxxxxxxxxxxxx

# API Mode
# "test" for sandbox/testing
# "live" for production
FRISBII_API_MODE=test
```

## Database Configuration

The plugin uses Medusa's default database connection. Ensure your `medusa-config.js` has proper database configuration:

```javascript
const projectConfig = {
  projectName: "my-medusa-store",
  
  // Database connection (plugin uses this)
  database_url: process.env.DATABASE_URL || "postgres://user:password@localhost/medusa",
  
  // Redis configuration (for workers/events)
  redis_url: process.env.REDIS_URL || "redis://localhost:6379",
};
```

## Payment Provider Configuration

### Provider Registration

The plugin automatically registers a payment provider named "frisbii-payment". This can be used in Medusa's payment flow:

```typescript
// In your workflows or services
const paymentCollection = await paymentCollectionService.create({
  region_id: "region_123",
  currency_code: "USD",
  amount: 10000, // 100.00 USD
});

// Create payment session for this collection
await paymentCollectionService.createPaymentSession(paymentCollection.id, {
  provider_id: "frisbii-payment",
  amount: 10000,
});
```

### Provider Options

When creating a payment session, you can pass provider-specific options:

```typescript
const paymentSession = {
  provider_id: "frisbii-payment",
  amount: amount_in_cents,
  
  // Optional: Provider-specific data
  data: {
    // Customer email (for invoice)
    customer_email: "customer@example.com",
    
    // Order/Session description
    description: "Order #12345",
    
    // Metadata for tracking
    metadata: {
      order_id: "order_123",
      customer_id: "cust_456",
    },
  },
};
```

## Admin Configuration API

Once the plugin is installed, you can configure Frisbii settings through the Admin API:

### Save Configuration

```bash
curl -X POST http://localhost:9000/admin/frisbii/config \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "your_api_key",
    "apiSecret": "your_api_secret",
    "webhookSecret": "your_webhook_secret",
    "enabled": true,
    "testMode": false,
    "processingCurrency": "USD"
  }'
```

### Retrieve Configuration

```bash
curl -X GET http://localhost:9000/admin/frisbii/config \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Verify Connection

Test if your API credentials are valid:

```bash
curl -X POST http://localhost:9000/admin/frisbii/verify-connection \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "your_api_key",
    "apiSecret": "your_api_secret"
  }'

# Response:
# { 
#   "connected": true, 
#   "message": "Successfully connected to Reepay API" 
# }
```

## Webhook Configuration

### Setting Up Webhooks

1. Go to your Reepay Dashboard → Webhooks
2. Create a new webhook with URL: `https://your-backend.com/webhooks/frisbii`
3. Select events:
   - `payment_authorized`
   - `payment_captured`
   - `payment_failed`
   - `refund_created`
4. Copy the **Signature Secret** to your `.env` as `FRISBII_WEBHOOK_SECRET`

### Webhook Events Processed

The plugin handles these Reepay webhook events:

| Event | Handler | Purpose |
|-------|---------|---------|
| `payment_authorized` | `onPaymentAuthorized` | Update order payment status |
| `payment_captured` | `onPaymentCaptured` | Mark payment as captured |
| `payment_failed` | `onPaymentFailed` | Update failure status |
| `refund_created` | `onRefundCreated` | Track refund |

## Advanced Configuration

### Custom Currency Support

The plugin handles currency amounts correctly, including zero-decimal currencies:

```typescript
// These currencies treat amounts as integers (no decimals)
const zeroDecimalCurrencies = ['JPY', 'KRW', 'CLP', 'PYG', 'UGX', 'VND'];

// Examples:
// 100.00 USD   → 10000 cents
// ¥10,000 JPY  → 10000 (no conversion)
```

### Session Timeout

Sessions are automatically cleaned up after the timeout period:

```bash
# Default: 1800 seconds (30 minutes)
# Adjust in configuration or environment:
FRISBII_SESSION_TIMEOUT=3600  # 1 hour
FRISBII_SESSION_TIMEOUT=900   # 15 minutes
```

### Logging Configuration

Enable debug logging to see detailed plugin operations:

```javascript
// In medusa-config.js
{
  resolve: "@montaekung/medusa-plugin-frisbii-pay",
  options: {
    debug: true,  // Logs all API calls and responses
    // ... other options
  },
}
```

Log output will show:
- API request/response details
- Payment session creation
- Webhook signature verification
- Database operations

## Configuration Validation

The plugin validates configuration on startup. Common issues:

| Error | Cause | Solution |
|-------|-------|----------|
| `Invalid API Key` | Credentials invalid | Verify in Reepay dashboard |
| `Webhook Secret mismatch` | Wrong or missing secret | Update in webhook settings |
| `Database connection failed` | DB config incorrect | Check database_url |
| `Missing required env vars` | Environment not set | Check `.env` file |

## Example .env File

Here's a complete `.env` example for development:

```bash
# Database
DATABASE_URL=postgres://user:password@localhost:5432/medusa

# Redis
REDIS_URL=redis://localhost:6379

# Frisbii/Reepay Settings (Test Mode)
FRISBII_API_KEY_TEST=priv_test_xxxxxxxxxxxxxxxx
FRISBII_API_KEY_LIVE=priv_xxxxxxxxxxxxxxxx
FRISBII_API_MODE=test

# Admin
MEDUSA_ADMIN_ONBOARDING_TYPE=default
NODE_ENV=development
```

And for production:

```bash
# Database (Production)
DATABASE_URL=postgres://prod_user:password@prod-db.example.com/medusa

# Redis (Production)
REDIS_URL=redis://prod-redis.example.com:6379

# Frisbii/Reepay Settings (Live Mode)
FRISBII_API_KEY_TEST=priv_test_xxxxxxxxxxxxxxxx
FRISBII_API_KEY_LIVE=priv_xxxxxxxxxxxxxxxx
FRISBII_API_MODE=live

# Admin
MEDUSA_ADMIN_ONBOARDING_TYPE=default
NODE_ENV=production
```

## Security Best Practices

1. **Never commit `.env` to git** - Use `.env.example` with dummy values
2. **Use different credentials for sandbox/production** - Keep test separate
3. **Rotate webhook secrets regularly** - Monitor for unauthorized access
4. **Use HTTPS for webhooks** - Reepay signature validation requires secure URLs
5. **Enable debug mode only in development** - Disable in production to avoid logging sensitive data

For questions about configuration, see [Troubleshooting Guide](./TROUBLESHOOTING.md).
