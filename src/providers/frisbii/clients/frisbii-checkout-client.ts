import type { Logger } from "@medusajs/types"
import { FrisbiiApiClient } from "./frisbii-api-client"

export class FrisbiiCheckoutClient extends FrisbiiApiClient {
  constructor(config: { apiKey: string; logger: Logger; timeout?: number }) {
    super({
      ...config,
      baseUrl: "https://checkout-api.reepay.com/v1/",
    })
  }
}
