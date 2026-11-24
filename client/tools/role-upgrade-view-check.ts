/**
 * 通用升级窗口专项：核对同源下一功能查询、旧静态布局、真实历史等级和同回执复用。
 * 使用引擎替身检查列表、资源迟到与关闭清理，不写玩家资产，不将替身结果当Creator画面验收。
 */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { AudioClip, AudioSource, Label, Mask, Node, Prefab, RichText, Sprite, SpriteFrame, UITransform } from "cc";
import { ConfigFixtureUtils } from "./ConfigFixtureUtils";
import { GameConfig } from "../assets/scripts/config/GameConfig";
import { GameLog } from "../assets/scripts/core/GameLog";
import { GConfig } from "../assets/scripts/config/GConfig";
import type { RoleUpgradeFeatureRow } from "../assets/scripts/config/GConfig";
import { ResourceAssetsUtils } from "../assets/scripts/framework/assets/ResourceAssetsUtils";
import { ResManager } from "../assets/scripts/framework/assets/ResManager";
import { UIManager } from "../assets/scripts/framework/ui/UIManager";
import { UIRegistry } from "../assets/scripts/framework/ui/UIRegistry";
import { SuperContent } from "../assets/scripts/framework/ui/SuperContent";
import { SuperScroll } from "../assets/scripts/framework/ui/SuperScroll";
import { BagInfoView } from "../assets/scripts/features/bag/ui/BagInfoView";
import { BagItemView } from "../assets/scripts/features/bag/ui/BagItemView";
import type { RewardArgs } from "../assets/scripts/features/reward/data/RewardData";
import { RoleUpgradeView } from "../assets/scripts/features/reward/ui/RoleUpgradeView";
import { RoleUpgradeUtils } from "../assets/scripts/features/reward/utils/RoleUpgradeUtils";

/** 真实结果形状的本地显示夹具，不是联网领取或当前钱包。 */
const args: RewardArgs = {
    receiptId: "dabc0000-0000-4000-8000-000000000001",
    items: [{ itemId: 900002, credited: 10 }],
    roleUpgrade: { beforeLevel: 1, afterLevel: 2 },
};

/** 读取仓库的实际Prefab或meta，不另存一份布局清单。 */
function read(path: string): any {
    return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
}

/** 将正式脚本meta转换为Creator序列化类标识，避免只按类名检查绑定。 */
function classId(path: string): string {
    const hex = read(path).uuid.replace(/-/g, "");
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let value = hex.slice(0, 5);
    for (let index = 5; index < 32; index += 3) {
        const number = Number.parseInt(hex.slice(index, index + 3), 16);
        value += alphabet[number >> 6] + alphabet[number & 63];
    }
    return value;
}

/** 已生成候选按严格大于门槛查询，同值只检查最小门槛和候选集合，不伪称旧pairs固定顺序。 */
function checkNextFeature(): void {
    const config = GameConfig.instance;
    const rows = config.getConfig(GConfig.RoleUpgradeFeature);
    const language = (id: number | string) => config.getConfig(GConfig.Language, id)?.value;
    assert.equal(rows.length, 34, "旧客户端筛选集合不得被当前XLSX或已实现模块替换");
    for (const [level, atom] of [[2, "main_smith_shop"], [5, "main_pvp"], [8, "main_blessingpool"],
        [10, "main_pub_task"], [12, "main_mission"], [15, "main_fantasy_tower"]] as const) {
        const next = RoleUpgradeUtils.nextFeature(level, rows, language)!;
        assert.equal(next.atom, atom);
        assert(next.level > level && next.name && next.description);
        assert.equal(next.name, language(rows.find(row => row.atom === atom)!.name_lang!));
        assert(next.condition!.includes(String(next.level)));
        assert(!next.condition!.includes("<outline") && !next.condition!.includes("<font"));
    }
    for (const level of [16, 18, 32]) {
        const minimum = Math.min(...rows.filter(row => row.condition_value > level).map(row => row.condition_value));
        const next = RoleUpgradeUtils.nextFeature(level, rows, language)!;
        assert.equal(next.level, minimum);
        assert(rows.some(row => row.condition_value === minimum && row.atom === next.atom));
    }
    assert.equal(RoleUpgradeUtils.nextFeature(10000, rows, language), null);
    assert.throws(() => RoleUpgradeUtils.nextFeature(0, rows, language));
    assert.throws(() => RoleUpgradeUtils.levels(undefined));
    for (const change of [{ beforeLevel: 0, afterLevel: 2 }, { beforeLevel: 2, afterLevel: 2 },
        { beforeLevel: 3, afterLevel: 2 }, { beforeLevel: 1, afterLevel: 1.5 },
        { beforeLevel: 1, afterLevel: 0x100000000 }]) {
        assert.throws(() => RoleUpgradeUtils.levels(change));
    }
    const copied: RoleUpgradeFeatureRow[] = [{ id: "same-a", atom: "same-a", condition_value: 8,
        name_lang: 1, desc: 2 }, { id: "same-b", atom: "same-b", condition_value: 8, name_lang: 1, desc: 2 }];
    assert.equal(RoleUpgradeUtils.nextFeature(5, copied, () => "内容%s")!.atom, "same-a",
        "同门槛只保留源顺序，不增加额外业务优先级");
    assert.equal(RoleUpgradeUtils.nextFeature(8, copied, language), null, "恰好开启的功能不能再作为下一项");
    assert.equal(RoleUpgradeUtils.nextFeature(2, [{ id: "missing", atom: "missing", condition_value: 5 }], () => undefined)!.name, null,
        "缺失名称不能拿备注或原子标识伪装语言");
}

