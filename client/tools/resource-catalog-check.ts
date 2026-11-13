/** 验证资源路径及统一取图：复用原池请求，单图换绑释放旧拥有者，取消/销毁拒绝迟到结果。
 * 仅使用可控引擎替身检查引用与异步顺序，不代表实际GPU内存或浏览器画面验收。
 */
import { GameLog } from "../assets/scripts/core/GameLog";
import { strict as assert } from "node:assert";
import { resources, Node, Sprite, SpriteFrame } from "cc";
import { ResourceAssetsUtils } from "../assets/scripts/framework/assets/ResourceAssetsUtils";
import { ResourceScopeClosed } from "../assets/scripts/framework/assets/ResourcePool";
import { BagItemCatalog } from "../assets/scripts/features/bag/utils/BagItemCatalog";
import { ResManager } from "../assets/scripts/framework/assets/ResManager";
import { readFileSync, existsSync, readdirSync } from "node:fs";

/** 离线检查按原Bundle名定位真实源目录，不让测试再次维护资源/模块分组名单。 */
const { resolveBundleFile } = require(process.cwd() + "/tools/bundle-paths.cjs") as {
    resolveBundleFile(path: string): string;
};

/** 两个源父分组不参与加载身份，且保留原逻辑地址与严格路径边界。 */
function checkResourceAddresses(): void {
    assert.deepEqual(ResourceAssetsUtils.address("bundles/module/bag/prefabs/BagView", "Prefab"),
        ResourceAssetsUtils.address("bag/prefabs/BagView", "Prefab"));
    assert.deepEqual(ResourceAssetsUtils.address("bundles/resources/config/item", "JsonAsset"),
        ResourceAssetsUtils.address("config/item", "JsonAsset"));
    const image = ResourceAssetsUtils.sprite("bundles/module/hero/ui/hero-icon_1");
    assert.equal(image.bundle, "hero");
    assert.equal(image.loadPath, "ui/hero-icon_1/spriteFrame");
    assert.equal(image.assetPath, "bundles/module/hero/ui/hero-icon_1", "显式源地址保留用于诊断");
    assert.equal(ResourceAssetsUtils.describe("new-fixture", "asset", "Asset").assetPath, "new-fixture/asset",
        "未知包不依赖额外分组表，默认只记录原逻辑地址");
    for (const path of ["bundles/module/bag", "bundles/resources", "bundles/bag/prefabs/BagView",
        "bundles/module/bag/../BagView", "bundles/resources//item", "bag/", "bag\\prefabs/BagView"]) {
        assert.throws(() => ResourceAssetsUtils.address(path, "Prefab"), /资源|路径/, path);
    }
}

/** 核对源配置明确复用的图标，防止生成器再次按物品 ID 错报缺图或选错图。 */
function checkSharedItemIcons(): void {
    const rows = JSON.parse(readFileSync("client/assets/bundles/resources/config/item.json", "utf8")).rows;
    const source = (id: number) => BagItemCatalog.iconSource(rows.find((row: { idx: number }) => row.idx === id));
    assert.equal(source(900508), "icons/item/backpack_900505");
    assert.equal(source(901825), "icons/item/backpack_905311");
    assert.equal(source(904002), source(904001));
    assert(source(904002));
    assert.equal(source(900006), "icons/item/backpack_900006", "缺图不由清单拦截，交给实际加载报告");
    for (const row of rows) {
        const path = BagItemCatalog.iconSource(row);
        if (path && ![900006, 900303, 902038, 10505021].includes(row.idx)) {
            assert(existsSync(resolveBundleFile(path + ".png")), "当前配置实际图片存在：" + row.idx);
        }
    }
    assert.equal(BagItemCatalog.iconSource(undefined), null);
    assert.equal(BagItemCatalog.iconSource({ idx: 1, icon: "../unknown" } as any), null);
    for (let quality = 0; quality <= 6; quality++) {
        assert.equal(ResManager.qualityFrame(quality), "common/ui/other_rare-" + quality);
    }
    assert.equal(ResManager.qualityFrame(NaN), ResManager.qualityFrame(0));
}

