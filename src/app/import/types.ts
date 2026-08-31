export interface BatchRow {
  id: string;
  rowIndex: number;
  status: string;
  raw: {
    miti: string;
    invoiceNumber: string | null;
    partyName: string;
    categoryName: string;
    item: string;
    quantity: string | null;
    rate: string | null;
    taxableAmount: string;
    vatAmount: string;
    totalAmount: string;
    remarks: string | null;
  };
  resolved: {
    partyId: string | null;
    partyName: string | null;
    categoryId: string | null;
    categoryName: string | null;
    miti: string | null;
    nepaliMonth: string | null;
    taxableAmount: string;
    vatAmount: string;
    totalAmount: string;
    vatRate: string;
  };
  errors: string[];
  warnings: string[];
  suggestions: {
    party?: string;
    category?: string;
  };
}

export interface BatchPreview {
  batchId: string;
  filename: string;
  status: string;
  rowCount: number;
  errorCount: number;
  warningCount: number;
  rows: BatchRow[];
  created?: {
    parties: number;
    categories: number;
    locations: number;
  };
}

export interface ImportResult {
  batchId: string;
  status: string;
  importedCount: number;
}

export interface UploadResponse {
  batchId: string;
  filename: string;
  rowCount: number;
  status: string;
  warnings?: string[];
}
