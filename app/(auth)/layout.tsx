import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(120%_130%_at_6%_-10%,#ffffffc9_0%,transparent_55%),radial-gradient(120%_130%_at_100%_-20%,#e8f4ffd9_0%,transparent_52%),var(--bg-page)] p-4">
      {children}
    </main>
  );
}
