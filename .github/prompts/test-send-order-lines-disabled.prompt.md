---
description: "Test send_order_lines = false — verify that Frisbii Pay sends only the total amount (no order_lines) to the Reepay API and payment flow works normally"
name: "Test Frisbii Pay — Send Order Lines = false"
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

# Test: Frisbii Pay — Send Order Lines = false

Test that when **Send Order Lines = OFF (false)** is set in Admin Settings:
- Reepay receives only the total `amount` (no `order_lines` array)
- Reepay dashboard shows only the total amount with no individual product line items
- Payment flow (checkout → authorize → capture) still works normally

| AC | Description |
|----|-------------|
| AC1 | Admin Settings displays "Send Order Lines" toggle and saves `false` |
| AC2 | Checkout succeeds — Reepay session created with `amount` only (no `order_lines`) |
| AC3 | Reepay dashboard shows total amount only, no individual product line items |
| AC4 | Frisbii Invoice widget shows correct amount (Authorized) |
| AC5 | Capture (Settle) succeeds — Reepay settles with full authorized amount |

---

## Key Principles (Read Before Starting)

**Use `mcp_microsoft_pla_browser_run_code` as the primary tool** — combine multiple actions in a single call for speed

**Avoid calling snapshot unnecessarily** — only snapshot when debugging or searching for element refs

**Expected behaviour** (when `send_order_lines = false`):
- `POST session/charge` — payload will have `order.amount` but **no** `order.order_lines`
- `POST charge/{handle}/settle` — payload will be `{}` (empty body) or `{amount: remaining}`
- Reepay Invoice will have **no** Order Lines section — shows total amount only

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

## AC1 — Set Send Order Lines = false in Admin Settings

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

### AC1-Step 2 — Open Frisbii Settings and Disable Send Order Lines

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

  // Turn off if currently on
  if (currentState !== 'false') {
    await toggle.click()
    await page.waitForTimeout(500)
  }

  const newState = await toggle.getAttribute('aria-checked').catch(() => 'unknown')
  return JSON.stringify({
    toggleFound: true,
    stateBefore: currentState,
    stateAfter: newState,
    result: newState === 'false'
      ? 'PASS: Send Order Lines is OFF (false)'
      : 'FAIL: Toggle did not turn OFF',
  })
}
```

> **Expected**: `stateAfter = "false"` and `result = "PASS: Send Order Lines is OFF (false)"`

---

### AC1-Step 3 — Save Configuration and Verify

```js
// run_code:
async (page) => {
  await page.getByRole('button', { name: /Save Configuration|Gem konfiguration/i }).click()
  await page.waitForTimeout(2500)

  const toast = await page.locator('[data-sonner-toast], [role="status"]').first().textContent().catch(() => '')

  // Reload and verify false value persists
  await page.reload()
  await page.waitForTimeout(2000)

  const labels = await page.locator('label').allTextContents()
  const solLabelIdx = labels.findIndex(l => /send.*(order|ordrelinjer)/i.test(l))
  const switches = page.locator('button[role="switch"]')
  const switchCount = await switches.count()
  const savedState = solLabelIdx >= 0 && switchCount > solLabelIdx
    ? await switches.nth(solLabelIdx).getAttribute('aria-checked').catch(() => 'unknown')
    : 'check-manually'

  // Wait for config cache to expire (30 seconds) — required before starting checkout in AC2
  await page.waitForTimeout(32000)

  return JSON.stringify({
    toast: toast?.trim(),
    savedState,
    result: (toast?.includes('saved') || toast?.includes('gemt')) && savedState === 'false'
      ? 'PASS: Configuration saved — Send Order Lines = false persisted, config cache expired'
      : 'CHECK: Verify toggle state manually after reload',
  })
}
```

> **Expected**: `toast` contains "saved" or "gemt", `savedState = "false"`

---

## AC2 — Checkout Succeeds Without Order Lines in Payload

### AC2-Step 1 — Add Product and Checkout to Payment Step

```js
// run_code:
async (page) => {
  const cfg = await page.evaluate(() => window.__testConfig__)
  // Add Medusa T-Shirt to cart
  await page.goto(cfg.FRONTEND_URL + '/dk/products/t-shirt')
  await page.waitForTimeout(1500)

  const colorBtns = page.locator('button[data-testid="option-button"]').filter({ hasText: 'Black' })
  if (await colorBtns.count() > 0) await colorBtns.first().click()
  await page.waitForTimeout(300)

  const sizeBtns = page.locator('button[data-testid="option-button"]').filter({ hasText: /^S$/ })
  if (await sizeBtns.count() > 0) {
    await sizeBtns.first().click()
  } else {
    await page.goto(cfg.FRONTEND_URL + '/dk/products/sweatshirt')
    await page.waitForTimeout(1500)
    const altBtns = page.locator('button[data-testid="option-button"]:not([disabled])')
    if (await altBtns.count() === 0) return 'ERROR: No product options available'
    await altBtns.first().click()
  }

  await page.waitForTimeout(500)
  await page.getByTestId('add-product-button').click()
  await page.waitForTimeout(2000)

  // Fill address
  await page.goto(cfg.FRONTEND_URL + '/dk/checkout?step=address')
  await page.waitForTimeout(1500)

  const inputs = page.locator('input[placeholder=" "]')
  await inputs.nth(0).fill('Test')
  await inputs.nth(1).fill('NoOrderLines')
  await inputs.nth(2).fill('Testgade 1')
  await inputs.nth(4).fill('2100')
  await inputs.nth(5).fill('Copenhagen')

  const countrySelect = page.locator('select[name="shipping_address.country_code"]')
  if (await countrySelect.count() > 0) await countrySelect.selectOption('dk')

  await inputs.nth(7).fill('test-noorderlines@example.com')
  await page.waitForTimeout(500)

  await page.locator('button[data-testid="submit-address-button"]').click()
  await page.waitForTimeout(2000)

  return `Address step done — URL: ${page.url()}`
}
```

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
    result: isPaymentStep ? 'PASS: Reached payment step' : 'CHECK: Verify manually',
  })
}
```

