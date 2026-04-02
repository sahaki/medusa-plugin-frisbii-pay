export interface FrisbiiConfigDTO {
  id: string;
  api_key_test: string;
  api_key_live: string;
  api_mode: "test" | "live";
  enabled: boolean;
  title: string;
  display_type: "embedded" | "overlay" | "redirect";
  send_order_lines: boolean;
  send_phone_number: boolean;
  auto_capture: boolean;
  auto_create_invoice: boolean;
  surcharge_fee_enabled: boolean;
  save_card_enabled: boolean;
  save_card_default_unchecked: boolean;
  save_card_type: "cit" | "mit";
  cancel_on_payment_cancel: boolean;
  update_payment_method: boolean;
  send_order_email: boolean;
  auto_cancel_enabled: boolean;
  auto_cancel_timeout: number;
  allowed_payment_methods: string[];
  payment_icons: string[];
  locale: string;
  checkout_configuration: string | null;
  webhook_secret: string | null;
  metadata: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
}

export interface FrisbiiSessionDTO {
  id: string;
  session_handle: string;
  charge_handle: string;
  cart_id: string;
  order_id: string | null;
  payment_session_id: string;
  expires_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface FrisbiiCustomerDTO {
  id: string;
  customer_id: string;
  customer_email: string;
  frisbii_handle: string;
  created_at: Date;
  updated_at: Date;
}

export type FrisbiiPaymentStatusValue =
  | "pending"
  | "authorized"
  | "settled"
  | "refunded"
  | "cancelled"
  | "failed";

export interface FrisbiiTransactionRecord {
  id: string;
  type: string;
  amount: number;
  currency: string;
  created: string;
}

export interface FrisbiiPaymentStatusDTO {
  id: string;
  order_id: string;
  status: FrisbiiPaymentStatusValue;
  masked_card: string | null;
  card_type: string | null;
  fingerprint: string | null;
  payment_method_type: string | null;
  surcharge_fee: number | null;
  error: string | null;
  error_state: string | null;
  transactions: FrisbiiTransactionRecord[] | null;
  created_at: Date;
  updated_at: Date;
}
