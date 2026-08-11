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
  | "pending"
  | "saving"
  | "saved"
  | "error"
  | "duplicate"
  | "incomplete";

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
  taxableAmount: string;
  vatAmount: string;
  totalAmount: string;
  status: LedgerRowStatus;
  error?: string;
  warnings?: string[];
}

export interface LedgerTotals {
  taxable: number;
  vat: number;
  total: number;
  count: number;
}
