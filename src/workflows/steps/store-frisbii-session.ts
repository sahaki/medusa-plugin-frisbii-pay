import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

const FRISBII_DATA_MODULE = "frisbiiData"

type StoreSessionInput = {
  session_handle: string
  charge_handle: string
  cart_id: string
  payment_session_id: string
}

export const storeFrisbiiSessionStep = createStep(
  "store-frisbii-session",
  async (input: StoreSessionInput, { container }) => {
    const frisbiiData = container.resolve(FRISBII_DATA_MODULE) as any
    const session = await frisbiiData.createFrisbiiSessions(input)
    return new StepResponse(session, session.id)
  },
  async (sessionId: string, { container }) => {
    if (!sessionId) return
    const frisbiiData = container.resolve(FRISBII_DATA_MODULE) as any
    await frisbiiData.deleteFrisbiiSessions(sessionId)
  }
)
