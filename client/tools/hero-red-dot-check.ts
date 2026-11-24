/** 用真实成长配置和模拟权威快照检查英雄红点资格、汇总及同批次熄灭。 */
import { strict as assert } from "node:assert";
import { ApplicationRedDots } from "../assets/scripts/app/remake/ApplicationRedDots";
import { AccountModel, type RoleProfile } from "../assets/scripts/features/account/AccountModel";
import { BagModel } from "../assets/scripts/features/bag/BagModel";
import { GameRedDotKey } from "../assets/scripts/features/common/utils/GameRedDotKey";
import { HeroRosterModel, type HeroRosterState } from "../assets/scripts/features/hero/HeroRosterModel";
import type { OwnedHero } from "../assets/scripts/features/hero/data/HeroSnapshotUtils";
import type { GodEquipmentItem, HeroGodEquipmentState } from "../assets/scripts/features/hero/utils/HeroGodEquipmentUtils";
import { HeroRedDotUtils } from "../assets/scripts/features/hero/utils/HeroRedDotUtils";
import { HeroStarUtils } from "../assets/scripts/features/hero/utils/HeroStarUtils";
import { RedDotManager } from "../assets/scripts/framework/ui/RedDotManager";
import { ConfigFixtureUtils } from "./ConfigFixtureUtils";

/** 构造一个已同步锁定、上阵和宝石状态的英雄。 */
function hero(id: string, templateId = 10105007, star = 5): OwnedHero {
    return { id, templateId, star, level: 1, deployed: false, locked: false, gems: { items: [] } };
}

/** 测试实际配方的严格素材条件，额外覆盖材料重叠和替代币共用固定费用。 */
function checkStarMaterials(): void {
    const target = hero("target");
    const replica = hero("replica");
    const specific = hero("specific", 10104004);
    const generic = ["one", "two", "three"].map(id => hero(id, 10105011));
    const recipe = HeroStarUtils.recipe(target)!;
    const available = [target, replica, specific, ...generic];
    const canPrepare = (heroes: readonly OwnedHero[]) => HeroStarUtils.canPrepareMaterials(target, recipe, heroes, () => 0);
    assert(canPrepare(available));
    assert(!canPrepare(available.filter(material => material.id !== replica.id)), "目标不能当作指定本体素材");
    for (const invalid of [{ ...specific, star: 4 }, { ...specific, locked: true }, { ...specific, deployed: true },
        { ...specific, deployed: undefined }]) {
        assert(!canPrepare([target, replica, invalid, ...generic]), "素材须满足真实星级、未上阵及未锁定");
    }

    const broad = { ...recipe.rows[2], count: 1, row: 0 };
    const narrow = { ...recipe.rows[0], row: 1 };
    assert(HeroStarUtils.canPrepareMaterials(target, { ...recipe, rows: [broad, narrow] }, [replica, generic[0]], () => 0),
        "任意候选与指定素材重叠时仍能找到有效组合");
    assert(!HeroStarUtils.canPrepareMaterials(target, { ...recipe, rows: [broad, narrow] }, [replica], () => 0),
        "同一持久实例不能满足两行");

    const replacement = { ...narrow, replacementItemId: 900102 };
    const costs = [{ itemId: 900102, quantity: 1000 }];
    const shared = { ...recipe, costs, rows: [{ ...replacement, row: 0 }, replacement] };
    assert(!HeroStarUtils.canPrepareMaterials(target, shared, [], () => 1001), "同一库存不能重复抵扣");
    assert(HeroStarUtils.canPrepareMaterials(target, shared, [], () => 1002), "满额后可逐行使用一件替代品");
    assert(!HeroStarUtils.canPrepareMaterials(target, { ...shared, rows: [{ ...replacement, count: 2 }] }, [], () => 1002),
        "一行不能使用多件替代品");

    const highest = hero("highest", target.templateId, 13);
    // 当前部署表尚无 14 星配方，单独验证服务端保留的末段门槛分支。
    const last = { ...recipe, fromStar: 13, toStar: 14, roleLevel: 130, worldLevel: 110,
        minimumOwnedStar: 13, minimumOwnedHeroes: 3 };
    const highRoster = [highest, hero("high-a", target.templateId, 13), hero("high-b", target.templateId, 13)];
    assert(!HeroStarUtils.eligible(last, highRoster.slice(0, 2), last.roleLevel, last.worldLevel), "最后一段需要达成持有数量");
    assert(!HeroStarUtils.eligible(last, highRoster, last.roleLevel - 1, last.worldLevel - 1));
    assert(HeroStarUtils.eligible(last, highRoster, last.roleLevel, last.worldLevel - 1));
    assert(HeroStarUtils.eligible(last, highRoster, last.roleLevel - 1, last.worldLevel));
}

/** 构造独立神装，heroId 缺失表示尚未穿戴。 */
function godEquipment(instanceId: string, slot: number, heroId?: string): GodEquipmentItem {
    return { instanceId, templateId: 20000001, slot, heroId, modifiers: [], attributes: [], star: 1, quality: 2 };
}

/** 验证真快照刷新贯通培养页签、星级名册汇总和底栏，并清除上一角色分支。 */
function checkSnapshot(): void {
    const bag = BagModel.instance;
    const roster = HeroRosterModel.instance;
    const account = new AccountModel();
    const application = new ApplicationRedDots(account);
    const manager = RedDotManager.instance;
    const role: RoleProfile = { id: "role", nickname: "玩家", level: 70, gold: 0, diamonds: 0 };
    const base = { ...hero("star-target"), deployed: true };
    const jewel = { ...hero("jewel-target", 10105007, 8), gems: { items: [
        { instanceId: "worn-jewel", templateId: 1021002, slot: 2 },
    ] } };
    const inventory = [{ itemId: 1011001, quantity: 1 }, { itemId: 1021002, quantity: 1 }, { itemId: 1031001, quantity: 1 }];
    const heroes = [base, jewel, hero("copy"), hero("specific", 10104004), ...["1", "2", "3"].map(id => hero(id, 10105011))];
    const state: HeroGodEquipmentState = {
        requiredRoleLevel: 70, requiredWorldLevel: 1, requiredHeroStar: 6, worldLevel: 1, freeDraw: false, drawCount: 0,
        items: [godEquipment("free", 1), godEquipment("occupied", 2, jewel.id),
            godEquipment("free-same-slot", 2), godEquipment("other-hero", 3, base.id)],
    };
    const ready: HeroRosterState = {
        heroes, godEquipment: state, status: "ready", error: "",
        mainFormation: { formationId: 1, unlockedIds: [1], assistanceUnlocked: false, version: 1,
            slots: [{ position: 1, heroId: base.id }] },
    };
    try {
        account.replace({ busy: false, role, error: "" });
        roster.replace(ready);
        application.setReady(true);
        assert(!manager.isVisible(GameRedDotKey.HERO), "库存尚未同步时不显示旧提示");
        bag.replaceAll(inventory);
        application.refreshSnapshot();
        assert(manager.isVisible(GameRedDotKey.heroStar(base.id)));
        assert(manager.isVisible(GameRedDotKey.heroDetail(base.id)));
        assert(manager.isVisible(GameRedDotKey.HERO));
        assert(manager.isVisible(GameRedDotKey.heroJewel(jewel.id)));
        assert(manager.isVisible(GameRedDotKey.heroJewel(jewel.id, 1)), "已解锁空槽有库存时亮点");
        assert(!manager.isVisible(GameRedDotKey.heroJewel(jewel.id, 2)), "同星宝石不提示更换");
        assert(!manager.isVisible(GameRedDotKey.heroJewel(jewel.id, 3)), "达到 9 星前不提示速度槽");
        assert(manager.isVisible(GameRedDotKey.heroGodEquipment(jewel.id, 1)), "空槽有未穿实例时亮点");
        assert(!manager.isVisible(GameRedDotKey.heroGodEquipment(jewel.id, 2)), "已有神装的槽不提示替换");
        assert(!manager.isVisible(GameRedDotKey.heroGodEquipment(jewel.id, 3)), "其他英雄的神装不计入未穿余额");
        assert(!manager.isVisible(GameRedDotKey.heroGodEquipment(base.id)), "五星英雄尚未达到神装门槛");
        assert.equal(HeroRedDotUtils.project({ ...ready, mainFormation: undefined }, bag, role).lineupReady, false,
            "仅名册可升星不点亮主线阵容入口");
        const closed = HeroRedDotUtils.project(ready, bag, { ...role, level: 69 });
        assert(!closed.growth[GameRedDotKey.heroGodEquipment(jewel.id, 1)]);
        const worldLocked = HeroRedDotUtils.project({ ...ready, godEquipment: { ...state, requiredWorldLevel: 2 } }, bag, role);
        assert(!worldLocked.growth[GameRedDotKey.heroGodEquipment(jewel.id, 1)]);

        const betterJewel = { itemId: 1021003, quantity: 1 };
        bag.replaceAll([betterJewel]);
        application.refreshSnapshot();
        assert(manager.isVisible(GameRedDotKey.heroJewel(jewel.id, 2)), "比现有星级高时提示宝石槽");

        bag.replaceAll([]);
        roster.replace({ ...ready, heroes: [jewel], godEquipment: { ...state, items: [godEquipment("new-worn", 1, jewel.id)] } });
        application.refreshSnapshot();
        assert(!manager.isVisible(GameRedDotKey.HERO));
        assert(!manager.isVisible(GameRedDotKey.heroStar(base.id)));
        assert(!manager.isVisible(GameRedDotKey.heroJewel(jewel.id)));
        assert(!manager.isVisible(GameRedDotKey.heroGodEquipment(jewel.id)));
    } finally {
        application.dispose();
        bag.reset();
        roster.reset();
    }
}

/** 装载当前配置后运行素材及整包刷新两组专项。 */
async function main(): Promise<void> {
    await ConfigFixtureUtils.installReal();
    checkStarMaterials();
    checkSnapshot();
    console.log("hero red dots passed: strict star materials, gem and god-equipment eligibility, snapshot updates");
}

void main().catch(error => { console.error(error); process.exitCode = 1; });
