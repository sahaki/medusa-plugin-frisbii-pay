import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CreditCard } from "@medusajs/icons"
import {
  Container,
  Heading,
  Text,
  Switch,
  Select,
  Input,
  Button,
  Label,
  Badge,
  toast,
} from "@medusajs/ui"
import { useEffect, useState } from "react"

const PAYMENT_METHODS = [
  "card", "mobilepay", "applepay", "googlepay", "paypal",
  "viabill", "anyday", "klarna_pay_now", "klarna_pay_later",
  "klarna_slice_it", "vipps", "swish", "ideal", "sepa",
  "bancontact", "blik", "p24", "verkkopankki", "giropay",
  "eps", "trustly", "bank_transfer", "cash",
]

const LOCALES = [
  { value: "en_GB", label: "English" },
  { value: "da_DK", label: "Danish" },
  { value: "sv_SE", label: "Swedish" },
  { value: "nb_NO", label: "Norwegian" },
  { value: "de_DE", label: "German" },
  { value: "fr_FR", label: "French" },
  { value: "es_ES", label: "Spanish" },
  { value: "nl_NL", label: "Dutch" },
  { value: "pl_PL", label: "Polish" },
]

interface FrisbiiConfig {
  api_key_test: string
  api_key_live: string
  api_mode: "test" | "live"
  enabled: boolean
  title: string
  display_type: "embedded" | "overlay" | "redirect"
  send_order_lines: boolean
  send_phone_number: boolean
  auto_capture: boolean
  auto_create_invoice: boolean
  surcharge_fee_enabled: boolean
  save_card_enabled: boolean
  save_card_default_unchecked: boolean
  save_card_type: "cit" | "mit"
  cancel_on_payment_cancel: boolean
  update_payment_method: boolean
  send_order_email: boolean
  auto_cancel_enabled: boolean
  auto_cancel_timeout: number
  allowed_payment_methods: string[]
  payment_icons: string[]
  locale: string
  checkout_configuration: string | null
  webhook_secret: string | null
}

