---
description: "Test Danish (da_DK) locale translation in Frisbii Pay Plugin — covers Backend Admin Settings labels, Backend Order Widget labels, and Frontend Checkout labels"
name: "Test Frisbii Pay — Danish Locale Translation"
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

# Test: Frisbii Pay — Danish Locale Translation

Test **Danish (da_DK)** locale translation across 5 Acceptance Criteria:

| AC | Description |
|----|-------------|
| AC1 | Backend Admin Settings page displays labels in Danish when browser language = `da-DK` |
| AC2 | Backend Order Widget (Invoice) displays labels in Danish when browser language = `da-DK` |
| AC3 | Frontend Checkout — Payment button displays "Afgiv ordre" when locale = `da_DK` |
| AC4 | Frontend Overlay — Loading message displays "Åbner betalingsvindue..." when locale = `da_DK` |
| AC5 | Frontend Redirect — Loading message displays "Omdirigerer til betaling..." when locale = `da_DK` |

---

## Key Principles (Read Before Starting)

**Use `mcp_microsoft_pla_browser_run_code` as the primary tool** — combine multiple actions in a single call for speed

**Avoid calling snapshot unnecessarily** — only snapshot when debugging or searching for element refs

**Locale control differences — understand before testing**:

```
Admin UI (AC1, AC2)         → controlled by browser language (navigator.language)
                               must use page.addInitScript() to emulate da-DK
                               locale set in Admin Settings does NOT affect Admin UI labels

Frontend Checkout (AC3–AC5) → controlled by locale set in Admin Settings
                               locale is forwarded via payment session data to the frontend
                               no need to change browser language
```

**Prerequisites**:
- Medusa Backend running at `http://localhost:9000`
- Medusa Storefront running at `http://localhost:8000`
- Frisbii Pay plugin configured and assigned to the Denmark region
- At least one Order with Frisbii Pay payment in the system (for AC2)
- Storefront form field order:
  - `input[placeholder=" "]` nth(0) = first_name
  - `input[placeholder=" "]` nth(1) = last_name
  - `input[placeholder=" "]` nth(2) = address_1
  - `input[placeholder=" "]` nth(4) = postal_code
  - `input[placeholder=" "]` nth(5) = city
  - `select[name="shipping_address.country_code"]` = country
  - `input[placeholder=" "]` nth(7) = email

---

## Setup — Set locale = da_DK and Login (required before AC3–AC5)

Set locale = `da_DK` in Admin so the Frontend (AC3–AC5) receives the correct locale.

### Setup-Step 1 — Login Admin

```js
// run_code:
async (page) => {
  await page.goto('http://localhost:9000/app')
  await page.waitForTimeout(1500)
  await page.locator('input[name="email"], input[type="email"]').fill('boyd@radarsofthouse.dk')
  await page.locator('input[name="password"], input[type="password"]').fill('Test#1234')
  await page.getByRole('button', { name: /Sign in|Login/i }).click()
  await page.waitForURL('**/app/**', { timeout: 10000 })
  return page.url()
}
```

> Verify URL redirects to `/app/` — if not → take snapshot and report

---

### Setup-Step 2 — Set locale = da_DK and Save

```js
// run_code:
async (page) => {
  await page.goto('http://localhost:9000/app/settings/frisbii')
  await page.waitForTimeout(2000)

  // Find Locale select trigger
  const localeLabel = page.locator('label').filter({ hasText: /^(Sprog|Locale)$/i })
  const localeSection = localeLabel.locator('..').locator('..')
  const localeTrigger = localeSection.locator('button[role="combobox"]').first()

  await localeTrigger.click()
  await page.waitForTimeout(500)

  // Select Danish / Dansk
  const daOption = page.locator('[role="option"]').filter({ hasText: /Danish|Dansk/ }).first()
  const daVisible = await daOption.isVisible().catch(() => false)
  if (!daVisible) return 'ERROR: Danish (da_DK) option not found in dropdown'
  await daOption.click()
  await page.waitForTimeout(300)

  // Save
  await page.getByRole('button', { name: /Save Configuration|Gem konfiguration/i }).click()
  await page.waitForTimeout(2000)

  const toast = await page.locator('[data-sonner-toast], [role="status"]').first().textContent().catch(() => '')
  return JSON.stringify({ toast: toast?.trim(), note: 'locale=da_DK saved — ready for AC3–AC5' })
}
```

