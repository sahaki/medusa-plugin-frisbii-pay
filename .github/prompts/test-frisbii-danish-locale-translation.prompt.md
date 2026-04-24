---
description: "ทดสอบการแปลภาษาเดนมาร์ก (da_DK) ใน Frisbii Pay Plugin — ครอบคลุม Backend Admin Settings labels, Backend Order Widget labels, และ Frontend Checkout labels"
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

ทดสอบการแปลภาษา **Danish (da_DK)** ครอบคลุม 5 Acceptance Criteria:

| AC | หัวข้อ |
|----|--------|
| AC1 | Backend Admin Settings page แสดง labels เป็นภาษาเดนมาร์กเมื่อ browser language = `da-DK` |
| AC2 | Backend Order Widget (Invoice) แสดง labels เป็นภาษาเดนมาร์กเมื่อ browser language = `da-DK` |
| AC3 | Frontend Checkout — Payment button แสดง "Afgiv ordre" เมื่อ locale = `da_DK` |
| AC4 | Frontend Overlay — Loading message แสดง "Åbner betalingsvindue..." เมื่อ locale = `da_DK` |
| AC5 | Frontend Redirect — Loading message แสดง "Omdirigerer til betaling..." เมื่อ locale = `da_DK` |

---

## หลักการสำคัญ (อ่านก่อนเริ่ม)

**ใช้ `mcp_microsoft_pla_browser_run_code` เป็นหลัก** — รวมหลาย action ไว้ใน call เดียวเพื่อความเร็ว

**อย่าเรียก snapshot โดยไม่จำเป็น** — snapshot เฉพาะเมื่อต้องการ debug หรือหา ref เท่านั้น

**ความแตกต่างของการควบคุม locale — ต้องเข้าใจก่อนทดสอบ**:

```
Admin UI (AC1, AC2)        → ควบคุมโดย browser language (navigator.language)
                               ต้องใช้ page.addInitScript() เพื่อ emulate da-DK
                               locale ที่ตั้งไว้ใน Admin Settings ไม่ส่งผลต่อ Admin UI labels

Frontend Checkout (AC3–AC5) → ควบคุมโดย locale ที่ตั้งค่าไว้ใน Admin Settings
                               locale ถูกส่งต่อผ่าน payment session data ไปยัง frontend
                               ไม่จำเป็นต้องเปลี่ยน browser language
```

**ข้อกำหนดก่อนทดสอบ**:
- Medusa Backend รันที่ `http://localhost:9000`
- Medusa Storefront รันที่ `http://localhost:8000`
- Plugin Frisbii Pay ถูก configure และ assign ให้ region Denmark แล้ว
- มีอย่างน้อยหนึ่ง Order ที่มี Frisbii Pay payment อยู่ในระบบ (สำหรับ AC2)
- ลำดับ form fields ของ storefront:
  - `input[placeholder=" "]` nth(0) = first_name
  - `input[placeholder=" "]` nth(1) = last_name
  - `input[placeholder=" "]` nth(2) = address_1
  - `input[placeholder=" "]` nth(4) = postal_code
  - `input[placeholder=" "]` nth(5) = city
  - `select[name="shipping_address.country_code"]` = country
  - `input[placeholder=" "]` nth(7) = email

---

## Setup — ตั้งค่า locale = da_DK และ Login (ทำก่อน AC3–AC5)

ตั้งค่า locale = `da_DK` ใน Admin เพื่อให้ Frontend (AC3–AC5) ได้รับ locale ที่ถูกต้อง

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

> ตรวจสอบ URL ว่า redirect เข้า `/app/` — ถ้าไม่ใช่ → snapshot และรายงาน

---

### Setup-Step 2 — ตั้ง locale = da_DK แล้ว Save

