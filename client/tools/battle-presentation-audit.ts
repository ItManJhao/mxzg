/**
 * 静态核对英雄初始星级、强化0的技能动作与帧资源，并锁定主线已核对的替换普攻和多等级动作。
 * 调用实际BattleAttackUtils覆盖与解析；只读配置，不连接服务器，不代表技能规则或画面验收。
 * 默认将本次结果写入client/temp，不与历史快照硬比较；完整关卡的保留证据由主线依赖审计生成。
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { strict as assert } from "node:assert";
import { BattleAttackUtils } from "../assets/scripts/features/battle/utils/BattleAttackUtils";

/** 离线按Bundle自身meta发现源目录，分组父目录不进入运行时加载键。 */
const { resolveBundleFile } = require(process.cwd() + "/tools/bundle-paths.cjs");

/** 读取客户端同源表；缺表或非法JSON直接失败，不能输出假通过。 */
function rows(name: string): any[] {
    return JSON.parse(readFileSync(`client/assets/bundles/resources/config/${name}.json`, "utf8")).rows;
}

/** 开膛手·J的替换普攻各等级保留原目标附身、14帧、原音效、暗屏及角色近身回程。 */
function verifyRipperReplacement(buffs: ReadonlyMap<number, any>, id: number): void {
    const buff = buffs.get(id);
    assert.ok(buff, `开膛手·J替换普攻动作缺失 ${id}`);
    const actions = BattleAttackUtils.legacyActions(buff);
    assert.deepEqual(actions.map(action => [action.type, action.delay, action.dimly]), [[7, 0, 1], [11, 0, 1]]);
    const effect = BattleAttackUtils.plan(actions[0]);
    assert.ok(effect.effectOnly && !effect.onSource && effect.effect);
    assert.deepEqual(effect.effect.paths, Array.from({ length: 14 }, (_, index) =>
        `effects/skill/skill-103050110/skill-103050110_${index}/spriteFrame`));
    for (const frame of effect.effect.paths) {
        assert.ok(existsSync(resolveBundleFile(frame.replace("/spriteFrame", ".png"))), `缺少帧资源 ${frame}`);
    }
    assert.equal(effect.effect.interval, 0.08);
    assert.equal(effect.effect.scaleX, -1);
    assert.deepEqual(effect.sounds, ["skill-103050110"]);
    assert.ok(existsSync(resolveBundleFile("audio/skill-103050110.mp3")), "开膛手·J普攻音效缺失");
    const attack = BattleAttackUtils.plan(actions[1]);
    assert.ok(attack.melee && !attack.effect);
    assert.deepEqual([attack.moveSeconds, attack.attackDelaySeconds, attack.beforeReturnSeconds], [0.1, 0.2, 2]);
    assert.deepEqual(attack.sounds, []);
}

