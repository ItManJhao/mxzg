/**
 * 第10～20关客户端通用表现专项：从真实关卡/技能与旧Lua逐项核对，不把静态guard通过当旧覆盖完整。
 * 检查原帧身份/音频、负锚点、格挡耗尽命中依赖、深睡wake白名单及取消；不构建、不联网或发奖。
 * 可重复传--java=<原BattleReplay>核本轮后端真实PB，不以测试夹具替代真实战斗或Creator画面。
 */
import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { BattleAttackUtils } from "../assets/scripts/features/battle/utils/BattleAttackUtils";
import { BattleReplayUtils } from "../assets/scripts/features/battle/utils/BattleReplayUtils";
import { BattleReplayPlayer } from "../assets/scripts/features/battle/BattleReplayPlayer";
import { mxzg } from "../assets/scripts/platform/GameProtocol.generated";

/** 测试从源目录读取真实输入，运行时继续用已有GameConfig和Bundle资源池。 */
const { resolveBundleFile } = require(process.cwd() + "/tools/bundle-paths.cjs");
/** 原配置表只用于测试比较，不建立运行时加载清单。 */
const buffs: any[] = JSON.parse(readFileSync(resolveBundleFile("config/buff.json"), "utf8")).rows;
/** 前批完整源映射用于限定11关的既有模板/技能，不在本专项重新扫描850关。 */
const report = JSON.parse(readFileSync("docs/validation/main-chapter-dependencies-20261117-stage9.json", "utf8"));
/** 真正旧覆盖源码，只解析表数据，不执行Lua或字符串代码。 */
const oldActions = readFileSync("G:/work/FsGame/Demo/mj/program/client/cocos_mxzg/client/idle/src/battle/actions.lua", "utf8");

/** 读取一份旧简单Lua表，遇到不支持的非数据表达式直接失败。 */
function luaTable(text: string): any {
    const tokens = text.match(/--[^\n]*|'[^']*'|"[^"]*"|[A-Za-z_]\w*|-?\d+(?:\.\d+)?|[{}=,]/g)!
        .filter(value => !value.startsWith("--"));
    let cursor = 0;
    /** 递归读取原数组或字段，不使用eval处理外部源码。 */
    const take = (): any => {
        const token = tokens[cursor++];
        if (token !== "{") {
            if (token.startsWith("'") || token.startsWith('"')) return token.slice(1, -1);
            assert(/^-?\d+(\.\d+)?$/.test(token), "旧覆盖不是简单数据：" + token);
            return Number(token);
        }
        const rows: any[] = [];
        const fields: Record<string, any> = {};
        while (tokens[cursor] !== "}") {
            if (tokens[cursor + 1] === "=") {
                const key = tokens[cursor];
                cursor += 2;
                fields[key] = take();
            } else {
                rows.push(take());
            }
            if (tokens[cursor] === ",") cursor++;
        }
        cursor++;
        assert(!rows.length || !Object.keys(fields).length);
        return rows.length ? rows : fields;
    };
    return take();
}

/** 原动作必须存在，不能拿当前JSON来代替缺失的旧覆盖依据。 */
function legacy(id: number): any[] {
    const indexes = Array.from(oldActions.matchAll(/\[(\d+)\]\s*=/g));
    const index = indexes.findIndex(value => Number(value[1]) === id);
    assert(index >= 0, "缺旧G_BATTLE_ACTIONS：" + id);
    return luaTable(oldActions.slice(indexes[index].index! + indexes[index][0].length,
        indexes[index + 1]?.index || oldActions.length));
}

/** 返回真正配置行，测试缺配置即失败。 */
function row(id: number): any {
    const value = buffs.find(entry => entry.idx === id);
    assert(value, "缺真实Buff：" + id);
    return value;
}