/** 从真实配置验证英雄、四槽技能、全部进化头像和装备路径；未知ID不猜图。 */
function checkHeroIconSources(): void {
    const rows = (name: string) => JSON.parse(readFileSync("client/assets/bundles/resources/config/" + name + ".json", "utf8")).rows;
    const verify = (source: string | null, expected: string) => {
        assert.equal(source, expected);
        assert(existsSync(resolveBundleFile(expected + ".png")), expected);
    };
    for (const row of rows("herotype")) {
        if (row.item_id) {
            verify(ResManager.hero(row.item_id), "hero/ui/hero-icon_" + row.item_id);
        }
        for (let slot = 1; slot <= 4; slot++) {
            const id = row["skill_" + slot];
            if (id) {
                verify(ResManager.skill(id), "hero/ui/skill-icon_" + id);
            }
        }
    }
    for (const row of rows("skin")) {
        for (const skin of JSON.parse(row.skin)) {
            verify(ResManager.portrait(skin + 10000000), "hero/ui/hero-icon_" + (skin + 10000000));
        }
    }
    for (const row of rows("heroevolvelevel")) {
        verify(ResManager.portrait(row.evolve_icon_id), "hero/ui/hero-icon_" + row.evolve_icon_id);
    }
    for (const row of rows("equipmenttype")) {
        verify(ResManager.equipment(row.equipment_type), "icons/item/backpack_" + row.equipment_type);
    }
    for (const file of readdirSync("client/assets/bundles/module/hero/ui")) {
        const match = /^head-icon_(\d+)\.png$/.exec(file);
        if (match) {
            verify(ResManager.head(Number(match[1])), "hero/ui/head-icon_" + match[1]);
        }
    }
    for (const row of rows("border")) {
        verify(ResManager.border(row.icon), row.icon === 0
            ? "bag/ui/backpack_border-default" : "icons/item/backpack_" + (1005000 + row.icon));
    }
    assert.equal(ResManager.head(999999999), "hero/ui/head-icon_999999999");
    assert.equal(ResManager.portrait(999999999), "hero/ui/hero-icon_999999999");
    assert.equal(ResManager.head(0), "hero/ui/head-icon_0");
    assert.equal(ResManager.border(0), "bag/ui/backpack_border-default");
    for (const id of [-1, NaN, 1.5]) {
        assert.equal(ResManager.head(id), null);
        assert.equal(ResManager.border(id), null);
    }
    for (const id of [0, -1, NaN, 1.5]) {
        assert.equal(ResManager.hero(id), null);
        assert.equal(ResManager.portrait(id), null);
        assert.equal(ResManager.skill(id), null);
        assert.equal(ResManager.equipment(id), null);
    }
}

/** 推进资源池与赋图Promise链，测试不依赖定时器。 */
async function flush(): Promise<void> {
    for (let index = 0; index < 20; index++) {
        await Promise.resolve();
    }
}

