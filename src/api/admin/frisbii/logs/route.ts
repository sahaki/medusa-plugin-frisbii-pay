import * as fs from "fs"
import * as path from "path"
import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { LOG_SOURCES, type LogSource } from "../../../../utils/logger"

// Pattern that every valid Frisbii log filename must match
// Example: frisbii-api-2026-04-28.log
const LOG_FILENAME_PATTERN = /^frisbii-[a-z-]+-\d{4}-\d{2}-\d{2}\.log$/

function getLogDir(): string {
  return (
    process.env.FRISBII_LOG_DIR ??
    path.join(process.cwd(), "var", "log", "frisbii")
  )
}

function parseLogSource(filename: string): LogSource | null {
  // filename: frisbii-api-2026-04-28.log → strip prefix + date suffix
  const withoutExt = filename.replace(/\.log$/, "")
  const dateMatch = withoutExt.match(/-(\d{4}-\d{2}-\d{2})$/)
  if (!dateMatch) return null
  const sourceWithPrefix = withoutExt.slice(0, withoutExt.length - dateMatch[0].length)
  return LOG_SOURCES.includes(sourceWithPrefix as LogSource)
    ? (sourceWithPrefix as LogSource)
    : null
}

function parseLogDate(filename: string): string | null {
  const match = filename.match(/(\d{4}-\d{2}-\d{2})\.log$/)
  return match ? match[1] : null
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * GET /admin/frisbii/logs
 * Returns a list of all log files sorted by modification time descending.
 */
export const GET = async (
  _req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const logDir = getLogDir()

  if (!fs.existsSync(logDir)) {
    return res.json({ files: [] })
  }

  try {
    const entries = fs.readdirSync(logDir)

    const files = entries
      .filter((name) => LOG_FILENAME_PATTERN.test(name))
      .map((name) => {
        const filePath = path.resolve(logDir, name)
        const stats = fs.statSync(filePath)
        return {
          name,
          source: parseLogSource(name) ?? name,
          date: parseLogDate(name) ?? "",
          size_bytes: stats.size,
          size_label: formatBytes(stats.size),
          created_at: stats.birthtime.toISOString(),
          modified_at: stats.mtime.toISOString(),
        }
      })
      .sort(
        (a, b) =>
          new Date(b.modified_at).getTime() - new Date(a.modified_at).getTime()
      )

    return res.json({ files })
  } catch (err) {
    return res
      .status(500)
      .json({ error: "An unexpected error occurred" })
  }
}
