/** Domain error with an HTTP-ish status and stable machine code. */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(message: string, opts: { status?: number; code?: string; details?: unknown } = {}) {
    super(message);
    this.name = "AppError";
    this.status = opts.status ?? 500;
    this.code = opts.code ?? "internal_error";
    this.details = opts.details;
  }
}

export class AuthError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, { status: 401, code: "unauthorized" });
    this.name = "AuthError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, { status: 404, code: "not_found" });
    this.name = "NotFoundError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, { status: 422, code: "validation_error", details });
    this.name = "ValidationError";
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Too many requests") {
    super(message, { status: 429, code: "rate_limited" });
    this.name = "RateLimitError";
  }
}

export class ConfigError extends AppError {
  constructor(message: string) {
    super(message, { status: 503, code: "service_unavailable" });
    this.name = "ConfigError";
  }
}

export function toErrorPayload(err: unknown): { code: string; message: string; details?: unknown } {
  if (err instanceof AppError) {
    return { code: err.code, message: err.message, details: err.details };
  }
  return { code: "internal_error", message: err instanceof Error ? err.message : String(err) };
}