/** 覆盖12模板24技能全部原表现，包含旧静态ready中遗漏的独立子动作。 */
function actions(): Set<string> {
    const stages = report.stages.filter((stage: any) => stage.index >= 10 && stage.index <= 20);
    const skills = new Set<string>(stages.flatMap((stage: any) => stage.enemies.flatMap((enemy: any) => enemy.skills)));
    assert.equal(skills.size, 24);
    const ids = new Set<number>(Array.from(skills).flatMap(key => report.skillCatalog[key].buffs
        .filter((buff: any) => buff.type > 0 && buff.type <= 11).map((buff: any) => buff.idx)));
    const paths = new Set<string>();
    const before = JSON.stringify(buffs);
    for (const id of ids) {
        const source = legacy(id);
        const actual = BattleAttackUtils.legacyActions(row(id));
        assert.equal(actual.length, source.length, "遗漏旧覆盖子动作：" + id);
        actual.forEach((action, index) => {
            const expected = source[index];
            const base = { ...expected.ani_base };
            // 两条旧工厂均不读取delay_time；原声明仍有证据，不加入演员等待。
            delete base.delay_time;
            assert.deepEqual([action.type, action.delay, action.dimly], [expected.type, expected.delay, expected.dimly]);
            assert.deepEqual(JSON.parse(action.ani_base), base, "旧参数不等价：" + id + "/" + index);
            assert.deepEqual(JSON.parse(action.sound), Array.isArray(expected.sound) ? expected.sound : []);
            const files = [2, 11].includes(expected.type) || !base.format ? []
                : expected.file.length ? expected.file : [base.format.replace("/%d.png", "")];
            assert.deepEqual(JSON.parse(action.file), files, "file预载与实际format语义不符：" + id);
            const plan = BattleAttackUtils.plan(action);
            for (const path of plan.effect?.paths || []) paths.add(path);
            for (const actor of stages.flatMap((stage: any) => stage.enemies).filter((enemy: any) =>
                enemy.skills.some((key: string) => report.skillCatalog[key].buffs.some((buff: any) => buff.idx === id)))) {
                if (plan.effectOnly) continue;
                const skeleton = JSON.parse(readFileSync(resolveBundleFile("spine/" + actor.templateId + ".json"), "utf8"));
                assert(skeleton.animations[plan.action], actor.templateId + "缺原骨骼动作：" + plan.action);
            }
        });
    }
    const negative = BattleAttackUtils.legacyActions(row(1081101))[2];
    assert(Math.abs(BattleAttackUtils.plan(negative).effect!.anchorY - (-0.17)) < 1e-12);
    assert.throws(() => BattleAttackUtils.plan(row(4010100)), /未支持参数/,
        "未经旧覆盖的未知参数不能被直接guard放行");
    const ranged = BattleAttackUtils.plan(BattleAttackUtils.legacyActions(row(4010100))[0]);
    assert(Math.abs(ranged.attackSeconds + ranged.actionSeconds - 0.6) < 1e-12);
    assert.equal(JSON.stringify(buffs), before, "显示工具不能修改配置源或原事件ID");
    for (const type of [1001, 234] as const) {
        for (const path of BattleAttackUtils.roundEffect(type).paths) paths.add(path);
    }
    return paths;
}

/** 对照永久源证据核当前字节与meta身份；派生UV允许Creator重导，画布/锚点/九宫格不变。 */
function assets(paths: Set<string>): void {
    const evidence = JSON.parse(readFileSync("docs/validation/chapter-stage10-20-assets-20261117.json", "utf8"));
    assert.equal(paths.size, 287);
    assert.equal(evidence.result.frames, paths.size);
    assert.equal(evidence.result.restoredFrames, 219);
    assert.equal(evidence.result.newFrames, 0, "18控制帧沿原skill-effect目录和UUID，不造副本");
    for (const path of paths) {
        const file = resolveBundleFile(path.replace("/spriteFrame", ".png"));
        const source = evidence.files.find((entry: any) => file.replace(/\\/g, "/").endsWith(entry.path));
        assert(source, "缺原帧证据：" + path);
        assert.equal(createHash("sha256").update(readFileSync(file)).digest("hex"), source.afterSha256);
        const meta = JSON.parse(readFileSync(file + ".meta", "utf8"));
        assert.equal(meta.uuid, source.preservedIdentity.image);
        for (const [key, uuid] of Object.entries(source.preservedIdentity.subMetas)) assert.equal(meta.subMetas[key].uuid, uuid);
        for (const [key, fields] of Object.entries(source.preservedGeometry)) {
            for (const [field, value] of Object.entries(fields as Record<string, unknown>)) assert.equal(meta.subMetas[key].userData[field], value);
        }
    }
    for (const source of evidence.audio) {
        assert.deepEqual(readFileSync(source.path), readFileSync(source.legacyPath));
    }
}

