import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { storeFrisbiiSessionStep } from "../steps"

type CreateSessionWorkflowInput = {
  session_handle: string
  charge_handle: string
  cart_id: string
  payment_session_id: string
}

export const createFrisbiiSessionWorkflow = createWorkflow(
  "create-frisbii-session",
  function (input: CreateSessionWorkflowInput) {
    const session = storeFrisbiiSessionStep(input)
    return new WorkflowResponse(session)
  }
)
