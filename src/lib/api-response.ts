import { NextResponse } from "next/server";
import {
  HTTP_OK,
  HTTP_BAD_REQUEST,
  HTTP_UNAUTHORIZED,
  HTTP_FORBIDDEN,
  HTTP_NOT_FOUND,
  HTTP_CONFLICT,
  HTTP_UNPROCESSABLE,
  HTTP_INTERNAL_ERROR,
  ERR_UNEXPECTED,
} from "@/lib/status-constants";

export interface ApiErrorBody {
  title: string;
  detail: string;
  status: number;
  errors?: string[];
  [key: string]: unknown;
}

export function apiOk<T>(data: T, status = HTTP_OK, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, { ...init, status });
}

export function apiError(options: {
  title: string;
  detail: string;
  status: number;
  errors?: string[];
  extra?: Record<string, unknown>;
}): NextResponse<ApiErrorBody> {
  const body: ApiErrorBody = {
    title: options.title,
    detail: options.detail,
    status: options.status,
  };
  if (options.errors && options.errors.length > 0) body.errors = options.errors;
  if (options.extra) Object.assign(body, options.extra);
  return NextResponse.json(body, { status: options.status });
}

export function badRequest(detail: string): NextResponse<ApiErrorBody> {
  return apiError({ title: "Bad Request", detail, status: HTTP_BAD_REQUEST });
}

export function unprocessableEntity(detail: string, errors: string[]): NextResponse<ApiErrorBody> {
  return apiError({ title: "Unprocessable Entity", detail, status: HTTP_UNPROCESSABLE, errors });
}

export function notFound(detail: string): NextResponse<ApiErrorBody> {
  return apiError({ title: "Not Found", detail, status: HTTP_NOT_FOUND });
}

export function conflict(
  detail: string,
  extra?: Record<string, unknown>,
): NextResponse<ApiErrorBody> {
  return apiError({ title: "Conflict", detail, status: HTTP_CONFLICT, extra });
}

export function internalError(detail = ERR_UNEXPECTED): NextResponse<ApiErrorBody> {
  return apiError({ title: "Internal Server Error", detail, status: HTTP_INTERNAL_ERROR });
}

export function unauthorized(detail = "Authentication required"): NextResponse<ApiErrorBody> {
  return apiError({ title: "Unauthorized", detail, status: HTTP_UNAUTHORIZED });
}

export function forbidden(detail = "Access denied"): NextResponse<ApiErrorBody> {
  return apiError({ title: "Forbidden", detail, status: HTTP_FORBIDDEN });
}

/**
 * Checks if an error is a Postgres unique-violation (error code 23505).
 * Drizzle wraps database errors but preserves the original error properties.
 */
export function isUniqueViolation(err: unknown): boolean {
  if (err && typeof err === "object" && "code" in err) {
    return (err as { code: string }).code === "23505";
  }
  return false;
}
