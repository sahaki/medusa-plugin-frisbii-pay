// The payment provider reads its API key and configuration from the
// frisbii_config database table (managed via the admin settings page).
// It queries the shared PG connection directly since Medusa v2 modules
// are isolated and can't resolve each other's services.
// Env vars in medusa-config.ts serve as a fallback only.

import {
  AbstractPaymentProvider,
  BigNumber,
  PaymentActions,
} from "@medusajs/framework/utils"
import {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  PaymentSessionStatus,
  ProviderWebhookPayload,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
  Logger,
} from "@medusajs/types"
import { FrisbiiApiClient, FrisbiiCheckoutClient } from "./clients"

type Options = {
  apiKeyTest?: string
  apiKeyLive?: string
  apiMode?: string
}

interface FrisbiiDbConfig {
  api_key_test: string
  api_key_live: string
  api_mode: "test" | "live"
  locale: string
  display_type: string
  allowed_payment_methods: string[]
  auto_capture: boolean
  checkout_configuration: string | null
}

type InjectedDependencies = {
  logger: Logger
  __pg_connection__: any
}

const CONFIG_CACHE_TTL_MS = 30_000 // 30 seconds

// Currencies that use zero decimal places (amount in major units = minor units)
const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA",
  "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF",
])

/**
 * Convert Medusa major-unit amount to Reepay minor-unit (cents).
 * Medusa v2 stores prices in major units (e.g. 13.09 for EUR 13.09).
 * Reepay expects minor units (e.g. 1309 for EUR 13.09).
 */
function toMinorUnits(amount: number, currencyCode: string): number {
  if (ZERO_DECIMAL_CURRENCIES.has(currencyCode.toUpperCase())) {
    return Math.round(amount)
  }
  return Math.round(amount * 100)
}

/**
 * Convert Reepay minor-unit (cents) back to Medusa major-unit.
 */
function fromMinorUnits(amount: number, currencyCode: string): number {
  if (ZERO_DECIMAL_CURRENCIES.has(currencyCode.toUpperCase())) {
    return amount
  }
  return amount / 100
}

class FrisbiiPaymentProviderService extends AbstractPaymentProvider<Options> {
  static identifier = "frisbii-payment"

  protected logger_: Logger
  protected options_: Options
  protected pgConnection_: any
  protected apiClient_: FrisbiiApiClient
  protected checkoutClient_: FrisbiiCheckoutClient

  // Config cache
  private cachedConfig_: FrisbiiDbConfig | null = null
  private cacheTimestamp_ = 0

  constructor(container: InjectedDependencies, options: Options) {
    super(container, options)
    this.logger_ = container.logger
    this.options_ = options
    this.pgConnection_ = container.__pg_connection__

    // Initialize clients with empty key — will be set from DB config before each call
    this.apiClient_ = new FrisbiiApiClient({
      apiKey: "",
      logger: this.logger_,
    })

    this.checkoutClient_ = new FrisbiiCheckoutClient({
      apiKey: "",
      logger: this.logger_,
    })
  }

  /**
   * Reads config from the frisbii_config table. Caches for 30 seconds.
   * Falls back to env var options if DB query fails.
   */
  private async getConfig(): Promise<FrisbiiDbConfig> {
    const now = Date.now()
    if (this.cachedConfig_ && now - this.cacheTimestamp_ < CONFIG_CACHE_TTL_MS) {
      return this.cachedConfig_
    }

    try {
      if (this.pgConnection_) {
        const result = await this.pgConnection_
          .select("*")
          .from("frisbii_config")
          .where("id", "default")
          .first()

        if (result) {
          this.cachedConfig_ = result
          this.cacheTimestamp_ = now
          return result
        }
      }
    } catch (error) {
      this.logger_.warn(`Frisbii: failed to read config from database: ${error}`)
    }

    // Fallback to env var options
    return {
      api_key_test: this.options_.apiKeyTest || "",
      api_key_live: this.options_.apiKeyLive || "",
      api_mode: (this.options_.apiMode as "test" | "live") || "test",
      locale: "en_GB",
      display_type: "overlay",
      allowed_payment_methods: [],
      auto_capture: false,
      checkout_configuration: null,
    }
  }

