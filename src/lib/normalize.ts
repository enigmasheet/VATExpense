export function normalizeName(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.,]/g, "")
    .toUpperCase();
}

export function normalizeVatNumber(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  return digits.length > 0 ? digits : null;
}

/**
 * Computes the Levenshtein edit distance between two strings.
 * Used for fuzzy matching of party/category names during import.
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[m][n];
}

/**
 * Finds similar names from a list of candidates using Levenshtein distance.
 * Returns candidates within maxDistance, sorted by distance (closest first).
 * Requires the target to be at least minLen characters.
 */
export function findSimilarNames(
  target: string,
  candidates: string[],
  maxDistance = 3,
  minLen = 3,
): string[] {
  if (target.length < minLen) return [];
  const norm = normalizeName(target);
  return candidates
    .map((c) => ({ name: c, distance: levenshteinDistance(norm, normalizeName(c)) }))
    .filter((r) => r.distance > 0 && r.distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance)
    .map((r) => r.name);
}