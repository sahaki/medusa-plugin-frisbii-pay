import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, Badge, Button } from "@medusajs/ui"
import { DetailWidgetProps, AdminOrder } from "@medusajs/framework/types"
import { useEffect, useState } from "react"
import { CARD_LOGOS } from "../assets/card-logos"

interface CardTransaction {
  card_type?: string
  masked_card?: string
}

interface Transaction {
  id: string
  type: string
  amount: number
  currency: string
  created: string
  settled: string | null
  state: string
  payment_type: string | null
  card_transaction: CardTransaction | null
}

interface PaymentStatus {
  charge_handle: string | null
  status: string
  currency: string | null
  authorized_amount: number
  settled_amount: number
  refunded_amount: number
  amount: number
  card_type: string | null
  masked_card: string | null
  payment_method_type: string | null
  surcharge_fee: number | null
  error: string | null
  error_state: string | null
  transactions: Transaction[] | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA",
  "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF",
])

const STATUS_COLORS: Record<string, "green" | "orange" | "red" | "grey"> = {
  authorized: "orange",
  settled: "green",
  refunded: "grey",
  cancelled: "red",
  failed: "red",
  pending: "grey",
}

const TX_TYPE_LABELS: Record<string, string> = {
  authorize: "Authorization",
  settle: "Settlement",
  refund: "Refund",
  cancel: "Cancellation",
}

const TX_TYPE_COLORS: Record<string, "green" | "orange" | "red" | "grey"> = {
  authorize: "orange",
  settle: "green",
  refund: "grey",
  cancel: "red",
}

// Map Reepay card_type values to CARD_LOGOS keys
const CARD_TYPE_LOGO_MAP: Record<string, string> = {
  visa: "visa",
  mastercard: "mastercard",
  mc: "mastercard",
  maestro: "maestro",
  american_express: "amex",
  amex: "amex",
  dankort: "dankort",
  mobilepay: "mobilepay",
  vipps: "vipps",
  klarna: "klarna",
  klarna_pay_later: "klarna",
  klarna_pay_now: "klarna",
  klarna_slice_it: "klarna",
  googlepay: "googlepay",
  google_pay: "googlepay",
  jcb: "jcb",
  discover: "discover",
  diners: "diners",
  diners_club_international: "diners",
  cup: "cup",
  unionpay: "cup",
  visa_electron: "visa-electron",
  bancontact: "bancontact",
  ideal: "ideal",
  sepa: "sepa",
  anyday: "anyday",
  swish: "swish",
}

const REEPAY_INVOICE_BASE = "https://admin.billwerk.plus/#/rp/payments/invoices/invoice/"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAmount(amount: number, currency: string): string {
  const isZero = ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase())
  const major = isZero ? amount : amount / 100
  return `${major.toFixed(isZero ? 0 : 2)} ${currency.toUpperCase()}`
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString()
  } catch {
    return dateStr
  }
}

