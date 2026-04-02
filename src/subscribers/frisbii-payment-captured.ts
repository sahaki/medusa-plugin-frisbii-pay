import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"

export default async function frisbiiPaymentCaptured({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger")

  logger.info(`Frisbii: payment captured event for ${data.id}`)
}

export const config: SubscriberConfig = {
  event: "payment.captured",
}
