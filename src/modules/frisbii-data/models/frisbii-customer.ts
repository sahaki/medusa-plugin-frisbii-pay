import { model } from "@medusajs/framework/utils";

export const FrisbiiCustomer = model
  .define("frisbii_customer", {
    id: model.id().primaryKey(),
    customer_id: model.text(),
    customer_email: model.text(),
    frisbii_handle: model.text(),
  })
  .indexes([{ on: ["customer_id"] }]);
