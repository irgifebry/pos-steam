"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Field";
import { Card } from "@/components/ui/Card";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleGoogle() {
    setError("");
    setGoogleLoading(true);
    try {
      await authClient.signIn.social({ provider: "google", callbackURL: "/kasir" });
    } catch {
      enterDemo();
    } finally {
      setGoogleLoading(false);
    }
  }

  function enterDemo() {
    if (typeof window !== "undefined") localStorage.setItem("pos_demo_mode", "1");
    router.push("/kasir");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim()) {
      setError("Email wajib diisi");
      return;
    }
    if (pin.length < 6) {
      setError("PIN minimal 6 angka");
      return;
    }
    setLoading(true);
    try {
      await authClient.signIn.email({ email: email.trim(), password: pin, callbackURL: "/kasir" });
      router.push("/kasir");
    } catch {
      // Backend tidak tersedia → masuk mode demo
      enterDemo();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-bg">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-brand text-white flex items-center justify-center shadow-[var(--shadow-float)] mb-4">
            <span className="text-2xl font-extrabold">PS</span>
          </div>
          <h1 className="text-2xl font-extrabold text-ink">POS Cuci Steam</h1>
          <p className="text-muted mt-1">Masuk untuk mulai shift</p>
        </div>

        <Card className="flex flex-col gap-4">
          <Button
            variant="secondary"
            fullWidth
            size="lg"
            onClick={handleGoogle}
            disabled={googleLoading}
          >
            {googleLoading ? "Mengalihkan..." : "Masuk dengan Google"}
          </Button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-line" />
            <span className="text-xs text-muted font-semibold">ATAU</span>
            <div className="flex-1 h-px bg-line" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field label="Email" error={error && !email.trim() ? error : undefined}>
              <Input
                type="email"
                placeholder="nama@contoh.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </Field>
            <Field label="PIN (6 angka)" hint="PIN yang diberikan admin">
              <Input
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="••••••"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                autoComplete="current-password"
              />
            </Field>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" fullWidth size="lg" disabled={loading}>
              {loading ? "Memproses..." : "Masuk"}
            </Button>
          </form>
        </Card>

        <div className="text-center">
          <button
            type="button"
            onClick={enterDemo}
            className="text-sm font-semibold text-brand hover:underline"
          >
            Masuk mode demo (tanpa login)
          </button>
        </div>
        <p className="text-center text-xs text-muted">
          Lupa PIN? Hubungi admin outlet untuk reset.
        </p>
      </div>
    </div>
  );
}