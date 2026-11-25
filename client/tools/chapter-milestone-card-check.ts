/**
 * 主线常显里程碑卡专项：实际配置与Prefab绑定、原英雄骨架比例、达成直领及停用清理。
 * 引擎能力用可控替身，不运行网络或发奖；原PVR切图证据独立于运行显示生命周期。
 */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { Node, Label, Button, Prefab, RichText, Sprite, SpriteFrame, UITransform } from "cc";
import { ConfigFixtureUtils } from "./ConfigFixtureUtils";
import { MainChapterMilestoneCard } from "../assets/scripts/features/battle/ui/MainChapterMilestoneCard";
import { MainChapterModel } from "../assets/scripts/features/battle/MainChapterModel";
import { MainChapterController } from "../assets/scripts/features/battle/MainChapterController";
import { MainChapterRedDotUtils } from "../assets/scripts/features/battle/utils/MainChapterRedDotUtils";
import { GameRedDotKey } from "../assets/scripts/features/common/utils/GameRedDotKey";
import { BattleSpineService } from "../assets/scripts/features/battle/ui/BattleSpineService";
import { EventDispatcher } from "../assets/scripts/framework/EventDispatcher";
import { UIManager } from "../assets/scripts/framework/ui/UIManager";
import { RedDotManager } from "../assets/scripts/framework/ui/RedDotManager";
import { ResManager } from "../assets/scripts/framework/assets/ResManager";
import { PrefabLoader } from "../assets/scripts/framework/assets/PrefabLoader";
import { GameLog } from "../assets/scripts/core/GameLog";

/** 读取正式静态绑定，避免只测工具临时拼接节点而遗漏实际Prefab。 */
function staticBindings(): void {
    const objects = JSON.parse(readFileSync("client/assets/bundles/module/battle/prefabs/MainChapterView.prefab", "utf8"));
    const component = objects.find((row: any) => row.rewardIcon && row.tipArtwork && row.claimLabel && row.heroHost);
    assert(component, "常显原目标卡必须存在于正式MainChapterView Prefab");
    for (const field of ["rewardIcon", "progressTip", "tipBackdrop", "tipArtwork", "rewardGlow", "progressLabel",
        "claimButton", "claimArtwork", "claimLabel", "claimDotAnchor", "heroHost", "progressFill"]) {
        assert(objects[component[field].__id__], "目标卡缺少静态引用：" + field);
    }
    const expectedArt = [1, 2, 3, 4, "btn-reward-1"].map(name => JSON.parse(readFileSync(
        `client/assets/bundles/module/battle/ui/chapter-reward-lang_${name}.png.meta`, "utf8")).subMetas.f9941.uuid);
    assert.deepEqual(component.tipFrames.map((asset: any) => asset.__uuid__), expectedArt.slice(0, 4));
    assert.equal(objects[component.claimArtwork.__id__]._spriteFrame.__uuid__, expectedArt[4]);
    assert.equal(objects[component.progressTip.__id__].__type__, "cc.RichText");
    assert.equal(objects[objects[component.claimButton.__id__].node.__id__]._active, false);
    const anchor = objects[component.claimDotAnchor.__id__];
    assert.equal(anchor._active, true);
    assert.equal(anchor._parent.__id__, objects[component.claimButton.__id__].node.__id__);
    assert.equal(anchor._lpos.x, 68);
    assert.equal(anchor._lpos.y, 19);
    const transforms = anchor._components.map((ref: any) => objects[ref.__id__]);
    assert.deepEqual(transforms.map((row: any) => row.__type__), ["cc.UITransform"]);
    assert.equal(transforms[0]._contentSize.width, 23);
    assert.equal(transforms[0]._contentSize.height, 23);
    const main = objects.find((row: any) => row.challengeButton && row.idleClaimButton);
    assert.equal(objects[main.milestoneCard.__id__], component);
    const frame = objects.find((row: any) => row.__type__ === "cc.Node" && row._name === "MilestoneOriginalFrame");
    const sprite = frame._components.map((ref: any) => objects[ref.__id__]).find((row: any) => row.__type__ === "cc.Sprite");
    const meta = JSON.parse(readFileSync("client/assets/bundles/module/battle/atlas/chapter-reward_spr-item-bg-1.png.meta", "utf8"));
    assert.equal(sprite._spriteFrame.__uuid__, meta.uuid + "@f9941");
    assert.equal(sprite._color.a, 86);
    assert.equal(meta.subMetas.f9941.userData.rawWidth, 150);
    assert.equal(meta.subMetas.f9941.userData.rawHeight, 150);
}