function getCardLogoDataUri(cardType: string | null): string | null {
  if (!cardType) return null
  const key = CARD_TYPE_LOGO_MAP[cardType.toLowerCase()]
  return key ? (CARD_LOGOS[key] || null) : null
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function BalanceLine({
  label,
  amount,
  currency,
}: {
  label: string
  amount: number
  currency: string
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <Text size="small" className="text-ui-fg-subtle font-semibold">
        {label}:
      </Text>
      <Text size="small" weight="plus">
        {formatAmount(amount, currency)}
      </Text>
    </div>
  )
}

// ─── Main Widget ──────────────────────────────────────────────────────────────

const FrisbiiOrderPaymentWidget = ({ data }: DetailWidgetProps<AdminOrder>) => {
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/admin/frisbii/payment-status/${data.id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setPaymentStatus(d.payment_status || null))
      .catch(() => setPaymentStatus(null))
      .finally(() => setLoading(false))
  }, [data.id])

  if (loading) {
    return (
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2">Invoice</Heading>
        </div>
        <div className="px-6 py-4">
          <Text className="text-ui-fg-muted">Loading…</Text>
        </div>
      </Container>
    )
  }

  if (!paymentStatus) {
    return null
  }

  const currency = paymentStatus.currency || "EUR"
  const authorizedAmount = paymentStatus.authorized_amount ?? 0
  const settledAmount = paymentStatus.settled_amount ?? 0
  const refundedAmount = paymentStatus.refunded_amount ?? 0
  const remainingBalance = authorizedAmount > 0 ? authorizedAmount - settledAmount : 0

  // Pick card info from first card transaction or from source fields
  const firstCardTx = paymentStatus.transactions?.find(
    (t) => t.card_transaction?.card_type || t.card_transaction?.masked_card
  )
  const cardType = firstCardTx?.card_transaction?.card_type || paymentStatus.card_type || null
  const maskedCard = firstCardTx?.card_transaction?.masked_card || paymentStatus.masked_card || null
  const cardLogoUri = getCardLogoDataUri(cardType)
  const hasCardPayment = !!(cardType || maskedCard)

  const invoiceUrl = paymentStatus.charge_handle
    ? `${REEPAY_INVOICE_BASE}${paymentStatus.charge_handle}`
    : null

  return (
    <Container className="divide-y p-0">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Invoice</Heading>
        {paymentStatus.status && (
          <Badge color={STATUS_COLORS[paymentStatus.status] || "grey"}>
            {paymentStatus.status.charAt(0).toUpperCase() + paymentStatus.status.slice(1)}
          </Badge>
        )}
      </div>

      <div className="px-6 py-4 flex flex-col gap-3">
        {/* Invoice handle */}
        {paymentStatus.charge_handle && (
          <div className="flex flex-col gap-0.5">
            <Text size="xsmall" className="text-ui-fg-muted uppercase tracking-wide">
              Invoice handle
            </Text>
            <Text size="small">{paymentStatus.charge_handle}</Text>
          </div>
        )}

        {/* State label (redundant with badge but matches WP layout reference) */}
        <div className="flex flex-col gap-0.5">
          <Text size="xsmall" className="text-ui-fg-muted uppercase tracking-wide">
            State
          </Text>
          <Text
            size="small"
            style={{
              color:
                paymentStatus.status === "settled" ? "#047857"
                : paymentStatus.status === "authorized" ? "#b45309"
                : paymentStatus.status === "cancelled" || paymentStatus.status === "failed" ? "#b91c1c"
                : undefined,
            }}
          >
            {paymentStatus.status.charAt(0).toUpperCase() + paymentStatus.status.slice(1)}
          </Text>
        </div>

        {/* Payment method */}
        {hasCardPayment && (
          <div className="flex flex-col gap-0.5">
            <Text size="xsmall" className="text-ui-fg-muted uppercase tracking-wide">
              Payment method
            </Text>
            <div className="flex items-center gap-2">
              {cardLogoUri ? (
                <img
                  src={cardLogoUri}
                  alt={cardType || "card"}
                  style={{ maxWidth: 56, height: "auto" }}
                />
              ) : (
                cardType && (
                  <span className="inline-flex items-center rounded border border-ui-border-base px-1.5 py-0.5 text-ui-fg-subtle text-xs font-semibold uppercase">
                    {cardType.replace(/_/g, " ")}
                  </span>
                )
              )}
              {maskedCard && (
                <Text size="small" className="font-mono">
                  {maskedCard}
                </Text>
              )}
            </div>
          </div>
        )}

        {/* Error info */}
        {paymentStatus.error && (
          <Text size="small" className="text-ui-fg-error">
            Error: {paymentStatus.error}
            {paymentStatus.error_state ? ` (${paymentStatus.error_state})` : ""}
          </Text>
        )}

        {/* Balance breakdown */}
        <div className="border-t border-ui-border-base pt-3 flex flex-col">
          <BalanceLine label="REMAINING BALANCE" amount={remainingBalance} currency={currency} />
          <BalanceLine label="TOTAL AUTHORIZED" amount={authorizedAmount} currency={currency} />
          <BalanceLine label="TOTAL SETTLED" amount={settledAmount} currency={currency} />
          <BalanceLine label="TOTAL REFUNDED" amount={refundedAmount} currency={currency} />
          {paymentStatus.surcharge_fee != null && paymentStatus.surcharge_fee > 0 && (
            <BalanceLine
              label="SURCHARGE FEE"
              amount={paymentStatus.surcharge_fee}
              currency={currency}
            />
          )}
        </div>

        {/* Transaction history */}
        {paymentStatus.transactions && paymentStatus.transactions.length > 0 && (
          <div className="border-t border-ui-border-base pt-3 flex flex-col gap-2">
            <Text weight="plus" size="small">
              Transactions
            </Text>
            {paymentStatus.transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between rounded-md border border-ui-border-base px-3 py-2"
              >
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <Badge color={TX_TYPE_COLORS[tx.type] || "grey"} size="2xsmall">
                      {TX_TYPE_LABELS[tx.type] || tx.type}
                    </Badge>
                    {tx.state !== "completed" && (
                      <Badge color="red" size="2xsmall">
                        {tx.state}
                      </Badge>
                    )}
                  </div>
                  <Text size="xsmall" className="text-ui-fg-muted">
                    {formatDate(tx.created)}
                  </Text>
                </div>
                <Text size="small" weight="plus">
                  {formatAmount(tx.amount, tx.currency || currency)}
                </Text>
              </div>
            ))}
          </div>
        )}

        {/* See invoice button */}
        {invoiceUrl && (
          <div className="border-t border-ui-border-base pt-3">
            <a href={invoiceUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary" size="small">
                See invoice
              </Button>
            </a>
          </div>
        )}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.side.after",
})

export default FrisbiiOrderPaymentWidget

