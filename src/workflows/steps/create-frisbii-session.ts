import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

interface CreateFrisbiiSessionInput {
  cartId: string
  sessionHandle: string
  chargeHandle: string
  paymentSessionId: string
  expiresAt?: Date
}

export const createFrisbiiSessionStep = createStep(
  "create-frisbii-session",
  async (input: CreateFrisbiiSessionInput, { container }) => {
    const frisbiiData = container.resolve("frisbiiData") as any
    
    const session = await frisbiiData.createFrisbiiSessions({
      cart_id: input.cartId,
      session_handle: input.sessionHandle,
      charge_handle: input.chargeHandle,
      payment_session_id: input.paymentSessionId,
      expires_at: input.expiresAt,
    })

    return new StepResponse({ id: session.id }, { id: session.id })
  },
  async (data, { container }) => {
    if (!data?.id) return
    
    const frisbiiData = container.resolve("frisbiiData") as any
    await frisbiiData.deleteFrisbiiSessions(data.id)
  }
)
