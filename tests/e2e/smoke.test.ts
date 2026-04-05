import { beforeAll, describe, expect, it } from "vitest";

type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; details?: unknown } };

let baseUrl = "";

async function waitForServer(url: string, timeoutMs = 30000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const res = await fetch(`${url}/login`);
      if (res.ok) {
        return;
      }
    } catch {
      // ignore and retry
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error("Server did not start in time for e2e smoke test.");
}

function extractSessionCookie(response: Response) {
  const raw = response.headers.get("set-cookie");
  if (!raw) {
    return null;
  }

  return raw.split(";")[0];
}

beforeAll(async () => {
  const configuredBaseUrl = process.env.E2E_BASE_URL;

  if (!configuredBaseUrl) {
    throw new Error(
      "E2E_BASE_URL is required for smoke e2e tests. Start the app first (for example: npm run start -- --port 3210), then run with E2E_BASE_URL=http://127.0.0.1:3210.",
    );
  }

  baseUrl = configuredBaseUrl;
  await waitForServer(baseUrl);
});

describe("smoke e2e", () => {
  it("register/login and project-task lifecycle works", async () => {
    const suffix = Date.now();
    const email = `smoke.${suffix}@taskflow.local`;
    const password = "SmokePass123";

    const registerResponse = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Smoke User",
        email,
        password,
      }),
    });

    expect(registerResponse.status).toBe(201);
    const registerPayload = (await registerResponse.json()) as ApiResponse<{ user: { id: string } }>;
    expect(registerPayload.ok).toBe(true);

    const registerCookie = extractSessionCookie(registerResponse);
    expect(registerCookie).toBeTruthy();

    const logoutResponse = await fetch(`${baseUrl}/api/auth/logout`, {
      method: "POST",
      headers: { Cookie: registerCookie ?? "" },
    });
    expect(logoutResponse.status).toBe(200);

    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    expect(loginResponse.status).toBe(200);

    const sessionCookie = extractSessionCookie(loginResponse);
    expect(sessionCookie).toBeTruthy();

    const projectResponse = await fetch(`${baseUrl}/api/projects`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie ?? "",
      },
      body: JSON.stringify({ name: "Smoke Project" }),
    });

    expect(projectResponse.status).toBe(201);
    const projectPayload = (await projectResponse.json()) as ApiResponse<{ project: { id: string } }>;
    expect(projectPayload.ok).toBe(true);
    if (!projectPayload.ok) {
      throw new Error(projectPayload.error.message);
    }

    const projectId = projectPayload.data.project.id;

    const taskResponse = await fetch(`${baseUrl}/api/projects/${projectId}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie ?? "",
      },
      body: JSON.stringify({
        title: "Smoke Task",
        description: "End-to-end check",
        status: "TODO",
        priority: "HIGH",
      }),
    });

    expect(taskResponse.status).toBe(201);
    const taskPayload = (await taskResponse.json()) as ApiResponse<{ task: { id: string; status: string } }>;
    expect(taskPayload.ok).toBe(true);
    if (!taskPayload.ok) {
      throw new Error(taskPayload.error.message);
    }

    const taskId = taskPayload.data.task.id;

    const updateResponse = await fetch(`${baseUrl}/api/projects/${projectId}/tasks/${taskId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie ?? "",
      },
      body: JSON.stringify({ status: "IN_PROGRESS" }),
    });

    expect(updateResponse.status).toBe(200);
    const updatePayload = (await updateResponse.json()) as ApiResponse<{ task: { status: string } }>;
    expect(updatePayload.ok).toBe(true);
    if (!updatePayload.ok) {
      throw new Error(updatePayload.error.message);
    }

    expect(updatePayload.data.task.status).toBe("IN_PROGRESS");
  });
});