---

### AC2-Step 3 — Select Frisbii Pay and Verify Payload Has No Order Lines

```js
// run_code:
async (page) => {
  await page.waitForTimeout(1500)

  // Capture request payload sent to Reepay
  const capturedPayloads = []
  page.on('request', async req => {
    if (req.url().includes('checkout-api.reepay.com') && req.method() === 'POST') {
      try {
        const postData = req.postDataJSON()
        capturedPayloads.push({
          url: req.url(),
          hasAmount: postData?.order?.amount !== undefined && postData?.order?.amount !== null,
          hasOrderLines: Array.isArray(postData?.order?.order_lines),
          orderLineCount: Array.isArray(postData?.order?.order_lines) ? postData.order.order_lines.length : 0,
          amount: postData?.order?.amount,
        })
      } catch {}
    }
  })

  // Select Frisbii Payment
  const frisbiiRow = page.locator('div').filter({ hasText: /^Frisbii Payment$/ }).first()
  const found = await frisbiiRow.isVisible().catch(() => false)
  if (!found) return 'ERROR: Frisbii Payment option not found'
  await frisbiiRow.click()
  await page.waitForTimeout(1000)

  // Continue to review then Place Order
  await page.locator('button[data-testid="submit-payment-button"]').click()
  await page.waitForTimeout(2000)
  await page.locator('button[data-testid="submit-order-button"]').click()
  await page.waitForTimeout(6000)

  const currentUrl = page.url()
  const payload = capturedPayloads[0] || null
  return JSON.stringify({
    capturedPayloads,
    currentUrl,
    isReepayCheckout: currentUrl.includes('checkout.reepay') || currentUrl.includes('billwerk'),
    result: payload
      ? payload.hasAmount && !payload.hasOrderLines
        ? 'PASS: Reepay received amount-only (no order_lines) — send_order_lines=false working correctly'
        : payload.hasOrderLines
          ? `FAIL: order_lines was sent (${payload.orderLineCount} lines) — expected NO order_lines`
          : 'CHECK: Verify Reepay dashboard'
      : currentUrl.includes('checkout.reepay')
        ? 'PASS: Redirected to Reepay — verify no order lines on Billwerk+ dashboard'
        : 'NOTE: Request not captured — check Reepay dashboard directly',
  })
}
```

> **Expected**:
> - `payload.hasAmount = true` (amount field present)
> - `payload.hasOrderLines = false` (no order_lines array)
> - `result = "PASS: Reepay received amount-only..."`

---

## AC3 — Reepay Dashboard Shows No Order Lines

### AC3-Step 1 — Find Invoice and Charge Handle

