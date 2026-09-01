"use client";

import {
  forwardRef,
  useState,
  useImperativeHandle,
  useRef,
  useMemo,
  useEffect,
  useId,
  type KeyboardEvent,
  type FocusEvent,
  type MouseEvent,
  type InputHTMLAttributes,
} from "react";
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

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Standalone BS (Bikram Sambat) date input with auto-formatting and
 * real-time validation, built for financial ledger entry.
 *
 * - Auto-inserts dashes as user types (YYYY-MM-DD), via `formatMitiInput`
 * - Arrow Up/Down on a segment bumps year/month/day, clamped to real
 *   days-in-month and to SUPPORTED_MIN/MAX_BS_YEAR
 * - Tab/Shift+Tab, Home/End, and click move between segments
 * - Validates via parseMiti only once the field is a complete 10-char
 *   date, so partial input never flashes a spurious error mid-typing
 * - Flags an incomplete date once the field is blurred, not before
 * - Validation state is fully derived from `value` on every render, so
 *   an external reset (e.g. a form-level Clear button calling
 *   onChange("")) is reflected immediately instead of leaving a stale
 *   error behind
 * - compact mode: no wrapper div or helper text, for tight grid cells
 * - Forwards ref; composes onBlur/onClick/onFocus/onKeyDown with whatever
 *   a consumer passes in instead of silently overriding them
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
      id,
      onKeyDown,
      onBlur,
      onFocus,
      onClick,
      "aria-label": ariaLabel,
      ...rest
    },
    ref,
  ) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [touched, setTouched] = useState(false);
    const reactId = useId();
    const inputId = id ?? reactId;
    const errorId = `${inputId}-error`;
    const helpId = `${inputId}-help`;

    useImperativeHandle(
      ref,
      () => ({
        focus: () => inputRef.current?.focus(),
        blur: () => inputRef.current?.blur(),
        get input() {
          return inputRef.current;
        },
      }),
      [],
    );

    const trimmed = (value ?? "").trim();
    const isComplete = trimmed.length === 10;

    const parsed = useMemo(() => (isComplete ? parseMiti(trimmed) : null), [isComplete, trimmed]);
    const successResult = parsed?.ok ? parsed : null;
    const isValid = !!successResult;

    const parseError = parsed && !parsed.ok ? parsed.error : undefined;
    const incompleteError =
      touched && trimmed.length > 0 && !isComplete ? "Incomplete date" : undefined;
    const internalError = parseError ?? incompleteError;

    useEffect(() => {
      if (trimmed.length === 0) {
        onValidate?.({ ok: false, error: undefined });
      } else if (isComplete && parsed) {
        onValidate?.(
          parsed.ok
            ? { ok: true, monthName: parsed.monthName, fiscalYearName: parsed.fiscalYearName }
            : { ok: false, error: parsed.error },
        );
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [trimmed, isComplete]);

    const handleChange = (raw: string) => {
      onChange(formatMitiInput(raw));
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      const input = inputRef.current;
      if (!input) {
        onKeyDown?.(e);
        return;
      }

      const pos = input.selectionStart ?? input.value.length;

      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        const delta = e.key === "ArrowUp" ? 1 : -1;
        const current = input.value;

        if (/^\d{4}-\d{2}-\d{2}$/.test(current)) {
          const result = bumpSegment(current, pos, delta);
          handleChange(result.value);
          requestAnimationFrame(() => selectSegment(input, result.segment));
        }
        onKeyDown?.(e);
        return;
      }

      if (e.key === "Tab") {
        const pos1 = pos >= 10 ? 9 : pos;
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

    const handleClick = (e: MouseEvent<HTMLInputElement>) => {
      const input = inputRef.current;
      if (input) {
        const pos = input.selectionStart ?? input.value.length;
        const safePos = pos >= 10 ? 9 : pos;
        selectSegment(input, getSegment(safePos));
      }
      onClick?.(e);
    };

    const handleFocus = (e: FocusEvent<HTMLInputElement>) => {
      const input = inputRef.current;
      if (input && input.selectionStart === input.selectionEnd) {
        selectSegment(input, "year");
      }
      onFocus?.(e);
    };

    const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
      setTouched(true);
      onBlur?.(e);
    };

    const displayError = externalError || internalError;

    const baseClass = className ?? DEFAULT_INPUT_CLASS;
    const stateClass = displayError
      ? "border-danger focus-visible:outline-danger"
      : isValid
        ? "border-success"
        : "";
    const inputClasses = cx(baseClass, stateClass);

    const input = (
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        maxLength={10}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={inputClasses}
        aria-label={ariaLabel ?? "Miti date, format year dash month dash day"}
        aria-invalid={!!displayError || undefined}
        aria-describedby={
          compact ? undefined : displayError ? errorId : isValid ? helpId : undefined
        }
        {...rest}
      />
    );

    if (compact) return input;

    return (
      <div className="flex flex-col gap-1">
        {input}
        {isValid && successResult && (
          <p id={helpId} className="text-xs text-success">
            {NEPALI_MONTHS[successResult.month - 1]} · FY {successResult.fiscalYearName}
          </p>
        )}
        {displayError && (
          <p id={errorId} role="alert" className="text-xs text-danger">
            {displayError}
          </p>
        )}
      </div>
    );
  },
);
