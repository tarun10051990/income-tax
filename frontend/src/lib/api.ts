const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

/** Separate storage keys keep a taxpayer session and a staff session independent in one browser. */
export const CUSTOMER_TOKEN_KEY = "taxfilr.customer.token";
export const ADMIN_TOKEN_KEY = "taxfilr.admin.token";
export const CONSULTANT_TOKEN_KEY = "taxfilr.consultant.token";

export interface FieldError {
  field: string;
  message: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  code?: string;
  message?: string;
  errors?: FieldError[];
  traceId?: string;
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly errors: FieldError[];

  constructor(status: number, code: string, message: string, errors: FieldError[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.errors = errors;
  }
}

export interface PageResult<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export type Scope = "customer" | "admin" | "consultant";

function tokenKey(scope: Scope): string {
  switch (scope) {
    case "admin":
      return ADMIN_TOKEN_KEY;
    case "consultant":
      return CONSULTANT_TOKEN_KEY;
    default:
      return CUSTOMER_TOKEN_KEY;
  }
}

export function readToken(scope: Scope): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(tokenKey(scope));
}

export function writeToken(scope: Scope, token: string | null): void {
  if (typeof window === "undefined") {
    return;
  }
  if (token === null) {
    window.localStorage.removeItem(tokenKey(scope));
  } else {
    window.localStorage.setItem(tokenKey(scope), token);
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  scope?: Scope;
  /** Send a FormData body (document and CSV uploads) instead of JSON. */
  form?: FormData;
  token?: string;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, scope = "customer", form, token } = options;
  const headers: Record<string, string> = {};
  const bearer = token ?? readToken(scope);
  if (bearer !== null) {
    headers.Authorization = `Bearer ${bearer}`;
  }
  if (form === undefined && body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: form ?? (body === undefined ? undefined : JSON.stringify(body)),
    cache: "no-store",
  });

  const text = await response.text();
  let envelope: ApiEnvelope<T> | null = null;
  if (text.length > 0) {
    try {
      envelope = JSON.parse(text) as ApiEnvelope<T>;
    } catch {
      envelope = null;
    }
  }

  if (!response.ok || envelope === null || envelope.success !== true) {
    throw new ApiError(
      response.status,
      envelope?.code ?? "NETWORK_ERROR",
      envelope?.message ?? `The request to ${path} failed`,
      envelope?.errors ?? [],
    );
  }

  return envelope.data as T;
}

/** Streams a generated export (CSV, Excel, PDF) rather than a JSON envelope. */
export async function apiDownload(path: string, scope: Scope = "admin"): Promise<Blob> {
  const headers: Record<string, string> = {};
  const bearer = readToken(scope);
  if (bearer !== null) {
    headers.Authorization = `Bearer ${bearer}`;
  }
  const response = await fetch(`${API_BASE_URL}${path}`, { headers, cache: "no-store" });
  if (!response.ok) {
    throw new ApiError(response.status, "EXPORT_FAILED", "The export could not be generated");
  }
  return response.blob();
}

export function queryString(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && `${value}`.length > 0) {
      search.set(key, `${value}`);
    }
  });
  const encoded = search.toString();
  return encoded.length > 0 ? `?${encoded}` : "";
}
