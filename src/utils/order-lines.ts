/**
 * Reepay order line builder utilities.
 *
 * Queries Medusa cart/order tables directly via __pg_connection__
 * to construct order_lines arrays for Reepay API calls.
 *
 * Reepay API references:
 *   Session charge:  POST checkout-api.reepay.com/v1/session/charge
 *   Settle/capture:  POST api.reepay.com/v1/charge/{handle}/settle
 */

import { toMinorUnits } from "./currency"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A single order line item in the Reepay API format.
 * Used for both session/charge and charge/{handle}/settle endpoints.
 */
export interface ReepayOrderLine {
  /** Product or shipping description — max 256 chars */
  ordertext: string
  /** Quantity */
  quantity: number
  /** Unit price in minor currency units (cents). Negative for discounts. */
  amount: number
  /** Tax rate as decimal (e.g. 0.25 for 25%). 0 if no tax. */
  vat: number
  /**
   * true  → `amount` already includes VAT (tax-inclusive pricing)
   * false → `amount` is pre-tax; Reepay adds VAT on top
   */
  amount_incl_vat: boolean
}

// ---------------------------------------------------------------------------
// Internal DB row shapes
// ---------------------------------------------------------------------------

interface CartLineItemRow {
  id: string
  title: string
  quantity: number
  unit_price: string        // numeric → comes as string from pg
  is_tax_inclusive: boolean
  is_discountable: boolean
}

interface CartShippingMethodRow {
  id: string
  name: string
  amount: string            // numeric
  is_tax_inclusive: boolean
}

interface TaxLineRow {
  item_id: string
  total_rate: string        // SUM(rate) — percentage, e.g. "25"
}

interface ShippingTaxLineRow {
  shipping_method_id: string
  total_rate: string
}

interface AdjustmentRow {
  item_id: string
  total_discount: string    // SUM(amount) in major units
}

interface OrderItemRow {
  quantity: string          // numeric
  unit_price: string        // numeric
  title: string
  is_tax_inclusive: boolean
  item_id: string
}

interface OrderShippingMethodRow {
  shipping_method_id: string
  name: string
  amount: string
  is_tax_inclusive: boolean
}

interface OrderItemTaxLineRow {
  item_id: string
  total_rate: string
}

