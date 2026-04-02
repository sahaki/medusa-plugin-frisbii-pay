import type { Logger } from "@medusajs/types"

export interface FrisbiiApiError {
  http_status: number
  http_reason: string
  request_id?: string
  code?: string
  error?: string
  message?: string
}

export interface FrisbiiRequestOptions {
  timeout?: number
}

export class FrisbiiApiRequestError extends Error {
  public apiError: FrisbiiApiError

  constructor(apiError: FrisbiiApiError) {
    const msg =
      apiError.message ||
      apiError.error ||
      `${apiError.http_status} ${apiError.http_reason}`
    super(msg)
    this.name = "FrisbiiApiRequestError"
    this.apiError = apiError
  }
}

export class FrisbiiApiClient {
  protected baseUrl: string
  protected apiKey: string
  protected logger: Logger
  protected timeout: number

  constructor(config: {
    apiKey: string
    logger: Logger
    baseUrl?: string
    timeout?: number
  }) {
    this.apiKey = config.apiKey
    this.logger = config.logger
    this.baseUrl = config.baseUrl ?? "https://api.reepay.com/v1/"
    this.timeout = config.timeout ?? 30_000

    // Ensure baseUrl ends with /
    if (!this.baseUrl.endsWith("/")) {
      this.baseUrl += "/"
    }
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey
  }

  async get<T>(
    endpoint: string,
    params?: Record<string, string>
  ): Promise<T> {
    let url = this.buildUrl(endpoint)
    if (params) {
      const searchParams = new URLSearchParams(params)
      url += `?${searchParams.toString()}`
    }
    return this.request<T>("GET", url)
  }

  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    const url = this.buildUrl(endpoint)
    return this.request<T>("POST", url, body)
  }

  async put<T>(endpoint: string, body?: unknown): Promise<T> {
    const url = this.buildUrl(endpoint)
    return this.request<T>("PUT", url, body)
  }

  async delete<T>(endpoint: string): Promise<T> {
    const url = this.buildUrl(endpoint)
    return this.request<T>("DELETE", url)
  }

  private buildUrl(endpoint: string): string {
    // Strip leading slash from endpoint to avoid double slashes
    const cleanEndpoint = endpoint.startsWith("/")
      ? endpoint.slice(1)
      : endpoint
    return `${this.baseUrl}${cleanEndpoint}`
  }

  private getAuthHeader(): string {
    const encoded = Buffer.from(`${this.apiKey}:`).toString("base64")
    return `Basic ${encoded}`
  }

  private async request<T>(
    method: string,
    url: string,
    body?: unknown
  ): Promise<T> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    const headers: Record<string, string> = {
      Authorization: this.getAuthHeader(),
      "Content-Type": "application/json",
      Accept: "application/json",
    }

    const fetchOptions: RequestInit = {
      method,
      headers,
      signal: controller.signal,
    }

    if (body !== undefined && (method === "POST" || method === "PUT")) {
      fetchOptions.body = JSON.stringify(body)
    }

    this.logger.debug(`Frisbii API request: ${method} ${url}`)

    try {
      const response = await fetch(url, fetchOptions)

      clearTimeout(timeoutId)

      if (!response.ok) {
        let apiError: FrisbiiApiError

        try {
          const errorBody = await response.json() as any
          apiError = {
            http_status: response.status,
            http_reason: response.statusText,
            request_id: errorBody.request_id,
            code: errorBody.code,
            error: errorBody.error,
            message: errorBody.message,
          }
        } catch {
          apiError = {
            http_status: response.status,
            http_reason: response.statusText,
          }
        }

        this.logger.debug(
          `Frisbii API error: ${method} ${url} -> ${response.status} ${response.statusText}`
        )

        throw new FrisbiiApiRequestError(apiError)
      }

      // Handle 204 No Content
      if (response.status === 204) {
        this.logger.debug(`Frisbii API response: ${method} ${url} -> 204`)
        return undefined as T
      }

      const data = (await response.json()) as T

      this.logger.debug(`Frisbii API response: ${method} ${url} -> ${response.status}`)

      return data
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof FrisbiiApiRequestError) {
        throw error
      }

      if (error instanceof DOMException && error.name === "AbortError") {
        const apiError: FrisbiiApiError = {
          http_status: 0,
          http_reason: "Request timeout",
          message: `Request to ${url} timed out after ${this.timeout}ms`,
        }
        throw new FrisbiiApiRequestError(apiError)
      }

      throw error
    }
  }
}
