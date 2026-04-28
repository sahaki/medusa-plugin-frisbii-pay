import * as fs from "fs"
import * as path from "path"
import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"

// Only filenames matching this pattern are served — prevents path traversal
const LOG_FILENAME_PATTERN = /^frisbii-[a-z-]+-\d{4}-\d{2}-\d{2}\.log$/

const DEFAULT_PAGE_SIZE = 100

function getLogDir(): string {
  return (
    process.env.FRISBII_LOG_DIR ??
    path.join(process.cwd(), "var", "log", "frisbii")
  )
}

/**
 * GET /admin/frisbii/logs/:filename?page=1&limit=100
 * Returns paginated lines from the requested log file.
 *
 * Security:
 *  - filename must match LOG_FILENAME_PATTERN (whitelist check)
 *  - resolved path is verified to stay within logDir (path traversal prevention)
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const { filename } = req.params as { filename: string }

  // 1. Whitelist check
  if (!LOG_FILENAME_PATTERN.test(filename)) {
    return res.status(400).json({ error: "Invalid log filename" })
  }

  // 2. Path confinement check
  const logDir = getLogDir()
  const resolved = path.resolve(logDir, filename)
  const resolvedDir = path.resolve(logDir)

  if (!resolved.startsWith(resolvedDir + path.sep) && resolved !== resolvedDir) {
    return res.status(400).json({ error: "Invalid log filename" })
  }

  if (!fs.existsSync(resolved)) {
    return res.status(404).json({ error: "Log file not found" })
  }

  // 3. Parse pagination params
  const rawPage = parseInt((req.query as any).page ?? "1", 10)
  const rawLimit = parseInt((req.query as any).limit ?? String(DEFAULT_PAGE_SIZE), 10)
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 && rawLimit <= 500
    ? rawLimit
    : DEFAULT_PAGE_SIZE

  try {
    const content = fs.readFileSync(resolved, "utf8")
    const lines = content.split("\n")
    const totalLines = lines.length
    const totalPages = Math.max(1, Math.ceil(totalLines / limit))

    const startIndex = (page - 1) * limit
    const pageLines = lines.slice(startIndex, startIndex + limit)

    return res.json({
      filename,
      content: pageLines.join("\n"),
      lines: pageLines,
      total_lines: totalLines,
      total_pages: totalPages,
      page,
      limit,
    })
  } catch {
    return res.status(500).json({ error: "An unexpected error occurred" })
  }
}
