/**
 * 主线里程碑只读专项：验证真实配置、权威已领集合、旧提示规则和协议互通。
 * 高关卡仅作为纯规则边界，不打开挑战/领取；不连接日常服务器或修改玩家数据。
 */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { CONFIG_SCHEMA } from "../assets/scripts/config/GConfig";
import type { ChapterExtraRewardRow } from "../assets/scripts/config/GConfig";
import { GameLog } from "../assets/scripts/core/GameLog";
import { MainChapterController } from "../assets/scripts/features/battle/MainChapterController";
import { MainChapterModel } from "../assets/scripts/features/battle/MainChapterModel";
import type { MainChapterState } from "../assets/scripts/features/battle/MainChapterModel";
import { ChapterMilestoneUtils } from "../assets/scripts/features/battle/utils/ChapterMilestoneUtils";
import { GameProtocolCodecUtils } from "../assets/scripts/platform/GameProtocolCodecUtils";
import { Protocol } from "../assets/scripts/platform/Protocol";

/** 测试只读取实际配置Bundle目录，不复制第二份源表。 */
const { resolveBundleFile } = require(process.cwd() + "/tools/bundle-paths.cjs");
/** 与登录包相同的六项原配置，顺序规则由生产投影决定。 */
const rows: readonly ChapterExtraRewardRow[] = JSON.parse(readFileSync(
    resolveBundleFile("config/chapterextrareward.json"), "utf8")).rows;
/** 完整语言映射按唯一schema主键建立测试读取能力，不假定id字段名。 */
const language = new Map<string, string>(JSON.parse(readFileSync(
    resolveBundleFile("config/language.json"), "utf8"))[CONFIG_SCHEMA.Language.container]
    .map((row: Record<string, unknown>) => [String(row[CONFIG_SCHEMA.Language.key]), row.value as string]));

/** 构造显示层纯输入；15关以上只用于旧规则边界，不交给前三关挑战协议。 */
function state(maxCleared: number, claimedIds: readonly number[] = []): MainChapterState {
    return { maxCleared, pendingBattleId: null, assetRevision: 7,
        milestoneProgress: { schemaVersion: 1, claimedIds } };
}

/** 旧缺失、真实空集和坏扩展分开，冻结后外部数组不能改写已接纳状态。 */
function progress(): void {
    const old = MainChapterModel.readState({ maxCleared: 0, pendingBattleId: null, assetRevision: 1 })!;
    assert.equal(old.milestoneProgress, undefined);
    const source = [300, 100];
    const accepted = MainChapterModel.readState({ ...state(1),
        milestoneProgress: { schemaVersion: 1, claimedIds: source } })!;
    source[0] = 600;
    assert.deepEqual(accepted.milestoneProgress!.claimedIds, [100, 300]);
    assert(Object.isFrozen(accepted.milestoneProgress) && Object.isFrozen(accepted.milestoneProgress!.claimedIds));
    assert.deepEqual(MainChapterModel.readState(state(0))!.milestoneProgress!.claimedIds, []);
    for (const value of [null, [], {}, { schemaVersion: 2, claimedIds: [] },
        { schemaVersion: 1 }, { schemaVersion: 1, claimedIds: [100, 100] },
        ...[0, -1, 1.5, "100", 0x100000000].map(id => ({ schemaVersion: 1, claimedIds: [id] }))]) {
        assert.throws(() => MainChapterModel.readState({ ...state(1), milestoneProgress: value }));
    }
    const model = new MainChapterModel();
    const controller = new MainChapterController(model);
    controller.onNotify(Protocol.STATE_CHANGED, { revision: 7, mainChapter: state(1) });
    const before = model.state;
    assert.throws(() => controller.onNotify(Protocol.STATE_CHANGED, { revision: 8,
        mainChapter: { ...state(2), assetRevision: 8, milestoneProgress: { schemaVersion: 1, claimedIds: [-1] } } }));
    assert.equal(model.state, before, "坏扩展不能先提交通关字段再失败");
}

