/**
 * 主线背景专项：执行真实MainChapterView切换代码与原850配置，检查成套替换、按需持有和迟到清理。
 * 只替换网络资源完成时机，不伪造地图归属、页面坐标或资产；真实Creator渲染另行复验。
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { Node, Sprite, SpriteFrame, UITransform } from "cc";
import { GameConfig } from "../assets/scripts/config/GameConfig";
import { MainChapterModel } from "../assets/scripts/features/battle/MainChapterModel";
import { MainChapterView } from "../assets/scripts/features/battle/ui/MainChapterView";
import { ChapterBackgroundUtils } from "../assets/scripts/features/battle/utils/ChapterBackgroundUtils";
import { ResourceAssetsUtils } from "../assets/scripts/framework/assets/ResourceAssetsUtils";
import { UIManager } from "../assets/scripts/framework/ui/UIManager";

/** 独立完成口，用于控制两张真实路径图片的到达先后。 */
interface PendingImage {
    /** 生产代码请求的Bundle/包内SpriteFrame路径。 */
    path: string;
    /** 释放该次图片Promise，不代替页面实际赋图。 */
    resolve(frame: SpriteFrame): void;
    /** 注入明确加载失败，验证候选持有被撤销。 */
    reject(error: Error): void;
}

/** 每次真实createAssetScope调用的观察记录，不保存游戏或账号状态。 */
interface ScopeRecord {
    /** 本候选作用域发出的所有加载。 */
    images: PendingImage[];
    /** 被页面dispose后为true；迟到结果仍可手动放行检查保护。 */
    disposed: boolean;
}

const table = JSON.parse(readFileSync("client/assets/bundles/resources/config/chapterreward.json", "utf8"));
const names = ["PalaceBackground", "PalaceBackgroundLoop", "PalaceFloor", "PalaceFloorLoop"];

/** 放行有限微任务，让真实Promise.all和迟到catch完成，不等待墙钟或帧动画。 */
async function flush(): Promise<void> {
    for (let index = 0; index < 12; index++) {
        await Promise.resolve();
    }
}

/** 全部关卡只认同源map字段；正式和挂机三套素材完整，pending不提前换到胜利后地图。 */
function checkCatalog(): void {
    for (const row of table.rows) {
        const state = { maxCleared: row.idx, pendingBattleId: null };
        const idle = ChapterBackgroundUtils.resolve(table, state, false);
        const formal = ChapterBackgroundUtils.resolve(table, state, true);
        assert.equal(idle.map, row.map);
        assert.equal(formal.map, row.map);
        for (const suffix of [row.map + ".jpg", "hang/" + row.map + "_B.jpg", "hang/" + row.map + "_F.png"]) {
            assert(existsSync("client/assets/bundles/resources/chapter/ui/" + suffix), "缺少真实地图：" + suffix);
        }
    }
    assert.equal(ChapterBackgroundUtils.resolve(table, null, false).stage, 1);
    assert.equal(ChapterBackgroundUtils.resolve(table, { maxCleared: 16, pendingBattleId: "pending" }, false).map, "map01");
    assert.equal(ChapterBackgroundUtils.resolve(table, { maxCleared: 16, pendingBattleId: null }, false).map, "map02");
    assert.equal(ChapterBackgroundUtils.resolve(table, { maxCleared: 51, pendingBattleId: "pending" }, false).map, "map03");
    assert.equal(ChapterBackgroundUtils.resolve(table, { maxCleared: 51, pendingBattleId: null }, false).map, "map04");
    assert.equal(ChapterBackgroundUtils.resolve(table, { maxCleared: 76, pendingBattleId: "pending" }, false).map, "map04");
    assert.equal(ChapterBackgroundUtils.resolve(table, { maxCleared: 76, pendingBattleId: null }, false).map, "map05");
    for (const [chapter, previous, next] of [[151, "map07", "map08"], [201, "map08", "map10"], [251, "map10", "map11"]] as const) {
        const pending = ChapterBackgroundUtils.resolve(table, { maxCleared: chapter, pendingBattleId: "pending" }, true);
        const settled = ChapterBackgroundUtils.resolve(table, { maxCleared: chapter, pendingBattleId: null }, false);
        assert.equal(pending.background, `chapter/ui/${previous}/spriteFrame`);
        assert.equal(settled.background, `chapter/ui/hang/${next}_B/spriteFrame`);
        assert.equal(settled.floor, `chapter/ui/hang/${next}_F/spriteFrame`);
    }
    assert.throws(() => ChapterBackgroundUtils.resolve({ rows: [] }, { maxCleared: 21, pendingBattleId: null }, false), /缺失/);
    assert.throws(() => ChapterBackgroundUtils.resolve({ rows: [{ idx: 1, map: "../map01" }] }, null, false), /缺失/);
    assert.throws(() => ChapterBackgroundUtils.resolve({ rows: [table.rows[0], table.rows[0]] }, null, false), /重复/);
}

