import { Container, Heading, Text, Button } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { useAdminTranslation } from "../../../../locale/index"

interface LogDetailData {
  filename: string
  lines: string[]
  total_lines: number
  total_pages: number
  page: number
  limit: number
}

const PAGE_SIZE = 100

const FrisbiiLogDetailPage = () => {
  const [data, setData] = useState<LogDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [locale, setLocale] = useState<string | undefined>(undefined)

  const { t } = useAdminTranslation(locale)

  // Derive filename from current URL path:
  // /app/settings/frisbii-logs/:filename
  const filename = decodeURIComponent(
    window.location.pathname.split("/").pop() ?? ""
  )

  useEffect(() => {
    fetch("/admin/frisbii/config", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setLocale(d.config?.locale))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!filename) return
    setLoading(true)
    fetch(
      `/admin/frisbii/logs/${encodeURIComponent(filename)}?page=${page}&limit=${PAGE_SIZE}`,
      { credentials: "include" }
    )
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filename, page])

  const goBack = () => {
    window.location.href = "/app/settings/frisbii-logs"
  }

  if (loading) {
    return (
      <Container>
        <Text>{t.loading}</Text>
      </Container>
    )
  }

  if (!data || !data.lines) {
    return (
      <Container className="flex flex-col gap-4 py-8">
        <Button variant="transparent" size="small" onClick={goBack}>
          ← {t.logBackToList}
        </Button>
        <Text className="text-ui-fg-muted">{t.loadFailed}</Text>
      </Container>
    )
  }

  const startLine = (page - 1) * PAGE_SIZE + 1

  return (
    <div className="flex flex-col gap-4">
      <Container className="divide-y p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Button variant="transparent" size="small" onClick={goBack}>
              ← {t.logBackToList}
            </Button>
            <Heading level="h2">
              {t.logViewingFile}:{" "}
              <span className="font-mono text-sm font-normal text-ui-fg-subtle">
                {data.filename}
              </span>
            </Heading>
          </div>
          <Text className="text-ui-fg-muted text-sm">
            {t.logPage} {data.page} {t.logOf} {data.total_pages}
          </Text>
        </div>

        {/* Log content */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-ui-border-base bg-ui-bg-subtle">
                <th className="w-12 px-4 py-2 text-left text-ui-fg-muted">
                  {t.logLineNumber}
                </th>
                <th className="px-4 py-2 text-left text-ui-fg-muted">
                  {/* content */}
                </th>
              </tr>
            </thead>
            <tbody>
              {data.lines.map((line, idx) => {
                const lineNum = startLine + idx
                // Colour-code by log level
                let rowClass = "border-b border-ui-border-base"
                if (line.includes("] [ERROR]")) {
                  rowClass += " bg-red-50"
                } else if (line.includes("] [WARN]")) {
                  rowClass += " bg-yellow-50"
                } else if (line.includes("] [DEBUG]")) {
                  rowClass += " bg-blue-50/30"
                }

                return (
                  <tr key={lineNum} className={rowClass}>
                    <td className="w-12 select-none px-4 py-1 text-right text-ui-fg-muted">
                      {lineNum}
                    </td>
                    <td className="px-4 py-1 whitespace-pre-wrap break-all text-ui-fg-base">
                      {line}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data.total_pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4">
            <Button
              variant="secondary"
              size="small"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ← {t.logPrevPage}
            </Button>
            <Text className="text-ui-fg-muted text-sm">
              {t.logPage} {data.page} {t.logOf} {data.total_pages}
            </Text>
            <Button
              variant="secondary"
              size="small"
              disabled={page >= data.total_pages}
              onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
            >
              {t.logNextPage} →
            </Button>
          </div>
        )}
      </Container>
    </div>
  )
}

export default FrisbiiLogDetailPage