> Verify toast shows "Configuration saved" / "Konfiguration gemt"

---

## AC1 — Backend Admin Settings Displays Labels in Danish

Verify that when browser language = `da-DK`, the Settings page (`/app/settings/frisbii`) displays all labels in Danish via the `useAdminTranslation()` hook.

### AC1-Step 1 — Emulate Danish Browser Language and Open Settings Page

```js
// run_code:
async (page) => {
  // addInitScript runs before every page load — must call before goto
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'language', { get: () => 'da-DK' })
    Object.defineProperty(navigator, 'languages', { get: () => ['da-DK', 'da'] })
  })

  await page.goto('http://localhost:9000/app/settings/frisbii')
  await page.waitForTimeout(2500)

  const browserLang = await page.evaluate(() => navigator.language)
  return `Browser language emulated as: ${browserLang}`
}
```

> Verify output = `"Browser language emulated as: da-DK"`

---

### AC1-Step 2 — Verify Section Headings Are in Danish ✅

```js
// run_code:
async (page) => {
  const body = await page.locator('body').textContent() || ''

  const sectionChecks = {
    'API og forbindelse':  body.includes('API og forbindelse'),   // API & Connection
    'Betalingsvisning':    body.includes('Betalingsvisning'),     // Payment Display
    'Betalingsbehandling': body.includes('Betalingsbehandling'),  // Payment Processing
    'Gemte kort':          body.includes('Gemte kort'),           // Saved Cards
    'Betalingsmetoder':    body.includes('Betalingsmetoder'),     // Payment Methods
  }

  const allPassed = Object.values(sectionChecks).every(v => v)
  return JSON.stringify({
    sectionChecks,
    result: allPassed
      ? 'PASS: All section headings in Danish'
      : 'FAIL — some headings not found in Danish',
  })
}
```

> **Expected**: all keys = `true` and `result = "PASS: All section headings in Danish"`

---

### AC1-Step 3 — Verify Field Labels, Buttons, and Dropdown Options Are in Danish ✅

```js
// run_code:
async (page) => {
  const body = await page.locator('body').textContent() || ''

  const labelChecks = {
    // Payment Display section
    'Aktiveret':         body.includes('Aktiveret'),          // Enabled
    'Titel':             body.includes('Titel'),               // Title
    'Visningstype':      body.includes('Visningstype'),        // Display Type
    'Sprog':             body.includes('Sprog'),               // Locale (field label)
    'Indlejret':         body.includes('Indlejret'),           // Embedded (dropdown option)
    'Overlejring':       body.includes('Overlejring'),         // Overlay (dropdown option)
    'Omdirigering':      body.includes('Omdirigering'),        // Redirect (dropdown option)
    'Dansk':             body.includes('Dansk'),               // Danish (locale option)
    'Engelsk':           body.includes('Engelsk'),             // English (locale option)
    'Kommer snart':      body.includes('Kommer snart'),        // Coming soon (disabled badge)

    // API section
    'API-tilstand':      body.includes('API-tilstand'),        // API Mode
    'Test forbindelse':  body.includes('Test forbindelse'),    // Test Connection

    // Action button
    'Gem konfiguration': body.includes('Gem konfiguration'),   // Save Configuration
  }

  const allPassed = Object.values(labelChecks).every(v => v)
  return JSON.stringify({
    labelChecks,
    result: allPassed
      ? 'PASS: All labels in Danish'
      : 'FAIL — some labels not found in Danish',
  })
}
```

> **Expected**: all keys = `true` and `result = "PASS: All labels in Danish"`

---

### AC1-Step 4 — Verify Toggle Labels (Payment Processing) Are in Danish ✅

```js
// run_code:
async (page) => {
  const body = await page.locator('body').textContent() || ''

  const toggleChecks = {
    'Send ordrelinjer':   body.includes('Send ordrelinjer'),    // Send order lines
    'Send telefonnummer': body.includes('Send telefonnummer'),  // Send phone number
    // Use substring to avoid æ encoding issues
    'Automatisk h':       body.includes('Automatisk h'),        // Automatisk hævning (Auto Capture)
    'Gem kreditkort':     body.includes('Gem kreditkort'),      // Save card
  }

  const allPassed = Object.values(toggleChecks).every(v => v)
  return JSON.stringify({
    toggleChecks,
    result: allPassed
      ? 'PASS: All Processing labels in Danish'
      : 'FAIL — some toggle labels not found',
  })
}
```

