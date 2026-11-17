/**
 * 静态核对英雄初始星级、强化0的技能动作与帧资源，供主线接入前发现缺口。
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

/** 沿模板→技能→动作→表现检查并保存当前结果；历史可解析模板及反馈阵容不能倒退，不覆盖历史证据。 */
function main(): void {
    assert.deepEqual(process.argv.slice(2), [], "本工具不接受覆盖历史报告的参数；保留批次请使用主线依赖审计的snapshot参数");
    const skills = rows("heroskill");
    const stars = rows("herostar");
    const upgrade = rows("heroupgrade").find(row => row.grade === 0);
    const arts = new Map(rows("buffart").map(row => [row.idx, row]));
    const buffs = new Map(rows("buff").map(row => [row.idx, row]));
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
