/** Single local check entry point. Does not launch Creator or connect to a game server. */
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const output = resolve(root, "client/temp/project-checks");
const suites = [
  ["account", "ts", "client/tools/account-check.ts"],
  ["hero-roster", "ts", "client/tools/hero-roster-check.ts"],
  ["formation", "ts", "client/tools/formation-check.ts"],
  ["formation-view", "ts", "client/tools/formation-view-check.ts"],
  ["remake-playable", "ts", "client/tools/remake-playable-check.ts"],
  ["campaign-rules", "python", "tools/export_campaign_rules.py"],
  ["remake-navigation", "ts", "client/tools/remake-navigation-check.ts"],
  ["feature-navigation", "ts", "client/tools/feature-navigation-check.ts"],
  ["login-presentation", "ts", "client/tools/login-presentation-check.ts"],
  ["home-presentation", "ts", "client/tools/home-presentation-check.ts"],
  ["startup", "ts", "client/tools/startup-check.ts"],
  ["resources", "ts", "client/tools/resource-pool-check.ts"],
  ["home-bundle", "ts", "client/tools/home-bundle-check.ts"],
  ["resource-audit", "python", "tools/test_resource_audit.py"],
  ["config-groups", "ts", "client/tools/config-groups-check.ts"],
  ["creator-compat", "node", "client/tools/creator-compat-check.cjs"],
  ["prefab-plan", "python", "tools/check_prefab_plan.py"],
  ["architecture", "python", "tools/project_audit.py"],
  ["bindings", "python", "client/tools/check_script_type_ids.py"],
  ["backpack", "ts", "client/tools/backpack-view-check.ts"],
  ["bag-mvc", "ts", "client/tools/bag-mvc-check.ts"],
  ["bag-events", "ts", "client/tools/bag-events-check.ts"],
  ["super-scroll", "ts", "client/tools/super-scroll-check.ts"],
  ["hero", "ts", "client/tools/hero-view-check.ts"],
  ["city", "ts", "client/tools/city-view-check.ts"],
  ["battle", "ts", "client/tools/battle-view-check.ts"],
  ["legacy", "ts", "client/tools/skeleton-check.ts"],
];
const args = process.argv.slice(2);
if (args.includes("--help")) {
  console.log("node client/tools/check-project.mjs [--suite " + suites.map(([id]) => id).join("|") + "]");
  process.exit(0);
}
if (args.length && (args.length !== 2 || args[0] !== "--suite" || !suites.some(([id]) => id === args[1]))) {
  console.error("Invalid arguments. Use --help.");
  process.exit(2);
}
const selected = args.length ? suites.filter(([id]) => id === args[1]) : suites;
const require = createRequire(import.meta.url);
let esbuild;
if (selected.some(([, kind]) => kind === "ts")) {
  try {
    // Optional absolute module path supports offline environments without a package download.
    esbuild = require(process.env.MXZG_ESBUILD_MODULE || "esbuild");
  } catch {
    console.error("esbuild missing. Install client devDependencies, or set MXZG_ESBUILD_MODULE to an installed esbuild module.");
    process.exit(2);
  }
}
await mkdir(output, { recursive: true });
const results = [];
for (const [id, kind, source] of selected) {
  const started = Date.now();
  let result;
  try {
    let command, commandArgs;
    if (kind === "ts") {
      const outfile = resolve(output, id + ".cjs");
      await esbuild.build({ absWorkingDir: root, entryPoints: [source], bundle: true,
        platform: "node", format: "cjs", tsconfig: "client/tools/tsconfig.check.json", outfile,
        logLevel: "silent" });
      command = process.execPath;
      commandArgs = [outfile];
    } else if (kind === "node") {
      command = process.execPath;
      commandArgs = [source];
    } else {
      command = process.env.MXZG_PYTHON || "python";
      commandArgs = [source];
    }
    const run = spawnSync(command, commandArgs, { cwd: root, encoding: "utf8", timeout: 120000, maxBuffer: 16 * 1024 * 1024 });
    result = { id, passed: run.status === 0 && !run.error, output: (run.stdout || "") + (run.stderr || "") + (run.error ? String(run.error) : "") };
  } catch (error) {
    result = { id, passed: false, output: String(error.stack || error) };
  }
  result.elapsedMs = Date.now() - started;
  await writeFile(resolve(output, id + ".log"), result.output);
  console.log(`${result.passed ? "PASS" : "FAIL"} ${id} (${result.elapsedMs} ms)`);
  if (!result.passed) console.error(result.output.trim().split(/\r?\n/).slice(0, 7).join("\n"));
  results.push({ id, passed: result.passed, elapsedMs: result.elapsedMs, log: `client/temp/project-checks/${id}.log` });
}
await writeFile(resolve(output, "results.json"), JSON.stringify(results, null, 2) + "\n");
console.log(`${results.filter(r => r.passed).length}/${results.length} suites passed. Logs: client/temp/project-checks/`);
process.exitCode = results.every(r => r.passed) ? 0 : 1;