> **Expected**: all keys = `true`

Take a screenshot of the full Settings page as evidence for AC1

---

## AC2 — Backend Order Widget Displays Labels in Danish

Verify that the Invoice widget (`frisbii-order-payment.tsx`) on the Order detail page displays labels in Danish when browser language = `da-DK`.

### AC2-Step 1 — Emulate Danish Browser Language and Navigate to Order List

```js
// run_code:
async (page) => {
  // Emulate Danish browser language before navigate
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'language', { get: () => 'da-DK' })
    Object.defineProperty(navigator, 'languages', { get: () => ['da-DK', 'da'] })
  })

  await page.goto('http://localhost:9000/app/orders')
  await page.waitForTimeout(2500)

  // Click the first order in the list
  const firstOrderRow = page.locator('tbody tr').first()
  const rowVisible = await firstOrderRow.isVisible().catch(() => false)
  if (!rowVisible) return 'ERROR: No orders in list — create a test order with Frisbii Pay first'

  await firstOrderRow.click()
  await page.waitForURL('**/app/orders/**', { timeout: 8000 })
  await page.waitForTimeout(2500)

  return page.url()
}
```

> Verify URL is `/app/orders/<orderId>` — if no orders exist, complete a checkout with Frisbii Pay first (see AC3)

---

### AC2-Step 2 — Verify Widget Card Labels Are in Danish ✅

```js
// run_code:
async (page) => {
  const body = await page.locator('body').textContent() || ''

  // Check if Frisbii widget is rendered on this page
  const hasWidget = body.includes('Fakturanummer') || body.includes('Betalingsmetode') || body.includes('Se faktura')
  if (!hasWidget) {
    return 'SKIP: Frisbii widget not visible on this order — navigate to an order that was paid with Frisbii Pay'
  }

  const widgetChecks = {
    // Card header / labels
    'Fakturanummer':      body.includes('Fakturanummer'),      // Invoice Handle
    'Status':             body.includes('Status'),              // Status
    'Betalingsmetode':    body.includes('Betalingsmetode'),    // Payment Method

    // Balance breakdown labels
    'Resterende saldo':   body.includes('Resterende saldo'),   // Remaining Balance
    'Samlet autoriseret': body.includes('Samlet autoriseret'), // Total Authorized
    'Samlet afregnet':    body.includes('Samlet afregnet'),    // Total Settled
    'Samlet refunderet':  body.includes('Samlet refunderet'),  // Total Refunded

    // Action button
    'Se faktura':         body.includes('Se faktura'),          // See Invoice
  }

  const allPassed = Object.values(widgetChecks).every(v => v)
  return JSON.stringify({
    widgetChecks,
    result: allPassed
      ? 'PASS: All widget labels in Danish'
      : 'FAIL — some widget labels not found in Danish',
  })
}
```

> **Expected**: all keys = `true` and `result = "PASS: All widget labels in Danish"`

---

### AC2-Step 3 — Verify Status Label Is in Danish ✅

```js
// run_code:
async (page) => {
  const body = await page.locator('body').textContent() || ''

  const danishStatuses = [
    'Autoriseret',        // Authorized
    'Afregnet',           // Settled
    'Delvist refunderet', // Partially Refunded
    'Refunderet',         // Refunded
    'Afventer',           // Pending
    'Annulleret',         // Cancelled
    'Mislykkedes',        // Failed
  ]
  const englishStatuses = ['Authorized', 'Settled', 'Refunded', 'Pending', 'Cancelled', 'Failed']

  const foundDanish = danishStatuses.filter(s => body.includes(s))
  const foundEnglish = englishStatuses.filter(s => body.includes(s))

  const hasDanishStatus = foundDanish.length > 0
  const hasEnglishOnly = foundEnglish.length > 0 && foundDanish.length === 0

  return JSON.stringify({
    foundDanishStatuses: foundDanish,
    foundEnglishStatuses: foundEnglish,
    result: hasDanishStatus
      ? 'PASS: Status label is in Danish'
      : hasEnglishOnly
        ? 'FAIL: Status label is shown in English (not Danish)'
        : 'NOTE: No status labels detected — order may not have payment data yet',
  })
}
```

> **Expected**: `foundDanishStatuses` has at least 1 value and `result = "PASS: Status label is in Danish"`

