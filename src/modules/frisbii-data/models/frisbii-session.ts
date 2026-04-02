import { model } from "@medusajs/framework/utils";

export const FrisbiiSession = model
  .define("frisbii_session", {
    id: model.id().primaryKey(),
    session_handle: model.text(),
    charge_handle: model.text(),
    cart_id: model.text(),
    order_id: model.text().nullable(),
    payment_session_id: model.text(),
    expires_at: model.dateTime().nullable(),
  })
  .indexes([{ on: ["session_handle"] }, { on: ["charge_handle"] }]);