/** 静态主体保留旧640×550及关键层级；整笔反馈标题统一为本次获得，不将冷恢复基础奖励称为升级附赠。 */
function checkPrefab(): void {
    const objects = read("client/assets/bundles/module/common/prefabs/RoleUpgradeView.prefab");
    const component = objects.find((row: any) => row.__type__ === classId(
        "client/assets/scripts/features/reward/ui/RoleUpgradeView.ts.meta"));
    assert(component && component.beforeLevel && component.afterLevel && component.featureInfo && component.featureCondition);
    const panel = objects[component.panel.__id__];
    const panelSize = panel._components.map((ref: any) => objects[ref.__id__]).find((row: any) => row.__type__ === "cc.UITransform");
    assert.deepEqual(panelSize._contentSize, { __type__: "cc.Size", width: 640, height: 550 });
    const nodes = new Map<string, any>(objects.filter((row: any) => row.__type__ === "cc.Node").map((row: any) => [row._name, row]));
    const rewardsHeader = nodes.get("RewardsHeader")._components
        .map((ref: any) => objects[ref.__id__]).find((row: any) => row.__type__ === "cc.Label");
    assert.equal(rewardsHeader._string, "本次获得",
        "统一整笔反馈可包含基础奖励与附赠，静态标题不能将其误称为升级奖励");
    for (const [name, x, y] of [["Title", 0, 231], ["BeforeLevel", 18, 145], ["AfterLevel", 90, 145],
        ["LevelArrow", 52, 145], ["RewardsHeader", 0, 85], ["NextFeatureHeader", 0, -105],
        ["FeatureIcon", -148, -177], ["FeatureName", -78, -158], ["FeatureDescription", -78, -197],
        ["FeatureCondition", 85, -160]] as const) {
        assert.deepEqual(nodes.get(name)._lpos, { __type__: "cc.Vec3", x, y, z: 0 });
    }
    const background = nodes.get("Background");
    const backgroundSize = background._components.map((ref: any) => objects[ref.__id__]).find((row: any) => row.__type__ === "cc.UITransform");
    assert.deepEqual(backgroundSize._contentSize, { __type__: "cc.Size", width: 640, height: 500 },
        "旧根高550但底板preferedSize是500，标题保持在底板上沿附近");
    assert.equal(background._lpos.y, -25);
    const layout = objects.find((row: any) => row.cellPrefab && row.columns === 4);
    assert(layout.virtual && layout.centerShortLine && layout.overrideCellSize);
    assert.equal(layout.cellPrefab.__uuid__, read("client/assets/bundles/module/common/prefabs/BagItemView.prefab.meta").uuid);
    assert.equal(objects.filter((row: any) => row.__type__ === "cc.Mask").length, 1, "只有列表裁剪，不在Prefab堆模态蒙版");
    const scaleType = classId("client/assets/scripts/framework/ui/ViewportScale.ts.meta");
    assert(objects.some((row: any) => row.__type__ === scaleType && row.target.__id__ === component.panel.__id__ && row.designWidth === 640));
    assert.deepEqual(UIRegistry.viewSpecOf(RoleUpgradeView)!.modal, { mask: true, closeOnOutside: true });
    assert.equal(UIRegistry.viewSpecOf(RoleUpgradeView)!.hostId, "remake-modal");
    const expected = ["resources/maps/ui/map-bg-result-1", "module/common/ui/reward-layer-lang_spr-upgrade",
        "module/common/ui/win-bg_text-bg", "module/common/ui/reward-layer_spr-arrow",
        "module/common/ui/win-bg_block-bg-15", "module/common/ui/lang-1_close-tips", "module/home/ui/main-city_btn-login-8"];
    for (const path of expected) {
        const meta = read("client/assets/bundles/" + path + ".png.meta");
        const frame = Object.values(meta.subMetas).find((entry: any) => entry.importer === "sprite-frame") as any;
        assert(objects.some((row: any) => row._spriteFrame?.__uuid__ === frame.uuid), "未引用原图UUID：" + path);
    }
    const rich = objects[component.featureCondition.__id__];
    assert.equal(rich._handleTouchEvent, false, "功能预告只读，不随等级开放入口");
    const scroll = objects[component.rewards.__id__];
    const port = objects[objects[scroll.content.__id__]._parent.__id__];
    const portSize = port._components.map((ref: any) => objects[ref.__id__]).find((row: any) => row.__type__ === "cc.UITransform");
    assert.equal(portSize._contentSize.height, 134, "冷恢复多行奖励仅纵滚，不遮挡旧功能预告");
    assert.equal(nodes.get("Rewards")._lpos.y + portSize._contentSize.height / 2, 55,
        "奖励视口上沿仍是旧原点y330投影到550主体后的55");
}

