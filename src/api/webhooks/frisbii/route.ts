import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

const FRISBII_DATA_MODULE = "frisbiiData"

interface FrisbiiWebhookPayload {
  id: string
  event_type: string
  timestamp: string
  signature?: string
  invoice?: string
  transaction?: string
  subscription?: string
}

interface ReepayChargeSource {
  type?: string
  card_type?: string
  masked_card?: string
  fingerprint?: string
  exp_date?: string
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
}

interface ReepayCharge {
  handle: string
  state: string
  amount: number
  currency: string
  source?: ReepayChargeSource
  transactions?: ReepayTransaction[]
  surcharge_fee?: number
}

async function fetchChargeDetails(
  chargeHandle: string,
  apiKey: string,
  logger: any
): Promise<ReepayCharge | null> {
  try {
    const encoded = Buffer.from(`${apiKey}:`).toString("base64")
    const response = await fetch(
      `https://api.reepay.com/v1/charge/${chargeHandle}`,
      {
        headers: {
          Authorization: `Basic ${encoded}`,
          Accept: "application/json",
        },
      }
    )
    if (!response.ok) {
      logger.warn(`Frisbii webhook: failed to fetch charge ${chargeHandle}: ${response.status}`)
      return null
    }
    return (await response.json()) as ReepayCharge
  } catch (error) {
    logger.warn(`Frisbii webhook: error fetching charge ${chargeHandle}: ${error}`)
    return null
  }
}

function mapStatusFromEvent(eventType: string): string {
  switch (eventType) {
    case "invoice_authorized":
      return "authorized"
    case "invoice_settled":
      return "settled"
    case "invoice_refund":
      return "refunded"
    case "invoice_cancelled":
      return "cancelled"
    default:
      return "pending"
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const logger = req.scope.resolve("logger")
  const frisbiiData = req.scope.resolve(FRISBII_DATA_MODULE) as any

  const payload = req.body as FrisbiiWebhookPayload

  logger.info(`Frisbii webhook received: ${payload.event_type} for invoice ${payload.invoice}`)

  if (!payload.event_type) {
    res.status(400).json({ status: "error", message: "Missing event_type" })
    return
  }

  // Verify webhook signature if configured
  const configs = await frisbiiData.listFrisbiiConfigs({ id: "default" })
  const config = configs[0]
  if (config?.webhook_secret && payload.signature) {
    const crypto = await import("crypto")
    const timestamp = payload.timestamp || ""
    const expectedSig = crypto
      .createHmac("sha256", config.webhook_secret)
      .update(timestamp + payload.id)
      .digest("hex")
    if (payload.signature !== expectedSig) {
      logger.warn("Frisbii webhook: invalid signature")
      res.status(401).json({ status: "error", message: "Invalid signature" })
      return
    }
  }

  // Ignore subscription events
  if (payload.subscription) {
    logger.info("Frisbii webhook: ignoring subscription event")
    res.status(200).json({ status: "ok" })
    return
  }

  const chargeHandle = payload.invoice
  if (!chargeHandle) {
    res.status(400).json({ status: "error", message: "Missing invoice handle" })
    return
  }

  // Only process payment-related events
  const handledEvents = [
    "invoice_authorized",
    "invoice_settled",
    "invoice_refund",
    "invoice_cancelled",
  ]
  if (!handledEvents.includes(payload.event_type)) {
    logger.info(`Frisbii webhook: ignoring event type ${payload.event_type}`)
    res.status(200).json({ status: "ok" })
    return
  }

  try {
    const sessions = await frisbiiData.listFrisbiiSessions({
      charge_handle: chargeHandle,
    })
    const session = sessions[0]

    if (!session) {
      logger.warn(`Frisbii webhook: no session found for charge handle ${chargeHandle}`)
      res.status(200).json({ status: "ok", message: "No session found" })
      return
    }

    // Determine the order_id to use (actual order_id or charge_handle as fallback)
    const orderId = session.order_id || chargeHandle

    // Get the API key to fetch charge details
    const apiKey = config?.api_mode === "live"
      ? config?.api_key_live
      : config?.api_key_test

    // Fetch full charge details from Reepay
    let charge: ReepayCharge | null = null
    if (apiKey) {
      charge = await fetchChargeDetails(chargeHandle, apiKey, logger)
    }

    const newStatus = mapStatusFromEvent(payload.event_type)

    // Build the update data from charge details
    const chargeData: Record<string, unknown> = {
      status: newStatus,
    }

    if (charge) {
      if (charge.source) {
        chargeData.masked_card = charge.source.masked_card || null
        chargeData.card_type = charge.source.card_type || null
        chargeData.fingerprint = charge.source.fingerprint || null
        chargeData.payment_method_type = charge.source.type || null
      }
      chargeData.surcharge_fee = charge.surcharge_fee || null

      // Store transaction history
      if (charge.transactions) {
        chargeData.transactions = charge.transactions.map((t) => ({
          id: t.id,
          type: t.type,
          amount: t.amount,
          currency: charge!.currency,
          created: t.created,
          settled: t.settled || null,
          state: t.state,
          payment_type: t.payment_type || null,
        }))
      }
    }

    // Find or create the payment status record
    const existingStatuses = await frisbiiData.listFrisbiiPaymentStatuses({
      order_id: orderId,
    })

    if (existingStatuses.length > 0) {
      await frisbiiData.updateFrisbiiPaymentStatuses({
        id: existingStatuses[0].id,
        ...chargeData,
      })
      logger.info(`Frisbii webhook: updated payment status for order ${orderId} to ${newStatus}`)
    } else {
      await frisbiiData.createFrisbiiPaymentStatuses({
        order_id: orderId,
        ...chargeData,
      })
      logger.info(`Frisbii webhook: created payment status for order ${orderId} with status ${newStatus}`)
    }

    res.status(200).json({ status: "ok" })
  } catch (error) {
    logger.error(`Frisbii webhook error: ${error}`)
    res.status(500).json({ status: "error", message: "Internal error" })
  }
}
