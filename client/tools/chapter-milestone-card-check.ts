/**
 * 主线常显里程碑卡专项：实际配置与Prefab绑定、原英雄骨架比例、达成直领及停用清理。
 * 引擎能力用可控替身，不运行网络或发奖；原PVR切图证据独立于运行显示生命周期。
 */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { Node, Label, Button, Sprite } from "cc";
import { ConfigFixtureUtils } from "./ConfigFixtureUtils";
import { MainChapterMilestoneCard } from "../assets/scripts/features/battle/ui/MainChapterMilestoneCard";
import { MainChapterModel } from "../assets/scripts/features/battle/MainChapterModel";
import { MainChapterController } from "../assets/scripts/features/battle/MainChapterController";
import { BattleSpineService } from "../assets/scripts/features/battle/ui/BattleSpineService";
import { EventDispatcher } from "../assets/scripts/framework/EventDispatcher";
import { UIManager } from "../assets/scripts/framework/ui/UIManager";
import { ResManager } from "../assets/scripts/framework/assets/ResManager";
import { GameLog } from "../assets/scripts/core/GameLog";

/** 读取正式静态绑定，避免只测工具临时拼接节点而遗漏实际Prefab。 */
function staticBindings(): void {
    const objects = JSON.parse(readFileSync("client/assets/bundles/module/battle/prefabs/MainChapterView.prefab", "utf8"));
    const component = objects.find((row: any) => row.rewardIcon && row.rewardName && row.claimLabel && row.heroHost);
    assert(component, "常显原目标卡必须存在于正式MainChapterView Prefab");
    for (const field of ["rewardIcon", "rewardName", "progressLabel", "claimButton", "claimLabel", "heroHost", "progressFill"]) {
        assert(objects[component[field].__id__], "目标卡缺少静态引用：" + field);
    }
    const main = objects.find((row: any) => row.challengeButton && row.idleClaimButton);
    assert.equal(objects[main.milestoneCard.__id__], component);
    const frame = objects.find((row: any) => row.__type__ === "cc.Node" && row._name === "MilestoneOriginalFrame");
    const sprite = frame._components.map((ref: any) => objects[ref.__id__]).find((row: any) => row.__type__ === "cc.Sprite");
    const meta = JSON.parse(readFileSync("client/assets/bundles/module/battle/atlas/chapter-reward_spr-item-bg-1.png.meta", "utf8"));
    assert.equal(sprite._spriteFrame.__uuid__, meta.uuid + "@f9941");
    assert.equal(meta.subMetas.f9941.userData.rawWidth, 150);
    assert.equal(meta.subMetas.f9941.userData.rawHeight, 150);
}

/** 模拟原主线进度与已领集合，不把它交给真实服务或称为本次发奖。 */
function state(cleared: number, claimedIds: number[] = []): void {
    MainChapterModel.instance.state = { maxCleared: cleared, pendingBattleId: null, assetRevision: 9,
        challengeLimit: 20, milestoneProgress: { schemaVersion: 1, claimedIds } };
    EventDispatcher.instance.emit(MainChapterController.Updated, undefined);
}

/** 引擎节点替身只提供Prefab中的绑定类型，生命周期逻辑运行真实卡组件。 */
function card(): MainChapterMilestoneCard {
    const root = new Node("MilestoneCard");
    const value = root.addComponent(MainChapterMilestoneCard);
    value.rewardIcon = new Node("RewardIcon").addComponent(Sprite);
    value.rewardIcon.node.parent = root;
    value.heroHost = new Node("HeroHost"); value.heroHost.parent = root;
    value.rewardName = new Node("RewardName").addComponent(Label);
    value.progressLabel = new Node("ProgressLabel").addComponent(Label);
    value.claimButton = new Node("ClaimButton").addComponent(Button);
    value.claimLabel = new Node("ClaimLabel").addComponent(Label);
    const progress = new Node("Progress"); progress.parent = root;
    value.progressFill = new Node("Fill").addComponent(Sprite); value.progressFill.node.parent = progress;
    return value;
}

