# Troubleshooting Guide

## Common Issues and Solutions

This guide helps you solve common problems with the Frisbii Payment Plugin.

---

## Installation & Setup Issues

### "Module not found: @montaekung/medusa-plugin-frisbii-pay"

**Problem**: Plugin can't be found after installation

**Solutions**:
1. Verify installation completed:
   ```bash
   npm list @montaekung/medusa-plugin-frisbii-pay
   ```

2. Check package.json includes the plugin:
   ```bash
   grep "medusa-plugin-frisbii-pay" package.json
   ```

3. Reinstall if needed:
   ```bash
   npm uninstall @montaekung/medusa-plugin-frisbii-pay
   npm install @montaekung/medusa-plugin-frisbii-pay
   npm run build
   npm run dev
   ```

4. Clear cache:
   ```bash
   npm cache clean --force
   rm -rf node_modules
   npm install
   ```

### Plugin not loading on start

**Problem**: Backend starts but plugin isn't initialized

**Check**:
1. Logs show plugin loading:
   ```bash
   npm run dev 2>&1 | grep -i frisbii
   ```

2. Plugin registered in `medusa-config.js`:
   ```javascript
   // In plugins array
   {
     resolve: "@montaekung/medusa-plugin-frisbii-pay",
     options: {},
   }
   
   // In modules array
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
   }
   ```

3. Environment variables are set:
   ```bash
   FRISBII_API_KEY_TEST=priv_test_xxx
   FRISBII_API_KEY_LIVE=priv_xxx
   FRISBII_API_MODE=test
   ```

### Database migration fails

**Problem**: Tables not created in database

**Check**:
1. Database connection is working:
   ```bash
   # Check database_url in medusa-config.js
   # Try connecting with: psql $DATABASE_URL \d
   ```

2. Run migrations explicitly:
   ```bash
   npx medusa db:migrate
   ```

3. Check migration files exist:
   ```bash
   ls node_modules/@montaekung/medusa-plugin-frisbii-pay/.medusa/server/src/modules/frisbii-data/migrations/
   ```

4. Manual fix (if needed):
   ```sql
   -- Check if tables exist
   SELECT table_name FROM information_schema.tables 
   WHERE table_name LIKE 'frisbii_%';
   ```

### Admin settings page not appearing

**Problem**: "Frisbii Pay" menu item missing from Settings sidebar

**Root Cause**: The admin UI is bundled into the host app during build, not served live from the plugin.

**Solutions**:
1. Verify `package.json` exports include `./admin`:
   ```json
   "exports": {
     "./admin": {
       "import": "./.medusa/server/src/admin/index.mjs",
       "require": "./.medusa/server/src/admin/index.js",
       "default": "./.medusa/server/src/admin/index.js"
     }
   }
   ```

2. Rebuild the backend's admin client:
   ```bash
   cd /path/to/backend
   npx medusa build  # NOT just npm run dev!
   ```

3. Verify admin bundle includes the plugin:
   ```bash
   # Check if entry.jsx references the plugin
   grep -i "frisbii" .medusa/client/entry.jsx
   
   # Should show:
   # import plugin1 from "@montaekung/medusa-plugin-frisbii-pay/admin"
   ```

4. Clear browser cache and reload admin UI

**Common mistake**: Running `npm run dev` does NOT rebuild the admin client — you must run `npx medusa build` after any admin UI changes.

### "Package subpath '...' is not defined by exports"

**Problem**: Error starting backend or building admin

**Example errors**:
```
Package subpath './.medusa/server/src/modules/frisbii-data' is not defined by "exports"
```

**Cause**: `package.json` `exports` field is missing required entries

**Solution**: Update plugin's `package.json`:
```json
"exports": {
  "./package.json": "./package.json",
  "./admin": {
    "import": "./.medusa/server/src/admin/index.mjs",
    "require": "./.medusa/server/src/admin/index.js",
    "default": "./.medusa/server/src/admin/index.js"
  },
  "./providers/*": "./.medusa/server/src/providers/*/index.js",
  "./modules/*": "./.medusa/server/src/modules/*/index.js",
  "./.medusa/server/src/modules/*": "./.medusa/server/src/modules/*/index.js",
  "./workflows": "./.medusa/server/src/workflows/index.js",
  ".": "./.medusa/server/index.js"
}
```

### Build error: "default is not exported by ..."

