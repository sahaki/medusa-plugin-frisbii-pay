import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

const FRISBII_DATA_MODULE = "frisbiiData"

type CreateStatusInput = {
  order_id: string
  status: string
  masked_card?: string | null
  card_type?: string | null
  fingerprint?: string | null
  payment_method_type?: string | null
  surcharge_fee?: number | null
}

export const createFrisbiiPaymentStatusStep = createStep(
  "create-frisbii-payment-status",
  async (input: CreateStatusInput, { container }) => {
    const frisbiiData = container.resolve(FRISBII_DATA_MODULE) as any
    const status = await frisbiiData.createFrisbiiPaymentStatuses(input)
    return new StepResponse(status, status.id)
  },
  async (statusId: string | undefined, { container }) => {
    if (!statusId) return
    const frisbiiData = container.resolve(FRISBII_DATA_MODULE) as any
    await frisbiiData.deleteFrisbiiPaymentStatuses(statusId)
  }
)