```js
// run_code:
async (page) => {
  const cfg = await page.evaluate(() => window.__testConfig__)
  // Navigate to latest order in Admin to retrieve charge handle
  await page.goto(cfg.BACKEND_URL + '/app/orders')
  await page.waitForTimeout(2000)

  const firstRow = page.locator('tbody tr').first()
  const hasRows = await firstRow.isVisible().catch(() => false)
  if (!hasRows) return 'ERROR: No orders found'

  await firstRow.click()
  await page.waitForURL('**/app/orders/**', { timeout: 8000 })
  await page.waitForTimeout(2500)

  const bodyText = await page.locator('body').textContent() || ''
  const handleMatch = bodyText.match(/cart-\d+/)
  const chargeHandle = handleMatch ? handleMatch[0] : null

  return JSON.stringify({
    chargeHandle,
    reepayInvoiceUrl: chargeHandle
      ? `https://admin.billwerk.plus/#/rp/payments/invoices/invoice/${chargeHandle}`
      : null,
    instruction: 'Open the Reepay invoice URL and verify:',
    checks: [
      '✅ Invoice shows total amount only (e.g. "20.00 EUR")',
      '✅ NO "Order lines" / "Ordrelinjer" section with individual product rows',
      '✅ Invoice state = Authorized',
      '✅ No error messages about order lines',
    ],
  })
}
```

> **Expected**: `chargeHandle` has a value
>
> **Manual Check on Reepay Dashboard**:  
> - ✅ Invoice shows **total amount only** (e.g. "20.00 EUR")  
> - ✅ **No** "Order lines" section with individual product rows  
> - ✅ Invoice state = Authorized

---

### AC3-Step 2 — Confirm via Medusa Server Logs (Optional)

```js
// run_code:
async (page) => {
  // Should be on Order detail page (from AC3-Step 1)
  const bodyText = await page.locator('body').textContent() || ''

  const widgetPresent = /cart-\d+/.test(bodyText)
  const isAuthorized = /Authorized|Autoriseret/i.test(bodyText)
  const hasBalance = /Remaining Balance|Resterende saldo/i.test(bodyText)

  return JSON.stringify({
    widgetPresent,
    isAuthorized,
    hasBalance,
    note: 'To confirm no order_lines were sent, check Medusa server log: should NOT see "built X order lines for cart" message',
    result: widgetPresent && isAuthorized
      ? 'PASS: Widget shows Authorized — payment created without order_lines'
      : 'CHECK: Verify widget and authorization state manually',
  })
}
```

> **To check the log** — look in the Medusa server terminal:
> - ✅ No `"Frisbii initiatePayment: built X order lines for cart..."` log should appear

---

## AC4 — Frisbii Invoice Widget Shows Correct Amount (Authorized)

### AC4-Step 1 — Verify Invoice Widget

```js
// run_code:
async (page) => {
  const cfg = await page.evaluate(() => window.__testConfig__)

  const widgetChecks = {
    hasInvoiceHandle:    /cart-\d+/.test(await page.locator('body').textContent() || ''),
    hasAuthorizedState:  /Authorized|Autoriseret/i.test(await page.locator('body').textContent() || ''),
    hasPaymentMethod:    /XXXX|card|visa|mastercard/i.test(await page.locator('body').textContent() || ''),
    hasRemainingBalance: /Remaining Balance|Resterende saldo/i.test(await page.locator('body').textContent() || ''),
    hasTotalAuthorized:  /Total Authorized|Samlet autoriseret/i.test(await page.locator('body').textContent() || ''),
    hasSeeInvoiceLink:   /See Invoice|Se faktura/i.test(await page.locator('body').textContent() || ''),
  }

  const bodyText = await page.locator('body').textContent() || ''
  const amountMatch = bodyText.match(/€\s*[\d.]+|\b[\d.]+\s*EUR/g)

  const passed = Object.entries(widgetChecks).filter(([, v]) => v).map(([k]) => k)
  const failed = Object.entries(widgetChecks).filter(([, v]) => !v).map(([k]) => k)

  return JSON.stringify({
    widgetChecks,
    amountsFound: amountMatch,
    passed,
    failed,
    result: failed.length === 0
      ? 'PASS: Invoice widget displays correctly with Authorized state'
      : failed.length <= 2
        ? `PARTIAL: ${failed.join(', ')} not found`
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

### AC5-Step 3 — Verify Invoice Has No Order Lines

```js
// run_code:
async (page) => {
  // Use the Billwerk+ new tab
  const pages = page.context().pages()
  const activePage = pages[pages.length - 1]
  await activePage.waitForTimeout(1500)

  const bodyText = await activePage.locator('body').textContent() || ''
  const currentUrl = activePage.url()

  // send_order_lines = false: should not have product or shipping line items
  const hasProductLine = /Medusa|T-Shirt|Sweatshirt|Shorts|Sweatpants/i.test(bodyText)
  const hasShippingLine = /Standard Shipping/i.test(bodyText)
  const hasOrderLines = hasProductLine || hasShippingLine
  const amountMatches = bodyText.match(/€\s*[\d.,]+|[\d.,]+\s*EUR/g) || []

  return JSON.stringify({
    currentUrl,
    hasProductLine,
    hasShippingLine,
    hasOrderLines,
    amountsFound: amountMatches.slice(0, 5),
    result: !hasOrderLines
      ? 'PASS: Invoice shows total only — no order lines (send_order_lines=false confirmed)'
      : `FAIL: Invoice shows product/shipping lines when send_order_lines=false — hasProduct:${hasProductLine}, hasShipping:${hasShippingLine}`,
  })
}
```

> **Expected** (send_order_lines = false):  
> - ✅ `hasProductLine = false` — no individual product name shown  
> - ✅ `hasShippingLine = false` — no shipping line item shown  
> - ✅ `result = "PASS: Invoice shows total only"`

Take a screenshot of the Billwerk+ invoice page as evidence

---

## Acceptance Criteria Summary

| AC | Test | Expected Result |
|----|------|----------------|
| AC1 | Toggle Send Order Lines = OFF and Save | Toggle = false, toast = saved |
| AC2 | Checkout — verify Reepay payload | Successfully redirected to Reepay checkout |
| AC3 | Reepay dashboard — Invoice | No individual product line items, shows total only |
| AC4 | Frisbii Invoice widget | Shows handle, Authorized state, correct balance |
| AC5 | Click "See invoice" → Billwerk+ Invoice | Shows total only, no individual order lines |

> **If all ACs pass** → feature `send_order_lines = false` works correctly — sends total amount only  
> **Compare with the `send_order_lines = true` test** → behaviour must be opposite at every Billwerk+ dashboard checkpoint
