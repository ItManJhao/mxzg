/** JUnit 隔离服务端调用的客户端联调入口；先编译测试，再把随机端口和实例身份交给测试脚本核对。 */
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const esbuild = require("esbuild");
const root = path.resolve(__dirname, "../..");
const output = path.join(root, "client/temp/project-checks/game-socket-live.cjs");
esbuild.buildSync({ absWorkingDir: root, entryPoints: ["client/tools/game-socket-live-check.ts"], bundle: true,
  platform: "node", format: "cjs", tsconfig: "client/tools/tsconfig.check.json", outfile: output, logLevel: "silent" });
const result = spawnSync(process.execPath, [output, ...process.argv.slice(2)], { cwd: root, encoding: "utf8", timeout: 30000 });
process.stdout.write(result.stdout || "");
process.stderr.write(result.stderr || "");
if (result.error) console.error(result.error.message);
process.exitCode = result.status === 0 && !result.error ? 0 : 1;
