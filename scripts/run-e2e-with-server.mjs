import { spawn } from "node:child_process";

const PORT = process.env.E2E_PORT || "3210";
const BASE_URL = process.env.E2E_BASE_URL || `http://127.0.0.1:${PORT}`;

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: false,
      ...options,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Command failed: ${command} ${args.join(" ")} (exit ${code ?? "null"})`));
    });
  });
}

function runNpm(scriptName, options = {}) {
  if (process.platform === "win32") {
    return run("cmd", ["/c", `npm run ${scriptName}`], options);
  }

  return run("npm", ["run", scriptName], options);
}

async function isServerReachable(url) {
  try {
    const response = await fetch(`${url}/login`);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer(url, timeoutMs = 30000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${url}/login`);
      if (response.ok) {
        return;
      }
    } catch {
      // retry
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Server did not become ready within ${timeoutMs}ms at ${url}.`);
}

function spawnServer() {
  if (process.platform === "win32") {
    return spawn("cmd", ["/c", `npm run start -- --port ${PORT}`], {
      stdio: "inherit",
    });
  }

  return spawn("npm", ["run", "start", "--", "--port", PORT], {
    stdio: "inherit",
  });
}

async function stopServer(serverProcess) {
  if (!serverProcess || serverProcess.killed) {
    return;
  }

  if (process.platform === "win32") {
    await new Promise((resolve) => {
      const killer = spawn("taskkill", ["/PID", String(serverProcess.pid), "/T", "/F"], {
        stdio: "ignore",
      });
      killer.on("exit", () => resolve());
      killer.on("error", () => resolve());
    });
    return;
  }

  serverProcess.kill("SIGTERM");
}

async function main() {
  if (await isServerReachable(BASE_URL)) {
    throw new Error(`Port already in use at ${BASE_URL}. Stop the running server and retry test:e2e:with-server.`);
  }

  await runNpm("build");

  const serverProcess = spawnServer();

  try {
    await waitForServer(BASE_URL);

    if (process.platform === "win32") {
      await run("cmd", ["/c", `set E2E_BASE_URL=${BASE_URL}&& npm run test:e2e`]);
    } else {
      await runNpm("test:e2e", {
        env: { ...process.env, E2E_BASE_URL: BASE_URL },
      });
    }
  } finally {
    await stopServer(serverProcess);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