/** 核对主线后段使用的旧覆盖、技能等级时序、帧和原音效文件。 */
function verifyChapterProgressionOverrides(buffs: ReadonlyMap<number, any>): void {
    for (const id of [2113101, 2113102, 2155201, 2155202, 2155203, 2081101, 2081102, 2081103, 3061103]) {
        assert.ok(buffs.has(id), `主线旧动作缺失 ${id}`);
    }
    for (const id of [2113101, 2113102, 2155201, 2155202, 2155203]) {
        const octopus = id < 2155201;
        const actions = BattleAttackUtils.legacyActions(buffs.get(id));
        assert.deepEqual(actions.map(action => [action.type, action.delay, action.dimly]),
            octopus ? [[3, 0, 0], [7, 60, 0]] : [[7, 10, 1], [3, 0, 1]]);
        const caster = BattleAttackUtils.plan(actions[octopus ? 0 : 1]);
        assert.deepEqual([caster.action, caster.attackSeconds, caster.actionSeconds],
            octopus ? ["attack3", 0, 2] : ["attack", 0.6, 1.8]);
        const effect = BattleAttackUtils.plan(actions[octopus ? 1 : 0]);
        const file = octopus ? "skill-102050113" : "skill-102050150";
        assert.ok(effect.effectOnly && !effect.onSource && effect.effect);
        assert.equal(effect.effect.paths.length, octopus ? 20 : 14);
        assert.equal(effect.effect.interval, octopus ? 0.05 : 0.08);
        assert.deepEqual(effect.sounds, [file]);
        for (const frame of effect.effect.paths) {
            assert.ok(existsSync(resolveBundleFile(frame.replace("/spriteFrame", ".png"))), `缺少帧资源 ${frame}`);
        }
        assert.ok(existsSync(resolveBundleFile(`audio/${file}.mp3`)), `缺少旧音效 ${file}`);
    }
    for (const id of [2081101, 2081102, 2081103]) {
        const [first, second] = BattleAttackUtils.legacyActions(buffs.get(id));
        const plan = BattleAttackUtils.plan(first);
        assert.equal(plan.attackSeconds, id === 2081101 ? 0.8 : 0.3);
        assert.equal(plan.effect?.interval, id === 2081101 ? 0.048 : 0.1);
        assert.equal(second.delay, 50);
        assert.equal(BattleAttackUtils.plan(second).effect?.paths.length, 44);
    }
    const wind = BattleAttackUtils.legacyActions(buffs.get(3061103));
    assert.deepEqual(wind.map(action => [action.type, action.delay, action.dimly]), [[3, 0, 1], [9, 50, 0], [1, 0, 0]]);
}

/** 第361～400关的四项三级主动表现按旧表分开施法和目标特效，保留各自的延迟、锚点及资源。 */
function verifyThirdLevelActions(buffs: ReadonlyMap<number, any>): void {
    for (const [id, delay, castTime, frames, file, sound, anchorX, anchorY, scale] of [
        [1103103, 70, 1.8, 11, "skill-104050051", "skill-101040041", 0.5, 0.55, 1],
        [2113103, 60, 2, 20, "skill-102050113", "skill-102050113", 0.5, 0.3, 3],
        [3083103, 75, 2, 8, "skill-103050083", "skill-103050083", 0.4, 0.3, 2],
        [3103103, 70, 2, 14, "skill-103050103", "skill-103050103", 0.5, 0.25, 3],
    ] as const) {
        const buff = buffs.get(id);
        assert.ok(buff, `主线三级动作缺失 ${id}`);
        const actions = BattleAttackUtils.legacyActions(buff);
        assert.deepEqual(actions.map(action => [action.type, action.delay, action.dimly]), [[3, 0, 0], [7, delay, 0]]);
        const caster = BattleAttackUtils.plan(actions[0]);
        assert.deepEqual([caster.action, caster.actionSeconds, caster.effect], ["attack3", castTime, null]);
        const target = BattleAttackUtils.plan(actions[1]);
        assert.ok(target.effectOnly && !target.onSource && target.effect);
        // 附身帧经过通用锚点换算，原纵锚点先扣除既有的绘制偏移。
        assert.deepEqual([target.effect.anchorX, target.effect.anchorY, target.effect.scaleX, target.effect.scaleY],
            [anchorX, anchorY - 0.07, scale, scale]);
        assert.equal(target.effect.interval, 0.05);
        assert.deepEqual(target.sounds, [sound]);
        assert.deepEqual(target.effect.paths, Array.from({ length: frames }, (_, index) =>
            `effects/skill/${file}/${file}_${index}/spriteFrame`));
        for (const frame of target.effect.paths) {
            assert.ok(existsSync(resolveBundleFile(frame.replace("/spriteFrame", ".png"))), `缺少帧资源 ${frame}`);
        }
        assert.ok(existsSync(resolveBundleFile(`audio/${sound}.mp3`)), `缺少旧音效 ${sound}`);
    }
}

