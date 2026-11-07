export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type ApiFetchOptions = {
  redirectOnUnauthorized?: boolean;
  /** Timeout in milliseconds (default 15000). */
  timeoutMs?: number;
  /** Alias for timeoutMs. */
  timeout?: number;
};

const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 250;

function sleep(ms: number, signal?: AbortSignal | null): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & {
    redirectOnUnauthorized?: boolean;
    timeoutMs?: number;
    timeout?: number;
  },
  options?: ApiFetchOptions,
): Promise<T> {
  const {
    redirectOnUnauthorized: initRedirect,
    timeoutMs: initTimeoutMs,
    timeout: initTimeout,
    ...rest
  } = init ?? {};
  const redirectOnUnauthorized =
    options?.redirectOnUnauthorized ?? initRedirect ?? true;
  const timeoutMs =
    options?.timeoutMs ??
    options?.timeout ??
    initTimeoutMs ??
    initTimeout ??
    DEFAULT_TIMEOUT_MS;

  const headers = new Headers(init?.headers);
  const requestBody = init?.body;
  if (
    !headers.has("content-type") &&
    requestBody != null &&
    !(requestBody instanceof FormData)
  ) {
    headers.set("content-type", "application/json");
  }

  const method = (init?.method ?? "GET").toUpperCase();
  const canRetry = method === "GET";
  const maxAttempts = canRetry ? MAX_RETRIES + 1 : 1;

  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
      try {
        await sleep(delay, init?.signal ?? undefined);
      } catch (err) {
        throw err;
      }
      if (init?.signal?.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }
    }

    const controller = new AbortController();
    const onUserAbort = () => controller.abort();
    if (init?.signal) {
      if (init.signal.aborted) controller.abort();
      else init.signal.addEventListener("abort", onUserAbort, { once: true });
    }
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(path, {
        ...rest,
        credentials: "include",
        headers,
        signal: controller.signal,
      });

      let body: unknown = null;
      if (res.status !== 204) {
        const text = await res.text();
        if (text) {
          try {
            body = JSON.parse(text);
          } catch {
            body = text;
          }
        }
      }

      if (!res.ok) {
        const { code, message } = normalizeError(body);
        if (
          res.status === 401 &&
          redirectOnUnauthorized &&
          typeof window !== "undefined"
        ) {
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.assign("/login");
        }
        throw new ApiError(res.status, code, message);
      }

      if (res.status === 204 || body === null) {
        return undefined as T;
      }
      return body as T;
    } catch (err) {
      lastError = err;
      const isAbort =
        err instanceof DOMException && err.name === "AbortError";
      const isApiError = err instanceof ApiError;
      const userAborted = !!init?.signal?.aborted;
      // Retry only on network failures (fetch throws TypeError / other errors).
      // HTTP errors (ApiError) and aborts (user or timeout) are not retried.
      const networkish = !isApiError && !isAbort;

      const shouldRetry =
        canRetry &&
        networkish &&
        !userAborted &&
        attempt < maxAttempts - 1;

      if (!shouldRetry) {
        throw err;
      }
    } finally {
      clearTimeout(timeoutId);
      if (init?.signal) {
        init.signal.removeEventListener("abort", onUserAbort);
      }
    }
  }

  throw lastError;
}

function normalizeError(body: unknown): { code: string; message: string } {
  if (Array.isArray(body)) {
    return { code: "HTTP_ERROR", message: "Terjadi kesalahan pada server" };
  }
  if (body && typeof body === "object") {
    const error = (body as { error?: unknown }).error;
    if (typeof error === "string") {
      return { code: error, message: error };
    }
    if (error && typeof error === "object" && !Array.isArray(error)) {
      const code = (error as { code?: unknown }).code;
      const message = (error as { message?: unknown }).message;
      return {
        code: typeof code === "string" ? code : "HTTP_ERROR",
        message:
          typeof message === "string" ? message : "Terjadi kesalahan pada server",
      };
    }
    const topCode = (body as { code?: unknown }).code;
    const topMessage = (body as { message?: unknown }).message;
    if (typeof topMessage === "string") {
      return {
        code: typeof topCode === "string" ? topCode : "HTTP_ERROR",
        message: topMessage,
      };
    }
  }
  if (typeof body === "string" && body) {
    return { code: "HTTP_ERROR", message: body };
  }
  return { code: "HTTP_ERROR", message: "Terjadi kesalahan pada server" };
}