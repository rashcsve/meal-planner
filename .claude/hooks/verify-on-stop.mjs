#!/usr/bin/env node
// Stop hook: when .ts/.tsx files changed, run scripts/verify.sh (typecheck + lint) before
// Claude ends its turn. On failure, block once and tell Claude to report the output and
// ask before fixing. Each distinct state of the code is checked once, pass or fail, so
// turns without code changes cost nothing. Tests are not run here (they need Docker).
import { execSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const git = (args) => execSync(`git ${args}`, { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const cacheFile = join(tmpdir(), `claude-verify-${createHash("sha1").update(root).digest("hex")}.txt`);

let input = {};
try {
  input = JSON.parse(readFileSync(0, "utf8"));
} catch {}
if (input.stop_hook_active) process.exit(0); // already continuing because of this hook

const changed = git("status --porcelain -- '*.ts' '*.tsx'").trim();
if (!changed) process.exit(0);

// Fingerprint the current code: tracked diffs plus untracked file contents.
const hash = createHash("sha1").update(git("diff HEAD -- '*.ts' '*.tsx'"));
for (const f of git("ls-files --others --exclude-standard -- '*.ts' '*.tsx'").split("\n").filter(Boolean))
  hash.update(f).update(readFileSync(join(root, f)));
const fingerprint = hash.digest("hex");

let last = "";
try {
  last = readFileSync(cacheFile, "utf8");
} catch {}
if (last === fingerprint) process.exit(0);
writeFileSync(cacheFile, fingerprint);

const run = spawnSync("bash", ["scripts/verify.sh"], { cwd: root, encoding: "utf8" });
if (run.status === 0) process.exit(0);

const output = `${run.stdout}${run.stderr}`.trim().split("\n").slice(-60).join("\n");
process.stdout.write(
  JSON.stringify({
    decision: "block",
    reason:
      "Verification failed: `bash scripts/verify.sh` (typecheck + lint) exited " +
      `${run.status}. Do not fix this on your own. Show the user the failing command and ` +
      "the relevant errors below, say which of your changes likely caused them, propose a " +
      `fix, and wait for their answer.\n\n${output}`,
  }),
);