**Problem**: Admin build fails with Rollup error

**Example**:
```
"default" is not exported by "../../plugin/.medusa/server/src/admin/index.js"
```

**Cause**: The `./admin` export points to wrong file or uses wrong format

**Solution**: 
1. Use the conditional export format (not a plain string):
   ```json
   "./admin": {
     "import": "./.medusa/server/src/admin/index.mjs",
     "require": "./.medusa/server/src/admin/index.js",
     "default": "./.medusa/server/src/admin/index.js"
   }
   ```

2. Rebuild plugin: `npm run build`
3. Rebuild backend: `npx medusa build`

---

## Configuration Issues

### "Invalid API Key" error

**Problem**: Connection test fails with invalid credentials

**Solutions**:
1. Verify key format:
   - Test key starts with: `rp_test_`
   - Live key starts with: `rp_live_`
   - Check no extra spaces

2. Copy key again:
   - Don't use browser autocomplete
   - Copy directly from Reepay dashboard
   - Paste into environment variable

3. Check Test/Production match:
   ```bash
   # If API_KEY starts with rp_test_ :
   # Backend must be in test mode
   
   # If API_KEY starts with rp_live_ :
   # Backend must be in production mode
   ```

4. Verify in Reepay:
   - Log into [Reepay Dashboard](https://dashboard.reepay.com)
   - Go to **Settings → API Keys**
   - Ensure key is enabled (not revoked)
   - Try regenerating if old

### "Webhook Secret verification failed"

**Problem**: Webhooks rejected with signature error

**Solutions**:
1. Copy webhook secret again:
   - Go to Reepay: **Settings → Webhooks**
   - Click your webhook
   - Copy **Secure Key** exactly
   - No spaces or special characters

2. Verify webhook URL:
   - Should be: `https://your-backend.com/webhooks/frisbii`
   - Must be HTTPS (not HTTP)
   - Must be accessible from internet

3. Regenerate if unsure:
   - Delete webhook
   - Create new webhook
   - Copy new secret key
   - Update backend configuration

4. Restart backend after updating:
   ```bash
   npm run dev
   ```

### "Missing environment variables"

**Problem**: Backend complains about `FRISBII_API_KEY_TEST` etc.

**Solutions**:
1. Create `.env` file in backend root:
   ```bash
   FRISBII_API_KEY_TEST=priv_test_xxx
   FRISBII_API_KEY_LIVE=priv_xxx
   FRISBII_API_MODE=test
   ```

2. Verify file is not ignored:
   ```bash
   # Check .gitignore doesn't exclude .env
   cat .gitignore | grep -i env
   ```

3. Restart backend:
   ```bash
   npm run dev
   ```

4. Test variables loaded:
   ```bash
   echo $FRISBII_API_KEY_TEST
   ```

---

## Payment Flow Issues

### "Payment session could not be created"

**Problem**: Customer gets error when initiating payment

**Check**:
1. Credentials are correct:
   ```bash
   # Test in admin: POST /admin/frisbii/verify-connection
   curl -X POST http://localhost:9000/admin/frisbii/verify-connection \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{"apiKey":"your_key", "apiSecret":"your_secret"}'
   ```

2. Cart has required data:
   - `amount` > 0
   - `currency` is valid ISO code (USD, EUR, etc.)
   - `customer` is defined

3. Reepay API is accessible:
   ```bash
   curl https://api.reepay.com/v1/session
   ```

4. Check logs:
   ```bash
   npm run dev 2>&1 | grep -i "error\|frisbii"
   ```

### "Payment authorized but order not updating"

**Problem**: Reepay confirms payment but order stays in "pending"

**Possible Causes**:
1. Webhook not configured:
   - Check Reepay: **Settings → Webhooks**
   - Ensure `payment_authorized` event is enabled
   - Verify webhook URL is correct

2. Webhook secret mismatch:
   - Update secret in backend config
   - Restart backend
   - Test webhook again

3. Webhook not reaching backend:
   - Test accessibility: `curl https://your-backend.com/webhooks/frisbii`
   - Check firewall rules
   - Verify no IP restrictions

4. Manual fix (if needed):
   ```sql
   UPDATE frisbii_payment_status 
   SET status = 'captured' 
   WHERE order_id = 'your_order_id';
   ```

### "Duplicate payment attempts"

**Problem**: Customer charged twice

**Causes**:
1. Customer clicked "Pay" twice
2. Browser refreshed during payment
3. Network timeout confusion

**Prevention**:
1. Disable button after click:
   ```javascript
   // Frontend: Add disabled attribute to submit button
   button.disabled = true;
   ```

2. Add timeout protection:
   ```bash
   FRISBII_SESSION_TIMEOUT=1800  # 30 minutes
   ```

3. Implement duplicate detection:
   - Check for existing frisbii_session before creating
   - Use idempotency keys

**Recovery**:
1. Check payment in Reepay dashboard
2. Issue refund for duplicate
3. Contact customer with explanation
4. Example refund:
   ```bash
   curl -X POST /admin/frisbii/refund \
     -d '{"transactionId": "txn_123", "amount": 10000}'
   ```

### "Payment succeeded but refund failed"

**Problem**: Refund creation fails

**Solutions**:
1. Check if refund is allowed:
   - Original payment must be "captured" (not just authorized)
   - Within 90 days of payment
   - Not already refunded

2. Try partial refund:
   ```bash
   POST /admin/frisbii/refund
   {
     "transactionId": "txn_123",
     "amount": 5000  # Partial instead of full
   }
   ```

3. Check Reepay status:
   - Log into Reepay dashboard
   - Search for transaction ID
   - Verify status allows refund

4. Contact Reepay support:
   - If refund blocked for account reasons
   - Provide transaction ID
   - Ask for refund status

---

## API Endpoint Issues

### "401 Unauthorized" on Admin endpoints

**Problem**: API returns unauthorized error

**Solutions**:
1. Ensure token is passed:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:9000/admin/frisbii/config
   ```

2. Token is still valid:
   - Tokens expire
   - Log in again to get new token
   - Check token expiry

3. User has admin privilege:
   - Not all users are admins
   - Only admin can access `/admin/` endpoints
   - Contact admin user if needed

### "404 Not Found" on endpoints

**Problem**: Endpoint doesn't exist

**Check**:
1. Endpoint path is correct:
   - `/admin/frisbii/config` (not `/admin/config`)
   - `/store/frisbii/config` (not `/store/config`)
   - Check spelling exactly

2. Plugin is loaded:
   - Routes registered after plugin loads
   - Restart backend if added recently
   - Check logs for loading messages

3. Backend URL is correct:
   - Admin: `http://localhost:9000`
   - Store: `http://localhost:8000`
   - Production: Your actual domain

### "400 Bad Request" on POST endpoints

**Problem**: Request body validation fails

**Solutions**:
1. Check request format:
   ```bash
   # ✅ Correct
   curl -X POST http://localhost:9000/admin/frisbii/config \
     -H "Content-Type: application/json" \
     -d '{"apiKey":"value"}'
   
   # ❌ Wrong (missing -d)
   curl -X POST http://localhost:9000/admin/frisbii/config
   ```

2. Verify required fields:
   - POST /config requires: apiKey, apiSecret, webhookSecret
   - Missing fields cause 400 error

3. Check JSON syntax:
   ```bash
   # Validate with: python3 -m json.tool
   echo '{"key":"value"}' | python3 -m json.tool
   ```

### "503 Service Unavailable"

**Problem**: Reepay API is unreachable

**Check**:
1. Internet connection:
   ```bash
   ping api.reepay.com
   ```

2. Reepay status page:
   - Visit https://status.reepay.com
   - Check if service is down

3. API URL is correct:
   - Test: `https://api.reepay.com`
   - Sandbox: `https://sandbox-api.reepay.com`
   - Check in config: `FRISBII_API_URL`

4. Firewall/proxy issues:
   - Check if outbound HTTPS is blocked
   - May need proxy configuration
   - Contact IT for enterprise networks

---

## Database Issues

### "Unique constraint violation"

**Problem**: Duplicate entry error in database

**Causes**:
1. Creating config twice:
   ```sql
   -- Check how many configs exist
   SELECT COUNT(*) FROM frisbii_config;
   -- Should be 1
   ```

2. Duplicate session:
   ```sql
   -- Clean up old sessions
   DELETE FROM frisbii_session 
   WHERE expires_at < NOW() AND status = 'pending';
   ```

**Fix**:
```sql
-- For config
UPDATE frisbii_config SET enabled = true WHERE id = 'frisbii-config-1';

-- For sessions
DELETE FROM frisbii_session WHERE id = 'duplicate_id';
INSERT INTO frisbii_session (...) VALUES (...);
```

### "Foreign key constraint fails"

**Problem**: Cannot insert/update due to missing reference

**Causes**:
1. Order doesn't exist:
   ```sql
   SELECT * FROM orders WHERE id = 'order_123';
   ```

2. Customer doesn't exist:
   ```sql
   SELECT * FROM customers WHERE id = 'cust_456';
   ```

**Fix**:
```sql
-- Create missing order first
INSERT INTO orders (id, customer_id, ...) VALUES ('order_123', 'cust_456', ...);

-- Then insert payment status
INSERT INTO frisbii_payment_status (order_id, ...) VALUES ('order_123', ...);
```

### "Table doesn't exist"

**Problem**: Migration not run or incomplete

**Solutions**:
1. Check if tables exist:
   ```sql
   \dt frisbii_*  -- In psql
   SHOW TABLES LIKE 'frisbii_%';  -- In MySQL
   ```

2. Run migrations:
   ```bash
   npx medusa migrations run
   ```

3. Or manually create:
   ```bash
   # Find migration file
   ls node_modules/@montaekung/medusa-plugin-frisbii-pay/.medusa/server/migrations/
   
   # Check SQL and run manually
   psql $DATABASE_URL < migration.sql
   ```

---

## Performance Issues

### "API requests timing out"

**Problem**: Requests take too long or timeout

**Solutions**:
1. Check backend performance:
   ```bash
   # Monitor CPU/Memory
   top -p $(pgrep -f "node.*medusa")
   ```

2. Increase timeout:
   ```bash
   # In medusa-config.js
   export default {
     projectConfig: {
       httpServer: {
         requestTimeout: 30000,  // 30 seconds
       }
     }
   };
   ```

3. Optimize database queries:
   ```bash
   # Enable query logging
   DATABASE_DEBUG=true npm run dev
   ```

4. Scale up resources:
   - Increase server RAM
   - Upgrade CPU
   - Use database connection pooling

### "High memory usage"

**Problem**: Backend consumes excessive memory

**Check**:
1. Memory leak:
   ```bash
   # Take heap snapshot
   node --expose-gc --inspect medusa
   # Use Chrome DevTools to analyze
   ```

2. Large data processing:
   - Limit batch sizes
   - Implement pagination
   - Stream responses

3. Cache settings:
   ```bash
   # Reduce Redis memory
   npm run dev -- --redis-memory-limit=256m
   ```

---

## Webhook Issues

### "Webhooks not received"

**Problem**: Events from Reepay not reaching backend

**Debugging**:
1. Check webhook configuration:
   - Reepay: **Settings → Webhooks**
   - Verify URL: `https://your-backend/webhooks/frisbii`
   - Ensure HTTPS (required by Reepay)

2. Test accessibility:
   ```bash
   curl -X POST https://your-backend/webhooks/frisbii \
     -H "X-Signature: test" \
     -d '{}'
   ```

3. Check firewall:
   - Port 443 (HTTPS) open inbound
   - No IP restrictions blocking Reepay
   - Test with: `telnet your-backend 443`

4. Check logs:
   ```bash
   npm run dev 2>&1 | grep -i webhook
   tail -f logs/webhook.log
   ```

5. Manual retry (in Reepay):
   - Go to webhook logs
   - Click failed event
   - Click "Retry"

### "Invalid webhook signature"

**Problem**: Webhook rejected as 403 Forbidden

**Check**:
1. Signature secret matches:
   - Reepay dashboard: **Settings → Webhooks**
   - Backend config: `FRISBII_WEBHOOK_SECRET`
   - Must be exact match (no spaces)

2. Webhook URL unchanged:
   - If changed, Reepay uses old URL
   - Update URL in Reepay
   - Test with new endpoint

3. Time skew:
   - Server clock must be accurate
   - Check: `date` (should match NTP)
   - Sync if off by more than 5 minutes

4. Relearn secret:
   ```bash
   # Delete and recreate webhook in Reepay
   # Copy new secret
   # Update backend: FRISBII_WEBHOOK_SECRET=new_secret
   # Restart backend
   ```

### "Webhook events missing"

**Problem**: Some events processed, others missing

**Causes**:
1. Partial event subscriptions:
   - Reepay: **Settings → Webhooks**
   - Click webhook
   - Verify these are enabled:
     - ☑ payment_authorized
     - ☑ payment_captured
     - ☑ payment_failed

2. Event filtering:
   - Check backend code for event filtering
   - Ensure all event types handled

**Fix**:
1. Re-enable all event types
2. Reepay retries missing events automatically
3. Check logs 48 hours after fix

---

## Security Issues

### "API key exposed in logs"

**Problem**: Sensitive data logged accidentally

**Prevention**:
1. Don't log credentials:
   ```typescript
   // ❌ Wrong
   console.log("API Key:", apiKey);
   
   // ✅ Correct
   console.log("API Key:", apiKey.substring(0, 8) + "...");
   ```

2. Use environment variables:
   ```bash
   # NOT in code: apiKey = "rp_live_xxx"
   # USE env: apiKey = process.env.FRISBII_API_KEY
   ```

3. Clean logs if exposed:
   ```bash
   # Clear log files
   rm logs/*.log
   
   # Regenerate API key in Reepay
   # Update backend config
   ```

### "Webhook signature validated incorrectly"

**Problem**: Invalid signatures accepted

**Fix**:
1. Verify signature validation code:
   ```typescript
   // Use HMAC-SHA256
   const signature = crypto
     .createHmac("sha256", secret)
     .update(body)
     .digest("hex");
   
   if (signature !== providedSignature) {
     throw new Error("Invalid signature");
   }
   ```

2. Update backend if needed
3. Test with invalid signature (should fail)

### "Data not encrypted in transit"

**Problem**: Sensitive data transmitted over HTTP

**Check**:
1. All URLs use HTTPS:
   ```bash
   # API URL
   FRISBII_API_URL=https://api.reepay.com
   
   # Webhook URL
   https://your-backend.com/webhooks/frisbii
   ```

2. Certificate is valid:
   ```bash
   # Check cert
   openssl s_client -connect your-backend.com:443
   ```

3. Enforce HTTPS:
   ```javascript
   // In medusa-config.js
   export const projectConfig = {
     httpServer: {
       secure: true,
       keyPath: "/path/to/key.pem",
       certPath: "/path/to/cert.pem",
     }
   };
   ```

---

## Frequently Asked Questions

### Q: How long do webhooks take to arrive?

**A**: Usually within 1-5 seconds. Reepay retries for 48 hours if backend unreachable.

### Q: Can I test payments without going live?

**A**: Yes, use sandbox mode with test API keys (`rp_test_`) and test cards.

### Q: What's the refund timeline?

**A**: Refund processed immediately, funds appear in customer account in 2-5 business days.

### Q: Can I use multiple payment methods?

**A**: Yes, add multiple payment providers in Medusa. Only one can be "default".

### Q: How do I monitor fraud?

**A**: Reepay includes fraud detection. Check dashboard for flagged transactions.

### Q: What if server is down during payment?

**A**: Reepay holds session for 30 minutes. Customer can retry. Webhook retries for 48 hours.

### Q: Can I see all transactions somewhere?

**A**: Yes, in Reepay dashboard and Medusa order details.

### Q: What currencies are supported?

**A**: All major currencies (USD, EUR, GBP, JPY, etc.). Check Reepay docs for complete list.

### Q: How do I handle chargebacks?

**A**: Reepay handles automatically. You can dispute in dashboard with evidence.

---

## Getting Help

### Resources

- **API Reference**: [API_REFERENCE.md](./API_REFERENCE.md)
- **Architecture**: [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Testing**: [TESTING.md](./TESTING.md)
- **Reepay Docs**: https://help.reepay.com
- **Medusa Docs**: https://medusajs.com/documentation

### Support

**For Plugin Issues**:
- GitHub Issues: https://github.com/sahaki/medusa-plugin-frisbii-pay/issues
- Create issue with:
  - Error message
  - Steps to reproduce
  - Environment info (versions, OS)
  - Logs (if applicable)

**For Reepay Issues**:
- Email: support@reepay.com
- Chat: In Reepay dashboard
- Phone: See dashboard for number

**For Medusa Issues**:
- Documentation: https://medusajs.com/documentation
- Community: https://discord.gg/medusajs

---

## Still Having Issues?

1. **Search** this guide for similar issues
2. **Check logs** for error messages
3. **Test in sandbox** first
4. **Contact support** with all details
5. **Review documentation** for clarification

Good luck! 🚀
