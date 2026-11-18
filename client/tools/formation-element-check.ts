/** 出阵元素专项：用实际配置验证克制方向、光环门槛、加成叠加和草稿边界。 */
import { strict as assert } from "node:assert";
import { GameConfig } from "../assets/scripts/config/GameConfig";
import type { FormationState } from "../assets/scripts/features/hero/data/FormationData";
import { FormationElementUtils } from "../assets/scripts/features/hero/utils/FormationElementUtils";
import { ConfigFixtureUtils } from "./ConfigFixtureUtils";

/** 起源阵型允许出阵的普通格位，包含前后排，排除独立助战。 */
const ORDINARY_POSITIONS = [2, 3, 5, 6, 7, 8] as const;

/** 源 herotype 中各元素的真实模板，使用不同实例和模板满足保存规则。 */
const FIRE_HEROES = [10101001, 10102002, 10103003, 10104004] as const;
const WATER_HEROES = [10201001, 10202002] as const;
const ALL_ELEMENTS = [FIRE_HEROES[0], WATER_HEROES[0], 10301001, 10403001, 10503001] as const;

/** 为测试建立草稿。模板取真实表，实例身份和站位仅属本次夹具。 */
function draft(templateIds: readonly number[], positions: readonly number[] = ORDINARY_POSITIONS): FormationState {
    assert(positions.length >= templateIds.length);
    const heroes = templateIds.map((templateId, index) => ({ id: "fixture-hero-" + index, templateId, level: 1, star: 1 }));
    return {
        heroes,
        lineup: { version: 2, slots: heroes.map((hero, index) => ({ heroId: hero.id, position: positions[index] })) },
        busy: false,
        message: "",
        formationId: 1,
        openPositions: ORDINARY_POSITIONS,
        unlockedIds: [1],
    };
}

/** 对照旧表核对克制和每组最高命中档，随后模拟用户编辑草稿。 */
async function main(): Promise<void> {
    const config = await ConfigFixtureUtils.installReal(new GameConfig());
    const project = (state: FormationState) => FormationElementUtils.forDraft(state, config);
    const empty = project(draft([]));
    assert.equal(empty.icon, "10000", "空队伍使用旧版无光环图标");
    assert.equal(empty.summary, "");
    assert.deepEqual(empty.bonuses, []);
    assert.deepEqual(empty.groups.map(group => group.type), [1, 2, 3, 4, 5, 6]);
    assert.deepEqual(empty.groups.map(group => group.tiers.length), [5, 5, 5, 5, 5, 1]);
    assert(empty.groups.every(group => !group.active && group.tiers.every(tier => !tier.active)));
    assert.deepEqual(empty.relations.map(({ attacker, defender, damage, hit }) => [attacker, defender, damage, hit]), [
        [1, 3, 13000, 11500],
        [2, 1, 13000, 11500],
        [3, 2, 13000, 11500],
        [4, 5, 13000, 11500],
        [5, 4, 13000, 11500],
    ]);
    assert.match(empty.restraint, /伤害提升\+30%.*命中\+15%/);

    const twoFire = project(draft(FIRE_HEROES.slice(0, 2)));
    assert.equal(twoFire.icon, "1");
    assert.equal(twoFire.summary, "总加成效果：生命+3% 攻击+3%");
    assert.deepEqual(twoFire.bonuses, [{ attribute: 102, value: 300 }, { attribute: 201, value: 300 }]);
    const fireGroup = twoFire.groups[0];
    assert.equal(fireGroup.name, "燃烧之力");
    assert.equal(fireGroup.active, true);
    assert.equal(fireGroup.tiers[0].condition, "上阵2个火系英雄");
    assert.deepEqual(fireGroup.tiers.filter(tier => tier.active).map(tier => tier.id), [1]);
    assert.match(fireGroup.tiers[4].bonus, /生命\+20%.*攻击\+15%.*闪避\+10%/,
        "未激活的最高档仍显示旧表中的第三项属性");

    const threeFire = project(draft(FIRE_HEROES.slice(0, 3)));
    assert.deepEqual(threeFire.groups[0].tiers.filter(tier => tier.active).map(tier => tier.id), [2],
        "满足两档时仅采用最高档");
    assert.deepEqual(threeFire.bonuses, [{ attribute: 102, value: 500 }, { attribute: 201, value: 500 }]);
    assert.equal(project(draft(FIRE_HEROES.slice(0, 1))).summary, "", "撤到只剩一名火英雄时取消光环");

    const water = project(draft(WATER_HEROES));
    assert.deepEqual(water.groups.map(group => group.type), [2, 1, 3, 4, 5, 6], "激活组排在未激活组前");
    assert.match(water.groups[0].tiers[4].bonus, /生命\+20%.*攻击\+15%.*暴击\+5%/);
    const stacked = project(draft([...FIRE_HEROES, ...WATER_HEROES]));
    assert.equal(stacked.icon, "21", "多组图标按原始组别逆序组合");
    assert.deepEqual(stacked.groups.filter(group => group.active).map(group => group.type), [1, 2]);
    assert.deepEqual(stacked.bonuses, [{ attribute: 102, value: 1300 }, { attribute: 201, value: 1000 }]);

    const mixed = project(draft(ALL_ELEMENTS));
    assert.equal(mixed.icon, "6");
    assert.equal(mixed.groups[0].type, 6);
    assert.equal(mixed.groups[0].tiers[0].condition, "上阵5个不同元素的英雄");
    assert.deepEqual(mixed.bonuses, [{ attribute: 102, value: 600 }, { attribute: 201, value: 600 }]);
    const mixedWithFire = project(draft([...ALL_ELEMENTS, FIRE_HEROES[1]]));
    assert.equal(mixedWithFire.icon, "6", "混合光环有组合图标优先权");
    assert.deepEqual(mixedWithFire.bonuses, [{ attribute: 102, value: 900 }, { attribute: 201, value: 900 }]);

    const moved = draft(FIRE_HEROES.slice(0, 2), [7, 3]);
    const before = JSON.stringify(moved);
    assert.deepEqual(project(moved), twoFire, "拖动到另一排的普通格不改变队伍元素数量");
    assert.equal(JSON.stringify(moved), before, "展示计算不改动草稿");
    const invalid = draft(FIRE_HEROES, [2, 1, 9, 5]);
    invalid.openPositions = [...ORDINARY_POSITIONS, 9];
    invalid.lineup.slots[3].heroId = "unknown-hero";
    assert.deepEqual(project(invalid).bonuses, [], "关闭格、助战位和不存在的英雄不触发普通参战光环");
    assert.deepEqual(project({ ...draft(FIRE_HEROES.slice(0, 3)), openPositions: undefined }).bonuses, [], "未收到开放格时不猜测阵容");
    console.log("PASS 出阵元素：真实克制表、阶梯光环、叠加、混合与草稿变化");
}

void main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
