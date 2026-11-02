/**
 * 从首批通信契约生成前后端 DTO，避免会话和升级请求字段分别手写。
 * 默认写入生成文件；--check 只检查漂移。此工具不提供运行时消息校验。
 */
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const schema = JSON.parse(fs.readFileSync(path.join(root, "protocol/session-contract.json"), "utf8"));
const identifier = /^[A-Za-z][A-Za-z0-9]*$/;
const types = { string: ["string", "String"], integer: ["number", "long"] };

/** 检查生成输入，拒绝未知类型或可能破坏源码的名称与注释。 */
function validate() {
  if (schema.version !== 1 || !schema.records || !Object.keys(schema.records).length) {
    throw new Error("不支持的契约版本或空记录");
  }
  for (const [name, record] of Object.entries(schema.records)) {
    if (!identifier.test(name) || typeof record.description !== "string" || /[\r\n]|\*\//.test(record.description)) {
      throw new Error(`无效记录定义：${name}`);
    }
    if (!record.fields || !Object.keys(record.fields).length) throw new Error(`记录缺少字段：${name}`);
    for (const [field, type] of Object.entries(record.fields)) {
      if (!identifier.test(field) || !Object.hasOwn(types, type)) throw new Error(`无效字段：${name}.${field}`);
    }
  }
}

/** 根据同一份字段定义输出 TypeScript 接口和 Java 不可变记录。 */
function generate() {
  const header = "/** 自动生成：会话试点 DTO；修改 protocol/session-contract.json 后重新生成。尚未接入网络。 */\n";
  let ts = header;
  let java = header + "package com.funsgamex.mxzg.protocol;\n\n/** 首批请求与会话数据类型；字段取值仍需接入层校验。 */\npublic final class SessionContract {\n    /** 禁止实例化类型容器。 */\n    private SessionContract() {}\n";
  for (const [name, record] of Object.entries(schema.records)) {
    ts += `\n/** ${record.description} */\nexport interface ${name} {\n`;
    const fields = Object.entries(record.fields);
    ts += fields.map(([key, type]) => `  readonly ${key}: ${types[type][0]};`).join("\n") + "\n}\n";
    java += `\n    /** ${record.description} */\n    public record ${name}(${fields.map(([key, type]) => `${types[type][1]} ${key}`).join(", ")}) {}\n`;
  }
  return new Map([
    ["client/assets/scripts/platform/SessionContract.generated.ts", ts],
    ["backend/src/main/java/com/funsgamex/mxzg/protocol/SessionContract.java", java + "}\n"],
  ]);
}

/** 写出派生文件或在只读模式检查，漂移时以失败状态阻止误用旧类型。 */
function main() {
  if (process.argv.slice(2).some(value => value !== "--check")) throw new Error("仅支持 --check 参数");
  validate();
  const check = process.argv.includes("--check");
  for (const [relative, content] of generate()) {
    const target = path.join(root, relative);
    if (check) {
      if (!fs.existsSync(target) || fs.readFileSync(target, "utf8").replace(/\r\n/g, "\n") !== content) {
        throw new Error(`生成文件已漂移：${relative}`);
      }
    } else {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, content);
    }
  }
  console.log(check ? "会话 DTO 漂移检查通过" : "会话 DTO 已生成");
}

main();
