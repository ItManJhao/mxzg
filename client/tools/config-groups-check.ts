/** 配置生成契约与运行时验证：原子分组、失败恢复、版本隔离、只读与实际显示。 */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { JsonAsset, resources } from "cc";
import { GameConfig, ConfigUnavailable, ConfigRowMissing, ConfigVersionSuperseded } from "../assets/scripts/config/GameConfig";
import { GConfig } from "../assets/scripts/config/GConfig";
import { RemakeConfigUtils } from "../assets/scripts/config/RemakeConfigUtils";
import { LOADING_PLAN } from "../assets/scripts/app/remake/LoadingPlan";
import { BootChrome } from "../assets/scripts/app/remake/BootChrome";
import { ConfigFixtureUtils } from "./ConfigFixtureUtils";

/** 离线加载实际配置文件，schema仍保留config开头的Bundle逻辑键。 */
const { resolveBundleFile } = require(process.cwd() + "/tools/bundle-paths.cjs");

/** 验证所有异常与成功边界，不借助旧配置仓库或放宽实际数据校验。 */
async function main(): Promise<void> {
  const calls: string[] = []; let fail = true;
  const isolated = new GameConfig(async path => {
    calls.push(path); if (path === "config/loadingtips" && fail) throw new Error("broken config"); return { rows: [] };
  });
  assert.equal(isolated.status(GConfig.Language).state, "unloaded");
  assert.throws(() => isolated.getConfig(GConfig.Language), ConfigUnavailable);
  await assert.rejects(isolated.prepare([GConfig.Language, GConfig.LoadingTips]), /broken config/);
  assert.throws(() => isolated.getConfig(GConfig.Language), ConfigUnavailable, "失败组不能部分提交");
  assert.equal(isolated.status(GConfig.LoadingTips).state, "failed");
  fail = false;
  await Promise.all([isolated.prepare([GConfig.Language, GConfig.LoadingTips]), isolated.prepare([GConfig.Language])]);
  assert.deepEqual(calls.sort(), ["config/language", "config/loadingtips", "config/loadingtips"], "成功请求复用，失败请求重试");
  assert.equal(isolated.status(GConfig.Language).state, "ready");
  assert.equal(isolated.getConfig(GConfig.Language).length, 0, "空表明确为已加载");
  assert.equal(isolated.getConfig(GConfig.Language, 1), undefined);
  assert.throws(() => isolated.requireConfig(GConfig.Language, 1), ConfigRowMissing);
  assert.equal(isolated.getConfig(GConfig.Language), isolated.getConfig(GConfig.Language), "整表不重复复制");
  let bad = true;
  const checked = new GameConfig(async () => ({ rows: [{ idx: 1, tips: bad ? {} : 3701 }] }));
  await assert.rejects(checked.prepare([GConfig.LoadingTips]), /LoadingTips.rows\[0\].tips/);
  bad = false; await checked.prepare([GConfig.LoadingTips]);
  const old = checked.getConfig(GConfig.LoadingTips);
  assert(Object.isFrozen(old) && Object.isFrozen(old[0]));
  bad = true; await assert.rejects(checked.prepare([GConfig.LoadingTips], undefined, "v2"));
  assert.equal(checked.getConfig(GConfig.LoadingTips), old, "版本加载失败保留原有效配置");
  bad = false; await checked.prepare([GConfig.LoadingTips], undefined, "v2");
  assert.equal(checked.status(GConfig.LoadingTips).version, "v2");
  let resolveLate!: (value: unknown) => void;
  const late = new Promise<unknown>(resolve => { resolveLate = resolve; });
  const racing = new GameConfig((_path, version) => version === "old" ? late : Promise.resolve({ rows: [{ idx: 2, tips: 2 }] }));
  const oldRequest = racing.prepare([GConfig.LoadingTips], undefined, "old");
  const rejected = assert.rejects(oldRequest, ConfigVersionSuperseded);
  await racing.prepare([GConfig.LoadingTips], undefined, "new");
  resolveLate({ rows: [{ idx: 1, tips: 1 }] }); await rejected;
  assert.equal(racing.getConfig(GConfig.LoadingTips, 1), undefined);
  assert.equal(racing.requireConfig(GConfig.LoadingTips, 2).tips, 2);
  let reports = 0, finish!: (value: unknown) => void;
  const pending = new Promise<unknown>(resolve => { finish = resolve; });
  const failedGroup = new GameConfig(path => path.endsWith("language") ? Promise.reject(new Error("fail")) : pending);
  await assert.rejects(failedGroup.prepare([GConfig.Language, GConfig.LoadingTips], () => reports++));
  const stopped = reports; finish({ rows: [] }); await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(reports, stopped, "失败后迟到进度停止");
  const requested: string[] = [];
  resources.load = (path: string, _type: unknown, done: Function) => {
    requested.push(path); const asset = new JsonAsset();
    asset.json = JSON.parse(readFileSync(resolveBundleFile(path + ".json"), "utf8")); done(null, asset);
  };
  const loginConfigs = LOADING_PLAN.login.flatMap(target => "config" in target ? [target.config] : []);
  RemakeConfigUtils.initialize();
  await GameConfig.instance.prepare(loginConfigs);
  assert.deepEqual(requested.sort(), ["config/language", "config/loadingtips"]);
  assert((await BootChrome.readLoadingTips()).length > 0); assert.equal(requested.length, 2);
  assert.equal(RemakeConfigUtils.readCityGates(), null);
  await ConfigFixtureUtils.installReal();
  assert.equal(requested.length, loginConfigs.length, "游戏配置统一安装，不恢复模块级逐张JSON加载");
  assert(RemakeConfigUtils.readCityGates()!.opencondition.length > 0);
  const welfare = GameConfig.instance.requireConfig(GConfig.OpenCondition, "act_recharge_day_reward");
  const accumulated = GameConfig.instance.requireConfig(GConfig.OpenCondition, "act_recharge_accumulated_days");
  assert.equal(welfare.level, 6); assert.equal(accumulated.level, 13);
  const duplicate = new GameConfig(async () => ({ rows: [welfare, welfare] }));
  await assert.rejects(duplicate.prepare([GConfig.OpenCondition]), /重复主键/);
  assert.throws(() => duplicate.getConfig(GConfig.OpenCondition), ConfigUnavailable, "重复键整组不能提交");
  assert(GameConfig.instance.getConfig(GConfig.HeroType).length > 0);
  assert.equal(GameConfig.instance.requireConfig(GConfig.Language, 11).value, "确 定", "数字文本主键统一索引");
  assert.equal(GameConfig.instance.requireConfig(GConfig.TimeLimitItem,902025).valid_time,7);
  assert.equal(GameConfig.instance.getConfig(GConfig.TimeLimitItem).length,3);
  const spirit=GameConfig.instance.requireConfig(GConfig.SpiritDisplay,2000002);
  assert(spirit.abilities.length>0&&spirit.skills.length>0,"精灵文案来自统一安装后的唯一配置仓库");
  assert(Object.isFrozen(spirit.abilities)&&Object.isFrozen(spirit.skills[0]),"精灵嵌套显示配置同样冻结");
  const brokenSpirit=new GameConfig(async()=>({schema:1,rows:[{...spirit,skills:[{skillId:1,level:1,name:"缺少说明"}]}]}));
  await assert.rejects(brokenSpirit.prepare([GConfig.SpiritDisplay]),/SpiritDisplay.rows\[0\].skills\[0\]/);
  assert.equal(brokenSpirit.status(GConfig.SpiritDisplay).state,"failed");
  console.log("config-groups-check passed");
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
