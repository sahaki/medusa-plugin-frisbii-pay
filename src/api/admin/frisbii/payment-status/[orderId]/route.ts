import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"

const FRISBII_DATA_MODULE = "frisbiiData"

interface ReepayChargeSource {
  type?: string
  card_type?: string
  masked_card?: string
  fingerprint?: string
}

interface ReepayTransaction {
  id: string
  type: string
  amount: number
  currency?: string
  created: string
  settled?: string
  state: string
  payment_type?: string
  card_transaction?: {
    card_type?: string
    masked_card?: string
  }
}

interface ReepayCharge {
  handle: string
  state: string
  amount: number
  currency: string
  authorized_amount: number
  settled_amount: number
  refunded_amount: number
  source?: ReepayChargeSource
  transactions?: ReepayTransaction[]
  surcharge_fee?: number
  error?: string
  error_state?: string
}

/**
 * Reepay keeps `state: "settled"` even after a full or partial refund.
 * Derive a meaningful status from the amount breakdown instead.
 */
function deriveEffectiveStatus(charge: ReepayCharge): string {
  const settled = charge.settled_amount ?? 0
  const refunded = charge.refunded_amount ?? 0
  if (refunded > 0 && settled > 0 && refunded >= settled) {
    return "refunded"
  }
  if (refunded > 0 && refunded < settled) {
    return "partially_refunded"
  }
  return charge.state
}

async function fetchLiveCharge(
  chargeHandle: string,
  apiKey: string
): Promise<ReepayCharge | null> {
  try {
    const encoded = Buffer.from(`${apiKey}:`).toString("base64")
    // Use the invoice endpoint (same handle) – it returns authorized_amount,
    // settled_amount and refunded_amount which the charge endpoint omits.
    const response = await fetch(
      `https://api.reepay.com/v1/invoice/${chargeHandle}`,
      {
        headers: {
          Authorization: `Basic ${encoded}`,
          Accept: "application/json",
        },
      }
    )
    if (!response.ok) return null
    return (await response.json()) as ReepayCharge
  } catch {
    return null
  }
}

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const { orderId } = req.params
  const frisbiiData = req.scope.resolve(FRISBII_DATA_MODULE) as any
  const logger = req.scope.resolve("logger") as any

  try {
    // Get stored payment status (for fallback data)
    const statuses = await frisbiiData.listFrisbiiPaymentStatuses({
      order_id: orderId,
    })
    const storedStatus = statuses[0] || null

    // Look up the charge_handle from frisbii_session
    const sessions = await frisbiiData.listFrisbiiSessions({
      order_id: orderId,
    })
    const session = sessions[0] || null
    const chargeHandle = session?.charge_handle || null

    if (!chargeHandle) {
      return res.json({ payment_status: storedStatus })
    }

    // Get API key from config
    const configs = await frisbiiData.listFrisbiiConfigs({ id: "default" })
    const config = configs[0] || null
    const apiKey = config?.api_mode === "live"
      ? config?.api_key_live
      : config?.api_key_test

    if (!apiKey) {
      return res.json({ payment_status: storedStatus })
    }

    // Fetch live charge data from Reepay
    const charge = await fetchLiveCharge(chargeHandle, apiKey)

    if (!charge) {
      return res.json({ payment_status: storedStatus })
    }

    // Build enriched payment status from live data
    const paymentStatus = {
      // From stored DB record
      id: storedStatus?.id,
      order_id: orderId,
      // Live data from Reepay
      charge_handle: charge.handle,
      // Derive effective status: Reepay keeps "settled" even after refunds
      status: deriveEffectiveStatus(charge),
      currency: charge.currency,
      authorized_amount: charge.authorized_amount ?? 0,
      settled_amount: charge.settled_amount ?? 0,
      refunded_amount: charge.refunded_amount ?? 0,
      amount: charge.amount ?? 0,
      // Card info
      card_type: charge.source?.card_type || storedStatus?.card_type || null,
      masked_card: charge.source?.masked_card || storedStatus?.masked_card || null,
      payment_method_type: charge.source?.type || storedStatus?.payment_method_type || null,
      surcharge_fee: charge.surcharge_fee ?? storedStatus?.surcharge_fee ?? null,
      error: charge.error || storedStatus?.error || null,
      error_state: charge.error_state || storedStatus?.error_state || null,
      // Transaction history
      transactions: charge.transactions?.map((t) => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        currency: charge.currency,
        created: t.created,
        settled: t.settled || null,
        state: t.state,
        payment_type: t.payment_type || null,
        card_transaction: t.card_transaction || null,
      })) || storedStatus?.transactions || null,
    }

    res.json({ payment_status: paymentStatus })
  } catch (err) {
    logger.error("Frisbii payment-status route error", { error: err })
    res.status(500).json({ error: "An unexpected error occurred" })
  }
}
