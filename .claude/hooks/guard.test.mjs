// Run: node --test .claude/hooks/guard.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { check } from "./guard.mjs";

const decision = (input, pending = () => []) => check(input, pending)?.hookSpecificOutput.permissionDecision ?? "allow";
const edit = (file_path, new_string) => ({ tool_name: "Edit", tool_input: { file_path, new_string } });
const write = (file_path, content) => ({ tool_name: "Write", tool_input: { file_path, content } });
const bash = (command) => ({ tool_name: "Bash", tool_input: { command } });

test("hex outside index.css is denied", () => {
  assert.equal(decision(edit("/p/web/src/features/week/Rail.tsx", 'style={{ color: "#D93A20" }}')), "deny");
  assert.equal(decision(write("/p/web/src/shared/ui/Tag.css", "color: #fff;")), "deny");
});

test("hex in index.css and outside web/src is allowed", () => {
  assert.equal(decision(edit("/p/web/src/index.css", "--color-promo: #D93A20;")), "allow");
  assert.equal(decision(edit("/p/api/src/services/plans.ts", "// see issue #123")), "allow");
});

test("top-level components/hooks/utils folders are denied", () => {
  for (const dir of ["components", "hooks", "utils"])
    assert.equal(decision(write(`/p/web/src/${dir}/X.tsx`, "export {}")), "deny");
  assert.equal(decision(write("/p/web/src/features/week/hooks/usePlan.ts", "export {}")), "allow");
});

test("spinners are denied", () => {
  assert.equal(decision(edit("/p/web/src/features/week/Rail.tsx", '<div className="animate-spin" />')), "deny");
  assert.equal(decision(edit("/p/web/src/features/week/Rail.tsx", "<Spinner />")), "deny");
  assert.equal(decision(edit("/p/web/src/features/week/Rail.tsx", "<Skeleton />")), "allow");
});

test("global stores are denied in installs and package.json", () => {
  assert.equal(decision(bash("npm install zustand -w web")), "deny");
  assert.equal(decision(bash("npm i @reduxjs/toolkit")), "deny");
  assert.equal(decision(edit("/p/web/package.json", '"zustand": "^5.0.0"')), "deny");
  assert.equal(decision(bash("npm install date-fns -w web")), "allow");
});

test("drizzle-kit push is denied", () => {
  assert.equal(decision(bash("npx drizzle-kit push")), "deny");
});

test("migrate asks when uncommitted migrations exist, otherwise allows", () => {
  assert.equal(decision(bash("npm run migrate"), () => ["api/drizzle/0023_x.sql"]), "ask");
  assert.equal(decision(bash("npm run migrate"), () => []), "allow");
});

test("ordinary commands and edits are allowed", () => {
  assert.equal(decision(bash("npm run typecheck")), "allow");
  assert.equal(decision(edit("/p/web/src/features/week/Rail.tsx", "const x = 1;")), "allow");
});
