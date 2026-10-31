"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Field";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const { toast } = useToast();

  const busy = loading || googleLoading;

  async function handleGoogle() {
    setError("");
    setGoogleLoading(true);
    try {
      const result = await authClient.signIn.social({ provider: "google", callbackURL: "/kasir" });
      if (result?.error) {
        setError(result.error.message || "Gagal masuk dengan Google");
      }
    } catch {
      setError("Gagal menghubungi layanan login. Coba lagi.");
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim()) {
      setError("Email wajib diisi");
      return;
    }
    if (!/^\d{6,}$/.test(pin)) {
      setError("PIN minimal 6 angka");
      return;
    }
    setLoading(true);
    try {
      const result = await authClient.signIn.email({
        email: email.trim(),
        password: pin,
        callbackURL: "/kasir",
      });
      if (result?.error) {
        setError(result.error.message || "Email atau PIN salah");
        return;
      }
      router.push("/kasir");
    } catch {
      setError("Gagal menghubungi layanan login. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-bg">
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
          <Toast message={toast.message} variant={toast.variant} />
        </div>
      )}
      <div className="w-full max-w-md flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-white shadow-[var(--shadow-pop)]">
            <span className="font-display text-xl font-extrabold">PS</span>
          </div>
          <h1 className="font-display text-4xl font-extrabold text-ink tracking-tight leading-none">
            Masuk ke shift kamu
          </h1>
          <p className="text-muted text-base">POS Cuci Steam — kasir, antrean, laporan, semua dalam satu.</p>
        </div>

        <Card className="flex flex-col gap-4">
          <Button
            variant="secondary"
            fullWidth
            size="lg"
            onClick={handleGoogle}
            disabled={busy}
          >
            {googleLoading ? "Mengalihkan..." : "Masuk dengan Google"}
          </Button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-line" />
            <span className="text-xs text-muted font-bold">ATAU</span>
            <div className="flex-1 h-px bg-line" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field label="Email" htmlFor="login-email" error={error && !email.trim() ? error : undefined}>
              <Input
                id="login-email"
                type="email"
                placeholder="nama@contoh.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                aria-invalid={!!error && !email.trim()}
                aria-describedby={error && !email.trim() ? "login-email-error" : undefined}
                disabled={busy}
              />
            </Field>
            <Field
              label="PIN"
              htmlFor="login-pin"
              hint="PIN yang diberikan admin"
              error={error && email.trim() && pin.length < 6 ? error : undefined}
            >
              <Input
                id="login-pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={12}
                placeholder="••••••"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                autoComplete="current-password"
                aria-invalid={!!error && pin.length < 6}
                aria-describedby={error && pin.length < 6 ? "login-pin-error" : undefined}
                disabled={busy}
              />
            </Field>
            {error && email.trim() && pin.length >= 6 && (
              <p role="alert" className="text-sm text-danger">{error}</p>
            )}
            <Button type="submit" fullWidth size="lg" disabled={busy}>
              {loading ? "Memproses..." : "Masuk"}
            </Button>
          </form>
        </Card>

        <p className="text-center text-xs text-muted">
          Lupa PIN? Hubungi admin outlet untuk reset.
        </p>
      </div>
    </div>
  );
}