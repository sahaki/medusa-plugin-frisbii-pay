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

## 📦 Installation

```bash
npm install @montaekung/medusa-plugin-frisbii-pay
```

## ⚙️ Configuration

Add the plugin to your `medusa-config.ts`:

```typescript
import { defineConfig } from '@medusajs/framework/utils'

export default defineConfig({
  plugins: [
    {
      resolve: '@montaekung/medusa-plugin-frisbii-pay',
      options: {},
    },
  ],
  modules: [
    {
      resolve: '@medusajs/medusa/payment',
      options: {
        providers: [
          {
            resolve: '@montaekung/medusa-plugin-frisbii-pay/providers/frisbii',
            id: 'frisbii',
            options: {
              apiKeyTest: process.env.FRISBII_API_KEY_TEST,
              apiKeyLive: process.env.FRISBII_API_KEY_LIVE,
              apiMode: process.env.FRISBII_API_MODE || 'test',
            },
          },
        ],
      },
    },
  ],
})
```

## 🔐 Environment Variables

Create a `.env` file:

```bash
FRISBII_API_KEY_TEST=priv_test_xxxxxxxxxxxxxxxx
FRISBII_API_KEY_LIVE=priv_xxxxxxxxxxxxxxxx
FRISBII_API_MODE=test
```

## 📖 Documentation

- [Installation Guide](./docs/installation.md)
- [Configuration Reference](./docs/configuration.md)
- [API Documentation](./docs/api-reference.md)
- [Troubleshooting](./docs/troubleshooting.md)

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
