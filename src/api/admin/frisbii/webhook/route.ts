import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { FrisbiiApiClient } from "../../../../modules/frisbii-payment/clients"

const FRISBII_DATA_MODULE = "frisbiiData"

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const logger = req.scope.resolve("logger")
  const frisbiiData = req.scope.resolve(FRISBII_DATA_MODULE) as any

  const configs = await frisbiiData.listFrisbiiConfigs({ id: "default" })
  const config = configs[0]

  if (!config) {
    res.status(400).json({ success: false, message: "No configuration found" })
    return
  }

  const apiKey = config.api_mode === "live" ? config.api_key_live : config.api_key_test
  const client = new FrisbiiApiClient({ apiKey, logger })

  try {
    const current = await client.get<{ urls: string[] }>("account/webhook_settings")
    const webhookUrl = (req.body as any)?.webhook_url

    if (!webhookUrl) {
      res.status(400).json({ success: false, message: "webhook_url is required" })
      return
    }

    const urls = current.urls || []
    if (!urls.includes(webhookUrl)) {
      urls.push(webhookUrl)
    }

    await client.put("account/webhook_settings", { urls })

    res.json({ success: true, message: "Webhook URL registered", urls })
  } catch (error: any) {
    res.json({
      success: false,
      message: error.apiError?.message || error.message || "Failed to register webhook",
    })
  }
}
