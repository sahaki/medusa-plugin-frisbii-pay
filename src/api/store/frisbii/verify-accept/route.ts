import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import crypto from "crypto"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { cart_id, session_id, sig } = req.query as Record<string, string>

  if (!cart_id || !session_id || !sig) {
    res.json({ valid: false })
    return
  }

  const secret = process.env.COOKIE_SECRET || "supersecret"
  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(`${cart_id}:${session_id}`)
    .digest("hex")

  res.json({ valid: sig === expectedSig })
}
