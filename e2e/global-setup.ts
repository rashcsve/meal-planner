import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
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
  const container = await new PostgreSqlContainer("postgres:17").start();
  const teardown = async () => {
    await Promise.all(children.map(stop));
    await container.stop();
  };

  try {
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
    const web = spawn(bin("vite"), ["--port", "5174", "--strictPort"], {
      cwd: path.join(root, "web"),
      env: { ...process.env, VITE_API_URL: "http://localhost:3100" },
      stdio: "inherit",
    });
    children.push(web);

    await waitFor("http://localhost:3100/health", api);
    await waitFor("http://localhost:5174/", web);
  } catch (error) {
    await teardown();
    throw error;
  }

  return teardown;
}
