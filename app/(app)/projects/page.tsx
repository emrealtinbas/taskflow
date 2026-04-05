import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateProjectForm } from "@/components/CreateProjectForm";
import { getCurrentUser } from "@/lib/auth/session";
import { listProjects } from "@/lib/server/project-service";

export default async function ProjectsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const projects = await listProjects(user.id);

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Projeler</h1>
        <p className="text-[var(--text-secondary)]">Görevlerini projelere böl, düzenli takip et.</p>
      </div>

      <CreateProjectForm />

      <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-elevated)] p-4 shadow-[0_8px_22px_rgba(15,31,51,0.05)]">
        <h2 className="mb-3 text-lg font-semibold text-[var(--text-primary)]">Proje Listesi</h2>
        {projects.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--border-soft)] bg-[var(--bg-soft)] p-6 text-center text-[var(--text-secondary)]">
            Henüz proje yok. Üstteki formdan ilk projenizi ekleyin.
          </div>
        ) : (
          <ul className="space-y-2">
            {projects.map((project) => (
              <li
                key={project.id}
                className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-3 transition hover:border-[var(--brand-600)]/35 hover:shadow-[0_4px_14px_rgba(15,31,51,0.08)]"
              >
                <Link href={`/projects/${project.id}`} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">{project.name}</p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Oluşturulma: {new Date(project.createdAt).toLocaleDateString("tr-TR")}
                    </p>
                  </div>
                  <span className="rounded bg-[var(--bg-soft)] px-2 py-1 text-xs text-[var(--text-secondary)]">
                    {project.taskCount} görev
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
