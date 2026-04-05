import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/server/errors";
import { createProjectSchema } from "@/lib/validation/schemas";

export async function createProject(ownerId: string, rawInput: unknown) {
  const input = createProjectSchema.parse(rawInput);

  return prisma.project.create({
    data: {
      ownerId,
      name: input.name,
    },
    select: {
      id: true,
      name: true,
      createdAt: true,
    },
  });
}

export async function listProjects(ownerId: string) {
  const projects = await prisma.project.findMany({
    where: { ownerId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { tasks: true },
      },
    },
  });

  return projects.map((project) => ({
    id: project.id,
    name: project.name,
    createdAt: project.createdAt,
    taskCount: project._count.tasks,
  }));
}

export async function assertProjectOwner(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, ownerId: true },
  });

  if (!project) {
    throw new AppError("Proje bulunamadı.", 404, "PROJECT_NOT_FOUND");
  }

  if (project.ownerId !== userId) {
    throw new AppError("Projeye erişim yetkiniz yok.", 403, "PROJECT_FORBIDDEN");
  }
}
