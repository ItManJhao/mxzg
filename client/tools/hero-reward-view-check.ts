/**
 * 通用英雄获得专项：读取真实静态Prefab与配置，直接执行HeroRewardView及既有技能只读详情。
 * 覆盖真实5星模板、4/低星分支、原帧/音频、同参数重入、资源迟到及单次关闭；引擎替身不代表画面验收。
 */
import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { AudioClip, AudioSource, Button, Label, Node, Sprite, SpriteFrame, UIOpacity, UITransform } from "cc";
import { ConfigFixtureUtils } from "./ConfigFixtureUtils";
import { GameLog } from "../assets/scripts/core/GameLog";
import { ResourceAssetsUtils } from "../assets/scripts/framework/assets/ResourceAssetsUtils";
import { ResManager } from "../assets/scripts/framework/assets/ResManager";
import { UIManager } from "../assets/scripts/framework/ui/UIManager";
import { UIRegistry } from "../assets/scripts/framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../assets/scripts/framework/ui/ViewportLayoutUtils";
import { BattleSpineService } from "../assets/scripts/features/battle/ui/BattleSpineService";
import { HeroSkillView } from "../assets/scripts/features/hero/ui/HeroSkillView";
import { HeroSkillUtils } from "../assets/scripts/features/hero/utils/HeroSkillUtils";
import { HeroRewardView, HeroRewardArgs } from "../assets/scripts/features/reward/ui/HeroRewardView";

/** 当前Bundle真实定位，不保存资源存在性清单。 */
const { resolveBundleFile } = require(process.cwd() + "/tools/bundle-paths.cjs");
/** 本轮服务端真实发放模板的只读形状，不装入任何资产Model。 */
const args: HeroRewardArgs = { receiptId: "a0000000-0000-4000-8000-000000000001",
    hero: { instanceId: "b0000000-0000-4000-8000-000000000001", templateId: 10105007, level: 1, star: 5, stage: 0 } };

/** 读取实际Prefab/meta及源证据，遇缺失立即失败。 */
function read(path: string): any {
    return JSON.parse(readFileSync(path, "utf8"));
}

/** 从正式脚本meta求序列化ID，不能只凭节点名声称绑定有效。 */
function classId(path: string): string {
    const hex = read(path).uuid.replaceAll("-", "");
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let result = hex.slice(0, 5);
    for (let index = 5; index < 32; index += 3) {
        const number = parseInt(hex.slice(index, index + 3), 16);
        result += alphabet[number >> 6] + alphabet[number & 63];
    }
    return result;
}

/** 由实际Prefab节点及属性引用装配替身，布局只读取验证，不在工具中另造一套窗口。 */
function fixture(): { view: HeroRewardView; root: Node; audio: { plays: number; stops: number } } {
    const rows = read("client/assets/bundles/module/reward/prefabs/HeroRewardView.prefab");
    const objects = new Map<number, any>();
    rows.forEach((row: any, index: number) => {
        if (row.__type__ === "cc.Node") {
            const value = new Node(row._name);
            value.setPosition(row._lpos.x, row._lpos.y, row._lpos.z);
            value.setScale(row._lscale.x, row._lscale.y, row._lscale.z);
            objects.set(index, value);
        }
    });
    rows.forEach((row: any, index: number) => {
        if (row.__type__ === "cc.Node" && row._parent) objects.get(index).parent = objects.get(row._parent.__id__);
    });
    for (let index = 0; index < rows.length; index++) {
        const row = rows[index];
        if (!row.node) continue;
        const node = objects.get(row.node.__id__) as Node;
        const constructor = ({ "cc.Sprite": Sprite, "cc.Label": Label, "cc.Button": Button,
            "cc.AudioSource": AudioSource, "cc.UITransform": UITransform } as any)[row.__type__];
        if (!constructor) continue;
        const value: any = node.addComponent(constructor);
        if (row.__type__ === "cc.UITransform") {
            value.setContentSize(row._contentSize.width, row._contentSize.height);
        }
        objects.set(index, value);
    }
    const root = objects.get(1) as Node;
    const view = root.addComponent(HeroRewardView);
    const component = rows.find((row: any) => row.__type__ === classId("client/assets/scripts/features/reward/ui/HeroRewardView.ts.meta"));
    for (const [key, value] of Object.entries(component)) {
        if (Array.isArray(value)) (view as any)[key] = value.map(ref => objects.get(ref.__id__));
        else if (value && typeof value === "object" && "__id__" in value) (view as any)[key] = objects.get((value as any).__id__);
    }
    const audio = { plays: 0, stops: 0 };
    view.rewardAudio!.play = () => { audio.plays++; };
    view.rewardAudio!.stop = () => { audio.stops++; };
    return { view, root, audio };
}

