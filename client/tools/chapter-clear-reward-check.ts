/** 独立通关奖励专项，验证实际目录、服务端资格显示、按钮等待状态和预制体。 */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { Button, Node } from "cc";
import { GameConfig } from "../assets/scripts/config/GameConfig";
import { MainChapterModel } from "../assets/scripts/features/battle/MainChapterModel";
import { ChapterClearRewardCell } from "../assets/scripts/features/battle/ui/ChapterClearRewardCell";
import { ChapterClearRewardUtils } from "../assets/scripts/features/battle/utils/ChapterClearRewardUtils";
import { ConfigFixtureUtils } from "./ConfigFixtureUtils";

/** 使用主线快照入口验证已领与可领集合。 */
function state(maxCleared: number, claimedChapters: number[], eligibleChapters: number[]) {
    return MainChapterModel.readState({
        maxCleared, assetRevision: 3, challengeLimit: 20, pendingBattleId: null,
        milestoneProgress: { schemaVersion: 1, claimedIds: maxCleared >= 15 ? [1] : [] },
        firstRewardProgress: { schemaVersion: 1, claimedChapters, eligibleChapters },
    })!;
}

/** 用真实配置校验独立档位、领取按钮及开发回退关卡后的已领展示。 */
async function verifyList(): Promise<void> {
    const config = await ConfigFixtureUtils.installReal(new GameConfig());
    const entries = ChapterClearRewardUtils.config(config.getFileByPath("config/firstrewardchapter"));
    assert.deepEqual(entries.slice(0, 5).map(row => row.chapter), [1, 5, 10, 15, 20]);
    assert.deepEqual(entries[0].items, [{ itemId: 1001001, quantity: 1 }, { itemId: 1002001, quantity: 1 }]);

    const rows = ChapterClearRewardUtils.rows(entries, state(15, [1], [5, 10, 15]));
    assert.deepEqual(rows.slice(0, 4).map(row => [row.chapter, row.status]), [[5, "claim"], [10, "claim"], [15, "claim"], [20, "battle"]]);
    assert.equal(rows.length, entries.length);
    assert.equal(rows[rows.length - 1].status, "claimed");
    assert.equal(rows[rows.length - 1].chapter, 1);
    assert.equal(rows.find(row => row.chapter === 25)?.actionText, "暂未开放");
    assert(ChapterClearRewardUtils.rows(entries, null).every(row => !row.enabled));
    assert.throws(() => state(15, [15], [15]), /进度冲突/);
    assert.throws(() => state(1, [], [5]), /进度冲突/);
    const reset = ChapterClearRewardUtils.rows(entries, state(0, [1, 5], []));
    assert.deepEqual(reset.filter(row => row.status === "claimed").map(row => row.chapter), [1, 5]);
    assert(reset.filter(row => row.status === "claimed").every(row => !row.enabled));
    const waiting = ChapterClearRewardUtils.rows(entries, state(15, [1], [5, 10, 15]), 5);
    assert.equal(waiting.find(row => row.chapter === 5)?.actionText, "确认中");
    assert(waiting.filter(row => row.status === "claim").every(row => !row.enabled));
    assert.equal(ChapterClearRewardUtils.rows(entries, state(15, [1, 5], [10, 15]), 5)
        .find(row => row.chapter === 5)?.actionText, "已领取");
}

/** 在真实Prefab验证独立入口及原有两个窗口入口同在，列表绑定跟随实际Cell资源。 */
function verifyPrefabs(): void {
    const root = "client/assets/bundles/module/battle/prefabs/";
    const read = (name: string): any => JSON.parse(readFileSync(root + name, "utf8").replace(/^\uFEFF/, ""));
    const main = read("MainChapterView.prefab");
    const binding = main.find((row: any) => row.rewardInfoButton && row.milestoneCard);
    assert(binding);
    const button = main[binding.clearRewardButton.__id__];
    assert.equal(main[button.node.__id__]._name, "ChapterClearRewardButton");
    const anchor = main[binding.clearRewardDotAnchor.__id__];
    assert.equal(anchor._active, true);
    assert.equal(anchor._parent.__id__, button.node.__id__);
    assert.equal(anchor._lpos.x, 29);
    assert.equal(anchor._lpos.y, 29);
    const transforms = anchor._components.map((ref: any) => main[ref.__id__]);
    assert.deepEqual(transforms.map((row: any) => row.__type__), ["cc.UITransform"]);
    assert.equal(transforms[0]._contentSize.width, 23);
    assert.equal(transforms[0]._contentSize.height, 23);
    const prefab = read("ChapterClearRewardView.prefab");
    const cell = read("ChapterClearRewardCell.prefab.meta");
    assert(prefab.some((row: any) => row.cellPrefab?.__uuid__ === cell.uuid && row.virtual === true));
}

/** 模拟引擎先清理按钮组件的节点，再停用奖励行，验证其余退订仍执行。 */
function verifyDetachedButton(): void {
    const cell = new Node("ChapterClearRewardRow").addComponent(ChapterClearRewardCell);
    cell.action = new Node("ActionButton").addComponent(Button);
    const content = new Node("RewardContent");
    const state = cell as unknown as { content: Node | null; onDisable(): void };
    state.content = content;
    (cell.action as unknown as { node: Node | null }).node = null;

    assert.doesNotThrow(() => state.onDisable());
    assert.equal(state.content, null, "按钮节点已经释放时仍须解除内层列表监听");
}

/** 校验同源列表、按钮、停用顺序和实际预制体。 */
async function main(): Promise<void> {
    await verifyList();
    verifyPrefabs();
    verifyDetachedButton();
    console.log("通关奖励配置、服务端资格、按钮状态和Prefab检查通过");
}

void main().catch(error => { console.error(error); process.exitCode = 1; });
