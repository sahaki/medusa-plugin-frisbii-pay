import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  res.status(501).json({ message: "Payment link feature not yet implemented" })
}