/** 两单位PB只用于区分格挡0伤害与随后致死；不代表旧技能数值或角色准备。 */
function parryFixture(): any {
    return { schemaVersion: 1, scenario: "audit:lineup:10", rounds: 1, outcome: "ATTACKER_WIN",
        units: [
            { unitId: 2, faction: 1, templateId: 10101001, level: 1, position: 2, initialHp: 100, maxHp: 100, finalHp: 100 },
            { unitId: 10, faction: 2, templateId: 10101001, level: 1, position: 2, initialHp: 100, maxHp: 100, finalHp: 0 },
        ], phases: [{ round: 1, sourceId: 0, events: [] }, { round: 1, sourceId: 10, events: [
            { kind: "skill.begin", sourceId: 10, targetId: 10, configId: 102050141, skillLevel: 1, skillType: 1 },
            { kind: "buff.upsert", sourceId: 10, targetId: 10, configId: 2141401, buffInstanceId: "9007199254740993", expiresAtRound: 2, buffValue: 1 },
            { kind: "skill.end", sourceId: 10, targetId: 10, configId: 102050141, skillLevel: 1, skillType: 1 },
        ] }, { round: 1, sourceId: 2, events: [
            { kind: "skill.begin", sourceId: 2, targetId: 10, configId: 101010010, skillLevel: 0, skillType: 2 },
            { kind: "buff.remove", sourceId: 10, targetId: 10, configId: 2141401, buffInstanceId: "9007199254740993", expiresAtRound: 2, buffValue: 1, removalReason: "trigger-limit" },
            { kind: "damage", sourceId: 2, targetId: 10, configId: 1010200, actualHpChange: 0, reportedHpChange: 0, dead: false },
            { kind: "damage", sourceId: 2, targetId: 10, configId: 1010200, actualHpChange: -100, reportedHpChange: -100, dead: true },
            { kind: "skill.end", sourceId: 2, targetId: 10, configId: 101010010, skillLevel: 0, skillType: 2 },
        ] }] };
}

/** 始终经过生成的PB编码器和整包校验，不用JSON装作网络输入。 */
function encode(value: any): Uint8Array {
    return mxzg.game.BattleReplay.encode(mxzg.game.BattleReplay.fromObject(value)).finish();
}

/** 格挡帧必须等0伤害命中完成后撤；关闭不能迟到撤图/重施，无后续命中明确拒绝。 */
async function player(): Promise<void> {
    const bytes = encode(parryFixture());
    assert.equal(BattleReplayUtils.decode(bytes).find(step => step.removalReason)?.buffInstanceId, "9007199254740993");
    for (const cancel of [false, true]) {
        let finish!: () => void;
        const hit = new Promise<void>(resolve => { finish = resolve; });
        const shown: string[] = [];
        const player = new BattleReplayPlayer({
            waitForFollowingHit: step => step.removalReason === "trigger-limit" && row(step.configId).type === 234,
            play: async step => {
                if (step.kind === "damage" && step.actualHpChange === 0) {
                    shown.push("hit.begin");
                    await hit;
                    shown.push("hit.end");
                }
                if (step.kind === "buff.remove") shown.push("remove");
            },
            stop: () => finish(),
        });
        const result = player.play(bytes);
        for (let index = 0; index < 30 && !shown.includes("hit.begin"); index++) await Promise.resolve();
        assert(shown.includes("hit.begin"));
        assert(!shown.includes("remove"));
        if (cancel) player.stop();
        else finish();
        assert.equal(await result, !cancel);
        assert.equal(shown.includes("remove"), !cancel);
        if (!cancel) assert(shown.indexOf("remove") > shown.indexOf("hit.end"));
    }
    const invalid = parryFixture();
    const effects = invalid.phases[2].events;
    const removal = effects.splice(1, 1)[0];
    effects.splice(effects.length - 1, 0, removal);
    const missing = new BattleReplayPlayer({ play: async () => {}, stop: () => {}, waitForFollowingHit: () => true });
    await assert.rejects(missing.play(encode(invalid)), /缺少对应命中/);
    const wake = parryFixture();
    for (const phase of wake.phases) for (const event of phase.events) if (event.buffInstanceId) event.configId = 2141301;
    const wakeEvents = wake.phases[2].events;
    const wakeRemoval = wakeEvents.splice(1, 1)[0];
    wakeRemoval.removalReason = "wake";
    wakeEvents.splice(2, 0, wakeRemoval);
    assert(BattleReplayUtils.decode(encode(wake)).some(step => step.removalReason === "wake"));
    wakeRemoval.removalReason = "wake-unknown";
    assert.throws(() => BattleReplayUtils.decode(encode(wake)), /移除原因无效/);
}

