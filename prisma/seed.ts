import bcrypt from "bcryptjs";
import { TaskPriority, TaskStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";

async function main() {
  const email = "demo@taskflow.local";
  const passwordHash = await bcrypt.hash("DemoPass123", 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: "Demo User",
      passwordHash,
    },
    create: {
      name: "Demo User",
      email,
      passwordHash,
    },
  });

  let project = await prisma.project.findFirst({
    where: {
      ownerId: user.id,
      name: "Demo Product Launch",
    },
  });

  if (!project) {
    project = await prisma.project.create({
      data: {
        ownerId: user.id,
        name: "Demo Product Launch",
      },
    });
  }

  const existing = await prisma.task.count({
    where: {
      projectId: project.id,
    },
  });

  if (existing === 0) {
    const now = new Date();
    const dueSoon = new Date(now);
    dueSoon.setDate(dueSoon.getDate() + 1);

    const overdue = new Date(now);
    overdue.setDate(overdue.getDate() - 1);

    await prisma.task.createMany({
      data: [
        {
          projectId: project.id,
          title: "Landing page copy review",
          description: "Ana sayfa metinleri son kontrol.",
          status: TaskStatus.TODO,
          priority: TaskPriority.MEDIUM,
          dueDate: dueSoon,
          assigneeId: user.id,
        },
        {
          projectId: project.id,
          title: "Payment integration test",
          description: "Staging ortaminda odeme akisini dogrula.",
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.HIGH,
          dueDate: now,
          assigneeId: user.id,
        },
        {
          projectId: project.id,
          title: "Retrospective notes",
          description: "Sprint retrospective notlarini toparla.",
          status: TaskStatus.DONE,
          priority: TaskPriority.LOW,
          dueDate: overdue,
          assigneeId: user.id,
        },
      ],
    });
  }

  console.log("Seed completed.");
  console.log(`Demo user: ${email}`);
  console.log("Demo password: DemoPass123");
  console.log(`Project: ${project.name}`);
}

main()
  .catch((error) => {
    console.error("Seed failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
