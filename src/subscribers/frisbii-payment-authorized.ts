import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"

const FRISBII_DATA_MODULE = "frisbiiData"

export default async function frisbiiPaymentAuthorized({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger")
  const frisbiiData = container.resolve(FRISBII_DATA_MODULE) as any

  logger.info(`Frisbii: payment authorized event for ${data.id}`)
}

export const config: SubscriberConfig = {
  event: "payment.authorized",
}
