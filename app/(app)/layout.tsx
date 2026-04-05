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
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div>
            <p className="text-lg font-semibold text-slate-900">TaskFlow</p>
            <p className="text-sm text-slate-600">{user.name}</p>
          </div>

          <nav className="flex items-center gap-2">
            <Link href="/dashboard" className="rounded-lg px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100">
              Dashboard
            </Link>
            <Link href="/projects" className="rounded-lg px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100">
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
