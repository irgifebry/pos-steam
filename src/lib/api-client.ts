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
};

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { redirectOnUnauthorized?: boolean },
  options?: ApiFetchOptions,
): Promise<T> {
  const {
    redirectOnUnauthorized: initRedirect,
    ...rest
  } = init ?? {};
  const redirectOnUnauthorized =
    options?.redirectOnUnauthorized ?? initRedirect ?? true;

  const headers = new Headers(init?.headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const res = await fetch(path, {
    ...rest,
    credentials: "include",
    headers,
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