const FrisbiiSettingsPage = () => {
  const [config, setConfig] = useState<FrisbiiConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [testSuccess, setTestSuccess] = useState(false)

  useEffect(() => {
    fetch("/admin/frisbii/config", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setConfig(data.config)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const saveConfig = async () => {
    if (!config) return
    setSaving(true)
    try {
      const res = await fetch("/admin/frisbii/config", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key_test: config.api_key_test,
          api_key_live: config.api_key_live,
          api_mode: config.api_mode,
          enabled: config.enabled,
          title: config.title,
          display_type: config.display_type,
          send_order_lines: config.send_order_lines,
          send_phone_number: config.send_phone_number,
          auto_capture: config.auto_capture,
          auto_create_invoice: config.auto_create_invoice,
          surcharge_fee_enabled: config.surcharge_fee_enabled,
          save_card_enabled: config.save_card_enabled,
          save_card_default_unchecked: config.save_card_default_unchecked,
          save_card_type: config.save_card_type,
          cancel_on_payment_cancel: config.cancel_on_payment_cancel,
          update_payment_method: config.update_payment_method,
          send_order_email: config.send_order_email,
          auto_cancel_enabled: config.auto_cancel_enabled,
          auto_cancel_timeout: config.auto_cancel_timeout,
          allowed_payment_methods: config.allowed_payment_methods,
          payment_icons: config.payment_icons,
          locale: config.locale,
          checkout_configuration: config.checkout_configuration,
          webhook_secret: config.webhook_secret,
        }),
      })
      if (!res.ok) {
        toast.error("Failed to save configuration")
        setSaving(false)
        return
      }
      const data = await res.json()
      setConfig(data.config)
      toast.success("Configuration saved")
    } catch {
      toast.error("Failed to save configuration")
    }
    setSaving(false)
  }

  const testConnection = async () => {
    setTestResult(null)
    setTestSuccess(false)
    if (!config) return
    const apiKey =
      config.api_mode === "live" ? config.api_key_live : config.api_key_test
    if (!apiKey) {
      setTestResult("No API key entered for current mode")
      return
    }
    try {
      const res = await fetch("/admin/frisbii/verify-connection", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: apiKey }),
      })
      const data = await res.json()
      if (data.success) {
        setTestSuccess(true)
        setTestResult("Connection successful")
      } else {
        setTestSuccess(false)
        setTestResult(data.message || "Connection failed")
      }
    } catch {
      setTestResult("Connection test failed")
    }
  }

  const updateField = <K extends keyof FrisbiiConfig>(
    field: K,
    value: FrisbiiConfig[K]
  ) => {
    setConfig((prev) => (prev ? { ...prev, [field]: value } : null))
  }

  if (loading) return <Container><Text>Loading...</Text></Container>
  if (!config) return <Container><Text>Failed to load configuration</Text></Container>

  return (
    <div className="flex flex-col gap-4">
      {/* API & Connection */}
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h2">API &amp; Connection</Heading>
        </div>
        <div className="flex flex-col gap-4 px-6 py-4">
          <div>
            <Label>API Mode</Label>
            <Select
              value={config.api_mode}
              onValueChange={(v) => updateField("api_mode", v as "test" | "live")}
            >
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="test">Test</Select.Item>
                <Select.Item value="live">Live</Select.Item>
              </Select.Content>
            </Select>
          </div>
          <div>
            <Label>API Key (Test)</Label>
            <Input
              type="password"
              value={config.api_key_test}
              onChange={(e) => updateField("api_key_test", e.target.value)}
              placeholder="priv_xxxxxxxxxxxxxxxx"
            />
          </div>
          <div>
            <Label>API Key (Live)</Label>
            <Input
              type="password"
              value={config.api_key_live}
              onChange={(e) => updateField("api_key_live", e.target.value)}
              placeholder="priv_xxxxxxxxxxxxxxxx"
            />
          </div>
          <div>
            <Label>Webhook Secret</Label>
            <Input
              type="password"
              value={config.webhook_secret ?? ""}
              onChange={(e) =>
                updateField("webhook_secret", e.target.value || null)
              }
              placeholder="Optional — used for HMAC webhook verification"
            />
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={testConnection}>
              Test Connection
            </Button>
            {testResult && (
              <Badge color={testSuccess ? "green" : "red"}>{testResult}</Badge>
            )}
          </div>
        </div>
      </Container>

      {/* Payment Display */}
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h2">Payment Display</Heading>
        </div>
        <div className="flex flex-col gap-4 px-6 py-4">
          <div className="flex items-center justify-between">
            <Label>Enabled</Label>
            <Switch
              checked={config.enabled}
              onCheckedChange={(v) => updateField("enabled", v)}
            />
          </div>
          <div>
            <Label>Title</Label>
            <Input
              value={config.title}
              onChange={(e) => updateField("title", e.target.value)}
            />
          </div>
          <div>
            <Label>Display Type</Label>
            <Select
              value={config.display_type}
              onValueChange={(v) =>
                updateField("display_type", v as "embedded" | "overlay" | "redirect")
              }
            >
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="embedded">Embedded</Select.Item>
                <Select.Item value="overlay">Overlay</Select.Item>
                <Select.Item value="redirect">Redirect</Select.Item>
              </Select.Content>
            </Select>
          </div>
          <div>
            <Label>Locale</Label>
            <Select
              value={config.locale}
              onValueChange={(v) => updateField("locale", v)}
            >
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                {LOCALES.map((l) => (
                  <Select.Item key={l.value} value={l.value}>
                    {l.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>
          <div>
            <Label>Checkout Configuration (handle)</Label>
            <Input
              value={config.checkout_configuration ?? ""}
              onChange={(e) =>
                updateField("checkout_configuration", e.target.value || null)
              }
              placeholder="Optional Reepay checkout configuration handle"
            />
          </div>
        </div>
      </Container>

      {/* Payment Processing */}
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h2">Payment Processing</Heading>
        </div>
        <div className="flex flex-col gap-4 px-6 py-4">
          {(
            [
              ["send_order_lines", "Send Order Lines"],
              ["send_phone_number", "Send Phone Number"],
              ["auto_capture", "Auto Capture"],
              ["auto_create_invoice", "Auto Create Invoice"],
              ["send_order_email", "Send Order Email"],
              ["cancel_on_payment_cancel", "Cancel Order on Payment Cancel"],
              ["update_payment_method", "Update Payment Method After Settlement"],
              ["surcharge_fee_enabled", "Enable Surcharge Fee"],
            ] as const
          ).map(([field, label]) => (
            <div key={field} className="flex items-center justify-between">
              <Label>{label}</Label>
              <Switch
                checked={config[field]}
                onCheckedChange={(v) => updateField(field, v)}
              />
            </div>
          ))}
        </div>
      </Container>

      {/* Saved Cards */}
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h2">Saved Cards</Heading>
        </div>
        <div className="flex flex-col gap-4 px-6 py-4">
          <div className="flex items-center justify-between">
            <Label>Enable Save Credit Card</Label>
            <Switch
              checked={config.save_card_enabled}
              onCheckedChange={(v) => updateField("save_card_enabled", v)}
            />
          </div>
          {config.save_card_enabled && (
            <>
              <div className="flex items-center justify-between">
                <Label>Default Unchecked</Label>
                <Switch
                  checked={config.save_card_default_unchecked}
                  onCheckedChange={(v) =>
                    updateField("save_card_default_unchecked", v)
                  }
                />
              </div>
              <div>
                <Label>Save Card Type</Label>
                <Select
                  value={config.save_card_type}
                  onValueChange={(v) =>
                    updateField("save_card_type", v as "cit" | "mit")
                  }
                >
                  <Select.Trigger>
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="cit">Customer Initiated (CIT)</Select.Item>
                    <Select.Item value="mit">Merchant Initiated (MIT)</Select.Item>
                  </Select.Content>
                </Select>
              </div>
            </>
          )}
        </div>
      </Container>

      {/* Auto-Cancel */}
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h2">Auto-Cancel Unpaid Orders</Heading>
        </div>
        <div className="flex flex-col gap-4 px-6 py-4">
          <div className="flex items-center justify-between">
            <Label>Enable Auto-Cancel</Label>
            <Switch
              checked={config.auto_cancel_enabled}
              onCheckedChange={(v) => updateField("auto_cancel_enabled", v)}
            />
          </div>
          {config.auto_cancel_enabled && (
            <div>
              <Label>Timeout (minutes)</Label>
              <Input
                type="number"
                value={config.auto_cancel_timeout}
                onChange={(e) =>
                  updateField(
                    "auto_cancel_timeout",
                    parseInt(e.target.value) || 30
                  )
                }
              />
            </div>
          )}
        </div>
      </Container>

      {/* Payment Methods */}
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h2">Payment Methods</Heading>
        </div>
        <div className="flex flex-col gap-4 px-6 py-4">
          <div>
            <Label>Allowed Payment Methods</Label>
            <Text className="text-ui-fg-muted text-sm mb-2">
              Select methods to offer at checkout. Leave empty to allow all.
            </Text>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((method) => (
                <label key={method} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={config.allowed_payment_methods.includes(method)}
                    onChange={(e) => {
                      const methods = e.target.checked
                        ? [...config.allowed_payment_methods, method]
                        : config.allowed_payment_methods.filter(
                            (m) => m !== method
                          )
                      updateField("allowed_payment_methods", methods)
                    }}
                  />
                  {method.replace(/_/g, " ")}
                </label>
              ))}
            </div>
          </div>
        </div>
      </Container>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveConfig} isLoading={saving}>
          Save Configuration
        </Button>
      </div>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Frisbii Pay",
  icon: CreditCard,
})

export default FrisbiiSettingsPage