/** 原RewardCell关键坐标、独立骨骼挂点及34份PVR原像素输入均来自实际文件。 */
function checkStatic(): void {
    const rows = read("client/assets/bundles/module/reward/prefabs/HeroRewardView.prefab");
    const rootId = rows[0].data.__id__;
    const prefab = rows[rows[rootId]._prefab?.__id__];
    assert.equal(prefab?.__type__, "cc.PrefabInfo", "根必须带Creator可编辑的PrefabInfo，运行替身不能替代编辑器结构");
    assert.equal(prefab.root.__id__, rootId);
    assert.equal(prefab.asset.__id__, 0);
    const fileIds = new Set<string>();
    for (const row of rows) {
        const info = row.__type__ === "cc.Node" ? rows[row._prefab?.__id__]
            : row.node && "__prefab" in row ? rows[row.__prefab?.__id__] : null;
        if (row.__type__ === "cc.Node") {
            assert.equal(info?.__type__, "cc.PrefabInfo", "子节点PrefabInfo缺失：" + row._name);
            assert.equal(info.root.__id__, rootId);
            assert.equal(info.asset.__id__, 0);
        } else if (row.node && "__prefab" in row) {
            assert.equal(info?.__type__, "cc.CompPrefabInfo", "组件CompPrefabInfo缺失：" + row.__type__);
        }
        if (info) {
            assert(typeof info.fileId === "string" && info.fileId.length > 0 && !fileIds.has(info.fileId),
                "编辑器fileId必须非空且在本Prefab内唯一");
            fileIds.add(info.fileId);
        }
    }
    const nodes = new Map<string, any>(rows.filter((row: any) => row.__type__ === "cc.Node").map((row: any) => [row._name, row]));
    for (const [name, x, y] of [["CellBackground", 320, 345], ["Title", 320, 711], ["DisplayScale", 315, 286],
        ["DisplayOrigin", -314, -284], ["HeroHost", 320, 480], ["NameStrip", 320, 208.5], ["Confirm", 320, 5]] as const) {
        assert.deepEqual(nodes.get(name)._lpos, { __type__: "cc.Vec3", x, y, z: 0 });
    }
    assert.equal(nodes.get("DisplayScale")._lscale.x, 0.8);
    assert.equal(rows.filter((row: any) => row.__type__ === "cc.Button").length, 5, "仅确认及四技能，不恢复招募/分享");
    assert(!rows.some((row: any) => row.__type__ === "cc.Mask"), "共享模态不在Prefab叠额外蒙版");
    assert.deepEqual(UIRegistry.viewSpecOf(HeroRewardView)!.modal, { mask: true, closeOnOutside: false });
    const evidence = read("docs/validation/hero-reward-assets-20261117.json");
    assert.equal(evidence.files.length, 34);
    for (const file of evidence.files) {
        // 沿用原像素证据，专用动画帧从当前奖励包读取，预言树共用图仍按原位置核对。
        const current = file.path.replace(/(bundles\/module\/)common(\/ui\/reward-effect2?_)/, "$1reward$2");
        assert.equal(createHash("sha256").update(readFileSync(current)).digest("hex"), file.sha256);
        assert.equal(read(current + ".meta").uuid, file.imageUuid);
    }
}

