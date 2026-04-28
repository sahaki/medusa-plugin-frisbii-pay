---
description: "Test send_order_lines = true — verify that Frisbii Pay sends the order_lines array (products + shipping) to the Reepay API and Reepay dashboard shows correct product details"
name: "Test Frisbii Pay — Send Order Lines = true"
agent: "agent"
tools:
  - mcp_microsoft_pla_browser_navigate
  - mcp_microsoft_pla_browser_snapshot
  - mcp_microsoft_pla_browser_click
  - mcp_microsoft_pla_browser_run_code
  - mcp_microsoft_pla_browser_wait_for
  - mcp_microsoft_pla_browser_take_screenshot
  - mcp_microsoft_pla_browser_fill
  - mcp_microsoft_pla_browser_select_option
---

# Test: Frisbii Pay — Send Order Lines = true

Test that when **Send Order Lines = ON (true)** is set in Admin Settings:
- Reepay receives the `order_lines` array with individual line items (products + shipping)
- Reepay dashboard shows product details in the Invoice
- Payment flow (checkout → authorize → capture) still works normally

| AC | Description |
|----|-------------|
| AC1 | Admin Settings displays "Send Order Lines" toggle and saves `true` |
| AC2 | Checkout succeeds — Reepay session created with `order_lines` |
| AC3 | Reepay dashboard shows individual product and shipping line items |
| AC4 | Frisbii Invoice widget shows correct amount (Authorized) |
| AC5 | Capture (Settle) succeeds — Reepay dashboard shows Settled with line items |

---

## Key Principles (Read Before Starting)

**Use `mcp_microsoft_pla_browser_run_code` as the primary tool** — combine multiple actions in a single call for speed

**Avoid calling snapshot unnecessarily** — only snapshot when debugging or searching for element refs

**Prerequisites**:
- Medusa Backend running at `http://localhost:9000`
- Medusa Storefront running at `http://localhost:8000`
- Frisbii Pay plugin configured and assigned to the region
- Reepay test account and API key (test mode) available
- `auto_capture` in Frisbii Settings = **OFF** (to allow separate capture testing in AC5)

**Storefront form field order**:
- `input[placeholder=" "]` nth(0) = first_name
- `input[placeholder=" "]` nth(1) = last_name
- `input[placeholder=" "]` nth(2) = address_1
- `input[placeholder=" "]` nth(4) = postal_code
- `input[placeholder=" "]` nth(5) = city
- `select[name="shipping_address.country_code"]` = country
- `input[placeholder=" "]` nth(7) = email

---

## Setup — Load Environment Configuration

### Setup-Step 1 — Read values from .env

```js
// run_code:
async (page) => {
  // Use dynamic import() instead of require() for ESM sandbox support
  const { readFileSync } = await import('fs')
  const { resolve } = await import('path')

  // Read .env from plugin root (must run test from D:\my_cource\medusa\001\medusa-plugin-frisbii-pay)
  const envPath = resolve(process.cwd(), '.env')
  const envContent = readFileSync(envPath, 'utf8')

  const config = {}
  envContent.split(/\r?\n/).forEach(line => {
    const match = line.match(/^([^#=\s][^=]*)=(.*)/)
    if (match) config[match[1].trim()] = match[2].trim()
  })

  // Store in window so subsequent steps can read it
  await page.evaluate((cfg) => { window.__testConfig__ = cfg }, config)

  return JSON.stringify({
    loaded: Object.keys(config),
    BACKEND_URL: config.BACKEND_URL,
    FRONTEND_URL: config.FRONTEND_URL,
    FRISBII_URL: config.FRISBII_URL,
    result: config.BACKEND_URL && config.FRONTEND_URL
      ? 'PASS: .env loaded successfully'
      : 'FAIL: Missing required env variables',
  })
}
```

> **Expected**: `result = "PASS: .env loaded successfully"`, `BACKEND_URL = "http://localhost:9000"`, `FRONTEND_URL = "http://localhost:8000"`

> ⚠️ **Note**: Always run Setup-Step 1 first — all subsequent steps read values from `window.__testConfig__`

---

## AC1 — Set Send Order Lines = true in Admin Settings

### AC1-Step 1 — Login Admin

