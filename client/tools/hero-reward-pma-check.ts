/**
 * 原英雄获得Spine的PNG预乘专项：直接执行BattleSpineService命名骨骼入口，检查显式范围与原池生命周期。
 * 核原PNG不变、采样只预乘纹理Alpha、原slot混合不变；替身只记录材质，不冒充Creator真实混合结果。
 */
import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { EffectAsset, Material, Node, sp } from "cc";
import { ResourceAssetsUtils } from "../assets/scripts/framework/assets/ResourceAssetsUtils";
import { BattleSpineService } from "../assets/scripts/features/battle/ui/BattleSpineService";

/** 当前同源PNG/slot与旧引擎输入证据，不引入运行时资源清单。 */
const evidence = JSON.parse(readFileSync("docs/validation/hero-reward-pma-20261117.json", "utf8"));

/** 静态依据必须与原文件一致；数值例子区分旧预乘、直接false的暗罩和仅true的过亮。 */
function checkSource(): void {
    for (const row of evidence.files) {
        const bytes = readFileSync(row.path);
        assert.equal(createHash("sha256").update(bytes).digest("hex"), row.sha256);
        if (row.legacyPath) assert.deepEqual(bytes, readFileSync(row.legacyPath), "原PNG不可重写来遮盖混合问题");
    }
    const shader = readFileSync("client/assets/bundles/resources/effects/legacy-spine-pma.effect", "utf8");
    assert.equal((shader.match(/texColor\.rgb \*= texColor\.a/g) || []).length, 1);
    assert(shader.includes("#if TWO_COLORED") && shader.includes("v_dark.rgb + texColor.rgb * v_light.rgb"));
    assert(!/o\.rgb\s*\*=\s*o\.a/.test(shader), "slot/节点PMA已经在顶点色里，不能再乘最终alpha");
    const color = 247 / 255, alpha = 20 / 255, slotAlpha = 210 / 255, background = 0.5;
    const source = color * alpha * slotAlpha;
    const expected = source + background * (1 - source);
    const actual = color * alpha * slotAlpha + background * (1 - color * alpha * slotAlpha);
    const falseMode = color * alpha * slotAlpha + background * (1 - color);
    const onlyTrue = color * slotAlpha + background * (1 - color * slotAlpha);
    assert(Math.abs(actual - expected) < 1e-12);
    assert(falseMode < background && onlyTrue > expected, "夹具必须真实区分两种错误探针，不能只查源码字符串");
    const oldQuantized = ((247 * (20 + 1)) >> 8) / 255 * slotAlpha;
    assert(Math.abs(source - oldQuantized) < 1 / 255, "shader只恢复旧上传输入；浮点与旧8位取整误差小于一色阶");
}

