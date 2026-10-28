"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { apiFetch } from "@/lib/api-client";
import { useAppSession } from "./SessionProvider";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import type { AppUser, AppUserSummary } from "@/lib/services/users";

type SwitchUser = { id: string; name: string; role: string; email?: string };

export function OperatorSwitcher({ onClose }: { onClose: () => void }) {
  const { role: currentRole } = useAppSession();
  const [users, setUsers] = useState<SwitchUser[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const path = currentRole === "admin" ? "/api/users?includeInactive=false" : "/api/users?light=1";
    apiFetch<{ data: AppUser[] | AppUserSummary[] }>(path)
      .then((r) => {
        const mapped = (r.data as Array<AppUser | AppUserSummary>).map((u) => ({
          id: u.id,
          name: u.name,
          role: u.role,
          email: "email" in u ? (u as AppUser).email : undefined,
        }));
        setUsers(mapped);
      })
      .catch((e) => setError(e.message));
  }, [currentRole]);

  const canSwitch = users.some((u) => u.email);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const u = users.find((x) => x.id === selected);
    if (!u) {
      setError("Pilih nama dulu");
      return;
    }
    if (!u.email) {
      setError("Email pengguna tidak tersedia. Hubungi admin.");
      return;
    }
    if (pin.length < 6) {
      setError("PIN minimal 6 angka");
      return;
    }
    setLoading(true);
    try {
      await authClient.signIn.email({ email: u.email, password: pin });
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal ganti operator");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface rounded-[var(--radius-lg)] p-5 shadow-[var(--shadow-float)]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Ganti Operator</h2>
          <button onClick={onClose} className="h-10 w-10 rounded-xl border border-line flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>
        {!canSwitch && (
          <p className="text-sm text-muted mb-3">
            Daftar pengguna tidak memuat email. Ganti operator hanya bisa dilakukan oleh admin.
          </p>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
            {users.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => setSelected(u.id)}
                className={`text-left px-4 py-3 rounded-[var(--radius-sm)] border tap-target ${
                  selected === u.id ? "border-brand bg-brand-soft" : "border-line bg-surface"
                }`}
              >
                <p className="font-semibold">{u.name}</p>
                <p className="text-xs text-muted">{u.role}</p>
              </button>
            ))}
          </div>
          <Input
            type="password"
            inputMode="numeric"
            maxLength={6}
            placeholder="PIN 6 angka"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" fullWidth disabled={loading || !canSwitch}>
            {loading ? "Memproses..." : "Masuk sebagai operator ini"}
          </Button>
        </form>
      </div>
    </div>
  );
}