/** 用真实View方法控制成套图片的到达、快速换图与关页，不依赖其他业务窗口或网络服务。 */
async function checkOwnership(): Promise<void> {
    const previousState = MainChapterModel.instance.state;
    const originalScope = ResourceAssetsUtils.createAssetScope;
    const originalConfig = GameConfig.instance.getFileByPath;
    const originalToast = UIManager.instance.toast;
    const scopes: ScopeRecord[] = [];
    const toasts: string[] = [];
    const view = new MainChapterView();
    view.node = new Node("ChapterBackgroundTest");
    const oldFrame = new SpriteFrame();
    for (const name of names) {
        const node = new Node(name);
        node.parent = view.node;
        node.addComponent(UITransform).setContentSize(640, 1280);
        node.addComponent(Sprite).spriteFrame = oldFrame;
    }
    ResourceAssetsUtils.createAssetScope = () => {
        const record: ScopeRecord = { images: [], disposed: false };
        scopes.push(record);
        return {
            loadPath: (path: string) => new Promise<SpriteFrame>((resolve, reject) => record.images.push({ path, resolve, reject })),
            dispose: () => { record.disposed = true; },
        } as any;
    };
    GameConfig.instance.getFileByPath = (() => table) as typeof originalConfig;
    UIManager.instance.toast = text => { toasts.push(text); };
    const refresh = () => (view as any).refreshChapterBackground();
    const paint = (record: ScopeRecord) => record.images.forEach(image => image.resolve(
        Object.assign(new SpriteFrame(), { name: image.path })));
    try {
        MainChapterModel.instance.state = { maxCleared: 1, pendingBattleId: null, assetRevision: 1 };
        refresh();
        assert.deepEqual(scopes[0].images.map(image => image.path), [
            "chapter/ui/hang/map01_B/spriteFrame", "chapter/ui/hang/map01_F/spriteFrame"]);
        scopes[0].images[0].resolve(new SpriteFrame());
        await flush();
        assert(names.every(name => view.node.getChildByName(name)!.getComponent(Sprite)!.spriteFrame === oldFrame),
            "远景先到时不能只替换半套图片");
        scopes[0].images[1].resolve(new SpriteFrame());
        await flush();
        MainChapterModel.instance.state = { maxCleared: 16, pendingBattleId: "pending", assetRevision: 2 };
        refresh();
        assert.equal(scopes.length, 1, "同地图和待结算进度不能提前重载");
        MainChapterModel.instance.state = { maxCleared: 16, pendingBattleId: null, assetRevision: 3 };
        refresh();
        const map3 = table.rows.find((row: any) => row.map === "map03");
        MainChapterModel.instance.state = { maxCleared: map3.idx, pendingBattleId: null, assetRevision: 4 };
        refresh();
        assert(scopes[1].disposed, "后来的地图应撤销前一候选持有");
        paint(scopes[1]);
        await flush();
        assert(!scopes[0].disposed, "最新图片未就绪前原正在显示的持有不能释放");
        paint(scopes[2]);
        await flush();
        assert(scopes[0].disposed);
        assert.equal(view.node.getChildByName(names[0])!.getComponent(Sprite)!.spriteFrame!.name,
            "chapter/ui/hang/map03_B/spriteFrame");
        (view as any).playing = true;
        refresh();
        assert.deepEqual(scopes[3].images.map(image => image.path), ["chapter/ui/map03/spriteFrame"]);
        paint(scopes[3]);
        await flush();
        assert(view.node.getChildByName("PalaceBackground")!.active);
        for (const name of names.slice(1)) {
            assert(!view.node.getChildByName(name)!.active, "正式整图不应叠加循环远景或地板");
        }
        (view as any).playing = false;
        refresh();
        view.onClose();
        assert(scopes[3].disposed && scopes[4].disposed);
        paint(scopes[4]);
        await flush();
        assert(names.every(name => view.node.getChildByName(name)!.getComponent(Sprite)!.spriteFrame === null));
        assert.deepEqual(toasts, [], "已关闭页面的迟到图片不能追加提示或画面");
    } finally {
        view.onClose();
        view.node.destroy();
        MainChapterModel.instance.state = previousState;
        ResourceAssetsUtils.createAssetScope = originalScope;
        GameConfig.instance.getFileByPath = originalConfig;
        UIManager.instance.toast = originalToast;
    }
}

/** 执行同源资源与真实View生命周期检查，失败由统一入口返回非零状态。 */
async function main(): Promise<void> {
    checkCatalog();
    await checkOwnership();
    console.log("PASS chapter backgrounds: all source maps, pending settlement, atomic replacement and late/close ownership");
}

void main().catch(error => { console.error(error); process.exitCode = 1; });
