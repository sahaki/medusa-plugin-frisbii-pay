import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { frisbiiLog } from "../utils/logger"

export default async function frisbiiPaymentCaptured({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger")

  logger.info(`Frisbii: payment captured event for ${data.id}`)
  frisbiiLog("frisbii-order-status", "INFO", `Payment captured: ${data.id}`, {
    payment_id: data.id,
  })
}

export const config: SubscriberConfig = {
  event: "payment.captured",
}