interface OrderAdjustmentRow {
  item_id: string
  total_discount: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Truncate and sanitise order line text to Reepay's 256-char limit */
function sanitiseOrderText(text: string): string {
  if (!text) return "Item"
  // Remove characters that can cause issues in Reepay's system
  return text.replace(/[^\w\s\-().,:]/g, "").trim().slice(0, 256) || "Item"
}

/** Convert tax rate stored as percentage (e.g. 25) → decimal (0.25) */
function rateToDecimal(rateStr: string | null | undefined): number {
  if (!rateStr) return 0
  const r = parseFloat(rateStr)
  if (isNaN(r) || r <= 0) return 0
  return Math.round(r) / 100
}

/**
 * Calculate total from an array of ReepayOrderLine items (minor units).
 * Used to validate that lines sum matches the expected payment amount.
 */
export function calculateTotalFromOrderLines(lines: ReepayOrderLine[]): number {
  return lines.reduce((sum, line) => {
    const lineAmount = line.amount * line.quantity
    if (!line.amount_incl_vat && line.vat > 0) {
      return sum + Math.round(lineAmount * (1 + line.vat))
    }
    return sum + lineAmount
  }, 0)
}

// ---------------------------------------------------------------------------
// Cart-based order lines (for initiatePayment)
// ---------------------------------------------------------------------------

/**
 * Looks up the cart_id associated with a Medusa payment_session.
 *
 * Chain: payment_session → payment_collection → cart_payment_collection
 */
export async function getCartIdFromPaymentSessionId(
  pgConnection: any,
  paymentSessionId: string
): Promise<string | null> {
  try {
    const result = await pgConnection.raw(`
      SELECT cpc.cart_id
      FROM payment_session ps
      JOIN cart_payment_collection cpc
        ON cpc.payment_collection_id = ps.payment_collection_id
      WHERE ps.id = ?
        AND ps.deleted_at IS NULL
        AND cpc.deleted_at IS NULL
      LIMIT 1
    `, [paymentSessionId])

    const rows = result?.rows ?? result
    return rows?.[0]?.cart_id ?? null
  } catch {
    return null
  }
}

/**
 * Builds Reepay order_lines from a Medusa cart.
 *
 * Includes:
 *  - Product line items
 *  - Shipping methods
 *  - Discount adjustment line (negative amount, if any discounts exist)
 *
 * Returns empty array on any DB error — caller should fallback to amount-only.
 */
export async function buildCartOrderLines(
  pgConnection: any,
  cartId: string,
  currencyCode: string
): Promise<ReepayOrderLine[]> {
  try {
    // ── 1. Fetch cart line items ────────────────────────────────────────────
    const itemsResult = await pgConnection.raw(`
      SELECT id, title, quantity, unit_price, is_tax_inclusive, is_discountable
      FROM cart_line_item
      WHERE cart_id = ? AND deleted_at IS NULL
    `, [cartId])

    const items: CartLineItemRow[] = itemsResult?.rows ?? itemsResult
    if (!items || items.length === 0) return []

    const itemIds = items.map((i) => i.id)

    // ── 2. Fetch tax rates for line items ──────────────────────────────────
    const taxResult = await pgConnection.raw(`
      SELECT item_id, SUM(rate) as total_rate
      FROM cart_line_item_tax_line
      WHERE item_id = ANY(?)
        AND deleted_at IS NULL
      GROUP BY item_id
    `, [itemIds])

    const taxLines: TaxLineRow[] = taxResult?.rows ?? taxResult
    const taxByItemId = new Map<string, number>(
      taxLines.map((t) => [t.item_id, rateToDecimal(t.total_rate)])
    )

    // ── 3. Fetch adjustments (discounts) per item ──────────────────────────
    const adjResult = await pgConnection.raw(`
      SELECT item_id, SUM(amount) as total_discount
      FROM cart_line_item_adjustment
      WHERE item_id = ANY(?)
        AND deleted_at IS NULL
      GROUP BY item_id
    `, [itemIds])

    const adjLines: AdjustmentRow[] = adjResult?.rows ?? adjResult
    const discountByItemId = new Map<string, number>(
      adjLines.map((a) => [a.item_id, parseFloat(a.total_discount) || 0])
    )

    // ── 4. Fetch shipping methods ──────────────────────────────────────────
    const shipResult = await pgConnection.raw(`
      SELECT id, name, amount, is_tax_inclusive
      FROM cart_shipping_method
      WHERE cart_id = ? AND deleted_at IS NULL
    `, [cartId])

    const shippingMethods: CartShippingMethodRow[] = shipResult?.rows ?? shipResult

    // ── 5. Fetch tax rates for shipping methods ────────────────────────────
    let shippingTaxByMethodId = new Map<string, number>()
    if (shippingMethods && shippingMethods.length > 0) {
      const shippingIds = shippingMethods.map((s) => s.id)
      const shipTaxResult = await pgConnection.raw(`
        SELECT shipping_method_id, SUM(rate) as total_rate
        FROM cart_shipping_method_tax_line
        WHERE shipping_method_id = ANY(?)
          AND deleted_at IS NULL
        GROUP BY shipping_method_id
      `, [shippingIds])

      const shipTaxLines: ShippingTaxLineRow[] = shipTaxResult?.rows ?? shipTaxResult
      shippingTaxByMethodId = new Map<string, number>(
        shipTaxLines.map((t) => [t.shipping_method_id, rateToDecimal(t.total_rate)])
      )
    }

    // ── 6. Build order lines ───────────────────────────────────────────────
    const orderLines: ReepayOrderLine[] = []

    // Product lines
    for (const item of items) {
      const unitPrice = parseFloat(item.unit_price) || 0
      // Apply per-item discount: reduce unit_price
      const itemDiscount = discountByItemId.get(item.id) || 0
      const effectiveUnitPrice = unitPrice - (itemDiscount / (item.quantity || 1))
      const vatRate = taxByItemId.get(item.id) ?? 0

      orderLines.push({
        ordertext: sanitiseOrderText(item.title),
        quantity: item.quantity || 1,
        amount: toMinorUnits(effectiveUnitPrice, currencyCode),
        vat: vatRate,
        amount_incl_vat: item.is_tax_inclusive,
      })
    }

    // Shipping lines
    if (shippingMethods) {
      for (const shipping of shippingMethods) {
        const shippingAmount = parseFloat(shipping.amount) || 0
        if (shippingAmount <= 0) continue

        const vatRate = shippingTaxByMethodId.get(shipping.id) ?? 0

        orderLines.push({
          ordertext: sanitiseOrderText(shipping.name),
          quantity: 1,
          amount: toMinorUnits(shippingAmount, currencyCode),
          vat: vatRate,
          amount_incl_vat: shipping.is_tax_inclusive,
        })
      }
    }

    return orderLines
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// Order-based order lines (for capturePayment)
// ---------------------------------------------------------------------------

/**
 * Looks up the order_id associated with a Medusa payment_session.
 *
 * Chain: payment_session → payment_collection → order_payment_collection
 */
export async function getOrderIdFromPaymentSessionId(
  pgConnection: any,
  paymentSessionId: string
): Promise<string | null> {
  try {
    const result = await pgConnection.raw(`
      SELECT opc.order_id
      FROM payment_session ps
      JOIN order_payment_collection opc
        ON opc.payment_collection_id = ps.payment_collection_id
      WHERE ps.id = ?
        AND ps.deleted_at IS NULL
        AND opc.deleted_at IS NULL
      LIMIT 1
    `, [paymentSessionId])

    const rows = result?.rows ?? result
    return rows?.[0]?.order_id ?? null
  } catch {
    return null
  }
}

/**
 * Builds Reepay order_lines from a Medusa order (for settle/capture).
 *
 * Uses the latest version of order_item rows to get quantities.
 * Includes product lines, shipping, and discount adjustments.
 *
 * Returns empty array on any DB error — caller should fallback to empty body.
 */
export async function buildOrderOrderLines(
  pgConnection: any,
  orderId: string,
  currencyCode: string
): Promise<ReepayOrderLine[]> {
  try {
    // ── 1. Fetch order items (latest version) ──────────────────────────────
    // NOTE: unit_price comes from order_line_item (oli), NOT order_item (oi).
    // order_item.unit_price is nullable (used only for price-override scenarios)
    // and is NULL for normal orders. order_line_item.unit_price holds the
    // actual price snapshot taken at order creation time.
    const itemsResult = await pgConnection.raw(`
      SELECT
        oi.item_id,
        oi.quantity,
        oli.unit_price,
        oli.title,
        oli.is_tax_inclusive
      FROM order_item oi
      JOIN order_line_item oli ON oli.id = oi.item_id
      WHERE oi.order_id = ?
        AND oi.deleted_at IS NULL
        AND oli.deleted_at IS NULL
        AND oi.version = (
          SELECT MAX(oi2.version)
          FROM order_item oi2
          WHERE oi2.item_id = oi.item_id AND oi2.deleted_at IS NULL
        )
    `, [orderId])

    const items: OrderItemRow[] = itemsResult?.rows ?? itemsResult
    if (!items || items.length === 0) return []

    const itemIds = items.map((i) => i.item_id)

    // ── 2. Fetch tax rates for order line items ────────────────────────────
    const taxResult = await pgConnection.raw(`
      SELECT item_id, SUM(rate) as total_rate
      FROM order_line_item_tax_line
      WHERE item_id = ANY(?)
        AND deleted_at IS NULL
      GROUP BY item_id
    `, [itemIds])

    const taxLines: OrderItemTaxLineRow[] = taxResult?.rows ?? taxResult
    const taxByItemId = new Map<string, number>(
      taxLines.map((t) => [t.item_id, rateToDecimal(t.total_rate)])
    )

    // ── 3. Fetch order line item adjustments (discounts) ───────────────────
    const adjResult = await pgConnection.raw(`
      SELECT item_id, SUM(amount) as total_discount
      FROM order_line_item_adjustment
      WHERE item_id = ANY(?)
        AND deleted_at IS NULL
      GROUP BY item_id
    `, [itemIds])

    const adjLines: OrderAdjustmentRow[] = adjResult?.rows ?? adjResult
    const discountByItemId = new Map<string, number>(
      adjLines.map((a) => [a.item_id, parseFloat(a.total_discount) || 0])
    )

    // ── 4. Fetch order shipping methods (distinct to avoid version dupes) ──
    const shipResult = await pgConnection.raw(`
      SELECT DISTINCT ON (osm.id)
        os.shipping_method_id,
        osm.name,
        osm.amount,
        osm.is_tax_inclusive
      FROM order_shipping os
      JOIN order_shipping_method osm ON osm.id = os.shipping_method_id
      WHERE os.order_id = ?
        AND os.deleted_at IS NULL
        AND osm.deleted_at IS NULL
    `, [orderId])

    const shippingMethods: OrderShippingMethodRow[] = shipResult?.rows ?? shipResult

    // ── 5. Fetch tax rates for shipping methods ────────────────────────────
    let shippingTaxByMethodId = new Map<string, number>()
    if (shippingMethods && shippingMethods.length > 0) {
      const shippingIds = shippingMethods.map((s) => s.shipping_method_id)
      const shipTaxResult = await pgConnection.raw(`
        SELECT shipping_method_id, SUM(rate) as total_rate
        FROM order_shipping_method_tax_line
        WHERE shipping_method_id = ANY(?)
          AND deleted_at IS NULL
        GROUP BY shipping_method_id
      `, [shippingIds])

      const shipTaxLines: ShippingTaxLineRow[] = shipTaxResult?.rows ?? shipTaxResult
      shippingTaxByMethodId = new Map<string, number>(
        shipTaxLines.map((t) => [t.shipping_method_id, rateToDecimal(t.total_rate)])
      )
    }

    // ── 6. Build order lines ───────────────────────────────────────────────
    const orderLines: ReepayOrderLine[] = []

    // Product lines
    for (const item of items) {
      const unitPrice = parseFloat(item.unit_price) || 0
      const quantity = parseFloat(item.quantity) || 1
      const itemDiscount = discountByItemId.get(item.item_id) || 0
      const effectiveUnitPrice = unitPrice - (itemDiscount / quantity)
      const vatRate = taxByItemId.get(item.item_id) ?? 0

      orderLines.push({
        ordertext: sanitiseOrderText(item.title),
        quantity,
        amount: toMinorUnits(effectiveUnitPrice, currencyCode),
        vat: vatRate,
        amount_incl_vat: item.is_tax_inclusive,
      })
    }

    // Shipping lines
    if (shippingMethods) {
      for (const shipping of shippingMethods) {
        const shippingAmount = parseFloat(shipping.amount) || 0
        if (shippingAmount <= 0) continue

        const vatRate = shippingTaxByMethodId.get(shipping.shipping_method_id) ?? 0

        orderLines.push({
          ordertext: sanitiseOrderText(shipping.name),
          quantity: 1,
          amount: toMinorUnits(shippingAmount, currencyCode),
          vat: vatRate,
          amount_incl_vat: shipping.is_tax_inclusive,
        })
      }
    }

    return orderLines
  } catch {
    return []
  }
}