/** 验证统一入口复用预加载，列表迟到不串图、关页不赋图、失败回退与节点销毁释放。 */
async function checkUnifiedSpriteEntry(): Promise<void> {
    const waiting = new Map<string, Function>();
    let count = 0;
    resources.load = ((path: string, _type: unknown, done: Function) => {
        count++;
        waiting.set(path, done);
    }) as any;
    const owner = new Node("ImageOwner");
    const image = owner.addComponent(Sprite);
    const prepared = ResourceAssetsUtils.createAssetScope();
    const physical = ResourceAssetsUtils.createAssetScope();
    const descriptor = ResourceAssetsUtils.describe("common", "ui/other_rare-4", "SpriteFrame");
    const preload = prepared.load(descriptor);
    const displayed = ResManager.getSpriteFrame(owner, "bundles/module/common/" + descriptor.path);
    const physicalLoad = physical.loadPath("bundles/module/common/" + descriptor.loadPath, "SpriteFrame");
    await flush();
    assert.equal(count, 1, "阶段描述与统一路径取图共用一次请求");
    const shared = new SpriteFrame();
    waiting.get(descriptor.bundle + "/" + descriptor.loadPath)!(null, shared);
    assert.equal(await preload, await displayed);
    assert.equal(await physicalLoad, shared, "源物理路径与逻辑描述共享同一资源记录");
    ResManager.setSprite(owner, ["fixture/old"]);
    await flush();
    ResManager.setSprite(owner, ["fixture/new"]);
    await flush();
    const newer = new SpriteFrame();
    waiting.get("fixture/new/spriteFrame")!(null, newer);
    await flush();
    waiting.get("fixture/old/spriteFrame")!(null, new SpriteFrame());
    await flush();
    assert.equal(image.spriteFrame, newer, "列表复用后旧结果不能覆盖新图");
    let open = true;
    ResManager.setSprite(owner, ["fixture/closed"], () => open);
    await flush();
    open = false;
    waiting.get("fixture/closed/spriteFrame")!(null, new SpriteFrame());
    await flush();
    assert.equal(image.spriteFrame, newer, "关页后不赋图");
    const warnings: string[] = [];
    const stopWarnings = GameLog.shared.subscribe(line => warnings.push(line.message));
    ResManager.setSprite(owner, ["fixture/missing", "fixture/fallback"]);
    await flush();
    waiting.get("fixture/missing/spriteFrame")!(new Error("missing"));
    await flush();
    const fallback = new SpriteFrame();
    waiting.get("fixture/fallback/spriteFrame")!(null, fallback);
    await flush();
    assert.equal(image.spriteFrame, fallback);
    assert.equal(warnings.filter(text => text.includes("fixture/missing") && text.includes("missing")).length, 1);
    ResManager.setSprite(owner, ["bundles/module/fixture/missing", "fixture/fallback"]);
    await flush();
    waiting.get("fixture/missing/spriteFrame")!(new Error("missing"));
    await flush();
    assert.equal(warnings.filter(text => text.includes("fixture/missing")).length, 1,
        "源路径与逻辑键的同一资源失败只记录一次，即使回退成功也保留原因");
    stopWarnings();
    ResManager.setSprite(owner, "fixture/single");
    await flush();
    ResManager.setSprite(owner, null);
    waiting.get("fixture/single/spriteFrame")!(null, new SpriteFrame());
    await flush();
    assert.equal(image.spriteFrame, null, "清空图片后旧请求不得再次赋图");
    owner.destroy();
    prepared.dispose();
    physical.dispose();
    assert.equal(shared.refCount, 0);
    assert.equal(ResourceAssetsUtils.snapshot().owners, 0);
}

