#!/usr/bin/env node
// PreToolUse hook (Edit|Write|MultiEdit|Bash): blocks changes that break project rules,
// with a reason Claude sees and can relay. Fails open on malformed input: a broken hook
// must not stop all work, and CI still checks typecheck/lint/tests.
import { execSync } from "node:child_process";

const STORES = "zustand|redux|@reduxjs/toolkit|react-redux|jotai|mobx";
const HEX = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/;

export function check({ tool_name, tool_input = {} }, pendingMigrations = listPendingMigrations) {
  if (tool_name === "Bash") {
    const cmd = tool_input.command ?? "";
    if (new RegExp(`\\b(npm|pnpm|yarn)\\s+(i|install|add)\\b.*(${STORES})`).test(cmd))
      return deny("No global store (CLAUDE.md, Frontend): server state is a TanStack Query query, client state is useState/useReducer. Installing Zustand/Redux/Jotai/MobX is blocked.");
    if (/drizzle-kit\s+push/.test(cmd))
      return deny("`drizzle-kit push` changes the database without a migration file. Every schema change goes through `drizzle-kit generate`, a reviewed SQL file in git, then `npm run migrate`.");
    if (/drizzle-kit\s+migrate|npm\s+run\s+migrate/.test(cmd)) {
      const files = pendingMigrations();
      if (files.length)
        return ask(`This applies migrations not yet committed: ${files.join(", ")}. Read the SQL and confirm nothing destructive (DROP, column rename as drop+add) before approving.`);
    }
    return null;
  }

  const path = tool_input.file_path ?? "";
  const text = [tool_input.content, tool_input.new_string, ...(tool_input.edits ?? []).map((e) => e.new_string)]
    .filter(Boolean)
    .join("\n");

  if (/(^|\/)package\.json$/.test(path) && new RegExp(`"(${STORES})"`).test(text))
    return deny("No global store (CLAUDE.md, Frontend): adding Zustand/Redux/Jotai/MobX to package.json is blocked.");
  if (!/(^|\/)web\/src\//.test(path)) return null;
  if (/web\/src\/(components|hooks|utils)\//.test(path))
    return deny("Folders are by feature (CLAUDE.md, Frontend): no top-level components/, hooks/ or utils/. Put it in features/<name>/ or, if shared, in shared/.");
  if (!/web\/src\/index\.css$/.test(path) && HEX.test(text))
    return deny(`Hex colour ${text.match(HEX)[0]} outside web/src/index.css. Use a design token (CLAUDE.md, Design system: "No hex values outside index.css. Ever.").`);
  if (/animate-spin|\bSpinner\b/.test(text))
    return deny("No spinners (CLAUDE.md, Design system): use a Skeleton that matches the real layout.");
  return null;
}

function listPendingMigrations() {
  try {
    return execSync("git status --porcelain -- api/drizzle", { encoding: "utf8" })
      .split("\n")
      .filter((l) => l.endsWith(".sql"))
      .map((l) => l.slice(3));
  } catch {
    return [];
  }
}

const decide = (permissionDecision, reason) => ({
  hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision, permissionDecisionReason: reason },
});
const deny = (reason) => decide("deny", reason);
const ask = (reason) => decide("ask", reason);

if (import.meta.url === `file://${process.argv[1]}`) {
  let raw = "";
  process.stdin.on("data", (c) => (raw += c));
  process.stdin.on("end", () => {
    try {
      const result = check(JSON.parse(raw));
      if (result) process.stdout.write(JSON.stringify(result));
    } catch {
      // fail open
    }
  });
}
