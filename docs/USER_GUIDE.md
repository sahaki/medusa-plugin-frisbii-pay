# User Guide: Frisbii Payment for Store Owners

## Welcome!

This guide helps you accept payments through Reepay using the Frisbii Payment Plugin. Whether you're new to online payments or experienced, this guide will walk you through everything.

## What is Frisbii Payment?

Frisbii Payment is a payment processor that allows your customers to pay with:
- 💳 **Credit/Debit Cards** (Visa, Mastercard, American Express)
- 🏦 **Bank Transfers** (Direct bank deposits)
- 📱 **Wallets** (Supported by Reepay)
- 🌐 **Local Payment Methods** (Region-specific options)

Your customers complete payment securely on Reepay's platform, and funds are transferred to your account.

## Getting Started

### Prerequisites

You need:
1. **A Medusa store** - Your online store is already set up
2. **A Reepay account** - Sign up at [reepay.com](https://reepay.com)
3. **Reepay API credentials** - From your Reepay dashboard
4. **Admin access** - To configure payment settings

### Step 1: Create a Reepay Account

1. Go to [reepay.com](https://reepay.com)
2. Click "Get Started" or "Sign Up"
3. Fill in your business information
4. Verify your email and phone
5. Your account is ready!

### Step 2: Get Your API Credentials

1. Log in to [Reepay Dashboard](https://dashboard.reepay.com)
2. Go to **Settings → API & Keys**
3. Copy your:
   - **API Key** (starts with `rp_test_` or `rp_live_`)
   - **API Secret** (keep this private!)
4. Keep these credentials safe - never share them!

### Step 3: Get Your Webhook Secret

1. Go to **Settings → Webhooks**
2. Create a webhook with URL: `https://yourstore.com/webhooks/frisbii`
3. Copy the **Signature Secret**
4. This authenticates webhook messages

### Step 4: Configure in Your Store

Your admin will add these credentials to your store settings. You'll provide:
- API Key
- API Secret
- Webhook Secret

Once configured, Frisbii Payment is active!

## Changing the Admin Interface Language

You can change the language of the Frisbii Settings page and all Frisbii-related labels in the Admin (including the Invoice widget on order pages) without changing your browser language.

1. Go to **Admin → Settings → Frisbii Pay**
2. Scroll to the **Payment Display** section
3. Open the **Locale / Sprog** dropdown
4. Select your preferred language (e.g. **Dansk** for Danish, **English** for English)
5. Click **Save Configuration / Gem konfiguration**

The page immediately switches to the selected language. The Invoice widget on order detail pages will also display in that language the next time an order is opened.

> **Note**: The Locale setting also controls the language shown to customers during checkout on the Reepay payment page. Changing it affects both the Admin UI and the customer-facing checkout flow.

### Supported Languages

| Label | Locale |
|-------|--------|
| English | `en_GB` |
| Dansk | `da_DK` |
| *Coming soon* | Swedish, Norwegian, German, French, Spanish, Dutch, Polish |

## Managing Payments

### Viewing Payment Status

#### In Medusa Admin

1. Go to **Orders → [Your Order]**
2. Look in the **right sidebar** — the **Invoice** card appears below the Customer card
3. The card shows:
   - **Invoice handle** — the Reepay charge ID (e.g. `cart-1775623306319`)
   - **State** — colour-coded: Settled (green), Authorized (orange), Cancelled/Failed (red)
   - **Payment method** — card logo (VISA, Mastercard, etc.) with masked card number
   - **Remaining balance, Total authorized, Total settled, Total refunded**
   - **Transaction history** — each authorization, settlement or refund with timestamp and amount
   - **See invoice** button — opens the invoice in the Reepay/Billwerk dashboard

> **Note**: The Invoice card only appears for orders paid through Frisbii Pay. It fetches live data from Reepay each time you open the order page, so balances are always up-to-date.

#### Example Payment Flow

```
Order Placed
    ↓
Customer selects "Frisbii Payment"
    ↓
Redirected to Reepay
    ↓
Customer enters payment details
    ↓
Reepay processes payment
    ↓
Payment Authorized ✓
    ↓
Funds received (1-3 business days)
    ↓
Order marked as Paid
    ↓
Fulfillment begins
```

### Understanding Payment Statuses

| Status | Meaning | Action |
|--------|---------|--------|
| **Pending** | Waiting for customer payment | Send reminder email |
| **Authorized** | Amount reserved on card | Capture funds to complete |
| **Captured** | Payment complete, funds received | Prepare order for shipment |
| **Failed** | Payment declined | Contact customer |
| **Refunded** | Money returned to customer | Update order status |

### Order Line Items on the Reepay Invoice

When **Send Order Lines** is enabled (the default), each product, shipping method, and discount is sent to Reepay as a separate line item. This means:

- The **Reepay / Billwerk+ invoice** shows the full itemised breakdown — product names, quantities, unit prices, VAT rates, and shipping.
- The **Invoice card** in the Medusa Admin order detail sidebar still shows the totals as usual; the per-line detail is visible when you click **See invoice** to open the invoice in the Reepay dashboard.

If you prefer not to share line-item details with Reepay (e.g., for privacy reasons), go to **Admin → Settings → Frisbii Pay → Payment Processing** and disable **Send Order Lines**. Reepay will then only receive the total amount.

> **Note**: No storefront changes are required to enable or disable order lines. The setting takes effect on the next checkout.

### Handling Failed Payments

**If a payment fails:**

1. **Check the reason** - Insufficient funds, wrong card, etc.
2. **Contact the customer** - Ask them to:
   - Verify card details
   - Try a different payment method
   - Contact their bank
3. **Allow retry** - Customer can attempt payment again
4. **Refund if needed** - Cancel order and full refund

## Processing Refunds

### Issuing a Refund

1. Go to **Orders → [Your Order]**
2. Click **Actions → Issue Refund**
3. Select amount to refund:
   - Full refund: Entire order amount
   - Partial refund: Specific amount
4. Click **Confirm Refund**
5. Funds returned in 2-5 business days

### Refund Timeline

- **Immediately**: Refund initiated
- **1-5 days**: Funds appear in customer's account
- **Note**: Refunds take longer than deposits

### Refund Limits

You can refund:
- ✅ Up to 100% of captured amount
- ✅ Multiple times (partial refunds)
- ✅ Up to 90 days after payment

You cannot:
- ❌ Refund more than captured
- ❌ Refund cancelled orders

## Best Practices

### 1. Test Before Going Live

**Use Sandbox Mode first:**
1. Set testing credentials in admin
2. Process test payments
3. Verify payments in test dashboard
4. Then switch to production

**Test Cards (Sandbox):**
- Valid: `4111 1111 1111 1111`
- Declined: `5555 5555 5555 4444`
- 3D Secure: `4000 0027 2000 3010`

### 2. Keep Credentials Secure

- ✅ Store API Secret safely
- ✅ Only share with trusted admins
- ✅ Change secret if leaked
- ✅ Use HTTPS for all payments
- ❌ Don't share in emails
- ❌ Don't hardcode in settings
- ❌ Don't commit to GitHub

### 3. Monitor Transactions

**Daily:**
- Check recent orders
- Verify payment statuses
- Look for failed payments

**Weekly:**
- Review transaction summary
- Check refund requests
- Monitor for fraud

**Monthly:**
- Reconcile with bank
- Review payment reports
- Analyze payment success rate

### 4. Customer Communication

**Payment Success Email:**
```
Thank you for your order! 🎉
Order #12345 has been confirmed.
You'll receive a shipping notification soon.
```

**Payment Failed Email:**
```
Hi [Customer Name],
Your payment for Order #12345 couldn't be processed.
Could you:
1. Verify your card details
2. Try another payment method
Or contact us at support@yourstore.com
```

## Troubleshooting

### "Payment Connection Failed"

**Problem**: Can't connect to Reepay API

**Solutions**:
1. Verify API Key is correct (copy from dashboard)
2. Verify API Secret is correct
3. Check webhook secret is correct
4. Ensure IP whitelisting (if enabled)
5. Contact Reepay support

### "Customer Card Declined"

**Problem**: Transaction was rejected

**Common reasons**:
- Insufficient funds
- Wrong card number or expiry
- Card reported as stolen
- Duplicate payment attempt
- Geographic restriction

**Customer actions**:
- Try different card
- Contact their bank
- Verify card hasn't expired
- Check fraud alerts

### "Refund Not Processed"

**Problem**: Refund initiated but not showing in customer account

**Check**:
- Payment was fully captured (not just authorized)
- Refund is within 90-day window
- Correct amount was refunded
- Customer bank processed it

**Wait**:
- Refunds take 2-5 business days
- Banks may take additional time
- Weekend delays

### "Missing Payment Records"

**Problem**: Payment completed but order shows unpaid

**Troubleshoot**:
1. Enable **Debug Mode** (Settings → Frisbii Pay → Debug Mode → Enable Debug Logging) to capture API request/response details
2. Reproduce the issue, then go to **Settings → Frisbii Pay Log** to view the log files
3. Check the `frisbii-webhook-YYYY-MM-DD.log` file to confirm whether the webhook was received and processed
4. Manually update order status if needed
5. Contact Reepay support with the request ID from the log

---

## Debug Mode & Log Viewer

### What is Debug Mode?

Debug Mode is a diagnostic feature that writes detailed API request/response data to log files on the server. Use it to troubleshoot payment failures, investigate webhook issues, or verify API integration behaviour.

> **Heads-up**: Debug mode writes to disk. Disable it again after diagnosing your issue to avoid unnecessary disk usage.

### Enabling Debug Mode

1. Go to **Admin → Settings → Frisbii Pay**
2. Scroll down to the **Debug Mode** section
3. Turn on the **Enable Debug Logging** toggle
4. Click **Save Configuration**
5. Wait up to 30 seconds for the change to take effect (provider config cache TTL)

### Viewing Logs

1. In the Admin sidebar, go to **Settings → Frisbii Pay Log**
2. The dashboard shows all log files with:
   - **Source** — which part of the system wrote the file (e.g., `frisbii-api`, `frisbii-webhook`)
   - **Date** — the date of the log (one file per source per day)
   - **Size** — file size
3. Click **View** on any row to open the log file
4. Use **Previous** / **Next** to page through entries (100 lines per page)
5. Log lines are colour-coded: ERROR (red), WARN (yellow), DEBUG (blue), INFO (grey)

### Log Sources

| Source file | What it contains |
|-------------|-----------------|
| `frisbii-api-YYYY-MM-DD.log` | Full HTTP request/response for every Reepay API call (only when Debug Mode is on) |
| `frisbii-webhook-YYYY-MM-DD.log` | Incoming webhooks — always written, regardless of Debug Mode |
| `frisbii-checkout-YYYY-MM-DD.log` | Payment session creation events — always written |
| `frisbii-capture-YYYY-MM-DD.log` | Capture, refund, cancel events — always written |
| `frisbii-order-status-YYYY-MM-DD.log` | Order status change events — always written |

### Privacy & Security

- Sensitive data (`api_key`, `webhook_secret`, `card_number`, `cvv`, etc.) is **automatically redacted** and never written to log files.
- Log files are stored server-side only (`var/log/frisbii/` by default). They are never exposed as static files; all access goes through the authenticated Admin API.
- Only authenticated admin users can view log files through the Admin UI.

---

## Features

### Saved Cards

Returning customers can:
- ✅ Save card for faster checkout
- ✅ One-click payments
- ✅ Manage saved cards

**Security**:
- Cards encrypted
- Never stored in your system
- Handled by Reepay (PCI compliant)

### Multi-Currency

Accept payments in:
- USD, EUR, GBP, JPY, and more
- Currency automatically converted
- Rates updated daily

### Payment Methods

Customers can pay with:
- Credit cards (Visa, Mastercard, Amex)
- Bank transfers
- Digital wallets
- Local payment methods (varies by region)

## Reports & Analytics

### Payment Dashboard

View key metrics:
- **Total Revenue**: All captured payments
- **Pending Amount**: Authorized but not captured
- **Failed Payments**: Declined transactions
- **Refunds**: Issued refunds
- **Average Transaction**: Mean payment amount

### Exporting Data

1. Go to **Reports → Export**
2. Select date range
3. Choose format (CSV, PDF)
4. Download report

Use for:
- Accounting
- Tax reporting
- Business analysis
- Audits

## Security & Compliance

### PCI Compliance

You don't need to worry about PCI compliance because:
- Reepay handles all card data
- You never see full card numbers
- Payments use encrypted connections
- Regular security audits

### Fraud Protection

Reepay includes:
- ✅ Fraud detection
- ✅ 3D Secure verification
- ✅ Address verification (AVS)
- ✅ CVV checking

### Data Protection

Your data is:
- Encrypted in transit (HTTPS)
- Encrypted at rest
- Protected by firewalls
- Regular backups
- GDPR compliant

## Billing & Fees

### Payment Processing Fees

Reepay charges per transaction. Typical fees:
- **2.5%** for cards + €0.30/transaction
- **1%** for bank transfers
- **Custom rates** for high volume

### Settlement

Funds arrive:
- **Standard**: 2-3 business days
- **Express**: 1 business day (additional fee)
- **Scheduled**: Custom settlement time

Check your Reepay account for exact fee structure.

## Getting Help

### Reepay Support

**For payment issues:**
- Email: support@reepay.com
- Chat: Available in dashboard
- Phone: See dashboard for number
- Documentation: [help.reepay.com](https://help.reepay.com)

### Store Admin Support

**For configuration help:**
- Contact your Medusa admin
- Check [Installation Guide](./SETUP_GUIDE.md)
- Review [Troubleshooting](./TROUBLESHOOTING.md)

### Common Questions

**Q: How long until refunds appear?**
A: 2-5 business days after refund initiation

**Q: Can I change payment settings without downtime?**
A: Yes, changes apply immediately

**Q: What if a customer disputes a charge?**
A: Reepay handles chargebacks automatically

**Q: Can I test payments without going live?**
A: Yes, use sandbox mode with test cards

## Next Steps

1. ✅ Create Reepay account
2. ✅ Get API credentials
3. ✅ Configure in store admin
4. ✅ Test with sandbox mode
5. ✅ Switch to production
6. ✅ Monitor transactions

## Additional Resources

- [Reepay Documentation](https://help.reepay.com)
- [Medusa Docs](https://medusajs.com/documentation)
- [Payment Setup Guide](./SETUP_GUIDE.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)

---

Questions? Check our [FAQ Section](./TROUBLESHOOTING.md#frequently-asked-questions) or contact your store admin.

Happy selling! 🚀