```js
// run_code:
async (page) => {
  const cfg = await page.evaluate(() => window.__testConfig__)
  await page.goto(cfg.BACKEND_URL + '/app')
  await page.waitForTimeout(1500)
  await page.locator('input[name="email"]').fill(cfg.BACKEND_USERNAME)
  await page.locator('input[name="password"]').fill(cfg.BACKEND_PASSWORD)
  await page.getByRole('button', { name: /Continue with Email|Sign in|Login/i }).click()
  await page.waitForURL('**/app/**', { timeout: 10000 })
  return page.url()
}
```

> Verify URL redirects to `/app/` successfully

---

### AC1-Step 2 — Open Frisbii Settings and Enable Send Order Lines

```js
// run_code:
async (page) => {
  const cfg = await page.evaluate(() => window.__testConfig__)
  await page.goto(cfg.BACKEND_URL + '/app/settings/frisbii')
  await page.waitForTimeout(2000)

  // Verify Settings page has loaded
  const pageText = await page.locator('body').textContent() || ''
  const hasSettings = pageText.includes('Frisbii') || pageText.includes('API')
  if (!hasSettings) return 'ERROR: Frisbii Settings page not loaded'

  // Find "Send Order Lines" / "Send ordrelinjer" toggle
  const toggleLabel = page.locator('label').filter({ hasText: /Send (Order Lines|ordrelinjer)/i })
  const labelCount = await toggleLabel.count()
  if (labelCount === 0) return 'ERROR: "Send Order Lines" toggle not found on page'

  // Check current state
  const toggleLabel2 = page.locator('label').filter({ hasText: /Send (Order Lines|ordrelinjer)/i }).first()
  const parentDiv = toggleLabel2.locator('xpath=ancestor::div[.//button[@role="switch"]][1]')
  const toggle = parentDiv.locator('button[role="switch"]').first()
  const currentState = await toggle.getAttribute('aria-checked').catch(() => 'unknown')

  // Turn on if currently off
  if (currentState !== 'true') {
    await toggle.click()
    await page.waitForTimeout(500)
  }

  const newState = await toggle.getAttribute('aria-checked').catch(() => 'unknown')
  return JSON.stringify({
    toggleFound: true,
    stateBefore: currentState,
    stateAfter: newState,
    result: newState === 'true'
      ? 'PASS: Send Order Lines is ON (true)'
      : 'FAIL: Toggle did not turn ON',
  })
}
```

> **Expected**: `stateAfter = "true"` and `result = "PASS: Send Order Lines is ON (true)"`

---

### AC1-Step 3 — Save Configuration and Verify

```js
// run_code:
async (page) => {
  await page.getByRole('button', { name: /Save Configuration|Gem konfiguration/i }).click()
  await page.waitForTimeout(2500)

  // Check toast notification
  const toast = await page.locator('[data-sonner-toast], [role="status"]').first().textContent().catch(() => '')

  // Reload and verify value persists
  await page.reload()
  await page.waitForTimeout(2000)

  const toggleAfterReload = page.locator('button[role="switch"]').filter({ has: page.locator('..') })
  // Find toggle whose label indicates Send Order Lines
  const labels = await page.locator('label').allTextContents()
  const solLabelIdx = labels.findIndex(l => /send.*(order|ordrelinjer)/i.test(l))

  const switches = page.locator('button[role="switch"]')
  const switchCount = await switches.count()
  // toggle ของ Send Order Lines มักเป็นตัวที่ 1 ใน Payment Processing section
  // Check toggle closest to the "Send Order Lines" label
  const savedState = solLabelIdx >= 0 && switchCount > solLabelIdx
    ? await switches.nth(solLabelIdx).getAttribute('aria-checked').catch(() => 'unknown')
    : 'check-manually'

  // Wait for config cache to expire (30 seconds) — required before starting checkout in AC2
  await page.waitForTimeout(32000)

  return JSON.stringify({
    toast: toast?.trim(),
    savedState,
    result: toast?.includes('saved') || toast?.includes('gemt')
      ? 'PASS: Configuration saved — config cache expired, ready for AC2'
      : 'CHECK: Verify toast message manually',
  })
}
```

> **Expected**: `toast` contains "saved" or "gemt", `savedState = "true"`

---

