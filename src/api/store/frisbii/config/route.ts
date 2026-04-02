import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

const FRISBII_DATA_MODULE = "frisbiiData"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const frisbiiData = req.scope.resolve(FRISBII_DATA_MODULE) as any
  const configs = await frisbiiData.listFrisbiiConfigs({ id: "default" })
  const config = configs[0]

  if (!config || !config.enabled) {
    res.json({ config: null })
    return
  }

  res.json({
    config: {
      enabled: config.enabled,
      title: config.title,
      display_type: config.display_type,
      allowed_payment_methods: config.allowed_payment_methods,
      payment_icons: config.payment_icons,
      locale: config.locale,
      save_card_enabled: config.save_card_enabled,
      save_card_default_unchecked: config.save_card_default_unchecked,
    },
  })
}
