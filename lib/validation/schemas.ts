import { TaskPriority, TaskStatus } from "@prisma/client";
import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Ad en az 2 karakter olmalı.").max(80),
  email: z.string().trim().email("Geçerli bir e-posta girin.").max(120),
  password: z
    .string()
    .min(8, "Şifre en az 8 karakter olmalı.")
    .max(120)
    .regex(/[A-Z]/, "Şifre en az bir büyük harf içermeli.")
    .regex(/[a-z]/, "Şifre en az bir küçük harf içermeli.")
    .regex(/[0-9]/, "Şifre en az bir rakam içermeli."),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Geçerli bir e-posta girin."),
  password: z.string().min(1, "Şifre gerekli."),
});

export const createProjectSchema = z.object({
  name: z.string().trim().min(2, "Proje adı en az 2 karakter olmalı.").max(100),
});

const dueDateSchema = z
  .string()
  .trim()
  .optional()
  .refine((value) => !value || !Number.isNaN(Date.parse(value)), "Geçersiz tarih")
  .transform((value) => {
    if (!value) {
      return null;
    }

    return new Date(value);
  });

export const createTaskSchema = z.object({
  title: z.string().trim().min(2, "Başlık en az 2 karakter olmalı.").max(150),
  description: z.string().trim().max(1000).optional(),
  status: z.nativeEnum(TaskStatus).default(TaskStatus.TODO),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  dueDate: dueDateSchema,
  assigneeId: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(2).max(150).optional(),
    description: z.string().trim().max(1000).optional(),
    status: z.nativeEnum(TaskStatus).optional(),
    priority: z.nativeEnum(TaskPriority).optional(),
    dueDate: dueDateSchema.optional(),
    assigneeId: z
      .string()
      .trim()
      .optional()
      .transform((value) => (value === "" ? null : value)),
  })
  .refine((data) => Object.keys(data).length > 0, "En az bir alan güncellenmeli.");

export const taskFilterSchema = z.object({
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  assigneeId: z.string().trim().optional(),
});
