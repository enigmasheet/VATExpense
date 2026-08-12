export type { Company, FiscalYear, Party, Category, Location } from "@/lib/db/schema";

export interface PartyListItem {
  id: string;
  name: string;
  normalizedName: string;
  vatNumber: string | null;
  normalizedVatNumber: string | null;
  locationId: string | null;
  locationName: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryListItem {
  id: string;
  name: string;
  normalizedName: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LocationListItem {
  id: string;
  name: string;
  normalizedName: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FiscalYearListItem {
  id: string;
  name: string;
  startYear: number;
  endYear: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };
