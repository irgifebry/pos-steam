import { describe, expect, it } from "vitest";
import { z } from "zod";
import { HttpError, jsonError } from "./http";

describe("jsonError", () => {
  it("mengembalikan 401 untuk HttpError UNAUTHENTICATED", async () => {
    const res = jsonError(new HttpError(401, "UNAUTHENTICATED", "Silakan masuk kembali"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      error: { code: "UNAUTHENTICATED", message: "Silakan masuk kembali" },
    });
  });

  it("mengembalikan 400 VALIDATION_ERROR dengan pesan Zod pertama", async () => {
    const parsed = z.object({ name: z.string().min(1, "Nama wajib diisi") }).safeParse({ name: "" });
    const res = jsonError(parsed.error);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.message).toBe("Nama wajib diisi");
  });

  it("mengembalikan 500 untuk error tak dikenal", async () => {
    const res = jsonError(new Error("boom"));
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe("INTERNAL_ERROR");
  });
});
