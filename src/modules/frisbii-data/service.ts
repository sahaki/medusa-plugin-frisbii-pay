import { MedusaService } from "@medusajs/framework/utils";
import {
  FrisbiiConfig,
  FrisbiiSession,
  FrisbiiCustomer,
  FrisbiiPaymentStatus,
} from "./models";

class FrisbiiDataModuleService extends MedusaService({
  FrisbiiConfig,
  FrisbiiSession,
  FrisbiiCustomer,
  FrisbiiPaymentStatus,
}) {}

export default FrisbiiDataModuleService;
