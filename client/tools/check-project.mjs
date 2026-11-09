/** 本机统一检查入口：执行配置、资源、功能边界和文档检查；不启动 Creator、不连接玩家服务器。 */
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const output = resolve(root, "client/temp/project-checks");
const suites = [
  ["gm", "ts", "client/tools/gm-check.ts"],
  ["docs", "python", "tools/check_docs.py"],
  ["resource-catalog", "ts", "client/tools/resource-catalog-check.ts"],
  ["resource-generated", "node", "tools/generate_resources.cjs"],
  ["config-generated", "python", "tools/generate_config.py"],
  ["prefab-review", "python", "tools/audit_prefabs.py"],
  ["event-target", "ts", "client/tools/event-target-check.ts"],
  ["game-protocol", "ts", "client/tools/game-protocol-check.ts"],
  ["game-protocol-generated", "node", "tools/generate_game_protocol.cjs"],
  ["main-chapter", "ts", "client/tools/main-chapter-check.ts"],
  ["game-socket", "ts", "client/tools/session-state-check.ts"],
  ["hero-roster", "paused", null],
  ["hero-state", "ts", "client/tools/hero-state-check.ts"],
  ["hero-level", "paused", null],
  ["formation", "paused", null],
  ["formation-state", "ts", "client/tools/formation-state-check.ts"],
  ["formation-view", "ts", "client/tools/formation-view-check.ts"],
  ["remake-playable", "paused", null],
  ["hero-growth-generated", "python", "tools/export_hero_growth.py"],
  ["idle-generated", "python", "tools/export_idle_rules.py"],
  ["idle", "paused", null],
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
  ["backend-launcher", "node", "tools/test_backend_launcher.cjs"],
  ["creator-compat", "node", "client/tools/creator-compat-check.cjs"],
  ["prefab-plan", "python", "tools/check_prefab_plan.py"],
  ["architecture", "python", "tools/project_audit.py"],
  ["bindings", "node", "client/tools/check-script-bindings.cjs"],
  ["backpack", "ts", "client/tools/backpack-view-check.ts"],
  ["super-scroll", "ts", "client/tools/super-scroll-check.ts"],
  ["hero-detail", "ts", "client/tools/hero-detail-check.ts"],
  ["hero-equipment", "ts", "client/tools/hero-equipment-check.ts"],
  ["hero", "ts", "client/tools/hero-view-check.ts"],
  ["city", "ts", "client/tools/city-view-check.ts"],
  ["battle", "ts", "client/tools/battle-view-check.ts"],
  ["retirement", "python", "tools/check_retirement.py"],
];
const pausedSuites=new Set(["hero-roster","hero-level","formation","remake-playable","idle"]);
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
  if(pausedSuites.has(id)){console.log("PAUSED "+id+"：模块等待重做，旧业务 HTTP 已删除；领域测试仍在后端执行");results.push({id,paused:true,passed:null});continue;}
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
    if (["resource-generated", "config-generated", "prefab-review", "game-protocol-generated"].includes(id)) commandArgs.push("--check");
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
console.log(`${results.filter(r => r.passed).length}/${results.filter(r=>!r.paused).length} active suites passed. Logs: client/temp/project-checks/`);
process.exitCode = results.every(r => r.paused || r.passed) ? 0 : 1;
