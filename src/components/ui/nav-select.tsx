"use client";

interface NavSelectOption {
  value: string;
  label: string;
}

interface NavSelectProps {
  label: string;
  selectId: string;
  value: string;
  options: NavSelectOption[];
  selectName?: string;
  action?: string;
  hiddenInputs?: Record<string, string>;
  onChange?: (value: string) => void;
  layout?: "inline" | "stacked";
  className?: string;
}

const layoutStyles = {
  inline: {
    label: "text-sm font-medium text-foreground",
    select: "rounded-lg border border-border bg-surface px-3 py-2 text-sm",
    wrapper: "flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4",
  },
  stacked: {
    label: "mb-1 block text-xs text-muted",
    select: "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground",
    wrapper: "",
  },
} as const;

/**
 * Renders a navigation select that either submits a GET form or invokes an
 * `onChange` handler. Supports both an inline label row and a stacked label
 * above a full-width control.
 *
 * @param label - Accessible text describing the select
 * @param selectId - The `id` used to associate the label with the select
 * @param value - The currently selected value
 * @param options - The selectable options
 * @param selectName - The form field name when submitting a form
 * @param action - Optional form action URL; the form submits on change
 * @param hiddenInputs - Optional hidden form fields included with the submission
 * @param onChange - Optional handler invoked with the new value on change
 * @param layout - Whether to render the label beside or above the select
 * @param className - Additional classes applied to the select element
 */
export function NavSelect({
  label,
  selectId,
  value,
  options,
  selectName,
  action,
  hiddenInputs,
  onChange,
  layout = "inline",
  className = "",
}: NavSelectProps) {
  const styles = layoutStyles[layout];

  const select = (
    <select
      id={selectId}
      name={selectName}
      value={value}
      onChange={(e) => {
        if (onChange) onChange(e.target.value);
        if (action) e.target.form?.requestSubmit();
      }}
      className={`${styles.select} ${className}`}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );

  const control = (
    <div className={styles.wrapper}>
      <label className={styles.label} htmlFor={selectId}>
        {label}
      </label>
      {select}
    </div>
  );

  if (!action) return control;

  return (
    <form action={action} method="get">
      {Object.entries(hiddenInputs ?? {}).map(([name, val]) => (
        <input key={name} type="hidden" name={name} value={val} />
      ))}
      {control}
    </form>
  );
}