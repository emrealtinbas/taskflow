import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const projects = await prisma.project.findMany({
    where: { ownerId: user.id },
    select: {
      id: true,
      name: true,
      tasks: {
        select: {
          id: true,
          dueDate: true,
          status: true,
        },
      },
    },
  });

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  let dueToday = 0;
  let overdue = 0;
  let completed = 0;

  for (const project of projects) {
    for (const task of project.tasks) {
      if (task.status === "DONE") {
        completed += 1;
      }

      if (task.dueDate) {
        if (task.dueDate >= todayStart && task.dueDate < tomorrowStart) {
          dueToday += 1;
        }

        if (task.dueDate < todayStart && task.status !== "DONE") {
          overdue += 1;
        }
      }
    }
  }

  const stats = [
    {
      label: "Bugün Teslim",
      value: dueToday,
      tone: "bg-amber-50 border-amber-200 text-amber-800",
    },
    {
      label: "Geciken",
      value: overdue,
      tone: "bg-rose-50 border-rose-200 text-rose-800",
    },
    {
      label: "Tamamlanan",
      value: completed,
      tone: "bg-emerald-50 border-emerald-200 text-emerald-800",
    },
  ];

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Dashboard</h1>
        <p className="text-[var(--text-secondary)]">Bugünkü iş yükünü ve ekip çıktısını izleyin.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <article key={stat.label} className={`rounded-2xl border p-4 shadow-[0_4px_14px_rgba(15,31,51,0.05)] ${stat.tone}`}>
            <p className="text-sm font-medium">{stat.label}</p>
            <p className="mt-2 text-3xl font-semibold">{stat.value}</p>
          </article>
        ))}
      </div>

      <article className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-elevated)] p-4 shadow-[0_8px_22px_rgba(15,31,51,0.05)]">
        <h2 className="mb-2 text-lg font-semibold text-[var(--text-primary)]">Proje Özeti</h2>
        {projects.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">Henüz projeniz yok. Projeler sayfasından başlayabilirsiniz.</p>
        ) : (
          <ul className="space-y-2">
            {projects.map((project) => (
              <li
                key={project.id}
                className="flex items-center justify-between rounded-lg border border-[var(--border-soft)] bg-[var(--bg-card)] p-3"
              >
                <span className="font-medium text-[var(--text-primary)]">{project.name}</span>
                <span className="text-sm text-[var(--text-secondary)]">{project.tasks.length} görev</span>
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  );
}
