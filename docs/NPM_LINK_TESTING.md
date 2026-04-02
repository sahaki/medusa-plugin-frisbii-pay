# NPM Link Testing Guide

## Quick Start: Test Plugin Locally Before Publishing

This guide shows you how to test the Frisbii Payment Plugin in your local Medusa backend **before** publishing to npm.

## 🚀 Quick Reference: Making Changes

After initial npm link setup, **every time you edit plugin code**:

```powershell
# In plugin directory
cd D:\my_cource\medusa\001\medusa-plugin-frisbii-pay
npm run build           # ⚠️ REQUIRED after every code change

# In backend directory
cd D:\my_cource\medusa\001\backend
npm run dev             # ⚠️ REQUIRED to reload (Ctrl+C first to stop)
```

**Note**: You do NOT need to run `npm link` again. The symlink persists.

## Why Use npm link?

- ✅ Test changes instantly without publishing
- ✅ Debug with real backend environment
- ✅ Verify everything works before beta release
- ✅ No need to publish multiple test versions

## Prerequisites

- Plugin code ready in: `D:\my_cource\medusa\001\medusa-plugin-frisbii-pay`
- Backend ready in: `D:\my_cource\medusa\001\backend` (or wherever your backend is)
- Both projects built successfully

## Step-by-Step Instructions

### Step 1: Build the Plugin

First, ensure your plugin builds successfully:

```powershell
# Navigate to plugin directory
cd D:\my_cource\medusa\001\medusa-plugin-frisbii-pay

# Build the plugin
npm run build

# Expected output:
# ✓ Plugin build completed successfully (3-4s)
```

**Verify build output exists:**
```powershell
Get-ChildItem .medusa\server -Recurse -File | Select-Object -First 5

# Should show compiled files:
# .medusa/server/src/index.js
# .medusa/server/src/index.d.ts
# etc.
```

### Step 2: Create npm Link

Link the plugin globally on your system:

```powershell
# Still in plugin directory
npm link

# Expected output:
# npm notice created a link from C:\Users\YOUR_USER\AppData\Roaming\npm\node_modules\@montaekung\medusa-plugin-frisbii-pay
# to D:\my_cource\medusa\001\medusa-plugin-frisbii-pay
```

**What this does:**
- Creates a global symlink to your plugin
- Now `@montaekung/medusa-plugin-frisbii-pay` points to your local code
- Changes you make are immediately reflected

### Step 3: Link Plugin in Backend

Navigate to your Medusa backend and link the plugin:

```powershell
# Navigate to your backend
cd D:\my_cource\medusa\001\backend

# Link the plugin
npm link @montaekung/medusa-plugin-frisbii-pay

# Expected output:
# C:\Users\YOUR_USER\path\to\backend\node_modules\@montaekung\medusa-plugin-frisbii-pay ->
# C:\Users\YOUR_USER\AppData\Roaming\npm\node_modules\@montaekung\medusa-plugin-frisbii-pay ->
# D:\my_cource\medusa\001\medusa-plugin-frisbii-pay
```

**Verify the link:**
```powershell
# Check if symlink exists
Get-Item node_modules\@montaekung\medusa-plugin-frisbii-pay | Select-Object Target

# Should show: Target = D:\my_cource\medusa\001\medusa-plugin-frisbii-pay
```

### Step 4: Update Backend Configuration

Update your `medusa-config.js` to use the plugin:

```javascript
// D:\my_cource\medusa\001\backend\medusa-config.js

// 1. Register plugin (for data module, API routes)
plugins = [
  // ... other plugins
  {
    resolve: "@montaekung/medusa-plugin-frisbii-pay",
    options: {},
  },
];

// 2. Register payment provider
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
];

module.exports = {
  projectConfig: {
    // ... your config
    plugins,
  },
  modules,
};
```

**Create/Update `.env` file:**

