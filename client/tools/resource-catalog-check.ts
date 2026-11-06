/** 验证类型化资源加载复用请求、持有释放、失败重试与关闭后的迟到结果。 */
import { strict as assert } from "node:assert";
import { resources } from "cc";
import { createAssetScope } from "../assets/scripts/framework/assets/ResourceAssets";
import { ResourceCatalog } from "../assets/scripts/framework/assets/ResourceCatalog";
import { ResourceScopeClosed } from "../assets/scripts/framework/assets/ResourcePool";
import { ItemIconById } from "../assets/scripts/framework/assets/IconCatalog";

/** 核对源配置明确复用的图标，防止生成器再次按物品 ID 错报缺图或选错图。 */
function checkSharedItemIcons(): void {
    assert.equal(ItemIconById[900508]?.path, "ui/bag/backpack_900505");
    assert.equal(ItemIconById[901825]?.path, "ui/bag/backpack_905311");
    assert.equal(ItemIconById[904002]?.uuid, ItemIconById[904001]?.uuid);
    assert(ItemIconById[904002], "复用图标必须实际登记，不能两个 undefined 相等");
    assert.equal(ItemIconById[900006], undefined, "真实缺图不得以其他道具图片冒充");
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
    console.log("resource-catalog-check passed");
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
