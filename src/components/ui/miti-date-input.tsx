"use client";

import { forwardRef, useState, useImperativeHandle, useRef, useCallback, type KeyboardEvent, type InputHTMLAttributes } from "react";
import { formatMitiInput } from "@/lib/expenses/ledger-utils";
import { parseMiti, NEPALI_MONTHS } from "@/lib/nepali-date";
import { getSegment, bumpSegment, selectSegment } from "./miti-date-utils";

interface MitiDateInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value: string;
  onChange: (value: string) => void;
  onValidate?: (result: { ok: boolean; error?: string; monthName?: string; fiscalYearName?: string }) => void;
  error?: string;
  compact?: boolean;
}

interface MitiDateInputHandle {
  focus: () => void;
  blur: () => void;
  input: HTMLInputElement | null;
}

const DEFAULT_INPUT_CLASS =
  "w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm text-foreground font-mono placeholder:text-muted/70 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary disabled:bg-surface-muted";

/**
 * Standalone BS date input with auto-formatting and real-time validation.
 *
 * - Auto-inserts dashes as user types (YYYY-MM-DD)
 * - Converts DD/MM/YYYY paste to YYYY-MM-DD
 * - Arrow Up/Down on a segment bumps year/month/day with clamping
 * - Tab/Shift+Tab moves between segments
 * - Validates via parseMiti on every change
 * - Shows month name + FY when valid, error when invalid
 * - compact mode: no wrapper div or helper text, for use in tight grids
 * - Forwards ref and preserves data-row/data-field attributes for ledger grid
 */
export const MitiDateInput = forwardRef<MitiDateInputHandle, MitiDateInputProps>(
  function MitiDateInput(
    {
      value,
      onChange,
      onValidate,
      error: externalError,
      placeholder = "YYYY-MM-DD",
      className,
      compact = false,
      onKeyDown,
      ...rest
    },
    ref,
  ) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [internalError, setInternalError] = useState<string | null>(null);

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
      blur: () => inputRef.current?.blur(),
      get input() {
        return inputRef.current;
      },
    }));

    const trimmed = value?.trim() ?? "";
    let validation: ReturnType<typeof parseMiti> = { ok: false, error: "Empty date" };
    if (trimmed.length === 10) {
      validation = parseMiti(trimmed);
    }

    const runValidation = useCallback(
      (v: string) => {
        const t = v.trim();
        if (t.length === 0) {
          setInternalError(null);
          onValidate?.({ ok: false, error: undefined });
        } else {
          const result = parseMiti(t);
          if (result.ok) {
            setInternalError(null);
            onValidate?.({ ok: true, monthName: result.monthName, fiscalYearName: result.fiscalYearName });
          } else {
            setInternalError(result.error);
            onValidate?.({ ok: false, error: result.error });
          }
        }
      },
      [onValidate],
    );

    const handleChange = (raw: string) => {
      const formatted = formatMitiInput(raw);
      onChange(formatted);
      runValidation(formatted);
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      const input = inputRef.current;
      if (!input) { onKeyDown?.(e); return; }

      const pos = input.selectionStart ?? input.value.length;
      const fullLen = 10;

      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        const delta = e.key === "ArrowUp" ? 1 : -1;
        const current = input.value;

        if (/^\d{4}-\d{2}-\d{2}$/.test(current)) {
          const result = bumpSegment(current, pos, delta);
          onChange(result.value);
          runValidation(result.value);
          requestAnimationFrame(() => input.setSelectionRange(result.newPos, result.newPos));
        }
        onKeyDown?.(e);
        return;
      }

      if (e.key === "Tab") {
        const pos1 = pos >= fullLen ? fullLen - 1 : pos;
        const seg = getSegment(pos1);

        if (e.shiftKey) {
          if (seg === "month") { e.preventDefault(); selectSegment(input, "year"); }
          else if (seg === "day") { e.preventDefault(); selectSegment(input, "month"); }
        } else {
          if (seg === "year") { e.preventDefault(); selectSegment(input, "month"); }
          else if (seg === "month") { e.preventDefault(); selectSegment(input, "day"); }
        }
        onKeyDown?.(e);
        return;
      }

      if (e.key === "Home") {
        e.preventDefault();
        selectSegment(input, "year");
        onKeyDown?.(e);
        return;
      }

      if (e.key === "End") {
        e.preventDefault();
        selectSegment(input, "day");
        onKeyDown?.(e);
        return;
      }

      onKeyDown?.(e);
    };

    const handleClick = () => {
      const input = inputRef.current;
      if (!input) return;
      const pos = input.selectionStart ?? input.value.length;
      const safePos = pos >= 10 ? 9 : pos;
      const seg = getSegment(safePos);
      selectSegment(input, seg);
    };

    const handleBlur = () => {
      if (trimmed.length === 10) {
        const result = parseMiti(trimmed);
        setInternalError(result.ok ? null : result.error);
      }
    };

    const displayError = externalError || (trimmed.length > 0 ? internalError : null);
    const isValid = trimmed.length === 10 && validation.ok;

    const inputClasses = className ?? DEFAULT_INPUT_CLASS;

    const input = (
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={inputClasses}
        {...rest}
      />
    );

    if (compact) return input;

    return (
      <div className="flex flex-col gap-1">
        {input}
        {isValid && validation.ok && (
          <p className="text-xs text-success">
            {NEPALI_MONTHS[validation.month - 1]} · FY {validation.fiscalYearName}
          </p>
        )}
        {displayError && (
          <p className="text-xs text-danger">{displayError}</p>
        )}
      </div>
    );
  },
);
