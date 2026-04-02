# Example: medusa-config.js Configuration

This file shows the correct way to configure the Frisbii Payment Plugin in Medusa v2.

## Complete Configuration Example

```javascript
// medusa-config.js
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

/**
 * STEP 1: Register Plugin
 * 
 * This registers the plugin itself, which includes:
 * - Data module (frisbii-data) for storing config, sessions, customers, payment status
 * - API routes (admin, store, webhooks)
 * - Workflows and event subscribers
 * - Scheduled jobs
 */
const plugins = [
  // ... your other plugins (cart, customer, etc.)
  
  {
    resolve: "@montaekung/medusa-plugin-frisbii-pay",
    options: {
      // No options needed here - all configuration is in provider options
    },
  },
];

/**
 * STEP 2: Register Payment Provider
 * 
 * This registers the payment provider that handles actual payment processing.
 * The provider is separate from the plugin to follow Medusa v2 architecture.
 */
const modules = [
  // ... your other modules
  
  {
    resolve: "@medusajs/medusa/payment",
    options: {
      providers: [
        {
          // Path to payment provider
          resolve: "@montaekung/medusa-plugin-frisbii-pay/providers/frisbii",
          
          // Provider ID used in cart/order
          id: "frisbii-payment",
          
          // Provider-specific options
          options: {
            // Required: Reepay API keys
            apiKeyTest: process.env.FRISBII_API_KEY_TEST,
            apiKeyLive: process.env.FRISBII_API_KEY_LIVE,
            
            // Required: API mode (test or live)
            apiMode: process.env.FRISBII_API_MODE || "test",
          },
        },
      ],
    },
  },
];

/**
 * Export configuration
 */
module.exports = {
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    
    http: {
      storeCors: process.env.STORE_CORS,
      adminCors: process.env.ADMIN_CORS,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
    
    // Include plugins
    plugins,
  },
  
  // Include modules
  modules,
};
```

## Environment Variables (.env)

```bash
#######################
# Database & Redis
#######################
DATABASE_URL=postgres://user:password@localhost:5432/medusa
REDIS_URL=redis://localhost:6379

#######################
# JWT & Cookies
#######################
JWT_SECRET=something
COOKIE_SECRET=something

#######################
# CORS
#######################
STORE_CORS=http://localhost:8000
ADMIN_CORS=http://localhost:7001

#######################
# Frisbii/Reepay Credentials
#######################

# Reepay API Keys
FRISBII_API_KEY_TEST=priv_test_xxxxxxxxxxxxxxxx
FRISBII_API_KEY_LIVE=priv_xxxxxxxxxxxxxxxx

# API Mode (test or live)
FRISBII_API_MODE=test

#######################
# Development
#######################
NODE_ENV=development
```

## Why Separate Plugin and Provider?

In Medusa v2, plugins and payment providers serve different purposes:

| Aspect | Plugin | Payment Provider |
|--------|--------|------------------|
| **Purpose** | Register data models, API routes, workflows | Handle payment processing |
| **Registration** | `projectConfig.plugins` | `modules[payment].providers` |
| **Configuration** | Usually minimal or empty | API keys, secrets, settings |
| **Examples** | Data storage, admin UI, webhooks | Stripe, PayPal, Reepay processing |

### What Gets Registered Where?

**Plugin registration** includes:
- ✅ Data module: `frisbii-data` (database tables)
- ✅ API routes: `/admin/frisbii/*`, `/store/frisbii/*`, `/webhooks/frisbii`
- ✅ Workflows: Payment session creation, status updates
- ✅ Subscribers: Event handlers (order.placed, payment.captured)
- ✅ Jobs: Auto-cancel expired sessions
- ✅ Admin widgets: Order payment details

**Provider registration** includes:
- ✅ Payment methods: `initiatePayment`, `authorizePayment`, `capturePayment`
- ✅ API client: Communication with Reepay
- ✅ Session management: Create/retrieve Reepay sessions
- ✅ Configuration: API credentials and settings

