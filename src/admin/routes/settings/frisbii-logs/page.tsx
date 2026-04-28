import { defineRouteConfig } from "@medusajs/admin-sdk"
import { DocumentText } from "@medusajs/icons"
import {
  Container,
  Heading,
  Text,
  Button,
  Table,
  Badge,
} from "@medusajs/ui"
import { useEffect, useState } from "react"
import { useAdminTranslation } from "../../../locale/index"

interface LogFile {
  name: string
  source: string
  date: string
  size_bytes: number
  size_label: string
  created_at: string
  modified_at: string
}

const FrisbiiLogsPage = () => {
  const [files, setFiles] = useState<LogFile[]>([])
  const [loading, setLoading] = useState(true)
  const [debugEnabled, setDebugEnabled] = useState<boolean | null>(null)
  const [locale, setLocale] = useState<string | undefined>(undefined)

  const { t } = useAdminTranslation(locale)

  useEffect(() => {
    // Check if debug mode is enabled first
    fetch("/admin/frisbii/config", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setDebugEnabled(data.config?.debug_enabled ?? false)
        setLocale(data.config?.locale)
        if (data.config?.debug_enabled) {
          return fetch("/admin/frisbii/logs", { credentials: "include" })
            .then((r) => r.json())
            .then((d) => setFiles(d.files ?? []))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const refresh = () => {
    setLoading(true)
    fetch("/admin/frisbii/logs", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setFiles(data.files ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  if (loading) {
    return (
      <Container>
        <Text>{t.loading}</Text>
      </Container>
    )
  }

  if (debugEnabled === false) {
    return (
      <Container className="flex flex-col items-center gap-4 py-12">
        <Heading level="h2">{t.logViewerTitle}</Heading>
        <Text className="text-ui-fg-muted text-center max-w-md">
          {t.logDebugDisabled}
        </Text>
        <Button
          variant="secondary"
          onClick={() => {
            window.location.href = "/app/settings/frisbii"
          }}
        >
          {t.logGoToSettings}
        </Button>
      </Container>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2">{t.logViewerTitle}</Heading>
          <Button variant="secondary" size="small" onClick={refresh}>
            {t.logRefresh}
          </Button>
        </div>

        {files.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <Text className="text-ui-fg-muted">{t.logNoFiles}</Text>
          </div>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>{t.logSource}</Table.HeaderCell>
                <Table.HeaderCell>{t.logDateCreated}</Table.HeaderCell>
                <Table.HeaderCell>{t.logDateModified}</Table.HeaderCell>
                <Table.HeaderCell>{t.logFileSize}</Table.HeaderCell>
                <Table.HeaderCell />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {files.map((file) => (
                <Table.Row key={file.name}>
                  <Table.Cell>
                    <Badge color="blue" size="2xsmall">
                      {file.source}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>{file.date}</Table.Cell>
                  <Table.Cell>
                    {new Date(file.modified_at).toLocaleString()}
                  </Table.Cell>
                  <Table.Cell>{file.size_label}</Table.Cell>
                  <Table.Cell>
                    <Button
                      variant="transparent"
                      size="small"
                      onClick={() => {
                        window.location.href = `/app/settings/frisbii-logs/${encodeURIComponent(file.name)}`
                      }}
                    >
                      {t.logViewAction}
                    </Button>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </Container>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Frisbii Pay Log",
  icon: DocumentText,
})

export default FrisbiiLogsPage
