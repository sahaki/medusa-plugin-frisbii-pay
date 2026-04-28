// English — source of truth for all Admin UI strings.
// Every key added here MUST also be added to da.ts (enforced by TranslationKeys type).

export const en = {
  // ─── Section headings ────────────────────────────────────────────────────────
  apiConnection: "API & Connection",
  paymentDisplay: "Payment Display",
  paymentProcessing: "Payment Processing",
  savedCards: "Saved Cards",
  autoCancel: "Auto-Cancel Unpaid Orders",
  debugMode: "Debug Mode",
  paymentMethods: "Payment Methods",

  // ─── API & Connection ────────────────────────────────────────────────────────
  apiMode: "API Mode",
  apiModeTest: "Test",
  apiModeLive: "Live",
  apiKeyTest: "API Key (Test)",
  apiKeyLive: "API Key (Live)",
  testConnection: "Test Connection",
  connectionSuccess: "Connection successful",
  connectionFailed: "Connection failed",
  noApiKey: "No API key entered for current mode",
  connectionTestFailed: "Connection test failed",

  // ─── Payment Display ─────────────────────────────────────────────────────────
  enabled: "Enabled",
  title: "Title",
  displayType: "Display Type",
  displayTypeEmbedded: "Embedded",
  displayTypeOverlay: "Overlay",
  displayTypeRedirect: "Redirect",
  locale: "Locale",
  localeLabelEn: "English",
  localeLabelDa: "Danish",
  localeLabelSv: "Swedish",
  localeLabelNb: "Norwegian",
  localeLabelDe: "German",
  localeLabelFr: "French",
  localeLabelEs: "Spanish",
  localeLabelNl: "Dutch",
  localeLabelPl: "Polish",
  localeComingSoon: "Coming soon",

  // ─── Payment Processing ───────────────────────────────────────────────────────
  sendOrderLines: "Send Order Lines",
  sendPhoneNumber: "Send Phone Number",
  autoCapture: "Auto Capture",
  autoFulfillItems: "Auto Fulfill Items",
  sendOrderEmail: "Send Order Email",
  cancelOnPaymentCancel: "Cancel Order on Payment Cancel",
  updatePaymentMethod: "Update Payment Method After Settlement",
  surchargeFeeEnabled: "Enable Surcharge Fee",

  // ─── Saved Cards ──────────────────────────────────────────────────────────────
  saveCardEnabled: "Enable Save Credit Card",
  saveCardDefaultUnchecked: "Default Unchecked",
  saveCardType: "Save Card Type",
  saveCardTypeCit: "Customer Initiated (CIT)",
  saveCardTypeMit: "Merchant Initiated (MIT)",

  // ─── Auto-Cancel ─────────────────────────────────────────────────────────────
  autoCancelEnabled: "Enable Auto-Cancel",
  autoCancelTimeout: "Timeout (minutes)",

  // ─── Debug Mode ──────────────────────────────────────────────────────────────
  debugModeEnabled: "Enable Debug Logging",
  debugModeHint: "Records API requests, responses, and key events to log files. May impact performance.",
  debugModeWarning: "Debug mode is active. Log files are written to var/log/frisbii/. Disable when not needed.",

  // ─── Payment Methods ─────────────────────────────────────────────────────────
  allowedPaymentMethods: "Allowed Payment Methods",
  allowedPaymentMethodsHint:
    "Select methods to offer at checkout. Leave empty to allow all.",

  // ─── Actions / Buttons ───────────────────────────────────────────────────────
  saveConfiguration: "Save Configuration",

  // ─── Feedback toasts ─────────────────────────────────────────────────────────
  configSaved: "Configuration saved",
  configSaveFailed: "Failed to save configuration",

  // ─── Loading / Error states ───────────────────────────────────────────────────
  loading: "Loading...",
  loadFailed: "Failed to load configuration",

  // ─── Log Viewer ───────────────────────────────────────────────────────────────
  logViewerTitle: "Frisbii Pay — Log Files",
  logSource: "Source",
  logDateCreated: "Date Created",
  logDateModified: "Date Modified",
  logFileSize: "Size",
  logViewAction: "View",
  logRefresh: "Refresh",
  logBackToList: "Back to Logs",
  logViewingFile: "Viewing log file",
  logNoFiles: "No log files found.",
  logDebugDisabled: "Debug mode is disabled. Enable it in Frisbii Pay settings to start logging.",
  logGoToSettings: "Go to Settings",
  logPage: "Page",
  logOf: "of",
  logPrevPage: "Previous",
  logNextPage: "Next",
  logLineNumber: "Line",

  // ─── Invoice widget ───────────────────────────────────────────────────────────
  invoice: "Invoice",
  noFrisbiiPayment: "No Frisbii payment found for this order.",
  invoiceHandle: "Invoice handle",
  status: "Status",
  paymentMethod: "Payment Method",
  balance: "Balance",
  remainingBalance: "Remaining Balance",
  totalAuthorized: "Total Authorized",
  totalSettled: "Total Settled",
  totalRefunded: "Total Refunded",
  fee: "Fee",
  seeInvoice: "See invoice",
  refresh: "Refresh",

  // Transaction types
  txAuthorization: "Authorization",
  txSettle: "Settlement",
  txRefund: "Refund",
  txCancel: "Cancellation",

  // Payment statuses
  statusAuthorized: "Authorized",
  statusSettled: "Settled",
  statusRefunded: "Refunded",
  statusPartiallyRefunded: "Partially Refunded",
  statusCancelled: "Cancelled",
  statusFailed: "Failed",
  statusPending: "Pending",
} as const

// TranslationKeys uses a mapped type so translation files (da.ts etc.) can
// provide any string value for each key without matching English literals.
export type TranslationKeys = { [K in keyof typeof en]: string }
