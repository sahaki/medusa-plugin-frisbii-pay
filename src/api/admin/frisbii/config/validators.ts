import { z } from "@medusajs/framework/zod"

export const AdminUpdateFrisbiiConfig = z.object({
  api_key_test: z.string().optional(),
  api_key_live: z.string().optional(),
  api_mode: z.enum(["test", "live"]).optional(),
  enabled: z.boolean().optional(),
  title: z.string().optional(),
  display_type: z.enum(["embedded", "overlay", "redirect"]).optional(),
  send_order_lines: z.boolean().optional(),
  send_phone_number: z.boolean().optional(),
  auto_capture: z.boolean().optional(),
  auto_fulfill_items: z.boolean().optional(),
  surcharge_fee_enabled: z.boolean().optional(),
  save_card_enabled: z.boolean().optional(),
  save_card_default_unchecked: z.boolean().optional(),
  save_card_type: z.enum(["cit", "mit"]).optional(),
  cancel_on_payment_cancel: z.boolean().optional(),
  update_payment_method: z.boolean().optional(),
  send_order_email: z.boolean().optional(),
  auto_cancel_enabled: z.boolean().optional(),
  auto_cancel_timeout: z.number().int().min(1).optional(),
  debug_enabled: z.boolean().optional(),
  allowed_payment_methods: z.array(z.string()).optional(),
  payment_icons: z.array(z.string()).optional(),
  locale: z.enum(["en_GB", "da_DK"]).optional(),
  checkout_configuration: z.string().nullable().optional(),
  webhook_secret: z.string().nullable().optional(),
})

export type AdminUpdateFrisbiiConfigType = z.infer<typeof AdminUpdateFrisbiiConfig>
