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
    "processingCurrency": "USD",
    "sendOrderLines": true
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

## Payment Processing Settings

### Send Order Lines

**Admin path**: Settings → Frisbii Pay → Payment Processing → Send Order Lines

| Value | Behaviour |
|-------|-----------|
| `true` (default) | Builds an `order_lines` array from Medusa's cart/order tables and sends it to Reepay. The Reepay invoice shows each product, the shipping method, and any discount adjustments as individual line items. |
| `false` | Sends only the total `amount` (in minor units). The Reepay invoice shows a single total with no line-item breakdown. |

When enabled, line data is fetched directly from Medusa's database (`cart_line_item`, `cart_shipping_method`, `order_item`, `order_shipping_method`, and related tax/adjustment tables) via `__pg_connection__`. No storefront changes are needed. If the DB query fails for any reason the provider falls back to amount-only automatically so checkout is never blocked.

The setting applies to **both**:
- `initiatePayment()` — when the Reepay checkout session is created
- `capturePayment()` / `settlePayment()` — when the payment is captured/settled

### Send Phone Number

When `true`, the customer's phone number is included in the Reepay customer record. Default: `false`.

### Auto Capture

When `true`, the payment is automatically captured/settled immediately after authorisation. Default: `false`.



## Locale and Admin UI Language

The `locale` field in the Frisbii config controls two things:

1. **Frontend checkout language** — passed to the Reepay checkout session so the payment window appears in the chosen language.
2. **Admin UI language** — the Settings page and the Invoice widget on the order detail page automatically switch to the saved locale without requiring the admin user to change their browser language.

### Supported Locales

| Value | Language | Admin UI | Checkout |
|-------|----------|----------|----------|
| `en_GB` | English | ✅ | ✅ |
| `da_DK` | Dansk (Danish) | ✅ | ✅ |
| `sv_SE` | Svenska (Swedish) | coming soon | ✅ |
| `nb_NO` | Norsk (Norwegian) | coming soon | ✅ |
| `de_DE` | Deutsch (German) | coming soon | ✅ |
| `fr_FR` | Français (French) | coming soon | ✅ |
| `es_ES` | Español (Spanish) | coming soon | ✅ |
| `nl_NL` | Nederlands (Dutch) | coming soon | ✅ |
| `pl_PL` | Polski (Polish) | coming soon | ✅ |

### How config-driven locale works

- The `useAdminTranslation(overrideLocale?)` hook in `src/admin/locale/index.ts` accepts an optional locale string.
- The Settings page loads config from `/admin/frisbii/config` on mount and passes `config.locale` to the hook.
- The Invoice widget does the same via a separate one-time fetch.
- When `overrideLocale` is provided, it takes priority over `navigator.language`. The browser language is only used as a fallback when the config has not been loaded yet or when no override is supplied.

```tsx
// In both Settings page and Invoice widget:
const { t } = useAdminTranslation(config?.locale)  // "da_DK" → Danish UI
```

### Changing the Admin language

1. Go to **Admin → Settings → Frisbii Pay**
2. Under **Payment Display**, open the **Locale** dropdown
3. Select the desired language
4. Click **Save Configuration**
5. The page immediately re-renders in the selected language — no browser setting change or page reload required

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

## Auto-Cancel Unpaid Orders

**Admin path**: Settings → Frisbii Pay → Auto-Cancel Unpaid Orders

| Setting | Default | Description |
|---------|---------|-------------|
| Enable Auto-Cancel | `false` | Automatically cancel orders that remain unpaid after the timeout |
| Timeout (minutes) | `30` | How long to wait before cancelling |

When enabled, a scheduled job (`frisbii-auto-cancel`) runs every minute and cancels any Frisbii payment sessions older than the configured timeout.

---

## Debug Mode

**Admin path**: Settings → Frisbii Pay → Debug Mode

| Setting | Default | Description |
|---------|---------|-------------|
| Enable Debug Logging | `false` | Write detailed API request/response logs to disk |

### What gets logged

| Source | File | Controlled by Debug Mode? |
|--------|------|---------------------------|
| API requests & responses | `frisbii-api-YYYY-MM-DD.log` | **Yes** — only when enabled |
| Payment session creation | `frisbii-checkout-YYYY-MM-DD.log` | No — always written |
| Capture / refund / cancel | `frisbii-capture-YYYY-MM-DD.log` | No — always written |
| Webhook events | `frisbii-webhook-YYYY-MM-DD.log` | No — always written |
| Order status changes | `frisbii-order-status-YYYY-MM-DD.log` | No — always written |

### Log file location

Default: `{medusa_project_root}/var/log/frisbii/`  
Override: set the `FRISBII_LOG_DIR` environment variable.

### Security

- Sensitive fields are automatically redacted before writing: `api_key`, `api_key_test`, `api_key_live`, `webhook_secret`, `card_number`, `cvv`, `cvc`, `authorization`.
- Log files are never served directly; they are read server-side and returned through the authenticated Admin API only.

### Viewing logs in the Admin UI

1. Enable Debug Mode in **Settings → Frisbii Pay → Debug Mode**
2. Navigate to **Settings → Frisbii Pay Log** in the sidebar
3. The dashboard lists all log files with source, date, and file size
4. Click **View** on any row to open the paginated line viewer

> **Note**: Changes to `debug_enabled` take effect within 30 seconds (provider config cache TTL). If you need logs immediately, wait 30 seconds after saving.

---

## Advanced Configuration

The plugin does not require any options in `medusa-config.js`. The following options are accepted as a fallback when no DB config has been saved yet:

```javascript
{
  resolve: "@montaekung/medusa-plugin-frisbii-pay/providers/frisbii",
  id: "frisbii-payment",
  options: {
    apiKeyTest: process.env.FRISBII_API_KEY_TEST, // fallback only
    apiKeyLive: process.env.FRISBII_API_KEY_LIVE, // fallback only
    apiMode: process.env.FRISBII_API_MODE || "test",
  },
}
```

All other settings (debug mode, send order lines, locale, etc.) are managed through the Admin UI and stored in the `frisbii_config` database table.

The plugin handles currency amounts correctly, including zero-decimal currencies:

```typescript
// These currencies treat amounts as integers (no decimals)
const zeroDecimalCurrencies = ['JPY', 'KRW', 'CLP', 'PYG', 'UGX', 'VND'];

// Examples:
// 100.00 USD   → 10000 cents
// ¥10,000 JPY  → 10000 (no conversion)
```

### Session Timeout

Sessions are automatically cleaned up by the auto-cancel job (see **Auto-Cancel Unpaid Orders** above).

### Advanced Configuration

The plugin does not require any options in `medusa-config.js`. The following options are accepted as a fallback when no DB config has been saved yet:

```javascript
{
  resolve: "@montaekung/medusa-plugin-frisbii-pay/providers/frisbii",
  id: "frisbii-payment",
  options: {
    apiKeyTest: process.env.FRISBII_API_KEY_TEST, // fallback only
    apiKeyLive: process.env.FRISBII_API_KEY_LIVE, // fallback only
    apiMode: process.env.FRISBII_API_MODE || "test",
  },
}
```

All other settings (debug mode, send order lines, locale, etc.) are managed through the Admin UI and stored in the `frisbii_config` database table.

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

# (Optional) Custom directory for debug log files
# Default: {project_root}/var/log/frisbii
# FRISBII_LOG_DIR=/var/log/frisbii

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
