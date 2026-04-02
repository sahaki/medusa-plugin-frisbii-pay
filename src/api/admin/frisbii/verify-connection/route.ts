import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"

const FRISBII_DATA_MODULE = "frisbiiData"

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const body = req.body as Record<string, any> | undefined

  let apiKey: string | undefined

  if (body?.api_key) {
    apiKey = body.api_key
  } else {
    const frisbiiData = req.scope.resolve(FRISBII_DATA_MODULE) as any
    const configs = await frisbiiData.listFrisbiiConfigs({ id: "default" })
    const config = configs[0]

    if (!config) {
      res.status(400).json({ success: false, message: "No configuration found" })
      return
    }

    apiKey = config.api_mode === "live" ? config.api_key_live : config.api_key_test
  }

  if (!apiKey) {
    res.status(400).json({ success: false, message: "No API key configured for current mode" })
    return
  }

  try {
    const encoded = Buffer.from(`${apiKey}:`).toString("base64")
    const response = await fetch("https://api.reepay.com/v1/account", {
      headers: {
        Authorization: `Basic ${encoded}`,
        Accept: "application/json",
      },
    })

    if (response.ok) {
      res.json({ success: true, message: "Connection successful" })
    } else {
      const errorBody = await response.json().catch(() => ({}))
      res.json({
        success: false,
        message: errorBody.message || errorBody.error || `API returned ${response.status}`,
      })
    }
  } catch (error: any) {
    res.json({
      success: false,
      message: error.message || "Connection failed",
    })
  }
}