/** 使用新Prefab的实际参数检查7项纵滚、末项可达与1至3项居中，业务页不手排Cell坐标。 */
function checkRewardScrolling(): void {
    const objects = read("client/assets/bundles/module/common/prefabs/RoleUpgradeView.prefab");
    const settings = objects.find((row: any) => row.cellPrefab && row.columns === 4);
    const createNode = (name: string, parent: Node | null): Node => {
        const node = new Node(name);
        const transform = node.addComponent(UITransform);
        transform.setContentSize(600, 134);
        transform.setAnchorPoint(0, 1);
        node.parent = parent;
        return node;
    };
    const host = createNode("Rewards", null);
    const port = createNode("view", host);
    port.addComponent(Mask);
    const content = createNode("content", port);
    const makeCell = (): Node => {
        const cell = new Node("RewardCell");
        const transform = cell.addComponent(UITransform);
        transform.setContentSize(124, 134);
        transform.setAnchorPoint(0.5, 0.5);
        return cell;
    };
    const template = new Prefab() as any;
    template.data = makeCell();
    template._instantiate = makeCell;
    const list = content.addComponent(SuperContent);
    for (const key of ["layoutType", "gridAxis", "columns", "rows", "spacingX", "spacingY", "paddingLeft",
        "paddingRight", "paddingTop", "paddingBottom", "virtual", "centerShortLine", "bufferLines",
        "overrideCellSize", "explicitCellSize"]) {
        (list as any)[key] = settings[key];
    }
    list.cellPrefab = template;
    const scroll = host.addComponent(SuperScroll);
    scroll.content = content;
    scroll.onEnable();
    (list as any).onEnable();
    try {
        for (const count of [1, 2, 3]) {
            list.setData(Array.from({ length: count }, (_, index) => index), (cell, row) => { cell.name = "Reward" + row; });
            const active = content.children.filter(cell => cell.active);
            assert.equal((active[0].position.x + active[count - 1].position.x) / 2, 300,
                "全部不足四项时由SuperContent在600宽视口居中");
        }
        const items = Array.from({ length: 7 }, (_, index) => index);
        list.setData(items, (cell, row) => { cell.name = "Reward" + row; });
        assert.equal(list.length, 7, "缩小视口不能截断真实明细");
        assert.equal(scroll.getMaxScrollOffset().y, 134, "七项两行可以纵滚一整行");
        scroll.restorePosition(scroll.getMaxScrollOffset());
        assert(content.children.some(cell => cell.active && cell.name === "Reward6"), "最后一项必须实际绑定到可达格子");
        assert.equal(scroll.readPosition().y, 134);
    } finally {
        list.clear();
        scroll.onDisable();
        template.data.destroy();
        host.destroy();
    }
}

