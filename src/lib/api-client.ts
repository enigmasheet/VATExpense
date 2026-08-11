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