import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"

const FRISBII_DATA_MODULE = "frisbiiData"

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const { orderId } = req.params
  const frisbiiData = req.scope.resolve(FRISBII_DATA_MODULE) as any

  const statuses = await frisbiiData.listFrisbiiPaymentStatuses({
    order_id: orderId,
  })

  const status = statuses[0] || null
  res.json({ payment_status: status })
}