```bash
# D:\my_cource\medusa\001\backend\.env

# Database
DATABASE_URL=postgres://user:password@localhost:5432/medusa

# Frisbii/Reepay API Keys
FRISBII_API_KEY_TEST=priv_test_xxxxxxxxxxxxxxxx
FRISBII_API_KEY_LIVE=priv_xxxxxxxxxxxxxxxx
FRISBII_API_MODE=test

# Other vars
NODE_ENV=development
```

### Step 5: Remove Old Modules (If Updating)

If you previously had local modules for Frisbii payment, remove them:

```powershell
# In backend directory
cd src

# Remove old local modules (if they exist)
Remove-Item -Recurse -Force modules\frisbii-data -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force modules\frisbii-payment -ErrorAction SilentlyContinue

# Remove old API routes (if they exist)
Remove-Item -Recurse -Force api\admin\frisbii -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force api\store\frisbii -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force api\webhooks\frisbii -ErrorAction SilentlyContinue

# Remove old workflows (if they exist)
Remove-Item -Recurse -Force workflows\frisbii -ErrorAction SilentlyContinue

# Remove old subscribers (if they exist)
Remove-Item -Force subscribers\frisbii-*.ts -ErrorAction SilentlyContinue

# Remove old jobs (if they exist)
Remove-Item -Force jobs\frisbii-*.ts -ErrorAction SilentlyContinue
```

### Step 6: Rebuild Backend

```powershell
# In backend directory
cd D:\my_cource\medusa\001\backend

# Clean build artifacts
Remove-Item -Recurse -Force .medusa -ErrorAction SilentlyContinue

# Rebuild
npm run build

# Expected output:
# ✓ Backend build completed successfully
# Look for: "Loading plugin: @montaekung/medusa-plugin-frisbii-pay"
```

### Step 7: Run Database Migrations

The plugin includes database migrations for required tables:

```powershell
# Run migrations
npx medusa migrations run

# Expected output:
# Running migrations...
# ✓ Migration20260330075346 (Create frisbii tables)
# ✓ All migrations completed
```

**Verify tables were created:**

```sql
-- Connect to your database
psql -U user -d medusa

-- Check tables
\dt frisbii_*

-- Should show:
-- frisbii_config
-- frisbii_session
-- frisbii_customer
-- frisbii_payment_status
```

### Step 8: Start Backend in Development Mode

```powershell
# Start the backend
npm run dev

# Expected output:
# info: Starting Medusa...
# info: Loading plugin: @montaekung/medusa-plugin-frisbii-pay
# info: [frisbii-payment] Loading Frisbii Payment Plugin
# info: [frisbii-data] Initializing Frisbii Data Module
# info: Server is running on port 9000
```

**Watch for these log messages:**
- ✅ Plugin loaded successfully
- ✅ Routes registered (admin, store, webhooks)
- ✅ Database connection established
- ✅ No errors during startup

### Step 9: Test the Plugin

#### Test 1: Verify Admin Endpoint

```powershell
# Get admin token first
$response = Invoke-RestMethod -Uri "http://localhost:9000/admin/auth/user/emailpass" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"admin@medusa-test.com","password":"supersecret"}'

$token = $response.user.api_token

# Test Frisbii config endpoint
Invoke-RestMethod -Uri "http://localhost:9000/admin/frisbii/config" `
  -Method GET `
  -Headers @{"Authorization"="Bearer $token"}

# Expected: Returns configuration or 404 if not configured yet
```

#### Test 2: Configure Frisbii

```powershell
# Save configuration
Invoke-RestMethod -Uri "http://localhost:9000/admin/frisbii/config" `
  -Method POST `
  -Headers @{
    "Authorization"="Bearer $token"
    "Content-Type"="application/json"
  } `
  -Body (@{
    apiKey = "rp_test_xxx"
    apiSecret = "secret_test_xxx"
    webhookSecret = "webhook_test_xxx"
    enabled = $true
    testMode = $true
  } | ConvertTo-Json)