```js
// run_code:
async (page) => {
  await page.goto('http://localhost:9000/app/settings/frisbii')
  await page.waitForTimeout(2000)

  // หา Locale select trigger
  const localeLabel = page.locator('label').filter({ hasText: /^(Sprog|Locale)$/i })
  const localeSection = localeLabel.locator('..').locator('..')
  const localeTrigger = localeSection.locator('button[role="combobox"]').first()

  await localeTrigger.click()
  await page.waitForTimeout(500)

  // เลือก Danish / Dansk
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

> ตรวจสอบว่า toast แสดง "Configuration saved" / "Konfiguration gemt"

---

## AC1 — Backend Admin Settings แสดง Labels เป็นภาษาเดนมาร์ก

ตรวจสอบว่าเมื่อ browser language = `da-DK` หน้า Settings (`/app/settings/frisbii`) แสดง labels ทั้งหมดเป็นภาษาเดนมาร์กผ่าน `useAdminTranslation()` hook

### AC1-Step 1 — Emulate Danish Browser Language และเปิด Settings Page

```js
// run_code:
async (page) => {
  // addInitScript ทำงานก่อนทุก page load — ต้องเรียกก่อน goto
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

> ตรวจสอบว่า output = `"Browser language emulated as: da-DK"`

---

### AC1-Step 2 — ตรวจสอบ Section Headings เป็นภาษาเดนมาร์ก ✅

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

> **Expected**: ทุก key = `true` และ `result = "PASS: All section headings in Danish"`

---

### AC1-Step 3 — ตรวจสอบ Field Labels, Buttons, และ Dropdown Options เป็นภาษาเดนมาร์ก ✅

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

> **Expected**: ทุก key = `true` และ `result = "PASS: All labels in Danish"`

---

### AC1-Step 4 — ตรวจสอบ Toggle Labels (Payment Processing) เป็นภาษาเดนมาร์ก ✅

```js
// run_code:
async (page) => {
  const body = await page.locator('body').textContent() || ''

  const toggleChecks = {
    'Send ordrelinjer':   body.includes('Send ordrelinjer'),    // Send order lines
    'Send telefonnummer': body.includes('Send telefonnummer'),  // Send phone number
    // ใช้ substring เพื่อหลีกเลี่ยง encoding ของ æ
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

> **Expected**: ทุก key = `true`

Take screenshot ของ Settings page เต็มเป็น evidence ของ AC1

---

## AC2 — Backend Order Widget แสดง Labels เป็นภาษาเดนมาร์ก

ตรวจสอบว่า Invoice widget (`frisbii-order-payment.tsx`) ใน Order detail page แสดง labels เป็นภาษาเดนมาร์กเมื่อ browser language = `da-DK`

### AC2-Step 1 — Emulate Danish Browser Language และไปที่ Order List

```js
// run_code:
async (page) => {
  // Emulate Danish browser language ก่อน navigate
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'language', { get: () => 'da-DK' })
    Object.defineProperty(navigator, 'languages', { get: () => ['da-DK', 'da'] })
  })

  await page.goto('http://localhost:9000/app/orders')
  await page.waitForTimeout(2500)

  // คลิก order แรกใน list
  const firstOrderRow = page.locator('tbody tr').first()
  const rowVisible = await firstOrderRow.isVisible().catch(() => false)
  if (!rowVisible) return 'ERROR: No orders in list — create a test order with Frisbii Pay first'

  await firstOrderRow.click()
  await page.waitForURL('**/app/orders/**', { timeout: 8000 })
  await page.waitForTimeout(2500)

  return page.url()
}
```

> ตรวจสอบ URL ว่าเป็น `/app/orders/<orderId>` — ถ้าไม่มี order ให้ทำ checkout ด้วย Frisbii Pay ก่อน (ดู AC3)

---

### AC2-Step 2 — ตรวจสอบ Widget Card Labels เป็นภาษาเดนมาร์ก ✅

```js
// run_code:
async (page) => {
  const body = await page.locator('body').textContent() || ''

  // ตรวจว่า Frisbii widget render อยู่ในหน้านี้
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

> **Expected**: ทุก key = `true` และ `result = "PASS: All widget labels in Danish"`

---

### AC2-Step 3 — ตรวจสอบ Status Label เป็นภาษาเดนมาร์ก ✅

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

> **Expected**: `foundDanishStatuses` มีค่าอย่างน้อย 1 ค่า และ `result = "PASS: Status label is in Danish"`

Take screenshot ของ Order detail page แสดง Frisbii widget เต็มๆ เป็น evidence

---

## AC3 — Frontend Checkout แสดง "Afgiv ordre" เมื่อ locale = da_DK

ตรวจสอบว่า `FrisbiiPaymentButton` แสดง "Afgiv ordre" (Danish สำหรับ "Place order") เมื่อ locale ที่ตั้งค่าใน Admin = `da_DK`

> **ข้อกำหนด**: ต้องทำ Setup-Step 2 (บันทึก locale=da_DK) ก่อน  
> display_type ต้องเป็น **Overlay** หรือ **Embedded** (ไม่ใช่ Redirect) เพื่อให้เห็น button text

### AC3-Step 1 — เพิ่มสินค้าและไปถึง Payment Step

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

### AC3-Step 2 — เลือก Frisbii Pay และตรวจ Button Text ✅

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

  // อ่าน button text
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

> **Expected**: `buttonText = "Afgiv ordre"` และ `result = "PASS"`  
> Take screenshot ยืนยัน button text

---

## AC4 — Frontend Overlay แสดง "Åbner betalingsvindue..." เมื่อ locale = da_DK

ตรวจสอบว่า `FrisbiiOverlay` แสดง loading text เป็นภาษาเดนมาร์กระหว่างที่รอ Reepay SDK โหลด

> **ข้อกำหนด**: display_type ต้องเป็น **Overlay**  
> ถ้า display_type ไม่ใช่ Overlay ให้ทำ AC4-Step 0 ก่อน

### AC4-Step 0 (ถ้าจำเป็น) — ตั้ง display_type = Overlay ใน Admin

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

  // เลือก Overlay / Overlejring
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

### AC4-Step 1 — สร้าง Cart ใหม่และไปถึง Payment Step

> cart ใหม่จำเป็นเพื่อให้ session data อ้าง display_type ที่อัปเดตแล้ว

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

### AC4-Step 2 — Delay SDK Loading และตรวจ Loading Text ✅

```js
// run_code:
async (page) => {
  await page.waitForTimeout(1500)

  // Intercept checkout.js เพื่อ delay loading — ทำให้มีเวลาตรวจ loading text
  await page.route('https://checkout.reepay.com/checkout.js', async (route) => {
    await new Promise(r => setTimeout(r, 3000))  // delay 3 วินาที
    await route.continue()
  })

  // เลือก Frisbii Pay
  const frisbiiRadio = page.getByRole('radio', { name: /frisbii/i })
  if (await frisbiiRadio.count() === 0) {
    await page.unroute('https://checkout.reepay.com/checkout.js')
    return 'ERROR: Frisbii Pay not found in payment options'
  }
  await frisbiiRadio.first().click()
  await page.waitForTimeout(500)

  // คลิก button เพื่อ trigger overlay
  const submitBtn = page.getByTestId('submit-payment-button')
  const frisbiiBtn = await submitBtn.count() > 0
    ? submitBtn
    : page.locator('button').filter({ hasText: /Afgiv ordre|Place order/i }).first()
  await frisbiiBtn.click()
  await page.waitForTimeout(300)

  // ตรวจ loading text ขณะที่ SDK กำลัง load
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

> **Expected**: `loadingTextFound = true` และ `result = "PASS"`

---

## AC5 — Frontend Redirect แสดง "Omdirigerer til betaling..." เมื่อ locale = da_DK

ตรวจสอบว่า `FrisbiiRedirect` component แสดง loading text เป็นภาษาเดนมาร์กก่อน redirect ไปยัง Reepay

> **ข้อกำหนด**: display_type ต้องเป็น **Redirect**  
> ทำ AC5-Step 0 ก่อนเสมอ

### AC5-Step 0 — ตั้ง display_type = Redirect ใน Admin

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

  // เลือก Redirect / Omdirigering
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

### AC5-Step 1 — สร้าง Cart ใหม่และไปถึง Payment Step

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

### AC5-Step 2 — Block Redirect และตรวจ Loading Text ✅

```js
// run_code:
async (page) => {
  await page.waitForTimeout(1500)

  // Block navigation ไปยัง Reepay เพื่อป้องกัน page leave ก่อนตรวจ text
  await page.route('https://checkout.reepay.com/**', (route) => route.abort())

  // เลือก Frisbii Pay
  const frisbiiRadio = page.getByRole('radio', { name: /frisbii/i })
  if (await frisbiiRadio.count() === 0) {
    await page.unroute('https://checkout.reepay.com/**')
    return 'ERROR: Frisbii Pay not found in payment options'
  }
  await frisbiiRadio.first().click()
  await page.waitForTimeout(500)

  // คลิก button เพื่อ trigger redirect flow
  const submitBtn = page.getByTestId('submit-payment-button')
  const frisbiiBtn = await submitBtn.count() > 0
    ? submitBtn
    : page.locator('button').filter({ hasText: /Afgiv ordre|Place order/i }).first()
  await frisbiiBtn.click()
  await page.waitForTimeout(300)

  // ตรวจ redirect loading text
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

> **Expected**: `redirectTextFound = true` และ `result = "PASS"`  
> Take screenshot เป็น evidence

---

## การรายงานผล

### ✅ กรณีทุก AC ผ่าน

```
PASS — Frisbii Pay Danish Locale Translation

AC1 (Admin Settings labels):    Section headings, field labels, buttons, dropdowns แสดงเป็น Danish ✅
AC2 (Order Widget labels):      Fakturanummer, Betalingsmetode, Se faktura, status labels แสดงเป็น Danish ✅
AC3 (Frontend button text):     Button แสดง "Afgiv ordre" ✅
AC4 (Frontend overlay text):    Loading แสดง "Åbner betalingsvindue..." ✅
AC5 (Frontend redirect text):   Loading แสดง "Omdirigerer til betaling..." ✅
```

### ❌ กรณีมี AC ล้มเหลว

```
FAIL — Frisbii Pay Danish Locale Translation

Failed AC: AC<N>
Failed at: Step <X>
Error: <error message>
Current URL: <url>
Expected: <expected Danish text>
Actual: <actual text found>
```

พร้อม screenshot ของหน้าที่เกิด error

---

## ข้อมูลอ้างอิง

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
