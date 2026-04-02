import { model } from "@medusajs/framework/utils";

export const FrisbiiPaymentStatus = model
  .define("frisbii_payment_status", {
    id: model.id().primaryKey(),
    order_id: model.text(),
    status: model
      .enum([
        "pending",
        "authorized",
        "settled",
        "refunded",
        "cancelled",
        "failed",
      ])
      .default("pending"),
    masked_card: model.text().nullable(),
    card_type: model.text().nullable(),
    fingerprint: model.text().nullable(),
    payment_method_type: model.text().nullable(),
    surcharge_fee: model.number().nullable(),
    error: model.text().nullable(),
    error_state: model.text().nullable(),
    transactions: model.json().nullable(),
  })
  .indexes([{ on: ["order_id"] }]);
