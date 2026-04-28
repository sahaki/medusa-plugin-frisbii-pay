# @montaekung/medusa-plugin-frisbii-pay

Frisbii/Reepay payment provider for Medusa v2.

## 🚀 Features

- ✅ Payment session creation
- ✅ Authorization & capture
- ✅ Refunds
- ✅ Webhook handling
- ✅ Auto-cancel expired payments
- ✅ Admin configuration UI
- ✅ Saved payment methods
- ✅ Order payment status widget
- ✅ Multi-language Admin UI (locale follows saved config, not browser language)
- ✅ Danish (`da_DK`) and English (`en_GB`) translations — more coming soon
- ✅ **Send Order Lines** — forward itemised product + shipping lines to Reepay invoice (configurable per-store)

## 📦 Installation

```bash
npm install @montaekung/medusa-plugin-frisbii-pay
```

## ⚙️ Configuration

Add the plugin to your `medusa-config.js`:

```javascript
// medusa-config.js

// 1. Register plugin for data module and API routes
plugins: [
  {
    resolve: '@montaekung/medusa-plugin-frisbii-pay',
    options: {},
  },
],
  
// 2. Register payment provider
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
],
```

> **Why separate registration?**
> - **Plugin** (`plugins` array): Registers data module, API routes, workflows
> - **Provider** (`modules` array): Registers payment provider for checkout
> - This follows Medusa v2 best practices (similar to Stripe, PayPal, Adyen plugins)

## 🔐 Environment Variables

Create a `.env` file:

```bash
# Reepay API Keys
FRISBII_API_KEY_TEST=priv_test_xxxxxxxxxxxxxxxx
FRISBII_API_KEY_LIVE=priv_xxxxxxxxxxxxxxxx

# API Mode (test or live)
FRISBII_API_MODE=test
```

## 📖 Documentation

- **[Configuration Example](./docs/MEDUSA_CONFIG_EXAMPLE.md)** ⭐ - Complete config guide
- [Installation Guide](./docs/INSTALLATION.md) - Setup instructions
- [Configuration Reference](./docs/CONFIGURATION.md) - All options
- [API Documentation](./docs/API_REFERENCE.md) - Endpoints & types
- [Testing Guide](./docs/TESTING.md) - Unit & integration tests
- [NPM Link Testing](./docs/NPM_LINK_TESTING.md) - Local development
- [Troubleshooting](./docs/TROUBLESHOOTING.md) - Common issues

## 🗒️ Admin Settings Reference

All settings are managed in **Admin → Settings → Frisbii Pay**. They are stored in the `frisbii_config` database table and cached for 30 seconds.

| Setting | Section | Default | Description |
|---------|---------|---------|-------------|
| API Key (Test) | API & Connection | — | Reepay test private key (`priv_test_…`) |
| API Key (Live) | API & Connection | — | Reepay live private key (`priv_…`) |
| API Mode | API & Connection | `test` | `test` or `live` |
| Enabled | Payment Display | `true` | Show Frisbii Pay at checkout |
| Title | Payment Display | `Frisbii Payment` | Label shown on checkout payment selector |
| Display Type | Payment Display | `overlay` | `overlay` / `embedded` / `redirect` |
| Locale | Payment Display | `en_GB` | Language for Admin UI and Reepay checkout window |
| **Send Order Lines** | **Payment Processing** | **`true`** | **When `true`, sends itemised product + shipping lines to Reepay. When `false`, sends total amount only.** |
| Send Phone Number | Payment Processing | `false` | Include customer phone in Reepay customer record |
| Auto Capture | Payment Processing | `false` | Automatically settle immediately after authorisation |
| Save Card Enabled | Saved Cards | `false` | Allow customers to save cards for future purchases |

## 🌐 Admin UI Language

The Admin Settings page and Invoice widget display in the language configured in **Frisbii Settings → Locale**. No need to change your browser language.

| Locale setting | Admin UI language |
|----------------|-------------------|
| `en_GB` | English |
| `da_DK` | Dansk (Danish) |

More languages coming soon. See [Configuration Guide](./docs/CONFIGURATION.md#locale-and-admin-ui-language) for details.

## �🏗️ Architecture

See [Architecture Guide](./docs/ARCHITECTURE.md) for detailed information about:
- System components
- Data models
- Payment flow
- Workflows & events

## 🛠️ Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run watch
```

## 🧪 Testing

```bash
# Link locally
npm link

# In your Medusa project
npm link @montaekung/medusa-plugin-frisbii-pay
```

## 📝 License

MIT

## 🤝 Support

- GitHub Issues: https://github.com/sahaki/medusa-plugin-frisbii-pay/issues
- Documentation: https://github.com/sahaki/medusa-plugin-frisbii-pay#readme

## 🙏 Credits

Built with [Medusa](https://medusajs.com) - The Open Source Shopify Alternative
