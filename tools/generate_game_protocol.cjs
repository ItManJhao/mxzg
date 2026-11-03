/**
 * 从 protocol/game.proto 生成可由 Creator 直接导入的静态 Protobuf 编解码及最小运行库。
 * 开发依赖通过 client/package-lock.json 锁定；--check 在内存重新生成并检查漂移，不写资源。
 */
const fs = require("node:fs"), path = require("node:path");
const root = path.resolve(__dirname, "..");
const pbjs = require(path.join(root, "client/node_modules/protobufjs-cli/pbjs"));
const esbuild = require(path.join(root, "client/node_modules/esbuild"));
/** 生成器只在构建时解析 .proto；运行时使用已生成静态代码，不加载协议文本或动态反射。 */
async function main() {
  const check = process.argv.includes("--check");
  if (process.argv.slice(2).some(arg => arg !== "--check")) throw new Error("只支持 --check");
  const source = await new Promise((resolve, reject) => pbjs.main([
    "-t", "static-module", "-w", "es6", "--no-service", "--no-delimited",
    path.join(root, "protocol/game.proto"),
  ], (error, output) => error ? reject(error) : resolve(output)));
  const built = await esbuild.build({
    stdin: { contents: source, resolveDir: path.join(root, "client"), sourcefile: "game-protocol.js" },
    bundle: true, platform: "browser", format: "esm", target: "es2017", write: false, legalComments: "inline",
  });
  const licenses = ["protobufjs/LICENSE", "@protobufjs/utf8/LICENSE", "long/LICENSE"].map(file =>
    fs.readFileSync(path.join(root, "client/node_modules", file), "utf8").replace(/\r\n/g, "\n").replace(/\*\//g, "* /")).join("\n\n");
  const content = "// @ts-nocheck\n/** 自动生成：protocol/game.proto；包含 protobuf.js 最小运行库与许可证，禁止手改。 */\n"
    + "/* Third-party licenses:\n" + licenses + "\n*/\n" + built.outputFiles[0].text;
  const target = path.join(root, "client/assets/scripts/platform/GameProtocol.generated.ts");
  if (check) {
    if (!fs.existsSync(target) || fs.readFileSync(target, "utf8").replace(/\r\n/g, "\n") !== content) throw new Error("Protobuf 生成文件漂移");
  } else fs.writeFileSync(target, content);
  console.log(check ? "PASS Protobuf generated code" : "Generated static Protobuf codec");
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
