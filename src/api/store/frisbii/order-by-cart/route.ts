import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * GET /store/frisbii/order-by-cart?cart_id=xxx
 *
 * Polls whether a cart has been completed and returns the resulting order ID.
 * Used by the Frisbii accept page to find an order that was created via the
 * Reepay webhook (invoice_authorized → authorizePayment → cart.complete).
 *
 * Medusa v2 links a cart to its resulting order through the `order_cart`
 * join table (not a direct cart_id column on the order row).
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { cart_id } = req.query as Record<string, string>

  if (!cart_id) {
    res.status(400).json({ order_id: null, error: "cart_id is required" })
    return
  }

  try {
    const pgConnection = (req.scope as any).resolve("__pg_connection__")

    // Medusa v2 uses `order_cart` join table to track cart → order links
    const link = await pgConnection
      .select("oc.cart_id", "oc.order_id", "o.status")
      .from("order_cart as oc")
      .join("order as o", "o.id", "oc.order_id")
      .where("oc.cart_id", cart_id)
      .whereNot("o.status", "canceled")
      .whereNull("o.deleted_at")
      .first()

    if (link?.order_id) {
      // Fetch country_code from the order's shipping address
      const addrRow = await pgConnection
        .select("oa.country_code")
        .from("order_address as oa")
        .join("order as o", "o.shipping_address_id", "oa.id")
        .where("o.id", link.order_id)
        .first()

      res.json({
        order_id: link.order_id,
        status: link.status,
        country_code: (addrRow?.country_code ?? "").toLowerCase() || null,
      })
      return
    }

    res.json({ order_id: null })
  } catch (error: any) {
    const logger = (req.scope as any).resolve("logger")
    logger.warn(`Frisbii order-by-cart: ${error?.message}`)
    res.json({ order_id: null })
  }
}