/** 节点和列表只提供引擎能力，资源和页面生命周期仍执行真实RoleUpgradeView。 */
function fixture(): { view: RoleUpgradeView; root: Node; content: Node; paints: unknown[]; audio: { plays: number; stops: number } } {
    const root = new Node("RoleUpgradeTest");
    const view = root.addComponent(RoleUpgradeView);
    view.panel = new Node("Panel");
    view.panel.parent = root;
    for (const key of ["beforeLevel", "afterLevel", "emptyLabel", "featureName", "featureDescription"]) {
        const node = new Node(key);
        node.parent = view.panel;
        (view as any)[key] = node.addComponent(Label);
    }
    view.featureInfo = new Node("FeatureInfo");
    view.featureInfo.parent = view.panel;
    view.featureIcon = new Node("FeatureIcon").addComponent(Sprite);
    view.featureIcon.node.parent = view.featureInfo;
    view.featureCondition = new Node("FeatureCondition").addComponent(RichText);
    view.featureCondition.node.parent = view.featureInfo;
    const content = new Node("content");
    content.parent = view.panel;
    const paints: unknown[] = [];
    view.rewards = { list: { node: content, setData: (value: unknown) => paints.push(value) }, toStart: () => {} } as any;
    view.rewardAudio = root.addComponent(AudioSource);
    const audio = { plays: 0, stops: 0 };
    view.rewardAudio.play = () => { audio.plays++; };
    view.rewardAudio.stop = () => { audio.stops++; };
    return { view, root, content, paints, audio };
}

/** 等级、空奖励、同回执参数、子详情与单次关闭共用既有展示队列契约，不发网络请求。 */
async function checkLifecycle(): Promise<void> {
    const getFrame = ResManager.getSpriteFrame;
    const forNode = ResourceAssetsUtils.forNode;
    const prepare = GameConfig.instance.prepare;
    const openChild = UIManager.instance.openChild;
    const loaded: string[] = [];
    const selected: any[] = [];
    ResManager.getSpriteFrame = async (_node, source) => { loaded.push(String(source)); return new SpriteFrame(); };
    ResourceAssetsUtils.forNode = (() => ({ loadPath: async () => new AudioClip() })) as any;
    GameConfig.instance.prepare = async () => { throw new Error("页面不能另行准备配置"); };
    UIManager.instance.openChild = (async (...values: unknown[]) => { selected.push(values); }) as any;
    const page = fixture();
    let firstClosed = 0;
    let finalClosed = 0;
    let cleaned = false;
    try {
        page.view.runOpen({ ...args, onClosed: () => { firstClosed++; } });
        await page.view.whenReady();
        assert.equal(page.view.beforeLevel!.string, "1");
        assert.equal(page.view.afterLevel!.string, "2");
        assert.equal(page.view.panel!.active, true);
        assert.equal(page.audio.plays, 1);
        assert.equal(loaded[0], "home/ui/main-city_up-main_smith_shop");
        assert.equal(page.view.emptyLabel!.node.active, false);
        assert(page.view.featureCondition!.string.includes("5"));
        assert.equal(page.paints.length, 1);
        const cell = new Node("RewardCell");
        cell.parent = page.root;
        const bagCell = cell.addComponent(BagItemView);
        let shown: unknown[] = [];
        bagCell.show = (...values: unknown[]) => { shown = values; };
        page.content.emit(SuperContent.RENDER_ITEM, cell, { itemId: 900002, quantity: 10 });
        assert.equal((shown[0] as any).quantity, 10, "格子只显示本次实际量");
        page.content.emit(SuperContent.SELECT_ITEM, { itemId: 900002, quantity: 10 });
        await Promise.resolve();
        assert.equal(selected[0][0], page.view);
        assert.equal(selected[0][1], BagInfoView);
        assert.equal(selected[0][2].source, "description");
        (page.view as any).ownListener(() => { cleaned = true; });
        page.view.runOpen({ ...args, onClosed: () => { assert(cleaned); finalClosed++; } });
        page.view.runOpen(args);
        assert.equal(loaded.length, 1);
        assert.equal(page.audio.plays, 1, "同回执重入不能重播音效");
        assert.equal(page.paints.length, 1);
        assert.throws(() => page.view.onOpen({ ...args, roleUpgrade: { beforeLevel: 1, afterLevel: 3 } }));
        assert.throws(() => page.view.onOpen({ ...args, items: [{ itemId: 900002, credited: 11 }] }));
        page.view.runClose();
        assert.equal(finalClosed, 0, "关闭回调须等BaseView清理完成");
        await Promise.resolve();
        page.view.onClose();
        page.view.runDispose();
        await Promise.resolve();
        assert.equal(firstClosed, 0);
        assert.equal(finalClosed, 1);
        assert.equal(page.view.rewardAudio!.clip, null);
        assert.equal(page.view.featureIcon!.spriteFrame, null);
        const before = selected.length;
        page.content.emit(SuperContent.SELECT_ITEM, { itemId: 900002, quantity: 10 });
        assert.equal(selected.length, before, "关闭解除格子事件");
        const empty = fixture();
        try {
            empty.view.runOpen({ ...args, items: [] });
            await empty.view.whenReady();
            assert.equal(empty.view.emptyLabel!.node.active, true, "真实升级零奖励仍显示等级");
            assert.equal(empty.view.afterLevel!.string, "2");
            assert.deepEqual(empty.paints[0], []);
        } finally {
            empty.view.runDispose();
            empty.root.destroy();
        }
    } finally {
        page.view.runDispose();
        page.root.destroy();
        ResManager.getSpriteFrame = getFrame;
        ResourceAssetsUtils.forNode = forNode;
        GameConfig.instance.prepare = prepare;
        UIManager.instance.openChild = openChild;
    }
}