Take a screenshot of the Order detail page showing the full Frisbii widget as evidence

---

## AC3 — Frontend Checkout Displays "Afgiv ordre" When locale = da_DK

Verify that `FrisbiiPaymentButton` displays "Afgiv ordre" (Danish for "Place order") when the locale set in Admin = `da_DK`.

> **Requirement**: Setup-Step 2 (save locale=da_DK) must be completed first  
> display_type must be **Overlay** or **Embedded** (not Redirect) to see the button text

### AC3-Step 1 — Add Product and Navigate to Payment Step

```js
// run_code:
async (page) => {
  // เพิ่มสินค้าลงตะกร้า
  await page.goto('http://localhost:8000/dk/products/shorts')
  await page.waitForTimeout(1500)
  const sizeButtons = page.locator('button:not([disabled])').filter({ hasText: /^[LMSXL]+$/ })
  const count = await sizeButtons.count()
  if (count === 0) return 'ERROR: No size available for Shorts product'
  await sizeButtons.first().click()
  await page.waitForTimeout(500)
  await page.getByTestId('add-product-button').click()
  await page.waitForTimeout(2000)

  // กรอก Address
  await page.goto('http://localhost:8000/dk/checkout?step=address')
  await page.waitForTimeout(1500)
  const inputs = page.locator('input[placeholder=" "]')
  await inputs.nth(0).fill('Test')
  await inputs.nth(1).fill('Bruger')
  await inputs.nth(2).fill('Testgade 1')
  await inputs.nth(4).fill('2300')
  await inputs.nth(5).fill('Copenhagen')
  await page.locator('select[name="shipping_address.country_code"]').selectOption({ label: 'Denmark' })
  await inputs.nth(7).fill('test@example.com')
  await page.getByTestId('submit-address-button').click()
  await page.waitForURL('**/checkout?step=delivery', { timeout: 10000 })

  // เลือก Shipping
  await page.getByRole('radio', { name: /Standard Shipping/i }).click()
  await page.waitForTimeout(500)
  await page.getByTestId('submit-delivery-option-button').click()
  await page.waitForURL('**/checkout?step=payment', { timeout: 10000 })

  return page.url()
}
```

---

### AC3-Step 2 — Select Frisbii Pay and Verify Button Text ✅

```js
// run_code:
async (page) => {
  await page.waitForTimeout(1500)

  // เลือก Frisbii Pay
  const frisbiiRadio = page.getByRole('radio', { name: /frisbii/i })
  const frisbiiCount = await frisbiiRadio.count()
  if (frisbiiCount === 0) return 'ERROR: Frisbii Pay not found in payment options'
  await frisbiiRadio.first().click()
  await page.waitForTimeout(700)

  // Read button text
  let buttonText = ''
  const submitBtn = page.getByTestId('submit-payment-button')
  if (await submitBtn.count() > 0) {
    buttonText = (await submitBtn.textContent() || '').trim()
  } else {
    const frisbiiBtn = page.locator('button').filter({ hasText: /Afgiv ordre|Place order/i })
    buttonText = (await frisbiiBtn.first().textContent().catch(() => '')) || ''
  }

  const isDanish = buttonText === 'Afgiv ordre'

  return JSON.stringify({
    buttonText,
    result: isDanish
      ? 'PASS: Button shows "Afgiv ordre" (Danish)'
      : `FAIL: Expected "Afgiv ordre", got "${buttonText}"`,
  })
}
```

> **Expected**: `buttonText = "Afgiv ordre"` and `result = "PASS"`

> Take a screenshot to confirm button text

---

## AC4 — Frontend Overlay Displays "Åbner betalingsvindue..." When locale = da_DK

Verify that `FrisbiiOverlay` displays loading text in Danish while waiting for the Reepay SDK to load.

> **Requirement**: display_type must be **Overlay**  
> If display_type is not Overlay, complete AC4-Step 0 first

### AC4-Step 0 (if needed) — Set display_type = Overlay in Admin