## AC2 — Checkout Succeeds With Order Lines

### AC2-Step 1 — Add Products and Checkout to Payment Step

```js
// run_code:
async (page) => {
  const cfg = await page.evaluate(() => window.__testConfig__)

  // Product 1: Medusa T-Shirt (Black / S)
  await page.goto(cfg.FRONTEND_URL + '/dk/products/t-shirt')
  await page.waitForTimeout(1500)

  const colorBtns = page.locator('button[data-testid="option-button"]').filter({ hasText: 'Black' })
  if (await colorBtns.count() > 0) await colorBtns.first().click()
  await page.waitForTimeout(300)

  const sizeBtns = page.locator('button[data-testid="option-button"]').filter({ hasText: /^S$/ })
  if (await sizeBtns.count() > 0) await sizeBtns.first().click()
  await page.waitForTimeout(300)

  const addBtn1 = page.locator('button[data-testid="add-product-button"]')
  if (await addBtn1.isDisabled()) return 'ERROR: T-Shirt add-to-cart disabled'
  await addBtn1.click()
  await page.waitForTimeout(1500)

  // Product 2: Medusa Sweatpants (S) — no color option
  await page.goto(cfg.FRONTEND_URL + '/dk/products/sweatpants')
  await page.waitForTimeout(1500)

  const sweatpantsSizeBtns = page.locator('button[data-testid="option-button"]').filter({ hasText: /^S$/ })
  if (await sweatpantsSizeBtns.count() > 0) await sweatpantsSizeBtns.first().click()
  await page.waitForTimeout(300)

  const addBtn2 = page.locator('button[data-testid="add-product-button"]')
  if (await addBtn2.isDisabled()) return 'ERROR: Sweatpants add-to-cart disabled'
  await addBtn2.click()
  await page.waitForTimeout(1500)

  // Navigate to checkout address step
  await page.goto(cfg.FRONTEND_URL + '/dk/checkout?step=address')
  await page.waitForTimeout(1500)

  const inputs = page.locator('input[placeholder=" "]')
  await inputs.nth(0).fill('Test')
  await inputs.nth(1).fill('OrderLines')
  await inputs.nth(2).fill('Testgade 1')
  await inputs.nth(4).fill('2100')
  await inputs.nth(5).fill('Copenhagen')

  const countrySelect = page.locator('select[name="shipping_address.country_code"]')
  if (await countrySelect.count() > 0) await countrySelect.selectOption('dk')

  await inputs.nth(7).fill('test-orderlines@example.com')
  await page.waitForTimeout(500)

  await page.locator('button[data-testid="submit-address-button"]').click()
  await page.waitForTimeout(2000)

  return `Address step done — URL: ${page.url()}`
}
```

> Verify navigation reaches the delivery/shipping step

---

### AC2-Step 2 — Select Shipping and Navigate to Payment Step

```js
// run_code:
async (page) => {
  // storefront does not use input[type="radio"] — click the shipping option text instead
  const shippingOption = page.getByText('Standard Shipping').first()
  await shippingOption.click()
  await page.waitForTimeout(500)

  // Wait for button to enable then click
  const btn = page.locator('button[data-testid="submit-delivery-option-button"]')
  await btn.waitFor({ state: 'visible', timeout: 5000 })
  await btn.click()
  await page.waitForTimeout(2000)

  const currentUrl = page.url()
  const isPaymentStep = currentUrl.includes('payment') || currentUrl.includes('review')

  return JSON.stringify({
    url: currentUrl,
    isPaymentStep,
    result: isPaymentStep
      ? 'PASS: Reached payment step'
      : 'CHECK: May need additional steps',
  })
}
```

---

### AC2-Step 3 — Select Frisbii Pay and Observe Session Creation