/** 冻结技能说明不访问后来名册或重新投影成长，外部对象变化也不能改写当前说明。 */
function checkFrozenSkill(): void {
    const root = new Node("FrozenSkill");
    const view = root.addComponent(HeroSkillView);
    view.title = new Node("Title").addComponent(Label);
    view.status = new Node("Status").addComponent(Label);
    view.description = new Node("Description").addComponent(Label);
    view.closeButton = new Node("Close").addComponent(Button);
    const original = HeroSkillUtils.present;
    HeroSkillUtils.present = () => { throw new Error("冻结说明不能重读后来英雄"); };
    const face = { id: 101050071, slot: 0, available: true, name: "本次技能", description: "原效果<br/>下一行",
        level: 1, unlockStage: 0, icon: null };
    try {
        view.onOpen({ slot: 0, readonlyFace: face });
        face.name = "后来改变";
        (view as any).refresh();
        assert.equal(view.title.string, "本次技能");
        assert.equal(view.description.string, "原效果\n下一行");
        assert.throws(() => view.onOpen({ heroId: args.hero.instanceId, slot: 0, readonlyFace: face }), /来源无效/);
        view.onClose();
    } finally {
        HeroSkillUtils.present = original;
        root.destroy();
    }
}

/** 检查不同星级的演出、重入、子节点先销毁和迟到资源清理。 */
async function checkLifecycle(): Promise<void> {
    const original = { frame: ResManager.getSpriteFrame, resources: ResourceAssetsUtils.forNode,
        spine: BattleSpineService.instance.mountBattleSpine, named: BattleSpineService.instance.mountNamedSpine,
        viewport: ViewportLayoutUtils.bindVisibleRefresh, child: UIManager.instance.openChild };
    const models: Node[] = [];
    const loads: string[] = [];
    const children: any[] = [];
    let gate: Promise<void> | null = null;
    ResManager.getSpriteFrame = async (_node, path) => {
        loads.push(String(path));
        assert(existsSync(resolveBundleFile(String(path).replace("/spriteFrame", "") + ".png")), "实际帧未存在：" + path);
        if (gate) await gate;
        return Object.assign(new SpriteFrame(), { source: path });
    };
    ResourceAssetsUtils.forNode = (() => ({ loadPath: async (path: string) => {
        assert(existsSync(resolveBundleFile(path + ".mp3")), "缺原获得音：" + path);
        return new AudioClip();
    } })) as any;
    BattleSpineService.instance.mountBattleSpine = (parent, stem, _failed, options) => {
        const raw = read(resolveBundleFile("spine/" + stem + ".json"));
        assert(raw.animations.stand, "真实英雄不能以头像或其他骨骼冒充");
        const node = new Node("HeroModel");
        node.parent = parent;
        models.push(node);
        queueMicrotask(() => options?.onReady?.());
        return { node } as any;
    };
    BattleSpineService.instance.mountNamedSpine = (_node, stem, clip, options) => {
        assert(read(resolveBundleFile("spine/" + stem + ".json")).animations[clip]);
        queueMicrotask(() => options?.onReady?.());
    };
    ViewportLayoutUtils.bindVisibleRefresh = () => () => {};
    UIManager.instance.openChild = (async (...values: any[]) => { children.push(values); }) as any;
    try {
        for (const [templateId, star] of [[10105007, 5], [10104005, 4], [10101001, 1]]) {
            const page = fixture();
            const input = { ...args, hero: { ...args.hero, templateId, star } };
            let closed = 0;
            try {
                page.view.runBind();
                page.view.runOpen({ ...input, onClosed: () => { closed++; } });
                await page.view.whenReady();
                assert.equal(page.view.panel!.active, true);
                assert.equal(page.audio.plays, 1);
                assert.equal(page.view.highStar!.active, star > 3);
                assert.equal(page.view.lowStar!.active, star <= 3);
                if (star > 3) {
                    const model = models[models.length - 1];
                    assert.equal(model.getComponent(UIOpacity)!.opacity, 0);
                    assert(page.view.introduction!.node.active);
                    page.view.update(0.599);
                    assert(page.view.introduction!.node.active);
                    page.view.update(0.002);
                    assert.equal(page.view.introduction!.node.active, false, "原10帧*.06揭幕完成后才展示英雄");
                    assert(page.view.auraHosts.every(node => node.active));
                    assert(model.getComponent(UIOpacity)!.opacity > 0);
                    page.view.update(1.999);
                    assert.equal(model.getComponent(UIOpacity)!.opacity, 255);
                    page.view.skillButtons[0].node.emit(Button.EventType.CLICK);
                    assert.equal(children[children.length - 1][1], HeroSkillView);
                    const face = children[children.length - 1][2].readonlyFace;
                    assert(face.id && face.description && face.name);
                } else {
                    assert(page.view.lowIcon!.spriteFrame);
                    assert.equal(page.view.introduction!.node.active, false, "低星没有额外召唤等待");
                }
                const count = loads.length;
                page.view.runOpen(input);
                assert.equal(loads.length, count);
                assert.equal(page.audio.plays, 1, "同回执同实例不能重播音效");
                assert.throws(() => page.view.onOpen({ ...input, hero: { ...input.hero, level: 2 } }), /内容不一致/);
                page.view.runClose();
                await Promise.resolve();
                page.view.runDispose();
                assert.equal(closed, 1);
                assert.equal(page.view.rewardAudio!.clip, null);
                assert.equal(page.view.titleEffect!.spriteFrame, null);
                assert(!page.view.heroHost!.children.some(node => node.name === "HeroModel"),
                    "动态模型移除，静态Aura/揭幕挂点仍由Prefab持有");
            } finally {
                page.view.runDispose();
                page.root.destroy();
            }
        }
        const interrupted = fixture();
        interrupted.view.runBind();
        interrupted.view.runOpen(args);
        await interrupted.view.whenReady();
        // 模拟部分子节点先销毁，其余监听仍需要由页面清理。
        for (const button of [interrupted.view.confirm!, interrupted.view.skillButtons[0]]) {
            button.node.destroy();
            Object.assign(button, { node: null });
        }
        const survivingButton = interrupted.view.skillButtons[1].node;
        const off = survivingButton.off.bind(survivingButton);
        let survivingUnbind = 0;
        survivingButton.off = (...args: Parameters<Node["off"]>) => {
            if (args[0] === Button.EventType.CLICK) {
                survivingUnbind++;
            }
            off(...args);
        };
        const cleanupErrors = GameLog.shared.recent().filter(entry => entry.message.includes("HeroRewardView 清理失败")).length;
        interrupted.view.runDispose();
        assert.equal(GameLog.shared.recent().filter(entry => entry.message.includes("HeroRewardView 清理失败")).length,
            cleanupErrors, "确认和技能节点已销毁时，清理路径不能抛错");
        assert.equal(survivingUnbind, 1, "关闭后存活的按钮只解绑一次");
        interrupted.root.destroy();

        const late = fixture();
        let release!: () => void;
        gate = new Promise<void>(resolve => { release = resolve; });
        late.view.runOpen(args);
        late.view.runClose();
        release();
        for (let index = 0; index < 30; index++) await Promise.resolve();
        assert.equal(late.audio.plays, 0);
        assert.equal(late.view.panel!.active, false);
        assert.equal(late.view.titleEffect!.spriteFrame, null);
        late.view.runDispose();
        late.root.destroy();
        assert(models.every(model => !model.isValid), "正常/迟到关闭均销毁本窗模型");
    } finally {
        ResManager.getSpriteFrame = original.frame;
        ResourceAssetsUtils.forNode = original.resources;
        BattleSpineService.instance.mountBattleSpine = original.spine;
        BattleSpineService.instance.mountNamedSpine = original.named;
        ViewportLayoutUtils.bindVisibleRefresh = original.viewport;
        UIManager.instance.openChild = original.child;
    }
}

/** 安装唯一真实配置后检查静态与生命周期，不运行发奖或召唤。 */
async function main(): Promise<void> {
    await ConfigFixtureUtils.installReal();
    checkStatic();
    checkFrozenSkill();
    await checkLifecycle();
    console.log("PASS 英雄获得：真实5星/4星/低星、原揭幕/2秒淡入、冻结技能及迟到关闭清理");
}

void main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
