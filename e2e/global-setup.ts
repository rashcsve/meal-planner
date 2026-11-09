import { spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

const e2eDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(e2eDir, "..");
const bin = (name: string) => path.join(root, "node_modules/.bin", name);

async function waitFor(url: string, child: ChildProcess) {
  for (let i = 0; i < 120; i++) {
    if (child.exitCode !== null) throw new Error(`${url}: server exited with ${child.exitCode}`);
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`${url}: not ready after 60s`);
}

function assertPortFree(port: number) {
  return new Promise<void>((resolve, reject) => {
    const probe = createServer()
      .once("error", () =>
        reject(new Error(`port ${port} is in use - stop whatever is listening on it`)),
      )
      .once("listening", () => probe.close(() => resolve()))
      .listen(port);
  });
}

function run(
  command: string,
  args: string[],
  options: { cwd: string; env: NodeJS.ProcessEnv },
  children: ChildProcess[],
  timeoutMs = 300_000,
) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { ...options, stdio: "inherit" });
    children.push(child);
    const timer = setTimeout(() => {
      reject(new Error(`${command} timed out after ${timeoutMs / 1000}s`));
      child.kill("SIGKILL");
    }, timeoutMs);
    child
      .once("error", (error) => {
        clearTimeout(timer);
        reject(error);
      })
      .once("exit", (code) => {
        clearTimeout(timer);
        if (code === 0) resolve();
        else reject(new Error(`${command} exited with ${code}`));
      });
  });
}

function stop(child: ChildProcess) {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  const exited = new Promise((resolve) => child.once("exit", resolve));
  const forceKill = setTimeout(() => child.kill("SIGKILL"), 5000);
  child.kill();
  return exited.finally(() => clearTimeout(forceKill));
}

export default async function globalSetup() {
  await assertPortFree(3100);
  await assertPortFree(5174);

  const children: ChildProcess[] = [];
  let webDist: string | undefined;
  const container = await new PostgreSqlContainer("postgres:17").start();
  const teardown = async () => {
    await Promise.all(children.map(stop));
    await container.stop();
    if (webDist) await rm(webDist, { recursive: true, force: true });
  };

  try {
    webDist = await mkdtemp(path.join(tmpdir(), "meal-planner-e2e-web-"));
    const databaseUrl = container.getConnectionUri();
    process.env.E2E_DATABASE_URL = databaseUrl;

    const pool = new Pool({ connectionString: databaseUrl });
    await migrate(drizzle(pool), { migrationsFolder: path.join(root, "api/drizzle") });
    await pool.end();

    const api = spawn(bin("tsx"), [path.join(root, "api/src/index.ts")], {
      cwd: e2eDir,
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        PORT: "3100",
        CORS_ORIGIN: "http://localhost:5174",
        LOG_LEVEL: "error",
      },
      stdio: "inherit",
    });
    children.push(api);
    const webDir = path.join(root, "web");
    const webEnv = {
      ...process.env,
      NODE_ENV: "production",
      VITE_API_URL: "http://localhost:3100",
    };
    const buildWeb = async (outDir: string) => {
      await run(
        path.join(webDir, "node_modules/.bin/tsc"),
        ["-b"],
        { cwd: webDir, env: webEnv },
        children,
      );
      await run(
        bin("vite"),
        ["build", "--outDir", outDir, "--emptyOutDir"],
        { cwd: webDir, env: webEnv },
        children,
      );
    };
    await Promise.all([waitFor("http://localhost:3100/health", api), buildWeb(webDist)]);

    const web = spawn(
      bin("vite"),
      ["preview", "--outDir", webDist, "--port", "5174", "--strictPort"],
      { cwd: webDir, env: webEnv, stdio: "inherit" },
    );
    children.push(web);
    await waitFor("http://localhost:5174/", web);
  } catch (error) {
    await teardown();
    throw error;
  }

  return teardown;
}