/** 图标缺失沿旧候选回退，关闭后的加载完成和音源异常都不能遗留奖励队列等待。 */
async function checkResourcesAndTeardown(): Promise<void> {
    const getFrame = ResManager.getSpriteFrame;
    const forNode = ResourceAssetsUtils.forNode;
    const sources: string[] = [];
    ResourceAssetsUtils.forNode = (() => ({ loadPath: async () => new AudioClip() })) as any;
    try {
        ResManager.getSpriteFrame = async (_node, source) => {
            sources.push(String(source));
            if (String(source).includes("_up-")) {
                throw new Error("up图缺失夹具");
            }
            return new SpriteFrame();
        };
        const fallback = fixture();
        try {
            fallback.view.runOpen(args);
            await fallback.view.whenReady();
            assert.deepEqual(sources, ["home/ui/main-city_up-main_smith_shop", "home/ui/main-city_icon-main_smith_shop"]);
            assert(fallback.view.featureIcon!.spriteFrame);
        } finally {
            fallback.view.runDispose();
            fallback.root.destroy();
        }
        let release: ((value: SpriteFrame) => void) | null = null;
        ResManager.getSpriteFrame = () => new Promise(resolve => { release = resolve; });
        const late = fixture();
        let closed = 0;
        late.view.runOpen({ ...args, onClosed: () => { closed++; } });
        late.view.runClose();
        release!(new SpriteFrame());
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
        assert.equal(closed, 1);
        assert.equal(late.audio.plays, 0);
        assert.equal(late.view.panel!.active, false);
        assert.equal(late.view.featureIcon!.spriteFrame, null);
        late.view.runDispose();
        late.root.destroy();
        ResManager.getSpriteFrame = async () => new SpriteFrame();
        for (const brokenAudio of [false, true]) {
            const destroying = fixture();
            let notified = 0;
            destroying.view.runOpen({ ...args, onClosed: () => { notified++; } });
            await destroying.view.whenReady();
            if (brokenAudio) {
                destroying.view.rewardAudio!.stop = () => { throw new Error("音源销毁夹具"); };
            } else {
                destroying.view.featureIcon!.isValid = false;
                destroying.view.rewardAudio!.isValid = false;
            }
            assert.doesNotThrow(() => destroying.view.onDestroy());
            await Promise.resolve();
            destroying.view.onDestroy();
            assert.equal(notified, 1);
            assert.equal(GameLog.shared.recent().filter(line => line.tag === "BaseView" && line.level === "error"
                && line.message.includes("音源销毁夹具")).length, brokenAudio ? 1 : 0);
            if (brokenAudio) {
                assert.equal(destroying.view.rewardAudio!.clip, null);
                assert.equal(destroying.view.featureIcon!.spriteFrame, null);
            }
            destroying.root.destroy();
        }
    } finally {
        ResManager.getSpriteFrame = getFrame;
        ResourceAssetsUtils.forNode = forNode;
    }
}

/** 从真实登录配置包读取数据，依次验证纯查询、Prefab和无资产副作用的完整窗口生命周期。 */
async function main(): Promise<void> {
    await ConfigFixtureUtils.installReal();
    checkNextFeature();
    checkPrefab();
    checkRewardScrolling();
    await checkLifecycle();
    await checkResourcesAndTeardown();
    console.log("PASS role upgrade old candidate projection, 640x550 prefab, credited-only list, zero-credit level display, repeat/late resource and close lifecycle");
}

void main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
