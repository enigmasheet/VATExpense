// ============================================================
// Status Constants
// ============================================================

// Ledger Row Statuses
export const STATUS_PENDING = "pending";
export const STATUS_SAVING = "saving";
export const STATUS_SAVED = "saved";
export const STATUS_ERROR = "error";
export const STATUS_DUPLICATE = "duplicate";
export const STATUS_INCOMPLETE = "incomplete";

// Import Batch Statuses
export const BATCH_STATUS_PENDING = "pending";
export const BATCH_STATUS_CONFIRMED = "confirmed";
export const BATCH_STATUS_CANCELLED = "cancelled";

// Import Batch Row Statuses
export const BATCH_ROW_STATUS_PENDING = "pending";
export const BATCH_ROW_STATUS_VALID = "valid";
export const BATCH_ROW_STATUS_ERROR = "error";
export const BATCH_ROW_STATUS_DUPLICATE = "duplicate";
export const BATCH_ROW_STATUS_CONFIRMED = "confirmed";

// Duplicate Levels
export const DUPLICATE_LEVEL_EXACT = "exact";
export const DUPLICATE_LEVEL_INVOICE = "invoice";

// ============================================================
// HTTP Status Codes
// ============================================================
export const HTTP_OK = 200;
export const HTTP_CREATED = 201;
export const HTTP_BAD_REQUEST = 400;
export const HTTP_UNAUTHORIZED = 401;
export const HTTP_FORBIDDEN = 403;
export const HTTP_NOT_FOUND = 404;
export const HTTP_CONFLICT = 409;
export const HTTP_UNPROCESSABLE = 422;
export const HTTP_INTERNAL_ERROR = 500;

// ============================================================
// Content Types
// ============================================================
export const CONTENT_TYPE_JSON = "application/json";
export const CONTENT_TYPE_CSV = "text/csv";
export const CONTENT_TYPE_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// ============================================================
// Toast Constants
// ============================================================
export const TOAST_KIND_SUCCESS = "success";
export const TOAST_KIND_ERROR = "error";
export const TOAST_KIND_INFO = "info";

export const TOAST_SUCCESS_MS = 3000;
export const TOAST_INFO_MS = 3000;
export const TOAST_ERROR_MS = 6000;

// ============================================================
// File Import Constants
// ============================================================
export const MAX_IMPORT_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const IMPORT_BODY_SIZE_LIMIT = "10mb";
export const MIN_PASSWORD_LENGTH = 8;
export const ALLOWED_IMPORT_EXTENSIONS = ["xlsx", "xls", "csv"];
export const IMPORT_DATE_FORMAT = "DD/MM/YYYY";

// ============================================================
// Runtime Constants
// ============================================================
export const RUNTIME_NODEJS = "nodejs";

// ============================================================
// Focus Delay
// ============================================================
export const FOCUS_DELAY_MS = 10;

// ============================================================
// Category Inference Keywords
// ============================================================
export const FUEL_KEYWORDS = ["diesel", "disel", "petrol", "fuel", "oil", "lubricant"];
export const FUEL_TOKEN_KEYWORDS = ["per", "hsd", "pms"];
export const SPARE_PARTS_KEYWORDS = ["parts", "spare", "filter", "belt", "bearing"];
export const TYRE_KEYWORDS = ["tyre", "tire", "tube"];

export const DEFAULT_CATEGORY_FUEL = "Fuel";
export const DEFAULT_CATEGORY_SPARE_PARTS = "Spare Parts";
export const DEFAULT_CATEGORY_TYRES = "Tyres";
export const DEFAULT_CATEGORY_GENERAL = "General";

// ============================================================
// Error Messages
// ============================================================
export const ERR_NOT_AUTHENTICATED = "Not authenticated";
export const ERR_COMPANY_NOT_FOUND = "Company not found";
export const ERR_PARTY_NOT_FOUND = "Party not found";
export const ERR_FISCAL_YEAR_NOT_FOUND = "Fiscal year not found";
export const ERR_CATEGORY_NOT_FOUND = "Category not found";
export const ERR_LOCATION_NOT_FOUND = "Location not found";
export const ERR_TRUCK_NOT_FOUND = "Truck not found";
export const ERR_EXPENSE_NOT_FOUND = "Expense not found";
export const ERR_NO_VALID_FIELDS = "No valid fields to update";
export const ERR_UNEXPECTED = "An unexpected error occurred";
export const ERR_VALIDATION_FAILED = "Validation failed";
export const ERR_FAILED_TO_DELETE = "Failed to delete";
export const ERR_FAILED_TO_UPDATE = "Failed to update";
export const ERR_DUPLICATE_IN_BATCH = "Duplicate invoice number within this batch";
export const ERR_OPTIMISTIC_CONFLICT = "This expense was changed by someone else — refresh and try again";

// Export Messages
export const MSG_EXPORT_SUCCESS = "Export downloaded successfully";
export const MSG_EXPORT_FAILED = "Export failed";

// CRUD Success Messages
export const MSG_EXPENSE_RECORDED = "Expense recorded.";
export const MSG_EXPENSE_UPDATED = "Expense updated.";
export const MSG_EXPENSE_DELETED = "Expense deleted.";
export const MSG_PARTY_ADDED = "Party added.";
export const MSG_PARTY_UPDATED = "Party updated.";
export const MSG_PARTY_DELETED = "Party deleted.";
export const MSG_DATABASE_RESET = "Database reset complete.";
export const MSG_UPDATED = "Updated.";
export const MSG_DELETED = "Deleted.";