/** 验证有限Cell反复赋图只保留当前/在途图片，同图复用且不改变显式节点取图的生命周期。 */
async function checkSpriteOwnership(): Promise<void> {
    const waiting = new Map<string, Function>();
    const requests = new Map<string, number>();
    resources.load = ((path: string, _type: unknown, done: Function) => {
        requests.set(path, (requests.get(path) || 0) + 1);
        waiting.set(path, done);
    }) as any;
    const owner = new Node("ReusedCellImage");
    const image = owner.addComponent(Sprite);
    const explicit = ResManager.getSpriteFrame(owner, "fixture-owner/explicit");
    await flush();
    const explicitFrame = new SpriteFrame();
    waiting.get("fixture-owner/explicit/spriteFrame")!(null, explicitFrame);
    await explicit;
    ResManager.setSprite(owner, "fixture-owner/explicit");
    await flush();
    assert.equal(requests.get("fixture-owner/explicit/spriteFrame"), 1, "显式持有与赋图继续共享资源池");
    ResManager.setSprite(owner, null);
    assert.equal(explicitFrame.refCount, 1, "清空赋图不撤回getSpriteFrame的节点持有");

    let oldDisplayValid = true;
    ResManager.setSprite(owner, "fixture-owner/a", () => oldDisplayValid);
    await flush();
    oldDisplayValid = false;
    ResManager.setSprite(owner, ResourceAssetsUtils.describe("fixture-owner", "a", "SpriteFrame"));
    await flush();
    assert.equal(requests.get("fixture-owner/a/spriteFrame"), 1, "相同在途地址合并并更新有效性判断");
    const a = new SpriteFrame();
    waiting.get("fixture-owner/a/spriteFrame")!(null, a);
    await flush();
    assert.equal(image.spriteFrame, a, "相同在途请求采用最新有效性判断");
    ResManager.setSprite(owner, ["fixture-owner/a"]);
    await flush();
    assert.equal(requests.get("fixture-owner/a/spriteFrame"), 1, "当前同图重复赋值不重新请求");
    assert.equal(a.refCount, 1);
    const sameImageOwners = ResourceAssetsUtils.snapshot();
    image.spriteFrame = null;
    ResManager.setSprite(owner, "fixture-owner/a");
    assert.equal(image.spriteFrame, a, "调用方先清空时，同key图片同步恢复，不等待微任务闪空");
    assert.equal(requests.get("fixture-owner/a/spriteFrame"), 1, "同key恢复不新增请求");
    assert.deepEqual(ResourceAssetsUtils.snapshot(), sameImageOwners, "同key同步恢复不新增作用域或拥有者");

    ResManager.setSprite(owner, "fixture-owner/b");
    await flush();
    assert.equal(image.spriteFrame, a, "新图加载时继续显示旧图");
    assert.equal(a.refCount, 1, "新图接替前旧图仍有持有保护");
    ResManager.setSprite(owner, "fixture-owner/c");
    await flush();
    const b = new SpriteFrame();
    waiting.get("fixture-owner/b/spriteFrame")!(null, b);
    await flush();
    assert.equal(b.refCount, 0, "被替换在途请求的迟到图片不保留拥有者");
    assert.equal(image.spriteFrame, a);
    const c = new SpriteFrame();
    waiting.get("fixture-owner/c/spriteFrame")!(null, c);
    await flush();
    assert.equal(image.spriteFrame, c);
    assert.equal(a.refCount, 0, "新图赋值后立即释放旧显示作用域");

    let displayed = true;
    ResManager.setSprite(owner, "fixture-owner/d", () => displayed);
    await flush();
    const d = new SpriteFrame();
    waiting.get("fixture-owner/d/spriteFrame")!(null, d);
    await flush();
    assert.equal(c.refCount, 0);
    displayed = false;
    ResManager.setSprite(owner, "fixture-owner/ignored", () => displayed);
    await flush();
    assert.equal(requests.get("fixture-owner/ignored/spriteFrame"), undefined, "失效条目不发新请求");
    assert.equal(image.spriteFrame, null);
    assert.equal(d.refCount, 0, "已失效显示及时清空并释放拥有者");

    ResManager.setSprite(owner, "fixture-owner/e");
    await flush();
    const e = new SpriteFrame();
    waiting.get("fixture-owner/e/spriteFrame")!(null, e);
    await flush();
    ResManager.setSprite(owner, ["fixture-owner/missing", "fixture-owner/e"]);
    await flush();
    waiting.get("fixture-owner/missing/spriteFrame")!(new Error("fixture missing"));
    await flush();
    assert.equal(image.spriteFrame, e, "失败回退到当前图时继续显示且不闪空");
    assert.equal(requests.get("fixture-owner/e/spriteFrame"), 1, "回退到当前图不重新下载");
    assert.equal(ResourceAssetsUtils.snapshot().owners, 2, "反复换图只剩当前显示与显式节点持有");

    let currentFrame = e;
    let currentPath = "fixture-owner/e";
    for (let index = 0; index < 64; index++) {
        currentPath = "fixture-owner/rebind-" + index;
        ResManager.setSprite(owner, currentPath);
        await flush();
        assert.equal(currentFrame.refCount, 1, "每轮加载期间旧显示仍受保护");
        assert.equal(ResourceAssetsUtils.snapshot().owners, 3, "在途期间只有显式、当前与在途三份持有");
        const frame = new SpriteFrame();
        waiting.get(currentPath + "/spriteFrame")!(null, frame);
        await flush();
        assert.equal(currentFrame.refCount, 0, "每轮换绑撤回历史图片");
        currentFrame = frame;
        assert.equal(ResourceAssetsUtils.snapshot().owners, 2);
        assert.equal(ResourceAssetsUtils.snapshot().scopes, 2, "64轮重绑不累积作用域");
    }
    const other = new Node("OtherCellImage");
    const otherImage = other.addComponent(Sprite);
    ResManager.setSprite(other, currentPath);
    await flush();
    assert.equal(otherImage.spriteFrame, currentFrame);
    assert.equal(requests.get(currentPath + "/spriteFrame"), 1, "不同图片节点仍共享资源池请求");
    ResManager.setSprite(owner, null);
    assert.equal(currentFrame.refCount, 1, "一份赋图释放不影响其他节点显示");
    other.destroy();
    assert.equal(currentFrame.refCount, 0);

    ResManager.setSprite(owner, "fixture-owner/visible-before-destroy");
    await flush();
    const visible = new SpriteFrame();
    waiting.get("fixture-owner/visible-before-destroy/spriteFrame")!(null, visible);
    await flush();
    ResManager.setSprite(owner, "fixture-owner/destroyed");
    await flush();
    owner.destroy();
    assert.equal(visible.refCount, 0, "销毁节点释放当前显示");
    assert.equal(explicitFrame.refCount, 0, "显式取图仍仅随节点销毁释放");
    const destroyed = new SpriteFrame();
    waiting.get("fixture-owner/destroyed/spriteFrame")!(null, destroyed);
    await flush();
    assert.equal(destroyed.refCount, 0, "节点销毁后的迟到图片由原池回收");
    assert.equal(ResourceAssetsUtils.snapshot().owners, 0);
    assert.equal(ResourceAssetsUtils.snapshot().scopes, 0);
}

