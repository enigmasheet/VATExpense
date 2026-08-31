import NepaliDate from "nepali-datetime";
import { SUPPORTED_MIN_BS_YEAR, SUPPORTED_MAX_BS_YEAR } from "@/lib/nepali-date";

export type Segment = "year" | "month" | "day";

export function getSegment(pos: number): Segment {
  if (pos <= 3) return "year";
  if (pos <= 6) return "month";
  return "day";
}

export function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function clampDay(year: number, month: number, day: number): number {
  try {
    const maxDay = NepaliDate.getDaysOfMonth(year, month - 1);
    return Math.min(Math.max(day, 1), maxDay);
  } catch {
    return Math.min(Math.max(day, 1), 32);
  }
}

export function getDaysInMonth(year: number, month: number): number {
  try {
    return NepaliDate.getDaysOfMonth(year, month - 1);
  } catch {
    return 32;
  }
}

export function bumpSegment(value: string, pos: number, delta: number): { value: string; newPos: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return { value, newPos: pos };

  let year = Number(match[1]);
  let month = Number(match[2]);
  let day = Number(match[3]);
  const seg = getSegment(pos);

  if (seg === "year") {
    year = Math.min(Math.max(year + delta, SUPPORTED_MIN_BS_YEAR), SUPPORTED_MAX_BS_YEAR);
    day = clampDay(year, month, day);
  } else if (seg === "month") {
    month += delta;
    if (month > 12) month = 1;
    if (month < 1) month = 12;
    day = clampDay(year, month, day);
  } else {
    const maxDay = getDaysInMonth(year, month);
    day += delta;
    if (day > maxDay) day = 1;
    if (day < 1) day = maxDay;
  }

  return { value: `${year}-${pad(month)}-${pad(day)}`, newPos: pos };
}

export function selectSegment(input: HTMLInputElement, seg: Segment) {
  if (seg === "year") input.setSelectionRange(0, 4);
  else if (seg === "month") input.setSelectionRange(5, 7);
  else input.setSelectionRange(8, 10);
}
