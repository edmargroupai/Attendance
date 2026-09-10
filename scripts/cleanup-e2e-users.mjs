#!/usr/bin/env node
// Deletes every auth.users row created by the E2E suite (tests/e2e/) -
// their email always matches e2e-*@example.com (see tests/e2e/helpers.ts).
// Supabase has no public self-delete endpoint, so cleanup goes through
// the CLI's Management-API-backed `db query`, the same mechanism used
// for manual gate testing throughout this project. Run after
// `npm run test:e2e`.
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "e2e-cleanup-"));
const sqlPath = join(dir, "cleanup.sql");
writeFileSync(sqlPath, "delete from auth.users where email like 'e2e-%@example.com';\n");

try {
  // shell:true is required on Windows to resolve npx.cmd; every argument
  // here is either a fixed literal or a path this script generated
  // itself (mkdtempSync), never external/user input, so the usual
  // shell-injection concern with shell:true doesn't apply.
  execFileSync(
    "npx",
    ["--yes", "supabase", "db", "query", "--linked", "--yes", "--file", sqlPath],
    { stdio: "inherit", shell: process.platform === "win32" },
  );
} finally {
  rmSync(dir, { recursive: true, force: true });
}
