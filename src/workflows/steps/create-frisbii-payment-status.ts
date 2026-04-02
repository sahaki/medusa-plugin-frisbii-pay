import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

interface CreateFrisbiiPaymentStatusInput {
  orderId: string
  status: string
  maskedCard?: string
  cardType?: string
  fingerprint?: string
  paymentMethodType?: string
  surchargeFee?: number
  transactions?: any
}

export const createFrisbiiPaymentStatusStep = createStep(
  "create-frisbii-payment-status",
  async (input: CreateFrisbiiPaymentStatusInput, { container }) => {
    const frisbiiData = container.resolve("frisbiiData") as any
    
    const paymentStatus = await frisbiiData.createFrisbiiPaymentStatuses({
      order_id: input.orderId,
      status: input.status,
      masked_card: input.maskedCard,
      card_type: input.cardType,
      fingerprint: input.fingerprint,
      payment_method_type: input.paymentMethodType,
      surcharge_fee: input.surchargeFee,
      transactions: input.transactions,
    })

    return new StepResponse({ id: paymentStatus.id }, { id: paymentStatus.id })
  },
  async (data, { container }) => {
    if (!data?.id) return
    
    const frisbiiData = container.resolve("frisbiiData") as any
    await frisbiiData.deleteFrisbiiPaymentStatuses(data.id)
  }
)