```js
// run_code:
async (page) => {
  await page.goto('http://localhost:9000/app/settings/frisbii')
  await page.waitForTimeout(2000)

  const displayTypeLabel = page.locator('label').filter({ hasText: /^(Visningstype|Display Type)$/i })
  const section = displayTypeLabel.locator('..').locator('..')
  const trigger = section.locator('button[role="combobox"]').first()

  await trigger.click()
  await page.waitForTimeout(500)

  // Select Overlay / Overlejring
  const overlayOption = page.locator('[role="option"]').filter({ hasText: /Overlay|Overlejring/ }).first()
  await overlayOption.click()
  await page.waitForTimeout(300)

  await page.getByRole('button', { name: /Save Configuration|Gem konfiguration/i }).click()
  await page.waitForTimeout(2000)

  const toast = await page.locator('[data-sonner-toast], [role="status"]').first().textContent().catch(() => '')
  return `display_type=overlay saved. Toast: ${toast?.trim()}`
}
```

---

### AC4-Step 1 — Create New Cart and Navigate to Payment Step

> A new cart is required so that session data references the updated display_type

```js
// run_code:
async (page) => {
  await page.goto('http://localhost:8000/dk/products/shorts')
  await page.waitForTimeout(1500)
  const sizeButtons = page.locator('button:not([disabled])').filter({ hasText: /^[LMSXL]+$/ })
  if (await sizeButtons.count() === 0) return 'ERROR: No size available'
  await sizeButtons.first().click()
  await page.waitForTimeout(500)
  await page.getByTestId('add-product-button').click()
  await page.waitForTimeout(2000)

  await page.goto('http://localhost:8000/dk/checkout?step=address')
  await page.waitForTimeout(1500)
  const inputs = page.locator('input[placeholder=" "]')
  await inputs.nth(0).fill('Test')
  await inputs.nth(1).fill('Bruger')
  await inputs.nth(2).fill('Testgade 1')
  await inputs.nth(4).fill('2300')
  await inputs.nth(5).fill('Copenhagen')
  await page.locator('select[name="shipping_address.country_code"]').selectOption({ label: 'Denmark' })
  await inputs.nth(7).fill('test@example.com')
  await page.getByTestId('submit-address-button').click()
  await page.waitForURL('**/checkout?step=delivery', { timeout: 10000 })
  await page.getByRole('radio', { name: /Standard Shipping/i }).click()
  await page.waitForTimeout(500)
  await page.getByTestId('submit-delivery-option-button').click()
  await page.waitForURL('**/checkout?step=payment', { timeout: 10000 })
  return page.url()
}
```

---

### AC4-Step 2 — Delay SDK Loading and Verify Loading Text ✅

```js
// run_code:
async (page) => {
  await page.waitForTimeout(1500)

  // Intercept checkout.js to delay loading — giving time to verify loading text
  await page.route('https://checkout.reepay.com/checkout.js', async (route) => {
    await new Promise(r => setTimeout(r, 3000))  // delay 3 seconds
    await route.continue()
  })

  // Select Frisbii Pay
  const frisbiiRadio = page.getByRole('radio', { name: /frisbii/i })
  if (await frisbiiRadio.count() === 0) {
    await page.unroute('https://checkout.reepay.com/checkout.js')
    return 'ERROR: Frisbii Pay not found in payment options'
  }
  await frisbiiRadio.first().click()
  await page.waitForTimeout(500)

  // Click button to trigger overlay
  const submitBtn = page.getByTestId('submit-payment-button')
  const frisbiiBtn = await submitBtn.count() > 0
    ? submitBtn
    : page.locator('button').filter({ hasText: /Afgiv ordre|Place order/i }).first()
  await frisbiiBtn.click()
  await page.waitForTimeout(300)

  // Verify loading text while SDK is loading
  const loadingLocator = page.locator('text=Åbner betalingsvindue...')
  const loadingFound = await loadingLocator
    .waitFor({ state: 'visible', timeout: 5000 })
    .then(() => true)
    .catch(() => false)

  await page.unroute('https://checkout.reepay.com/checkout.js')

  return JSON.stringify({
    loadingTextFound: loadingFound,
    result: loadingFound
      ? 'PASS: "Åbner betalingsvindue..." shown in Danish'
      : 'FAIL: Danish loading text not found — check display_type=overlay and locale=da_DK',
  })
}
```

> **Expected**: `loadingTextFound = true` and `result = "PASS"`

---

## AC5 — Frontend Redirect Displays "Omdirigerer til betaling..." When locale = da_DK

Verify that the `FrisbiiRedirect` component displays loading text in Danish before redirecting to Reepay.

> **Requirement**: display_type must be **Redirect**  
> Always complete AC5-Step 0 first

### AC5-Step 0 — Set display_type = Redirect in Admin

