export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
    public body: Record<string, unknown> | null,
  ) {
    super(detail);
    this.name = "ApiError";
  }
}

/**
 * Sends a JSON API request and parses the response body.
 *
 * @param url - The request URL
 * @returns The parsed response body.
 * @throws `ApiError` when the response status indicates failure.
 */
export async function api<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const record = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
    throw new ApiError(
      res.status,
      (record?.detail as string) ?? `Request failed with status ${res.status}`,
      record,
    );
  }
  return body as T;
}

/**
 * Builds an absolute URL from a path and optional query parameters.
 *
 * @param path - The URL path to resolve against the current window origin
 * @param params - Query parameters to include when their values are non-empty
 * @returns The resulting absolute URL
 */
export function apiUrl(path: string, params?: Record<string, string | number | null | undefined>): string {
  const url = new URL(path, window.location.origin);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}