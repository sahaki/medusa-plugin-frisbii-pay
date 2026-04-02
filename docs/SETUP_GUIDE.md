# Payment Setup Guide for Store Owners

## Complete Setup Instructions for Frisbii Payment

Follow this step-by-step guide to activate Frisbii Payment in your store.

## Phase 1: Prepare Your Reepay Account

### Step 1.1: Create a Reepay Account

1. Visit [reepay.com](https://reepay.com)
2. Click **"Get Started"** button
3. Fill in your information:
   - Business name
   - Business email
   - Business phone
4. Agree to terms and conditions
5. Click **"Create Account"**
6. Verify your email address
7. Log in to your new account

### Step 1.2: Complete Account Verification

1. Go to **Settings → Account**
2. Verify your:
   - business address
   - contact person
   - phone number
3. Upload business documents (may vary by country)
4. Wait for approval (usually 24-48 hours)
5. You'll receive a confirmation email

### Step 1.3: Set Up Your Bank Account

1. Go to **Settings → Bank Account**
2. Enter your bank details:
   - Account holder name
   - Account number (IBAN for Europe)
   - Routing number (for US)
   - Bank name and country
3. Save settings
4. Reepay will verify with a test deposit

**Note**: Funds from payments will go to this account

## Phase 2: Get Your API Credentials

### Step 2.1: Find Your API Keys

1. Log in to [Reepay Dashboard](https://dashboard.reepay.com)
2. Click your profile (top right corner)
3. Go to **Settings**
4. Click **API → API Keys**
5. Copy your keys:

```
API Key:    rp_test_xxxxxxxxxxxxxxxxxxxxx
API Secret: test_secret_xxxxxxxxxxxxxxxxxxxxx
```

**⚠️ Important**: 
- Keep API Secret private!
- Only share with authorized store admins
- Never commit to GitHub or emails

### Step 2.2: Generate Webhook Secret

1. Still in **Settings → API**
2. Go to **Webhooks** tab
3. Click **"Create Webhook"**
4. Webhook URL should be: `https://your-store.com/webhooks/frisbii`
5. Select events to subscribe to:
   - ☑ payment_authorized
   - ☑ payment_captured
   - ☑ payment_failed
   - ☑ refund_created
6. Copy the **Secure Key** (this is your Webhook Secret)

**Example Webhook Secret**:
```
webhook_secret_xxxxxxxxxxxxxxxxxxxxx
```

### Step 2.3 Toggle Sandbox / Production Mode

**For Testing (Sandbox)**:
1. In dashboard, toggle **"Test Mode"** to ON
2. Use test API keys (starts with `rp_test_`)
3. Use test cards for payments

**For Live (Production)**:
1. Toggle **"Test Mode"** to OFF
2. Use live API keys (starts with `rp_live_`)
3. Real payments will be processed

## Phase 3: Configure in Your Store Admin

### Step 3.1: Access Store Admin

1. Log in to your Medusa store admin at: `https://your-store.com/admin`
2. Go to **Settings** (or **Configuration**)
3. Look for **Payment Methods** section
4. Find **Frisbii Payment** or **Reepay**

### Step 3.2: Enter Credentials

1. Click **Configure** or **Edit**
2. Enter the credentials from Phase 2:
   ```
   API Key:       rp_test_xxxxxxxxxxxxxxxxxxxxx
   API Secret:    test_secret_xxxxxxxxxxxxxxxxxxxxx
   Webhook Secret: webhook_secret_xxxxxxxxxxxxxxxxxxxxx
   ```
3. Choose default currency:
   - USD, EUR, GBP, JPY, etc.
4. Toggle **"Enabled"** to ON
5. Ensure **"Test Mode"** matches Reepay setting
6. Click **"Save"**

### Step 3.3: Test Connection

1. Click **"Verify Connection"** button
2. System will test API credentials
3. If successful, you'll see: ✅ **Connection Successful**
4. If failed, check:
   - API Key is copied correctly
   - API Secret is copied correctly
   - No extra spaces

## Phase 4: Test Payment Processing

### Step 4.1: Create Test Order

1. In your store **Admin Dashboard**
2. Create a new test order:
   - Add test product
   - Enter test customer email
   - Select payment method: **Frisbii Payment**
3. Proceed to checkout

### Step 4.2: Complete Test Payment

1. Customer arrives at Reepay checkout
2. Use test card: `4111 1111 1111 1111`
3. Enter any expiry date in future
4. Enter any 3-digit CVV
5. Click **"Pay Now"**

**Expected Result**:
- Payment should complete
- Order marked as "Paid"
- Admin notification sent
- Payment status shows "Captured"

### Step 4.3: Verify Payment Recorded

1. Go to **Orders** → Your test order
2. Look at **Payment Information** section
3. Verify:
   - Status: "Captured" ✓
   - Amount: Correct ✓
   - Transaction ID: Present ✓
   - Timestamp: Recent ✓

## Phase 5: Switch to Production

### Step 5.1: Get Live Credentials

1. Log back into [Reepay Dashboard](https://dashboard.reepay.com)
2. Turn **OFF** "Test Mode"
3. Copy new API credentials:
   ```
   API Key:    rp_live_xxxxxxxxxxxxxxxxxxxxx
   API Secret: live_secret_xxxxxxxxxxxxxxxxxxxxx
   ```

### Step 5.2: Update Store Configuration

1. In store admin, go to **Frisbii Payment settings**
2. Replace test credentials with live credentials:
   ```
   API Key:       rp_live_xxxxxxxxxxxxxxxxxxxxx
   API Secret:    live_secret_xxxxxxxxxxxxxxxxxxxxx
   Webhook Secret: webhook_secret_xxxxxxxxxxxxxxxxxxxxx (stays the same)
   ```
3. Ensure **"Test Mode"** toggle is OFF
4. Click **"Save Changes"**

### Step 5.3: Verify Live Connection

1. Click **"Verify Connection"** again
2. Confirm it shows ✅ **Connection Successful with Live API**
3. You're ready for real payments!

## Phase 6: Configure Store Settings

### Step 6.1: Payment Method Display

1. Go to **Store Settings → Payment Methods**
2. Ensure Frisbii Payment is:
   - ☑ Enabled
   - ☑ Visible to customers
   - Correct display name: "Reepay Payment" or custom name

### Step 6.2: Currency Settings

1. Go to **Store Settings → Currencies**
2. Supported currencies:
   - USD, EUR, GBP, JPY, CHF, CAD, AUD, NZD
   - Add your business currency
3. Set default currency to match your bank account

### Step 6.3: Payment Region Settings

1. Go to **Store Settings → Regions**
2. For each region:
   - Ensure Frisbii Payment is enabled
   - Verify correct currency
   - Check if webhook is activated

## Phase 7: Final Checklist

### Before Launch, Verify:

- [ ] Reepay account created and verified
- [ ] Test API credentials obtained
- [ ] Webhook URL configured in Reepay
- [ ] Credentials entered in store admin
- [ ] Test payment successful
- [ ] Live credentials obtained
- [ ] Live credentials configured in admin
- [ ] Connection verification passes
- [ ] All regions have payment method enabled
- [ ] Currency settings correct
- [ ] Webhook secret updated
- [ ] Contact information up to date
- [ ] Bank account verified

## Phase 8: Monitor Your Payments

### Daily Tasks

1. **Check Recent Orders**
   - Admin Dashboard → Orders
   - Look for payment status
   - Any failures to follow up

2. **Monitor Failed Payments**
   - Orders with "Failed" payment status
   - Contact customers with issue
   - Offer alternative payment methods

3. **Watch Webhooks** (if available)
   - Check webhook logs
   - Ensure all payments updating correctly
   - Any errors to investigate

### Weekly Tasks

1. **Review Payment Summary**
   - Revenue from Frisbii payments
   - Number of transactions
   - Average transaction value
   - Failed vs successful rate

2. **Process Refunds**
   - Review refund requests
   - Issue approved refunds
   - Update customers on status

3. **Reconcile with Bank**
   - Verify settled funds
   - Check for discrepancies
   - Review transactions in detail

### Monthly Tasks

1. **Full Reconciliation**
   - Compare store orders with bank deposits
   - Identify any missing payments
   - Document discrepancies

2. **Security Review**
   - Ensure credentials not exposed
   - Check access logs
   - Verify webhook still working

3. **Generate Reports**
   - Export monthly transactions
   - Calculate fees and net revenue
   - Save for accounting

## Troubleshooting

### Payment Configuration Issues

**Problem**: "Connection Failed" message

**Solutions** (in order):
1. Verify API Key (copy from dashboard again)
2. Verify API Secret (ensure no extra spaces)
3. Check if Test/Live mode matches Reepay setting
4. Try with fresh credentials
5. Contact Reepay support if still failing

**Problem**: "Invalid Webhook Secret"

**Solutions**:
1. Copy webhook secret again from Reepay dashboard
2. Ensure no extra spaces or characters
3. Check that URL matches: `https://your-store.com/webhooks/frisbii`
4. Verify HTTPS (not HTTP)

### Payment Processing Issues

**Problem**: Customer clicks "Pay" but nothing happens

**Check**:
1. Reepay checkout page loads (in browser inspector)
2. Network requests completing (no 404 or 500 errors)
3. Browser console for JavaScript errors
4. Contact Reepay support with error message

**Problem**: Payment succeeds on Reepay but order not updating

**Check**:
1. Order status in admin (may take 10-30 seconds)
2. Check webhook logs (if available)
3. Refresh the page
4. Restart backend if webhook disabled
5. Manually update order status while investigating

**Problem**: Different amount charged than displayed

**Check**:
1. Verify currency conversion (if applicable)
2. Ensure no double decimal on zero-decimal currencies (JPY, KRW)
3. Confirm tax/shipping included in final amount
4. Contact Reepay support with transaction ID

## Support & Help

### Get Help

**For payment processing**:
- Reepay: support@reepay.com
- Phone: Available in Reepay dashboard
- Chat: In-dashboard chat support

**For store configuration**:
- Your store admin/IT team
- Check [Installation Guide](./INSTALLATION.md)
- Review [API Reference](./API_REFERENCE.md)

### Documentation

- [User Guide](./USER_GUIDE.md) - How to manage payments
- [Troubleshooting Guide](./TROUBLESHOOTING.md) - Common issues
- [Reepay Docs](https://help.reepay.com) - Payment details
- [Medusa Docs](https://medusajs.com) - Store documentation

## Success Indicators

Your payment setup is working correctly when:

✅ Test payment successfully processes
✅ Order marked as "Paid" in admin
✅ Payment status shows transaction ID
✅ Refunds process successfully
✅ Customer receives payment confirmation
✅ Weekly transactions are consistent
✅ No fraud flags or disputes
✅ Webhook events are logged

---

You're all set! 🎉

Your store is now ready to accept payments through Frisbii/Reepay. Monitor your payments daily and contact support if you encounter any issues.

**Congratulations on your new payment system!**