/** 模拟原主线进度与已领集合，不把它交给真实服务或称为本次发奖。 */
function state(cleared: number, claimedIds: number[] = []): void {
    MainChapterModel.instance.state = { maxCleared: cleared, pendingBattleId: null, assetRevision: 9,
        challengeLimit: 20, milestoneProgress: { schemaVersion: 1, claimedIds } };
    RedDotManager.instance.setMany(MainChapterRedDotUtils.project(MainChapterModel.instance.state));
    EventDispatcher.instance.emit(MainChapterController.Updated, undefined);
}

/** 引擎节点替身只提供Prefab中的绑定类型，生命周期逻辑运行真实卡组件。 */
function card(): MainChapterMilestoneCard {
    const root = new Node("MilestoneCard");
    const value = root.addComponent(MainChapterMilestoneCard);
    value.rewardIcon = new Node("RewardIcon").addComponent(Sprite);
    value.rewardIcon.node.parent = root;
    value.heroHost = new Node("HeroHost"); value.heroHost.parent = root;
    value.rewardGlow = new Node("RewardGlow"); value.rewardGlow.parent = root;
    value.progressTip = new Node("ProgressTip").addComponent(RichText);
    value.tipBackdrop = new Node("TipBackdrop");
    value.tipArtwork = new Node("TipArtwork").addComponent(Sprite);
    value.tipFrames = Array.from({ length: 4 }, () => new SpriteFrame());
    value.progressLabel = new Node("ProgressLabel").addComponent(Label);
    value.claimButton = new Node("ClaimButton").addComponent(Button);
    value.claimArtwork = value.claimButton.node.addComponent(Sprite);
    value.claimLabel = new Node("ClaimLabel").addComponent(Label);
    value.claimDotAnchor = new Node("ClaimDotAnchor");
    value.claimDotAnchor.parent = value.claimButton.node;
    value.claimDotAnchor.addComponent(UITransform).setContentSize(23, 23);
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
    const originalLoad = PrefabLoader.loadPrefab;
    const prefab = Object.assign(new Prefab(), { _instantiate: () => {
        const node = new Node("RedDot");
        node.addComponent(UITransform).setContentSize(28, 28);
        return node;
    } });
    PrefabLoader.loadPrefab = async () => prefab;
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
        assert.equal(value.claimDotAnchor!.getChildByName("RedDot"), null);
        assert.equal(EventDispatcher.instance.listenerCount(MainChapterController.Updated), before + 1);
        assert.equal(actors.length, 1);
        assert.equal(actors[0].stem, "10105007");
        assert.equal(actors[0].scale, 0.5 * 0.67 * 0.8 * 1.42);
        assert.deepEqual(actors[0].gestures, ["stand"]);
        assert.equal(value.rewardIcon!.node.active, false, "原英雄骨架不应被图标覆盖");
        assert(value.progressTip!.string.includes("烈焰骑士"));
        assert(value.progressTip!.string.includes(">15<"));
        assert.equal(value.progressLabel!.string, "14/15");
        assert.equal(value.progressFill!.fillRange, 14 / 15);
        assert.equal(value.tipBackdrop!.active, true);
        assert.equal(value.claimButton!.node.active, false);
        assert.equal(value.tipArtwork!.spriteFrame, value.tipFrames[0]);
        let entries = 0;
        MainChapterController.instance.claimMilestone = async () => { entries++; };
        await (value as any).claim();
        assert.equal(entries, 0);
        assert(tips[0].includes("1关"));
        state(15);
        await new Promise<void>(resolve => setImmediate(resolve));
        const dot = value.claimDotAnchor!.getChildByName("RedDot");
        assert.equal(dot?.active, true);
        assert.equal(dot?.getComponent(UITransform)?.width, 23);
        assert.equal(RedDotManager.instance.isVisible(GameRedDotKey.BATTLE), true);
        assert.equal(actors.length, 1, "同目标快照不重复创建模型");
        assert.equal(value.rewardIcon!.node.active, false);
        assert.equal(value.claimButton!.node.active, true);
        assert.equal(value.claimArtwork!.enabled, true);
        assert.equal(value.claimLabel!.node.active, false);
        assert.equal(value.tipBackdrop!.active, false);
        assert.equal(value.progressFill!.node.parent!.active, false);
        let finish!: () => void;
        MainChapterController.instance.claimMilestone = async rewardId => {
            assert.equal(rewardId, 100);
            entries++;
            await new Promise<void>(done => { finish = done; });
        };
        const click = (value as any).claim();
        await (value as any).claim();
        assert.equal(entries, 1);
        assert.equal(value.claimArtwork!.enabled, false);
        assert.equal(value.claimLabel!.node.active, true);
        state(15, [100]);
        assert.equal(dot?.active, false);
        assert.equal(RedDotManager.instance.isVisible(GameRedDotKey.BATTLE), false);
        finish(); await click;
        assert.equal(actors[0].node.isValid, false, "切到物品目标须释放旧英雄节点");
        assert(value.progressTip!.string.includes("海量进阶石"));
        assert.equal(value.tipArtwork!.spriteFrame, value.tipFrames[1]);
        assert.equal(value.progressLabel!.string, "15/30");
        assert.equal(value.rewardIcon!.node.active, true);
        assert.equal(value.heroHost!.active, false);
        (value as any).onDisable();
        assert.equal(value.claimDotAnchor!.getChildByName("RedDot"), null);
        assert.equal(EventDispatcher.instance.listenerCount(MainChapterController.Updated), before);
        const previous = value.progressTip!.string;
        state(20, [100]);
        assert.equal(value.progressTip!.string, previous, "停用后不能继续收页面刷新");
        (value as any).onEnable();
        assert.equal(value.progressLabel!.string, "20/30");

        state(49, [100, 150]);
        assert.equal(value.progressLabel!.string, "49/50");
        assert(value.progressTip!.string.includes(">50<"));
        state(50, [100, 150]);
        assert.equal(value.claimArtwork!.enabled, true);
        MainChapterController.instance.claimMilestone = async rewardId => {
            assert.equal(rewardId, 200);
            state(50, [100, 150, 200]);
        };
        await (value as any).claim();
        assert.equal(value.progressLabel!.string, "50/80");
        assert(value.progressTip!.string.includes("绝世红武"));
        assert.equal(value.tipArtwork!.spriteFrame, value.tipFrames[2]);
        assert.equal(value.rewardIcon!.node.active, true);
        assert.equal(value.heroHost!.active, false);
        state(80, [100, 150, 200]);
        assert.equal(value.claimArtwork!.enabled, true);
        MainChapterController.instance.claimMilestone = async rewardId => {
            assert.equal(rewardId, 300);
            state(80, [100, 150, 200, 300]);
        };
        await (value as any).claim();
        assert.equal(value.progressLabel!.string, "80/110");
        assert(value.progressTip!.string.includes("章鱼公主"));
        assert.equal(value.tipArtwork!.spriteFrame, value.tipFrames[3]);

        state(140, [100, 150, 200, 300, 400, 500]);
        assert.equal(value.completed, true);
        assert(!value.claimDotAnchor!.getChildByName("RedDot")?.active);
        (value as any).onDisable();
        value.claimDotAnchor = null;
        (value as any).onEnable();
        state(15);
        assert.equal(value.claimButton!.node.active, true, "缺少红点时仍展示可领取状态");
        (value.claimButton as unknown as { node: Node | null }).node = null;
        assert.doesNotThrow(() => (value as any).onDisable());
        assert.equal(EventDispatcher.instance.listenerCount(MainChapterController.Updated), before);
        console.log("PASS milestone card: original frame/model, 15/50/80 rewards, next target and lifecycle");
    } finally {
        (value as any).onDisable();
        value.node.destroy();
        BattleSpineService.instance.mountBattleSpine = originalMount;
        ResManager.setSprite = originalPaint;
        UIManager.instance.toast = originalToast;
        MainChapterController.instance.claimMilestone = originalClaim;
        PrefabLoader.loadPrefab = originalLoad;
        model.reset();
        RedDotManager.instance.reset();
    }
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