/** 运行显示与交互边界，最后恢复全局替身，避免影响其他工具。 */
async function main(): Promise<void> {
    await ConfigFixtureUtils.installReal();
    GameLog.shared.mirrorConsole = false;
    staticBindings();
    const model = MainChapterModel.instance;
    model.reset();
    const actors: { node: Node; stem: string; scale: number; gestures: string[] }[] = [];
    const paints: unknown[] = [];
    const tips: string[] = [];
    const originalMount = BattleSpineService.instance.mountBattleSpine;
    const originalPaint = ResManager.setSprite;
    const originalToast = UIManager.instance.toast;
    const originalClaim = MainChapterController.instance.claimMilestone;
    (BattleSpineService.instance as any).mountBattleSpine = (parent: Node, stem: string, _failure: unknown, options: { scale: number }) => {
        const actor = { node: new Node("OriginalHero"), stem, scale: options.scale, gestures: [] as string[],
            gesture(name: string) { this.gestures.push(name); return true; } };
        actor.node.parent = parent;
        actors.push(actor);
        return actor;
    };
    ResManager.setSprite = (_node, source) => { paints.push(source); };
    UIManager.instance.toast = message => { tips.push(message); };
    const before = EventDispatcher.instance.listenerCount(MainChapterController.Updated);
    const value = card();
    try {
        state(14);
        (value as any).onEnable();
        assert.equal(EventDispatcher.instance.listenerCount(MainChapterController.Updated), before + 1);
        assert.equal(actors.length, 1);
        assert.equal(actors[0].stem, "10105007");
        assert.equal(actors[0].scale, 0.5 * 0.67 * 0.8 * 1.42);
        assert.deepEqual(actors[0].gestures, ["stand"]);
        assert.equal(value.rewardIcon!.node.active, false, "原英雄骨架不应被图标覆盖");
        assert(value.rewardName!.string.includes("烈焰骑士"));
        assert.equal(value.progressLabel!.string, "通关 14/15");
        let entries = 0;
        MainChapterController.instance.claimMilestone = async () => { entries++; };
        await (value as any).claim();
        assert.equal(entries, 0);
        assert(tips[0].includes("1关"));
        state(15);
        assert.equal(actors.length, 1, "同目标快照不重复创建模型");
        assert.equal(value.rewardIcon!.node.active, false);
        assert.equal(value.claimLabel!.string, "领取奖励");
        let finish!: () => void;
        MainChapterController.instance.claimMilestone = async rewardId => {
            assert.equal(rewardId, 100);
            entries++;
            await new Promise<void>(done => { finish = done; });
        };
        const click = (value as any).claim();
        await (value as any).claim();
        assert.equal(entries, 1);
        assert.equal(value.claimLabel!.string, "确认中");
        state(15, [100]);
        finish(); await click;
        assert.equal(actors[0].node.isValid, false, "切到物品目标须释放旧英雄节点");
        assert(value.rewardName!.string.includes("500"));
        assert.equal(value.progressLabel!.string, "通关 15/30");
        assert.equal(value.rewardIcon!.node.active, true);
        assert.equal(value.heroHost!.active, false);
        (value as any).onDisable();
        assert.equal(EventDispatcher.instance.listenerCount(MainChapterController.Updated), before);
        const previous = value.rewardName!.string;
        state(20, [100]);
        assert.equal(value.rewardName!.string, previous, "停用后不能继续收页面刷新");
        (value as any).onEnable();
        assert.equal(value.progressLabel!.string, "通关 20/30");
        state(140, [100, 150, 200, 300, 400, 500]);
        assert.equal(value.completed, true);
        (value as any).onDisable();
        assert.equal(EventDispatcher.instance.listenerCount(MainChapterController.Updated), before);
        console.log("PASS milestone card: original static frame/model, 15 gate/direct claim, next target and lifecycle");
    } finally {
        (value as any).onDisable();
        value.node.destroy();
        BattleSpineService.instance.mountBattleSpine = originalMount;
        ResManager.setSprite = originalPaint;
        UIManager.instance.toast = originalToast;
        MainChapterController.instance.claimMilestone = originalClaim;
        model.reset();
    }
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
