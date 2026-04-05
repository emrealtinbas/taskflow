"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      disabled={loading}
      className="rounded-lg border border-[var(--border-soft)] bg-[var(--bg-elevated)] px-3 py-1.5 text-sm text-[var(--text-secondary)] transition hover:border-[var(--brand-600)]/35 hover:bg-[var(--brand-soft)] hover:text-[var(--brand-700)] disabled:opacity-60"
      onClick={async () => {
        setLoading(true);
        try {
          await fetch("/api/auth/logout", { method: "POST" });
          router.replace("/login");
          router.refresh();
        } finally {
          setLoading(false);
        }
      }}
    >
      {loading ? "..." : "Çıkış"}
    </button>
  );
}
