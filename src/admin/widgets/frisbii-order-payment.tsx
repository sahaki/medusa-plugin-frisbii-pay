import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, Badge } from "@medusajs/ui"
import { DetailWidgetProps, AdminOrder } from "@medusajs/framework/types"
import { useEffect, useState } from "react"

interface Transaction {
  id: string
  type: string
  amount: number
  currency: string
  created: string
  settled: string | null
  state: string
  payment_type: string | null
}

interface PaymentStatus {
  status: string
  masked_card: string | null
  card_type: string | null
  payment_method_type: string | null
  surcharge_fee: number | null
  transactions: Transaction[] | null
  error: string | null
  error_state: string | null
}

const statusColors: Record<string, "green" | "orange" | "red" | "grey"> = {
  authorized: "orange",
  settled: "green",
  refunded: "grey",
  cancelled: "red",
  failed: "red",
  pending: "grey",
}

const transactionTypeLabels: Record<string, string> = {
  authorize: "Authorization",
  settle: "Settlement",
  refund: "Refund",
  cancel: "Cancellation",
}

const transactionTypeColors: Record<string, "green" | "orange" | "red" | "grey"> = {
  authorize: "orange",
  settle: "green",
  refund: "grey",
  cancel: "red",
}

function formatAmount(amount: number, currency: string): string {
  const zeroDecimal = ["BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA", "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF"]
  const majorAmount = zeroDecimal.includes(currency.toUpperCase())
    ? amount
    : amount / 100
  return `${majorAmount.toFixed(zeroDecimal.includes(currency.toUpperCase()) ? 0 : 2)} ${currency.toUpperCase()}`
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleString()
  } catch {
    return dateStr
  }
}

const FrisbiiOrderPaymentWidget = ({ data }: DetailWidgetProps<AdminOrder>) => {
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null)

  useEffect(() => {
    fetch(`/admin/frisbii/payment-status/${data.id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setPaymentStatus(d.payment_status))
      .catch(() => {})
  }, [data.id])

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Frisbii Payment</Heading>
        {paymentStatus && (
          <Badge color={statusColors[paymentStatus.status] || "grey"}>
            {paymentStatus.status}
          </Badge>
        )}
      </div>
      <div className="px-6 py-4">
        {paymentStatus ? (
          <div className="flex flex-col gap-4">
            {/* Payment method info */}
            <div className="flex flex-col gap-1">
              {paymentStatus.card_type && (
                <Text size="small" className="text-ui-fg-subtle">
                  Card: {paymentStatus.card_type} {paymentStatus.masked_card}
                </Text>
              )}
              {paymentStatus.payment_method_type && (
                <Text size="small" className="text-ui-fg-subtle">
                  Method: {paymentStatus.payment_method_type}
                </Text>
              )}
              {paymentStatus.surcharge_fee != null && paymentStatus.surcharge_fee > 0 && (
                <Text size="small" className="text-ui-fg-subtle">
                  Surcharge: {(paymentStatus.surcharge_fee / 100).toFixed(2)}
                </Text>
              )}
              {paymentStatus.error && (
                <Text size="small" className="text-ui-fg-error">
                  Error: {paymentStatus.error}
                  {paymentStatus.error_state ? ` (${paymentStatus.error_state})` : ""}
                </Text>
              )}
            </div>

            {/* Transaction history */}
            {paymentStatus.transactions && paymentStatus.transactions.length > 0 && (
              <div className="flex flex-col gap-2">
                <Text weight="plus" size="small">
                  Transactions
                </Text>
                <div className="flex flex-col gap-2">
                  {paymentStatus.transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between rounded-md border border-ui-border-base px-3 py-2"
                    >
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <Badge
                            color={transactionTypeColors[tx.type] || "grey"}
                            size="2xsmall"
                          >
                            {transactionTypeLabels[tx.type] || tx.type}
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
                        {formatAmount(tx.amount, tx.currency)}
                      </Text>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <Text className="text-ui-fg-muted">No Frisbii payment data for this order</Text>
        )}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.after",
})

export default FrisbiiOrderPaymentWidget
