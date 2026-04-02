import type {
  FrisbiiConfigDTO,
  FrisbiiSessionDTO,
  FrisbiiCustomerDTO,
  FrisbiiPaymentStatusDTO,
} from "./common";

// Config — always update, never bulk create
export type UpdateFrisbiiConfigDTO = Partial<
  Omit<FrisbiiConfigDTO, "created_at" | "updated_at">
> & { id: string };

// Session
export type CreateFrisbiiSessionDTO = Omit<
  FrisbiiSessionDTO,
  "id" | "created_at" | "updated_at"
>;
export type UpdateFrisbiiSessionDTO = Partial<FrisbiiSessionDTO> & {
  id: string;
};

// Customer
export type CreateFrisbiiCustomerDTO = Omit<
  FrisbiiCustomerDTO,
  "id" | "created_at" | "updated_at"
>;
export type UpdateFrisbiiCustomerDTO = Partial<FrisbiiCustomerDTO> & {
  id: string;
};

// PaymentStatus
export type CreateFrisbiiPaymentStatusDTO = Omit<
  FrisbiiPaymentStatusDTO,
  "id" | "created_at" | "updated_at"
>;
export type UpdateFrisbiiPaymentStatusDTO =
  Partial<FrisbiiPaymentStatusDTO> & { id: string };
