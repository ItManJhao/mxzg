import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { JsonAsset, resources } from "cc";
import { GroupedConfig } from "../assets/scripts/config/GroupedConfig";
import { ConfigDb } from "../assets/scripts/config/ConfigLoader";
import { prepareStartupConfig, prepareCityConfig, prepareHeroConfig, remakeConfig, readCityGates, validateRemakeConfig } from "../assets/scripts/config/RemakeConfig";
import { loadBootCopy } from "../assets/scripts/ui/bootChrome";

async function main() {
  const calls: string[] = []; let fail = true;
  const isolated = new GroupedConfig(async path => {
    calls.push(path); if (path === "b" && fail) throw new Error("broken config"); return { rows: [] };
  }, (_path, value) => { assert(Array.isArray((value as any).rows)); });
  await assert.rejects(isolated.prepare(["a", "b"]), /broken config/);
  assert.equal(isolated.get("a"), undefined, "do not publish a partial group");
  await assert.rejects(isolated.read("a"), /尚未准备/);
  fail = false;
  await Promise.all([isolated.prepare(["a", "b"]), isolated.prepare(["a"])]);
  assert.deepEqual(calls.sort(), ["a", "b", "b"], "reuse successful/in-flight reads, retry failure");
  assert.deepEqual(await isolated.read("b"), { rows: [] });
  let valid = false;
  const malformed = new GroupedConfig(async () => valid ? { rows: [] } : {}, validateRemakeConfig);
  await assert.rejects(malformed.prepare(["config/language"]), /配置缺少/);
  assert.equal(malformed.get("config/language"), undefined);
  valid = true; await malformed.prepare(["config/language"]);

  let resolveLate!: (value: unknown) => void;
  const late = new Promise<unknown>(resolve => { resolveLate = resolve; });
  const racing = new GroupedConfig(path => path === "fail" ? Promise.reject(new Error("fail")) : late, () => {});
  let reports = 0;
  await assert.rejects(racing.prepare(["fail", "late"], () => { reports++; }), /fail/);
  const stopped = reports; resolveLate({ rows: [] });
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(reports, stopped, "failed groups ignore late progress callbacks");

  const requested: string[] = [];
  resources.load = (path: string, _type: unknown, done: Function) => {
    requested.push(path);
    const asset = new JsonAsset();
    asset.json = JSON.parse(readFileSync(`client/assets/resources/${path}.json`, "utf8"));
    done(null, asset);
  };
  const old = ConfigDb.current = new ConfigDb(); old.tableCount = 536;
  await prepareStartupConfig();
  assert.deepEqual(requested.sort(), ["config/language", "config/loadingtips"]);
  const copy = await loadBootCopy(<T>(path: string) => remakeConfig.read<T>(path));
  assert(copy.tips.length > 0); assert.equal(requested.length, 2, "loading copy reuses prepared values");
  assert.equal(readCityGates(), null, "city config is not eagerly loaded");
  await prepareCityConfig();
  assert.equal(requested.length, 7);
  assert(readCityGates()!.opencondition.length > 0);
  assert(!requested.includes("config/herotype"), "hero config is not a login/city requirement");
  await Promise.all([prepareHeroConfig(), prepareHeroConfig()]);
  assert.equal(requested.length, 9, "hero read group adds only herotype and item, with concurrent dedup");
  assert((await remakeConfig.read<any>("config/herotype")).rows.length > 0);
  assert.equal(ConfigDb.current, old); assert.equal(old.tableCount, 536, "legacy DB is never replaced by partial data");
  assert.throws(() => validateRemakeConfig("config/language", {}), /配置缺少/);
  assert.throws(() => validateRemakeConfig("config/maincity/createmaincitybtn", { act: [] }), /配置缺少/);
  const app = readFileSync("client/assets/scripts/app/remake/RemakeApp.ts", "utf8");
  assert(!app.includes("ConfigLoader.loadAll"));
  console.log("config-groups-check passed: atomic groups, failure retry, concurrent dedup, real 2+5+2 configs, copy reuse and legacy DB isolation");
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
