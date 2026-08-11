import { NextResponse } from "next/server";

export interface ApiErrorBody {
  title: string;
  detail: string;
  status: number;
  errors?: string[];
  [key: string]: unknown;
}

export function apiOk<T>(data: T, status = 200, init?: ResponseInit): NextResponse {
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
  return apiError({ title: "Bad Request", detail, status: 400 });
}

export function unprocessableEntity(detail: string, errors: string[]): NextResponse<ApiErrorBody> {
  return apiError({ title: "Unprocessable Entity", detail, status: 422, errors });
}

export function notFound(detail: string): NextResponse<ApiErrorBody> {
  return apiError({ title: "Not Found", detail, status: 404 });
}

export function conflict(
  detail: string,
  extra?: Record<string, unknown>,
): NextResponse<ApiErrorBody> {
  return apiError({ title: "Conflict", detail, status: 409, extra });
}

export function internalError(detail = "An unexpected error occurred"): NextResponse<ApiErrorBody> {
  return apiError({ title: "Internal Server Error", detail, status: 500 });
}