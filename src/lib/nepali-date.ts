import NepaliDate from "nepali-datetime";

export const NEPALI_MONTHS = [
  "Baisakh",
  "Jestha",
  "Ashadh",
  "Shrawan",
  "Bhadra",
  "Ashwin",
  "Kartik",
  "Mangsir",
  "Poush",
  "Magh",
  "Falgun",
  "Chaitra",
] as const;

export type NepaliMonth = (typeof NEPALI_MONTHS)[number];

export const SUPPORTED_MIN_BS_YEAR = 2000;
export const SUPPORTED_MAX_BS_YEAR = 2099;

/** The BS month (1-based) in which a Nepali fiscal year begins: Shrawan. */
export const FISCAL_YEAR_START_MONTH = 4;

const MITI_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MITI_DDMMYYYY_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/;

/**
 * Normalize a Miti string from various formats to YYYY-MM-DD.
 * Accepts: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY
 */
export function normalizeMiti(raw: string): string {
  const trimmed = raw.trim();
  if (MITI_RE.test(trimmed)) return trimmed;
  const ddMatch = MITI_DDMMYYYY_RE.exec(trimmed);
  if (ddMatch) {
    return `${ddMatch[3]}-${ddMatch[2]}-${ddMatch[1]}`;
  }
  return trimmed;
}

export type ParsedMiti =
  | {
      ok: true;
      year: number;
      month: number; // 1-based
      day: number;
      monthName: NepaliMonth;
      fiscalYearName: string;
      fiscalYear: number;
    }
  | { ok: false; error: string };

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function fyName(fiscalYear: number): string {
  return `${fiscalYear}/${pad((fiscalYear % 100) + 1)}`;
}

/**
 * Validate a "YYYY-MM-DD" Bikram Sambat date string and derive its Nepali
 * month name and fiscal-year name (Shrawan starts the fiscal year).
 *
 * Round-trips the string against the package to guard against silent
 * clamping, and checks the day length against the package's lookup table.
 */
export function parseMiti(miti: string): ParsedMiti {
  const normalized = normalizeMiti(miti);
  const match = MITI_RE.exec(normalized);
  if (!match) {
    return { ok: false, error: "Miti must be in YYYY-MM-DD or DD/MM/YYYY format" };
  }
  const year = Number(match[1]);
  const month = Number(match[2]); // 1-based
  const day = Number(match[3]);

  if (year < SUPPORTED_MIN_BS_YEAR || year > SUPPORTED_MAX_BS_YEAR) {
    return {
      ok: false,
      error: `Year out of supported range (BS ${SUPPORTED_MIN_BS_YEAR}–${SUPPORTED_MAX_BS_YEAR})`,
    };
  }
  if (month < 1 || month > 12) {
    return { ok: false, error: "Month must be between 01 and 12" };
  }
  const daysInMonth = NepaliDate.getDaysOfMonth(year, month - 1);
  if (day < 1 || day > daysInMonth) {
    return {
      ok: false,
      error: `Day out of range for ${NEPALI_MONTHS[month - 1]} ${year} (01–${pad(daysInMonth)})`,
    };
  }

  const normalized = `${year}-${pad(month)}-${pad(day)}`;
  try {
    const parsed = new NepaliDate(normalized, "YYYY-MM-DD");
    if (parsed.format("YYYY-MM-DD") !== normalized) {
      return { ok: false, error: "Could not parse this date reliably" };
    }
  } catch {
    return { ok: false, error: "Invalid Miti" };
  }

  const monthName = NEPALI_MONTHS[month - 1];
  const fiscalYear = month >= FISCAL_YEAR_START_MONTH ? year : year - 1;
  return { ok: true, year, month, day, monthName, fiscalYearName: fyName(fiscalYear), fiscalYear };
}

export function isValidMiti(miti: string): boolean {
  return parseMiti(miti).ok;
}

export interface EnglishToNepaliResult {
  miti: string;
  monthName: NepaliMonth;
  fiscalYearName: string;
  fiscalYear: number;
}

/** Convert an AD date to its BS "YYYY-MM-DD" Miti plus derived metadata. */
export function fromEnglishDate(date: Date): EnglishToNepaliResult {
  const nd = new NepaliDate(date);
  const year = nd.getYear();
  const month = nd.getMonth() + 1;
  const day = nd.getDate();
  const miti = `${year}-${pad(month)}-${pad(day)}`;
  const parsed = parseMiti(miti);
  if (!parsed.ok) {
    throw new Error(`nepali-datetime produced an unparseable Miti: ${miti} (${parsed.error})`);
  }
  return {
    miti,
    monthName: parsed.monthName,
    fiscalYearName: parsed.fiscalYearName,
    fiscalYear: parsed.fiscalYear,
  };
}

/** Convert a valid BS "YYYY-MM-DD" Miti back to an AD Date. */
export function toEnglishDate(miti: string): Date {
  const parsed = new NepaliDate(miti.trim(), "YYYY-MM-DD");
  return parsed.getDateObject();
}