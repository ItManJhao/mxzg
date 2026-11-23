/** 使用真实配置核对英雄普通升级和进阶报价，不写入角色状态。 */
import { strict as assert } from "node:assert";
import { GameConfig } from "../assets/scripts/config/GameConfig";
import type { OwnedHero } from "../assets/scripts/features/hero/data/HeroSnapshotUtils";
import { HeroLevelQuoteUtils } from "../assets/scripts/features/hero/utils/HeroLevelQuoteUtils";
import { ConfigFixtureUtils } from "./ConfigFixtureUtils";

/** 复验首战收入、成长费用、等级和星级条件以及未同步状态。 */
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
    assert.equal(HeroLevelQuoteUtils.describeStage({ ...hero, level: 29 }, 20000, 50, config).status, "locked");
    assert.deepEqual(HeroLevelQuoteUtils.describeStage({ ...hero, level: 30 }, 9999, 50, config), {
        status: "ready", stage: 0, nextStage: 1, requiredLevel: 30, requiredStar: 1,
        gold: 10000, stone: 50, goldEnough: false, stoneEnough: true,
    });
    assert.equal(HeroLevelQuoteUtils.describeStage({ ...hero, level: 40, stage: 1, star: 1 },
        20000, 100, config).status, "locked");
    assert.equal(HeroLevelQuoteUtils.describeStage({ ...hero, level: 40, stage: 1, star: 2 },
        20000, 99, config).stoneEnough, false);
    assert.equal(HeroLevelQuoteUtils.describeStage({ ...hero, level: 140, stage: 6, star: 6 },
        20000, 100, config).status, "max");
    assert.equal(HeroLevelQuoteUtils.describeStage(hero, 20000, -1, config).status, "unavailable");
    console.log("PASS hero growth quote: level jump, stage costs, balance, level and star requirements");
}

void main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