# Expected: Returns saved configuration
```

#### Test 3: Verify Connection

```powershell
# Test Reepay connection
Invoke-RestMethod -Uri "http://localhost:9000/admin/frisbii/verify-connection" `
  -Method POST `
  -Headers @{
    "Authorization"="Bearer $token"
    "Content-Type"="application/json"
  } `
  -Body (@{
    apiKey = "rp_test_xxx"
    apiSecret = "secret_test_xxx"
  } | ConvertTo-Json)

# Expected: { "connected": true, "message": "Successfully connected" }
```

#### Test 4: Store Endpoint (Public)

```powershell
# No auth required for public config
Invoke-RestMethod -Uri "http://localhost:8000/store/frisbii/config" -Method GET

# Expected: Returns public configuration
```

#### Test 5: Complete Payment Flow (Optional)

1. Create a test cart in your storefront
2. Add products
3. Select "Frisbii Payment" as payment method
4. Complete payment with test card: `4111 1111 1111 1111`
5. Verify order is marked as paid

## Making Changes & Testing

### Workflow for Development

**Important**: After npm link, you DON'T need to run `npm link` again. The symlink persists across edits.

**Every time you edit plugin code, do this:**

```powershell
# 1. Edit plugin code
cd D:\my_cource\medusa\001\medusa-plugin-frisbii-pay
# Make your changes in src/

# 2. ⚠️ REQUIRED: Rebuild plugin
npm run build

# Expected output:
# ✓ Plugin build completed successfully (3-4s)

# 3. ⚠️ REQUIRED: Restart backend
cd D:\my_cource\medusa\001\backend
# Press Ctrl+C to stop backend
npm run dev

# 4. Test your changes
# Backend now uses updated plugin code
```

**Why rebuild?**
- npm link creates a **symlink** (folder pointer), so backend always sees your local plugin
- But backend uses **compiled files** in `.medusa/server/`, not source `src/` files
- Therefore: **Edit → Build → Restart** every time

**What if I forget to rebuild?**
- Backend won't see your changes (still using old compiled code)
- No error messages - just outdated behavior

**Hot Reload (Optional):**

For faster development, you can use `nodemon` to auto-restart backend when plugin rebuilds:

```powershell
# In backend directory
npm install -D nodemon

# Update package.json:
# "dev": "nodemon --watch ../medusa-plugin-frisbii-pay/.medusa --exec 'medusa develop'"

# Now:
# 1. Edit plugin code
# 2. Run: npm run build (in plugin directory)
# 3. Backend auto-restarts (no manual restart needed) ✅
```

**Trade-off:**
- ✅ Faster: No need to manually stop/start backend
- ❌ Still need to rebuild plugin manually (TypeScript → JavaScript)
- ⚠️ Backend restarts automatically when `.medusa/` changes detected

## Troubleshooting

### Issue: "Module not found" after npm link

**Solution:**
```powershell
# Unlink and re-link
cd D:\my_cource\medusa\001\backend
npm unlink @montaekung/medusa-plugin-frisbii-pay

cd D:\my_cource\medusa\001\medusa-plugin-frisbii-pay
npm unlink
npm link

cd D:\my_cource\medusa\001\backend
npm link @montaekung/medusa-plugin-frisbii-pay
```

### Issue: Changes not reflected

**Problem**: Modified plugin code but backend still shows old behavior

**Cause**: Forgot to rebuild plugin after editing

**Solution:**
```powershell
# 1. Rebuild plugin
cd D:\my_cource\medusa\001\medusa-plugin-frisbii-pay
npm run build

# 2. Clear backend build (optional, if still not working)
cd D:\my_cource\medusa\001\backend
Remove-Item -Recurse -Force .medusa

# 3. Rebuild and restart
npm run build
npm run dev
```

**Remember**: 
- ✅ Edit code → **Always rebuild plugin** → Restart backend
- ❌ npm link does NOT auto-compile TypeScript to JavaScript

### Issue: Database tables not created

