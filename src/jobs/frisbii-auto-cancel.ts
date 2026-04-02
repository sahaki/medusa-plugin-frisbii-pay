import type { MedusaContainer } from "@medusajs/types"

const FRISBII_DATA_MODULE = "frisbiiData"

export default async function frisbiiAutoCancel(container: MedusaContainer) {
  const logger = container.resolve("logger")
  const frisbiiData = container.resolve(FRISBII_DATA_MODULE) as any

  try {
    const configs = await frisbiiData.listFrisbiiConfigs({ id: "default" })
    const config = configs[0]

    if (!config || !config.auto_cancel_enabled) {
      return
    }

    const timeoutMinutes = config.auto_cancel_timeout || 30
    const cutoffDate = new Date(Date.now() - timeoutMinutes * 60 * 1000)

    const sessions = await frisbiiData.listFrisbiiSessions({
      order_id: null,
    })

    const expiredSessions = sessions.filter(
      (s: any) => new Date(s.created_at) < cutoffDate
    )

    for (const session of expiredSessions) {
      logger.info(`Frisbii auto-cancel: cancelling session ${session.session_handle} (charge: ${session.charge_handle})`)

      try {
        await frisbiiData.deleteFrisbiiSessions(session.id)
      } catch (error) {
        logger.warn(`Frisbii auto-cancel: failed to clean up session ${session.id}: ${error}`)
      }
    }

    if (expiredSessions.length > 0) {
      logger.info(`Frisbii auto-cancel: cleaned up ${expiredSessions.length} expired sessions`)
    }
  } catch (error) {
    logger.error(`Frisbii auto-cancel job error: ${error}`)
  }
}

export const config = {
  name: "frisbii-auto-cancel-unpaid",
  schedule: "*/5 * * * *",
}
