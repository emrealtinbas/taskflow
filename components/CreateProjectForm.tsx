"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { getApiErrorMessage } from "@/lib/api";

export function CreateProjectForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const data = (await response.json()) as { ok: boolean; error?: { message?: string } };
      if (!response.ok || !data.ok) {
        setError(getApiErrorMessage(data, "Proje oluşturulamadı."));
        return;
      }

      setName("");
      router.refresh();
    } catch {
      setError("Beklenmedik bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-elevated)] p-4 shadow-[0_8px_22px_rgba(15,31,51,0.05)]"
    >
      <h2 className="mb-3 text-lg font-semibold text-[var(--text-primary)]">Yeni Proje</h2>
      {error ? <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          required
          minLength={2}
          maxLength={100}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Örn: Web Site Yenileme"
          className="flex-1 rounded-lg border border-[var(--border-soft)] bg-[var(--bg-card)] px-3 py-2 text-[var(--text-primary)] outline-none transition focus:border-[var(--brand-600)] focus-visible:ring-2 focus-visible:ring-[var(--brand-600)]/35"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-[var(--brand-600)] px-4 py-2 font-medium text-white transition hover:bg-[var(--brand-700)] disabled:opacity-60"
        >
          {loading ? "Ekleniyor..." : "Ekle"}
        </button>
      </div>
    </form>
  );
}
