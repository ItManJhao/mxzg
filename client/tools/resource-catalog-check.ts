/** 验证类型化资源加载复用请求、持有释放、失败重试与关闭后的迟到结果。 */
import { strict as assert } from "node:assert";
import { resources, Node, Sprite, SpriteFrame } from "cc";
import { createAssetScope, ResourceAssetsUtils } from "../assets/scripts/framework/assets/ResourceAssets";
import { ResourceCatalog } from "../assets/scripts/framework/assets/ResourceCatalog";
import { ResourceScopeClosed } from "../assets/scripts/framework/assets/ResourcePool";
import { BagItemCatalog } from "../assets/scripts/features/bag/utils/BagItemCatalog";
import { CommonUiResources } from "../assets/scripts/framework/assets/CommonUiResources";
import { paintSpritePaths } from "../assets/scripts/framework/kit/SpritePaint";
import { readFileSync, existsSync } from "node:fs";

/** 核对源配置明确复用的图标，防止生成器再次按物品 ID 错报缺图或选错图。 */
function checkSharedItemIcons(): void {
    const rows = JSON.parse(readFileSync("client/assets/resources/config/item.json", "utf8")).rows;
    const source = (id: number) => BagItemCatalog.iconSource(rows.find((row: { idx: number }) => row.idx === id));
    assert.equal(source(900508), "icons/item/backpack_900505");
    assert.equal(source(901825), "icons/item/backpack_905311");
    assert.equal(source(904002), source(904001));
    assert(source(904002));
    assert.equal(source(900006), null, "真实缺图保留占位，不冒充其他道具");
    for (const row of rows) {
        const path = BagItemCatalog.iconSource(row);
        if (path) {
            assert(existsSync("client/assets/resources/" + path + ".png"), "当前配置实际图片存在：" + row.idx);
        }
    }
    assert.equal(BagItemCatalog.iconSource(undefined), null);
    assert.equal(BagItemCatalog.iconSource({ idx: 1, icon: "../unknown" } as any), null);
    for (let quality = 0; quality <= 6; quality++) {
        assert.equal(CommonUiResources.qualityFrame(quality).path, "ui/common/other_rare-" + quality);
    }
    assert.equal(CommonUiResources.qualityFrame(NaN).path, CommonUiResources.qualityFrame(0).path);
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
    const prepared = createAssetScope();
    const descriptor = ResourceCatalog.common.other_rare_4;
    const preload = prepared.load(descriptor);
    const displayed = ResourceAssetsUtils.getSpriteFrame(owner, descriptor.path);
    await flush();
    assert.equal(count, 1, "阶段描述与统一路径取图共用一次请求");
    const shared = new SpriteFrame();
    waiting.get(descriptor.loadPath)!(null, shared);
    assert.equal(await preload, await displayed);
    paintSpritePaths(owner, ["fixture/old"]);
    await flush();
    paintSpritePaths(owner, ["fixture/new"]);
    await flush();
    const newer = new SpriteFrame();
    waiting.get("fixture/new/spriteFrame")!(null, newer);
    await flush();
    waiting.get("fixture/old/spriteFrame")!(null, new SpriteFrame());
    await flush();
    assert.equal(image.spriteFrame, newer, "列表复用后旧结果不能覆盖新图");
    let open = true;
    paintSpritePaths(owner, ["fixture/closed"], () => open);
    await flush();
    open = false;
    waiting.get("fixture/closed/spriteFrame")!(null, new SpriteFrame());
    await flush();
    assert.equal(image.spriteFrame, newer, "关页后不赋图");
    paintSpritePaths(owner, ["fixture/missing", "fixture/fallback"]);
    await flush();
    waiting.get("fixture/missing/spriteFrame")!(new Error("missing"));
    await flush();
    const fallback = new SpriteFrame();
    waiting.get("fixture/fallback/spriteFrame")!(null, fallback);
    await flush();
    assert.equal(image.spriteFrame, fallback);
    owner.destroy();
    prepared.dispose();
    assert.equal(shared.refCount, 0);
    assert.equal(ResourceAssetsUtils.snapshot().owners, 0);
}

/** 使用可控资源回调验证作用域边界，不把引擎替身视为真实渲染。 */
async function main(): Promise<void> {
    checkSharedItemIcons();
    let requests = 0, retained = 0, released = 0;
    const callbacks: Array<(error: Error | null, asset?: unknown) => void> = [];
    resources.load = (path: string, _type: unknown, callback: (error: Error | null, asset?: unknown) => void) => {
        assert.equal(path, ResourceCatalog.common.button_btn_tab_24.loadPath);
        requests++; callbacks.push(callback);
    };
    const asset = { addRef: () => { retained++; }, decRef: () => { released++; } };
    const a = createAssetScope(), b = createAssetScope(), descriptor = ResourceCatalog.common.button_btn_tab_24;
    const first = a.load(descriptor), shared = b.loadPath(descriptor.loadPath, "SpriteFrame");
    await Promise.resolve(); assert.equal(requests, 1, "目录UUID与动态路径解析为同一类型/路径，不重复持有");
    a.dispose(); const cancelled = assert.rejects(first, ResourceScopeClosed);
    callbacks.shift()!(null, asset);
    await cancelled; assert.equal(await shared, asset); assert.equal(retained, 1);
    b.dispose(); b.dispose(); assert.equal(released, 1);
    await assert.rejects(b.load(descriptor), ResourceScopeClosed);
    const retry = createAssetScope(), failure = retry.load(descriptor);
    await Promise.resolve(); callbacks.shift()!(new Error("missing"));
    await assert.rejects(failure, /missing/);
    const recovered = retry.load(descriptor);
    await Promise.resolve(); callbacks.shift()!(null, asset); await recovered;
    retry.dispose(); assert.equal(retained, 2); assert.equal(released, 2);
    await checkUnifiedSpriteEntry();
    console.log("resource-catalog-check passed: item config mapping, unified sprite entry, cache sharing, fallback and late-response guards");
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
