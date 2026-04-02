import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  res.json({ saved_cards: [] })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  res.status(501).json({ message: "Not yet implemented" })
}
