export interface MockSessionUser {
  id: string;
  email?: string;
  name?: string;
  companyId: string | null;
  role: string;
}

/**
 * Creates a mock Request with the given URL, method, and optional JSON body.
 * Supports search params via the URL string.
 */
export function createMockRequest(
  url: string,
  options: { method?: string; body?: unknown; headers?: Record<string, string> } = {},
): Request {
  const { method = "GET", body, headers = {} } = options;
  const init: RequestInit = {
    method,
    headers: {
      "content-type": "application/json",
      ...headers,
    },
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }
  return new Request(url, init);
}

/**
 * Creates a mock params object matching Next.js 16's Promise-based params pattern.
 */
export function createMockParams<T extends Record<string, string>>(params: T): Promise<T> {
  return Promise.resolve(params);
}

/**
 * Parses a NextResponse into status + JSON body for easy assertion.
 */
export async function parseResponse(response: Response): Promise<{ status: number; body: unknown }> {
  const status = response.status;
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { status, body };
}