/** 原资源只提供受控异步完成，生产仍决定材质建立、PMA范围和最后拥有者释放。 */
async function checkOwnership(): Promise<void> {
    const load = ResourceAssetsUtils.loadForNode;
    const initialize = (Material.prototype as any).initialize;
    const destroy = (Material.prototype as any).destroy;
    const effect = new EffectAsset();
    const pending: Array<{ node: Node; finish: (error: unknown, asset: EffectAsset | null) => void }> = [];
    const materials: any[] = [];
    const nodes: Node[] = [];
    const source = new sp.SkeletonData() as any;
    source.uuid = "hero-reward-pma-source";
    source._uuid = source.uuid;
    source.skeletonJson = JSON.parse(readFileSync("client/assets/bundles/resources/spine/prophet-tree-effect-1.json", "utf8"));
    source.atlasText = readFileSync("client/assets/bundles/resources/spine/prophet-tree-effect-1.atlas", "utf8");
    source.textures = [];
    source.textureNames = ["prophet-tree-effect-1.png"];
    const original = JSON.stringify(source.skeletonJson);
    let materialFailure = false;
    (Material.prototype as any).initialize = function(options: any): void {
        this.isValid = true;
        this.effectAsset = options.effectAsset;
        materials.push(this);
        if (materialFailure) throw new Error("受控材质准备失败");
    };
    (Material.prototype as any).destroy = function(): void { this.isValid = false; };
    ResourceAssetsUtils.loadForNode = ((node: Node, path: string, _kind: string, finish: any) => {
        if (path.startsWith("spine/")) queueMicrotask(() => finish(null, source));
        else {
            assert.equal(path, "effects/legacy-spine-pma");
            pending.push({ node, finish });
        }
    }) as any;
    /** 一份真实命名入口的等待能力；不通过私有方法绕过资源时序。 */
    const mount = (pma: boolean) => {
        const node = new Node("PmaOwner");
        nodes.push(node);
        const status = { node, ready: 0, failed: 0 };
        BattleSpineService.instance.mountNamedSpine(node, "prophet-tree-effect-1", "stand", {
            loop: true, legacyPmaTexture: pma,
            onReady: () => { status.ready++; }, onFail: () => { status.failed++; },
        });
        return status;
    };
    /** 有界微任务只放行实际Promise和资源回调，不等待墙钟。 */
    const flush = async () => { for (let index = 0; index < 12; index++) await Promise.resolve(); };
    try {
        const defaultOwner = mount(false);
        await flush();
        assert.equal(defaultOwner.ready, 1);
        assert.equal(pending.length, 0, "默认骨骼不额外加载预乘shader");
        assert.equal(defaultOwner.node.getComponent(sp.Skeleton)!.premultipliedAlpha, false);
        const first = mount(true), second = mount(true);
        await flush();
        assert.equal(first.ready, 0);
        assert.equal(first.node.getComponent(sp.Skeleton), null, "shader尚未就绪不露错误混合的一帧");
        pending.splice(0).forEach(row => row.finish(null, effect));
        const one = first.node.getComponent(sp.Skeleton)!;
        const two = second.node.getComponent(sp.Skeleton)!;
        assert.equal(first.ready, 1);
        assert.equal(second.ready, 1);
        assert.equal(one.premultipliedAlpha, true);
        assert.equal(one.skeletonData, two.skeletonData);
        const material = (one as any).customMaterial;
        assert.equal(material, (two as any).customMaterial, "同一原池条目共享唯一材质");
        assert.equal(materials.length, 1);
        assert.equal(JSON.stringify(source.skeletonJson), original, "源slot/mesh/动画不被运行适配修改");
        const runtime = (one.skeletonData as any).skeletonJson;
        assert.deepEqual(runtime.slots, source.skeletonJson.slots, "不能把screen改normal或丢掉原两色数据");
        first.node.destroy();
        assert.equal(material.isValid, true);
        assert.equal(one.skeletonData!.isValid, true);
        second.node.destroy();
        assert.equal(material.isValid, false);
        assert.equal(one.skeletonData!.isValid, false);
        assert.equal(source.isValid, true, "仅释放运行副本，不销毁资源池原资产");
        assert(defaultOwner.node.getComponent(sp.Skeleton)!.skeletonData!.isValid, "默认与预乘运行模式不能串释放");
        const late = mount(true);
        await flush();
        late.node.destroy();
        assert.equal(late.failed, 1);
        pending.splice(0).forEach(row => row.finish(null, effect));
        assert.equal(materials.length, 1, "关页后的shader成功不能新建材质或重新onReady");
        assert.equal(late.ready, 0);
        materialFailure = true;
        const failed = mount(true);
        await flush();
        pending.splice(0).forEach(row => row.finish(null, effect));
        assert.equal(failed.failed, 1);
        assert.equal(failed.ready, 0);
        assert.equal(materials[1].isValid, false, "失败创建也必须释放材质，不能返回原资产假成功");
        failed.node.destroy();
        assert.equal(failed.failed, 1, "准备失败后销毁不能再次失败回调");
    } finally {
        nodes.forEach(node => { if (node.isValid) node.destroy(); });
        ResourceAssetsUtils.loadForNode = load;
        if (initialize) (Material.prototype as any).initialize = initialize;
        else delete (Material.prototype as any).initialize;
        if (destroy) (Material.prototype as any).destroy = destroy;
        else delete (Material.prototype as any).destroy;
    }
}

/** 验证定向旧预乘输入、加载取消、原池拥有者与失败释放，不替代实际渲染。 */
async function main(): Promise<void> {
    checkSource();
    await checkOwnership();
    console.log("PASS 旧PNG预乘：保留源纹理与slot混合、定向PMA、同池最后拥有者释放及迟到/失败清理");
}

void main().catch(error => { console.error(error); process.exitCode = 1; });
