import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";
import { getCurrentUser } from "@/lib/auth/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[var(--bg-page)] text-[var(--text-primary)]">
      <header className="border-b border-[var(--border-soft)] bg-white/72 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div>
            <p className="text-lg font-semibold text-[var(--text-primary)]">TaskFlow</p>
            <p className="text-sm text-[var(--text-secondary)]">{user.name}</p>
          </div>

          <nav className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="rounded-lg px-3 py-1.5 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--brand-soft)] hover:text-[var(--brand-700)] focus-visible:ring-2 focus-visible:ring-[var(--brand-600)]/35"
            >
              Dashboard
            </Link>
            <Link
              href="/projects"
              className="rounded-lg px-3 py-1.5 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--brand-soft)] hover:text-[var(--brand-700)] focus-visible:ring-2 focus-visible:ring-[var(--brand-600)]/35"
            >
              Projeler
            </Link>
            <LogoutButton />
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 min-h-0 flex-col overflow-y-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
