import { notFound, redirect } from "next/navigation";
import { ProjectBoard } from "@/components/ProjectBoard";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ projectId: string }>;

export default async function ProjectDetailPage({ params }: { params: Params }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const { projectId } = await params;

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      ownerId: user.id,
    },
    include: {
      tasks: {
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
      },
    },
  });

  if (!project) {
    notFound();
  }

  const users = await prisma.user.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ProjectBoard
        projectId={project.id}
        projectName={project.name}
        users={users}
        initialTasks={project.tasks.map((task) => ({
          id: task.id,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          dueDate: task.dueDate ? task.dueDate.toISOString() : null,
          assigneeId: task.assigneeId,
          assigneeName: task.assignee?.name || null,
          createdAt: task.createdAt.toISOString(),
          updatedAt: task.updatedAt.toISOString(),
        }))}
      />
    </section>
  );
}