**Solution:**
```powershell
# Run migrations again
npx medusa migrations run --verbose

# If still failing, check migrations exist:
Get-ChildItem node_modules\@montaekung\medusa-plugin-frisbii-pay\.medusa\server\migrations

# Manual create (if needed):
psql -U user -d medusa -f path\to\migration.sql
```

### Issue: Plugin loads but routes not working

**Check:**
1. Plugin registered in medusa-config.js
2. Backend restarted after adding plugin
3. No route conflicts with other plugins
4. Check logs for errors:
   ```powershell
   npm run dev 2>&1 | Select-String "frisbii|error"
   ```

### Issue: Symlink not working on Windows

**Solution:**
Run PowerShell as Administrator:
```powershell
# Right-click PowerShell → "Run as Administrator"

# Then retry npm link
cd plugin-directory
npm link

cd backend-directory
npm link @montaekung/medusa-plugin-frisbii-pay
```

## Unlinking After Testing

When you're ready to publish and use the real npm package:

```powershell
# In backend directory
cd D:\my_cource\medusa\001\backend

# Unlink the local plugin
npm unlink @montaekung/medusa-plugin-frisbii-pay

# Install from npm (after publishing)
npm install @montaekung/medusa-plugin-frisbii-pay@0.1.0-beta.1

# Or if not published yet, keep using link
```

## Summary Checklist

Before moving to production:

- [ ] Plugin builds without errors: `npm run build`
- [ ] npm link created in plugin directory
- [ ] Plugin linked in backend
- [ ] Backend medusa-config.js updated
- [ ] Environment variables set in .env
- [ ] Old local modules removed
- [ ] Backend rebuilt: `npm run build`
- [ ] Migrations run: `npx medusa migrations run`
- [ ] Backend starts: `npm run dev`
- [ ] Plugin loads (check logs)
- [ ] Admin endpoints work (config, verify-connection)
- [ ] Store endpoints work (config)
- [ ] Test payment completes successfully
- [ ] Database tables populated correctly
- [ ] No errors in logs

## Command Reference

### One-Time Setup (Run Once)

| Step | Command | Directory | Purpose |
|------|---------|-----------|---------|
| Build plugin | `npm run build` | Plugin | Compile TypeScript |
| Create link | `npm link` | Plugin | Create global symlink |
| Link in backend | `npm link @montaekung/medusa-plugin-frisbii-pay` | Backend | Use local plugin |
| Run migrations | `npx medusa migrations run` | Backend | Create database tables |

### Daily Development (Every Code Change)

| Step | Command | Directory | Required? | Purpose |
|------|---------|-----------|-----------|---------|
| Edit code | - | Plugin | - | Make changes in `src/` |
| **Build plugin** | **`npm run build`** | **Plugin** | **✅ YES** | **Compile TypeScript** |
| **Restart backend** | **`npm run dev`** | **Backend** | **✅ YES** | **Load new code** |
| Test | API calls | - | - | Verify changes work |

### Cleanup (When Done Testing)

| Step | Command | Directory | Purpose |
|------|---------|-----------|---------|
| Unlink backend | `npm unlink @montaekung/medusa-plugin-frisbii-pay` | Backend | Remove symlink |
| Install from npm | `npm install @montaekung/medusa-plugin-frisbii-pay@version` | Backend | Use published package |

## Next Steps

After local testing succeeds:

1. **Publish Beta**: `npm publish --tag beta --access public`
2. **Test Beta in Backend**: `npm install @montaekung/medusa-plugin-frisbii-pay@beta`
3. **Gather Feedback**: Test with real scenarios
4. **Publish Stable**: `npm publish --access public`

## Additional Resources

- [Testing Guide](./TESTING.md) - Complete testing documentation
- [Installation Guide](./INSTALLATION.md) - Production installation
- [Troubleshooting](./TROUBLESHOOTING.md) - Common issues
- [API Reference](./API_REFERENCE.md) - Endpoint documentation

---

**Good luck with local testing!** 🚀

If you encounter issues not covered here, check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) or create an issue on GitHub.
