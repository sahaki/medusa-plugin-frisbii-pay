import type { LoaderOptions } from "@medusajs/types"

export default async function frisbiiDataLoader({
  container,
}: LoaderOptions) {
  const logger = container.resolve("logger")
  try {
    const frisbiiConfigService = container.resolve("frisbiiConfigService") as any
    const existing = await frisbiiConfigService.list({ id: "default" })
    if (existing.length === 0) {
      await frisbiiConfigService.create({ id: "default" })
      logger.info("Frisbii: default configuration created")
    }
  } catch (error) {
    logger.warn(`Frisbii: failed to initialize default config: ${error}`)
  }
}
