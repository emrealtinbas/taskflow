"use client";

import { TaskPriority, TaskStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { DragEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { getApiErrorMessage } from "@/lib/api";
import type { TaskBoardItem } from "@/lib/types";

type UserOption = {
  id: string;
  name: string;
};

type ProjectBoardProps = {
  projectId: string;
  projectName: string;
  initialTasks: TaskBoardItem[];
  users: UserOption[];
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: "Todo",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
};

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  LOW: "Düşük",
  MEDIUM: "Orta",
  HIGH: "Yüksek",
};

const COLUMNS: TaskStatus[] = [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.DONE];
const DRAG_TASK_MIME = "application/taskflow-task";

type DragPayload = {
  taskId: string;
  fromStatus: TaskStatus;
};

type TaskFormState = {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  assigneeId: string;
};

const EMPTY_FORM: TaskFormState = {
  title: "",
  description: "",
  status: TaskStatus.TODO,
  priority: TaskPriority.MEDIUM,
  dueDate: "",
  assigneeId: "",
};

function isTaskStatus(value: string): value is TaskStatus {
  return COLUMNS.includes(value as TaskStatus);
}

function isAdjacentTransition(from: TaskStatus, to: TaskStatus) {
  const fromIndex = COLUMNS.indexOf(from);
  const toIndex = COLUMNS.indexOf(to);

  if (fromIndex === -1 || toIndex === -1) {
    return false;
  }

  return Math.abs(toIndex - fromIndex) === 1;
}

function parseDragPayload(event: DragEvent): DragPayload | null {
  const raw = event.dataTransfer.getData(DRAG_TASK_MIME);
  if (!raw) {
    return null;
  }

  try {
    const payload = JSON.parse(raw) as { taskId?: unknown; fromStatus?: unknown };
    if (typeof payload.taskId !== "string" || typeof payload.fromStatus !== "string") {
      return null;
    }
    if (!isTaskStatus(payload.fromStatus)) {
      return null;
    }

    return {
      taskId: payload.taskId,
      fromStatus: payload.fromStatus,
    };
  } catch {
    return null;
  }
}

export function ProjectBoard({ projectId, projectName, initialTasks, users }: ProjectBoardProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<TaskFormState>(EMPTY_FORM);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const firstInputRef = useRef<HTMLInputElement | null>(null);
  const modalOpenTriggerRef = useRef<HTMLElement | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");

  useEffect(() => {
    if (!isTaskModalOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    const timer = window.setTimeout(() => {
      firstInputRef.current?.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeTaskModal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isTaskModalOpen]);

  const filteredTasks = useMemo(
    () =>
      tasks.filter((task) => {
        if (statusFilter !== "all" && task.status !== statusFilter) {
          return false;
        }
        if (priorityFilter !== "all" && task.priority !== priorityFilter) {
          return false;
        }
        if (assigneeFilter !== "all" && (task.assigneeId || "") !== assigneeFilter) {
          return false;
        }
        return true;
      }),
    [tasks, statusFilter, priorityFilter, assigneeFilter],
  );

  const tasksByStatus = useMemo(
    () =>
      COLUMNS.reduce<Record<TaskStatus, TaskBoardItem[]>>(
        (acc, status) => {
          acc[status] = filteredTasks.filter((task) => task.status === status);
          return acc;
        },
        {
          TODO: [],
          IN_PROGRESS: [],
          DONE: [],
        },
      ),
    [filteredTasks],
  );

  async function reloadTasks() {
    const query = new URLSearchParams();
    if (statusFilter !== "all") {
      query.set("status", statusFilter);
    }
    if (priorityFilter !== "all") {
      query.set("priority", priorityFilter);
    }
    if (assigneeFilter !== "all") {
      query.set("assigneeId", assigneeFilter);
    }

    const res = await fetch(`/api/projects/${projectId}?${query.toString()}`);
    const data = (await res.json()) as {
      ok: boolean;
      data?: { tasks: Array<TaskBoardItem & { dueDate: string | null }> };
      error?: { message?: string };
    };

    if (!res.ok || !data.ok || !data.data) {
      throw new Error(getApiErrorMessage(data, "Görevler yenilenemedi."));
    }

    setTasks(
      data.data.tasks.map((task) => ({
        ...task,
        dueDate: task.dueDate,
      })),
    );
  }

  function closeTaskModal() {
    setIsTaskModalOpen(false);
    setEditingTaskId(null);
    setForm(EMPTY_FORM);
    setError(null);

    if (modalOpenTriggerRef.current) {
      modalOpenTriggerRef.current.focus();
      modalOpenTriggerRef.current = null;
    }
  }

  function openCreateTaskModal(trigger?: HTMLElement) {
    if (trigger) {
      modalOpenTriggerRef.current = trigger;
    }
    setError(null);
    setEditingTaskId(null);
    setForm(EMPTY_FORM);
    setIsTaskModalOpen(true);
  }

  function openEditTaskModal(task: TaskBoardItem, trigger?: HTMLElement) {
    if (trigger) {
      modalOpenTriggerRef.current = trigger;
    }

    setError(null);
    setEditingTaskId(task.id);
    setForm({
      title: task.title,
      description: task.description || "",
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "",
      assigneeId: task.assigneeId || "",
    });
    setIsTaskModalOpen(true);
  }

  async function submitTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const endpoint = editingTaskId
        ? `/api/projects/${projectId}/tasks/${editingTaskId}`
        : `/api/projects/${projectId}/tasks`;

      const method = editingTaskId ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          assigneeId: form.assigneeId || undefined,
          dueDate: form.dueDate || undefined,
        }),
      });

      const data = (await response.json()) as { ok: boolean; error?: { message?: string } };
      if (!response.ok || !data.ok) {
        setError(getApiErrorMessage(data, "Görev kaydedilemedi."));
        return;
      }

      setEditingTaskId(null);
      setForm(EMPTY_FORM);
      setIsTaskModalOpen(false);
      await reloadTasks();
      router.refresh();
    } catch {
      setError("Beklenmedik bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  async function removeTask(taskId: string) {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { ok: boolean; error?: { message?: string } };
      if (!response.ok || !data.ok) {
        setError(getApiErrorMessage(data, "Görev silinemedi."));
        return;
      }

      if (editingTaskId === taskId) {
        setEditingTaskId(null);
        setForm(EMPTY_FORM);
      }

      await reloadTasks();
      router.refresh();
    } catch {
      setError("Beklenmedik bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  async function patchTask(taskId: string, payload: Partial<TaskFormState>) {
    setError(null);
    setLoading(true);
    setPendingTaskId(taskId);
    try {
      const response = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { ok: boolean; error?: { message?: string } };
      if (!response.ok || !data.ok) {
        setError(getApiErrorMessage(data, "Görev güncellenemedi."));
        return false;
      }

      await reloadTasks();
      router.refresh();
      return true;
    } catch {
      setError("Beklenmedik bir hata oluştu.");
      return false;
    } finally {
      setPendingTaskId(null);
      setLoading(false);
    }
  }

  function handleDragStart(event: DragEvent<HTMLElement>, task: TaskBoardItem) {
    if (loading || pendingTaskId || isTaskModalOpen) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(DRAG_TASK_MIME, JSON.stringify({ taskId: task.id, fromStatus: task.status }));
    event.dataTransfer.setData("text/plain", task.id);

    setError(null);
    setDraggingTaskId(task.id);
  }

  function handleDragEnd() {
    setDraggingTaskId(null);
    setDragOverStatus(null);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>, targetStatus: TaskStatus) {
    if (isTaskModalOpen) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    if (dragOverStatus !== targetStatus) {
      setDragOverStatus(targetStatus);
    }
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>, targetStatus: TaskStatus) {
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
      return;
    }

    if (dragOverStatus === targetStatus) {
      setDragOverStatus(null);
    }
  }

  async function handleDrop(event: DragEvent<HTMLDivElement>, targetStatus: TaskStatus) {
    event.preventDefault();
    setDragOverStatus(null);

    if (loading || pendingTaskId || isTaskModalOpen) {
      setDraggingTaskId(null);
      return;
    }

    const payload = parseDragPayload(event);
    if (!payload) {
      setDraggingTaskId(null);
      return;
    }

    const { taskId, fromStatus } = payload;

    if (fromStatus === targetStatus) {
      setDraggingTaskId(null);
      return;
    }

    if (!isAdjacentTransition(fromStatus, targetStatus)) {
      setError("Durum geçişi sadece komşu kolonlar arasında yapılabilir.");
      setDraggingTaskId(null);
      return;
    }

    const success = await patchTask(taskId, { status: targetStatus });
    if (!success) {
      try {
        await reloadTasks();
      } catch {
        // keep existing error message from patchTask
      }
    }

    setDraggingTaskId(null);
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{projectName}</h1>
          <p className="text-slate-600">Kanban görünümünde görevlerinizi yönetin.</p>
        </div>
        <button
          type="button"
          disabled={loading || !!pendingTaskId}
          onClick={(event) => openCreateTaskModal(event.currentTarget)}
          className="inline-flex items-center justify-center rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-800 disabled:opacity-60"
        >
          Yeni Görev
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-base font-semibold text-slate-900">Filtreler</h3>
        <div className="grid gap-2 sm:grid-cols-3">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
          >
            <option value="all">Tüm durumlar</option>
            {COLUMNS.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABEL[status]}
              </option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
          >
            <option value="all">Tüm öncelikler</option>
            {Object.values(TaskPriority).map((priority) => (
              <option key={priority} value={priority}>
                {PRIORITY_LABEL[priority]}
              </option>
            ))}
          </select>

          <select
            value={assigneeFilter}
            onChange={(event) => setAssigneeFilter(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
          >
            <option value="all">Tüm sorumlular</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <div className="grid h-full min-h-0 gap-4 overflow-y-auto lg:grid-cols-3 lg:overflow-hidden">
        {COLUMNS.map((status) => (
          <div
            key={status}
            onDragOver={(event) => handleDragOver(event, status)}
            onDragEnter={() => {
              if (!isTaskModalOpen) {
                setDragOverStatus(status);
              }
            }}
            onDragLeave={(event) => handleDragLeave(event, status)}
            onDrop={(event) => void handleDrop(event, status)}
            className={`flex h-[min(26rem,60dvh)] min-h-0 flex-col rounded-2xl border bg-white p-3 transition lg:h-full ${
              dragOverStatus === status
                ? "border-cyan-500 bg-cyan-50/40 shadow-inner"
                : "border-slate-200"
            }`}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">{STATUS_LABEL[status]}</h3>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{tasksByStatus[status].length}</span>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
              {tasksByStatus[status].length === 0 ? (
                <div
                  className={`flex min-h-full flex-1 items-center justify-center rounded-lg border border-dashed p-3 text-center text-sm transition ${
                    dragOverStatus === status ? "border-cyan-500 text-cyan-700" : "border-slate-300 text-slate-500"
                  }`}
                >
                  Bu kolonda görev yok. Kartı buraya bırakabilirsiniz.
                </div>
              ) : (
                tasksByStatus[status].map((task) => (
                  <article
                    key={task.id}
                    draggable={!loading && !pendingTaskId && !isTaskModalOpen}
                    onDragStart={(event) => handleDragStart(event, task)}
                    onDragEnd={handleDragEnd}
                    className={`shrink-0 rounded-lg border p-3 transition ${
                      draggingTaskId === task.id
                        ? "cursor-grabbing border-cyan-400 bg-cyan-50/70 opacity-60"
                        : "cursor-grab border-slate-200"
                    } ${pendingTaskId === task.id ? "pointer-events-none opacity-70" : ""}`}
                  >
                    <div
                      onDoubleClick={(event) => {
                        event.stopPropagation();
                        openEditTaskModal(task, event.currentTarget);
                      }}
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <h4 className="text-sm font-semibold text-slate-900">{task.title}</h4>
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">
                          {PRIORITY_LABEL[task.priority]}
                        </span>
                      </div>

                      {task.description ? (
                        <p className="mb-2 text-sm text-slate-600">{task.description}</p>
                      ) : (
                        <p className="mb-2 text-sm text-slate-400">Açıklama yok</p>
                      )}

                      <div className="mb-2 text-xs text-slate-500">
                        <p>Sorumlu: {task.assigneeName || "Atanmadı"}</p>
                        <p>Son tarih: {task.dueDate ? new Date(task.dueDate).toLocaleDateString("tr-TR") : "Yok"}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700"
                        disabled={loading || !!pendingTaskId}
                        onClick={(event) => openEditTaskModal(task, event.currentTarget)}
                      >
                        Düzenle
                      </button>

                      <button
                        type="button"
                        className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700"
                        disabled={loading || !!pendingTaskId}
                        onClick={() => void removeTask(task.id)}
                      >
                        Sil
                      </button>

                      {task.status !== TaskStatus.TODO ? (
                        <button
                          type="button"
                          className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700"
                          disabled={loading || !!pendingTaskId}
                          onClick={() =>
                            void patchTask(task.id, {
                              status:
                                task.status === TaskStatus.DONE ? TaskStatus.IN_PROGRESS : TaskStatus.TODO,
                            })
                          }
                        >
                          Geri
                        </button>
                      ) : null}

                      {task.status !== TaskStatus.DONE ? (
                        <button
                          type="button"
                          className="rounded bg-cyan-700 px-2 py-1 text-xs text-white"
                          disabled={loading || !!pendingTaskId}
                          onClick={() =>
                            void patchTask(task.id, {
                              status:
                                task.status === TaskStatus.TODO ? TaskStatus.IN_PROGRESS : TaskStatus.DONE,
                            })
                          }
                        >
                          İleri
                        </button>
                      ) : null}
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        ))}
        </div>
      </div>

      {isTaskModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeTaskModal();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-modal-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-xl"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 id="task-modal-title" className="text-lg font-semibold text-slate-900">
                {editingTaskId ? "Görevi Düzenle" : "Yeni Görev"}
              </h2>
              <button
                type="button"
                aria-label="Kapat"
                className="rounded p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                onClick={closeTaskModal}
              >
                X
              </button>
            </div>

            {error ? <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

            <form onSubmit={submitTask} className="grid gap-3 md:grid-cols-2">
              <input
                ref={firstInputRef}
                required
                minLength={2}
                maxLength={150}
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Görev başlığı"
                className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-cyan-600 md:col-span-2"
              />

              <textarea
                rows={3}
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Açıklama"
                className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-cyan-600 md:col-span-2"
              />

              <select
                value={form.status}
                onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as TaskStatus }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              >
                {COLUMNS.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABEL[status]}
                  </option>
                ))}
              </select>

              <select
                value={form.priority}
                onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value as TaskPriority }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              >
                {Object.values(TaskPriority).map((priority) => (
                  <option key={priority} value={priority}>
                    {PRIORITY_LABEL[priority]}
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={form.dueDate}
                onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              />

              <select
                value={form.assigneeId}
                onChange={(event) => setForm((prev) => ({ ...prev, assigneeId: event.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              >
                <option value="">Sorumlu seçilmedi</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>

              <div className="flex flex-wrap items-center gap-2 md:col-span-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-cyan-700 px-4 py-2 font-medium text-white transition hover:bg-cyan-800 disabled:opacity-60"
                >
                  {loading ? "Kaydediliyor..." : editingTaskId ? "Görevi Güncelle" : "Görev Ekle"}
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700"
                  onClick={closeTaskModal}
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