/** 沿模板→技能→动作→表现检查并保存当前结果；历史可解析模板及反馈阵容不能倒退，不覆盖历史证据。 */
function main(): void {
    assert.deepEqual(process.argv.slice(2), [], "本工具不接受覆盖历史报告的参数；保留批次请使用主线依赖审计的snapshot参数");
    const skills = rows("heroskill");
    const stars = rows("herostar");
    const upgrade = rows("heroupgrade").find(row => row.grade === 0);
    const arts = new Map(rows("buffart").map(row => [row.idx, row]));
    const buffs = new Map(rows("buff").map(row => [row.idx, row]));
    for (const id of [3115201, 3115202, 3115203]) {
        verifyRipperReplacement(buffs, id);
    }
    verifyChapterProgressionOverrides(buffs);
    verifyThirdLevelActions(buffs);
    const heroes = rows("herotype").map(hero => {
        const star = stars.find(row => row.star === hero.star);
        const checked = new Set<number>();
        const gaps: { id: number; reason: string }[] = [];
        for (let slot = 1; slot <= 5; slot++) {
            const id = hero[`skill_${slot}`];
            if (!id || (slot < 5 && upgrade[`skill${slot}`] !== 1)) {
                continue;
            }
            const level = slot === 5 ? 0 : star[`skill${slot}`];
            const skill = skills.find(row => row.type === id && row.level === level);
            assert.ok(skill, `技能缺失 ${id}:${level}`);
            for (const artId of JSON.parse(skill.art_list)) {
                const art = arts.get(artId);
                assert.ok(art, `动作缺失 ${artId}`);
                for (const buffId of JSON.parse(art.buff_list)) {
                    const buff = buffs.get(buffId);
                    assert.ok(buff, `Buff缺失 ${buffId}`);
                    // 旧1至99为动作类型；逻辑Buff与其触发链另由服务端规则测试覆盖。
                    if (buff.type < 1 || buff.type >= 100 || checked.has(buffId)) {
                        continue;
                    }
                    checked.add(buffId);
                    try {
                        for (const action of BattleAttackUtils.legacyActions(buff)) {
                            const plan = BattleAttackUtils.plan(action);
                            for (const path of plan.effect?.paths || []) {
                                assert.ok(existsSync(resolveBundleFile(path.replace("/spriteFrame", ".png"))),
                                    `缺少帧资源 ${path}`);
                            }
                        }
                    } catch (error) {
                        gaps.push({ id: buffId, reason: (error as Error).message });
                    }
                }
            }
        }
        return { template: hero.type, name: hero.note, star: hero.star, checked: [...checked], gaps };
    });
    const result = {
        scope: "全部模板的初始星级/强化0直接动作；不代表全部模板已开放，不含进化、被动触发链、音效和Spine画面验收",
        heroes: heroes.length,
        ready: heroes.filter(hero => hero.gaps.length === 0).length,
        entries: heroes,
    };
    // 历史静态通过只作防倒退基线；新支持可以增加，本次仍逐模板实际重新解析和核对文件。
    const baseline = JSON.parse(readFileSync("docs/validation/battle-presentation-coverage-20261109.json", "utf8")) as {
        entries: Array<{ template: number; gaps: unknown[] }>;
    };
    for (const previous of baseline.entries.filter(entry => entry.gaps.length === 0)) {
        const current = heroes.find(hero => hero.template === previous.template);
        assert.ok(current, `历史可解析模板缺失 ${previous.template}`);
        assert.deepEqual(current.gaps, [], `历史可解析模板出现表现回退 ${previous.template}`);
    }
    for (const id of [10101001, 10201001, 10301001]) {
        const hero = heroes.find(row => row.template === id);
        assert.ok(hero);
        assert.deepEqual(hero.gaps, [], `已验收英雄 ${id} 出现表现缺口`);
    }
    mkdirSync("client/temp", { recursive: true });
    writeFileSync("client/temp/battle-presentation-coverage-current.json", JSON.stringify(result, null, 2) + "\n");
    console.log(`初始表现静态检查：${result.ready}/${result.heroes} 模板可解析；反馈三英雄通过。`);
}

main();
