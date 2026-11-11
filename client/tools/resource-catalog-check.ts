/** 验证类型化资源加载复用请求、持有释放、失败重试与关闭后的迟到结果。 */
import { GameLog } from "../assets/scripts/core/GameLog";
import { strict as assert } from "node:assert";
import { resources, Node, Sprite, SpriteFrame } from "cc";
import { createAssetScope, ResourceAssetsUtils } from "../assets/scripts/framework/assets/ResourceAssets";
import { ResourceScopeClosed } from "../assets/scripts/framework/assets/ResourcePool";
import { BagItemCatalog } from "../assets/scripts/features/bag/utils/BagItemCatalog";
import { ResManager } from "../assets/scripts/framework/assets/ResManager";
import { readFileSync, existsSync, readdirSync } from "node:fs";

/** 核对源配置明确复用的图标，防止生成器再次按物品 ID 错报缺图或选错图。 */
function checkSharedItemIcons(): void {
    const rows = JSON.parse(readFileSync("client/assets/resources/config/item.json", "utf8")).rows;
    const source = (id: number) => BagItemCatalog.iconSource(rows.find((row: { idx: number }) => row.idx === id));
    assert.equal(source(900508), "icons/item/backpack_900505");
    assert.equal(source(901825), "icons/item/backpack_905311");
    assert.equal(source(904002), source(904001));
    assert(source(904002));
    assert.equal(source(900006), "icons/item/backpack_900006", "缺图不由清单拦截，交给实际加载报告");
    for (const row of rows) {
        const path = BagItemCatalog.iconSource(row);
        if (path && ![900006, 900303, 902038, 10505021].includes(row.idx)) {
            assert(existsSync("client/assets/resources/" + path + ".png"), "当前配置实际图片存在：" + row.idx);
        }
    }
    assert.equal(BagItemCatalog.iconSource(undefined), null);
    assert.equal(BagItemCatalog.iconSource({ idx: 1, icon: "../unknown" } as any), null);
    for (let quality = 0; quality <= 6; quality++) {
        assert.equal(ResManager.qualityFrame(quality), "ui/common/other_rare-" + quality);
    }
    assert.equal(ResManager.qualityFrame(NaN), ResManager.qualityFrame(0));
}

/** 从真实配置验证英雄、四槽技能、全部进化头像和装备路径；未知ID不猜图。 */
function checkHeroIconSources(): void {
    const rows = (name: string) => JSON.parse(readFileSync("client/assets/resources/config/" + name + ".json", "utf8")).rows;
    const verify = (source: string | null, expected: string) => {
        assert.equal(source, expected);
        assert(existsSync("client/assets/resources/" + expected + ".png"), expected);
    };
    for (const row of rows("herotype")) {
        if (row.item_id) {
            verify(ResManager.hero(row.item_id), "ui/hero/hero-icon_" + row.item_id);
        }
        for (let slot = 1; slot <= 4; slot++) {
            const id = row["skill_" + slot];
            if (id) {
                verify(ResManager.skill(id), "ui/hero/skill-icon_" + id);
            }
        }
    }
    for (const row of rows("skin")) {
        for (const skin of JSON.parse(row.skin)) {
            verify(ResManager.portrait(skin + 10000000), "ui/hero/hero-icon_" + (skin + 10000000));
        }
    }
    for (const row of rows("heroevolvelevel")) {
        verify(ResManager.portrait(row.evolve_icon_id), "ui/hero/hero-icon_" + row.evolve_icon_id);
    }
    for (const row of rows("equipmenttype")) {
        verify(ResManager.equipment(row.equipment_type), "icons/item/backpack_" + row.equipment_type);
    }
    for (const file of readdirSync("client/assets/resources/ui/hero")) {
        const match = /^head-icon_(\d+)\.png$/.exec(file);
        if (match) {
            verify(ResManager.head(Number(match[1])), "ui/hero/head-icon_" + match[1]);
        }
    }
    for (const row of rows("border")) {
        verify(ResManager.border(row.icon), row.icon === 0
            ? "ui/bag/backpack_border-default" : "icons/item/backpack_" + (1005000 + row.icon));
    }
    assert.equal(ResManager.head(999999999), "ui/hero/head-icon_999999999");
    assert.equal(ResManager.portrait(999999999), "ui/hero/hero-icon_999999999");
    assert.equal(ResManager.head(0), "ui/hero/head-icon_0");
    assert.equal(ResManager.border(0), "ui/bag/backpack_border-default");
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
    const prepared = createAssetScope();
    const descriptor = ResourceAssetsUtils.describe("resources", "ui/common/other_rare-4", "SpriteFrame");
    const preload = prepared.load(descriptor);
    const displayed = ResManager.getSpriteFrame(owner, descriptor.path);
    await flush();
    assert.equal(count, 1, "阶段描述与统一路径取图共用一次请求");
    const shared = new SpriteFrame();
    waiting.get(descriptor.loadPath)!(null, shared);
    assert.equal(await preload, await displayed);
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
    assert.equal(warnings.filter(text => text.includes("resources/fixture/missing") && text.includes("missing")).length, 1);
    ResManager.setSprite(owner, ["fixture/missing", "fixture/fallback"]);
    await flush();
    waiting.get("fixture/missing/spriteFrame")!(new Error("missing"));
    await flush();
    assert.equal(warnings.filter(text => text.includes("resources/fixture/missing")).length, 1, "同一路径失败只记录一次，即使回退成功也保留原因");
    stopWarnings();
    ResManager.setSprite(owner, "fixture/single");
    await flush();
    ResManager.setSprite(owner, null);
    waiting.get("fixture/single/spriteFrame")!(null, new SpriteFrame());
    await flush();
    assert.equal(image.spriteFrame, null, "清空图片后旧请求不得再次赋图");
    owner.destroy();
    prepared.dispose();
    assert.equal(shared.refCount, 0);
    assert.equal(ResourceAssetsUtils.snapshot().owners, 0);
}

/** 使用可控资源回调验证作用域边界，不把引擎替身视为真实渲染。 */
async function main(): Promise<void> {
    checkSharedItemIcons();
    checkHeroIconSources();
    let requests = 0, retained = 0, released = 0;
    const callbacks: Array<(error: Error | null, asset?: unknown) => void> = [];
    resources.load = (path: string, _type: unknown, callback: (error: Error | null, asset?: unknown) => void) => {
        assert.equal(path, "ui/common/button_btn-tab-24/spriteFrame");
        requests++; callbacks.push(callback);
    };
    const asset = { addRef: () => { retained++; }, decRef: () => { released++; } };
    const a = createAssetScope(), b = createAssetScope(), descriptor = ResourceAssetsUtils.describe("resources", "ui/common/button_btn-tab-24", "SpriteFrame");
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