/** 最小未领、乱序已领、达成待领、全领和绝对关卡差均按真实六项配置验证。 */
function targets(): void {
    assert.equal(rows.length, 6, "本批旧Lua/XLSX已核实的完整六项，不能用首项假表替代");
    const ordered = [...rows].sort((a, b) => a.idx - b.idx);
    const hint = (value: MainChapterState) => ChapterMilestoneUtils.hint(value,
        () => rows, id => language.get(String(id)));
    assert.equal(ordered[0].chapter, 15);
    assert.equal(hint(state(0)).remaining, 15);
    for (const stage of [1, 2, 3]) {
        const target = hint(state(stage));
        assert.equal(target.kind, "target");
        assert.equal(target.rewardId, ordered[0].idx);
        assert.equal(target.remaining, 15 - stage);
        assert(target.text.includes(String(15 - stage)));
        assert(!target.text.includes("<font"));
    }
    const laterClaimed = hint(state(3, [ordered[2].idx, ordered[5].idx]));
    assert.equal(laterClaimed.rewardId, ordered[0].idx, "不能按最大已领ID跳过第一项");
    const nonConsecutive = hint(state(3, [ordered[0].idx, ordered[2].idx]));
    assert.equal(nonConsecutive.rewardId, ordered[1].idx);
    for (const cleared of [15, 16, 100]) {
        const ready = hint(state(cleared));
        assert.equal(ready.rewardId, ordered[0].idx, "达到门槛但没领仍保留原目标");
        assert.equal(ready.remaining, 0);
        assert.equal(ready.text, ChapterMilestoneUtils.hint(state(15), () => rows,
            id => language.get(String(id))).text);
    }
    assert.equal(hint(state(3, ordered.map(row => row.idx))).kind, "complete");
    assert.equal(hint(state(3, ordered.map(row => row.idx))).text, "");
    const reversed = ChapterMilestoneUtils.hint(state(3), () => [...rows].reverse(), id => language.get(String(id)));
    assert.equal(reversed.rewardId, ordered[0].idx, "读取配置顺序不改变旧idx排序规则");
    const missing = hint({ maxCleared: 3, pendingBattleId: null, assetRevision: 7 });
    assert.equal(missing.kind, "unavailable");
    assert.equal(missing.rewardId, null, "未同步不能猜为未领第15关");
    for (const readRows of [() => [], () => [rows[0], rows[0]], () => { throw new Error("配置未安装"); }]) {
        assert.equal(ChapterMilestoneUtils.hint(state(1), readRows,
            id => language.get(String(id))).kind, "unavailable");
    }
    assert.equal(ChapterMilestoneUtils.hint(state(1), () => rows, () => undefined).kind, "unavailable");
    assert(Object.isFrozen(hint(state(1))));
}

/** 可选读取本轮Java真实PB；统一首包、提交事件、鉴权和回执均须保留明确进度。 */
function interop(): void {
    const path = process.argv.find(arg => arg.startsWith("--java="))?.slice(7);
    if (!path) {
        return;
    }
    const frame = GameProtocolCodecUtils.decodeGameFrame(readFileSync(path));
    const body = frame.body as any;
    let raw: unknown;
    switch (frame.name) {
        case Protocol.SESSION_LOGIN:
        case Protocol.SESSION_AUTHENTICATE:
            raw = body.initial.mainChapter;
            break;
        case Protocol.STATE_CHANGED:
            raw = body.mainChapter;
            break;
        case Protocol.CHAPTER_CLAIM:
            raw = body.state;
            break;
        default:
            assert.fail("里程碑互通样本消息未登记：" + frame.name);
    }
    const value = MainChapterModel.readState(raw)!;
    const expected = process.argv.find(arg => arg.startsWith("--expected="))?.slice(11);
    assert.deepEqual(value.milestoneProgress!.claimedIds, expected ? expected.split(",").map(Number) : []);
    assert.deepEqual(GameProtocolCodecUtils.decodeGameFrame(GameProtocolCodecUtils.encodeGameFrame(frame)), frame);
    console.log("Java里程碑进度PB互通通过：" + frame.name);
}

/** 只读配置缺口用预期日志覆盖，不污染其他专项的全局日志。 */
function main(): void {
    const previous = GameLog.shared;
    GameLog.shared = new GameLog();
    GameLog.shared.mirrorConsole = false;
    try {
        progress();
        targets();
        interop();
        console.log("PASS chapter milestone authoritative set, six-source config, old target rules and missing-state boundaries");
    } finally {
        GameLog.shared = previous;
    }
}

try {
    main();
} catch (error) {
    console.error(error);
    process.exitCode = 1;
}