```js
// run_code:
async (page) => {
  await page.goto('http://localhost:9000/app/settings/frisbii')
  await page.waitForTimeout(2000)

  const displayTypeLabel = page.locator('label').filter({ hasText: /^(Visningstype|Display Type)$/i })
  const section = displayTypeLabel.locator('..').locator('..')
  const trigger = section.locator('button[role="combobox"]').first()

  await trigger.click()
  await page.waitForTimeout(500)

  // Select Redirect / Omdirigering
  const redirectOption = page.locator('[role="option"]').filter({ hasText: /Redirect|Omdirigering/ }).first()
  await redirectOption.click()
  await page.waitForTimeout(300)

  await page.getByRole('button', { name: /Save Configuration|Gem konfiguration/i }).click()
  await page.waitForTimeout(2000)

  const toast = await page.locator('[data-sonner-toast], [role="status"]').first().textContent().catch(() => '')
  return `display_type=redirect saved. Toast: ${toast?.trim()}`
}
```

---

### AC5-Step 1 — Create New Cart and Navigate to Payment Step

```js
// run_code:
async (page) => {
  await page.goto('http://localhost:8000/dk/products/shorts')
  await page.waitForTimeout(1500)
  const sizeButtons = page.locator('button:not([disabled])').filter({ hasText: /^[LMSXL]+$/ })
  if (await sizeButtons.count() === 0) return 'ERROR: No size available'
  await sizeButtons.first().click()
  await page.waitForTimeout(500)
  await page.getByTestId('add-product-button').click()
  await page.waitForTimeout(2000)

  await page.goto('http://localhost:8000/dk/checkout?step=address')
  await page.waitForTimeout(1500)
  const inputs = page.locator('input[placeholder=" "]')
  await inputs.nth(0).fill('Test')
  await inputs.nth(1).fill('Bruger')
  await inputs.nth(2).fill('Testgade 1')
  await inputs.nth(4).fill('2300')
  await inputs.nth(5).fill('Copenhagen')
  await page.locator('select[name="shipping_address.country_code"]').selectOption({ label: 'Denmark' })
  await inputs.nth(7).fill('test@example.com')
  await page.getByTestId('submit-address-button').click()
  await page.waitForURL('**/checkout?step=delivery', { timeout: 10000 })
  await page.getByRole('radio', { name: /Standard Shipping/i }).click()
  await page.waitForTimeout(500)
  await page.getByTestId('submit-delivery-option-button').click()
  await page.waitForURL('**/checkout?step=payment', { timeout: 10000 })
  return page.url()
}
```

---

### AC5-Step 2 — Block Redirect and Verify Loading Text ✅

```js
// run_code:
async (page) => {
  await page.waitForTimeout(1500)

  // Block navigation to Reepay to prevent page leaving before verifying text
  await page.route('https://checkout.reepay.com/**', (route) => route.abort())

  // Select Frisbii Pay
  const frisbiiRadio = page.getByRole('radio', { name: /frisbii/i })
  if (await frisbiiRadio.count() === 0) {
    await page.unroute('https://checkout.reepay.com/**')
    return 'ERROR: Frisbii Pay not found in payment options'
  }
  await frisbiiRadio.first().click()
  await page.waitForTimeout(500)

  // Click button to trigger redirect flow
  const submitBtn = page.getByTestId('submit-payment-button')
  const frisbiiBtn = await submitBtn.count() > 0
    ? submitBtn
    : page.locator('button').filter({ hasText: /Afgiv ordre|Place order/i }).first()
  await frisbiiBtn.click()
  await page.waitForTimeout(300)

  // Verify redirect loading text
  const redirectTextLocator = page.locator('text=Omdirigerer til betaling...')
  const redirectTextFound = await redirectTextLocator
    .waitFor({ state: 'visible', timeout: 5000 })
    .then(() => true)
    .catch(() => false)

  await page.unroute('https://checkout.reepay.com/**')

  return JSON.stringify({
    redirectTextFound,
    result: redirectTextFound
      ? 'PASS: "Omdirigerer til betaling..." shown in Danish'
      : 'FAIL: Danish redirect text not found — check display_type=redirect and locale=da_DK',
  })
}
```

> **Expected**: `redirectTextFound = true` and `result = "PASS"`

> Take a screenshot as evidence

---

## Test Results Reporting

### ✅ All ACs Passed

