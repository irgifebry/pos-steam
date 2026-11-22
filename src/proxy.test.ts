import { afterEach, describe, expect, it } from "vitest";
import { isAllowedOrigin } from "./proxy";

describe("proxy CORS", () => {
  const originalWebOrigin = process.env.WEB_ORIGIN;
  const originalAuthUrl = process.env.BETTER_AUTH_URL;

  afterEach(() => {
    if (originalWebOrigin === undefined) delete process.env.WEB_ORIGIN;
    else process.env.WEB_ORIGIN = originalWebOrigin;
    if (originalAuthUrl === undefined) delete process.env.BETTER_AUTH_URL;
    else process.env.BETTER_AUTH_URL = originalAuthUrl;
  });

  it("mengizinkan origin development", () => {
    expect(isAllowedOrigin("http://localhost:8081")).toBe(true);
    expect(isAllowedOrigin("http://192.168.101.4:8081")).toBe(true);
  });

  it("mengizinkan origin produksi dari WEB_ORIGIN", () => {
    process.env.WEB_ORIGIN = "https://pos-api.example.com";
    expect(isAllowedOrigin("https://pos-api.example.com")).toBe(true);
    expect(isAllowedOrigin("https://tidak-dikenal.example.com")).toBe(false);
  });

  it("mendukung beberapa origin yang dipisah koma", () => {
    process.env.WEB_ORIGIN = "https://satu.example.com, https://dua.example.com";
    expect(isAllowedOrigin("https://dua.example.com")).toBe(true);
  });

  it("menolak origin tanpa konfigurasi", () => {
    delete process.env.WEB_ORIGIN;
    delete process.env.BETTER_AUTH_URL;
    expect(isAllowedOrigin("https://tidak-dikenal.example.com")).toBe(false);
  });
});