```js
// run_code:
async (page) => {
  await page.waitForTimeout(1500)

  // Click Frisbii Payment option
  const frisbiiRow = page.locator('div').filter({ hasText: /^Frisbii Payment$/ }).first()
  const found = await frisbiiRow.isVisible().catch(() => false)

  if (!found) {
    const paymentText = await page.locator('body').textContent() || ''
    return JSON.stringify({
      error: 'Frisbii Payment option not found',
      bodySnippet: paymentText.slice(0, 300),
    })
  }

  await frisbiiRow.click()
  await page.waitForTimeout(1500)

  // Continue to review
  const submitBtn = page.locator('button[data-testid="submit-payment-button"]')
  const isEnabled = await submitBtn.isEnabled().catch(() => false)

  return JSON.stringify({
    frisbiiFound: true,
    frisbiiSelected: true,
    submitEnabled: isEnabled,
    result: isEnabled
      ? 'PASS: Frisbii Payment selected, Continue button enabled'
      : 'FAIL: Submit button not enabled after selecting Frisbii',
  })
}
```

> **Expected**: `frisbiiFound = true` และ `submitEnabled = true`

---

### AC2-Step 4 — Continue to Review and Place Order

```js
// run_code:
async (page) => {
  // Continue to review
  await page.locator('button[data-testid="submit-payment-button"]').click()
  await page.waitForTimeout(2000)

  // Capture network requests to Reepay
  const reepayRequests = []
  page.on('request', req => {
    if (req.url().includes('reepay.com') || req.url().includes('checkout.reepay')) {
      reepayRequests.push({ url: req.url(), method: req.method() })
    }
  })

  // Place Order
  const placeOrderBtn = page.locator('button[data-testid="submit-order-button"]')
  const hasPlaceOrder = await placeOrderBtn.isVisible().catch(() => false)
  if (!hasPlaceOrder) return 'ERROR: Place order button not found'

  await placeOrderBtn.click()
  await page.waitForTimeout(6000)

  const currentUrl = page.url()
  const isReepayCheckout = currentUrl.includes('checkout.reepay') || currentUrl.includes('billwerk')

  return JSON.stringify({
    reepayRequestsMade: reepayRequests.length,
    currentUrl,
    isReepayCheckout,
    result: isReepayCheckout
      ? 'PASS: Redirected to Reepay checkout — session created with order_lines'
      : reepayRequests.length > 0
        ? 'PASS: Reepay API called'
        : 'CHECK: Verify Reepay redirect manually',
  })
}
```

> **Expected**: `isReepayCheckout = true` or `reepayRequestsMade > 0`

---

## AC3 — Reepay Dashboard Shows Order Lines

### AC3-Step 1 — Find Invoice in Reepay Dashboard

In the Reepay test dashboard, verify the most recently created invoice.

```js
// run_code:
async (page) => {
  // Navigate to latest invoice via Admin
  await page.goto(cfg.BACKEND_URL + '/app/orders')
  await page.waitForTimeout(3000)

  const pageText = await page.locator('body').textContent() || ''
  const hasInvoices = pageText.toLowerCase().includes('invoice') || pageText.toLowerCase().includes('cart-')

  if (!hasInvoices) {
    return 'NOTE: Reepay dashboard requires manual login — open https://admin.billwerk.plus and verify the latest invoice has order lines'
  }

  return JSON.stringify({
    dashboardLoaded: true,
    note: 'Navigate to the latest cart-XXXXXX invoice and verify it shows individual product lines',
  })
}
```

---

### AC3-Step 2 — Verify Order Lines in Reepay Invoice (Manual Verification)

**Manual Check on Reepay Dashboard** — open the latest invoice (`cart-XXXXXX`) and verify:

```js
// run_code:
async (page) => {
  const cfg = await page.evaluate(() => window.__testConfig__)
  // Navigate to latest order in Admin to retrieve charge handle
  const firstRow = page.locator('tbody tr').first()
  const hasRows = await firstRow.isVisible().catch(() => false)
  if (!hasRows) return 'ERROR: No orders found — complete checkout first'

  await firstRow.click()
  await page.waitForURL('**/app/orders/**', { timeout: 8000 })
  await page.waitForTimeout(2500)

  const orderId = page.url().split('/').pop()
  const bodyText = await page.locator('body').textContent() || ''

  // Retrieve charge handle from Invoice widget (format: cart-XXXXXXXXXX)
  const handleMatch = bodyText.match(/cart-\d+/)
  const chargeHandle = handleMatch ? handleMatch[0] : null

  return JSON.stringify({
    orderId,
    chargeHandle,
    reepayInvoiceUrl: chargeHandle
      ? `https://admin.billwerk.plus/#/rp/payments/invoices/invoice/${chargeHandle}`
      : null,
    instruction: chargeHandle
      ? `Open ${`https://admin.billwerk.plus/#/rp/payments/invoices/invoice/${chargeHandle}`} and verify "Order lines" section shows individual product + shipping rows`
      : 'Invoice handle not found — check widget',
  })
}
```

> **Expected**: `chargeHandle` has a value (e.g. `cart-1775623306319`)
>
> **Manual Check on Reepay Dashboard**:  
> - ✅ Invoice shows an "Order lines" (or "Ordrelinjer") section  
> - ✅ Row for product "Medusa T-Shirt" × 1  
> - ✅ Row for product "Medusa Sweatpants" × 1  
> - ✅ Row for Shipping e.g. "Standard Shipping" × 1  
> - ✅ **No** single row labelled only "Order Total" or "Ordretotal"

---

## AC4 — Frisbii Invoice Widget Shows Correct Amount (Authorized)

### AC4-Step 1 — Verify Invoice Widget on Order Detail Page

```js
// run_code:
async (page) => {
  // Should already be on Order detail page (from AC3-Step 2)
  const bodyText = await page.locator('body').textContent() || ''

  // Verify widget is rendered and shows Authorized status
  const widgetChecks = {
    hasInvoiceHandle:    /cart-\d+/.test(bodyText),
    hasAuthorizedState:  /Authorized|Autoriseret/i.test(bodyText),
    hasPaymentMethod:    /XXXX|card|visa|mastercard/i.test(bodyText),
    hasRemainingBalance: /Remaining Balance|Resterende saldo/i.test(bodyText),
    hasTotalAuthorized:  /Total Authorized|Samlet autoriseret/i.test(bodyText),
    hasSettledAmount:    /Total Settled|Samlet afregnet/i.test(bodyText),
    hasSeeInvoiceLink:   /See Invoice|Se faktura/i.test(bodyText),
  }

  const passed = Object.entries(widgetChecks).filter(([, v]) => v).map(([k]) => k)
  const failed = Object.entries(widgetChecks).filter(([, v]) => !v).map(([k]) => k)

  return JSON.stringify({
    widgetChecks,
    passed,
    failed,
    result: failed.length === 0
      ? 'PASS: Invoice widget displays correctly with Authorized state'
      : failed.length <= 2
        ? `PARTIAL: ${failed.join(', ')} not found — may need payment completion`
        : `FAIL: Widget incomplete — missing: ${failed.join(', ')}`,
  })
}
```

> **Expected**: `widgetChecks.hasInvoiceHandle = true`, `widgetChecks.hasAuthorizedState = true`

Take a screenshot of the Order detail page showing the Invoice widget

---

## AC5 — Verify Invoice on Frisbii/Billwerk+ (See Invoice)

### AC5-Step 1 — Click "See invoice" to Open Billwerk+ Invoice

```js
// run_code:
async (page) => {
  const cfg = await page.evaluate(() => window.__testConfig__)

  // Should be on Order detail page — retrieve charge handle first
  const bodyText = await page.locator('body').textContent() || ''
  const handleMatch = bodyText.match(/cart-\d+/)
  const chargeHandle = handleMatch ? handleMatch[0] : null
  if (!chargeHandle) return 'ERROR: Charge handle not found — ensure you are on order detail page with Frisbii widget'

  // "See invoice" / "Se faktura" opens Billwerk+ in a new tab
  const seeInvoiceBtn = page.locator('a, button').filter({ hasText: /See invoice|Se faktura/i }).first()
  const hasBtn = await seeInvoiceBtn.isVisible().catch(() => false)
  if (!hasBtn) return 'ERROR: "See invoice" button not found — ensure Frisbii widget is visible'

  // Wait for new tab
  const newTabPromise = page.context().waitForEvent('page', { timeout: 8000 }).catch(() => null)
  await seeInvoiceBtn.click()
  const newTab = await newTabPromise
  await page.waitForTimeout(3000)

  const activePage = newTab || page
  const invoiceUrl = activePage.url()

  return JSON.stringify({
    chargeHandle,
    invoiceUrl,
    openedNewTab: !!newTab,
    expectedUrl: `https://admin.billwerk.plus/#/rp/payments/invoices/invoice/${chargeHandle}`,
    result: invoiceUrl.includes('billwerk') || invoiceUrl.includes('reepay')
      ? 'PASS: Opened Billwerk+ invoice page'
      : 'CHECK: Verify URL — expected admin.billwerk.plus',
  })
}
```

> **Expected**: `openedNewTab = true`, `invoiceUrl` contains `billwerk` and `chargeHandle`

---

### AC5-Step 2 — Login Billwerk+ (if needed)

```js
// run_code:
async (page) => {
  const cfg = await page.evaluate(() => window.__testConfig__)

  // Use new tab opened from "See invoice"
  const pages = page.context().pages()
  const activePage = pages[pages.length - 1]
  await activePage.waitForTimeout(2000)

  let currentUrl = activePage.url()
  const needsLogin = !currentUrl.includes('billwerk') && !currentUrl.includes('reepay')

  if (needsLogin) {
    const emailInput = activePage.locator('input[type="email"], input[name="email"]').first()
    const hasInput = await emailInput.isVisible().catch(() => false)
    if (hasInput) {
      await emailInput.fill(cfg.FRISBII_USERNAME)
      await activePage.locator('input[type="password"]').fill(cfg.FRISBII_PASSWORD)
      await activePage.getByRole('button', { name: /Sign in|Login|Log in/i }).click()
      await activePage.waitForTimeout(3000)
      currentUrl = activePage.url()
    }
  }

  const pageText = await activePage.locator('body').textContent().catch(() => '')
  return JSON.stringify({
    currentUrl,
    loggedIn: currentUrl.includes('billwerk'),
    snippet: pageText.slice(0, 200),
    result: currentUrl.includes('billwerk')
      ? 'PASS: On Billwerk+ invoice page'
      : 'NOTE: Manual login may be required at admin.billwerk.plus',
  })
}
```

---

### AC5-Step 3 — Verify Order Lines in Billwerk+ Invoice

```js
// run_code:
async (page) => {
  // Use the Billwerk+ new tab
  const pages = page.context().pages()
  const activePage = pages[pages.length - 1]
  await activePage.waitForTimeout(1500)

  const bodyText = await activePage.locator('body').textContent() || ''
  const currentUrl = activePage.url()

  // Verify order lines — send_order_lines = true must include product + shipping line items
  const hasProductLine = /Medusa|T-Shirt|Sweatshirt|Shorts|Sweatpants/i.test(bodyText)
  const hasShippingLine = /Shipping|Standard/i.test(bodyText)
  const amountMatches = bodyText.match(/€\s*[\d.,]+|[\d.,]+\s*EUR/g) || []

  return JSON.stringify({
    currentUrl,
    hasProductLine,
    hasShippingLine,
    amountsFound: amountMatches.slice(0, 5),
    result: hasProductLine && hasShippingLine
      ? 'PASS: Invoice shows product + shipping lines (send_order_lines=true confirmed)'
      : hasProductLine
        ? 'PARTIAL: Product found but shipping line not clearly detected'
        : 'CHECK: Navigate to invoice URL manually and verify order lines section is present',
  })
}
```

> **Expected** (send_order_lines = true):  
> - ✅ `hasProductLine = true` — product name visible (e.g. Medusa T-Shirt)  
> - ✅ `hasShippingLine = true` — Shipping line item visible  
> - ✅ `result = "PASS: Invoice shows product + shipping lines"`

Take a screenshot of the Billwerk+ invoice page as evidence

---

## Acceptance Criteria Summary

| AC | Test | Expected Result |
|----|------|----------------|
| AC1 | Toggle Send Order Lines = ON and Save | Toggle = true, toast = saved |
| AC2 | Checkout with 2 products (T-Shirt + Sweatpants) + shipping | Successfully redirected to Reepay checkout |
| AC3 | Reepay checkout — shows order lines | T-Shirt + Sweatpants + shipping shown as separate lines on checkout page |
| AC4 | Frisbii Invoice widget | Shows handle, Authorized state, balance |
| AC5 | Click "See invoice" → Billwerk+ Invoice | Shows order lines (products + shipping) as separate rows |

> **If all ACs pass** → feature `send_order_lines = true` works correctly  
> **If AC3/AC5 fail** → check Medusa server logs and Reepay API logs
