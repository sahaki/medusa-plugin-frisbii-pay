import { model } from "@medusajs/framework/utils";

export const FrisbiiConfig = model.define("frisbii_config", {
  id: model.id().primaryKey(),
  api_key_test: model.text().default(""),
  api_key_live: model.text().default(""),
  api_mode: model.enum(["test", "live"]).default("test"),
  enabled: model.boolean().default(false),
  title: model.text().default("Frisbii Pay"),
  display_type: model
    .enum(["embedded", "overlay", "redirect"])
    .default("overlay"),
  send_order_lines: model.boolean().default(true),
  send_phone_number: model.boolean().default(false),
  auto_capture: model.boolean().default(false),
  auto_create_invoice: model.boolean().default(false),
  surcharge_fee_enabled: model.boolean().default(false),
  save_card_enabled: model.boolean().default(false),
  save_card_default_unchecked: model.boolean().default(false),
  save_card_type: model.enum(["cit", "mit"]).default("cit"),
  cancel_on_payment_cancel: model.boolean().default(true),
  update_payment_method: model.boolean().default(false),
  send_order_email: model.boolean().default(true),
  auto_cancel_enabled: model.boolean().default(false),
  auto_cancel_timeout: model.number().default(30),
  allowed_payment_methods: model.json().default([] as any),
  payment_icons: model.json().default([] as any),
  locale: model.text().default("en_GB"),
  checkout_configuration: model.text().nullable(),
  webhook_secret: model.text().nullable(),
  metadata: model.json().nullable(),
});