```
PASS — Frisbii Pay Danish Locale Translation

AC1 (Admin Settings labels):    Section headings, field labels, buttons, dropdowns displayed in Danish ✅
AC2 (Order Widget labels):      Fakturanummer, Betalingsmetode, Se faktura, status labels displayed in Danish ✅
AC3 (Frontend button text):     Button displays "Afgiv ordre" ✅
AC4 (Frontend overlay text):    Loading displays "Åbner betalingsvindue..." ✅
AC5 (Frontend redirect text):   Loading displays "Omdirigerer til betaling..." ✅
```

### ❌ One or More ACs Failed

```
FAIL — Frisbii Pay Danish Locale Translation

Failed AC: AC<N>
Failed at: Step <X>
Error: <error message>
Current URL: <url>
Expected: <expected Danish text>
Actual: <actual text found>
```

Along with a screenshot of the failing page

---

## Reference Information

- **Storefront**: `http://localhost:8000`
- **Backend Admin**: `http://localhost:9000/app`
- **Admin User**: `boyd@radarsofthouse.dk` / `Test#1234`
- **Frisbii Settings URL**: `http://localhost:9000/app/settings/frisbii`
- **Orders URL**: `http://localhost:9000/app/orders`

### Backend Admin Translation Reference (da_DK)

| Translation Key | Danish | English |
|-----------------|--------|---------|
| `apiConnection` | API og forbindelse | API & Connection |
| `paymentDisplay` | Betalingsvisning | Payment Display |
| `paymentProcessing` | Betalingsbehandling | Payment Processing |
| `savedCards` | Gemte kort | Saved Cards |
| `paymentMethods` | Betalingsmetoder | Payment Methods |
| `enabled` | Aktiveret | Enabled |
| `title` | Titel | Title |
| `displayType` | Visningstype | Display Type |
| `displayTypeEmbedded` | Indlejret | Embedded |
| `displayTypeOverlay` | Overlejring | Overlay |
| `displayTypeRedirect` | Omdirigering | Redirect |
| `locale` | Sprog | Locale |
| `localeLabelDa` | Dansk | Danish |
| `localeLabelEn` | Engelsk | English |
| `localeComingSoon` | Kommer snart | Coming soon |
| `saveConfiguration` | Gem konfiguration | Save Configuration |
| `testConnection` | Test forbindelse | Test Connection |
| `configSaved` | Konfiguration gemt | Configuration saved |
| `sendOrderLines` | Send ordrelinjer | Send order lines |
| `sendPhoneNumber` | Send telefonnummer | Send phone number |
| `autoCapture` | Automatisk hævning | Auto Capture |
| `saveCardEnabled` | Gem kreditkort | Save card |

### Order Widget Translation Reference (da_DK)

| Translation Key | Danish | English |
|-----------------|--------|---------|
| `invoiceHandle` | Fakturanummer | Invoice Handle |
| `status` | Status | Status |
| `paymentMethod` | Betalingsmetode | Payment Method |
| `remainingBalance` | Resterende saldo | Remaining Balance |
| `totalAuthorized` | Samlet autoriseret | Total Authorized |
| `totalSettled` | Samlet afregnet | Total Settled |
| `totalRefunded` | Samlet refunderet | Total Refunded |
| `seeInvoice` | Se faktura | See Invoice |
| `statusAuthorized` | Autoriseret | Authorized |
| `statusSettled` | Afregnet | Settled |
| `statusPending` | Afventer | Pending |
| `statusCancelled` | Annulleret | Cancelled |
| `statusFailed` | Mislykkedes | Failed |
| `statusRefunded` | Refunderet | Refunded |
| `statusPartiallyRefunded` | Delvist refunderet | Partially Refunded |

### Frontend Component Translation Reference (da_DK)

| Translation Key | Danish | English |
|-----------------|--------|---------|
| `placeOrder` | Afgiv ordre | Place order |
| `processing` | Behandler... | Processing... |
| `openingPaymentWindow` | Åbner betalingsvindue... | Opening payment window... |
| `loadingPaymentForm` | Indlæser betalingsformular... | Loading payment form... |
| `redirectingToPayment` | Omdirigerer til betaling... | Redirecting to payment... |
| `paymentInitFailed` | Betaling kunne ikke startes. Prøv igen. | Payment could not be initialised. Please try again. |
| `paymentCancelled` | Betaling blev annulleret. | Payment was cancelled. |
