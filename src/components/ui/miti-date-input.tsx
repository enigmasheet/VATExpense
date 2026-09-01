"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useMemo,
  useEffect,
  useId,
  type FocusEvent,
  type InputHTMLAttributes,
} from "react";
import { parseMiti, NEPALI_MONTHS } from "@/lib/nepali-date";

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
 * Plain BS date string input. No formatting, no cursor magic.
 * User types freely. Backend validates via parseMiti + normalizeMiti.
 * Shows month name + FY below when valid, error when invalid.
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
      onBlur,
      ...rest
    },
    ref,
  ) {
    const inputRef = useRef<HTMLInputElement>(null);
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
    const parsed = useMemo(
      () => (trimmed.length === 10 ? parseMiti(trimmed) : null),
      [trimmed],
    );
    const isValid = !!parsed?.ok;
    const parseError = parsed && !parsed.ok ? parsed.error : undefined;
    const displayError = externalError || parseError;

    useEffect(() => {
      if (trimmed.length === 0) {
        onValidate?.({ ok: false, error: undefined });
      } else if (parsed) {
        onValidate?.(
          parsed.ok
            ? { ok: true, monthName: parsed.monthName, fiscalYearName: parsed.fiscalYearName }
            : { ok: false, error: parsed.error },
        );
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [trimmed]);

    const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
      onBlur?.(e);
    };

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
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
        {isValid && parsed && (
          <p id={helpId} className="text-xs text-success">
            {NEPALI_MONTHS[parsed.month - 1]} · FY {parsed.fiscalYearName}
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
