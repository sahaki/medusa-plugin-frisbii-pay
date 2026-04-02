import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import type { AdminUpdateFrisbiiConfigType } from "./validators"

const FRISBII_DATA_MODULE = "frisbiiData"

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const frisbiiData = req.scope.resolve(FRISBII_DATA_MODULE) as any
  const configs = await frisbiiData.listFrisbiiConfigs({ id: "default" })
  let config = configs[0] || null

  if (!config) {
    config = await frisbiiData.createFrisbiiConfigs({ id: "default" })
  }

  res.json({ config })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<AdminUpdateFrisbiiConfigType>,
  res: MedusaResponse
) => {
  const frisbiiData = req.scope.resolve(FRISBII_DATA_MODULE) as any

  // Use validatedBody if available, otherwise fallback to body
  const dataToUpdate = req.validatedBody || req.body

  // Ensure config exists
  const configs = await frisbiiData.listFrisbiiConfigs({ id: "default" })
  if (!configs || configs.length === 0) {
    await frisbiiData.createFrisbiiConfigs({ id: "default" })
  }

  // Update returns the updated record
  const updated = await frisbiiData.updateFrisbiiConfigs({
    id: "default",
    ...dataToUpdate,
  })

  res.json({ config: updated })
}
