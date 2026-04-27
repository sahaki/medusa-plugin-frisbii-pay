// Danish translation.
// Must implement every key from TranslationKeys (inferred from en.ts).
// Missing keys = TypeScript compile error.

import type { TranslationKeys } from "./en"

export const da: TranslationKeys = {
  // ─── Section headings ─────────────────────────────────────────────────────────
  apiConnection: "API og forbindelse",
  paymentDisplay: "Betalingsvisning",
  paymentProcessing: "Betalingsbehandling",
  savedCards: "Gemte kort",
  autoCancel: "Auto-annuller ubetalte ordrer",
  paymentMethods: "Betalingsmetoder",

  // ─── API & Connection ─────────────────────────────────────────────────────────
  apiMode: "API-tilstand",
  apiModeTest: "Test",
  apiModeLive: "Live",
  apiKeyTest: "API-nøgle (Test)",
  apiKeyLive: "API-nøgle (Live)",
  testConnection: "Test forbindelse",
  connectionSuccess: "Forbindelsen lykkedes",
  connectionFailed: "Forbindelsen mislykkedes",
  noApiKey: "Ingen API-nøgle angivet for den valgte tilstand",
  connectionTestFailed: "Forbindelsestest mislykkedes",

  // ─── Payment Display ──────────────────────────────────────────────────────────
  enabled: "Aktiveret",
  title: "Titel",
  displayType: "Visningstype",
  displayTypeEmbedded: "Indlejret",
  displayTypeOverlay: "Overlejring",
  displayTypeRedirect: "Omdirigering",
  locale: "Sprog",
  localeLabelEn: "Engelsk",
  localeLabelDa: "Dansk",
  localeLabelSv: "Svensk",
  localeLabelNb: "Norsk",
  localeLabelDe: "Tysk",
  localeLabelFr: "Fransk",
  localeLabelEs: "Spansk",
  localeLabelNl: "Hollandsk",
  localeLabelPl: "Polsk",
  localeComingSoon: "Kommer snart",

  // ─── Payment Processing ────────────────────────────────────────────────────────
  sendOrderLines: "Send ordrelinjer",
  sendPhoneNumber: "Send telefonnummer",
  autoCapture: "Automatisk hævning",
  autoFulfillItems: "Automatisk ekspeder ordrelinjer",
  sendOrderEmail: "Send ordrebekræftelse",
  cancelOnPaymentCancel: "Annuller ordre ved betalingsannullering",
  updatePaymentMethod: "Opdater betalingsmetode efter afregning",
  surchargeFeeEnabled: "Aktiver tillægsgebyr",

  // ─── Saved Cards ──────────────────────────────────────────────────────────────
  saveCardEnabled: "Gem kreditkort",
  saveCardDefaultUnchecked: "Ikke markeret som standard",
  saveCardType: "Gem korttype",
  saveCardTypeCit: "Kundeinitieret (CIT)",
  saveCardTypeMit: "Handlende initieret (MIT)",

  // ─── Auto-Cancel ──────────────────────────────────────────────────────────────
  autoCancelEnabled: "Aktiver auto-annullering",
  autoCancelTimeout: "Tidsfrist (minutter)",

  // ─── Payment Methods ──────────────────────────────────────────────────────────
  allowedPaymentMethods: "Tilladte betalingsmetoder",
  allowedPaymentMethodsHint:
    "Vælg metoder til checkout. Lad feltet være tomt for at tillade alle.",

  // ─── Actions / Buttons ────────────────────────────────────────────────────────
  saveConfiguration: "Gem konfiguration",

  // ─── Feedback toasts ──────────────────────────────────────────────────────────
  configSaved: "Konfiguration gemt",
  configSaveFailed: "Konfiguration kunne ikke gemmes",

  // ─── Loading / Error states ───────────────────────────────────────────────────
  loading: "Indlæser...",
  loadFailed: "Konfiguration kunne ikke indlæses",

  // ─── Invoice widget ────────────────────────────────────────────────────────────
  invoice: "Faktura",
  noFrisbiiPayment: "Ingen Frisbii-betaling fundet for denne ordre.",
  invoiceHandle: "Fakturanummer",
  status: "Status",
  paymentMethod: "Betalingsmetode",
  balance: "Saldo",
  remainingBalance: "Resterende saldo",
  totalAuthorized: "Samlet autoriseret",
  totalSettled: "Samlet afregnet",
  totalRefunded: "Samlet refunderet",
  fee: "Gebyr",
  seeInvoice: "Se faktura",
  refresh: "Opdater",

  // Transaction types
  txAuthorization: "Autorisering",
  txSettle: "Afregning",
  txRefund: "Refusion",
  txCancel: "Annullering",

  // Payment statuses
  statusAuthorized: "Autoriseret",
  statusSettled: "Afregnet",
  statusRefunded: "Refunderet",
  statusPartiallyRefunded: "Delvist refunderet",
  statusCancelled: "Annulleret",
  statusFailed: "Mislykkedes",
  statusPending: "Afventer",
}
