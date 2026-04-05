"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { getApiErrorMessage } from "@/lib/api";

type AuthMode = "login" | "register";

type AuthFormProps = {
  mode: AuthMode;
};

const MODE_TEXT: Record<AuthMode, { title: string; submit: string; altLabel: string; altHref: string; altCta: string }> =
  {
    login: {
      title: "TaskFlow hesabına giriş",
      submit: "Giriş yap",
      altLabel: "Hesabın yok mu?",
      altHref: "/register",
      altCta: "Kayıt ol",
    },
    register: {
      title: "TaskFlow hesabı oluştur",
      submit: "Hesap oluştur",
      altLabel: "Zaten hesabın var mı?",
      altHref: "/login",
      altCta: "Giriş yap",
    },
  };

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const text = useMemo(() => MODE_TEXT[mode], [mode]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const payload = mode === "register" ? { name, email, password } : { email, password };

    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as { ok: boolean; error?: { message?: string } };

      if (!res.ok || !data.ok) {
        setError(getApiErrorMessage(data, "İşlem başarısız oldu."));
        return;
      }

      router.replace("/dashboard");
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
      className="w-full max-w-md rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-6 shadow-[0_18px_46px_rgba(15,31,51,0.14)]"
    >
      <h1 className="mb-1 text-2xl font-semibold text-[var(--text-primary)]">{text.title}</h1>
      <p className="mb-6 text-sm text-[var(--text-secondary)]">Görevlerini tek ekranda takip etmeye başla.</p>

      {error ? <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      {mode === "register" ? (
        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">Ad Soyad</span>
          <input
            required
            minLength={2}
            className="w-full rounded-lg border border-[var(--border-soft)] bg-[var(--bg-card)] px-3 py-2 text-[var(--text-primary)] outline-none transition focus:border-[var(--brand-600)] focus-visible:ring-2 focus-visible:ring-[var(--brand-600)]/35"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
      ) : null}

      <label className="mb-4 block">
        <span className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">E-posta</span>
        <input
          required
          type="email"
          className="w-full rounded-lg border border-[var(--border-soft)] bg-[var(--bg-card)] px-3 py-2 text-[var(--text-primary)] outline-none transition focus:border-[var(--brand-600)] focus-visible:ring-2 focus-visible:ring-[var(--brand-600)]/35"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>

      <label className="mb-6 block">
        <span className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">Şifre</span>
        <input
          required
          type="password"
          minLength={8}
          className="w-full rounded-lg border border-[var(--border-soft)] bg-[var(--bg-card)] px-3 py-2 text-[var(--text-primary)] outline-none transition focus:border-[var(--brand-600)] focus-visible:ring-2 focus-visible:ring-[var(--brand-600)]/35"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-[var(--brand-600)] px-4 py-2 font-medium text-white transition hover:bg-[var(--brand-700)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "İşleniyor..." : text.submit}
      </button>

      <p className="mt-4 text-sm text-[var(--text-secondary)]">
        {text.altLabel}{" "}
        <Link href={text.altHref} className="font-medium text-[var(--brand-600)] hover:text-[var(--brand-700)]">
          {text.altCta}
        </Link>
      </p>
    </form>
  );
}
