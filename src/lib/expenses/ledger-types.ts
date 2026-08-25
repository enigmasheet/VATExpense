import {
  STATUS_PENDING,
  STATUS_SAVING,
  STATUS_SAVED,
  STATUS_ERROR,
  STATUS_DUPLICATE,
  STATUS_INCOMPLETE,
} from "@/lib/status-constants";

export interface Party {
  id: string;
  name: string;
  vatNumber: string | null;
  locationId: string | null;
  locationName: string | null;
}

export interface Category {
  id: string;
  name: string;
}

export type LedgerRowStatus =
  | typeof STATUS_PENDING
  | typeof STATUS_SAVING
  | typeof STATUS_SAVED
  | typeof STATUS_ERROR
  | typeof STATUS_DUPLICATE
  | typeof STATUS_INCOMPLETE;

export interface LedgerRow {
  id: string;
  miti: string;
  partyId: string;
  partyName: string;
  partyResolved: boolean;
  locationId: string | null;
  locationName: string | null;
  invoiceNumber: string;
  categoryId: string;
  categoryName: string;
  quantity: string;
  rate: string;
  taxableAmount: string;
  vatAmount: string;
  totalAmount: string;
  status: LedgerRowStatus;
  error?: string;
  warnings?: string[];
}

export interface ValidationResult {
  status: LedgerRowStatus;
  error: string | undefined;
  warnings: string[];
}

export type CellField =
  | "miti"
  | "partySearch"
  | "invoiceNumber"
  | "categoryId"
  | "quantity"
  | "rate"
  | "taxableAmount"
  | "totalAmount";

export const FIELD_ORDER: CellField[] = [
  "miti",
  "partySearch",
  "invoiceNumber",
  "categoryId",
  "quantity",
  "rate",
  "taxableAmount",
  "totalAmount",
];

export interface LedgerTotals {
  taxable: number;
  vat: number;
  total: number;
  count: number;
}
