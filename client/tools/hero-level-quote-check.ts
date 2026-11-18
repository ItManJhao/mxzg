/** 使用当前真实配置验证英雄详情报价及旧版批升边界，不写入任何角色状态。 */
import { strict as assert } from "node:assert";
import { GameConfig } from "../assets/scripts/config/GameConfig";
import type { OwnedHero } from "../assets/scripts/features/hero/data/HeroSnapshotUtils";
import { HeroLevelQuoteUtils } from "../assets/scripts/features/hero/utils/HeroLevelQuoteUtils";
import { ConfigFixtureUtils } from "./ConfigFixtureUtils";

/** 复验首战收入、两次升级、材料不足、上限，以及未就绪时禁用入口。 */
async function main(): Promise<void> {
    const config = await ConfigFixtureUtils.installReal(new GameConfig());
    const hero: OwnedHero = {
        id: "00000000-0000-4000-8000-000000000001",
        templateId: 10304012,
        level: 1,
        star: 4,
        stage: 0,
    };
    assert.deepEqual(HeroLevelQuoteUtils.describe(hero, 4000, 500, config), {
        status: "ready", levelLimit: 30, gold: 410, heroExp: 105,
        goldEnough: true, heroExpEnough: true, levels: 5, fromLevel: 1, jumpLabel: true,
    });
    assert.deepEqual(HeroLevelQuoteUtils.describe({ ...hero, level: 6 }, 3590, 395, config), {
        status: "ready", levelLimit: 30, gold: 1028, heroExp: 296,
        goldEnough: true, heroExpEnough: true, levels: 4, fromLevel: 6, jumpLabel: true,
    });
    assert.deepEqual(HeroLevelQuoteUtils.describe({ ...hero, level: 10 }, 2562, 99, config), {
        status: "ready", levelLimit: 30, gold: 449, heroExp: 136,
        goldEnough: true, heroExpEnough: false, levels: 0, fromLevel: 10, jumpLabel: false,
    });
    const notEnoughGold = HeroLevelQuoteUtils.describe(hero, 52, 500, config);
    assert.deepEqual([notEnoughGold.levels, notEnoughGold.gold, notEnoughGold.goldEnough, notEnoughGold.heroExpEnough],
        [0, 53, false, true]);
    const exactFirstCost = HeroLevelQuoteUtils.describe(hero, 53, 12, config);
    assert.equal(exactFirstCost.levels, 1);
    assert.equal(exactFirstCost.jumpLabel, true);
    assert.equal(HeroLevelQuoteUtils.describe({ ...hero, level: 29 }, 999999, 999999, config).levels, 1);
    assert.equal(HeroLevelQuoteUtils.describe({ ...hero, level: 30 }, 999999, 999999, config).status, "max");
    const afterJump = HeroLevelQuoteUtils.describe({ ...hero, level: 60, stage: 4 }, 999999, 999999, config);
    assert.equal(afterJump.levels, 1);
    assert.equal(afterJump.jumpLabel, false);
    assert.equal(HeroLevelQuoteUtils.describe(hero, 4000, 500, new GameConfig()).status, "unavailable");
    assert.equal(HeroLevelQuoteUtils.describe({ ...hero, stage: undefined }, 4000, 500, config).status, "unavailable");
    assert.equal(HeroLevelQuoteUtils.describe(hero, -1, 500, config).status, "unavailable");
    console.log("PASS hero level quote: first battle, cumulative costs, resource shortage, stage limit, jump threshold and unavailable state");
}

void main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