  /**
   * Gets the active API key and updates both clients.
   */
  private async refreshApiKey(): Promise<string> {
    const config = await this.getConfig()
    const apiKey = config.api_mode === "live"
      ? config.api_key_live
      : config.api_key_test

    if (!apiKey) {
      throw new Error(
        `Frisbii: No API key configured for ${config.api_mode} mode. ` +
        `Please set an API key in Settings > Frisbii Pay.`
      )
    }

    this.apiClient_.setApiKey(apiKey)
    this.checkoutClient_.setApiKey(apiKey)
    return apiKey
  }

  async initiatePayment(
    input: InitiatePaymentInput
  ): Promise<InitiatePaymentOutput> {
    await this.refreshApiKey()
    const config = await this.getConfig()

    const chargeHandle = `cart-${Date.now()}`

    const extra = ((input.data as any)?.extra || {}) as Record<string, unknown>

    const sessionPayload: Record<string, unknown> = {
      order: {
        handle: chargeHandle,
        amount: toMinorUnits(Number(input.amount), input.currency_code),
        currency: input.currency_code.toUpperCase(),
      },
      accept_url: extra.accept_url || undefined,
      cancel_url: extra.cancel_url || undefined,
    }

    // Use config from DB, with context overrides
    const locale = (extra.locale as string) || config.locale
    if (locale) sessionPayload.locale = locale

    const allowedMethods = (extra.allowed_payment_methods as string[]) || config.allowed_payment_methods
    if (allowedMethods?.length) sessionPayload.payment_methods = allowedMethods

    const autoCapture = extra.auto_capture !== undefined
      ? extra.auto_capture
      : config.auto_capture
    if (autoCapture !== undefined) sessionPayload.settle = autoCapture

    const checkoutConfig = (extra.checkout_configuration as string) || config.checkout_configuration
    if (checkoutConfig) sessionPayload.configuration = checkoutConfig

    if (input.context?.customer) {
      const customer = input.context.customer as Record<string, unknown>
      sessionPayload.order = {
        ...(sessionPayload.order as Record<string, unknown>),
        customer: {
          email: customer.email,
          first_name: customer.first_name,
          last_name: customer.last_name,
          handle: customer.id,
          generate_handle: false,
        },
      }
    } else if (extra.customer_email) {
      sessionPayload.order = {
        ...(sessionPayload.order as Record<string, unknown>),
        customer: {
          email: extra.customer_email,
          first_name: extra.customer_first_name || "",
          last_name: extra.customer_last_name || "",
          handle: extra.customer_handle || `guest-${chargeHandle}`,
          generate_handle: false,
        },
      }
    }

    const session = await this.checkoutClient_.post<{ id: string }>(
      "session/charge",
      sessionPayload
    )

    // Store the session mapping so webhooks can look up the Medusa payment session
    const medusaSessionId = (input.data as Record<string, unknown>)?.session_id as string
    if (medusaSessionId) {
      try {
        await this.pgConnection_("frisbii_session").insert({
          id: `fses_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          session_handle: session.id,
          charge_handle: chargeHandle,
          cart_id: (extra.cart_id as string) || "",
          payment_session_id: medusaSessionId,
          created_at: new Date(),
          updated_at: new Date(),
        })
      } catch (error) {
        this.logger_.warn(`Frisbii: failed to store session mapping: ${error}`)
      }
    }

    return {
      id: session.id,
      data: {
        session_id: session.id,
        charge_handle: chargeHandle,
        currency_code: input.currency_code,
        display_type: (extra.display_type as string) || config.display_type || "overlay",
        // Store accept_url so the frontend can redirect the browser to this URL
        // after payment is confirmed (avoids race condition with Reepay API state).
        accept_url: (sessionPayload.accept_url as string) || null,
      },
    }
  }

  async authorizePayment(
    input: AuthorizePaymentInput
  ): Promise<AuthorizePaymentOutput> {
    await this.refreshApiKey()

    const chargeHandle = (input.data as Record<string, unknown>)?.charge_handle as string
    if (!chargeHandle) {
      this.logger_.error("Frisbii authorizePayment: missing charge_handle in session data")
      return {
        status: "error" as PaymentSessionStatus,
        data: input.data as Record<string, unknown>,
      }
    }

    // Retry polling the Reepay REST API to handle the race condition where
    // the browser is redirected to accept_url before the charge has fully
    // transitioned to "authorized" state in Reepay's REST API.
    const MAX_AUTH_ATTEMPTS = 5
    const AUTH_RETRY_DELAYS_MS = [1000, 2000, 3000, 5000]

    for (let attempt = 0; attempt < MAX_AUTH_ATTEMPTS; attempt++) {
      try {
        this.logger_.debug(
          `Frisbii authorizePayment: attempt ${attempt + 1}/${MAX_AUTH_ATTEMPTS} for charge "${chargeHandle}"`
        )

        const charge = await this.apiClient_.get<{ state: string; amount: number; handle: string }>(
          `charge/${chargeHandle}`
        )

        this.logger_.debug(
          `Frisbii authorizePayment: charge "${chargeHandle}" state = "${charge.state}"`
        )

        if (charge.state === "authorized" || charge.state === "settled") {
          return {
            status: "authorized" as PaymentSessionStatus,
            data: {
              ...(input.data as Record<string, unknown>),
              charge_state: charge.state,
            },
          }
        }

        // Charge exists but not yet authorized (e.g. "created", "pending")
        this.logger_.debug(
          `Frisbii authorizePayment: charge state "${charge.state}" is not authorized — ` +
          (attempt < AUTH_RETRY_DELAYS_MS.length ? "retrying..." : "giving up")
        )
      } catch (err: any) {
        this.logger_.warn(
          `Frisbii authorizePayment: error fetching charge "${chargeHandle}" (attempt ${attempt + 1}): ${err.message}`
        )
      }

      if (attempt < AUTH_RETRY_DELAYS_MS.length) {
        await new Promise((resolve) => setTimeout(resolve, AUTH_RETRY_DELAYS_MS[attempt]))
      }
    }

    this.logger_.warn(
      `Frisbii authorizePayment: charge "${chargeHandle}" not authorized after ${MAX_AUTH_ATTEMPTS} attempts`
    )

    return {
      status: "pending" as PaymentSessionStatus,
      data: input.data as Record<string, unknown>,
    }
  }

  async capturePayment(
    input: CapturePaymentInput
  ): Promise<CapturePaymentOutput> {
    await this.refreshApiKey()

    const chargeHandle = (input.data as Record<string, unknown>)?.charge_handle as string
    const result = await this.apiClient_.post<{ state: string }>(
      `charge/${chargeHandle}/settle`,
      {}
    )

    return {
      data: {
        ...(input.data as Record<string, unknown>),
        charge_state: result.state,
      },
    }
  }

  async refundPayment(
    input: RefundPaymentInput
  ): Promise<RefundPaymentOutput> {
    await this.refreshApiKey()

    const chargeHandle = (input.data as Record<string, unknown>)?.charge_handle as string
    const currencyCode = (input.data as Record<string, unknown>)?.currency_code as string || "EUR"
    const refundPayload = {
      invoice: chargeHandle,
      amount: toMinorUnits(Number(input.amount), currencyCode),
    }

    const result = await this.apiClient_.post<{ id: string; state: string }>(
      "refund",
      refundPayload
    )

    return {
      data: {
        ...(input.data as Record<string, unknown>),
        refund_id: result.id,
        refund_state: result.state,
      },
    }
  }

  async cancelPayment(
    input: CancelPaymentInput
  ): Promise<CancelPaymentOutput> {
    await this.refreshApiKey()

    const chargeHandle = (input.data as Record<string, unknown>)?.charge_handle as string
    await this.apiClient_.post(`charge/${chargeHandle}/cancel`)

    return {
      data: {
        ...(input.data as Record<string, unknown>),
        charge_state: "cancelled",
      },
    }
  }

  async deletePayment(
    input: DeletePaymentInput
  ): Promise<DeletePaymentOutput> {
    const sessionId = (input.data as Record<string, unknown>)?.session_id as string
    if (sessionId) {
      try {
        await this.refreshApiKey()
        await this.checkoutClient_.delete(`session/${sessionId}`)
      } catch (error) {
        this.logger_.warn(`Frisbii: failed to delete session ${sessionId}: ${error}`)
      }
    }

    return {
      data: input.data as Record<string, unknown>,
    }
  }

  async getPaymentStatus(
    input: GetPaymentStatusInput
  ): Promise<GetPaymentStatusOutput> {
    const chargeHandle = (input.data as Record<string, unknown>)?.charge_handle as string
    if (!chargeHandle) {
      return { status: "pending" as PaymentSessionStatus }
    }

    try {
      await this.refreshApiKey()
      const charge = await this.apiClient_.get<{ state: string }>(
        `charge/${chargeHandle}`
      )

      switch (charge.state) {
        case "authorized":
          return { status: "authorized" as PaymentSessionStatus }
        case "settled":
          return { status: "captured" as PaymentSessionStatus }
        case "cancelled":
          return { status: "canceled" as PaymentSessionStatus }
        case "failed":
          return { status: "error" as PaymentSessionStatus }
        default:
          return { status: "pending" as PaymentSessionStatus }
      }
    } catch {
      return { status: "pending" as PaymentSessionStatus }
    }
  }

  async retrievePayment(
    input: RetrievePaymentInput
  ): Promise<RetrievePaymentOutput> {
    await this.refreshApiKey()

    const chargeHandle = (input.data as Record<string, unknown>)?.charge_handle as string
    const charge = await this.apiClient_.get<Record<string, unknown>>(
      `charge/${chargeHandle}`
    )

    return {
      data: {
        ...(input.data as Record<string, unknown>),
        ...charge,
      },
    }
  }

  async updatePayment(
    input: UpdatePaymentInput
  ): Promise<UpdatePaymentOutput> {
    await this.deletePayment({ data: input.data as Record<string, unknown> })
    return this.initiatePayment(input as unknown as InitiatePaymentInput)
  }

  async getWebhookActionAndData(
    payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    const { data, rawData, headers } = payload
    const webhookData = data as Record<string, unknown>

    const eventType = webhookData.event_type as string
    const chargeHandle = webhookData.invoice as string

    if (!eventType || !chargeHandle) {
      this.logger_.warn("Frisbii webhook: missing event_type or invoice")
      return {
        action: PaymentActions.NOT_SUPPORTED,
        data: { session_id: "", amount: new BigNumber(0) },
      }
    }

    this.logger_.info(`Frisbii webhook: ${eventType} for charge ${chargeHandle}`)

    // Verify webhook signature if configured
    try {
      const config = await this.getConfig()
      if ((config as any).webhook_secret && webhookData.signature) {
        const crypto = await import("crypto")
        const timestamp = (webhookData.timestamp as string) || ""
        const expectedSig = crypto
          .createHmac("sha256", (config as any).webhook_secret)
          .update(timestamp + (webhookData.id as string))
          .digest("hex")
        if (webhookData.signature !== expectedSig) {
          this.logger_.warn("Frisbii webhook: invalid signature")
          return {
            action: PaymentActions.FAILED,
            data: { session_id: "", amount: new BigNumber(0) },
          }
        }
      }
    } catch (error) {
      this.logger_.warn(`Frisbii webhook: signature verification failed: ${error}`)
    }

    // Look up the Medusa payment session ID via the frisbii_session table
    let paymentSessionId: string | null = null
    try {
      const session = await this.pgConnection_
        .select("payment_session_id")
        .from("frisbii_session")
        .where("charge_handle", chargeHandle)
        .first()
      paymentSessionId = session?.payment_session_id || null
    } catch (error) {
      this.logger_.error(`Frisbii webhook: failed to look up session for ${chargeHandle}: ${error}`)
    }

    if (!paymentSessionId) {
      this.logger_.warn(`Frisbii webhook: no session found for charge ${chargeHandle}`)
      return {
        action: PaymentActions.NOT_SUPPORTED,
        data: { session_id: "", amount: new BigNumber(0) },
      }
    }

    // Get charge details from Frisbii to get the amount and currency
    let amount = new BigNumber(0)
    try {
      await this.refreshApiKey()
      const charge = await this.apiClient_.get<{
        state: string
        amount: number
        currency: string
      }>(`charge/${chargeHandle}`)
      amount = new BigNumber(
        fromMinorUnits(charge.amount, charge.currency || "EUR")
      )
    } catch (error) {
      this.logger_.warn(`Frisbii webhook: failed to get charge details: ${error}`)
    }

    const payloadData = {
      session_id: paymentSessionId,
      amount,
    }

    switch (eventType) {
      case "invoice_authorized":
        return { action: PaymentActions.AUTHORIZED, data: payloadData }
      case "invoice_settled":
        return { action: PaymentActions.SUCCESSFUL, data: payloadData }
      case "invoice_cancelled":
        return { action: PaymentActions.CANCELED, data: payloadData }
      case "invoice_refund":
        // Medusa's processPaymentWorkflow doesn't handle refunds,
        // but we log it for visibility
        this.logger_.info(`Frisbii webhook: refund event for ${chargeHandle}`)
        return { action: PaymentActions.NOT_SUPPORTED, data: payloadData }
      default:
        this.logger_.info(`Frisbii webhook: unhandled event type ${eventType}`)
        return { action: PaymentActions.NOT_SUPPORTED, data: payloadData }
    }
  }
}

export default FrisbiiPaymentProviderService
