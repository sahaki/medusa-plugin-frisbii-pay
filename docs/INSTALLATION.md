# Installation Guide

## Overview

The **@montaekung/medusa-plugin-frisbii-pay** plugin integrates Reepay payment processing with your Medusa e-commerce backend. This guide walks you through installation and initial setup.

## Prerequisites

- Medusa backend v2.13.0 or higher
- Node.js v18 or higher
- npm or yarn package manager
- A Reepay account with API credentials
- An existing Medusa store configured and running

## Installation Steps

### 1. Install the Package

```bash
npm install @montaekung/medusa-plugin-frisbii-pay
```

Or using yarn:

```bash
yarn add @montaekung/medusa-plugin-frisbii-pay
```

### 2. Register the Plugin in Your Medusa Config

Add the plugin to your `medusa-config.js`:

```javascript
// Register plugin for data module, API routes, and workflows
plugins = [
  // ... other plugins
  {
    resolve: "@montaekung/medusa-plugin-frisbii-pay",
    options: {},  // Plugin-level options (if needed)
  },
],
// Register payment provider
modules = [
  // ... other modules
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
]
```

### 3. Set Environment Variables

Create or update your `.env` file with the following variables:

```bash
# Reepay API Keys
FRISBII_API_KEY_TEST=priv_test_xxxxxxxxxxxxxxxx
FRISBII_API_KEY_LIVE=priv_xxxxxxxxxxxxxxxx

# API Mode (test or live)
FRISBII_API_MODE=test
```

### 4. Run Database Migrations

The plugin includes database migrations for required tables. Run migrations with:

```bash
npm run build
npx medusa migrations run
```

This creates the following tables:
- `frisbii_config` - Plugin configuration
- `frisbii_session` - Payment session tracking
- `frisbii_customer` - Customer-to-Reepay ID mapping
- `frisbii_payment_status` - Payment transaction history

### 5. Build Your Backend

```bash
npm run build
```

Verify the build completes successfully. You should see:
```
Plugin build completed successfully
```

### 6. Start Your Backend

```bash
npm run dev
```

The backend will start and load the Frisbii payment plugin. You can verify it loaded by checking logs:

```bash
# Watch for messages like:
# [frisbii-payment] Loading Frisbii Payment Plugin
# [frisbii-data] Initializing Frisbii Data Module
```

## Verification

To verify the plugin is installed and working:

1. **Check API endpoints** - The following endpoints should now be available:
   - Admin: `POST /admin/frisbii/config`
   - Admin: `POST /admin/frisbii/verify-connection`
   - Store: `GET /store/frisbii/config`

2. **Test the API** using cURL or Postman:
   ```bash
   curl -X POST http://localhost:9000/admin/frisbii/config \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "apiKey": "test_key",
       "apiSecret": "test_secret"
     }'
   ```

3. **Check database** - Verify tables were created:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_name LIKE 'frisbii_%';
   ```

## Troubleshooting Installation

### Plugin not loading
- Verify plugin name is exactly `@montaekung/medusa-plugin-frisbii-pay`
- Check that `npm install` completed successfully
- Ensure `medusa-config.js` has correct plugin registration
- Check backend logs for errors

### Database migration errors
- Ensure database connection is properly configured
- Verify you have permission to create tables
- Check that no conflicting tables exist
- Try running migrations with: `npx medusa migrations run --verbose`

### Module not found errors
- Clear node_modules: `rm -rf node_modules && npm install`
- Rebuild: `npm run build`
- Check TypeScript compilation: `npx tsc --noEmit`

### API endpoints not available
- Verify backend is running: `curl http://localhost:9000/health`
- Check that plugin loaded: Look at startup logs
- Verify routes registered: See logs for API route messages

For more help, see [Troubleshooting Guide](./TROUBLESHOOTING.md).

## Next Steps

1. **Configure Payment Settings** - See [Configuration Guide](./CONFIGURATION.md)
2. **Integrate with Frontend** - Add payment forms to your storefront
3. **Set Up Webhooks** - Configure Reepay webhooks to send events to your backend
4. **Test Payment Flow** - Follow [Testing Guide](./TESTING.md)

## Support

For issues or questions:
- Check [Troubleshooting Guide](./TROUBLESHOOTING.md)
- Review [Architecture Guide](./ARCHITECTURE.md) for how things work
- Submit issues on GitHub: [plugin repository](https://github.com/sahaki/medusa-plugin-frisbii-pay)
