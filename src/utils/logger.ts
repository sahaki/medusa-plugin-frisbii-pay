import * as fs from "fs"
import * as path from "path"

// Allowed log sources — whitelist prevents path traversal via source names
export const LOG_SOURCES = [
  "frisbii-api",
  "frisbii-webhook",
  "frisbii-checkout",
  "frisbii-capture",
  "frisbii-order-status",
  "frisbii-card-save",
] as const

export type LogSource = (typeof LOG_SOURCES)[number]
export type LogLevel = "INFO" | "ERROR" | "DEBUG" | "WARN"

// Fields that must never appear in log output
const SENSITIVE_FIELDS = new Set([
  "api_key",
  "api_key_test",
  "api_key_live",
  "private_key",
  "webhook_secret",
  "card_number",
  "cvv",
  "cvc",
  "authorization",
])

function getLogDir(): string {
  return (
    process.env.FRISBII_LOG_DIR ??
    path.join(process.cwd(), "var", "log", "frisbii")
  )
}

function getDateString(): string {
  return new Date().toISOString().slice(0, 10)
}

function ensureLogDir(logDir: string): void {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true })
  }
}

/**
 * Returns the absolute path for a log file for the given source.
 * Validates that the resulting path stays within logDir (path traversal prevention).
 */
export function resolveLogFilePath(source: LogSource): string {
  const logDir = getLogDir()
  const filename = `${source}-${getDateString()}.log`
  const resolved = path.resolve(logDir, filename)
  const resolvedDir = path.resolve(logDir)

  if (!resolved.startsWith(resolvedDir + path.sep)) {
    throw new Error(`Log path escapes log directory: ${resolved}`)
  }

  return resolved
}

function redactSensitiveFields(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj
  if (typeof obj !== "object") return obj
  if (Array.isArray(obj)) return obj.map(redactSensitiveFields)

  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(
    obj as Record<string, unknown>
  )) {
    if (SENSITIVE_FIELDS.has(key.toLowerCase())) {
      result[key] = "[REDACTED]"
    } else {
      result[key] = redactSensitiveFields(value)
    }
  }
  return result
}

function formatLogEntry(
  level: LogLevel,
  source: LogSource,
  message: string,
  data?: unknown
): string {
  const timestamp = new Date().toISOString()
  const header = `[${timestamp}] [${level}] [${source}] ${message}`

  if (data === undefined) {
    return `${header}\n---\n`
  }

  const redacted = redactSensitiveFields(data)
  const dataStr = JSON.stringify(redacted, null, 2)
  return `${header}\n${dataStr}\n---\n`
}

/**
 * Write a log entry to the appropriate log file.
 * Failures are silently swallowed so logging never crashes the application.
 */
export function frisbiiLog(
  source: LogSource,
  level: LogLevel,
  message: string,
  data?: unknown
): void {
  try {
    const logDir = getLogDir()
    ensureLogDir(logDir)
    const filePath = resolveLogFilePath(source)
    const entry = formatLogEntry(level, source, message, data)
    fs.appendFileSync(filePath, entry, "utf8")
  } catch {
    // Intentionally silent — logging must not affect payment flow
  }
}

/**
 * Log a Reepay API request/response.
 * Only called when debug_enabled = true.
 */
export function frisbiiApiLog(params: {
  method: string
  url: string
  requestBody: unknown
  responseBody: unknown
  httpCode: number
  durationMs: number
}): void {
  frisbiiLog("frisbii-api", "INFO", `${params.method} ${params.url}`, {
    method: params.method,
    url: params.url,
    request: params.requestBody,
    response: params.responseBody,
    http_code: params.httpCode,
    duration_ms: params.durationMs,
  })
}
