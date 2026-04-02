import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"

const FRISBII_DATA_MODULE = "frisbiiData"

export default async function frisbiiOrderPlaced({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger")
  const frisbiiData = container.resolve(FRISBII_DATA_MODULE) as any
  const query = container.resolve("query") as any

  const orderId = data.id

  logger.info(`Frisbii: order placed event for ${orderId}`)

  try {
    // Use query.graph() for cross-module data (order → payment_collections → payments)
    const { data: orders } = await query.graph({
      entity: "order",
      filters: { id: orderId },
      fields: [
        "id",
        "payment_collections.payments.id",
        "payment_collections.payments.data",
      ],
    })

    const order = orders[0]
    if (!order?.payment_collections?.length) {
      logger.info(`Frisbii: no payment collections for order ${orderId}`)
      return
    }

    // Look through payments to find one with a frisbii charge_handle
    for (const pc of order.payment_collections) {
      for (const payment of pc.payments || []) {
        const chargeHandle = payment.data?.charge_handle as string
        if (!chargeHandle) continue

        // Find the frisbii session for this charge
        const sessions = await frisbiiData.listFrisbiiSessions({
          charge_handle: chargeHandle,
        })
        const session = sessions[0]
        if (!session) continue

        logger.info(
          `Frisbii: linking session ${session.id} (charge: ${chargeHandle}) to order ${orderId}`
        )

        // Update the session with the order_id
        if (!session.order_id) {
          await frisbiiData.updateFrisbiiSessions({
            id: session.id,
            order_id: orderId,
          })
        }

        // Migrate payment status record from charge_handle key to order_id
        const statusesByCharge = await frisbiiData.listFrisbiiPaymentStatuses({
          order_id: chargeHandle,
        })
        if (statusesByCharge.length > 0) {
          await frisbiiData.updateFrisbiiPaymentStatuses({
            id: statusesByCharge[0].id,
            order_id: orderId,
          })
          logger.info(
            `Frisbii: migrated payment status from charge ${chargeHandle} to order ${orderId}`
          )
        }

        // If no payment status exists yet (webhook hasn't fired), create one
        const statusesByOrder = await frisbiiData.listFrisbiiPaymentStatuses({
          order_id: orderId,
        })
        if (statusesByOrder.length === 0) {
          await frisbiiData.createFrisbiiPaymentStatuses({
            order_id: orderId,
            status: "pending",
          })
          logger.info(`Frisbii: created pending payment status for order ${orderId}`)
        }

        return // Found our frisbii payment, done
      }
    }

    logger.info(`Frisbii: no frisbii payment found for order ${orderId}`)
  } catch (error) {
    logger.error(`Frisbii: error in order placed handler: ${error}`)
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
