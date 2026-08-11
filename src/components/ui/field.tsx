import { type InputHTMLAttributes, type SelectHTMLAttributes, type ReactNode } from "react";

const fieldClass =
  "w-full h-10 rounded-md border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted/70 focus:outline-2 focus:outline-offset-1 focus:outline-primary disabled:bg-surface-muted";

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  htmlFor: string;
  children: ReactNode;
}

/**
 * Renders a labeled form field with optional error or hint text.
 *
 * @param label - Text displayed as the field label
 * @param error - Error message displayed below the field
 * @param hint - Supporting text displayed when no error is provided
 * @param htmlFor - ID of the associated form control
 * @param children - Form control content
 */
export function Field({ label, error, hint, htmlFor, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : hint ? (
        <p className="text-sm text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

/**
 * Renders a styled text input field.
 *
 * @param className - Additional CSS classes to apply to the input
 * @returns An input element with the shared field styles and supplied attributes
 */
export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${fieldClass} ${className}`} {...props} />;
}

/**
 * Renders a styled select control with optional child options and native select attributes.
 *
 * @param className - Additional CSS classes to apply to the select control
 * @param children - Options or other content rendered inside the select control
 * @returns A styled HTML select element
 */
export function Select({
  className = "",
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${fieldClass} ${className}`} {...props}>
      {children}
    </select>
  );
}