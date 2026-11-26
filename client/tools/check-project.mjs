/** 本机统一检查入口：执行配置、资源、功能边界和文档检查；不启动 Creator、不连接玩家服务器。
 * 全套与单项报告分别保存，后续单项复查不会覆盖整轮汇总；日志用于定位当前对应检查的结果。
 */
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const output = resolve(root, "client/temp/project-checks");
const suites = [
  ["gm", "ts", "client/tools/gm-check.ts"],
  ["skill-audit-view", "ts", "client/tools/skill-audit-view-check.ts"],
  ["skill-replay-server", "node", "tools/test_skill_replay_server.cjs"],
  ["skill-audit", "node", "tools/check_skill_audit.cjs"],
  ["equipment-detail", "ts", "client/tools/equipment-detail-check.ts"],
  ["equipment-info-view", "ts", "client/tools/equipment-info-view-check.ts"],
  ["item-detail", "ts", "client/tools/item-detail-check.ts"],
  ["item-info-view", "ts", "client/tools/item-info-view-check.ts"],
  ["hero-piece-compose", "ts", "client/tools/hero-piece-compose-check.ts"],
  ["docs", "python", "tools/check_docs.py"],
  ["resource-catalog", "ts", "client/tools/resource-catalog-check.ts"],
  ["current-resource-scope", "node", "client/tools/current-resource-scope-check.cjs"],
  ["bundle-paths", "node", "tools/test_bundle_paths.cjs"],
  ["ui-atlas", "node", "client/tools/ui-atlas-check.cjs"],
  ["common-atlas", "node", "client/tools/common-atlas-check.cjs"],
  ["ui-static", "node", "client/tools/ui-static-migration-check.cjs"],
  ["resource-generated", "node", "tools/generate_resources.cjs", "--check"],
  ["config-generated", "python", "tools/generate_config.py", "--check"],
  ["client-config-scope", "python", "tools/test_client_config_scope.py"],
  ["prefab-review", "python", "tools/audit_prefabs.py", "--check"],
  ["prefab-fingerprints", "python", "tools/test_prefab_audit.py"],
  ["event-target", "ts", "client/tools/event-target-check.ts"],
  ["red-dot", "ts", "client/tools/red-dot-check.ts"],
  ["hero-red-dot", "ts", "client/tools/hero-red-dot-check.ts"],
  ["daily-dungeon-rules-generated", "python", "tools/export_daily_gold_rules.py"],
  ["dreamland-rules-generated", "python", "tools/export_dreamland_rules.py"],
  ["trial-rules-generated", "python", "tools/export_trial_rules.py", "--check"],
  ["rainbow-rules-generated", "python", "tools/export_rainbow_rules.py", "--check"],
  ["trial-controller", "ts", "client/tools/trial-controller-check.ts"],
  ["guild-technology-controller", "ts", "client/tools/guild-technology-controller-check.ts"],
  ["tower-rules-generated", "python", "tools/export_tower_rules.py"],
  ["arena-rules-generated", "python", "tools/export_arena_rules.py"],
  ["black-market-rules-generated", "python", "tools/export_black_market_rules.py"],
  ["dungeon-reminder", "ts", "client/tools/dungeon-reminder-check.ts"],
  ["dreamland-support", "ts", "client/tools/dreamland-support-check.ts"],
  ["game-protocol", "ts", "client/tools/game-protocol-check.ts"],
  ["black-market-controller", "ts", "client/tools/black-market-controller-check.ts"],
  ["smith-jewel", "ts", "client/tools/smith-jewel-check.ts"],
  ["smith-spirit-skills-generated", "python", "tools/export_smith_spirit_skills.py", "--check"],
  ["chat-controller", "ts", "client/tools/chat-controller-check.ts"],
  ["main-chapter-idle-protocol", "ts", "client/tools/main-chapter-idle-protocol-check.ts"],
  ["idle-claim-intent", "ts", "client/tools/idle-claim-intent-check.ts"],
  ["tavern-state", "ts", "client/tools/tavern-state-check.ts"],
  ["game-protocol-generated", "node", "tools/generate_game_protocol.cjs", "--check"],
  ["main-chapter", "ts", "client/tools/main-chapter-check.ts"],
  ["chapter-background", "ts", "client/tools/chapter-background-check.ts"],
  ["chapter-milestone", "ts", "client/tools/chapter-milestone-check.ts"],
  ["chapter-milestone-claim", "ts", "client/tools/chapter-milestone-claim-check.ts"],
  ["chapter-milestone-card", "ts", "client/tools/chapter-milestone-card-check.ts"],
  ["chapter-clear-reward", "ts", "client/tools/chapter-clear-reward-check.ts"],
  ["milestone-binding", "ts", "client/tools/milestone-binding-check.ts"],
  ["main-chapter-scope", "ts", "client/tools/main-chapter-scope-check.ts"],
  ["main-chapter-dependency-args", "node", "tools/test_main_chapter_dependency_snapshot.cjs"],
  ["main-chapter-settlement", "ts", "client/tools/main-chapter-settlement-check.ts"],
  ["main-chapter-entry-recovery", "ts", "client/tools/main-chapter-entry-recovery-check.ts"],
  ["idle-chest", "ts", "client/tools/idle-chest-check.ts"],
  ["idle-chest-presentation", "ts", "client/tools/idle-chest-presentation-check.ts"],
  ["reward-protocol", "ts", "client/tools/reward-protocol-check.ts"],
  ["role-upgrade-view", "ts", "client/tools/role-upgrade-view-check.ts"],
  ["hero-reward-view", "ts", "client/tools/hero-reward-view-check.ts"],
  ["hero-reward-pma", "ts", "client/tools/hero-reward-pma-check.ts"],
  ["role-upgrade-config", "python", "tools/export_role_upgrade_features.py", "--check"],
  ["role-upgrade-config-rules", "python", "tools/test_role_upgrade_features.py"],
  ["reward-controller", "ts", "client/tools/reward-controller-check.ts"],
  ["reward-binding", "ts", "client/tools/reward-binding-check.ts"],
  ["reward-view", "ts", "client/tools/reward-view-check.ts"],
  ["confirm-view", "ts", "client/tools/confirm-view-check.ts"],
  ["battle-presentation", "ts", "client/tools/battle-presentation-audit.ts"],
  ["battle-revival", "ts", "client/tools/battle-revival-check.ts"],
  ["battle-hunter-noah-actions", "ts", "client/tools/battle-hunter-noah-actions-check.ts"],
  ["battle-frost-winter-actions", "ts", "client/tools/battle-frost-winter-actions-check.ts"],
  ["battle-thorn-actions", "ts", "client/tools/battle-thorn-actions-check.ts"],
  ["battle-gold-dungeon-actions", "ts", "client/tools/battle-gold-dungeon-actions-check.ts"],
  ["battle-chapter10-20", "ts", "client/tools/battle-chapter10-20-check.ts"],
  ["battle-first-summon-actions", "ts", "client/tools/battle-first-summon-actions-check.ts"],
  ["battle-opening", "ts", "client/tools/battle-opening-check.ts"],
  ["skill-audit-preview", "ts", "client/tools/skill-audit-preview-check.ts"],
  ["battle-layout", "python", "tools/check_battle_prefab_layout.py"],
  ["battle-layout-rules", "python", "tools/test_battle_prefab_layout.py"],
  ["game-socket", "ts", "client/tools/session-state-check.ts"],
  ["account-operations", "ts", "client/tools/account-operations-check.ts"],
  ["isolated-build", "node", "client/tools/isolated-build-check.cjs"],
  ["build-entry", "node", "client/tools/build-entry-check.cjs"],
  ["hero-state", "ts", "client/tools/hero-state-check.ts"],
  ["first-summon", "ts", "client/tools/first-summon-check.ts"],
  ["normal-summon-pool", "python", "tools/export_normal_summon.py"],
  ["role-name-rules", "python", "tools/export_role_name_rules.py"],
  ["hero-level-quote", "ts", "client/tools/hero-level-quote-check.ts"],
  ["hero-level-recovery", "ts", "client/tools/hero-level-recovery-check.ts"],
  ["formation-state", "ts", "client/tools/formation-state-check.ts"],
  ["formation-recovery", "ts", "client/tools/formation-recovery-check.ts"],
  ["page-lifecycle-recovery", "ts", "client/tools/page-lifecycle-recovery-check.ts"],
  ["overlay-lifecycle", "ts", "client/tools/overlay-lifecycle-check.ts"],
  ["formation-view", "ts", "client/tools/formation-view-check.ts"],
  ["formation-matrix", "ts", "client/tools/formation-matrix-check.ts"],
  ["formation-element", "ts", "client/tools/formation-element-check.ts"],
  ["hero-growth-generated", "python", "tools/export_hero_growth.py"],
  ["hero-artifacts-generated", "python", "tools/export_hero_artifacts.py"],
  ["hero-jewels-generated", "python", "tools/export_hero_jewels.py"],
  ["god-equipment-rules-generated", "python", "tools/export_god_equipment_rules.py"],
  ["god-equipment-shop-generated", "python", "tools/export_god_equipment_shop.py"],
  ["guild-rules-generated", "python", "tools/export_guild_rules.py"],
  ["guild-technology-rules-generated", "python", "tools/export_guild_technology_rules.py", "--check"],
  ["guild-client", "ts", "client/tools/guild-client-check.ts"],
  ["vip-view", "ts", "client/tools/vip-view-check.ts"],
  ["idle-generated", "python", "tools/export_idle_rules.py"],
  ["idle-catalog", "python", "tools/test_idle_catalog.py"],
  ["campaign-rules", "python", "tools/export_campaign_rules.py"],
  ["remake-navigation", "ts", "client/tools/remake-navigation-check.ts"],
  ["feature-navigation", "ts", "client/tools/feature-navigation-check.ts"],
  ["login-presentation", "ts", "client/tools/login-presentation-check.ts"],
  ["home-presentation", "ts", "client/tools/home-presentation-check.ts"],
  ["startup", "ts", "client/tools/startup-check.ts"],
  ["staged-loading", "ts", "client/tools/staged-loading-check.ts"],
  ["resources", "ts", "client/tools/resource-pool-check.ts"],
  ["home-bundle", "ts", "client/tools/home-bundle-check.ts"],
  ["resource-audit", "python", "tools/test_resource_audit.py"],
  ["config-groups", "ts", "client/tools/config-groups-check.ts"],
  ["config-package-store", "ts", "client/tools/config-package-store-check.ts"],
  ["config-package-loading", "ts", "client/tools/config-package-loading-check.ts"],
  ["config-package", "node", "tools/test_config_package.cjs"],
  ["config-package-generated", "node", "tools/generate_config_package.cjs"],
  ["config-package-build", "node", "client/tools/config-package-build-check.test.cjs"],
  ["backend-launcher", "node", "tools/test_backend_launcher.cjs"],
  ["creator-compat", "node", "client/tools/creator-compat-check.cjs"],
  ["prefab-plan", "python", "tools/check_prefab_plan.py"],
  ["architecture", "python", "tools/project_audit.py"],
  ["bindings", "node", "client/tools/check-script-bindings.cjs"],
  ["backpack", "ts", "client/tools/backpack-view-check.ts"],
  ["modal-layer", "ts", "client/tools/modal-layer-check.ts"],
  ["viewport-scale", "ts", "client/tools/viewport-scale-check.ts"],
  ["super-scroll", "ts", "client/tools/super-scroll-check.ts"],
  ["hero-detail", "ts", "client/tools/hero-detail-check.ts"],
  ["hero-illustration", "ts", "client/tools/hero-illustration-check.ts"],
  ["hero-equipment", "ts", "client/tools/hero-equipment-check.ts"],
  ["hero", "ts", "client/tools/hero-view-check.ts"],
  ["city", "ts", "client/tools/city-view-check.ts"],
  ["battle", "ts", "client/tools/battle-view-check.ts"],
  ["shield-depleted", "ts", "client/tools/shield-depleted-check.ts"],
  ["retirement", "python", "tools/check_retirement.py"],
];
// 历史命令仍可单独调用，执行现行的对应专项；全套检查只遍历上面的有效入口。
const replacements = new Map([
  ["hero-roster", "hero-state"],
  ["formation", "formation-state"],
  ["remake-playable", "remake-navigation"],
  ["idle", "idle-chest"],
]);
const args = process.argv.slice(2);
if (args.includes("--help")) {
  console.log("node client/tools/check-project.mjs [--suite " + suites.map(([id]) => id).join("|") + "]");
  process.exit(0);
}
const suiteId = replacements.get(args[1]) ?? args[1];
if (args.length && (args.length !== 2 || args[0] !== "--suite" || !suites.some(([id]) => id === suiteId))) {
  console.error("Invalid arguments. Use --help.");
  process.exit(2);
}
if (suiteId !== args[1]) {
  console.log(`旧检查 ${args[1]} 已退役，执行当前专项 ${suiteId}。`);
}
const selected = args.length ? suites.filter(([id]) => id === suiteId) : suites;
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
for (const [id, kind, source, ...scriptArgs] of selected) {
  const started = Date.now();
  let result;
  try {
    let command, commandArgs;
    if (kind === "ts") {
      const outfile = resolve(output, id + ".cjs");
      await esbuild.build({ absWorkingDir: root, entryPoints: [source], bundle: true,
        platform: "node", format: "cjs", tsconfig: "client/tools/tsconfig.check.json", outfile,
        // 只有出场行为专项启用确定性Tween时钟；其他套件保持原cc替身的动画拒绝边界。
        plugins: id === "battle-opening" ? [{ name: "opening-clock", setup(build) {
          build.onResolve({ filter: /^cc$/ }, () => ({ path: resolve(root, "client/tools/OpeningClockRuntime.ts") }));
        } }] : [],
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
    // 父进程以 UTF-8 记录日志，Windows 上 Python 的管道输出也须使用同一编码。
    const run = spawnSync(command, [...commandArgs, ...scriptArgs], {
      cwd: root,
      env: kind === "python" ? { ...process.env, PYTHONIOENCODING: "utf-8" } : process.env,
      encoding: "utf8",
      timeout: 120000,
      maxBuffer: 16 * 1024 * 1024,
    });
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
// 全套汇总保留在results.json；单项检查有自己的报告，避免文档复查覆盖业务检查结果。
const reportFile = args.length ? `results.${args[1]}.json` : "results.json";
await writeFile(resolve(output, reportFile), JSON.stringify(results, null, 2) + "\n");
console.log(`${results.filter(r => r.passed).length}/${results.length} active suites passed. Logs: client/temp/project-checks/`);
process.exitCode = results.every(r => r.passed) ? 0 : 1;