/** 零持续时间属性也有真实实例，恰好下一回合前过期合法；早删、篡期限和跨回合滞留仍拒绝。 */
function immediateAttributeExpiry(): void {
    const source = parryFixture();
    source.rounds = 2;
    const original = source.phases[1].events[1];
    original.configId = 1081301;
    original.expiresAtRound = 1;
    const removal = { ...original, kind: "buff.remove", removalReason: "expire" };
    source.phases.splice(2, 0, { round: 2, sourceId: 0, events: [removal] });
    source.phases[3].round = 2;
    source.phases[3].events.splice(1, 1);
    const accepted = BattleReplayUtils.decode(encode(source));
    assert(accepted.some(step => step.configId === 1081301 && step.kind === "buff.remove"
        && step.round === 2 && step.expiresAtRound === 1));
    const late = JSON.parse(JSON.stringify(source));
    late.rounds = 3;
    late.phases.splice(2, 0, { round: 2, sourceId: 0, events: [] });
    late.phases[3].round = 3;
    late.phases[4].round = 3;
    assert.throws(() => BattleReplayUtils.decode(encode(late)), /期限无效/);
    removal.removalReason = "death";
    assert.throws(() => BattleReplayUtils.decode(encode(source)), /期限无效/);
    removal.removalReason = "expire";
    removal.expiresAtRound = 2;
    assert.throws(() => BattleReplayUtils.decode(encode(source)), /原实例不一致/);
    removal.expiresAtRound = 1;
    original.expiresAtRound = 2;
    assert.throws(() => BattleReplayUtils.decode(encode(source)), /原实例不一致/);
    original.expiresAtRound = 0;
    assert.throws(() => BattleReplayUtils.decode(encode(source)), /期限无效/);
}

/** 真后端PB保持原模板、事件和24技能分支；只读接纳，不运行玩家挑战或替换未支持技能。 */
async function interop(): Promise<void> {
    for (const argument of process.argv.filter(value => value.startsWith("--java="))) {
        const bytes = readFileSync(argument.slice(7));
        const steps = BattleReplayUtils.decode(bytes);
        for (const step of steps.filter(value => value.kind === "presentation")) {
            for (const action of BattleAttackUtils.legacyActions(row(step.configId))) BattleAttackUtils.plan(action);
        }
        const consumed: typeof steps[number][] = [];
        const player = new BattleReplayPlayer({ stop: () => {},
            waitForFollowingHit: step => step.removalReason === "trigger-limit" && row(step.configId).type === 234,
            play: async step => { consumed.push(step); } });
        assert.equal(await player.play(bytes), true, "真实PB依赖必须完整完成，不能只让静态plan过guard");
        assert.equal(consumed.filter(step => step.kind === "buff.remove").length,
            steps.filter(step => step.kind === "buff.remove").length, "每个真实移除恰好消费一次");
        for (const [index, step] of consumed.entries()) {
            if (step.kind === "buff.remove" && (step.removalReason === "wake"
                || (step.removalReason === "trigger-limit" && row(step.configId).type === 234))) {
                assert(consumed.slice(0, index).some(previous => previous.kind === "damage"
                    && previous.targetId === step.targetId), "真实唤醒/格挡移除必须在命中完成后显示");
            }
        }
        console.log("Java10～20关表现互通通过：" + argument.slice(7));
    }
}

/** 检查原覆盖、资源、实例依赖及可选真实PB；不运行850 fresh审计或联网。 */
async function main(): Promise<void> {
    assets(actions());
    await player();
    immediateAttributeExpiry();
    await interop();
    console.log("PASS 10～20关：12模板24技能旧覆盖、287原帧及格挡/wake/关闭边界");
}

void main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
