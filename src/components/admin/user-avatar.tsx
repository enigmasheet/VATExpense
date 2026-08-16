import { useMemo } from "react";

const AVATAR_COLORS = [
  "bg-primary/15 text-primary",
  "bg-warning/15 text-warning",
  "bg-danger/15 text-danger",
  "bg-success/15 text-success",
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Renders an avatar with the user's initials, colored deterministically
 * from their name or email.
 */
export function UserAvatar({
  name,
  email,
  size = "md",
  shape = "circle",
}: {
  name?: string | null;
  email?: string | null;
  size?: "sm" | "md" | "lg";
  shape?: "circle" | "rounded";
}) {
  const seed = name || email || "?";
  const initials = useMemo(
    () =>
      seed
        .split(/\s+/)
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase(),
    [seed],
  );
  const color = AVATAR_COLORS[hashString(seed) % AVATAR_COLORS.length];
  const sizes = {
    sm: "h-7 w-7 text-xs",
    md: "h-9 w-9 text-sm",
    lg: "h-11 w-11 text-base",
  };
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center font-semibold ${shape === "circle" ? "rounded-full" : "rounded-md"} ${color} ${sizes[size]}`}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}