## Comparison with Other Payment Plugins

### ❌ Wrong (Old Pattern)

```javascript
// DON'T do this - old/incorrect pattern
plugins: [
  {
    resolve: "@montaekung/medusa-plugin-frisbii-pay",
    options: {
      apiKeyTest: "...",  // ❌ Don't put payment config here
      apiKeyLive: "...",
      apiMode: "test",
    },
  },
];
```

### ✅ Correct (Medusa v2 Pattern)

```javascript
// DO this - follows Medusa v2 best practices
plugins: [
  {
    resolve: "@montaekung/medusa-plugin-frisbii-pay",
    options: {},  // ✅ Empty or minimal config
  },
];

modules: [
  {
    resolve: "@medusajs/medusa/payment",
    options: {
      providers: [
        {
          resolve: "@montaekung/medusa-plugin-frisbii-pay/providers/frisbii",
          id: "frisbii-payment",
          options: {
            apiKeyTest: "...",  // ✅ Payment config goes here
            apiKeyLive: "...",
            apiMode: "test",
          },
        },
      ],
    },
  },
];
```

### Similar to Official Plugins

This pattern is identical to official Medusa payment plugins:

**Stripe:**
```javascript
plugins: [{ resolve: "@medusajs/stripe", options: {} }],
modules: [{
  resolve: "@medusajs/medusa/payment",
  options: {
    providers: [{
      resolve: "@medusajs/stripe/providers/stripe",
      id: "stripe",
      options: { apiKey: "..." }
    }]
  }
}],
```

**PayPal:**
```javascript
plugins: [{ resolve: "@medusajs/paypal", options: {} }],
modules: [{
  resolve: "@medusajs/medusa/payment",
  options: {
    providers: [{
      resolve: "@medusajs/paypal/providers/paypal",
      id: "paypal",
      options: { clientId: "..." }
    }]
  }
}],
```

**Frisbii (our plugin):**
```javascript
plugins: [{ resolve: "@montaekung/medusa-plugin-frisbii-pay", options: {} }],
modules: [{
  resolve: "@medusajs/medusa/payment",
  options: {
    providers: [{
      resolve: "@montaekung/medusa-plugin-frisbii-pay/providers/frisbii",
      id: "frisbii-payment",
      options: {
        apiKeyTest: process.env.FRISBII_API_KEY_TEST,
        apiKeyLive: process.env.FRISBII_API_KEY_LIVE,
        apiMode: process.env.FRISBII_API_MODE || "test"
      }
    }]
  }
}],
```

## Migration from Old Configuration

If you previously used the old pattern, update your config:

```javascript
// Before (incorrect)
plugins: [
  {
    resolve: "@montaekung/medusa-plugin-frisbii-pay",
    options: {
      apiKeyTest: process.env.FRISBII_API_KEY_TEST,
      apiKeyLive: process.env.FRISBII_API_KEY_LIVE,
      apiMode: process.env.FRISBII_API_MODE,
    },
  },
];

// After (correct)
plugins: [
  {
    resolve: "@montaekung/medusa-plugin-frisbii-pay",
    options: {},
  },
];

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

## Verification

After updating your configuration:

1. **Rebuild**: `npm run build`
2. **Start backend**: `npm run dev`
3. **Check logs**: Look for "Loading plugin: @montaekung/medusa-plugin-frisbii-pay"
4. **Test API**: `curl http://localhost:9000/admin/frisbii/config`

## Need Help?

- [Installation Guide](./docs/INSTALLATION.md) - Full setup instructions
- [Configuration Guide](./docs/CONFIGURATION.md) - All configuration options
- [Troubleshooting](./docs/TROUBLESHOOTING.md) - Common issues
- [NPM Link Testing](./docs/NPM_LINK_TESTING.md) - Local development

---

**Questions?** Open an issue on [GitHub](https://github.com/sahaki/medusa-plugin-frisbii-pay/issues)