/** 使用可控资源回调验证作用域边界，不把引擎替身视为真实渲染。 */
async function main(): Promise<void> {
    checkResourceAddresses();
    checkSharedItemIcons();
    checkHeroIconSources();
    let requests = 0, retained = 0, released = 0;
    const callbacks: Array<(error: Error | null, asset?: unknown) => void> = [];
    resources.load = (path: string, _type: unknown, callback: (error: Error | null, asset?: unknown) => void) => {
        assert.equal(path, "common/ui/button_btn-tab-24/spriteFrame");
        requests++; callbacks.push(callback);
    };
    const asset = { addRef: () => { retained++; }, decRef: () => { released++; } };
    const a = ResourceAssetsUtils.createAssetScope(), b = ResourceAssetsUtils.createAssetScope(), descriptor = ResourceAssetsUtils.describe("common", "ui/button_btn-tab-24", "SpriteFrame");
    const first = a.load(descriptor), shared = b.loadPath(descriptor.bundle + "/" + descriptor.loadPath, "SpriteFrame");
    await flush(); assert.equal(requests, 1, "目录UUID与动态路径解析为同一类型/路径，不重复持有");
    a.dispose(); const cancelled = assert.rejects(first, ResourceScopeClosed);
    callbacks.shift()!(null, asset);
    await cancelled; assert.equal(await shared, asset); assert.equal(retained, 1);
    b.dispose(); b.dispose(); assert.equal(released, 1);
    await assert.rejects(b.load(descriptor), ResourceScopeClosed);
    const retry = ResourceAssetsUtils.createAssetScope(), failure = retry.load(descriptor);
    await flush(); callbacks.shift()!(new Error("missing"));
    await assert.rejects(failure, /missing/);
    const recovered = retry.load(descriptor);
    await flush(); callbacks.shift()!(null, asset); await recovered;
    retry.dispose(); assert.equal(retained, 2); assert.equal(released, 2);
    await checkUnifiedSpriteEntry();
    await checkSpriteOwnership();
    console.log("resource-catalog-check passed: item config mapping, unified sprite entry, bounded display ownership, shared cache, fallback and late-response guards");
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
