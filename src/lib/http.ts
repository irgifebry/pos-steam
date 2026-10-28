import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function jsonError(error: unknown): Response {
  if (error instanceof HttpError) {
    return Response.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }

  if (error instanceof ZodError) {
    const issue = error.issues[0];
    return Response.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: issue?.message ?? "Data tidak valid",
        },
      },
      { status: 400 },
    );
  }

  console.error(error);
  return Response.json(
    { error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan pada server" } },
    { status: 500 },
  );
}

export function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 5; depth += 1) {
    if (typeof current !== "object" || current === null) return false;
    if ((current as { code?: string }).code === "23505") return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}
