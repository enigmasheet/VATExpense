export const queryKeys = {
  // Company-specific reference data - always include companyId for isolation
  locations: (companyId: string) => ["locations", companyId] as const,
  categories: (companyId: string) => ["categories", companyId] as const,
  itemCategories: (companyId: string) => ["item-categories", companyId] as const,
  trucks: (companyId: string) => ["trucks", companyId] as const,
  parties: (companyId: string) => ["parties", companyId] as const,

  // Stable reference data that can be persisted across sessions
  stableCategories: (companyId: string) => ["stable-categories", companyId] as const,

  // App-wide keys (not company-specific)
  auth: ["auth"],
};